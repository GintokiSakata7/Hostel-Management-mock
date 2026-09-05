import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { sendTelegramMessage, sendTelegramVoiceNote, formatFeeReminderMessage } from './telegramService';
import { sendWhatsAppReminder, triggerVoiceCallReminder, ReminderNotificationResult } from './voiceWhatsappService';

const prisma = new PrismaClient();
const settingsPath = path.join(__dirname, '../../settings.json');

let activeCronTask: cron.ScheduledTask | null = null;
let currentScheduledTime = '19:00'; // Default 7 PM IST

// Helper: read settings file
function readSettingsFile(): any {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to read settings.json:', err);
  }
  return {};
}

// Helper: write settings file
function writeSettingsFile(data: any) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write settings.json:', err);
  }
}

// Helper to get YYYY-MM
const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Helper for month label
const getMonthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  const date = new Date(Number(y), Number(mo) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

/**
 * Core function to query students with pending fee for current month and dispatch reminders
 */
export async function executeFeeReminderDispatch(): Promise<{
  month: string;
  monthLabel: string;
  totalPendingCount: number;
  results: ReminderNotificationResult[];
  summaryMessage: string;
}> {
  const currentM = getCurrentMonth();
  const label = getMonthLabel(currentM);

  console.log(`[Fee Reminder Service]: Scanning active students for pending fee (${label})...`);

  // Query active students
  const activeStudents = await prisma.student.findMany({
    where: { status: 'Active' },
    include: {
      beds: { include: { room: { include: { building: true } } } },
      fees: { where: { month: currentM } }
    }
  });

  // Filter students whose month fee is NOT completed
  const pendingStudents = activeStudents.filter(s => {
    const feeRec = s.fees.find(f => f.month === currentM);
    return !feeRec || feeRec.status !== 'Completed';
  });

  const results: ReminderNotificationResult[] = [];

  if (pendingStudents.length === 0) {
    const msg = `✅ All students have paid their fees for ${label}. No reminder messages needed today.`;
    console.log(`[Fee Reminder Service]: ${msg}`);
    await sendTelegramMessage(`<b>🎉 FEE REMINDER UPDATE</b>\n\n${msg}`);
    return {
      month: currentM,
      monthLabel: label,
      totalPendingCount: 0,
      results: [],
      summaryMessage: msg
    };
  }

  // Send individual reminders & summary
  let summaryText = `<b>📢 AUTOMATED FEE REMINDER BATCH (${label})</b>\n`;
  summaryText += `Found <b>${pendingStudents.length}</b> student(s) with pending fees.\n\n`;

  for (let i = 0; i < pendingStudents.length; i++) {
    const student = pendingStudents[i];
    const bed = student.beds.length > 0 ? student.beds[0] : null;
    const roomName = bed ? `${bed.room.roomNumber} (${bed.room.building?.name || ''})` : 'Unallocated';
    const amount = 5500; // Standard monthly fee amount

    // 1. Format & Send Telegram Text Alert directly to student's phone
    const studentTarget = student.phone || undefined;
    const telegramMsg = formatFeeReminderMessage(
      student.name,
      student.course,
      roomName,
      label,
      amount,
      student.phone || undefined
    );
    const tgRes = await sendTelegramMessage(telegramMsg, studentTarget);

    // 2. Generate and Send Telegram Voice Note Audio Message directly to student's phone
    const voiceScript = `Hello ${student.name}. Friendly reminder from Hostel Office: your fee of ${amount} rupees for ${label} is pending. Please clear your dues. Thank you.`;
    const tgVoiceRes = await sendTelegramVoiceNote(voiceScript, studentTarget);

    // 3. Trigger WhatsApp Reminder
    const waRes = await sendWhatsAppReminder(student.name, student.phone || '9999999999', amount, label);

    // 4. Trigger Voice Call Reminder
    const voiceRes = await triggerVoiceCallReminder(student.name, student.phone || '9999999999', amount, label);

    results.push({
      studentId: student.id,
      studentName: student.name,
      phone: student.phone || 'N/A',
      telegramStatus: tgRes.message,
      telegramVoiceStatus: tgVoiceRes.message,
      whatsappStatus: waRes,
      voiceCallStatus: voiceRes
    });

    summaryText += `${i + 1}. 👤 <b>${student.name}</b> (${student.phone || 'No phone'})\n   Room: ${roomName} | Dues: ₹${amount}\n\n`;
  }

  // Send summary digest ONLY to the Hostel Admin / Owner Chat ID
  const ownerChatId = process.env.TELEGRAM_CHAT_ID;
  if (ownerChatId) {
    await sendTelegramMessage(summaryText, ownerChatId);
  }

  return {
    month: currentM,
    monthLabel: label,
    totalPendingCount: pendingStudents.length,
    results,
    summaryMessage: `Successfully dispatched text & voice reminders to ${pendingStudents.length} student(s) for ${label}.`
  };
}

/**
 * Get current reminder schedule status & settings
 */
export function getReminderScheduleSettings() {
  const settings = readSettingsFile();
  const time = settings.reminderTime || currentScheduledTime;
  const [h, m] = time.split(':');
  const cronExpr = `${Number(m)} ${Number(h)} * * *`;
  return {
    reminderTime: time,
    cronExpr,
    timezone: 'Asia/Kolkata',
    active: !!activeCronTask
  };
}

/**
 * Update and reschedule the daily fee reminder time (e.g. "19:00", "00:00", "12:00")
 */
export function updateReminderScheduleTime(timeStr: string) {
  // Validate format HH:MM
  const match = timeStr.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) {
    throw new Error('Invalid time format. Expected HH:MM (24-hour format), e.g. 19:00 or 00:00');
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const cronExpr = `${minute} ${hour} * * *`;
  const timezone = 'Asia/Kolkata';

  // Stop existing cron task if running
  if (activeCronTask) {
    activeCronTask.stop();
    console.log(`[Fee Reminder Scheduler]: Previous cron task stopped.`);
  }

  // Schedule new cron task
  activeCronTask = cron.schedule(cronExpr, async () => {
    console.log(`[Cron Trigger]: ⏰ Daily ${timeStr} IST Fee Reminder Job execution started...`);
    try {
      await executeFeeReminderDispatch();
    } catch (err: any) {
      console.error('[Cron Trigger Error]: Failed to execute fee reminder job:', err.message);
    }
  }, {
    timezone
  });

  currentScheduledTime = timeStr;

  // Save to settings.json
  const settings = readSettingsFile();
  settings.reminderTime = timeStr;
  writeSettingsFile(settings);

  console.log(`[Fee Reminder Scheduler]: Re-scheduled daily fee reminders for ${timeStr} IST (Cron: '${cronExpr}' in ${timezone})`);

  return getReminderScheduleSettings();
}

/**
 * Initialize background node-cron schedule on app startup
 */
export function initReminderScheduler() {
  const settings = readSettingsFile();
  const initialTime = settings.reminderTime || '19:00';
  updateReminderScheduleTime(initialTime);
}
