import { useMemo, useState } from 'react';
import { format, differenceInYears, differenceInMonths, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Heart,
  Activity,
  Pill,
  TestTube,
  FileText,
  Lightbulb,
  ChevronRight,
  Info,
  Minus,
  Clock,
  Target,
  BookOpen
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Observation, Condition, MedicationRequest } from '@shared/schema';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'condition' | 'medication' | 'observation' | 'milestone' | 'insight';
  title: string;
  description: string;
  category?: string;
  value?: number;
  unit?: string;
  status?: string;
  icon: any;
  color: string;
  significance?: 'high' | 'medium' | 'low';
}

interface LongitudinalTimelineProps {
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  patientBirthDate?: string;
}

// Clinical reference ranges with research-backed interpretations
const CLINICAL_INSIGHTS: Record<string, {
  name: string;
  unit: string;
  normalRange: [number, number];
  optimalRange?: [number, number];
  interpretation: (value: number, age?: number, conditions?: string[]) => string;
  researchNote?: string;
  riskFactors?: string[];
}> = {
  '33747-0': { // HbA1c
    name: 'HbA1c',
    unit: '%',
    normalRange: [4.0, 5.6],
    optimalRange: [4.0, 5.4],
    interpretation: (value, age, conditions) => {
      const hasDiabetes = conditions?.some(c => c.toLowerCase().includes('diabetes'));
      if (hasDiabetes) {
        if (value < 7.0) return 'Well-controlled diabetes. ADA recommends <7% for most adults.';
        if (value < 8.0) return 'Moderate control. Consider discussing treatment optimization.';
        return 'Above target. Higher risk of complications. Discuss management with your provider.';
      }
      if (value < 5.7) return 'Normal glucose metabolism.';
      if (value < 6.5) return 'Prediabetes range. Lifestyle changes can prevent progression.';
      return 'Diabetes range. Recommend follow-up with healthcare provider.';
    },
    researchNote: 'Each 1% reduction in HbA1c is associated with 37% reduced risk of microvascular complications (UKPDS study).',
    riskFactors: ['Family history', 'Obesity', 'Sedentary lifestyle', 'Age >45']
  },
  '4548-4': { // HbA1c (alternate code)
    name: 'HbA1c',
    unit: '%',
    normalRange: [4.0, 5.6],
    optimalRange: [4.0, 5.4],
    interpretation: (value) => {
      if (value < 5.7) return 'Normal glucose metabolism.';
      if (value < 6.5) return 'Prediabetes range. Lifestyle intervention recommended.';
      return 'Diabetes range.';
    }
  },
  '85354-9': { // Blood Pressure Systolic
    name: 'Blood Pressure (Systolic)',
    unit: 'mmHg',
    normalRange: [90, 120],
    optimalRange: [90, 115],
    interpretation: (value, age) => {
      if (value < 90) return 'Low blood pressure. May cause dizziness.';
      if (value < 120) return 'Optimal blood pressure.';
      if (value < 130) return 'Elevated. Lifestyle modifications recommended.';
      if (value < 140) return 'Stage 1 hypertension. 10-year CVD risk increases significantly.';
      return 'Stage 2 hypertension. Treatment strongly recommended.';
    },
    researchNote: 'SPRINT trial showed intensive BP control (<120) reduced cardiovascular events by 25% in high-risk patients.',
    riskFactors: ['High sodium intake', 'Obesity', 'Stress', 'Family history']
  },
  '8480-6': { // Blood Pressure Systolic (alternate)
    name: 'Blood Pressure (Systolic)',
    unit: 'mmHg',
    normalRange: [90, 120],
    interpretation: (value) => {
      if (value < 120) return 'Normal';
      if (value < 130) return 'Elevated';
      if (value < 140) return 'High (Stage 1)';
      return 'High (Stage 2)';
    }
  },
  '2093-3': { // Total Cholesterol
    name: 'Total Cholesterol',
    unit: 'mg/dL',
    normalRange: [0, 200],
    optimalRange: [0, 180],
    interpretation: (value) => {
      if (value < 200) return 'Desirable cholesterol level.';
      if (value < 240) return 'Borderline high. Recommend dietary changes.';
      return 'High cholesterol. Consider statin therapy discussion.';
    },
    researchNote: 'For every 40 mg/dL reduction in LDL, cardiovascular risk decreases by ~22% (Cholesterol Treatment Trialists).'
  },
  '2085-9': { // HDL Cholesterol
    name: 'HDL Cholesterol (Good)',
    unit: 'mg/dL',
    normalRange: [40, 200],
    optimalRange: [60, 200],
    interpretation: (value) => {
      if (value < 40) return 'Low HDL increases cardiovascular risk.';
      if (value < 60) return 'Acceptable but higher is better.';
      return 'Protective level. Associated with lower cardiovascular risk.';
    }
  },
  '2089-1': { // LDL Cholesterol
    name: 'LDL Cholesterol (Bad)',
    unit: 'mg/dL',
    normalRange: [0, 100],
    optimalRange: [0, 70],
    interpretation: (value, age, conditions) => {
      const hasHeartDisease = conditions?.some(c =>
        c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiac')
      );
      if (hasHeartDisease) {
        if (value < 70) return 'At goal for high-risk patients.';
        return 'Above target for patients with cardiovascular disease.';
      }
      if (value < 100) return 'Optimal LDL level.';
      if (value < 130) return 'Near optimal. Consider lifestyle changes.';
      if (value < 160) return 'Borderline high.';
      return 'High LDL. Discuss treatment options.';
    }
  },
  '29463-7': { // Body Weight
    name: 'Body Weight',
    unit: 'lbs',
    normalRange: [0, 999],
    interpretation: (value) => 'Weight tracking helps monitor overall health trends.'
  }
};

// Generate research-backed insights from longitudinal data
function generateLongitudinalInsights(
  observations: Observation[],
  conditions: Condition[],
  birthDate?: string
): Array<{ title: string; description: string; type: 'positive' | 'warning' | 'info'; citation?: string }> {
  const insights: Array<{ title: string; description: string; type: 'positive' | 'warning' | 'info'; citation?: string }> = [];
  const conditionNames = conditions.map(c => c.code?.coding?.[0]?.display?.toLowerCase() || '');
  const hasDiabetes = conditionNames.some(c => c.includes('diabetes'));
  const hasHypertension = conditionNames.some(c => c.includes('hypertens'));

  // Group observations by code
  const obsByCode: Record<string, Observation[]> = {};
  observations.forEach(obs => {
    const code = obs.code?.coding?.[0]?.code;
    if (code && obs.valueQuantity?.value !== undefined) {
      if (!obsByCode[code]) obsByCode[code] = [];
      obsByCode[code].push(obs);
    }
  });

  // Analyze HbA1c trends for diabetics
  const a1cObs = obsByCode['33747-0'] || obsByCode['4548-4'] || [];
  if (a1cObs.length >= 2 && hasDiabetes) {
    const sorted = a1cObs.sort((a, b) =>
      new Date(a.effectiveDateTime || 0).getTime() - new Date(b.effectiveDateTime || 0).getTime()
    );
    const latest = sorted[sorted.length - 1].valueQuantity?.value || 0;
    const previous = sorted[sorted.length - 2].valueQuantity?.value || 0;
    const delta = latest - previous;

    if (delta < -0.5) {
      insights.push({
        title: 'HbA1c Improving',
        description: `Your HbA1c decreased by ${Math.abs(delta).toFixed(1)}%. Each 1% reduction is associated with 37% lower risk of microvascular complications.`,
        type: 'positive',
        citation: 'UK Prospective Diabetes Study (UKPDS)'
      });
    } else if (delta > 0.5) {
      insights.push({
        title: 'HbA1c Rising',
        description: `Your HbA1c increased by ${delta.toFixed(1)}%. Consider discussing medication adjustments or lifestyle changes with your provider.`,
        type: 'warning'
      });
    }
  }

  // Analyze BP trends for hypertensives
  const bpObs = obsByCode['85354-9'] || obsByCode['8480-6'] || [];
  if (bpObs.length >= 2 && hasHypertension) {
    const sorted = bpObs.sort((a, b) =>
      new Date(a.effectiveDateTime || 0).getTime() - new Date(b.effectiveDateTime || 0).getTime()
    );
    const latest = sorted[sorted.length - 1].valueQuantity?.value || 0;
    const avgRecent = sorted.slice(-3).reduce((sum, o) => sum + (o.valueQuantity?.value || 0), 0) / Math.min(3, sorted.length);

    if (avgRecent < 130) {
      insights.push({
        title: 'Blood Pressure Well Controlled',
        description: 'Your recent BP readings are in the controlled range. Maintaining <130 systolic reduces cardiovascular event risk by 25%.',
        type: 'positive',
        citation: 'SPRINT Trial (2015)'
      });
    } else if (avgRecent >= 140) {
      insights.push({
        title: 'Blood Pressure Above Target',
        description: 'Your recent BP average is above 140. This increases 10-year cardiovascular disease risk significantly.',
        type: 'warning'
      });
    }
  }

  // General preventive insights based on conditions
  if (hasDiabetes && !a1cObs.some(o => {
    const date = new Date(o.effectiveDateTime || 0);
    const monthsAgo = differenceInMonths(new Date(), date);
    return monthsAgo < 3;
  })) {
    insights.push({
      title: 'HbA1c Test Due',
      description: 'No HbA1c test in the last 3 months. ADA recommends testing every 3 months for diabetic patients.',
      type: 'info',
      citation: 'American Diabetes Association Standards of Care'
    });
  }

  return insights;
}

export function LongitudinalTimeline({
  observations,
  conditions,
  medications,
  patientBirthDate
}: LongitudinalTimelineProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'6m' | '1y' | '3y' | 'all'>('1y');

  const conditionNames = conditions.map(c => c.code?.coding?.[0]?.display || '');

  // Build timeline events
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add conditions
    conditions.forEach(c => {
      const date = c.onsetDateTime || c.recordedDate;
      if (date) {
        events.push({
          id: `condition-${c.id}`,
          date,
          type: 'condition',
          title: c.code?.coding?.[0]?.display || 'Condition',
          description: `Diagnosed ${c.clinicalStatus?.coding?.[0]?.code || ''}`,
          category: 'condition',
          status: c.clinicalStatus?.coding?.[0]?.code,
          icon: Heart,
          color: 'text-rose-500',
          significance: 'high'
        });
      }
    });

    // Add medications
    medications.forEach(m => {
      if (m.authoredOn) {
        events.push({
          id: `med-${m.id}`,
          date: m.authoredOn,
          type: 'medication',
          title: m.medicationCodeableConcept?.coding?.[0]?.display || 'Medication',
          description: m.dosageInstruction?.[0]?.text || 'Prescribed',
          category: 'medication',
          status: m.status,
          icon: Pill,
          color: 'text-emerald-500',
          significance: 'medium'
        });
      }
    });

    // Add significant observations
    observations.forEach(o => {
      if (o.effectiveDateTime && o.valueQuantity?.value !== undefined) {
        const code = o.code?.coding?.[0]?.code;
        const insight = code ? CLINICAL_INSIGHTS[code] : null;

        events.push({
          id: `obs-${o.id}`,
          date: o.effectiveDateTime,
          type: 'observation',
          title: o.code?.coding?.[0]?.display || 'Lab Result',
          description: insight?.interpretation(o.valueQuantity.value, undefined, conditionNames) || '',
          category: 'observation',
          value: o.valueQuantity.value,
          unit: o.valueQuantity.unit || '',
          icon: TestTube,
          color: 'text-sky-500',
          significance: 'low'
        });
      }
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [observations, conditions, medications, conditionNames]);

  // Build chart data for selected metric
  const chartData = useMemo(() => {
    if (selectedMetric === 'all') return [];

    const filtered = observations.filter(o => {
      const code = o.code?.coding?.[0]?.code;
      return code === selectedMetric && o.valueQuantity?.value !== undefined;
    });

    return filtered
      .map(o => ({
        date: o.effectiveDateTime || '',
        value: o.valueQuantity?.value,
        displayDate: o.effectiveDateTime ? format(new Date(o.effectiveDateTime), 'MMM yyyy') : ''
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [observations, selectedMetric]);

  // Get available metrics
  const availableMetrics = useMemo(() => {
    const metrics: { code: string; name: string; count: number }[] = [];
    const seen = new Set<string>();

    observations.forEach(o => {
      const code = o.code?.coding?.[0]?.code;
      if (code && !seen.has(code) && CLINICAL_INSIGHTS[code]) {
        seen.add(code);
        const count = observations.filter(obs => obs.code?.coding?.[0]?.code === code).length;
        metrics.push({
          code,
          name: CLINICAL_INSIGHTS[code].name,
          count
        });
      }
    });

    return metrics.sort((a, b) => b.count - a.count);
  }, [observations]);

  // Generate insights
  const insights = useMemo(() =>
    generateLongitudinalInsights(observations, conditions, patientBirthDate),
    [observations, conditions, patientBirthDate]
  );

  const selectedInsight = selectedMetric !== 'all' ? CLINICAL_INSIGHTS[selectedMetric] : null;

  return (
    <div className="space-y-6">
      {/* Research-Backed Insights */}
      {insights.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Research-Backed Insights
            </CardTitle>
            <CardDescription>
              Personalized analysis based on your longitudinal health data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  insight.type === 'positive' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' :
                  insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' :
                  'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  {insight.type === 'positive' ? (
                    <TrendingDown className="w-5 h-5 text-emerald-500 mt-0.5" />
                  ) : insight.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  ) : (
                    <Info className="w-5 h-5 text-sky-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{insight.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    {insight.citation && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Source: {insight.citation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Metric Trend Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Longitudinal Trends
              </CardTitle>
              <CardDescription>
                Track how your health metrics change over time
              </CardDescription>
            </div>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events (Timeline)</SelectItem>
                {availableMetrics.map(m => (
                  <SelectItem key={m.code} value={m.code}>
                    {m.name} ({m.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedMetric !== 'all' && chartData.length > 1 ? (
            <div className="space-y-4">
              {/* Clinical context */}
              {selectedInsight && (
                <div className="p-3 bg-secondary/30 rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-medium">Reference Range: {selectedInsight.normalRange[0]} - {selectedInsight.normalRange[1]} {selectedInsight.unit}</span>
                  </div>
                  {selectedInsight.researchNote && (
                    <p className="text-muted-foreground text-xs mt-2">
                      <BookOpen className="w-3 h-3 inline mr-1" />
                      {selectedInsight.researchNote}
                    </p>
                  )}
                </div>
              )}

              {/* Chart */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={selectedInsight ? [
                        Math.min(selectedInsight.normalRange[0] * 0.8, Math.min(...chartData.map(d => d.value || 0))),
                        Math.max(selectedInsight.normalRange[1] * 1.2, Math.max(...chartData.map(d => d.value || 0)))
                      ] : ['auto', 'auto']}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="font-medium">{data.displayDate}</p>
                              <p className="text-lg">{data.value} {selectedInsight?.unit}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {selectedInsight && (
                      <>
                        <ReferenceLine
                          y={selectedInsight.normalRange[0]}
                          stroke="#22c55e"
                          strokeDasharray="5 5"
                          label={{ value: 'Low', position: 'left', fontSize: 10 }}
                        />
                        <ReferenceLine
                          y={selectedInsight.normalRange[1]}
                          stroke="#ef4444"
                          strokeDasharray="5 5"
                          label={{ value: 'High', position: 'left', fontSize: 10 }}
                        />
                      </>
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      fill="hsl(var(--primary) / 0.1)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            /* Timeline view for all events */
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {timelineEvents.slice(0, 20).map((event, i) => (
                  <div key={event.id} className="relative pl-10">
                    <div className={`absolute left-2 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center ${
                      event.type === 'condition' ? 'border-rose-500' :
                      event.type === 'medication' ? 'border-emerald-500' :
                      'border-sky-500'
                    }`}>
                      <event.icon className={`w-3 h-3 ${event.color}`} />
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">{event.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      {event.value !== undefined && (
                        <Badge variant="outline" className="mt-2">
                          {event.value} {event.unit}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
