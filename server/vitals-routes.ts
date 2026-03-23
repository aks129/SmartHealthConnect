import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from './db';
import {
  vitalsReadings,
  vitalsReadingInputSchema,
  type VitalsReading,
} from '@shared/schema';

const router = Router();

// ============================================
// BP & Glucose Classification Helpers
// ============================================

function classifyBP(systolic: number, diastolic: number) {
  if (systolic < 120 && diastolic < 80) return { category: 'Normal', color: 'green', riskLevel: 'low' };
  if (systolic < 130 && diastolic < 80) return { category: 'Elevated', color: 'yellow', riskLevel: 'moderate' };
  if (systolic < 140 || diastolic < 90) return { category: 'High BP Stage 1', color: 'orange', riskLevel: 'high' };
  if (systolic >= 140 || diastolic >= 90) return { category: 'High BP Stage 2', color: 'red', riskLevel: 'very_high' };
  if (systolic > 180 || diastolic > 120) return { category: 'Hypertensive Crisis', color: 'red', riskLevel: 'critical' };
  return { category: 'Unknown', color: 'gray', riskLevel: 'unknown' };
}

function classifyGlucose(value: number, context?: string) {
  if (context === 'fasting' || context === 'before_meal') {
    if (value < 70) return { category: 'Low (Hypoglycemia)', color: 'red', riskLevel: 'high' };
    if (value <= 99) return { category: 'Normal', color: 'green', riskLevel: 'low' };
    if (value <= 125) return { category: 'Prediabetic Range', color: 'yellow', riskLevel: 'moderate' };
    return { category: 'Diabetic Range', color: 'red', riskLevel: 'high' };
  }
  // Post-meal or random
  if (value < 70) return { category: 'Low (Hypoglycemia)', color: 'red', riskLevel: 'high' };
  if (value <= 140) return { category: 'Normal', color: 'green', riskLevel: 'low' };
  if (value <= 199) return { category: 'Elevated', color: 'yellow', riskLevel: 'moderate' };
  return { category: 'High', color: 'red', riskLevel: 'high' };
}

// ============================================
// Health Education Generator (no API key needed)
// ============================================

function generateVitalsEducation(reading: VitalsReading, history: VitalsReading[]) {
  const education: {
    summary: string;
    tips: string[];
    resources: { title: string; url: string; type: string }[];
    riskLevel: string;
    category: string;
    trendDirection: string;
    infographic: {
      title: string;
      ranges: { label: string; min: number; max: number; color: string; current: boolean }[];
      currentValue: string;
      unit: string;
    };
  } = {
    summary: '',
    tips: [],
    resources: [],
    riskLevel: 'low',
    category: '',
    trendDirection: 'stable',
    infographic: {
      title: '',
      ranges: [],
      currentValue: '',
      unit: '',
    },
  };

  if (reading.readingType === 'blood_pressure' && reading.systolic && reading.diastolic) {
    const bp = classifyBP(reading.systolic, reading.diastolic);
    education.riskLevel = bp.riskLevel;
    education.category = bp.category;
    education.summary = `Your blood pressure reading of ${reading.systolic}/${reading.diastolic} mmHg is classified as "${bp.category}". ` +
      getBPExplanation(bp.category);

    education.tips = getBPTips(bp.category);
    education.resources = [
      { title: 'Understanding Blood Pressure Readings', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', type: 'article' },
      { title: 'DASH Eating Plan', url: 'https://www.nhlbi.nih.gov/education/dash-eating-plan', type: 'guide' },
      { title: 'AHA Blood Pressure Education', url: 'https://www.youtube.com/watch?v=Ab9OZsDECZw', type: 'video' },
    ];

    // Infographic data for visual gauge
    education.infographic = {
      title: 'Blood Pressure Classification',
      ranges: [
        { label: 'Normal', min: 0, max: 120, color: '#22c55e', current: bp.category === 'Normal' },
        { label: 'Elevated', min: 120, max: 130, color: '#eab308', current: bp.category === 'Elevated' },
        { label: 'Stage 1', min: 130, max: 140, color: '#f97316', current: bp.category === 'High BP Stage 1' },
        { label: 'Stage 2', min: 140, max: 180, color: '#ef4444', current: bp.category === 'High BP Stage 2' },
        { label: 'Crisis', min: 180, max: 300, color: '#991b1b', current: bp.category === 'Hypertensive Crisis' },
      ],
      currentValue: `${reading.systolic}/${reading.diastolic}`,
      unit: 'mmHg',
    };

    // Trend analysis
    const bpHistory = history
      .filter(r => r.readingType === 'blood_pressure' && r.systolic)
      .sort((a, b) => a.readingDate.localeCompare(b.readingDate));
    if (bpHistory.length >= 3) {
      const recent = bpHistory.slice(-3).map(r => r.systolic!);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const older = bpHistory.slice(0, Math.min(3, bpHistory.length - 3)).map(r => r.systolic!);
      if (older.length > 0) {
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        if (avg > olderAvg + 5) education.trendDirection = 'rising';
        else if (avg < olderAvg - 5) education.trendDirection = 'improving';
        else education.trendDirection = 'stable';
      }
    }
  }

  if (reading.readingType === 'blood_glucose' && reading.glucoseValue) {
    const glucose = classifyGlucose(reading.glucoseValue, reading.glucoseContext || undefined);
    education.riskLevel = glucose.riskLevel;
    education.category = glucose.category;
    const contextLabel = reading.glucoseContext ? ` (${reading.glucoseContext.replace('_', ' ')})` : '';
    education.summary = `Your blood glucose reading of ${reading.glucoseValue} mg/dL${contextLabel} is classified as "${glucose.category}". ` +
      getGlucoseExplanation(glucose.category);

    education.tips = getGlucoseTips(glucose.category);
    education.resources = [
      { title: 'Understanding Blood Sugar Levels', url: 'https://www.diabetes.org/healthy-living/medication-treatments/blood-glucose-testing-and-control', type: 'article' },
      { title: 'Diabetes Plate Method', url: 'https://www.diabetes.org/food-nutrition/understanding-carbs/diabetes-plate-method', type: 'guide' },
      { title: 'Managing Blood Sugar', url: 'https://www.youtube.com/watch?v=X9ivR8y0mWo', type: 'video' },
    ];

    education.infographic = {
      title: 'Blood Glucose Classification' + contextLabel,
      ranges: [
        { label: 'Low', min: 0, max: 70, color: '#ef4444', current: glucose.category.includes('Low') },
        { label: 'Normal', min: 70, max: 100, color: '#22c55e', current: glucose.category === 'Normal' },
        { label: 'Prediabetic', min: 100, max: 126, color: '#eab308', current: glucose.category.includes('Prediabetic') },
        { label: 'Diabetic', min: 126, max: 300, color: '#ef4444', current: glucose.category.includes('Diabetic') || glucose.category === 'High' },
      ],
      currentValue: `${reading.glucoseValue}`,
      unit: 'mg/dL',
    };

    const glucoseHistory = history
      .filter(r => r.readingType === 'blood_glucose' && r.glucoseValue)
      .sort((a, b) => a.readingDate.localeCompare(b.readingDate));
    if (glucoseHistory.length >= 3) {
      const recent = glucoseHistory.slice(-3).map(r => r.glucoseValue!);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const older = glucoseHistory.slice(0, Math.min(3, glucoseHistory.length - 3)).map(r => r.glucoseValue!);
      if (older.length > 0) {
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        if (avg > olderAvg + 10) education.trendDirection = 'rising';
        else if (avg < olderAvg - 10) education.trendDirection = 'improving';
        else education.trendDirection = 'stable';
      }
    }
  }

  return education;
}

function getBPExplanation(category: string): string {
  switch (category) {
    case 'Normal': return 'This is within the healthy range. Keep up your current lifestyle habits!';
    case 'Elevated': return 'Your systolic pressure is slightly above normal. Without lifestyle changes, this can progress to high blood pressure.';
    case 'High BP Stage 1': return 'Your doctor may recommend lifestyle changes and possibly medication depending on your risk of heart disease.';
    case 'High BP Stage 2': return 'At this stage, doctors typically prescribe a combination of medications along with lifestyle changes.';
    case 'Hypertensive Crisis': return 'This reading requires immediate medical attention. Contact your healthcare provider or call 911 if you experience symptoms like chest pain, shortness of breath, or vision changes.';
    default: return '';
  }
}

function getBPTips(category: string): string[] {
  const baseTips = [
    'Measure at the same time daily for consistent tracking',
    'Sit quietly for 5 minutes before measuring',
    'Avoid caffeine and exercise 30 minutes before readings',
  ];
  if (category === 'Normal') return [...baseTips, 'Continue regular exercise (150 min/week)', 'Maintain a balanced diet low in sodium'];
  if (category === 'Elevated') return [...baseTips, 'Reduce sodium intake to under 2,300 mg/day', 'Increase potassium-rich foods (bananas, spinach)', 'Aim for 30 minutes of moderate exercise most days'];
  return [...baseTips, 'Follow the DASH diet plan', 'Limit alcohol consumption', 'Practice stress management techniques', 'Take prescribed medications as directed', 'Schedule a follow-up with your provider'];
}

function getGlucoseExplanation(category: string): string {
  switch (category) {
    case 'Normal': return 'Your blood sugar is within the target range. Excellent management!';
    case 'Low (Hypoglycemia)': return 'Your blood sugar is below normal. Eat or drink 15 grams of fast-acting carbohydrates (juice, glucose tablets) and recheck in 15 minutes.';
    case 'Prediabetic Range': return 'Your fasting glucose is in the prediabetic range. Lifestyle changes now can prevent or delay type 2 diabetes.';
    case 'Diabetic Range': return 'Your glucose level indicates possible diabetes. Discuss this with your healthcare provider for proper evaluation and management.';
    case 'Elevated': return 'Your glucose is above the normal post-meal range. Monitor trends and discuss with your provider if this is a recurring pattern.';
    case 'High': return 'Your glucose is significantly elevated. Contact your healthcare provider for guidance on next steps.';
    default: return '';
  }
}

function getGlucoseTips(category: string): string[] {
  const baseTips = [
    'Log the context of each reading (fasting, before/after meals)',
    'Keep a food diary alongside glucose readings to identify patterns',
  ];
  if (category === 'Normal') return [...baseTips, 'Continue balanced meals with controlled portions', 'Stay active — exercise helps maintain healthy glucose levels'];
  if (category.includes('Low')) return ['Eat 15g of fast-acting carbs now (4 oz juice, glucose tablets)', 'Recheck blood sugar in 15 minutes', 'If still low, repeat treatment', 'Talk to your provider about adjusting medication if lows are frequent'];
  return [...baseTips, 'Choose whole grains over refined carbohydrates', 'Add more fiber to meals to slow glucose absorption', 'Take a 15-minute walk after meals', 'Stay hydrated — dehydration can raise blood sugar', 'Discuss your readings at your next provider visit'];
}

// ============================================
// Vitals API Routes
// ============================================

// GET /api/vitals/:memberId - Get all vitals readings for a family member
router.get('/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { type, startDate, endDate, limit: limitParam } = req.query;

    let readings = await db
      .select()
      .from(vitalsReadings)
      .where(eq(vitalsReadings.familyMemberId, memberId))
      .orderBy(desc(vitalsReadings.readingDate), desc(vitalsReadings.readingTime));

    if (type && typeof type === 'string') {
      readings = readings.filter((r: VitalsReading) => r.readingType === type);
    }
    if (startDate && typeof startDate === 'string') {
      readings = readings.filter((r: VitalsReading) => r.readingDate >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      readings = readings.filter((r: VitalsReading) => r.readingDate <= endDate);
    }
    if (limitParam) {
      readings = readings.slice(0, parseInt(limitParam as string));
    }

    res.json(readings);
  } catch (error) {
    console.error('Error fetching vitals readings:', error);
    res.status(500).json({ error: 'Failed to fetch vitals readings' });
  }
});

// POST /api/vitals/:memberId - Log a new vitals reading
router.post('/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const validation = vitalsReadingInputSchema.safeParse({ ...req.body, familyMemberId: memberId });

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    // Insert the reading
    const [newReading] = await db
      .insert(vitalsReadings)
      .values(validation.data)
      .returning();

    // Generate education content based on reading + history
    const history = await db
      .select()
      .from(vitalsReadings)
      .where(eq(vitalsReadings.familyMemberId, memberId))
      .orderBy(desc(vitalsReadings.readingDate));

    const education = generateVitalsEducation(newReading, history);

    // Cache education on the reading
    const [updated] = await db
      .update(vitalsReadings)
      .set({ aiEducation: education })
      .where(eq(vitalsReadings.id, newReading.id))
      .returning();

    res.status(201).json(updated);
  } catch (error) {
    console.error('Error creating vitals reading:', error);
    res.status(500).json({ error: 'Failed to create vitals reading' });
  }
});

// GET /api/vitals/:memberId/trends - Get trend analysis and education
router.get('/:memberId/trends', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);

    const readings = await db
      .select()
      .from(vitalsReadings)
      .where(eq(vitalsReadings.familyMemberId, memberId))
      .orderBy(desc(vitalsReadings.readingDate));

    const bpReadings = readings.filter(r => r.readingType === 'blood_pressure');
    const glucoseReadings = readings.filter(r => r.readingType === 'blood_glucose');

    // Compute stats
    const bpStats = bpReadings.length > 0 ? {
      count: bpReadings.length,
      latestSystolic: bpReadings[0].systolic,
      latestDiastolic: bpReadings[0].diastolic,
      avgSystolic: Math.round(bpReadings.reduce((s, r) => s + (r.systolic || 0), 0) / bpReadings.length),
      avgDiastolic: Math.round(bpReadings.reduce((s, r) => s + (r.diastolic || 0), 0) / bpReadings.length),
      classification: bpReadings[0].systolic && bpReadings[0].diastolic
        ? classifyBP(bpReadings[0].systolic, bpReadings[0].diastolic)
        : null,
    } : null;

    const glucoseStats = glucoseReadings.length > 0 ? {
      count: glucoseReadings.length,
      latestValue: glucoseReadings[0].glucoseValue,
      avgValue: Math.round(glucoseReadings.reduce((s, r) => s + (r.glucoseValue || 0), 0) / glucoseReadings.length),
      classification: glucoseReadings[0].glucoseValue
        ? classifyGlucose(glucoseReadings[0].glucoseValue, glucoseReadings[0].glucoseContext || undefined)
        : null,
    } : null;

    // Chart data (last 30 readings of each type)
    const bpChartData = bpReadings.slice(0, 30).reverse().map(r => ({
      date: r.readingDate,
      time: r.readingTime,
      systolic: r.systolic,
      diastolic: r.diastolic,
      heartRate: r.heartRate,
    }));

    const glucoseChartData = glucoseReadings.slice(0, 30).reverse().map(r => ({
      date: r.readingDate,
      time: r.readingTime,
      value: r.glucoseValue,
      context: r.glucoseContext,
    }));

    // Generate latest education if available
    const latestReading = readings[0];
    const education = latestReading ? generateVitalsEducation(latestReading, readings) : null;

    res.json({
      bloodPressure: { stats: bpStats, chartData: bpChartData },
      bloodGlucose: { stats: glucoseStats, chartData: glucoseChartData },
      education,
      totalReadings: readings.length,
    });
  } catch (error) {
    console.error('Error fetching vitals trends:', error);
    res.status(500).json({ error: 'Failed to fetch vitals trends' });
  }
});

// DELETE /api/vitals/reading/:id - Delete a reading
router.delete('/reading/:id', async (req: Request, res: Response) => {
  try {
    const readingId = parseInt(req.params.id);
    const [deleted] = await db
      .delete(vitalsReadings)
      .where(eq(vitalsReadings.id, readingId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Reading not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vitals reading:', error);
    res.status(500).json({ error: 'Failed to delete vitals reading' });
  }
});

// POST /api/vitals/:memberId/parse-photo - Parse vitals from photo text (OCR simulation)
// In MVP, accepts extracted text and parses BP/glucose values
router.post('/:memberId/parse-photo', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content required' });
    }

    const result: { readingType?: string; systolic?: number; diastolic?: number; glucoseValue?: number; heartRate?: number; confidence: number } = { confidence: 0 };

    // Try to parse blood pressure (e.g., "120/80", "BP: 135/85", "systolic 120 diastolic 80")
    const bpMatch = text.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
    if (bpMatch) {
      const sys = parseInt(bpMatch[1]);
      const dia = parseInt(bpMatch[2]);
      if (sys >= 50 && sys <= 300 && dia >= 20 && dia <= 200) {
        result.readingType = 'blood_pressure';
        result.systolic = sys;
        result.diastolic = dia;
        result.confidence = 0.9;
      }
    }

    // Try to parse heart rate
    const hrMatch = text.match(/(?:heart\s*rate|pulse|hr|bpm)[:\s]*(\d{2,3})/i) || text.match(/(\d{2,3})\s*bpm/i);
    if (hrMatch) {
      const hr = parseInt(hrMatch[1]);
      if (hr >= 30 && hr <= 250) {
        result.heartRate = hr;
      }
    }

    // Try to parse glucose if no BP found
    if (!result.readingType) {
      const glucoseMatch = text.match(/(?:glucose|sugar|bg|blood\s*sugar)[:\s]*(\d{2,3})/i) || text.match(/(\d{2,3})\s*mg\s*\/?\s*d[lL]/i);
      if (glucoseMatch) {
        const val = parseInt(glucoseMatch[1]);
        if (val >= 20 && val <= 600) {
          result.readingType = 'blood_glucose';
          result.glucoseValue = val;
          result.confidence = 0.85;
        }
      }
    }

    if (!result.readingType) {
      return res.status(200).json({ parsed: false, message: 'Could not detect BP or glucose values. Please enter manually.' });
    }

    res.json({ parsed: true, ...result });
  } catch (error) {
    console.error('Error parsing photo text:', error);
    res.status(500).json({ error: 'Failed to parse vitals from text' });
  }
});

export { classifyBP, classifyGlucose, generateVitalsEducation };
export default router;
