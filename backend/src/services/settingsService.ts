import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

export interface AppSettingsData {
  hostelName: string;
  adminName: string;
  adminPassword?: string;
  hostelPhone: string;
  hostelEmail: string;
  hostelAddress: string;
  upiId: string;
  upiName: string;
  monthlyFee: number;
  feeEffectiveMonth?: string;
  previousMonthlyFee?: number;
  feeSchedule?: string;
  securityDeposit: number;
  lateFinePerDay: number;
  dueDateDay: number;
  reminderTime: string;
}

const SETTINGS_FILE = path.join(__dirname, '../../../settings.json');

const DEFAULT_SETTINGS: AppSettingsData = {
  hostelName: 'VMR Hostel',
  adminName: 'Admin',
  adminPassword: 'admin123',
  hostelPhone: '',
  hostelEmail: '',
  hostelAddress: '',
  upiId: '',
  upiName: 'VMR Hostel',
  monthlyFee: 6000,
  feeEffectiveMonth: '2026-11',
  previousMonthlyFee: 5500,
  feeSchedule: '[{"effectiveMonth":"2020-01","fee":5500},{"effectiveMonth":"2026-11","fee":6000}]',
  securityDeposit: 5000,
  lateFinePerDay: 50,
  dueDateDay: 10,
  reminderTime: '19:00'
};

let _settingsCache: AppSettingsData | null = null;

function readFromFileFallback(): AppSettingsData {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (err) {
    console.error('[SettingsService] Failed to read fallback settings.json:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

function syncToFile(data: AppSettingsData) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SettingsService] Failed to write settings.json backup:', err);
  }
}

/**
 * Initializes settings on app startup from PostgreSQL DB.
 * If no setting row exists in DB, seeds it from settings.json or defaults.
 */
export async function initSettings(prisma: PrismaClient): Promise<AppSettingsData> {
  try {
    let row = await prisma.setting.findUnique({ where: { id: 'default' } });
    if (!row) {
      console.log('[SettingsService] No settings found in DB. Seeding from settings.json...');
      const fallback = readFromFileFallback();
      row = await prisma.setting.create({
        data: {
          id: 'default',
          hostelName: fallback.hostelName || DEFAULT_SETTINGS.hostelName,
          adminName: fallback.adminName || DEFAULT_SETTINGS.adminName,
          adminPassword: fallback.adminPassword || DEFAULT_SETTINGS.adminPassword,
          hostelPhone: fallback.hostelPhone || null,
          hostelEmail: fallback.hostelEmail || null,
          hostelAddress: fallback.hostelAddress || null,
          upiId: fallback.upiId || null,
          upiName: fallback.upiName || DEFAULT_SETTINGS.upiName,
          monthlyFee: Number(fallback.monthlyFee) || DEFAULT_SETTINGS.monthlyFee,
          feeEffectiveMonth: fallback.feeEffectiveMonth || DEFAULT_SETTINGS.feeEffectiveMonth,
          previousMonthlyFee: fallback.previousMonthlyFee || DEFAULT_SETTINGS.previousMonthlyFee,
          feeSchedule: fallback.feeSchedule || DEFAULT_SETTINGS.feeSchedule,
          securityDeposit: Number(fallback.securityDeposit) || DEFAULT_SETTINGS.securityDeposit,
          lateFinePerDay: Number(fallback.lateFinePerDay) || DEFAULT_SETTINGS.lateFinePerDay,
          dueDateDay: Number(fallback.dueDateDay) || DEFAULT_SETTINGS.dueDateDay,
          reminderTime: fallback.reminderTime || DEFAULT_SETTINGS.reminderTime
        } as any
      });
      console.log('[SettingsService] Settings successfully seeded into PostgreSQL DB:', {
        monthlyFee: row.monthlyFee,
        hostelName: row.hostelName
      });
    }

    _settingsCache = {
      hostelName: row.hostelName,
      adminName: row.adminName,
      adminPassword: row.adminPassword,
      hostelPhone: row.hostelPhone || '',
      hostelEmail: row.hostelEmail || '',
      hostelAddress: row.hostelAddress || '',
      upiId: row.upiId || '',
      upiName: row.upiName,
      monthlyFee: Number(row.monthlyFee),
      feeEffectiveMonth: (row as any).feeEffectiveMonth || '2026-11',
      previousMonthlyFee: (row as any).previousMonthlyFee !== null && (row as any).previousMonthlyFee !== undefined ? Number((row as any).previousMonthlyFee) : 5500,
      feeSchedule: (row as any).feeSchedule || '[{"effectiveMonth":"2020-01","fee":5500},{"effectiveMonth":"2026-11","fee":6000}]',
      securityDeposit: Number(row.securityDeposit),
      lateFinePerDay: Number(row.lateFinePerDay),
      dueDateDay: Number(row.dueDateDay),
      reminderTime: row.reminderTime
    };

    // Keep settings.json in sync with DB
    syncToFile(_settingsCache);

    return _settingsCache;
  } catch (err: any) {
    console.error('[SettingsService] DB connection error while loading settings:', err.message);
    _settingsCache = readFromFileFallback();
    return _settingsCache;
  }
}

/**
 * Synchronous reader used throughout all backend endpoints.
 * Returns in-memory cached DB record.
 */
export function readSettings(): AppSettingsData {
  if (_settingsCache) return _settingsCache;
  _settingsCache = readFromFileFallback();
  return _settingsCache;
}

/**
 * Saves and persists settings to PostgreSQL DB.
 * Updates in-memory cache and backup settings.json file.
 */
export async function saveSettings(prisma: PrismaClient, incoming: Partial<AppSettingsData>): Promise<AppSettingsData> {
  const current = readSettings();

  const monthlyFee = incoming.monthlyFee !== undefined && incoming.monthlyFee !== null && !isNaN(Number(incoming.monthlyFee))
    ? Number(incoming.monthlyFee)
    : Number(current.monthlyFee);

  const securityDeposit = incoming.securityDeposit !== undefined && incoming.securityDeposit !== null && !isNaN(Number(incoming.securityDeposit))
    ? Number(incoming.securityDeposit)
    : Number(current.securityDeposit);

  const lateFinePerDay = incoming.lateFinePerDay !== undefined && incoming.lateFinePerDay !== null && !isNaN(Number(incoming.lateFinePerDay))
    ? Number(incoming.lateFinePerDay)
    : Number(current.lateFinePerDay);

  const dueDateDay = incoming.dueDateDay !== undefined && incoming.dueDateDay !== null && !isNaN(Number(incoming.dueDateDay))
    ? Number(incoming.dueDateDay)
    : Number(current.dueDateDay);

  let feeEffectiveMonth = incoming.feeEffectiveMonth || current.feeEffectiveMonth || '2026-11';
  let previousMonthlyFee = incoming.previousMonthlyFee !== undefined ? Number(incoming.previousMonthlyFee) : (current.previousMonthlyFee ?? 5500);
  let feeScheduleStr = incoming.feeSchedule || current.feeSchedule;

  // If monthlyFee changed, update effective month, previous fee, and append to fee schedule
  if (incoming.monthlyFee !== undefined && Number(incoming.monthlyFee) !== Number(current.monthlyFee)) {
    previousMonthlyFee = Number(current.monthlyFee);
    feeEffectiveMonth = incoming.feeEffectiveMonth || '2026-11';

    let schedule: Array<{ effectiveMonth: string; fee: number }> = [];
    try {
      if (feeScheduleStr) {
        schedule = JSON.parse(feeScheduleStr);
      }
    } catch {}

    if (!Array.isArray(schedule) || schedule.length === 0) {
      schedule = [
        { effectiveMonth: '2020-01', fee: previousMonthlyFee }
      ];
    }

    const existingIdx = schedule.findIndex(s => s.effectiveMonth === feeEffectiveMonth);
    if (existingIdx >= 0) {
      schedule[existingIdx].fee = monthlyFee;
    } else {
      schedule.push({ effectiveMonth: feeEffectiveMonth, fee: monthlyFee });
    }

    schedule.sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
    feeScheduleStr = JSON.stringify(schedule);
  }

  const updatedData: any = {
    hostelName: incoming.hostelName !== undefined ? incoming.hostelName : current.hostelName,
    adminName: incoming.adminName !== undefined ? incoming.adminName : current.adminName,
    hostelPhone: incoming.hostelPhone !== undefined ? incoming.hostelPhone : current.hostelPhone,
    hostelEmail: incoming.hostelEmail !== undefined ? incoming.hostelEmail : current.hostelEmail,
    hostelAddress: incoming.hostelAddress !== undefined ? incoming.hostelAddress : current.hostelAddress,
    upiId: incoming.upiId !== undefined ? incoming.upiId : current.upiId,
    upiName: incoming.upiName !== undefined ? incoming.upiName : current.upiName,
    monthlyFee,
    feeEffectiveMonth,
    previousMonthlyFee,
    feeSchedule: feeScheduleStr,
    securityDeposit,
    lateFinePerDay,
    dueDateDay,
    reminderTime: incoming.reminderTime !== undefined ? incoming.reminderTime : current.reminderTime
  };

  if (incoming.adminPassword) {
    updatedData.adminPassword = incoming.adminPassword;
  }

  const saved = await prisma.setting.upsert({
    where: { id: 'default' },
    update: updatedData,
    create: { id: 'default', ...updatedData }
  });

  _settingsCache = {
    hostelName: saved.hostelName,
    adminName: saved.adminName,
    adminPassword: saved.adminPassword,
    hostelPhone: saved.hostelPhone || '',
    hostelEmail: saved.hostelEmail || '',
    hostelAddress: saved.hostelAddress || '',
    upiId: saved.upiId || '',
    upiName: saved.upiName,
    monthlyFee: Number(saved.monthlyFee),
    feeEffectiveMonth: (saved as any).feeEffectiveMonth || feeEffectiveMonth,
    previousMonthlyFee: (saved as any).previousMonthlyFee !== null && (saved as any).previousMonthlyFee !== undefined ? Number((saved as any).previousMonthlyFee) : previousMonthlyFee,
    feeSchedule: (saved as any).feeSchedule || feeScheduleStr,
    securityDeposit: Number(saved.securityDeposit),
    lateFinePerDay: Number(saved.lateFinePerDay),
    dueDateDay: Number(saved.dueDateDay),
    reminderTime: saved.reminderTime
  };

  syncToFile(_settingsCache);

  console.log('[SettingsService] Settings persisted to DB:', {
    monthlyFee: _settingsCache.monthlyFee,
    feeEffectiveMonth: _settingsCache.feeEffectiveMonth,
    previousMonthlyFee: _settingsCache.previousMonthlyFee,
    hostelName: _settingsCache.hostelName,
    reminderTime: _settingsCache.reminderTime
  });

  return _settingsCache;
}
