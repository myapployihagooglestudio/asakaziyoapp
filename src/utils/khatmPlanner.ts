/**
 * ASAKA ZIYO — Quran Khatm Planner Logic & Calculation Engine
 * 
 * Standard Madinah Mushaf structure:
 * - Total Pages: 604
 * - Total Juz (Para): 30
 * - Total Surahs: 114
 * - Total Ayahs: 6236
 */

import { KhatmPlan, KhatmDurationType } from '../types';

export const TOTAL_MUSHAF_PAGES = 604;
export const TOTAL_MUSHAF_JUZ = 30;
export const TOTAL_MUSHAF_AYAHS = 6236;

/**
 * Calculates page-to-juz mapping approximately (approx 20 pages per juz)
 */
export function getJuzForPage(page: number): number {
  if (page <= 0) return 1;
  if (page >= 604) return 30;
  return Math.min(30, Math.max(1, Math.ceil(page / 20.13)));
}

/**
 * Returns daily page target based on total plan days and remaining pages
 */
export function calculateDailyPageTarget(remainingPages: number, remainingDays: number): number {
  if (remainingDays <= 0) return remainingPages;
  return Math.max(1, Math.ceil(remainingPages / remainingDays));
}

/**
 * Creates an initial Khatm plan
 */
export function createInitialKhatmPlan(
  userId: string,
  durationType: KhatmDurationType,
  customDays?: number,
  startDate?: string
): KhatmPlan {
  let totalDays = 30;
  if (durationType === '30_days') totalDays = 30;
  else if (durationType === '60_days') totalDays = 60;
  else if (durationType === '90_days') totalDays = 90;
  else if (durationType === 'custom') totalDays = Math.max(1, customDays || 45);

  const start = startDate ? new Date(startDate) : new Date();
  const startStr = start.toISOString().split('T')[0];

  const targetEnd = new Date(start);
  targetEnd.setDate(targetEnd.getDate() + totalDays);
  const targetEndStr = targetEnd.toISOString().split('T')[0];

  const pagesPerDay = Math.ceil(TOTAL_MUSHAF_PAGES / totalDays);

  return {
    id: `khatm_${userId}_${Date.now()}`,
    userId,
    title: `Qurʼon Xatmi (${totalDays} kunlik reja)`,
    durationType,
    totalDays,
    startDate: startStr,
    targetEndDate: targetEndStr,
    totalPages: TOTAL_MUSHAF_PAGES,
    completedPages: 0,
    completedAyahs: 0,
    completedJuz: [],
    status: 'active',
    remindersEnabled: true,
    reminderTime: '06:30',
    pagesPerDay,
    missedPagesAdjustment: 0,
    dailyLog: {},
    completionHistory: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Logs read pages and calculates updated status
 */
export function recordKhatmReading(
  plan: KhatmPlan,
  pagesRead: number,
  dateStr: string = new Date().toISOString().split('T')[0]
): KhatmPlan {
  const newCompletedPages = Math.min(plan.totalPages, plan.completedPages + pagesRead);
  const newCompletedAyahs = Math.min(
    TOTAL_MUSHAF_AYAHS,
    Math.round((newCompletedPages / plan.totalPages) * TOTAL_MUSHAF_AYAHS)
  );

  // Calculate completed Juz
  const currentJuz = getJuzForPage(newCompletedPages);
  const completedJuzList: number[] = [];
  for (let j = 1; j < currentJuz; j++) {
    completedJuzList.push(j);
  }
  if (newCompletedPages >= 604) {
    completedJuzList.push(30);
  }

  const existingLog = plan.dailyLog[dateStr]?.pagesRead || 0;
  const updatedDailyLog = {
    ...plan.dailyLog,
    [dateStr]: {
      pagesRead: existingLog + pagesRead,
      completedAt: new Date().toISOString(),
    },
  };

  const isCompleted = newCompletedPages >= plan.totalPages;
  const newStatus = isCompleted ? 'completed' : plan.status;

  const completionHistory = plan.completionHistory ? [...plan.completionHistory] : [];
  if (isCompleted && plan.status !== 'completed') {
    const startMs = new Date(plan.startDate).getTime();
    const endMs = new Date().getTime();
    const daysTaken = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
    completionHistory.push({
      completedAt: new Date().toISOString(),
      daysTaken,
      notes: `Alhamdulillah, ${totalDaysLabel(plan.totalDays)} xatm muvaffaqiyatli yakunlandi!`,
    });
  }

  // Calculate dynamic adjustment for remaining days
  const now = new Date(dateStr);
  const end = new Date(plan.targetEndDate);
  const remainingDays = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const remainingPages = Math.max(0, plan.totalPages - newCompletedPages);
  const adjustedPagesPerDay = calculateDailyPageTarget(remainingPages, remainingDays);

  return {
    ...plan,
    completedPages: newCompletedPages,
    completedAyahs: newCompletedAyahs,
    completedJuz: completedJuzList,
    status: newStatus,
    lastReadDate: dateStr,
    lastReadPage: newCompletedPages,
    pagesPerDay: adjustedPagesPerDay,
    missedPagesAdjustment: Math.max(0, adjustedPagesPerDay - Math.ceil(plan.totalPages / plan.totalDays)),
    dailyLog: updatedDailyLog,
    completionHistory,
    updatedAt: new Date().toISOString(),
  };
}

function totalDaysLabel(days: number): string {
  return `${days} kunlik`;
}
