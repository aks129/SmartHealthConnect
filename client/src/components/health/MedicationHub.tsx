import { useState, useMemo } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pill,
  AlertTriangle,
  Clock,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  DollarSign,
  Info,
  ExternalLink,
  Shield,
  Zap,
  Heart,
  Calendar,
  Bell,
  TrendingUp,
  Package,
  FileText,
  ChevronRight,
  AlertCircle,
  Beaker
} from 'lucide-react';
import { MedicationRequest, Condition, AllergyIntolerance } from '@shared/schema';

interface MedicationHubProps {
  medications: MedicationRequest[];
  conditions?: Condition[];
  allergies?: AllergyIntolerance[];
}

// Drug interaction database (simplified mock)
const DRUG_INTERACTIONS: Record<string, { interactsWith: string[]; severity: 'major' | 'moderate' | 'minor'; description: string }[]> = {
  'metformin': [
    { interactsWith: ['alcohol'], severity: 'moderate', description: 'Alcohol increases risk of lactic acidosis' },
    { interactsWith: ['contrast dye'], severity: 'major', description: 'Stop 48 hours before contrast imaging procedures' }
  ],
  'lisinopril': [
    { interactsWith: ['potassium supplements', 'spironolactone'], severity: 'moderate', description: 'May cause hyperkalemia' },
    { interactsWith: ['nsaids', 'ibuprofen', 'naproxen'], severity: 'moderate', description: 'NSAIDs may reduce effectiveness and increase kidney risk' }
  ],
  'atorvastatin': [
    { interactsWith: ['grapefruit'], severity: 'moderate', description: 'Grapefruit increases statin levels, risk of muscle damage' },
    { interactsWith: ['clarithromycin', 'erythromycin'], severity: 'major', description: 'Significant increase in statin toxicity risk' }
  ],
  'warfarin': [
    { interactsWith: ['aspirin', 'ibuprofen'], severity: 'major', description: 'Increased bleeding risk' },
    { interactsWith: ['vitamin k'], severity: 'moderate', description: 'Vitamin K reduces warfarin effectiveness' }
  ],
  'amlodipine': [
    { interactsWith: ['simvastatin'], severity: 'moderate', description: 'Increased simvastatin levels' }
  ]
};

// Therapeutic alternatives (simplified mock)
const THERAPEUTIC_ALTERNATIVES: Record<string, { name: string; class: string; notes: string; costTier: 'low' | 'medium' | 'high' }[]> = {
  'metformin': [
    { name: 'Metformin ER (extended release)', class: 'Biguanide', notes: 'Less GI side effects', costTier: 'low' }
  ],
  'lisinopril': [
    { name: 'Enalapril', class: 'ACE Inhibitor', notes: 'Alternative ACE inhibitor', costTier: 'low' },
    { name: 'Losartan', class: 'ARB', notes: 'ARB alternative if ACE cough occurs', costTier: 'low' }
  ],
  'atorvastatin': [
    { name: 'Rosuvastatin', class: 'Statin', notes: 'More potent per mg', costTier: 'medium' },
    { name: 'Simvastatin', class: 'Statin', notes: 'Lower cost option', costTier: 'low' }
  ]
};

// Adherence tips based on medication type
const ADHERENCE_TIPS: Record<string, string[]> = {
  'default': [
    'Take at the same time each day',
    'Use a pill organizer',
    'Set phone reminders',
    'Keep medications visible (not in a drawer)'
  ],
  'statin': [
    'Take in the evening for best effect',
    'Avoid grapefruit juice',
    'Report muscle pain or weakness'
  ],
  'metformin': [
    'Take with food to reduce stomach upset',
    'Stay hydrated',
    'Monitor for signs of B12 deficiency over time'
  ],
  'blood-pressure': [
    'Monitor blood pressure regularly',
    'Rise slowly to avoid dizziness',
    'Limit salt intake for best results'
  ]
};

// Mock refill schedule
interface RefillSchedule {
  medicationId: string;
  lastRefill: string;
  daysSupply: number;
  refillsRemaining: number;
  pharmacy: string;
  autoRefillEnabled: boolean;
}

function getMedicationCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('statin') || lower.includes('atorvastatin') || lower.includes('simvastatin')) return 'statin';
  if (lower.includes('metformin')) return 'metformin';
  if (lower.includes('lisinopril') || lower.includes('losartan') || lower.includes('amlodipine')) return 'blood-pressure';
  return 'default';
}

function checkInteractions(medications: MedicationRequest[]): Array<{
  med1: string;
  med2: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
}> {
  const interactions: Array<{
    med1: string;
    med2: string;
    severity: 'major' | 'moderate' | 'minor';
    description: string;
  }> = [];

  const medNames = medications.map(m =>
    m.medicationCodeableConcept?.coding?.[0]?.display?.toLowerCase() || ''
  );

  medNames.forEach((name, i) => {
    const drugKey = Object.keys(DRUG_INTERACTIONS).find(k => name.includes(k));
    if (!drugKey) return;

    DRUG_INTERACTIONS[drugKey].forEach(interaction => {
      const interactingMed = medNames.find((other, j) =>
        j !== i && interaction.interactsWith.some(int => other.includes(int))
      );

      if (interactingMed) {
        // Avoid duplicates
        if (!interactions.some(existing =>
          (existing.med1 === name && existing.med2 === interactingMed) ||
          (existing.med1 === interactingMed && existing.med2 === name)
        )) {
          interactions.push({
            med1: medications[i].medicationCodeableConcept?.coding?.[0]?.display || name,
            med2: interactingMed,
            severity: interaction.severity,
            description: interaction.description
          });
        }
      }
    });
  });

  return interactions;
}

export function MedicationHub({ medications, conditions, allergies }: MedicationHubProps) {
  const [selectedMed, setSelectedMed] = useState<MedicationRequest | null>(null);
  const [showInteractionAlert, setShowInteractionAlert] = useState(false);
  const [activeTab, setActiveTab] = useState('medications');

  // Mock refill schedules
  const refillSchedules: RefillSchedule[] = useMemo(() =>
    medications.map((med, i) => ({
      medicationId: med.id || `med-${i}`,
      lastRefill: addDays(new Date(), -(Math.random() * 20 + 5)).toISOString(),
      daysSupply: 30,
      refillsRemaining: Math.floor(Math.random() * 5) + 1,
      pharmacy: ['CVS Pharmacy', 'Walgreens', 'Rite Aid', 'Local Pharmacy'][i % 4],
      autoRefillEnabled: Math.random() > 0.5
    })),
    [medications]
  );

  // Check for drug interactions
  const interactions = useMemo(() => checkInteractions(medications), [medications]);
  const majorInteractions = interactions.filter(i => i.severity === 'major');

  // Calculate days until refill needed
  const getRefillStatus = (schedule: RefillSchedule) => {
    const daysSinceRefill = differenceInDays(new Date(), new Date(schedule.lastRefill));
    const daysRemaining = schedule.daysSupply - daysSinceRefill;

    if (daysRemaining <= 0) return { status: 'overdue', text: 'Refill needed now', color: 'text-rose-500' };
    if (daysRemaining <= 7) return { status: 'soon', text: `${daysRemaining} days remaining`, color: 'text-amber-500' };
    return { status: 'ok', text: `${daysRemaining} days remaining`, color: 'text-emerald-500' };
  };

  // Calculate adherence score (mock)
  const adherenceScore = 87;

  return (
    <div className="space-y-6">
      {/* Interaction Alert Banner */}
      {majorInteractions.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-rose-700 dark:text-rose-300">
                  {majorInteractions.length} Major Drug Interaction{majorInteractions.length > 1 ? 's' : ''} Detected
                </h3>
                <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
                  Please discuss these with your healthcare provider
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-rose-300 text-rose-700 hover:bg-rose-100"
                  onClick={() => setShowInteractionAlert(true)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Pill className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{medications.length}</p>
            <p className="text-xs text-muted-foreground">Active Medications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-2xl font-bold">{adherenceScore}%</p>
            <p className="text-xs text-muted-foreground">Adherence Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <RefreshCcw className="w-8 h-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">
              {refillSchedules.filter(s => getRefillStatus(s).status === 'soon' || getRefillStatus(s).status === 'overdue').length}
            </p>
            <p className="text-xs text-muted-foreground">Refills Due Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
            <p className="text-2xl font-bold">{interactions.length}</p>
            <p className="text-xs text-muted-foreground">Interactions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="medications">My Medications</TabsTrigger>
          <TabsTrigger value="refills">Refill Schedule</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="adherence">Adherence</TabsTrigger>
        </TabsList>

        <TabsContent value="medications" className="mt-4 space-y-3">
          {medications.map((med, i) => {
            const name = med.medicationCodeableConcept?.coding?.[0]?.display || 'Medication';
            const dosage = med.dosageInstruction?.[0]?.text;
            const hasInteraction = interactions.some(int =>
              int.med1.toLowerCase().includes(name.toLowerCase()) ||
              int.med2.toLowerCase().includes(name.toLowerCase())
            );
            const schedule = refillSchedules[i];
            const refillStatus = getRefillStatus(schedule);

            return (
              <Card
                key={med.id || i}
                className={`cursor-pointer hover:border-primary/50 transition-colors ${
                  hasInteraction ? 'border-amber-200 dark:border-amber-800' : ''
                }`}
                onClick={() => setSelectedMed(med)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{name}</h3>
                          {hasInteraction && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Has drug interactions
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {dosage && (
                          <p className="text-sm text-muted-foreground">{dosage}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant={med.status === 'active' ? 'default' : 'secondary'}>
                            {med.status}
                          </Badge>
                          <span className={`text-xs flex items-center gap-1 ${refillStatus.color}`}>
                            <Clock className="w-3 h-3" />
                            {refillStatus.text}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="refills" className="mt-4 space-y-3">
          {refillSchedules.map((schedule, i) => {
            const med = medications[i];
            const name = med?.medicationCodeableConcept?.coding?.[0]?.display || 'Medication';
            const status = getRefillStatus(schedule);

            return (
              <Card key={schedule.medicationId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{name}</h3>
                      <p className="text-sm text-muted-foreground">{schedule.pharmacy}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${status.color}`}>{status.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.refillsRemaining} refills remaining
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {schedule.autoRefillEnabled ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Auto-refill on
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="w-3 h-3 mr-1" />
                          Auto-refill off
                        </Badge>
                      )}
                    </div>
                    {(status.status === 'soon' || status.status === 'overdue') && (
                      <Button size="sm">
                        <RefreshCcw className="w-4 h-4 mr-1" />
                        Request Refill
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="interactions" className="mt-4 space-y-3">
          {interactions.length > 0 ? (
            interactions.map((interaction, i) => (
              <Card
                key={i}
                className={`${
                  interaction.severity === 'major'
                    ? 'border-rose-200 dark:border-rose-800'
                    : interaction.severity === 'moderate'
                    ? 'border-amber-200 dark:border-amber-800'
                    : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                      interaction.severity === 'major' ? 'text-rose-500' :
                      interaction.severity === 'moderate' ? 'text-amber-500' :
                      'text-muted-foreground'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{interaction.med1}</h3>
                        <Zap className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium">{interaction.med2}</h3>
                        <Badge variant={
                          interaction.severity === 'major' ? 'destructive' :
                          interaction.severity === 'moderate' ? 'secondary' : 'outline'
                        }>
                          {interaction.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{interaction.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-medium">No Interactions Detected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your current medications don't have known interactions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="adherence" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="relative inline-flex items-center justify-center w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-secondary"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${adherenceScore * 3.52} 352`}
                      className={adherenceScore >= 80 ? 'text-emerald-500' : adherenceScore >= 60 ? 'text-amber-500' : 'text-rose-500'}
                    />
                  </svg>
                  <span className="absolute text-3xl font-bold">{adherenceScore}%</span>
                </div>
                <h3 className="font-medium mt-4">Medication Adherence Score</h3>
                <p className="text-sm text-muted-foreground">
                  {adherenceScore >= 80 ? 'Excellent! Keep it up!' :
                   adherenceScore >= 60 ? 'Good, but there\'s room for improvement' :
                   'Needs attention - let\'s work on this together'}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Tips to Improve Adherence</h4>
                {ADHERENCE_TIPS['default'].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Medication Detail Dialog */}
      <Dialog open={!!selectedMed} onOpenChange={() => setSelectedMed(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedMed && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  {selectedMed.medicationCodeableConcept?.coding?.[0]?.display}
                </DialogTitle>
                <DialogDescription>
                  {selectedMed.dosageInstruction?.[0]?.text || 'Medication details'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Medication info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge>{selectedMed.status}</Badge>
                  </div>
                  {selectedMed.authoredOn && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prescribed</span>
                      <span>{format(new Date(selectedMed.authoredOn), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>

                {/* Adherence tips specific to this med */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Tips for This Medication
                  </h4>
                  <ul className="space-y-1">
                    {(ADHERENCE_TIPS[getMedicationCategory(selectedMed.medicationCodeableConcept?.coding?.[0]?.display || '')] || ADHERENCE_TIPS['default']).map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-1 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Therapeutic alternatives */}
                {(() => {
                  const name = selectedMed.medicationCodeableConcept?.coding?.[0]?.display?.toLowerCase() || '';
                  const altKey = Object.keys(THERAPEUTIC_ALTERNATIVES).find(k => name.includes(k));
                  const alternatives = altKey ? THERAPEUTIC_ALTERNATIVES[altKey] : [];

                  if (alternatives.length === 0) return null;

                  return (
                    <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-800">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Beaker className="w-4 h-4 text-sky-500" />
                        Therapeutic Alternatives
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Discuss with your doctor if interested in alternatives
                      </p>
                      <div className="space-y-2">
                        {alternatives.map((alt, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium">{alt.name}</span>
                              <span className="text-muted-foreground ml-2">({alt.class})</span>
                            </div>
                            <Badge variant="outline" className={
                              alt.costTier === 'low' ? 'text-emerald-600 border-emerald-200' :
                              alt.costTier === 'medium' ? 'text-amber-600 border-amber-200' :
                              'text-rose-600 border-rose-200'
                            }>
                              <DollarSign className="w-3 h-3 mr-1" />
                              {alt.costTier}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button className="flex-1">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Request Refill
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`https://medlineplus.gov/druginfo/meds/a${Math.random().toString().slice(2, 8)}.html`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Drug Info
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Interaction Alert Dialog */}
      <AlertDialog open={showInteractionAlert} onOpenChange={setShowInteractionAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              Major Drug Interactions
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>The following major interactions were detected in your medication list:</p>
                {majorInteractions.map((interaction, i) => (
                  <div key={i} className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800">
                    <p className="font-medium text-rose-700 dark:text-rose-300">
                      {interaction.med1} + {interaction.med2}
                    </p>
                    <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
                      {interaction.description}
                    </p>
                  </div>
                ))}
                <p className="text-sm">
                  <strong>Important:</strong> Do not stop taking any medications without consulting your healthcare provider. These interactions should be discussed at your next visit or sooner if you have concerns.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction>Contact My Doctor</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
