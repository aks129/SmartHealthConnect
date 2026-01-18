import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModeToggle } from '@/components/mode-toggle';
import { checkAuth } from '@/lib/fhir-client';
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
  ArrowLeft
} from 'lucide-react';
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

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Check authentication
  useEffect(() => {
    const init = async () => {
      try {
        const isAuthed = await checkAuth();
        if (!isAuthed) {
          // Try to connect to demo
          try {
            await fetch('/api/fhir/demo/connect', { method: 'POST' });
          } catch {
            navigate('/');
            return;
          }
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
              {careGaps.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">{careGaps.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

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
              <h3 className="font-semibold text-foreground mb-4">Vital Signs</h3>
              {vitals.length > 0 ? (
                <div className="space-y-4">
                  {vitals.map((obs, i) => (
                    <div key={i} className="list-item">
                      <div className="category-icon-vitals flex-shrink-0">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {obs.code?.coding?.[0]?.display || 'Vital Sign'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(obs.effectiveDateTime)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-foreground">
                          {obs.valueQuantity?.value ?? 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {obs.valueQuantity?.unit || ''}
                        </p>
                      </div>
                    </div>
                  ))}
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
              <h3 className="font-semibold text-foreground mb-4">Laboratory Results</h3>
              {labs.length > 0 ? (
                <div className="space-y-4">
                  {labs.map((obs, i) => (
                    <div key={i} className="list-item">
                      <div className="category-icon-labs flex-shrink-0">
                        <TestTube className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {obs.code?.coding?.[0]?.display || 'Lab Test'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(obs.effectiveDateTime)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-foreground">
                          {obs.valueQuantity?.value ?? obs.valueString ?? 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {obs.valueQuantity?.unit || ''}
                        </p>
                      </div>
                    </div>
                  ))}
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
              <h3 className="font-semibold text-foreground mb-4">Preventive Care Recommendations</h3>
              {careGaps.length > 0 ? (
                <div className="space-y-4">
                  {careGaps.map((gap, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-3">
                        <div className="category-icon-alerts flex-shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{gap.category || 'Preventive Care'}</p>
                          <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
                          {gap.recommendedAction && (
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                              Recommendation: {gap.recommendedAction}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm">Schedule</Button>
                      </div>
                    </div>
                  ))}
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
    </div>
  );
}
