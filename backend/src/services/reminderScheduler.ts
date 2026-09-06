import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { calculateStudentDueStatus, formatMonthLabel, toMonthString } from './billingHelper';
import { sendTelegramMessage, sendTelegramVoiceNote, formatFeeReminderMessage, formatVoiceReminderScript } from './telegramService';
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

/**
 * Core function to query all active students, audit all unpaid/backlog cycles, and dispatch reminders
 */
export async function executeFeeReminderDispatch(): Promise<{
  month: string;
  monthLabel: string;
  totalPendingCount: number;
  totalPendingAmount: number;
  results: ReminderNotificationResult[];
  summaryMessage: string;
}> {
  const currentMonthStr = toMonthString(new Date());
  const currentMonthName = formatMonthLabel(currentMonthStr);
  const settings = readSettingsFile();
  const hostelName = settings.hostelName || 'VMR Hostel';
  const standardFee = settings.monthlyFee || 5500;

  console.log(`[Fee Reminder Service]: Scanning active students for pending fee backlog and dynamic due dates (${currentMonthName})...`);

  // Query all active students with beds and all historical fee records
  const activeStudents = await prisma.student.findMany({
    where: { status: 'Active' },
    include: {
      beds: { include: { room: { include: { building: true } } } },
      fees: true
    }
  });

  // Calculate dynamic due status for each student across all elapsed cycles
  const studentStatuses = activeStudents.map(s => calculateStudentDueStatus(s, standardFee));

  // Filter students who have at least 1 unpaid month
  const pendingStatuses = studentStatuses.filter(s => s.pendingMonthsCount > 0);
  const totalArrears = pendingStatuses.reduce((sum, s) => sum + s.totalPendingAmount, 0);

  const results: ReminderNotificationResult[] = [];

  if (pendingStatuses.length === 0) {
    const msg = `✅ All students are fully up to date with their fees as of ${currentMonthName}. No reminder messages needed today.`;
    console.log(`[Fee Reminder Service]: ${msg}`);
    await sendTelegramMessage(`<b>🎉 FEE REMINDER UPDATE</b>\n\n${msg}`);
    return {
      month: currentMonthStr,
      monthLabel: currentMonthName,
      totalPendingCount: 0,
      totalPendingAmount: 0,
      results: [],
      summaryMessage: msg
    };
  }

  // Build Admin summary digest
  let summaryText = `<b>📢 AUTOMATED FEE REMINDER BATCH (${currentMonthName})</b>\n`;
  summaryText += `Found <b>${pendingStatuses.length}</b> student(s) with pending dues totaling <b>₹${totalArrears.toLocaleString('en-IN')}</b>.\n\n`;

  for (let i = 0; i < pendingStatuses.length; i++) {
    const s = pendingStatuses[i];
    const studentTarget = s.phone || undefined;
    const monthsList = s.pendingMonths.map(p => p.monthLabel);

    // 1. Format & Send Telegram Text Alert directly to student's phone
    const telegramMsg = formatFeeReminderMessage(
      s.studentName,
      s.course,
      s.roomName,
      monthsList,
      s.totalPendingAmount,
      s.dueDayLabel,
      s.nextDueDate,
      s.phone || undefined,
      hostelName
    );
    const tgRes = await sendTelegramMessage(telegramMsg, studentTarget);

    // 2. Generate and Send Telegram Voice Note Audio Message directly to student's phone
    const voiceScript = formatVoiceReminderScript(
      s.studentName,
      monthsList,
      s.totalPendingAmount,
      s.dueDayLabel,
      hostelName
    );
    console.log(`[Fee Reminder Service]: Voice script for ${s.studentName} (${s.pendingMonthsCount} mos): "${voiceScript}"`);
    const tgVoiceRes = await sendTelegramVoiceNote(voiceScript, studentTarget);

    // 3. Trigger WhatsApp Reminder
    const waLabel = monthsList.length > 1 ? `${monthsList.length} Months (${monthsList.join(', ')})` : monthsList[0];
    const waRes = await sendWhatsAppReminder(s.studentName, s.phone || '9999999999', s.totalPendingAmount, waLabel);

    // 4. Trigger Voice Call Reminder
    const voiceRes = await triggerVoiceCallReminder(s.studentName, s.phone || '9999999999', s.totalPendingAmount, waLabel);

    results.push({
      studentId: s.studentId,
      studentName: s.studentName,
      phone: s.phone || 'N/A',
      roomName: s.roomName,
      pendingMonthsCount: s.pendingMonthsCount,
      pendingMonthsList: monthsList,
      totalAmount: s.totalPendingAmount,
      dueDayLabel: s.dueDayLabel,
      nextDueDate: s.nextDueDate,
      telegramStatus: tgRes.message,
      telegramVoiceStatus: tgVoiceRes.message,
      whatsappStatus: waRes,
      voiceCallStatus: voiceRes
    });

    const monthStrSummary = monthsList.join(', ');
    summaryText += `${i + 1}. 👤 <b>${s.studentName}</b> (${s.phone || 'No phone'})\n` +
                   `   Room: ${s.roomName} | Due Day: ${s.dueDayLabel}\n` +
                   `   Overdue: ${s.pendingMonthsCount} Month(s) (${monthStrSummary})\n` +
                   `   Total Dues: <b>₹${s.totalPendingAmount.toLocaleString('en-IN')}</b>\n\n`;
  }

  // Send summary digest ONLY to the Hostel Admin / Owner Chat ID
  const ownerChatId = process.env.TELEGRAM_CHAT_ID;
  if (ownerChatId) {
    await sendTelegramMessage(summaryText, ownerChatId);
  }

  return {
    month: currentMonthStr,
    monthLabel: currentMonthName,
    totalPendingCount: pendingStatuses.length,
    totalPendingAmount: totalArrears,
    results,
    summaryMessage: `Dispatched text & voice reminders to ${pendingStatuses.length} student(s) with total outstanding dues of ₹${totalArrears.toLocaleString('en-IN')}.`
  };
}

/**
 * Dispatch personalized text and voice reminder to a single student on-demand
 */
export async function executeSingleStudentReminder(studentId: string): Promise<{
  success: boolean;
  message: string;
  result?: ReminderNotificationResult;
}> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      beds: { include: { room: { include: { building: true } } } },
      fees: true
    }
  });

  if (!student) {
    return { success: false, message: 'Student not found' };
  }

  const settings = readSettingsFile();
  const hostelName = settings.hostelName || 'VMR Hostel';
  const standardFee = settings.monthlyFee || 5500;

  const dueStatus = calculateStudentDueStatus(student, standardFee);
  const studentTarget = dueStatus.phone || undefined;
  const monthsList = dueStatus.pendingMonths.length > 0
    ? dueStatus.pendingMonths.map(p => p.monthLabel)
    : [formatMonthLabel(toMonthString(new Date()))];

  const totalAmt = dueStatus.totalPendingAmount > 0 ? dueStatus.totalPendingAmount : standardFee;

  // 1. Telegram Text
  const telegramMsg = formatFeeReminderMessage(
    dueStatus.studentName,
    dueStatus.course,
    dueStatus.roomName,
    monthsList,
    totalAmt,
    dueStatus.dueDayLabel,
    dueStatus.nextDueDate,
    dueStatus.phone || undefined,
    hostelName
  );
  const tgRes = await sendTelegramMessage(telegramMsg, studentTarget);

  // 2. Telegram Voice Note
  const voiceScript = formatVoiceReminderScript(
    dueStatus.studentName,
    monthsList,
    totalAmt,
    dueStatus.dueDayLabel,
    hostelName
  );
  const tgVoiceRes = await sendTelegramVoiceNote(voiceScript, studentTarget);

  // 3. WhatsApp
  const waLabel = monthsList.length > 1 ? `${monthsList.length} Months (${monthsList.join(', ')})` : monthsList[0];
  const waRes = await sendWhatsAppReminder(dueStatus.studentName, dueStatus.phone || '9999999999', totalAmt, waLabel);

  // 4. Voice Call
  const voiceRes = await triggerVoiceCallReminder(dueStatus.studentName, dueStatus.phone || '9999999999', totalAmt, waLabel);

  const result: ReminderNotificationResult = {
    studentId: dueStatus.studentId,
    studentName: dueStatus.studentName,
    phone: dueStatus.phone || 'N/A',
    roomName: dueStatus.roomName,
    pendingMonthsCount: dueStatus.pendingMonthsCount,
    pendingMonthsList: monthsList,
    totalAmount: totalAmt,
    dueDayLabel: dueStatus.dueDayLabel,
    nextDueDate: dueStatus.nextDueDate,
    telegramStatus: tgRes.message,
    telegramVoiceStatus: tgVoiceRes.message,
    whatsappStatus: waRes,
    voiceCallStatus: voiceRes
  };

  return {
    success: true,
    message: `Individual reminder successfully sent to ${dueStatus.studentName}`,
    result
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
