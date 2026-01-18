import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Heart,
  Activity
} from 'lucide-react';
import { CareGap, Observation, Condition, MedicationRequest } from '@shared/schema';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

interface ExecutiveSummaryProps {
  careGaps: CareGap[];
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  patientAge?: number | null;
  onViewCareGaps: () => void;
  onSchedule: (gap: CareGap) => void;
}

// Reference ranges for common observations
const REFERENCE_RANGES: Record<string, { low: number; high: number; unit: string; name: string }> = {
  '85354-9': { low: 90, high: 140, unit: 'mmHg', name: 'Blood Pressure (Systolic)' },
  '8480-6': { low: 90, high: 140, unit: 'mmHg', name: 'Blood Pressure (Systolic)' },
  '33747-0': { low: 4.0, high: 5.7, unit: '%', name: 'HbA1c' },
  '4548-4': { low: 4.0, high: 5.7, unit: '%', name: 'HbA1c' },
  '29463-7': { low: 0, high: 999, unit: 'lbs', name: 'Body Weight' },
  '2093-3': { low: 0, high: 200, unit: 'mg/dL', name: 'Total Cholesterol' },
  '2085-9': { low: 40, high: 999, unit: 'mg/dL', name: 'HDL Cholesterol' },
  '2089-1': { low: 0, high: 100, unit: 'mg/dL', name: 'LDL Cholesterol' },
};

export function ExecutiveSummary({
  careGaps,
  observations,
  conditions,
  medications,
  patientAge,
  onViewCareGaps,
  onSchedule
}: ExecutiveSummaryProps) {
  // Calculate priority actions
  const priorityActions = useMemo(() => {
    const actions: Array<{
      id: string;
      title: string;
      description: string;
      urgency: 'critical' | 'high' | 'medium';
      type: 'care-gap' | 'observation' | 'medication';
      gap?: CareGap;
      daysUntilDue?: number;
    }> = [];

    // Add overdue and urgent care gaps
    careGaps.forEach(gap => {
      if (gap.status !== 'due') return;

      const daysUntilDue = gap.dueDate
        ? differenceInDays(new Date(gap.dueDate), new Date())
        : 30;

      let urgency: 'critical' | 'high' | 'medium' = 'medium';
      if (daysUntilDue < 0) urgency = 'critical';
      else if (daysUntilDue <= 14) urgency = 'high';
      else if (gap.priority === 'high') urgency = 'high';

      actions.push({
        id: gap.id,
        title: gap.title,
        description: daysUntilDue < 0
          ? `Overdue by ${Math.abs(daysUntilDue)} days`
          : `Due in ${daysUntilDue} days`,
        urgency,
        type: 'care-gap',
        gap,
        daysUntilDue
      });
    });

    // Sort by urgency then by days until due
    return actions.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return (a.daysUntilDue || 0) - (b.daysUntilDue || 0);
    }).slice(0, 3);
  }, [careGaps]);

  // Analyze observation trends
  const observationInsights = useMemo(() => {
    const insights: Array<{
      name: string;
      value: number;
      unit: string;
      interpretation: string;
      trend: 'improving' | 'stable' | 'concerning' | 'unknown';
      date: string;
    }> = [];

    // Group observations by code
    const obsByCode: Record<string, Observation[]> = {};
    observations.forEach(obs => {
      const code = obs.code?.coding?.[0]?.code;
      if (code && obs.valueQuantity?.value !== undefined) {
        if (!obsByCode[code]) obsByCode[code] = [];
        obsByCode[code].push(obs);
      }
    });

    // Analyze each type
    Object.entries(obsByCode).forEach(([code, obs]) => {
      const range = REFERENCE_RANGES[code];
      if (!range) return;

      // Sort by date, most recent first
      const sorted = obs.sort((a, b) =>
        new Date(b.effectiveDateTime || 0).getTime() - new Date(a.effectiveDateTime || 0).getTime()
      );

      const latest = sorted[0];
      const value = latest.valueQuantity?.value;
      if (value === undefined) return;

      // Determine interpretation
      let interpretation = '';
      let trend: 'improving' | 'stable' | 'concerning' | 'unknown' = 'unknown';

      if (code === '33747-0' || code === '4548-4') {
        // HbA1c - special handling for diabetes
        if (value < 5.7) {
          interpretation = 'Normal range';
          trend = 'stable';
        } else if (value < 6.5) {
          interpretation = 'Prediabetes range (5.7-6.4%)';
          trend = 'concerning';
        } else if (value < 7.0) {
          interpretation = 'Diabetic, well controlled';
          trend = 'stable';
        } else if (value < 8.0) {
          interpretation = 'Diabetic, moderate control needed';
          trend = 'concerning';
        } else {
          interpretation = 'Diabetic, needs better control';
          trend = 'concerning';
        }
      } else if (code === '85354-9' || code === '8480-6') {
        // Blood pressure
        if (value < 120) {
          interpretation = 'Normal';
          trend = 'stable';
        } else if (value < 130) {
          interpretation = 'Elevated';
          trend = 'stable';
        } else if (value < 140) {
          interpretation = 'High BP Stage 1';
          trend = 'concerning';
        } else {
          interpretation = 'High BP Stage 2';
          trend = 'concerning';
        }
      } else {
        // Generic range check
        if (value < range.low) {
          interpretation = 'Below normal range';
          trend = 'concerning';
        } else if (value > range.high) {
          interpretation = 'Above normal range';
          trend = 'concerning';
        } else {
          interpretation = 'Within normal range';
          trend = 'stable';
        }
      }

      // Check trend if we have previous values
      if (sorted.length >= 2) {
        const prev = sorted[1].valueQuantity?.value;
        if (prev !== undefined) {
          const delta = value - prev;
          // For most metrics, decreasing is better (except HDL)
          if (code === '2085-9') {
            // HDL - higher is better
            if (delta > 5) trend = 'improving';
            else if (delta < -5) trend = 'concerning';
          } else if (['33747-0', '4548-4', '85354-9', '8480-6', '2093-3', '2089-1'].includes(code)) {
            // These should be lower
            if (delta < -5) trend = 'improving';
            else if (delta > 5) trend = 'concerning';
          }
        }
      }

      insights.push({
        name: range.name,
        value,
        unit: range.unit,
        interpretation,
        trend,
        date: latest.effectiveDateTime || ''
      });
    });

    return insights;
  }, [observations]);

  // Calculate overall health score (simplified)
  const healthScore = useMemo(() => {
    let score = 100;

    // Deduct for care gaps
    const dueGaps = careGaps.filter(g => g.status === 'due');
    score -= dueGaps.length * 10;

    // Deduct for concerning observations
    const concerningObs = observationInsights.filter(o => o.trend === 'concerning');
    score -= concerningObs.length * 5;

    // Bonus for satisfied care gaps
    const satisfiedGaps = careGaps.filter(g => g.status === 'satisfied');
    score += satisfiedGaps.length * 5;

    return Math.max(0, Math.min(100, score));
  }, [careGaps, observationInsights]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-rose-100 dark:bg-rose-950 border-rose-200 dark:border-rose-800';
      case 'high': return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
      default: return 'bg-secondary/50 border-border';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="w-4 h-4 text-emerald-500" />;
      case 'concerning': return <TrendingUp className="w-4 h-4 text-rose-500" />;
      case 'stable': return <Minus className="w-4 h-4 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* At-a-Glance Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="card-elevated p-5 text-center">
          <p className="text-sm text-muted-foreground mb-2">Overall Health Score</p>
          <p className={`text-4xl font-bold ${getScoreColor(healthScore)}`}>{healthScore}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on care gaps and vitals
          </p>
        </div>

        {/* Active Conditions */}
        <div className="card-elevated p-5 text-center">
          <p className="text-sm text-muted-foreground mb-2">Active Conditions</p>
          <p className="text-4xl font-bold text-foreground">
            {conditions.filter(c => c.clinicalStatus?.coding?.[0]?.code === 'active').length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {medications.length} medications
          </p>
        </div>

        {/* Care Status */}
        <div className="card-elevated p-5 text-center">
          <p className="text-sm text-muted-foreground mb-2">Preventive Care</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {careGaps.filter(g => g.status === 'satisfied').length}
              </p>
              <p className="text-xs text-muted-foreground">Up to date</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {careGaps.filter(g => g.status === 'due').length}
              </p>
              <p className="text-xs text-muted-foreground">Action needed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Actions */}
      {priorityActions.length > 0 && (
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Priority Actions
            </h3>
            <Button variant="ghost" size="sm" onClick={onViewCareGaps}>
              View all
            </Button>
          </div>
          <div className="space-y-3">
            {priorityActions.map(action => (
              <div
                key={action.id}
                className={`p-3 rounded-lg border ${getUrgencyColor(action.urgency)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{action.title}</span>
                      {action.urgency === 'critical' && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  {action.gap && (
                    <Button
                      size="sm"
                      variant={action.urgency === 'critical' ? 'default' : 'outline'}
                      onClick={() => onSchedule(action.gap!)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Schedule
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Measurements */}
      {observationInsights.length > 0 && (
        <div className="card-elevated p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Key Measurements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {observationInsights.slice(0, 4).map((insight, i) => (
              <div key={i} className="p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{insight.name}</span>
                  {getTrendIcon(insight.trend)}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-semibold">{insight.value}</span>
                  <span className="text-sm text-muted-foreground">{insight.unit}</span>
                </div>
                <p className={`text-xs mt-1 ${
                  insight.trend === 'concerning' ? 'text-rose-600 dark:text-rose-400' :
                  insight.trend === 'improving' ? 'text-emerald-600 dark:text-emerald-400' :
                  'text-muted-foreground'
                }`}>
                  {insight.interpretation}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {insight.date && formatDistanceToNow(new Date(insight.date), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Summary for Caregivers */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <h4 className="font-semibold text-sm mb-2">📋 Summary for Caregivers</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• {conditions.filter(c => c.clinicalStatus?.coding?.[0]?.code === 'active').length} active health conditions being managed</li>
          <li>• {medications.length} current medications to track</li>
          <li>• {careGaps.filter(g => g.status === 'due').length} preventive care items need scheduling</li>
          {observationInsights.some(o => o.trend === 'concerning') && (
            <li className="text-amber-600 dark:text-amber-400">• Some measurements need attention - discuss with provider</li>
          )}
        </ul>
      </div>
    </div>
  );
}
