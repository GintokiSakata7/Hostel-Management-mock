import { Student, Fee } from '@prisma/client';
import { readSettings } from './settingsService';

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
  billingStartMonth?: string | null;
  openingBalance: number;
  advanceCredit: number;
  dueDayOfMonth: number; // e.g., 15
  dueDayLabel: string;   // e.g., "15th"
  nextDueDate: string;   // formatted e.g., "15 Sep 2026"
  isDueToday: boolean;
  pendingMonthsCount: number;
  pendingMonths: { month: string; monthLabel: string; cycleLabel?: string; amount: number; paidAmount?: number; expectedAmount?: number }[];
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
  advanceCredit: number;
  isPreSettled?: boolean;
  paidViaAdvance?: boolean;
}

export interface InitialLedgerInput {
  dateOfJoining: Date;
  feeStatusPreset?: 'default' | 'cleared' | 'months_due' | 'custom_due' | 'advance';
  unpaidMonthsCount?: number;
  openingAmount?: number;
  billingStartMonth?: string | null;
  openingBalance?: number;
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
  if (m === 'OPENING') return 'Previous Balance Due';
  const parts = m.split('-');
  if (parts.length < 2) return m;
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const d = new Date(y, mo - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Adds/subtracts delta months on a "YYYY-MM" string accurately without Date day-rollover bugs.
 */
export function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = ((total % 12) + 12) % 12 + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/**
 * Resolves billingStartMonth & openingBalance from friendly onboarding presets
 * so historical residents never accumulate false past arrears or corrupt Finance cashbook.
 */
export function resolveInitialLedgerSnapshot(
  input: InitialLedgerInput,
  referenceDate: Date = new Date()
): { billingStartMonth: string | null; openingBalance: number } {
  const joinDate = input.dateOfJoining ? new Date(input.dateOfJoining) : new Date();
  const joinDay = joinDate.getDate() || 1;
  const joinMonthStr = toMonthString(joinDate);

  const refDateStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const joinDateStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDay);
  const refMonthStr = toMonthString(refDateStart);

  // Determine the latest cycle whose due date has already arrived (<= referenceDate)
  const refDueDate = clampDate(refDateStart.getFullYear(), refDateStart.getMonth(), joinDay);
  let latestDueMonth: string | null = refDueDate <= refDateStart ? refMonthStr : addMonths(refMonthStr, -1);
  if (refDateStart < joinDateStart || latestDueMonth < joinMonthStr) {
    latestDueMonth = null;
  }

  const nextUpcomingMonth = latestDueMonth ? addMonths(latestDueMonth, 1) : joinMonthStr;
  const preset = input.feeStatusPreset || 'default';

  switch (preset) {
    case 'cleared':
      return { billingStartMonth: nextUpcomingMonth, openingBalance: 0 };

    case 'months_due': {
      const count = Math.max(1, Math.min(24, Math.floor(Number(input.unpaidMonthsCount) || 1)));
      if (!latestDueMonth) {
        return { billingStartMonth: joinMonthStr, openingBalance: 0 };
      }
      const rawStart = addMonths(latestDueMonth, -(count - 1));
      const clampedStart = rawStart < joinMonthStr ? joinMonthStr : rawStart;
      return { billingStartMonth: clampedStart, openingBalance: 0 };
    }

    case 'custom_due': {
      const dueAmt = Math.max(0, Math.round(Number(input.openingAmount) || 0));
      return { billingStartMonth: nextUpcomingMonth, openingBalance: dueAmt };
    }

    case 'advance': {
      const advAmt = Math.max(0, Math.round(Number(input.openingAmount) || 0));
      return { billingStartMonth: nextUpcomingMonth, openingBalance: advAmt > 0 ? -advAmt : 0 };
    }

    case 'default':
    default: {
      const explicitStart =
        input.billingStartMonth && /^\d{4}-\d{2}$/.test(input.billingStartMonth)
          ? input.billingStartMonth
          : null;
      const explicitOpening =
        input.openingBalance !== undefined && input.openingBalance !== null && !isNaN(Number(input.openingBalance))
          ? Number(input.openingBalance)
          : 0;
      return { billingStartMonth: explicitStart, openingBalance: explicitOpening };
    }
  }
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
 * Resolves the expected monthly fee for a given month ("YYYY-MM").
 * Supports effective-date fee schedules, e.g. 5500 prior to 2026-11, and 6000 from 2026-11 onwards.
 */
export function getMonthlyFeeForMonth(monthStr: string, settings?: any): number {
  const currentSettings = settings || readSettings();
  const defaultFee = Number(currentSettings.monthlyFee) || 6999;
  const previousFee = currentSettings.previousMonthlyFee !== undefined && currentSettings.previousMonthlyFee !== null
    ? Number(currentSettings.previousMonthlyFee)
    : 6000;
  const effectiveMonth = currentSettings.feeEffectiveMonth || '2026-11';

  // Effective Month policy: Prior to effective month uses previousMonthlyFee, from effective month onwards uses monthlyFee
  if (effectiveMonth) {
    if (monthStr < effectiveMonth) {
      return previousFee;
    }
    return defaultFee;
  }

  // Fallback to feeSchedule if explicit multiple historical tiers are present without feeEffectiveMonth
  if (currentSettings.feeSchedule) {
    try {
      const schedule: Array<{ effectiveMonth: string; fee: number }> =
        typeof currentSettings.feeSchedule === 'string'
          ? JSON.parse(currentSettings.feeSchedule)
          : currentSettings.feeSchedule;

      if (Array.isArray(schedule) && schedule.length > 0) {
        const sorted = [...schedule].sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
        for (const item of sorted) {
          if (monthStr >= item.effectiveMonth) {
            return Number(item.fee);
          }
        }
        return Number(sorted[sorted.length - 1].fee);
      }
    } catch (e) {}
  }

  return defaultFee;
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
export interface CycleBillDetail {
  month: string;           // "2026-10"
  monthLabel: string;      // "October 2026"
  cycleLabel: string;      // "10 Oct 2026 – 09 Nov 2026"
  cycleStart: Date;
  cycleEnd: Date;
  cycleDueDate: Date;
  isDue: boolean;          // true if cycleDueDate <= referenceDate
  expectedAmount: number;  // monthly fee (e.g. 5500 or 6000)
  paidAmount: number;      // Amount covered by payments
  remainingDue: number;    // expectedAmount - paidAmount
  status: 'Paid' | 'Pending' | 'Upcoming';
}

export interface StudentBillingLedger {
  studentId: string;
  studentName: string;
  totalBilled: number;             // Total expected across all elapsed/due cycles
  totalPaid: number;               // Total completed payments made across all time
  totalRemainingDue: number;       // max(0, totalBilled - totalPaid)
  advanceCredit: number;           // max(0, totalPaid - totalBilled)
  dueCycles: CycleBillDetail[];    // All elapsed cycles in chronological order
  pendingCycles: CycleBillDetail[];// Cycles where remainingDue > 0
  latestPaidMonth: string | null;
}

/**
 * Universal FIFO billing ledger calculator.
 * Computes exact dues, payments, and balances across all elapsed cycles.
 */
export function computeStudentBillingLedger(
  student: StudentWithFeesAndBeds,
  standardMonthlyFee?: number,
  referenceDate: Date = new Date()
): StudentBillingLedger {
  const settings = readSettings();
  const joinDate = student.dateOfJoining ? new Date(student.dateOfJoining) : new Date();
  const joinDay = joinDate.getDate() || 1;
  const joinYear = joinDate.getFullYear();
  const joinMonth0 = joinDate.getMonth();

  const refYear = referenceDate.getFullYear();
  const refMonth0 = referenceDate.getMonth();
  const refDay = referenceDate.getDate();
  const refDateStart = new Date(refYear, refMonth0, refDay);
  const joinDateStart = new Date(joinYear, joinMonth0, joinDay);
  const joinMonthStr = toMonthString(joinDateStart);

  const rawBillingStart = (student as any).billingStartMonth as string | null | undefined;
  const hasValidBillingStart = Boolean(rawBillingStart && /^\d{4}-\d{2}$/.test(rawBillingStart));
  const openingBalance = Number((student as any).openingBalance) || 0;

  if (refDateStart < joinDateStart && openingBalance === 0) {
    return {
      studentId: student.id,
      studentName: student.name,
      totalBilled: 0,
      totalPaid: 0,
      totalRemainingDue: 0,
      advanceCredit: 0,
      dueCycles: [],
      pendingCycles: [],
      latestPaidMonth: null
    };
  }

  // Determine start month for software-tracked cycles
  let currY = joinYear;
  let currM = joinMonth0;
  if (hasValidBillingStart) {
    const clampedStart = rawBillingStart! >= joinMonthStr ? rawBillingStart! : joinMonthStr;
    const [sy, sm] = clampedStart.split('-').map(Number);
    currY = sy;
    currM = sm - 1;
  } else {
    const earliestAllowed = new Date(refYear, refMonth0 - 24, 1);
    if (new Date(currY, currM, 1) < earliestAllowed) {
      currY = earliestAllowed.getFullYear();
      currM = earliestAllowed.getMonth();
    }
  }

  const dueCycles: CycleBillDetail[] = [];

  // Prepend Opening Arrears (+ve openingBalance) as the very first FIFO obligation
  if (openingBalance > 0) {
    dueCycles.push({
      month: 'OPENING',
      monthLabel: 'Previous Balance Due',
      cycleLabel: 'Brought Forward (Pre-Software Dues)',
      cycleStart: joinDateStart,
      cycleEnd: refDateStart,
      cycleDueDate: joinDateStart,
      isDue: true,
      expectedAmount: openingBalance,
      paidAmount: 0,
      remainingDue: openingBalance,
      status: 'Pending'
    });
  }

  while (currY < refYear || (currY === refYear && currM <= refMonth0)) {
    const mStr = `${currY}-${String(currM + 1).padStart(2, '0')}`;
    const { cycleStart, cycleEnd, cycleDueDate, cycleLabel } = getCycleForMonth(joinDay, mStr);
    const isDue = cycleDueDate <= refDateStart;
    const cycleFee = standardMonthlyFee !== undefined && standardMonthlyFee !== settings.monthlyFee
      ? standardMonthlyFee
      : getMonthlyFeeForMonth(mStr, settings);

    if (isDue) {
      dueCycles.push({
        month: mStr,
        monthLabel: formatMonthLabel(mStr),
        cycleLabel,
        cycleStart,
        cycleEnd,
        cycleDueDate,
        isDue: true,
        expectedAmount: cycleFee,
        paidAmount: 0,
        remainingDue: cycleFee,
        status: 'Pending'
      });
    }

    currM++;
    if (currM > 11) {
      currM = 0;
      currY++;
    }
  }

  // Calculate total completed payments recorded in software + any pre-app advance (-ve openingBalance)
  const fees = student.fees || [];
  const completedFees = fees.filter(f => f.status === 'Completed');
  const totalPaid = completedFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const openingAdvance = openingBalance < 0 ? Math.abs(openingBalance) : 0;

  // Allocate (cash paid + opening advance) FIFO chronologically across dueCycles
  let pool = totalPaid + openingAdvance;
  let latestPaidMonth: string | null = null;
  for (const c of dueCycles) {
    if (pool >= c.expectedAmount) {
      c.paidAmount = c.expectedAmount;
      c.remainingDue = 0;
      c.status = 'Paid';
      pool -= c.expectedAmount;
      if (c.month !== 'OPENING') {
        latestPaidMonth = c.month;
      }
    } else if (pool > 0) {
      c.paidAmount = pool;
      c.remainingDue = c.expectedAmount - pool;
      c.status = 'Pending';
      pool = 0;
    } else {
      c.paidAmount = 0;
      c.remainingDue = c.expectedAmount;
      c.status = 'Pending';
    }
  }

  const advanceCredit = pool;
  const pendingCycles = dueCycles.filter(c => c.remainingDue > 0);
  const totalBilled = dueCycles.reduce((sum, c) => sum + c.expectedAmount, 0);
  const totalRemainingDue = pendingCycles.reduce((sum, c) => sum + c.remainingDue, 0);

  return {
    studentId: student.id,
    studentName: student.name,
    totalBilled,
    totalPaid,
    totalRemainingDue,
    advanceCredit,
    dueCycles,
    pendingCycles,
    latestPaidMonth
  };
}

/**
 * Fee status of a specific student for a specific month.
 */
export function getStudentMonthFeeStatus(
  student: StudentWithFeesAndBeds,
  monthStr: string,  // "2026-10"
  referenceDate: Date = new Date(),
  standardMonthlyFee?: number
): MonthFeeStatus {
  const settings = readSettings();
  const joinDate = student.dateOfJoining ? new Date(student.dateOfJoining) : new Date();
  const joinDay = joinDate.getDate() || 1;
  const joinYear = joinDate.getFullYear();
  const joinMonth0 = joinDate.getMonth();
  const joinMonthStr = toMonthString(new Date(joinYear, joinMonth0, 1));

  const [qYear, qMonth1] = monthStr.split('-').map(Number);
  const qMonth0 = qMonth1 - 1;

  const { cycleStart, cycleEnd, cycleLabel } = getCycleForMonth(joinDay, monthStr);

  // Status: Not Enrolled (queried month is before joining)
  const isBeforeJoining = qYear < joinYear || (qYear === joinYear && qMonth0 < joinMonth0);
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
      oldestUnpaidMonth: null,
      advanceCredit: 0
    };
  }

  const ledger = computeStudentBillingLedger(student, standardMonthlyFee, referenceDate);
  const oldestUnpaid = ledger.pendingCycles[0]?.month || null;
  const refMonthStr = toMonthString(referenceDate);

  const rawBillingStart = (student as any).billingStartMonth as string | null | undefined;
  const hasValidBillingStart = Boolean(rawBillingStart && /^\d{4}-\d{2}$/.test(rawBillingStart));
  const effectiveStartMonthStr = hasValidBillingStart
    ? (rawBillingStart! >= joinMonthStr ? rawBillingStart! : joinMonthStr)
    : joinMonthStr;

  const openingDueCycle = ledger.dueCycles.find(c => c.month === 'OPENING' && c.remainingDue > 0);

  // Check if monthStr is one of the actively tracked due cycles
  const cycleDetail = ledger.dueCycles.find(c => c.month === monthStr);
  if (cycleDetail) {
    const hasCompletedCashFee = (student.fees || []).some(f => f.month === monthStr && f.status === 'Completed');
    if (cycleDetail.remainingDue === 0) {
      return {
        status: 'Paid',
        cycleDueDay: joinDay,
        cycleStart,
        cycleEnd,
        cycleLabel,
        amountDue: 0,
        hasAccumulatedArrears: ledger.totalRemainingDue > 0,
        pendingMonthsCount: ledger.pendingCycles.length,
        totalArrearsAmount: ledger.totalRemainingDue,
        oldestUnpaidMonth: oldestUnpaid,
        advanceCredit: ledger.advanceCredit,
        paidViaAdvance: !hasCompletedCashFee
      };
    } else {
      return {
        status: 'Pending',
        cycleDueDay: joinDay,
        cycleStart,
        cycleEnd,
        cycleLabel,
        amountDue: cycleDetail.remainingDue,
        hasAccumulatedArrears: ledger.totalRemainingDue > cycleDetail.remainingDue,
        pendingMonthsCount: ledger.pendingCycles.length,
        totalArrearsAmount: ledger.totalRemainingDue,
        oldestUnpaidMonth: oldestUnpaid,
        advanceCredit: ledger.advanceCredit
      };
    }
  }

  // If queried month is prior to software billing cutover (pre-app settled history)
  if (hasValidBillingStart && monthStr < effectiveStartMonthStr) {
    // Surface unpaid Opening Arrears on the current active calendar month so Pay buttons remain accessible everywhere
    if (openingDueCycle && monthStr === refMonthStr) {
      return {
        status: 'Pending',
        cycleDueDay: joinDay,
        cycleStart,
        cycleEnd,
        cycleLabel: openingDueCycle.cycleLabel,
        amountDue: openingDueCycle.remainingDue,
        hasAccumulatedArrears: ledger.totalRemainingDue > openingDueCycle.remainingDue,
        pendingMonthsCount: ledger.pendingCycles.length,
        totalArrearsAmount: ledger.totalRemainingDue,
        oldestUnpaidMonth: 'OPENING',
        advanceCredit: ledger.advanceCredit
      };
    }

    return {
      status: 'Paid',
      cycleDueDay: joinDay,
      cycleStart,
      cycleEnd,
      cycleLabel,
      amountDue: 0,
      hasAccumulatedArrears: ledger.totalRemainingDue > 0,
      pendingMonthsCount: ledger.pendingCycles.length,
      totalArrearsAmount: ledger.totalRemainingDue,
      oldestUnpaidMonth: oldestUnpaid,
      advanceCredit: ledger.advanceCredit,
      isPreSettled: true
    };
  }

  // Also surface Opening Arrears if queried month is current calendar month whose due day hasn't arrived yet (e.g. joinDay=28)
  if (openingDueCycle && monthStr === refMonthStr) {
    return {
      status: 'Pending',
      cycleDueDay: joinDay,
      cycleStart,
      cycleEnd,
      cycleLabel: openingDueCycle.cycleLabel,
      amountDue: openingDueCycle.remainingDue,
      hasAccumulatedArrears: ledger.totalRemainingDue > openingDueCycle.remainingDue,
      pendingMonthsCount: ledger.pendingCycles.length,
      totalArrearsAmount: ledger.totalRemainingDue,
      oldestUnpaidMonth: 'OPENING',
      advanceCredit: ledger.advanceCredit
    };
  }

  // Upcoming cycle (future month or current month before due date) — cascade advance credit chronologically
  const billedMonthSet = new Set(ledger.dueCycles.map(c => c.month));
  let remainingAdvance = ledger.advanceCredit;
  let mIter = effectiveStartMonthStr > monthStr ? monthStr : effectiveStartMonthStr;
  let upcomingRemaining = 0;
  let coveredByAdvance = false;

  while (mIter <= monthStr) {
    if (!billedMonthSet.has(mIter)) {
      const iterFee =
        standardMonthlyFee !== undefined && standardMonthlyFee !== settings.monthlyFee
          ? standardMonthlyFee
          : getMonthlyFeeForMonth(mIter, settings);
      const covered = Math.min(remainingAdvance, iterFee);
      if (mIter === monthStr) {
        coveredByAdvance = covered > 0;
        upcomingRemaining = Math.max(0, iterFee - covered);
        break;
      }
      remainingAdvance = Math.max(0, remainingAdvance - covered);
    }
    mIter = addMonths(mIter, 1);
  }

  return {
    status: upcomingRemaining === 0 ? 'Paid' : 'Upcoming',
    cycleDueDay: joinDay,
    cycleStart,
    cycleEnd,
    cycleLabel,
    amountDue: upcomingRemaining,
    hasAccumulatedArrears: ledger.totalRemainingDue > 0,
    pendingMonthsCount: ledger.pendingCycles.length,
    totalArrearsAmount: ledger.totalRemainingDue,
    oldestUnpaidMonth: oldestUnpaid,
    advanceCredit: ledger.advanceCredit,
    paidViaAdvance: upcomingRemaining === 0 && coveredByAdvance
  };
}

/**
 * Calculates overall billing status and pending dues across all cycles.
 */
export function calculateStudentDueStatus(
  student: StudentWithFeesAndBeds,
  standardMonthlyFee?: number,
  referenceDate: Date = new Date()
): StudentDueStatus {
  const fee = standardMonthlyFee !== undefined && standardMonthlyFee !== null ? standardMonthlyFee : (Number(readSettings().monthlyFee) || 6000);
  const ledger = computeStudentBillingLedger(student, fee, referenceDate);
  const joinDate = student.dateOfJoining ? new Date(student.dateOfJoining) : new Date();
  const joinDay = joinDate.getDate() || 1;
  const refYear = referenceDate.getFullYear();
  const refMonth0 = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  const currentMonthDueDate = clampDate(refYear, refMonth0, joinDay);
  let nextDueDateObj: Date;
  if (refDay < currentMonthDueDate.getDate()) {
    nextDueDateObj = currentMonthDueDate;
  } else {
    const nextM = refMonth0 + 1;
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

  const pendingMonths = ledger.pendingCycles.map(c => ({
    month: c.month,
    monthLabel: c.monthLabel,
    cycleLabel: c.cycleLabel,
    amount: c.remainingDue,
    paidAmount: c.paidAmount,
    expectedAmount: c.expectedAmount
  }));

  return {
    studentId: student.id,
    studentName: student.name,
    phone: student.phone,
    email: student.email || null,
    roomName,
    course: student.course,
    dateOfJoining: joinDate,
    billingStartMonth: (student as any).billingStartMonth || null,
    openingBalance: Number((student as any).openingBalance) || 0,
    advanceCredit: ledger.advanceCredit,
    dueDayOfMonth: joinDay,
    dueDayLabel: getOrdinal(joinDay),
    nextDueDate: nextDueDateFormatted,
    isDueToday,
    pendingMonthsCount: pendingMonths.length,
    pendingMonths,
    totalPendingAmount: ledger.totalRemainingDue,
    latestPaidMonth: ledger.latestPaidMonth ? formatMonthLabel(ledger.latestPaidMonth) : null
  };
}
