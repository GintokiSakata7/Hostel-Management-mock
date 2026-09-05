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
    const audioUrl = googleTTS.getAudioUrl(spokenText, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });

    const audioRes = await fetch(audioUrl);
    const arrayBuffer = await audioRes.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

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
 * Format a warm, personal message directly from the Hostel Warden / Management Office
 */
export function formatFeeReminderMessage(studentName: string, course: string, room: string, monthLabel: string, amount: number, phone?: string): string {
  return `<b>👋 Hello ${studentName},</b>\n\n` +
         `This is a personal message from the <b>Hostel Management Office (VMR Hostel)</b>.\n\n` +
         `We hope you are doing well! This is a friendly reminder regarding your hostel fee for <b>${monthLabel}</b>:\n\n` +
         `🏡 <b>Room:</b> ${room}\n` +
         `🎓 <b>Course:</b> ${course}\n` +
         `💰 <b>Pending Fee:</b> ₹${amount}\n` +
         (phone ? `📞 <b>Contact Registered:</b> ${phone}\n` : '') +
         `\n` +
         `Please clear your dues at the hostel management office or pay via UPI at your earliest convenience.\n\n` +
         `If you have already paid or need any assistance, feel free to reply directly or visit the warden's desk.\n\n` +
         `<i>Best regards,</i>\n` +
         `<b>Hostel Administration Desk</b>`;
}
