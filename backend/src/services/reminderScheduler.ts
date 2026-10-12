import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { calculateStudentDueStatus, formatMonthLabel, toMonthString } from './billingHelper';
import { sendFeeReminderEmail, sendEmail } from './emailService';

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
  results: any[];
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

  const results: any[] = [];

  if (pendingStatuses.length === 0) {
    const msg = `✅ All students are fully up to date with their fees as of ${currentMonthName}. No reminder messages needed today.`;
    console.log(`[Fee Reminder Service]: ${msg}`);
    // Log success when no dues are pending
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

  let htmlTableRows = '';

  for (let i = 0; i < pendingStatuses.length; i++) {
    const s = pendingStatuses[i];
    const studentTarget = s.phone || undefined;
    const monthsList = s.pendingMonths.map(p => p.monthLabel);

    // Send Email Reminder (Testing mode: only send for the first student to specific email)
    let emailStatus = 'SKIPPED';
    if (i === 0) {
      const emailTo = 'rishivardhan165@gmail.com';
      const emailRes = await sendFeeReminderEmail(emailTo, s.studentName, s.totalPendingAmount, s.nextDueDate || s.dueDayLabel);
      emailStatus = emailRes.success ? 'SENT' : 'FAILED';
    }

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
      emailStatus,
    });

    const monthStrSummary = monthsList.join(', ');
    summaryText += `${i + 1}. 👤 <b>${s.studentName}</b> (${s.phone || 'No phone'})\n` +
                   `   Room: ${s.roomName} | Due Day: ${s.dueDayLabel}\n` +
                   `   Overdue: ${s.pendingMonthsCount} Month(s) (${monthStrSummary})\n` +
                   `   Total Dues: <b>₹${s.totalPendingAmount.toLocaleString('en-IN')}</b>\n\n`;

    htmlTableRows += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${s.studentName}</strong><br><small style="color: #666;">${s.phone || 'N/A'}</small></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${s.roomName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${s.pendingMonthsCount} Month(s)<br><small style="color: #666;">${monthStrSummary}</small></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #d32f2f;">₹${s.totalPendingAmount.toLocaleString('en-IN')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${s.dueDayLabel}</td>
      </tr>
    `;
  }

  const adminEmail = process.env.EMAIL_ADDRESS || 'rishichepuri764@gmail.com';
  
  const htmlSummary = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
      <h2 style="color: #2c3e50;">📢 Automated Fee Reminder Batch (${currentMonthName})</h2>
      <p style="font-size: 16px;">Found <strong>${pendingStatuses.length}</strong> student(s) with pending dues totaling <strong style="color: #d32f2f;">₹${totalArrears.toLocaleString('en-IN')}</strong>.</p>
      
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; min-width: 500px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px 10px; border-bottom: 2px solid #dee2e6;">Student</th>
              <th style="padding: 12px 10px; border-bottom: 2px solid #dee2e6;">Room</th>
              <th style="padding: 12px 10px; border-bottom: 2px solid #dee2e6;">Overdue</th>
              <th style="padding: 12px 10px; border-bottom: 2px solid #dee2e6;">Total Dues</th>
              <th style="padding: 12px 10px; border-bottom: 2px solid #dee2e6;">Due Day</th>
            </tr>
          </thead>
          <tbody>
            ${htmlTableRows}
          </tbody>
        </table>
      </div>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">This is an automated digest generated by your Hostel Management System.</p>
    </div>
  `;
  
  await sendEmail(
    adminEmail,
    `Hostel Fee Reminders Summary - ${currentMonthName}`,
    summaryText.replace(/<b>|<\/b>/g, ''), // Plain text fallback
    htmlSummary
  );

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
  result?: any;
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

  const emailTo = 'rishivardhan165@gmail.com'; // Testing mode
  const emailRes = await sendFeeReminderEmail(emailTo, dueStatus.studentName, totalAmt, dueStatus.nextDueDate || dueStatus.dueDayLabel);

  const result: any = {
    studentId: dueStatus.studentId,
    studentName: dueStatus.studentName,
    phone: dueStatus.phone || 'N/A',
    roomName: dueStatus.roomName,
    pendingMonthsCount: dueStatus.pendingMonthsCount,
    pendingMonthsList: monthsList,
    totalAmount: totalAmt,
    dueDayLabel: dueStatus.dueDayLabel,
    nextDueDate: dueStatus.nextDueDate,
    emailStatus: emailRes.success ? 'SENT' : 'FAILED',
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
