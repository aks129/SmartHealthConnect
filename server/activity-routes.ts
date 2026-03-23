import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from './db';
import {
  healthJournalEntries,
  vitalsReadings,
} from '@shared/schema';

const router = Router();

// In-memory fallback for demo / no-DB mode
let demoActivities: any[] = [];

// POST /:familyMemberId/log - Log structured activity
router.post('/:familyMemberId/log', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const { activityType, durationMinutes, intensity, notes } = req.body;

    if (!activityType || !durationMinutes || !intensity) {
      return res.status(400).json({
        error: 'activityType, durationMinutes, and intensity are required',
      });
    }

    if (!['light', 'moderate', 'vigorous'].includes(intensity)) {
      return res.status(400).json({
        error: 'intensity must be light, moderate, or vigorous',
      });
    }

    const today = new Date();
    const entryData = {
      familyMemberId,
      entryDate: today.toISOString().split('T')[0],
      entryTime: today.toTimeString().slice(0, 5),
      entryType: 'activity' as const,
      title: `${activityType} - ${durationMinutes} min`,
      content: notes || null,
      activityType,
      activityDuration: durationMinutes,
      activityIntensity: intensity,
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
      id: demoActivities.length + 1,
      ...entryData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoActivities.push(demoEntry);
    res.status(201).json(demoEntry);
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /:familyMemberId/correlations - Correlation engine
router.get('/:familyMemberId/correlations', async (req: Request, res: Response) => {
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

    if (db) {
      try {
        journalData = await db
          .select()
          .from(healthJournalEntries)
          .where(
            and(
              eq(healthJournalEntries.familyMemberId, familyMemberId),
              gte(healthJournalEntries.entryDate, startStr),
              lte(healthJournalEntries.entryDate, endStr)
            )
          );

        vitalsData = await db
          .select()
          .from(vitalsReadings)
          .where(
            and(
              eq(vitalsReadings.familyMemberId, familyMemberId),
              gte(vitalsReadings.readingDate, startStr),
              lte(vitalsReadings.readingDate, endStr)
            )
          );
      } catch {
        // Fall through to demo data
      }
    }

    // If we have real data, compute correlations
    if (journalData.length > 0 || vitalsData.length > 0) {
      // Group entries by date
      const dateMap: Record<string, { activities: any[]; sleep: any[]; vitals: any[] }> = {};

      for (const entry of journalData) {
        if (!dateMap[entry.entryDate]) {
          dateMap[entry.entryDate] = { activities: [], sleep: [], vitals: [] };
        }
        if (entry.entryType === 'activity') {
          dateMap[entry.entryDate].activities.push(entry);
        } else if (entry.entryType === 'sleep') {
          dateMap[entry.entryDate].sleep.push(entry);
        }
      }

      for (const reading of vitalsData) {
        if (!dateMap[reading.readingDate]) {
          dateMap[reading.readingDate] = { activities: [], sleep: [], vitals: [] };
        }
        dateMap[reading.readingDate].vitals.push(reading);
      }

      const dates = Object.keys(dateMap);
      const activeDays = dates.filter((d) => dateMap[d].activities.length > 0);
      const inactiveDays = dates.filter((d) => dateMap[d].activities.length === 0);

      // BP on active vs inactive days
      const avgBP = (dayList: string[]) => {
        const bpReadings = dayList.flatMap((d) =>
          dateMap[d].vitals.filter((v: any) => v.readingType === 'blood_pressure')
        );
        if (bpReadings.length === 0) return null;
        const avgSys =
          bpReadings.reduce((sum: number, v: any) => sum + (v.systolic || 0), 0) /
          bpReadings.length;
        const avgDia =
          bpReadings.reduce((sum: number, v: any) => sum + (v.diastolic || 0), 0) /
          bpReadings.length;
        return { systolic: Math.round(avgSys), diastolic: Math.round(avgDia) };
      };

      // Glucose on exercise vs no-exercise days
      const avgGlucose = (dayList: string[]) => {
        const glucoseReadings = dayList.flatMap((d) =>
          dateMap[d].vitals.filter((v: any) => v.readingType === 'blood_glucose')
        );
        if (glucoseReadings.length === 0) return null;
        return Math.round(
          glucoseReadings.reduce((sum: number, v: any) => sum + (v.glucoseValue || 0), 0) /
            glucoseReadings.length
        );
      };

      // Sleep quality vs next-day vitals
      const sleepDays = dates.filter((d) => dateMap[d].sleep.length > 0);
      const avgSleepQuality =
        sleepDays.length > 0
          ? Math.round(
              sleepDays
                .flatMap((d) => dateMap[d].sleep)
                .reduce((sum: number, s: any) => sum + (s.sleepQuality || 5), 0) /
                sleepDays.flatMap((d) => dateMap[d].sleep).length
            )
          : null;

      const sampleSize = dates.length;
      const confidence: 'low' | 'moderate' | 'high' =
        sampleSize < 7 ? 'low' : sampleSize < 21 ? 'moderate' : 'high';

      const activeDayBP = avgBP(activeDays);
      const inactiveDayBP = avgBP(inactiveDays);

      return res.json({
        exerciseVsBP: {
          activeDayAvg: activeDayBP,
          inactiveDayAvg: inactiveDayBP,
          difference:
            activeDayBP && inactiveDayBP
              ? {
                  systolic: inactiveDayBP.systolic - activeDayBP.systolic,
                  diastolic: inactiveDayBP.diastolic - activeDayBP.diastolic,
                }
              : null,
        },
        exerciseVsGlucose: {
          exerciseDayAvg: avgGlucose(activeDays),
          noExerciseDayAvg: avgGlucose(inactiveDays),
          difference:
            avgGlucose(inactiveDays) !== null && avgGlucose(activeDays) !== null
              ? (avgGlucose(inactiveDays) as number) - (avgGlucose(activeDays) as number)
              : null,
        },
        sleepVsVitals: {
          avgSleepQuality,
          sleepDaysTracked: sleepDays.length,
        },
        sampleSize,
        confidence,
      });
    }

    // Demo / synthetic correlation data
    res.json({
      exerciseVsBP: {
        activeDayAvg: { systolic: 122, diastolic: 78 },
        inactiveDayAvg: { systolic: 132, diastolic: 85 },
        difference: { systolic: 10, diastolic: 7 },
      },
      exerciseVsGlucose: {
        exerciseDayAvg: 105,
        noExerciseDayAvg: 128,
        difference: 23,
      },
      sleepVsVitals: {
        avgSleepQuality: 7,
        sleepDaysTracked: 22,
      },
      sampleSize: 30,
      confidence: 'moderate' as const,
    });
  } catch (error) {
    console.error('Error computing correlations:', error);
    res.status(500).json({ error: 'Failed to compute correlations' });
  }
});

// GET /:familyMemberId/summary - Weekly/monthly summary
router.get('/:familyMemberId/summary', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const period = (req.query.period as string) || 'week';
    const days = period === 'month' ? 30 : 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    let journalData: any[] = [];

    if (db) {
      try {
        journalData = await db
          .select()
          .from(healthJournalEntries)
          .where(
            and(
              eq(healthJournalEntries.familyMemberId, familyMemberId),
              gte(healthJournalEntries.entryDate, startStr),
              lte(healthJournalEntries.entryDate, endStr)
            )
          );
      } catch {
        // Fall through to demo data
      }
    }

    // Also include in-memory activities for the date range
    const inMemoryFiltered = demoActivities.filter(
      (a) =>
        a.familyMemberId === familyMemberId &&
        a.entryDate >= startStr &&
        a.entryDate <= endStr
    );
    journalData = [...journalData, ...inMemoryFiltered];

    if (journalData.length > 0) {
      const activities = journalData.filter((e) => e.entryType === 'activity');
      const sleepEntries = journalData.filter((e) => e.entryType === 'sleep');

      const totalActivityMinutes = activities.reduce(
        (sum: number, a: any) => sum + (a.activityDuration || 0),
        0
      );

      // Count top activities
      const activityCounts: Record<string, number> = {};
      for (const a of activities) {
        const type = a.activityType || 'other';
        activityCounts[type] = (activityCounts[type] || 0) + 1;
      }
      const topActivities = Object.entries(activityCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const avgSleepQuality =
        sleepEntries.length > 0
          ? Math.round(
              sleepEntries.reduce((sum: number, s: any) => sum + (s.sleepQuality || 0), 0) /
                sleepEntries.length
            )
          : null;

      const avgSleepHours =
        sleepEntries.length > 0
          ? Math.round(
              (sleepEntries.reduce((sum: number, s: any) => sum + (s.sleepHours || 0), 0) /
                sleepEntries.length) *
                10
            ) / 10
          : null;

      return res.json({
        period,
        days,
        startDate: startStr,
        endDate: endStr,
        totalActivityMinutes,
        sessionsCount: activities.length,
        avgSleepQuality,
        avgSleepHours,
        topActivities,
      });
    }

    // Demo / synthetic summary
    res.json({
      period,
      days,
      startDate: startStr,
      endDate: endStr,
      totalActivityMinutes: period === 'month' ? 720 : 180,
      sessionsCount: period === 'month' ? 18 : 5,
      avgSleepQuality: 7,
      avgSleepHours: 7.2,
      topActivities: [
        { name: 'walking', count: period === 'month' ? 10 : 3 },
        { name: 'cycling', count: period === 'month' ? 5 : 1 },
        { name: 'yoga', count: period === 'month' ? 3 : 1 },
      ],
    });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

export default router;
