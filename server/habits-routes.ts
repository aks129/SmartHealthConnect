import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from './db';
import {
  healthJournalEntries,
  vitalsReadings,
  healthGoals,
} from '@shared/schema';

const router = Router();

// In-memory fallback for demo / no-DB mode
let demoHabitLogs: any[] = [];

/**
 * Compute a weighted wellness score (0-100) from health data
 */
function computeWellnessScore(params: {
  sleepQuality: number | null; // 1-10
  exerciseMinutesPerWeek: number;
  medicationAdherence: number; // 0-1
  goalsProgress: number; // 0-100
}): number {
  const weights = { sleep: 0.25, exercise: 0.25, medication: 0.25, goals: 0.25 };

  // Normalize sleep (1-10 scale to 0-100)
  const sleepScore = params.sleepQuality ? params.sleepQuality * 10 : 50;

  // Normalize exercise (150 min/week = 100%)
  const exerciseScore = Math.min(100, (params.exerciseMinutesPerWeek / 150) * 100);

  // Medication adherence already 0-1, convert to 0-100
  const medScore = params.medicationAdherence * 100;

  // Goals progress already 0-100
  const goalsScore = params.goalsProgress;

  return Math.round(
    sleepScore * weights.sleep +
      exerciseScore * weights.exercise +
      medScore * weights.medication +
      goalsScore * weights.goals
  );
}

// GET /:familyMemberId/operating-picture - Integrated health dashboard
router.get('/:familyMemberId/operating-picture', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const days = parseInt(req.query.days as string) || 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    let journalData: any[] = [];
    let vitalsData: any[] = [];
    let goalsData: any[] = [];

    if (db) {
      try {
        [journalData, vitalsData, goalsData] = await Promise.all([
          db
            .select()
            .from(healthJournalEntries)
            .where(
              and(
                eq(healthJournalEntries.familyMemberId, familyMemberId),
                gte(healthJournalEntries.entryDate, startStr),
                lte(healthJournalEntries.entryDate, endStr)
              )
            ),
          db
            .select()
            .from(vitalsReadings)
            .where(
              and(
                eq(vitalsReadings.familyMemberId, familyMemberId),
                gte(vitalsReadings.readingDate, startStr),
                lte(vitalsReadings.readingDate, endStr)
              )
            ),
          db
            .select()
            .from(healthGoals)
            .where(eq(healthGoals.familyMemberId, familyMemberId)),
        ]);
      } catch {
        // Fall through to demo data
      }
    }

    // Include in-memory habit logs
    const inMemoryFiltered = demoHabitLogs.filter(
      (h) =>
        h.familyMemberId === familyMemberId &&
        h.entryDate >= startStr &&
        h.entryDate <= endStr
    );
    journalData = [...journalData, ...inMemoryFiltered];

    if (journalData.length > 0 || vitalsData.length > 0 || goalsData.length > 0) {
      // Sleep aggregation
      const sleepEntries = journalData.filter((e) => e.entryType === 'sleep');
      const avgSleepQuality =
        sleepEntries.length > 0
          ? Math.round(
              sleepEntries.reduce((s: number, e: any) => s + (e.sleepQuality || 0), 0) /
                sleepEntries.length
            )
          : null;
      const avgSleepHours =
        sleepEntries.length > 0
          ? Math.round(
              (sleepEntries.reduce((s: number, e: any) => s + (e.sleepHours || 0), 0) /
                sleepEntries.length) *
                10
            ) / 10
          : null;

      // Exercise aggregation
      const activityEntries = journalData.filter((e) => e.entryType === 'activity');
      const totalExerciseMinutes = activityEntries.reduce(
        (s: number, e: any) => s + (e.activityDuration || 0),
        0
      );
      const weeksInPeriod = Math.max(1, days / 7);
      const sessionsPerWeek = Math.round((activityEntries.length / weeksInPeriod) * 10) / 10;

      const intensityCounts: Record<string, number> = {};
      for (const a of activityEntries) {
        const i = a.activityIntensity || 'light';
        intensityCounts[i] = (intensityCounts[i] || 0) + 1;
      }
      const avgIntensity =
        activityEntries.length > 0
          ? Object.entries(intensityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'light'
          : null;

      // Medication adherence
      const medEntries = journalData.filter((e) => e.entryType === 'medication');
      const uniqueMedDays = new Set(medEntries.map((e: any) => e.entryDate)).size;
      const adherenceRate = days > 0 ? Math.round((uniqueMedDays / days) * 100) / 100 : 0;

      // Vitals
      const bpReadings = vitalsData
        .filter((v) => v.readingType === 'blood_pressure')
        .sort((a: any, b: any) => b.readingDate.localeCompare(a.readingDate));
      const glucoseReadings = vitalsData
        .filter((v) => v.readingType === 'blood_glucose')
        .sort((a: any, b: any) => b.readingDate.localeCompare(a.readingDate));

      const latestBP = bpReadings[0]
        ? { systolic: bpReadings[0].systolic, diastolic: bpReadings[0].diastolic }
        : null;
      const latestGlucose = glucoseReadings[0]
        ? { value: glucoseReadings[0].glucoseValue, context: glucoseReadings[0].glucoseContext }
        : null;

      // Simple trend: compare first half vs second half averages
      const computeTrend = (readings: any[], field: string): 'improving' | 'stable' | 'worsening' => {
        if (readings.length < 4) return 'stable';
        const mid = Math.floor(readings.length / 2);
        const firstHalf = readings.slice(mid); // older (sorted desc)
        const secondHalf = readings.slice(0, mid); // newer
        const avgFirst = firstHalf.reduce((s: number, r: any) => s + (r[field] || 0), 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s: number, r: any) => s + (r[field] || 0), 0) / secondHalf.length;
        const diff = avgSecond - avgFirst;
        if (Math.abs(diff) < 3) return 'stable';
        // For BP and glucose, lower is generally better
        return diff < 0 ? 'improving' : 'worsening';
      };

      const bpTrend = computeTrend(bpReadings, 'systolic');
      const glucoseTrend = computeTrend(glucoseReadings, 'glucoseValue');

      // Goals
      const activeGoals = goalsData.filter((g: any) => g.status === 'active');
      const achievedGoals = goalsData.filter((g: any) => g.status === 'achieved');
      const totalProgress =
        goalsData.length > 0
          ? Math.round(
              goalsData.reduce((s: number, g: any) => s + (g.progress || 0), 0) / goalsData.length
            )
          : 0;

      const overallWellnessScore = computeWellnessScore({
        sleepQuality: avgSleepQuality,
        exerciseMinutesPerWeek: totalExerciseMinutes / weeksInPeriod,
        medicationAdherence: adherenceRate,
        goalsProgress: totalProgress,
      });

      return res.json({
        period: { start: startStr, end: endStr, days },
        sleep: {
          avgQuality: avgSleepQuality,
          avgHours: avgSleepHours,
          entries: sleepEntries.length,
        },
        exercise: {
          totalMinutes: totalExerciseMinutes,
          sessionsPerWeek,
          avgIntensity,
        },
        medication: {
          adherenceRate,
          entriesLogged: medEntries.length,
          daysTracked: uniqueMedDays,
        },
        vitals: {
          latestBP,
          latestGlucose,
          bpTrend,
          glucoseTrend,
        },
        goals: {
          active: activeGoals.length,
          achieved: achievedGoals.length,
          totalProgress,
        },
        overallWellnessScore,
      });
    }

    // Demo / synthetic operating picture
    res.json({
      period: { start: startStr, end: endStr, days },
      sleep: {
        avgQuality: 7,
        avgHours: 7.2,
        entries: 25,
      },
      exercise: {
        totalMinutes: 540,
        sessionsPerWeek: 4.2,
        avgIntensity: 'moderate',
      },
      medication: {
        adherenceRate: 0.87,
        entriesLogged: 26,
        daysTracked: 26,
      },
      vitals: {
        latestBP: { systolic: 128, diastolic: 82 },
        latestGlucose: { value: 112, context: 'fasting' },
        bpTrend: 'improving',
        glucoseTrend: 'stable',
      },
      goals: {
        active: 3,
        achieved: 1,
        totalProgress: 62,
      },
      overallWellnessScore: 71,
    });
  } catch (error) {
    console.error('Error fetching operating picture:', error);
    res.status(500).json({ error: 'Failed to fetch operating picture' });
  }
});

// POST /:familyMemberId/log - Quick habit log
router.post('/:familyMemberId/log', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const { habitType, value, unit, notes } = req.body;

    if (!habitType) {
      return res.status(400).json({ error: 'habitType is required' });
    }

    const validHabitTypes = ['water', 'steps', 'meditation', 'stretch', 'other'];
    if (!validHabitTypes.includes(habitType)) {
      return res.status(400).json({
        error: `habitType must be one of: ${validHabitTypes.join(', ')}`,
      });
    }

    const today = new Date();
    const entryData = {
      familyMemberId,
      entryDate: today.toISOString().split('T')[0],
      entryTime: today.toTimeString().slice(0, 5),
      entryType: 'activity' as const,
      title: `${habitType}${value ? ` - ${value}${unit ? ' ' + unit : ''}` : ''}`,
      content: notes || null,
      tags: [habitType, ...(value ? [`${value}${unit || ''}`] : [])],
    };

    if (db) {
      try {
        const [newEntry] = await db
          .insert(healthJournalEntries)
          .values(entryData)
          .returning();
        return res.status(201).json(newEntry);
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const demoEntry = {
      id: demoHabitLogs.length + 1,
      ...entryData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoHabitLogs.push(demoEntry);
    res.status(201).json(demoEntry);
  } catch (error) {
    console.error('Error logging habit:', error);
    res.status(500).json({ error: 'Failed to log habit' });
  }
});

// GET /:familyMemberId/streaks - Habit streaks
router.get('/:familyMemberId/streaks', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);

    let journalData: any[] = [];

    if (db) {
      try {
        journalData = await db
          .select()
          .from(healthJournalEntries)
          .where(eq(healthJournalEntries.familyMemberId, familyMemberId))
          .orderBy(desc(healthJournalEntries.entryDate));
      } catch {
        // Fall through to demo data
      }
    }

    // Include in-memory habit logs
    const inMemory = demoHabitLogs.filter((h) => h.familyMemberId === familyMemberId);
    journalData = [...journalData, ...inMemory];

    if (journalData.length > 0) {
      // Group by entry type and compute streaks
      const typeMap: Record<string, Set<string>> = {};
      const lastDateMap: Record<string, string> = {};

      for (const entry of journalData) {
        const type = entry.entryType;
        if (!typeMap[type]) {
          typeMap[type] = new Set();
        }
        typeMap[type].add(entry.entryDate);

        // Track latest date per type
        if (!lastDateMap[type] || entry.entryDate > lastDateMap[type]) {
          lastDateMap[type] = entry.entryDate;
        }

        // Also track by habit tag if it's a habit log
        const tags = entry.tags as string[] | null;
        if (tags && Array.isArray(tags)) {
          for (const tag of tags) {
            const habitKey = `habit:${tag}`;
            if (!typeMap[habitKey]) {
              typeMap[habitKey] = new Set();
            }
            typeMap[habitKey].add(entry.entryDate);
            if (!lastDateMap[habitKey] || entry.entryDate > lastDateMap[habitKey]) {
              lastDateMap[habitKey] = entry.entryDate;
            }
          }
        }
      }

      const streaks = Object.entries(typeMap).map(([type, dates]) => {
        const sortedDates = Array.from(dates).sort().reverse();

        // Compute current streak (consecutive days ending at most yesterday or today)
        let currentStreak = 0;
        const today = new Date();
        const checkDate = new Date(today);

        for (let i = 0; i < sortedDates.length; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (sortedDates.includes(dateStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (i === 0) {
            // Allow today to not have an entry yet - check yesterday
            checkDate.setDate(checkDate.getDate() - 1);
            const yesterdayStr = checkDate.toISOString().split('T')[0];
            if (sortedDates.includes(yesterdayStr)) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          } else {
            break;
          }
        }

        // Compute longest streak
        let longestStreak = 0;
        let tempStreak = 1;
        const ascending = Array.from(dates).sort();
        for (let i = 1; i < ascending.length; i++) {
          const prev = new Date(ascending[i - 1]);
          const curr = new Date(ascending[i]);
          const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        return {
          habitType: type.replace('habit:', ''),
          currentStreak,
          longestStreak,
          lastEntryDate: lastDateMap[type],
        };
      });

      return res.json({ streaks });
    }

    // Demo / synthetic streaks
    res.json({
      streaks: [
        {
          habitType: 'activity',
          currentStreak: 5,
          longestStreak: 14,
          lastEntryDate: new Date().toISOString().split('T')[0],
        },
        {
          habitType: 'sleep',
          currentStreak: 12,
          longestStreak: 22,
          lastEntryDate: new Date().toISOString().split('T')[0],
        },
        {
          habitType: 'medication',
          currentStreak: 8,
          longestStreak: 30,
          lastEntryDate: new Date().toISOString().split('T')[0],
        },
        {
          habitType: 'water',
          currentStreak: 3,
          longestStreak: 10,
          lastEntryDate: new Date().toISOString().split('T')[0],
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching streaks:', error);
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

export default router;
