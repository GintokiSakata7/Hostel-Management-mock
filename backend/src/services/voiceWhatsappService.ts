import dotenv from 'dotenv';
dotenv.config();

/**
 * WhatsApp & Voice Call Service
 * Supports:
 * 1. Official Meta WhatsApp Cloud API (1,000 Free Messages/Month, 100% Ban Safe)
 * 2. Twilio WhatsApp API
 * 3. Mock Sandbox Mode
 */

export interface ReminderNotificationResult {
  studentId: string;
  studentName: string;
  phone: string;
  roomName?: string;
  pendingMonthsCount?: number;
  pendingMonthsList?: string[];
  totalAmount?: number;
  dueDayLabel?: string;
  nextDueDate?: string;
  telegramStatus: string;
  telegramVoiceStatus?: string;
  whatsappStatus: string;
  voiceCallStatus: string;
}


/**
 * Execute WhatsApp message via Meta Cloud API or Twilio API
 */
export async function sendWhatsAppReminder(studentName: string, phone: string, amount: number, monthLabel: string): Promise<string> {
  const metaToken = process.env.META_WHATSAPP_TOKEN;
  const metaPhoneId = process.env.META_WHATSAPP_PHONE_ID;

  // 1. Meta WhatsApp Cloud API (Official, 100% Ban-Safe & 1,000 Free/Month)
  if (metaToken && metaPhoneId && !metaToken.startsWith('YOUR_')) {
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const url = `https://graph.facebook.com/v18.0/${metaPhoneId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: `👋 Hello ${studentName},\n\nFriendly reminder from Hostel Management Office (VMR Hostel):\nYour hostel fee of ₹${amount} for ${monthLabel} is pending.\n\nPlease clear your dues at the office or via UPI. Thank you!`
          }
        })
      });

      const data = await response.json() as any;
      if (response.ok) {
        console.log(`[Meta WhatsApp API]: Message sent to ${formattedPhone}`);
        return `Meta WhatsApp Sent (ID: ${data.messages?.[0]?.id || 'OK'})`;
      } else {
        console.error('[Meta WhatsApp Error]:', data.error?.message);
        return `Meta WhatsApp Failed: ${data.error?.message || response.statusText}`;
      }
    } catch (err: any) {
      console.error('[Meta WhatsApp Exception]:', err.message);
      return `Meta WhatsApp Error: ${err.message}`;
    }
  }

  // 2. Twilio WhatsApp API Fallback
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+17372508034';

  if (!accountSid || !authToken || accountSid.startsWith('YOUR_')) {
    console.log(`[WhatsApp Service (MOCK)]: Sending WhatsApp to ${phone} for ${studentName}: "Hi ${studentName}, your fee ₹${amount} for ${monthLabel} is pending."`);
    return 'Mock Sent (Set META_WHATSAPP_TOKEN & META_WHATSAPP_PHONE_ID in .env)';
  }

  try {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const customContentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID || 'HXfe5ab5f00277942d4d4200328b4d403c';
    
    let bodyParams: URLSearchParams;

    if (customContentSid) {
      bodyParams = new URLSearchParams({
        From: fromWhatsApp,
        To: `whatsapp:${formattedPhone}`,
        ContentSid: customContentSid,
        ContentVariables: JSON.stringify({
          "1": `${monthLabel} Hostel Fee (${studentName})`,
          "2": `₹${amount}`
        })
      });
    } else {
      bodyParams = new URLSearchParams({
        From: fromWhatsApp,
        To: `whatsapp:${formattedPhone}`,
        Body: `🚨 *Hostel Fee Reminder*\nHello ${studentName}, your hostel fee of ₹${amount} for ${monthLabel} is pending. Please clear your dues at the office or via UPI.`
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams
    });

    const data = await response.json() as any;

    if (response.ok) {
      console.log(`[Twilio WhatsApp]: Sent to ${formattedPhone} (SID: ${data.sid})`);
      return `WhatsApp Sent (SID: ${data.sid})`;
    } else {
      console.error('[Twilio WhatsApp Error]:', data.message);
      if (data.code === 21654 || data.code === 20003) {
        return `WhatsApp (Twilio Trial Restriction: Outbound API requires Meta WhatsApp Token or Console dispatch)`;
      }
      return `WhatsApp Failed: ${data.message || response.statusText}`;
    }
  } catch (err: any) {
    return `WhatsApp Error: ${err.message}`;
  }
}

/**
 * Trigger Predefined Automated Voice Call (IVR) reading out fee reminder
 */
export async function triggerVoiceCallReminder(studentName: string, phone: string, amount: number, monthLabel: string): Promise<string> {
  // Outbound IVR Voice Calls disabled by admin preference
  return 'Disabled';
}
