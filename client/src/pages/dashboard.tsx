import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModeToggle } from '@/components/mode-toggle';
import { checkAuth } from '@/lib/fhir-client';
import { SchedulingModal } from '@/components/health/SchedulingModal';
import { ExecutiveSummary } from '@/components/health/ExecutiveSummary';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  Heart,
  Activity,
  Pill,
  AlertTriangle,
  TestTube,
  Bell,
  ChevronRight,
  Home,
  CheckCircle2,
  User,
  Syringe,
  ArrowLeft,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  LayoutDashboard
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Patient,
  Observation,
  Condition,
  MedicationRequest,
  AllergyIntolerance,
  Immunization,
  CareGap
} from '@shared/schema';

// Format FHIR date helper
function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get age from birthdate
function getAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Reference ranges for observations
const REFERENCE_RANGES: Record<string, { low: number; high: number; unit: string }> = {
  '85354-9': { low: 90, high: 140, unit: 'mmHg' }, // BP systolic
  '8480-6': { low: 90, high: 140, unit: 'mmHg' },
  '33747-0': { low: 4.0, high: 7.0, unit: '%' }, // HbA1c (diabetic target)
  '4548-4': { low: 4.0, high: 7.0, unit: '%' },
  '29463-7': { low: 0, high: 999, unit: 'lbs' }, // Weight (no upper limit alarm)
};

// Get trend indicator for observation
function getObservationTrend(obs: Observation, allObs: Observation[]): 'up' | 'down' | 'stable' | null {
  const code = obs.code?.coding?.[0]?.code;
  if (!code || obs.valueQuantity?.value === undefined) return null;

  // Find previous observation of same type
  const sameType = allObs.filter(o =>
    o.code?.coding?.[0]?.code === code &&
    o.id !== obs.id &&
    o.valueQuantity?.value !== undefined
  ).sort((a, b) =>
    new Date(b.effectiveDateTime || 0).getTime() - new Date(a.effectiveDateTime || 0).getTime()
  );

  if (sameType.length === 0) return null;

  const prev = sameType[0].valueQuantity?.value;
  const curr = obs.valueQuantity.value;
  if (prev === undefined) return null;

  const delta = curr - prev;
  if (Math.abs(delta) < 1) return 'stable';
  return delta > 0 ? 'up' : 'down';
}

// Get interpretation for observation value
function getObservationInterpretation(obs: Observation): { text: string; status: 'normal' | 'warning' | 'critical' } {
  const code = obs.code?.coding?.[0]?.code;
  const value = obs.valueQuantity?.value;
  if (!code || value === undefined) return { text: '', status: 'normal' };

  // HbA1c interpretation
  if (code === '33747-0' || code === '4548-4') {
    if (value < 5.7) return { text: 'Normal', status: 'normal' };
    if (value < 6.5) return { text: 'Prediabetic range', status: 'warning' };
    if (value < 7.0) return { text: 'Well controlled (diabetic)', status: 'normal' };
    if (value < 8.0) return { text: 'Needs improvement', status: 'warning' };
    return { text: 'Needs attention', status: 'critical' };
  }

  // Blood pressure interpretation
  if (code === '85354-9' || code === '8480-6') {
    if (value < 120) return { text: 'Normal', status: 'normal' };
    if (value < 130) return { text: 'Elevated', status: 'warning' };
    if (value < 140) return { text: 'High (Stage 1)', status: 'warning' };
    return { text: 'High (Stage 2)', status: 'critical' };
  }

  // Generic interpretation using reference ranges
  const range = REFERENCE_RANGES[code];
  if (range) {
    if (value < range.low) return { text: 'Below normal', status: 'warning' };
    if (value > range.high) return { text: 'Above normal', status: 'warning' };
    return { text: 'Normal', status: 'normal' };
  }

  return { text: '', status: 'normal' };
}

// Get data freshness indicator
function getDataFreshness(dateString?: string): { text: string; status: 'fresh' | 'stale' | 'old' } {
  if (!dateString) return { text: 'Unknown', status: 'old' };

  const date = new Date(dateString);
  const daysDiff = differenceInDays(new Date(), date);

  if (daysDiff <= 30) return { text: formatDistanceToNow(date, { addSuffix: true }), status: 'fresh' };
  if (daysDiff <= 90) return { text: formatDistanceToNow(date, { addSuffix: true }), status: 'stale' };
  return { text: formatDistanceToNow(date, { addSuffix: true }), status: 'old' };
}

// Get urgency for care gap
function getCareGapUrgency(gap: CareGap): { text: string; level: 'overdue' | 'urgent' | 'soon' | 'normal' } {
  if (gap.status !== 'due') return { text: '', level: 'normal' };

  if (!gap.dueDate) return { text: 'Schedule when convenient', level: 'normal' };

  const daysUntilDue = differenceInDays(new Date(gap.dueDate), new Date());

  if (daysUntilDue < 0) {
    return { text: `Overdue by ${Math.abs(daysUntilDue)} days`, level: 'overdue' };
  } else if (daysUntilDue <= 7) {
    return { text: `Due this week`, level: 'urgent' };
  } else if (daysUntilDue <= 14) {
    return { text: `Due in ${daysUntilDue} days`, level: 'urgent' };
  } else if (daysUntilDue <= 30) {
    return { text: `Due in ${daysUntilDue} days`, level: 'soon' };
  }
  return { text: `Due in ${daysUntilDue} days`, level: 'normal' };
}

// Get personalized context for care gap
function getPersonalizedContext(gap: CareGap, conditions: Condition[], age?: number | null): string {
  const conditionNames = conditions
    .filter(c => c.clinicalStatus?.coding?.[0]?.code === 'active')
    .map(c => c.code?.coding?.[0]?.display?.toLowerCase() || '')
    .filter(Boolean);

  const hasDiabetes = conditionNames.some(c => c.includes('diabetes'));
  const hasHypertension = conditionNames.some(c => c.includes('hypertens') || c.includes('blood pressure'));

  switch (gap.measureId) {
    case 'CDC-E':
      if (hasDiabetes) {
        return 'As a diabetic patient, regular A1c testing is crucial for preventing complications like kidney disease, nerve damage, and vision problems.';
      }
      return 'This test monitors your blood sugar control over the past 2-3 months.';

    case 'CBP':
      if (hasHypertension) {
        return 'Managing your hypertension is key to reducing risk of heart attack, stroke, and kidney disease.';
      }
      return 'Regular blood pressure monitoring helps catch issues early.';

    case 'EED':
      if (hasDiabetes) {
        return 'Diabetes increases risk of eye problems. Annual exams can catch diabetic retinopathy early, when treatment is most effective.';
      }
      return 'Regular eye exams help maintain good vision and detect issues early.';

    case 'COL':
      if (age && age >= 45) {
        return 'Colorectal cancer screening is especially important after age 45. Detected early, it\'s highly treatable.';
      }
      return 'Colorectal cancer screening can find precancerous polyps before they become cancer.';

    case 'AWV':
      return 'Your annual wellness visit is a chance to review your overall health, update screenings, and discuss any concerns with your doctor.';

    case 'FVA':
      if (hasDiabetes || hasHypertension || (age && age >= 65)) {
        return 'With your health conditions, getting the flu vaccine is especially important to prevent serious complications.';
      }
      return 'The flu vaccine helps protect you and those around you from seasonal influenza.';

    default:
      return gap.description;
  }
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [schedulingGap, setSchedulingGap] = useState<CareGap | null>(null);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);

  // Check authentication
  useEffect(() => {
    const init = async () => {
      try {
        const isAuthed = await checkAuth();
        if (!isAuthed) {
          // Redirect to home page for password-protected demo access
          navigate('/');
          return;
        }
      } catch {
        navigate('/');
        return;
      }
      setIsLoading(false);
    };
    init();
  }, [navigate]);

  // Fetch data
  const { data: patient } = useQuery<Patient>({
    queryKey: ['/api/fhir/patient'],
    enabled: !isLoading
  });

  const { data: conditions = [] } = useQuery<Condition[]>({
    queryKey: ['/api/fhir/condition'],
    enabled: !isLoading
  });

  const { data: observations = [] } = useQuery<Observation[]>({
    queryKey: ['/api/fhir/observation'],
    enabled: !isLoading
  });

  const { data: medications = [] } = useQuery<MedicationRequest[]>({
    queryKey: ['/api/fhir/medicationrequest'],
    enabled: !isLoading
  });

  const { data: allergies = [] } = useQuery<AllergyIntolerance[]>({
    queryKey: ['/api/fhir/allergyintolerance'],
    enabled: !isLoading
  });

  const { data: immunizations = [] } = useQuery<Immunization[]>({
    queryKey: ['/api/fhir/immunization'],
    enabled: !isLoading
  });

  const { data: careGaps = [] } = useQuery<CareGap[]>({
    queryKey: ['/api/fhir/care-gaps'],
    enabled: !isLoading
  });

  // Get vitals from observations
  const vitals = observations.filter(obs =>
    obs.code?.coding?.some(c =>
      ['8867-4', '8480-6', '8462-4', '8310-5', '9279-1', '59408-5', '29463-7', '8302-2'].includes(c.code || '')
    )
  );

  // Get labs from observations
  const labs = observations.filter(obs =>
    obs.code?.coding?.some(c =>
      ['2093-3', '2085-9', '2089-1', '4548-4', '2823-3', '6301-6'].includes(c.code || '')
    )
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading your health records...</p>
        </div>
      </div>
    );
  }

  const patientName = patient?.name?.[0]?.given?.join(' ') + ' ' + patient?.name?.[0]?.family || 'Demo Patient';
  const patientAge = getAge(patient?.birthDate);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-soft">
        <div className="container-app h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Exit Demo
            </Button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">SmartHealth</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {careGaps.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">
                  {careGaps.length}
                </span>
              )}
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <div className="container-app py-6">
        {/* Patient Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{patientName}</h1>
              <p className="text-muted-foreground">
                {patientAge ? `${patientAge} years old` : ''}
                {patient?.gender ? ` · ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="summary" className="data-[state=active]:bg-background">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-background">
              <Home className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="vitals" className="data-[state=active]:bg-background">
              <Activity className="w-4 h-4 mr-2" />
              Vitals
            </TabsTrigger>
            <TabsTrigger value="conditions" className="data-[state=active]:bg-background">
              <Heart className="w-4 h-4 mr-2" />
              Conditions
            </TabsTrigger>
            <TabsTrigger value="medications" className="data-[state=active]:bg-background">
              <Pill className="w-4 h-4 mr-2" />
              Medications
            </TabsTrigger>
            <TabsTrigger value="labs" className="data-[state=active]:bg-background">
              <TestTube className="w-4 h-4 mr-2" />
              Labs
            </TabsTrigger>
            <TabsTrigger value="care-gaps" className="data-[state=active]:bg-background relative">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Care Gaps
              {careGaps.filter(g => g.status === 'due').length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">{careGaps.filter(g => g.status === 'due').length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab - Executive Overview for Caregivers */}
          <TabsContent value="summary" className="animate-fade-in">
            <ExecutiveSummary
              careGaps={careGaps}
              observations={observations}
              conditions={conditions}
              medications={medications}
              patientAge={patientAge}
              onViewCareGaps={() => setActiveTab('care-gaps')}
              onSchedule={(gap) => {
                setSchedulingGap(gap);
                setShowSchedulingModal(true);
              }}
            />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 animate-fade-in">
            {/* Quick Stats */}
            <div className="grid-summary">
              <div className="card-elevated p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="category-icon-vitals">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Vitals</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">{vitals.length}</p>
                <p className="text-sm text-muted-foreground">Recent readings</p>
              </div>

              <div className="card-elevated p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="category-icon-medications">
                    <Pill className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Medications</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">{medications.length}</p>
                <p className="text-sm text-muted-foreground">Active prescriptions</p>
              </div>

              <div className="card-elevated p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="category-icon-labs">
                    <TestTube className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Lab Results</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">{labs.length}</p>
                <p className="text-sm text-muted-foreground">Test results</p>
              </div>

              <div className="card-elevated p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="category-icon-alerts">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Care Gaps</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">{careGaps.length}</p>
                <p className="text-sm text-muted-foreground">Action needed</p>
              </div>
            </div>

            {/* Care Gaps Alert */}
            {careGaps.length > 0 && (
              <div className="card-elevated p-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-start gap-4">
                  <div className="category-icon-alerts flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Preventive Care Recommendations</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You have {careGaps.length} recommended health actions to review
                    </p>
                    <div className="space-y-2">
                      {careGaps.slice(0, 3).map((gap, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <ChevronRight className="w-4 h-4 text-amber-500" />
                          <span>{gap.description || gap.category}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab('care-gaps')}>
                      View All Care Gaps
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="grid-cards">
              {/* Conditions */}
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Health Conditions</h3>
                  <Badge variant="secondary">{conditions.length}</Badge>
                </div>
                <div className="space-y-3">
                  {conditions.slice(0, 4).map((condition, i) => (
                    <div key={i} className="list-item-compact">
                      <div className="category-icon-vitals flex-shrink-0 w-8 h-8">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {condition.code?.coding?.[0]?.display || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Since {formatDate(condition.recordedDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {conditions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No conditions recorded</p>
                  )}
                </div>
                {conditions.length > 4 && (
                  <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setActiveTab('conditions')}>
                    View all {conditions.length} conditions
                  </Button>
                )}
              </div>

              {/* Medications */}
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Active Medications</h3>
                  <Badge variant="secondary">{medications.length}</Badge>
                </div>
                <div className="space-y-3">
                  {medications.slice(0, 4).map((med, i) => (
                    <div key={i} className="list-item-compact">
                      <div className="category-icon-medications flex-shrink-0 w-8 h-8">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {med.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {med.dosageInstruction?.[0]?.text || 'No dosage info'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {medications.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No medications recorded</p>
                  )}
                </div>
                {medications.length > 4 && (
                  <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setActiveTab('medications')}>
                    View all {medications.length} medications
                  </Button>
                )}
              </div>
            </div>

            {/* Allergies & Immunizations */}
            <div className="grid-cards">
              {/* Allergies */}
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Allergies</h3>
                  <Badge variant={allergies.length > 0 ? "destructive" : "secondary"}>
                    {allergies.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {allergies.slice(0, 3).map((allergy, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                      <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      <span className="text-foreground">{allergy.code?.coding?.[0]?.display || 'Unknown'}</span>
                    </div>
                  ))}
                  {allergies.length === 0 && (
                    <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-muted-foreground">No known allergies</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Immunizations */}
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Immunizations</h3>
                  <Badge variant="secondary">{immunizations.length}</Badge>
                </div>
                <div className="space-y-2">
                  {immunizations.slice(0, 3).map((imm, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Syringe className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <span className="text-foreground truncate flex-1">
                        {imm.vaccineCode?.coding?.[0]?.display || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(imm.occurrenceDateTime)}
                      </span>
                    </div>
                  ))}
                  {immunizations.length === 0 && (
                    <p className="text-sm text-muted-foreground">No immunization records</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Vitals Tab */}
          <TabsContent value="vitals" className="animate-fade-in">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Vital Signs</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Vital signs show how well your body's basic functions are working. Trends help identify changes over time.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {vitals.length > 0 ? (
                <div className="space-y-4">
                  {vitals.map((obs, i) => {
                    const trend = getObservationTrend(obs, observations);
                    const interpretation = getObservationInterpretation(obs);
                    const freshness = getDataFreshness(obs.effectiveDateTime);

                    return (
                      <div key={i} className="list-item">
                        <div className="category-icon-vitals flex-shrink-0">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {obs.code?.coding?.[0]?.display || 'Vital Sign'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              freshness.status === 'fresh' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' :
                              freshness.status === 'stale' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                              'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                            }`}>
                              {freshness.text}
                            </span>
                            {interpretation.text && (
                              <span className={`text-xs ${
                                interpretation.status === 'normal' ? 'text-emerald-600 dark:text-emerald-400' :
                                interpretation.status === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                'text-rose-600 dark:text-rose-400'
                              }`}>
                                {interpretation.text}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="text-xl font-semibold text-foreground">
                              {obs.valueQuantity?.value ?? 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {obs.valueQuantity?.unit || ''}
                            </p>
                          </div>
                          {trend && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              trend === 'up' ? 'bg-rose-100 dark:bg-rose-900' :
                              trend === 'down' ? 'bg-emerald-100 dark:bg-emerald-900' :
                              'bg-secondary'
                            }`}>
                              {trend === 'up' && <TrendingUp className="w-4 h-4 text-rose-500" />}
                              {trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-500" />}
                              {trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Activity className="w-8 h-8" />
                  </div>
                  <p className="empty-state-title">No vital signs recorded</p>
                  <p className="empty-state-description">Vital sign readings will appear here when available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Conditions Tab */}
          <TabsContent value="conditions" className="animate-fade-in">
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Health Conditions</h3>
              {conditions.length > 0 ? (
                <div className="space-y-4">
                  {conditions.map((condition, i) => (
                    <div key={i} className="list-item">
                      <div className="category-icon-vitals flex-shrink-0">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {condition.code?.coding?.[0]?.display || 'Unknown Condition'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Recorded: {formatDate(condition.recordedDate)}
                        </p>
                      </div>
                      <Badge variant={condition.clinicalStatus?.coding?.[0]?.code === 'active' ? 'default' : 'secondary'}>
                        {condition.clinicalStatus?.coding?.[0]?.code || 'unknown'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Heart className="w-8 h-8" />
                  </div>
                  <p className="empty-state-title">No conditions recorded</p>
                  <p className="empty-state-description">Health conditions will appear here when available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="animate-fade-in">
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Medications</h3>
              {medications.length > 0 ? (
                <div className="space-y-4">
                  {medications.map((med, i) => (
                    <div key={i} className="list-item">
                      <div className="category-icon-medications flex-shrink-0">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {med.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown Medication'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {med.dosageInstruction?.[0]?.text || 'No dosage information'}
                        </p>
                        {med.authoredOn && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Prescribed: {formatDate(med.authoredOn)}
                          </p>
                        )}
                      </div>
                      <Badge variant={med.status === 'active' ? 'default' : 'secondary'}>
                        {med.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Pill className="w-8 h-8" />
                  </div>
                  <p className="empty-state-title">No medications recorded</p>
                  <p className="empty-state-description">Medication information will appear here when available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Labs Tab */}
          <TabsContent value="labs" className="animate-fade-in">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Laboratory Results</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Lab tests help diagnose conditions and monitor your health. Results are compared to standard reference ranges.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {labs.length > 0 ? (
                <div className="space-y-4">
                  {labs.map((obs, i) => {
                    const trend = getObservationTrend(obs, observations);
                    const interpretation = getObservationInterpretation(obs);
                    const freshness = getDataFreshness(obs.effectiveDateTime);

                    return (
                      <div key={i} className="list-item">
                        <div className="category-icon-labs flex-shrink-0">
                          <TestTube className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {obs.code?.coding?.[0]?.display || 'Lab Test'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              freshness.status === 'fresh' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' :
                              freshness.status === 'stale' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                              'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                            }`}>
                              {freshness.text}
                            </span>
                            {interpretation.text && (
                              <span className={`text-xs ${
                                interpretation.status === 'normal' ? 'text-emerald-600 dark:text-emerald-400' :
                                interpretation.status === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                'text-rose-600 dark:text-rose-400'
                              }`}>
                                {interpretation.text}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="text-xl font-semibold text-foreground">
                              {obs.valueQuantity?.value ?? obs.valueString ?? 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {obs.valueQuantity?.unit || ''}
                            </p>
                          </div>
                          {trend && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center cursor-help ${
                                    trend === 'up' ? 'bg-amber-100 dark:bg-amber-900' :
                                    trend === 'down' ? 'bg-emerald-100 dark:bg-emerald-900' :
                                    'bg-secondary'
                                  }`}>
                                    {trend === 'up' && <TrendingUp className="w-4 h-4 text-amber-500" />}
                                    {trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-500" />}
                                    {trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {trend === 'up' && 'Increased from previous test'}
                                  {trend === 'down' && 'Decreased from previous test'}
                                  {trend === 'stable' && 'Stable compared to previous test'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <TestTube className="w-8 h-8" />
                  </div>
                  <p className="empty-state-title">No lab results recorded</p>
                  <p className="empty-state-description">Laboratory results will appear here when available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Care Gaps Tab */}
          <TabsContent value="care-gaps" className="animate-fade-in">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Preventive Care Recommendations</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>These recommendations are based on HEDIS quality measures and your health profile. Staying current on preventive care can help catch issues early.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {careGaps.length > 0 ? (
                <div className="space-y-4">
                  {careGaps
                    .sort((a, b) => {
                      // Sort by status (due first), then by urgency
                      if (a.status !== b.status) {
                        return a.status === 'due' ? -1 : 1;
                      }
                      const urgencyA = getCareGapUrgency(a);
                      const urgencyB = getCareGapUrgency(b);
                      const order = { overdue: 0, urgent: 1, soon: 2, normal: 3 };
                      return order[urgencyA.level] - order[urgencyB.level];
                    })
                    .map((gap, i) => {
                      const urgency = getCareGapUrgency(gap);
                      const personalizedContext = getPersonalizedContext(gap, conditions, patientAge);

                      return (
                        <div
                          key={i}
                          className={`p-4 rounded-xl border ${
                            urgency.level === 'overdue'
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                              : urgency.level === 'urgent'
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                              : gap.status === 'satisfied'
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                              : 'bg-secondary/30 border-border'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                              gap.status === 'satisfied'
                                ? 'bg-emerald-100 dark:bg-emerald-900'
                                : urgency.level === 'overdue'
                                ? 'bg-rose-100 dark:bg-rose-900'
                                : 'bg-amber-100 dark:bg-amber-900'
                            }`}>
                              {gap.status === 'satisfied' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <AlertTriangle className={`w-5 h-5 ${
                                  urgency.level === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-foreground">{gap.title || gap.category}</p>
                                {gap.status === 'due' && (
                                  <Badge variant={urgency.level === 'overdue' ? 'destructive' : 'secondary'} className="text-xs">
                                    {urgency.text}
                                  </Badge>
                                )}
                                {gap.status === 'satisfied' && (
                                  <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                    Complete
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{personalizedContext}</p>
                              {gap.status === 'due' && gap.recommendedAction && (
                                <p className="text-sm text-primary mt-2 font-medium">
                                  {gap.recommendedAction}
                                </p>
                              )}
                              {gap.lastPerformedDate && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  Last performed: {formatDate(gap.lastPerformedDate)}
                                </div>
                              )}
                            </div>
                            {gap.status === 'due' && (
                              <Button
                                variant={urgency.level === 'overdue' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  setSchedulingGap(gap);
                                  setShowSchedulingModal(true);
                                }}
                              >
                                <Calendar className="w-4 h-4 mr-1" />
                                Schedule
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="empty-state-title">All caught up!</p>
                  <p className="empty-state-description">No preventive care recommendations at this time</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scheduling Modal */}
      <SchedulingModal
        isOpen={showSchedulingModal}
        onClose={() => {
          setShowSchedulingModal(false);
          setSchedulingGap(null);
        }}
        careGap={schedulingGap}
        patientAge={patientAge}
        conditions={conditions.map(c => c.code?.coding?.[0]?.display || '').filter(Boolean)}
      />
    </div>
  );
}
