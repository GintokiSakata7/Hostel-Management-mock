import dotenv from 'dotenv';
dotenv.config();

const API_VERSION = process.env.META_WHATSAPP_API_VERSION || 'v18.0';

/**
 * Format phone number to E.164 without leading plus (e.g. 919876543210)
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

/**
 * Upload binary PDF buffer directly to Meta WhatsApp Cloud API Media Storage
 */
export async function uploadMediaBufferToWhatsApp(
  pdfBuffer: Buffer,
  fileName: string = 'Receipt.pdf'
): Promise<string | null> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;

  if (!token || !phoneId || token.startsWith('YOUR_')) {
    console.warn('[Meta WhatsApp Cloud API]: Missing META_WHATSAPP_TOKEN or META_WHATSAPP_PHONE_ID in .env');
    return null;
  }

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${phoneId}/media`;

    // Standard Node 18+ FormData & Blob construction
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', blob, fileName);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json() as any;

    if (response.ok && data.id) {
      console.log(`[Meta WhatsApp Media Upload Success]: Media ID = ${data.id}`);
      return data.id as string;
    } else {
      console.error('[Meta WhatsApp Media Upload Error]:', data.error?.message || data);
      return null;
    }
  } catch (err: any) {
    console.error('[Meta WhatsApp Media Upload Exception]:', err.message);
    return null;
  }
}

/**
 * Send WhatsApp Document Message (PDF Receipt) using uploaded Media ID
 */
export async function sendWhatsAppDocument(
  phone: string,
  mediaId: string,
  fileName: string,
  caption: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;

  if (!token || !phoneId || token.startsWith('YOUR_')) {
    return { success: false, error: 'META_WHATSAPP_TOKEN or META_WHATSAPP_PHONE_ID not configured' };
  }

  try {
    const formattedPhone = formatPhoneNumberForWhatsApp(phone);
    const url = `https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'document',
      document: {
        id: mediaId,
        filename: fileName,
        caption: caption
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;

    if (response.ok && data.messages?.[0]?.id) {
      const msgId = data.messages[0].id;
      console.log(`[Meta WhatsApp Document Sent]: To ${formattedPhone}, Message ID = ${msgId}`);
      return { success: true, messageId: msgId };
    } else {
      const errStr = data.error?.message || response.statusText;
      console.error('[Meta WhatsApp Document Error]:', errStr);
      return { success: false, error: errStr };
    }
  } catch (err: any) {
    console.error('[Meta WhatsApp Document Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send Text Message via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppTextMessage(
  phone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;

  if (!token || !phoneId || token.startsWith('YOUR_')) {
    return { success: false, error: 'META_WHATSAPP_TOKEN or META_WHATSAPP_PHONE_ID not configured' };
  }

  try {
    const formattedPhone = formatPhoneNumberForWhatsApp(phone);
    const url = `https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      })
    });

    const data = await response.json() as any;

    if (response.ok && data.messages?.[0]?.id) {
      const msgId = data.messages[0].id;
      console.log(`[Meta WhatsApp Text Sent]: To ${formattedPhone}, Message ID = ${msgId}`);
      return { success: true, messageId: msgId };
    } else {
      const errStr = data.error?.message || response.statusText;
      console.error('[Meta WhatsApp Text Error]:', errStr);
      return { success: false, error: errStr };
    }
  } catch (err: any) {
    console.error('[Meta WhatsApp Text Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * High-level Helper: Upload PDF Receipt Buffer & Send Document via WhatsApp Cloud API
 */
export async function sendPaymentReceiptWhatsApp(
  studentPhone: string,
  studentName: string,
  receiptNo: string,
  pdfBuffer: Buffer,
  amount: number,
  monthLabel: string
): Promise<{ success: boolean; messageId?: string; status: string; error?: string }> {
  const fileName = `Receipt_${receiptNo}.pdf`;
  const caption = `✅ Official Fee Payment Receipt (${receiptNo})\nStudent: ${studentName}\nMonth: ${monthLabel}\nAmount Paid: ₹${amount.toLocaleString('en-IN')}\nStatus: Paid`;

  console.log(`[Meta WhatsApp Service]: Uploading PDF receipt ${fileName} to Meta WhatsApp Media Cloud...`);
  const mediaId = await uploadMediaBufferToWhatsApp(pdfBuffer, fileName);

  if (!mediaId) {
    // If Meta media upload is unconfigured or failed, return status description
    return {
      success: false,
      status: 'MEDIA_UPLOAD_FAILED',
      error: 'Failed to upload PDF receipt to Meta WhatsApp Media storage. Verify META_WHATSAPP_TOKEN & META_WHATSAPP_PHONE_ID in .env'
    };
  }

  console.log(`[Meta WhatsApp Service]: Sending PDF receipt document to student ${studentPhone}...`);
  const sendRes = await sendWhatsAppDocument(studentPhone, mediaId, fileName, caption);

  if (sendRes.success && sendRes.messageId) {
    return {
      success: true,
      messageId: sendRes.messageId,
      status: 'SENT'
    };
  } else {
    return {
      success: false,
      status: 'FAILED',
      error: sendRes.error || 'Failed to dispatch document'
    };
  }
}
