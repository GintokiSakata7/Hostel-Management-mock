import { Student, Fee } from '@prisma/client';

export interface StudentWithFeesAndBeds extends Student {
  beds?: any[];
  fees?: Fee[];
}

export interface StudentDueStatus {
  studentId: string;
  studentName: string;
  phone: string | null;
  roomName: string;
  course: string;
  dateOfJoining: Date;
  dueDayOfMonth: number; // e.g., 15
  dueDayLabel: string;   // e.g., "15th"
  nextDueDate: string;   // formatted e.g., "15 Sep 2026"
  isDueToday: boolean;
  pendingMonthsCount: number;
  pendingMonths: { month: string; monthLabel: string; amount: number }[];
  totalPendingAmount: number;
  latestPaidMonth: string | null;
}

// Ordinal helper: 1 -> 1st, 2 -> 2nd, 3 -> 3rd, 15 -> 15th
export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Format YYYY-MM to human readable label: "2026-09" -> "September 2026"
export function formatMonthLabel(m: string): string {
  if (!m) return '';
  const parts = m.split('-');
  if (parts.length < 2) return m;
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const d = new Date(y, mo - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Format YYYY-MM string
export function toMonthString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Clamps day of month to maximum valid days in given year/month.
 * e.g., Jan 31 -> Feb 28 (or 29)
 */
export function clampDate(year: number, monthZeroIndexed: number, targetDay: number): Date {
  const daysInMonth = new Date(year, monthZeroIndexed + 1, 0).getDate();
  const clampedDay = Math.min(targetDay, daysInMonth);
  return new Date(year, monthZeroIndexed, clampedDay);
}

/**
 * Calculates all billing cycles and pending dues for a student from their date of joining up to the reference date.
 */
export function calculateStudentDueStatus(
  student: StudentWithFeesAndBeds,
  standardMonthlyFee: number = 5500,
  referenceDate: Date = new Date()
): StudentDueStatus {
  const joinDate = student.dateOfJoining ? new Date(student.dateOfJoining) : new Date();
  const joinDay = joinDate.getDate() || 1;
  const joinYear = joinDate.getFullYear();
  const joinMonth = joinDate.getMonth(); // 0-indexed

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed
  const refDay = referenceDate.getDate();

  // Find all calendar/anniversary months from join month up to current month (limit to maximum 24 months back for safety)
  const requiredMonths: string[] = [];
  let currY = joinYear;
  let currM = joinMonth;

  // If join date is in the future, at least include current month
  if (new Date(joinYear, joinMonth, 1) > new Date(refYear, refMonth, 1)) {
    currY = refYear;
    currM = refMonth;
  }

  // Safety: don't scan more than 12 months in the past for backlog unless explicitly needed
  const earliestAllowed = new Date(refYear, refMonth - 11, 1);
  if (new Date(currY, currM, 1) < earliestAllowed) {
    currY = earliestAllowed.getFullYear();
    currM = earliestAllowed.getMonth();
  }

  while (
    currY < refYear || 
    (currY === refYear && currM <= refMonth)
  ) {
    const mStr = `${currY}-${String(currM + 1).padStart(2, '0')}`;
    requiredMonths.push(mStr);

    currM++;
    if (currM > 11) {
      currM = 0;
      currY++;
    }
  }

  // Fees mapping for student
  const fees = student.fees || [];
  const completedFeeMonths = new Set(
    fees.filter(f => f.status === 'Completed').map(f => f.month)
  );

  const pendingMonths: { month: string; monthLabel: string; amount: number }[] = [];
  let latestPaidMonth: string | null = null;

  for (const mStr of requiredMonths) {
    if (completedFeeMonths.has(mStr)) {
      latestPaidMonth = mStr;
    } else {
      // Find if an explicit pending fee record exists with a specific amount
      const feeRec = fees.find(f => f.month === mStr);
      const amount = feeRec?.amount || standardMonthlyFee;
      pendingMonths.push({
        month: mStr,
        monthLabel: formatMonthLabel(mStr),
        amount
      });
    }
  }

  const totalPendingAmount = pendingMonths.reduce((sum, p) => sum + p.amount, 0);

  // Dynamic due date for current month
  const currentMonthDueDate = clampDate(refYear, refMonth, joinDay);
  const nextDueDateFormatted = currentMonthDueDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const isDueToday = refDay === currentMonthDueDate.getDate();

  const bed = student.beds && student.beds.length > 0 ? student.beds[0] : null;
  const roomName = bed ? `${bed.room?.roomNumber || 'Room'} (${bed.room?.building?.name || ''})` : 'Unallocated';

  return {
    studentId: student.id,
    studentName: student.name,
    phone: student.phone,
    roomName,
    course: student.course,
    dateOfJoining: joinDate,
    dueDayOfMonth: joinDay,
    dueDayLabel: getOrdinal(joinDay),
    nextDueDate: nextDueDateFormatted,
    isDueToday,
    pendingMonthsCount: pendingMonths.length,
    pendingMonths,
    totalPendingAmount,
    latestPaidMonth: latestPaidMonth ? formatMonthLabel(latestPaidMonth) : null
  };
}
