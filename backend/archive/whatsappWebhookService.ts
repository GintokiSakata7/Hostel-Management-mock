import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

/**
 * Handle GET Webhook Verification Challenge from Meta WhatsApp Cloud API
 */
export function handleWebhookVerification(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WHATSAPP_VERIFY_TOKEN || 'hostel_whatsapp_webhook_secret_2026';

  console.log('[Meta Webhook Verification Attempt]:', {
    mode,
    receivedToken: token,
    expectedToken,
    match: token === expectedToken
  });

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Meta WhatsApp Webhook Verified Successfully]');
    return res.status(200).send(challenge);
  } else {
    console.warn(`[Meta WhatsApp Webhook Verification Failed]: Received token "${token}" does not match expected "${expectedToken}"`);
    return res.sendStatus(403);
  }
}

/**
 * Handle POST Webhook Event Updates from Meta (Delivery Statuses & Incoming Messages)
 */
export async function processWebhookPayload(body: any, prisma: PrismaClient) {
  try {
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // 1. Process Status Updates (sent, delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const s of value.statuses) {
            const waMessageId = s.id;
            const statusUpper = (s.status || '').toUpperCase(); // SENT | DELIVERED | READ | FAILED
            const recipientPhone = s.recipient_id || '';

            console.log(`[Meta WhatsApp Webhook Status Update]: MsgID=${waMessageId}, Status=${statusUpper}, Phone=${recipientPhone}`);

            // Log event in PostgreSQL WhatsAppLog table
            await prisma.whatsAppLog.create({
              data: {
                waMessageId,
                recipientPhone,
                eventType: 'status_update',
                status: statusUpper,
                payload: JSON.stringify(s)
              }
            });

            // Update matching Fee record whatsappStatus
            if (waMessageId) {
              const matchedFee = await prisma.fee.findFirst({
                where: { whatsappMsgId: waMessageId }
              });

              if (matchedFee) {
                await prisma.fee.update({
                  where: { id: matchedFee.id },
                  data: { whatsappStatus: statusUpper }
                });
                console.log(`[Database Updated]: Fee ${matchedFee.id} receipt whatsappStatus set to ${statusUpper}`);
              }
            }
          }
        }

        // 2. Process Incoming Messages from Students
        if (value.messages && Array.isArray(value.messages)) {
          for (const m of value.messages) {
            const senderPhone = m.from;
            const msgType = m.type;
            const textBody = m.text?.body || `[${msgType} message]`;

            console.log(`[Meta WhatsApp Incoming Message]: From=${senderPhone}, Content="${textBody}"`);

            await prisma.whatsAppLog.create({
              data: {
                waMessageId: m.id,
                recipientPhone: senderPhone,
                eventType: 'incoming_message',
                status: 'RECEIVED',
                payload: JSON.stringify(m)
              }
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[Meta WhatsApp Webhook Processing Error]:', err.message);
  }
}
