import { Student, Fee } from '@prisma/client';

export interface StudentWithFeesAndBeds extends Student {
  beds?: any[];
  fees?: Fee[];
}

export interface StudentDueStatus {
  studentId: string;
  studentName: string;
  phone: string | null;
  email: string | null;
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

export interface MonthFeeStatus {
  status: 'Paid' | 'Pending' | 'Upcoming' | 'Not Enrolled';
  cycleDueDay: number;
  cycleStart: Date;
  cycleEnd: Date;
  cycleLabel: string;      // e.g. "10 Oct 2026 – 09 Nov 2026"
  amountDue: number;
  hasAccumulatedArrears: boolean;
  pendingMonthsCount: number;
  totalArrearsAmount: number;
  oldestUnpaidMonth: string | null;  // YYYY-MM of oldest cycle needing payment
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

// Format a date to "DD MMM YYYY"
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
 * Returns the canonical billing cycle for a student for a given YYYY-MM month string.
 * Cycle runs from joinDay of monthStr to (joinDay - 1) of the next month.
 * e.g. joinDay=10, monthStr="2026-10" -> cycleStart=Oct 10, cycleEnd=Nov 9
 */
export function getCycleForMonth(joinDay: number, monthStr: string): { cycleStart: Date; cycleEnd: Date; cycleDueDate: Date; cycleLabel: string } {
  const [y, m] = monthStr.split('-').map(Number);
  const monthZeroIdx = m - 1;

  const cycleDueDate = clampDate(y, monthZeroIdx, joinDay);

  // Cycle starts on cycleDueDate and ends the day before the same day next month
  const nextMonthZeroIdx = (monthZeroIdx + 1) % 12;
  const nextY = monthZeroIdx === 11 ? y + 1 : y;
  const cycleEndDay = clampDate(nextY, nextMonthZeroIdx, joinDay);
  // End is one day before the next cycle's start
  const cycleEnd = new Date(cycleEndDay.getTime() - 24 * 60 * 60 * 1000);

  const cycleLabel = `${formatShortDate(cycleDueDate)} – ${formatShortDate(cycleEnd)}`;
  return { cycleStart: cycleDueDate, cycleEnd, cycleDueDate, cycleLabel };
}

/**
 * UNIVERSAL SINGLE SOURCE OF TRUTH for fee status of one student for one month.
 *
 * This function is the canonical implementation used by ALL backend endpoints:
 * /api/stats, /api/rooms/:buildingId, /api/reports/fees, /api/fees/monthly-status,
 * /api/students, /api/notifications
 *
 * Status rules:
 * - 'Not Enrolled': The queried month is prior to the student's admission month.
 * - 'Paid': A completed payment record exists for this month.
 * - 'Upcoming': No payment record AND the cycle due date has NOT yet arrived (future or today < cycleDueDay in current month).
 * - 'Pending': No payment record AND cycle due date has passed (overdue).
 */
export function getStudentMonthFeeStatus(
  student: StudentWithFeesAndBeds,
  monthStr: string,  // "2026-10"
  referenceDate: Date = new Date(),
  standardMonthlyFee: number = 5500
): MonthFeeStatus {
  const joinDate = student.dateOfJoining ? new Date(student.dateOfJoining) : new Date();
  const joinDay = joinDate.getDate() || 1;
  const joinYear = joinDate.getFullYear();
  const joinMonth0 = joinDate.getMonth(); // 0-indexed

  const [qYear, qMonth1] = monthStr.split('-').map(Number);
  const qMonth0 = qMonth1 - 1; // 0-indexed

  const refYear = referenceDate.getFullYear();
  const refMonth0 = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  const { cycleStart, cycleEnd, cycleDueDate, cycleLabel } = getCycleForMonth(joinDay, monthStr);

  // --- Status: Not Enrolled ---
  // The queried month is BEFORE the student's join month
  const isBeforeJoining =
    qYear < joinYear ||
    (qYear === joinYear && qMonth0 < joinMonth0);

  if (isBeforeJoining) {
    return {
      status: 'Not Enrolled',
      cycleDueDay: joinDay,
      cycleStart,
      cycleEnd,
      cycleLabel,
      amountDue: 0,
      hasAccumulatedArrears: false,
      pendingMonthsCount: 0,
      totalArrearsAmount: 0,
      oldestUnpaidMonth: null
    };
  }

  // --- Status: Paid ---
  const fees = student.fees || [];
  const feeRecord = fees.find(f => f.month === monthStr && f.status === 'Completed');
  if (feeRecord) {
    // Even if paid for this month, compute arrears from other months
    const arrears = _computeArrears(student, standardMonthlyFee, referenceDate, monthStr);
    return {
      status: 'Paid',
      cycleDueDay: joinDay,
      cycleStart,
      cycleEnd,
      cycleLabel,
      amountDue: 0,
      hasAccumulatedArrears: arrears.pendingMonthsCount > 0,
      pendingMonthsCount: arrears.pendingMonthsCount,
      totalArrearsAmount: arrears.totalArrearsAmount,
      oldestUnpaidMonth: arrears.oldestUnpaidMonth
    };
  }

  // Normalize reference date to start of day for comparison
  const refDateStart = new Date(refYear, refMonth0, refDay);
  const cycleDueDateStart = new Date(cycleDueDate.getFullYear(), cycleDueDate.getMonth(), cycleDueDate.getDate());

  // --- Status: Upcoming ---
  // Cycle's due date hasn't arrived yet
  const isFutureMonth = qYear > refYear || (qYear === refYear && qMonth0 > refMonth0);
  const isCurrentMonth = qYear === refYear && qMonth0 === refMonth0;
  const cycleDueDateNotYetReached = cycleDueDateStart > refDateStart;

  if (isFutureMonth || (isCurrentMonth && cycleDueDateNotYetReached)) {
    // Check if there are arrears from prior months even though THIS month is upcoming
    const arrears = _computeArrears(student, standardMonthlyFee, referenceDate, null);
    const feeRec = fees.find(f => f.month === monthStr);
    const amountDue = feeRec?.amount || standardMonthlyFee;
    return {
      status: 'Upcoming',
      cycleDueDay: joinDay,
      cycleStart,
      cycleEnd,
      cycleLabel,
      amountDue,
      hasAccumulatedArrears: arrears.pendingMonthsCount > 0,
      pendingMonthsCount: arrears.pendingMonthsCount,
      totalArrearsAmount: arrears.totalArrearsAmount,
      oldestUnpaidMonth: arrears.oldestUnpaidMonth
    };
  }

  // --- Status: Pending ---
  const feeRec = fees.find(f => f.month === monthStr);
  const amountDue = feeRec?.amount || standardMonthlyFee;
  const arrears = _computeArrears(student, standardMonthlyFee, referenceDate, null);
  return {
    status: 'Pending',
    cycleDueDay: joinDay,
    cycleStart,
    cycleEnd,
    cycleLabel,
    amountDue,
    hasAccumulatedArrears: arrears.pendingMonthsCount > 0,
    pendingMonthsCount: arrears.pendingMonthsCount,
    totalArrearsAmount: arrears.totalArrearsAmount,
    oldestUnpaidMonth: arrears.oldestUnpaidMonth
  };
}

/**
 * Internal helper: compute all unpaid/overdue months across the student's history up to referenceDate.
 * Optionally excludes a specific month from the count (e.g., to avoid double-counting the viewed month).
 */
function _computeArrears(
  student: StudentWithFeesAndBeds,
  standardMonthlyFee: number,
  referenceDate: Date,
  excludeMonth: string | null
): { pendingMonthsCount: number; totalArrearsAmount: number; oldestUnpaidMonth: string | null } {
  const joinDate = student.dateOfJoining ? new Date(student.dateOfJoining) : new Date();
  const joinDay = joinDate.getDate() || 1;
  const joinYear = joinDate.getFullYear();
  const joinMonth0 = joinDate.getMonth();

  const refYear = referenceDate.getFullYear();
  const refMonth0 = referenceDate.getMonth();
  const refDay = referenceDate.getDate();
  const refDateStart = new Date(refYear, refMonth0, refDay);
  const joinDateStart = new Date(joinYear, joinMonth0, joinDay);

  const fees = student.fees || [];
  const completedFeeMonths = new Set(
    fees.filter(f => f.status === 'Completed').map(f => f.month)
  );

  const pendingMonths: string[] = [];

  if (refDateStart >= joinDateStart) {
    let currY = joinYear;
    let currM = joinMonth0;

    // Safety: don't scan more than 12 months of backlog
    const earliestAllowed = new Date(refYear, refMonth0 - 11, 1);
    if (new Date(currY, currM, 1) < earliestAllowed) {
      currY = earliestAllowed.getFullYear();
      currM = earliestAllowed.getMonth();
    }

    while (currY < refYear || (currY === refYear && currM <= refMonth0)) {
      const cycleDueDate = clampDate(currY, currM, joinDay);
      const mStr = `${currY}-${String(currM + 1).padStart(2, '0')}`;

      // Only count this month if its due date has arrived and it's not paid
      if (
        cycleDueDate <= refDateStart &&
        !completedFeeMonths.has(mStr) &&
        mStr !== excludeMonth
      ) {
        pendingMonths.push(mStr);
      }

      currM++;
      if (currM > 11) { currM = 0; currY++; }
    }
  }

  const totalArrearsAmount = pendingMonths.reduce((sum, mStr) => {
    const feeRec = fees.find(f => f.month === mStr);
    return sum + (feeRec?.amount || standardMonthlyFee);
  }, 0);

  return {
    pendingMonthsCount: pendingMonths.length,
    totalArrearsAmount,
    oldestUnpaidMonth: pendingMonths.length > 0 ? pendingMonths[0] : null
  };
}

/**
 * Calculates all billing cycles and pending dues for a student from their date of joining up to the reference date.
 * Cycle rule:
 * - A student's billing cycle is anchored to their joinDay (e.g. joined on Oct 10 -> cycles are Oct 10-Nov 10, Nov 10-Dec 10, etc.).
 * - Before the join date: 0 dues (they weren't enrolled).
 * - A cycle for month (year Y, month M) only becomes due ON or AFTER the cycle's due date clampDate(Y, M, joinDay).
 *   For example, for a student joined on the 10th: on the 1st-9th of the month, that month's fee is NOT yet due,
 *   so they have 0 dues for that month and cannot be sent reminders on the 1st. Reminders only trigger after the 10th.
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

  // Normalize reference date to beginning of day
  const refDateStart = new Date(refYear, refMonth, refDay);
  const joinDateStart = new Date(joinYear, joinMonth, joinDay);

  const requiredMonths: string[] = [];

  // Only calculate dues if the student joined on or before reference date
  if (refDateStart >= joinDateStart) {
    let currY = joinYear;
    let currM = joinMonth;

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
      const cycleDueDate = clampDate(currY, currM, joinDay);
      // The cycle only becomes due if the cycle's due date has arrived (on or before referenceDate)
      if (cycleDueDate <= refDateStart) {
        const mStr = `${currY}-${String(currM + 1).padStart(2, '0')}`;
        requiredMonths.push(mStr);
      }

      currM++;
      if (currM > 11) {
        currM = 0;
        currY++;
      }
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

  // Dynamic next due date:
  // If today is before this month's due date, the next due date is this month's due date.
  // If today is on or after this month's due date, the next due date is next month's due date.
  const currentMonthDueDate = clampDate(refYear, refMonth, joinDay);
  let nextDueDateObj: Date;
  if (refDay < currentMonthDueDate.getDate()) {
    nextDueDateObj = currentMonthDueDate;
  } else {
    const nextM = refMonth + 1;
    const nextY = nextM > 11 ? refYear + 1 : refYear;
    nextDueDateObj = clampDate(nextY, nextM % 12, joinDay);
  }

  const nextDueDateFormatted = nextDueDateObj.toLocaleDateString('en-IN', {
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
    email: student.email || null,
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
