import dotenv from 'dotenv';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { CustomFile } from 'telegram/client/uploads';
import * as googleTTS from 'google-tts-api';

dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID) || 0;
const apiHash = process.env.TELEGRAM_API_HASH || '';
const sessionString = process.env.TELEGRAM_SESSION || '';

let userClient: TelegramClient | null = null;

/**
 * Initialize Telegram Personal UserBot Client (MTProto API)
 */
export async function getPersonalTelegramClient(): Promise<TelegramClient | null> {
  if (!apiId || !apiHash || !sessionString) return null;
  if (userClient) return userClient;

  try {
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 2,
      timeout: 3000,
    });

    const connectPromise = client.connect();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GramJS connect timeout')), 3000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    userClient = client;
    return userClient;
  } catch (err: any) {
    console.warn('[Telegram UserBot Connection Warning]:', err.message);
  }
  return null;
}

/**
 * Send Telegram Text Message directly to a student's Phone Number or Chat ID
 */
export async function sendTelegramMessage(text: string, destination?: string): Promise<{ success: boolean; message: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const target = destination || process.env.TELEGRAM_CHAT_ID;

  if (!target) {
    return { success: false, message: 'No Telegram target specified' };
  }

  // 1. Try Personal User Account Messaging (MTProto) — Can send directly to Phone Numbers!
  if (apiId && apiHash && sessionString) {
    try {
      const client = await getPersonalTelegramClient();
      if (client) {
        let peer: any = target;

        // If target is a phone number (e.g. 6303772164 or +916303772164)
        if (/^\+?\d{10,12}$/.test(target)) {
          const formattedPhone = target.startsWith('+') ? target : `+91${target}`;
          try {
            peer = await client.getEntity(formattedPhone);
          } catch (err: any) {
            console.warn(`[Telegram UserBot]: Phone number ${formattedPhone} not found on Telegram or private.`);
            peer = null;
          }
        } else if (/^\d+$/.test(target)) {
          peer = BigInt(target);
        }

        if (peer) {
          await client.sendMessage(peer, { message: text, parseMode: 'html' });
          console.log(`[Telegram UserBot]: Personal message sent directly to target ${target}`);
          return { success: true, message: `Sent via Personal Telegram to ${target}` };
        }
      }
    } catch (err: any) {
      console.warn('[Telegram UserBot Warning]:', err.message);
    }
  }

  // 2. Fallback to Bot API (for numeric Chat IDs)
  if (token && token !== 'YOUR_TELEGRAM_BOT_TOKEN' && /^\d+$/.test(target)) {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: target,
          text,
          parse_mode: 'HTML'
        })
      });

      const data = await response.json() as any;
      if (data.ok) {
        console.log(`[Telegram Bot API]: Personal message delivered to ${target}`);
        return { success: true, message: `Delivered via Telegram Bot to ${target}` };
      }
    } catch (err: any) {
      console.warn('[Telegram Bot API Exception]:', err.message);
    }
  }

  return { success: false, message: `Could not deliver Telegram message to ${target}` };
}

/**
 * Generate Text-To-Speech audio and send as a Telegram Voice Note directly to a student's Phone Number or Chat ID
 */
export async function sendTelegramVoiceNote(spokenText: string, destination?: string): Promise<{ success: boolean; message: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const target = destination || process.env.TELEGRAM_CHAT_ID;

  if (!target) return { success: false, message: 'No Telegram target specified' };

  try {
    const audioResults = await googleTTS.getAllAudioBase64(spokenText, {
      lang: 'en',
      slow: false,
      timeout: 10000,
    });

    if (!audioResults || audioResults.length === 0) {
      return { success: false, message: 'Failed to generate TTS audio chunks' };
    }

    const audioBuffers = audioResults.map(chunk => Buffer.from(chunk.base64, 'base64'));
    const audioBuffer = Buffer.concat(audioBuffers);

    // 1. Try Personal User Account Voice Note (MTProto) directly to Phone Number
    if (apiId && apiHash && sessionString) {
      try {
        const client = await getPersonalTelegramClient();
        if (client) {
          let peer: any = target;
          if (/^\+?\d{10,12}$/.test(target)) {
            const formattedPhone = target.startsWith('+') ? target : `+91${target}`;
            try {
              peer = await client.getEntity(formattedPhone);
            } catch (err) {
              peer = null;
            }
          } else if (/^\d+$/.test(target)) {
            peer = BigInt(target);
          }

          if (peer) {
            const file = new CustomFile(`voice_note_${Date.now()}.mp3`, audioBuffer.length, '', audioBuffer);
            await client.sendFile(peer, {
              file,
              voiceNote: true,
              caption: '🎙️ Personal Voice Reminder'
            });
            console.log(`[Telegram Voice Note]: Voice note sent to ${target}`);
            return { success: true, message: `Voice Note Sent to ${target}` };
          }
        }
      } catch (err: any) {
        console.warn('[Telegram Voice Note UserBot Warning]:', err.message);
      }
    }

    // 2. Fallback to Bot API for numeric Chat IDs
    if (token && token !== 'YOUR_TELEGRAM_BOT_TOKEN' && /^\d+$/.test(target)) {
      const formData = new FormData();
      formData.append('chat_id', target);
      formData.append('voice', new Blob([audioBuffer], { type: 'audio/mp3' }), 'voice_note.mp3');
      formData.append('caption', '🎙️ Personal Voice Reminder');

      const response = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json() as any;
      if (data.ok) {
        return { success: true, message: `Voice Note Delivered to ${target}` };
      }
    }

    return { success: false, message: `Could not send Telegram voice note to ${target}` };
  } catch (err: any) {
    return { success: false, message: `Voice Note Error: ${err.message}` };
  }
}

/**
 * Format a natural spoken script for Text-to-Speech voice notes
 */
export function formatVoiceReminderScript(
  studentName: string,
  pendingMonthsList: string[],
  totalAmount: number,
  dueDayLabel: string,
  hostelName: string = 'Hostel Office'
): string {
  const count = pendingMonthsList.length;
  const formattedAmount = totalAmount.toLocaleString('en-IN');

  if (count <= 1) {
    const month = pendingMonthsList[0] || 'the current month';
    return `Hello ${studentName}. Friendly reminder from ${hostelName}: your hostel fee for ${month} of ${formattedAmount} rupees is pending. Your monthly due date is the ${dueDayLabel}. Please clear your dues at the office. Thank you.`;
  }

  if (count <= 3) {
    const cleanMonths = pendingMonthsList.map(m => m.replace(/\s\d{4}/, ''));
    let monthsSpoken = cleanMonths[0];
    if (cleanMonths.length === 2) {
      monthsSpoken = `${cleanMonths[0]} and ${cleanMonths[1]}`;
    } else if (cleanMonths.length === 3) {
      monthsSpoken = `${cleanMonths[0]}, ${cleanMonths[1]}, and ${cleanMonths[2]}`;
    }

    return `Hello ${studentName}. Important reminder from ${hostelName}: You have ${count} months of pending fees for ${monthsSpoken}, totaling ${formattedAmount} rupees. Your regular due date is the ${dueDayLabel} of every month. Please clear your accumulated dues at the hostel office. Thank you.`;
  }

  // If more than 3 months overdue, speak a concise urgent summary
  const firstMonth = pendingMonthsList[0].replace(/\s\d{4}/, '');
  const lastMonth = pendingMonthsList[count - 1].replace(/\s\d{4}/, '');
  return `Hello ${studentName}. Urgent notice from ${hostelName}: You have ${count} months of accumulated pending fees from ${firstMonth} to ${lastMonth}, totaling ${formattedAmount} rupees. Your regular due date is the ${dueDayLabel} of every month. Please visit the hostel office immediately to clear your dues. Thank you.`;
}


/**
 * Format a warm, personal message directly from the Hostel Warden / Management Office
 */
export function formatFeeReminderMessage(
  studentName: string,
  course: string,
  room: string,
  pendingMonthsList: string[],
  totalAmount: number,
  dueDayLabel: string,
  nextDueDate: string,
  phone?: string,
  hostelName: string = 'VMR Hostel'
): string {
  const isMultiMonth = pendingMonthsList.length > 1;
  const monthText = isMultiMonth 
    ? `${pendingMonthsList.length} Months (${pendingMonthsList.join(', ')})`
    : (pendingMonthsList[0] || 'Current Month');

  const headline = isMultiMonth
    ? `⚠️ <b>URGENT FEE DUES NOTICE</b>`
    : `📢 <b>MONTHLY FEE REMINDER</b>`;

  return `${headline}\n\n` +
         `<b>👋 Hello ${studentName},</b>\n\n` +
         `This is a personal message from the <b>Hostel Management Office (${hostelName})</b>.\n\n` +
         `Please find the details of your pending hostel dues below:\n\n` +
         `🏡 <b>Room:</b> ${room}\n` +
         `🎓 <b>Course:</b> ${course}\n` +
         `📅 <b>Pending Period:</b> ${monthText}\n` +
         `🗓️ <b>Monthly Due Date:</b> ${dueDayLabel} of every month (${nextDueDate})\n` +
         `💰 <b>Total Outstanding Dues:</b> ₹${totalAmount.toLocaleString('en-IN')}\n` +
         (phone ? `📞 <b>Registered Phone:</b> ${phone}\n` : '') +
         `\n` +
         `Please clear your dues at the hostel office or via UPI at your earliest convenience.\n\n` +
         `If you have already paid or need any assistance, feel free to reply directly or visit the warden's desk.\n\n` +
         `<i>Best regards,</i>\n` +
         `<b>Hostel Administration Desk</b>`;
}

