import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// CRITICAL for Cloud Deployments (Render, AWS, DigitalOcean, etc.):
// Render container environments do not have an outbound IPv6 route. Node 17+ defaults
// to verbatim DNS ordering, which resolves smtp.gmail.com to IPv6 addresses (2607:f8b0:...).
// Attempting to connect to IPv6 yields "ENETUNREACH" and connection timeouts.
// Setting IPv4-first globally forces Node.js to use IPv4 addresses.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignore if unsupported in older Node runtimes
}

/**
 * Creates a Gmail SMTP transporter with explicit IPv4 socket resolution.
 * Supports Port 465 (SMTPS direct SSL) and Port 587 (STARTTLS).
 */
function createGmailTransporter(port: number = 465, secure: boolean = true) {
  const user = process.env.EMAIL_ADDRESS || 'rishichepuri764@gmail.com';
  const pass = process.env.EMAIL_APP_PASSWORD || 'kwazstzjmszvircf';

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // CRITICAL: Forces IPv4 socket (prevents ENETUNREACH on Render)
    family: 4,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  } as any);
}

/**
 * Dispatch email via Vercel HTTPS Serverless Relay (Port 443).
 * Critical for cloud platforms like Render Free Tier where direct outbound SMTP
 * ports (25, 465, 587) are firewalled.
 */
async function sendViaVercelRelay(
  to: string,
  subject: string,
  text: string,
  html?: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const relayUrl = process.env.MAIL_RELAY_URL || 'https://hostel-management-mock.vercel.app/mail-relay';
  const relaySecret = process.env.MAIL_RELAY_SECRET || 'majin-hostel-mail-relay-2026-sec';

  const serializedAttachments = attachments?.map((att) => ({
    filename: att.filename,
    content: att.content.toString('base64'),
    encoding: 'base64',
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000);

  try {
    const res = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-relay-secret': relaySecret,
      },
      body: JSON.stringify({
        to,
        subject,
        text,
        html,
        attachments: serializedAttachments,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      console.log(`[Email Service]: Email delivered successfully via HTTPS Mail Relay (${relayUrl}) to ${to}. Message ID: ${data.messageId}`);
      return { success: true, messageId: data.messageId };
    } else {
      const errorMsg = data.error || `HTTP ${res.status} ${res.statusText}`;
      console.warn(`[Email Service Relay Warning]: Relay dispatch failed (${errorMsg})`);
      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[Email Service Relay Error]: Failed to reach relay ${relayUrl}:`, err.message);
    return { success: false, error: `Relay fetch failed: ${err.message}` };
  }
}

/**
 * Send an email using resilient multi-tier delivery:
 * Tier 1: HTTPS Mail Relay over Port 443 (ideal for Render cloud environments where SMTP ports 25, 465, 587 are blocked)
 * Tier 2: Direct Gmail Port 465 (SMTPS direct SSL with IPv4 socket)
 * Tier 3: Direct Gmail Port 587 (STARTTLS with IPv4 socket)
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const isRenderCloud = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_ID;
  const relayConfigured = isRenderCloud || !!process.env.MAIL_RELAY_URL;

  // On Render Cloud Free Tier, outbound ports 25, 465, and 587 are blocked at the firewall level.
  // We prioritize the HTTPS Mail Relay over Port 443 to avoid connection timeouts!
  if (relayConfigured) {
    console.log(`[Email Service]: Cloud environment active. Dispatching email via HTTPS Port 443 relay to ${to}...`);
    const relayRes = await sendViaVercelRelay(to, subject, text, html, attachments);
    if (relayRes.success) {
      return relayRes;
    }
    console.warn(`[Email Service]: HTTPS Relay failed (${relayRes.error}). Trying direct SMTP transports...`);
  }

  const senderAddress = process.env.EMAIL_ADDRESS || 'rishichepuri764@gmail.com';
  const mailOptions = {
    from: `"Majin Hostel Management" <${senderAddress}>`,
    to,
    subject,
    text,
    html,
    attachments,
  };

  // Primary Attempt: Port 465 (Direct SSL over IPv4)
  try {
    const transporter465 = createGmailTransporter(465, true);
    const info = await transporter465.sendMail(mailOptions);
    console.log(`[Gmail Service]: Email sent successfully via Port 465 (IPv4) to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err465: any) {
    console.warn(`[Gmail Service Warning]: Port 465 attempt failed (${err465.message}). Retrying via Port 587 (STARTTLS, IPv4)...`);

    // Fallback Attempt: Port 587 (STARTTLS over IPv4)
    try {
      const transporter587 = createGmailTransporter(587, false);
      const info = await transporter587.sendMail(mailOptions);
      console.log(`[Gmail Service]: Email sent successfully via Port 587 (IPv4) to ${to}. Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err587: any) {
      console.error('[Gmail Service Error]: Both Port 465 and Port 587 failed to send email:', err587.message);

      // If we haven't tried the HTTPS relay yet, try it now as final fallback!
      if (!relayConfigured) {
        console.log(`[Email Service]: Direct SMTP failed. Attempting fallback via HTTPS Mail Relay to ${to}...`);
        const finalRelayRes = await sendViaVercelRelay(to, subject, text, html, attachments);
        if (finalRelayRes.success) {
          return finalRelayRes;
        }
      }

      return {
        success: false,
        error: `Port 465 error: ${err465.message} | Port 587 error: ${err587.message}`,
      };
    }
  }
}

/**
 * Send fee reminder email with clear breakdown of amount and pending months
 */
export async function sendFeeReminderEmail(
  to: string,
  studentName: string,
  amountDue: number,
  dueDate: string,
  pendingMonthsCount?: number,
  pendingMonthsList?: string[],
  hostelName?: string
): Promise<{ success: boolean; error?: string }> {
  const hostel = hostelName || 'VMR Hostel';
  const amountFormatted = `₹${Number(amountDue).toLocaleString('en-IN')}`;
  const count = pendingMonthsCount || (pendingMonthsList ? pendingMonthsList.length : 1);
  const monthsStr = pendingMonthsList && pendingMonthsList.length > 0
    ? pendingMonthsList.join(', ')
    : '';

  const subject = `Fee Payment Reminder: ${amountFormatted} Outstanding - ${studentName} (${count} Month${count > 1 ? 's' : ''})`;
  const text = `
Dear ${studentName},

This is an automated payment reminder from ${hostel}.

OUTSTANDING FEE DETAILS:
- Total Remaining Balance Due: ${amountFormatted}
- Overdue Duration: ${count} Month(s)${monthsStr ? ` (${monthsStr})` : ''}
- Due Date: ${dueDate}

Please clear your pending dues at the earliest. If you have already paid or have any questions, please contact the hostel office.

Regards,
Management, ${hostel}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fee Payment Reminder</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 24px; text-align: center; color: #ffffff;">
      <div style="font-size: 12px; font-weight: 700; color: #f97316; letter-spacing: 1.5px; text-transform: uppercase;">${hostel.toUpperCase()}</div>
      <h2 style="margin: 6px 0 0; font-size: 20px;">Fee Payment Reminder</h2>
    </div>
    <div style="padding: 24px;">
      <p style="margin-top: 0; font-size: 15px;">Dear <strong>${studentName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        This is a friendly reminder that you have an outstanding hostel fee balance. Please find your fee summary below:
      </p>

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 18px; margin: 20px 0;">
        <div style="margin-bottom: 10px;">
          <span style="font-size: 13px; color: #9a3412;">Total Outstanding Balance:</span><br/>
          <span style="font-size: 24px; font-weight: 800; color: #ea580c;">${amountFormatted}</span>
        </div>
        <div style="font-size: 13px; color: #7c2d12; margin-bottom: 6px;">
          <strong>Overdue Period:</strong> ${count} Month(s)${monthsStr ? ` (${monthsStr})` : ''}
        </div>
        <div style="font-size: 13px; color: #7c2d12;">
          <strong>Due Date:</strong> ${dueDate}
        </div>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        Please make the payment through the hostel office or official UPI channel. If you have already paid recently, please disregard this notice.
      </p>
    </div>
    <div style="background: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      Hostel Administration · ${hostel}
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(to, subject, text, html);
}

export interface PaymentReceiptEmailPayload {
  to: string;
  studentName: string;
  fileName: string;
  pdfBuffer: Buffer;
  amount?: number;
  remainingBalance?: number;
  monthLabel?: string;
  paymentDate?: string;
  receiptNo?: string;
  method?: string;
  upiProvider?: string | null;
  transactionRef?: string | null;
  roomName?: string | null;
  bedNumber?: number | null;
  studentPhone?: string | null;
  rollNumber?: string | null;
  hostelName?: string;
  hostelPhone?: string;
  hostelEmail?: string;
  hostelAddress?: string;
}

/**
 * Generate rich responsive HTML for Payment Receipt / Invoice
 */
export function generatePaymentReceiptHtml(data: PaymentReceiptEmailPayload): string {
  const hostel = data.hostelName || 'Majin Hostel';
  const address = data.hostelAddress || 'Main Campus Road, City Center';
  const phone = data.hostelPhone || '+91 98765 43210';
  const email = data.hostelEmail || process.env.EMAIL_ADDRESS || 'contact@hostel.com';
  const amountStr = data.amount !== undefined ? `₹${Number(data.amount).toLocaleString('en-IN')}` : '₹0';
  const month = data.monthLabel || 'Current Cycle';
  const receiptNo = data.receiptNo || 'REC-OFFICIAL';
  const payDate = data.paymentDate || new Date().toLocaleDateString('en-IN');
  const method = data.method || 'Cash';
  const paymentDetails = data.upiProvider ? `${method} (${data.upiProvider})` : method;
  const room = data.roomName ? `Room ${data.roomName}${data.bedNumber ? ` (Bed ${data.bedNumber})` : ''}` : 'Unallocated';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${receiptNo}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 620px; margin: 30px auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Top Brand Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
      <div style="font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #f97316; margin-bottom: 6px;">
        ${hostel.toUpperCase()}
      </div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
        Fee Payment Receipt
      </h1>
      <div style="margin-top: 8px; font-size: 13px; color: #cbd5e1;">
        Official Tax Invoice & Receipt: <strong style="color: #ffffff;">#${receiptNo}</strong>
      </div>
    </div>

    <!-- Verified Payment Callout Card -->
    <div style="margin: 24px 24px 20px 24px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 22px; text-align: center;">
      <div style="display: inline-block; background-color: #22c55e; color: #ffffff; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px;">
        ✓ Payment Verified & Received
      </div>
      <div style="font-size: 34px; font-weight: 800; color: #15803d; letter-spacing: -1px; margin: 4px 0;">
        ${amountStr}
      </div>
      <div style="font-size: 14px; color: #166534; font-weight: 500;">
        Received from <strong>${data.studentName}</strong> for <strong>${month}</strong>
      </div>
    </div>

    <!-- Key Metadata Grid (Table) -->
    <div style="padding: 0 24px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px;">
        <tr>
          <!-- Column 1: Payment Info -->
          <td style="width: 50%; vertical-align: top; padding-right: 12px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                Payment Info
              </div>
              <div style="font-size: 13px; line-height: 1.6;">
                <div><span style="color: #64748b;">Receipt No:</span> <strong>${receiptNo}</strong></div>
                <div><span style="color: #64748b;">Billing Cycle:</span> <strong>${month}</strong></div>
                <div><span style="color: #64748b;">Date Paid:</span> <strong>${payDate}</strong></div>
                <div><span style="color: #64748b;">Method:</span> <strong>${paymentDetails}</strong></div>
                ${data.transactionRef ? `<div><span style="color: #64748b;">Ref / Txn ID:</span> <span style="font-family: monospace; font-size: 12px; background: #e2e8f0; padding: 1px 4px; border-radius: 3px;">${data.transactionRef}</span></div>` : ''}
              </div>
            </div>
          </td>

          <!-- Column 2: Resident Info -->
          <td style="width: 50%; vertical-align: top; padding-left: 12px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                Resident Details
              </div>
              <div style="font-size: 13px; line-height: 1.6;">
                <div><span style="color: #64748b;">Name:</span> <strong>${data.studentName}</strong></div>
                <div><span style="color: #64748b;">Room / Bed:</span> <strong>${room}</strong></div>
                ${data.rollNumber ? `<div><span style="color: #64748b;">Roll No:</span> <strong>${data.rollNumber}</strong></div>` : ''}
                ${data.studentPhone ? `<div><span style="color: #64748b;">Phone:</span> ${data.studentPhone}</div>` : ''}
                <div><span style="color: #64748b;">Status:</span> <span style="color: #15803d; font-weight: 700;">Completed</span></div>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Itemized Fee Breakdown Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
            <th style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">Item Description</th>
            <th style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">Period</th>
            <th style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody style="font-size: 13px; color: #1e293b;">
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9;">
              <strong>Hostel Accommodation & Boarding Fee</strong>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Includes room rent, electricity, maintenance, water & facilities.</div>
            </td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #475569;">
              ${month}
            </td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600;">
              ${amountStr}
            </td>
          </tr>
          <tr style="background-color: #f8fafc; font-size: 13px;">
            <td colspan="2" style="padding: 10px 16px; text-align: right; color: #64748b; font-weight: 600;">Subtotal:</td>
            <td style="padding: 10px 16px; text-align: right; font-weight: 600;">${amountStr}</td>
          </tr>
          <tr style="background-color: #f8fafc; font-size: 13px;">
            <td colspan="2" style="padding: 6px 16px; text-align: right; color: #64748b; font-weight: 600;">Taxes / Fees:</td>
            <td style="padding: 6px 16px; text-align: right; font-weight: 600;">₹0.00</td>
          </tr>
          <tr style="background-color: #e2e8f0; font-size: 14px;">
            <td colspan="2" style="padding: 12px 16px; text-align: right; color: #0f172a; font-weight: 800;">Total Amount Paid:</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #15803d; font-size: 16px;">${amountStr}</td>
          </tr>
          <tr style="background-color: #f0fdf4; font-size: 12px;">
            <td colspan="2" style="padding: 8px 16px; text-align: right; color: #166534; font-weight: 700;">Remaining Balance Outstanding:</td>
            <td style="padding: 8px 16px; text-align: right; font-weight: 700; color: #166534;">${data.remainingBalance !== undefined && data.remainingBalance > 0 ? `₹${Number(data.remainingBalance).toLocaleString('en-IN')}` : '₹0.00 (Fully Settled)'}</td>
          </tr>
        </tbody>
      </table>

      <!-- PDF Attachment Info Box -->
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: center;">
        <div style="font-size: 20px; margin-right: 12px;">📎</div>
        <div style="font-size: 13px; color: #1e40af; line-height: 1.5;">
          <strong>Official PDF Attached:</strong> An official, signed digital copy (<strong>${data.fileName}</strong>) is attached to this email. You can download or print it for your tax, reimbursement, or personal records.
        </div>
      </div>
    </div>

    <!-- Hostel Contact & Legal Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
      <div style="font-weight: 700; color: #334155; font-size: 13px; margin-bottom: 4px;">
        ${hostel}
      </div>
      <div style="margin-bottom: 4px;">${address}</div>
      <div style="margin-bottom: 12px;">Phone: <strong>${phone}</strong> · Email: <strong>${email}</strong></div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8;">
        This is an automated payment receipt generated by Majin Hostel Management Portal.<br/>
        Please retain this email as proof of fee payment.
      </div>
    </div>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Send payment receipt email with rich HTML invoice and PDF attachment
 */
export async function sendPaymentReceiptEmail(
  toOrPayload: string | PaymentReceiptEmailPayload,
  studentNameArg?: string,
  fileNameArg?: string,
  pdfBufferArg?: Buffer
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  let to: string;
  let studentName: string;
  let fileName: string;
  let pdfBuffer: Buffer;
  let payload: PaymentReceiptEmailPayload;

  if (typeof toOrPayload === 'string') {
    to = toOrPayload;
    studentName = studentNameArg || 'Resident';
    fileName = fileNameArg || 'Receipt.pdf';
    pdfBuffer = pdfBufferArg || Buffer.from('');
    payload = {
      to,
      studentName,
      fileName,
      pdfBuffer
    };
  } else {
    payload = toOrPayload;
    to = payload.to;
    studentName = payload.studentName;
    fileName = payload.fileName;
    pdfBuffer = payload.pdfBuffer;
  }

  const receiptNo = payload.receiptNo || 'REC';
  const monthLabel = payload.monthLabel || 'Current Cycle';
  const amountFormatted = payload.amount !== undefined ? `₹${Number(payload.amount).toLocaleString('en-IN')}` : '';

  const subject = `Fee Payment Receipt - ${receiptNo} - ${studentName} (${monthLabel})${amountFormatted ? ` [${amountFormatted}]` : ''}`;
  
  const text = `
========================================
${(payload.hostelName || 'MAJIN HOSTEL').toUpperCase()}
OFFICIAL FEE PAYMENT RECEIPT & INVOICE
========================================

Receipt No: ${receiptNo}
Payment Date: ${payload.paymentDate || new Date().toLocaleDateString('en-IN')}
Status: Completed & Verified

Dear ${studentName},

Thank you for your payment. We have successfully received and processed your hostel fee.

PAYMENT DETAILS:
- Resident Name: ${studentName}
- Room / Bed: ${payload.roomName ? `Room ${payload.roomName}${payload.bedNumber ? ` (Bed ${payload.bedNumber})` : ''}` : 'Unallocated'}
- Billing Cycle: ${monthLabel}
- Amount Paid: ${amountFormatted || 'As per receipt'}
- Payment Mode: ${payload.method || 'Cash'}${payload.upiProvider ? ` (${payload.upiProvider})` : ''}
${payload.transactionRef ? `- Transaction Ref / ID: ${payload.transactionRef}\n` : ''}- Remaining Balance: ${payload.remainingBalance !== undefined && payload.remainingBalance > 0 ? `₹${Number(payload.remainingBalance).toLocaleString('en-IN')}` : '₹0.00 (Fully Settled)'}

An official signed PDF receipt (${fileName}) is attached to this email for your records.

Regards,
Management, ${payload.hostelName || 'Majin Hostel'}
Phone: ${payload.hostelPhone || '+91 98765 43210'}
Email: ${payload.hostelEmail || process.env.EMAIL_ADDRESS || ''}
Address: ${payload.hostelAddress || 'Main Campus Road, City Center'}
========================================
  `.trim();

  const html = generatePaymentReceiptHtml(payload);

  return sendEmail(to, subject, text, html, [
    {
      filename: fileName,
      content: pdfBuffer,
    },
  ]);
}
