import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Setup transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS || 'test@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD || 'password123',
  },
});

/**
 * Send an email using Gmail
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_ADDRESS || 'test@gmail.com',
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Gmail Service]: Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[Gmail Service Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send fee reminder email
 */
export async function sendFeeReminderEmail(
  to: string,
  studentName: string,
  amountDue: number,
  dueDate: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Fee Reminder - ${studentName}`;
  const text = `Dear ${studentName},\n\nThis is a gentle reminder that your fee of ₹${amountDue} is due by ${dueDate}. Please clear your dues at the earliest.\n\nThank you!`;
  
  return sendEmail(to, subject, text);
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  to: string,
  studentName: string,
  fileName: string,
  pdfBuffer: Buffer
): Promise<{ success: boolean; error?: string }> {
  const subject = `Payment Receipt - ${studentName}`;
  const text = `Dear ${studentName},\n\nThank you for your payment. Please find your payment receipt attached.\n\nRegards,\nManagement`;
  
  return sendEmail(to, subject, text, undefined, [
    {
      filename: fileName,
      content: pdfBuffer,
    },
  ]);
}
