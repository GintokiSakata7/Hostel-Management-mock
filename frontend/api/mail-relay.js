import nodemailer from 'nodemailer';

const RELAY_SECRET = process.env.MAIL_RELAY_SECRET || 'majin-hostel-mail-relay-2026-sec';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-relay-secret, authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const providedSecret = req.headers['x-relay-secret'] || req.body?.secret;
  if (providedSecret !== RELAY_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized mail relay request' });
  }

  const { to, subject, text, html, attachments } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, subject' });
  }

  const user = process.env.EMAIL_ADDRESS || 'rishichepuri764@gmail.com';
  const pass = process.env.EMAIL_APP_PASSWORD || 'kwazstzjmszvircf';

  // Port 465 (SMTPS direct SSL) is open on Vercel AWS Lambda serverless runtime
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  const parsedAttachments = Array.isArray(attachments)
    ? attachments.map((att) => ({
        filename: att.filename,
        content: att.encoding === 'base64' || typeof att.content === 'string'
          ? Buffer.from(att.content, 'base64')
          : Buffer.from(att.content),
      }))
    : undefined;

  try {
    const info = await transporter.sendMail({
      from: `"Majin Hostel Management" <${user}>`,
      to,
      subject,
      text,
      html,
      attachments: parsedAttachments,
    });

    console.log(`[Vercel Mail Relay]: Successfully sent email to ${to}. Message ID: ${info.messageId}`);
    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      relay: 'vercel-serverless-port-465',
    });
  } catch (err) {
    console.error('[Vercel Mail Relay Error]: Failed to send email:', err.message);
    return res.status(500).json({
      success: false,
      error: `Vercel SMTP error: ${err.message}`,
    });
  }
}
