import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FlaskConical,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Star,
  Filter,
  Search,
  Building2,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  Pill,
  Activity,
  Heart,
  Brain,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Condition, MedicationRequest } from '@shared/schema';
import { useClinicalTrials, type ClinicalTrial as APIClinicalTrial } from '@/hooks/use-external-apis';

interface ClinicalTrialsMatcherProps {
  conditions?: Condition[];
  medications?: MedicationRequest[];
  patientAge?: number | null;
  patientGender?: string;
}

// Sample clinical trials database - in production would connect to clinicaltrials.gov API
interface ClinicalTrial {
  id: string;
  nctId: string;
  title: string;
  shortTitle: string;
  sponsor: string;
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4' | 'Not Applicable';
  status: 'Recruiting' | 'Active, not recruiting' | 'Enrolling by invitation' | 'Completed';
  conditions: string[];
  interventions: { type: string; name: string }[];
  eligibility: {
    minAge: number;
    maxAge: number;
    gender: 'All' | 'Male' | 'Female';
    criteria: string[];
    exclusions: string[];
  };
  locations: { facility: string; city: string; state: string; distance?: number }[];
  startDate: string;
  estimatedCompletion: string;
  enrollment: number;
  description: string;
  whyItMatters: string;
  matchScore?: number;
  matchReasons?: string[];
}

// Condition code to search term mapping
const CONDITION_SEARCH_TERMS: Record<string, string[]> = {
  '38341003': ['hypertension', 'high blood pressure', 'cardiovascular'],
  '44054006': ['diabetes mellitus', 'type 2 diabetes', 'diabetes'],
  '195967001': ['asthma', 'respiratory'],
  '13645005': ['chronic obstructive pulmonary disease', 'copd'],
  '698754002': ['chronic kidney disease', 'ckd', 'renal'],
  '49601007': ['cardiovascular disease', 'heart disease'],
  '73211009': ['diabetes mellitus', 'diabetes'],
};

// Sample trials database
const SAMPLE_TRIALS: ClinicalTrial[] = [
  {
    id: 'trial-1',
    nctId: 'NCT05123456',
    title: 'A Randomized, Double-Blind Study of Novel GLP-1 Receptor Agonist for Type 2 Diabetes Management',
    shortTitle: 'ADVANCE-DM: New GLP-1 Therapy for Diabetes',
    sponsor: 'Novo Nordisk',
    phase: 'Phase 3',
    status: 'Recruiting',
    conditions: ['Type 2 Diabetes', 'Obesity'],
    interventions: [
      { type: 'Drug', name: 'Semaglutide 2.0mg (experimental dose)' },
      { type: 'Drug', name: 'Placebo' }
    ],
    eligibility: {
      minAge: 18,
      maxAge: 75,
      gender: 'All',
      criteria: [
        'Diagnosed with Type 2 Diabetes for at least 6 months',
        'HbA1c between 7.0% and 10.5%',
        'BMI ≥ 27 kg/m²',
        'Stable metformin dose for at least 3 months'
      ],
      exclusions: [
        'History of pancreatitis',
        'Severe kidney disease (eGFR < 30)',
        'Currently using insulin'
      ]
    },
    locations: [
      { facility: 'UCSF Medical Center', city: 'San Francisco', state: 'CA', distance: 12 },
      { facility: 'Stanford Health Care', city: 'Palo Alto', state: 'CA', distance: 25 },
      { facility: 'UCLA Medical Center', city: 'Los Angeles', state: 'CA', distance: 380 }
    ],
    startDate: '2024-01-15',
    estimatedCompletion: '2026-06-30',
    enrollment: 2500,
    description: 'This study evaluates whether a higher dose of semaglutide can provide better blood sugar control and weight loss compared to current standard doses.',
    whyItMatters: 'Access to a potentially more effective treatment before it\'s widely available. Free study medication and regular monitoring included.'
  },
  {
    id: 'trial-2',
    nctId: 'NCT05234567',
    title: 'PATHWAY-HTN: Personalized Approach to Hypertension Treatment',
    shortTitle: 'AI-Guided Blood Pressure Management',
    sponsor: 'National Institutes of Health',
    phase: 'Phase 3',
    status: 'Recruiting',
    conditions: ['Hypertension', 'High Blood Pressure'],
    interventions: [
      { type: 'Behavioral', name: 'AI-powered medication optimization' },
      { type: 'Drug', name: 'Standard antihypertensive therapy' }
    ],
    eligibility: {
      minAge: 30,
      maxAge: 80,
      gender: 'All',
      criteria: [
        'Diagnosed with hypertension',
        'Currently taking at least one blood pressure medication',
        'Blood pressure not at goal (>130/80 mmHg)',
        'Access to smartphone or tablet'
      ],
      exclusions: [
        'Secondary hypertension',
        'Recent heart attack or stroke (within 6 months)',
        'Pregnancy or planning pregnancy'
      ]
    },
    locations: [
      { facility: 'Johns Hopkins Medicine', city: 'Baltimore', state: 'MD', distance: 2800 },
      { facility: 'Mayo Clinic', city: 'Rochester', state: 'MN', distance: 2000 },
      { facility: 'Kaiser Permanente', city: 'Oakland', state: 'CA', distance: 8 }
    ],
    startDate: '2024-03-01',
    estimatedCompletion: '2025-12-31',
    enrollment: 5000,
    description: 'Using artificial intelligence to personalize blood pressure medication selection and dosing based on individual patient characteristics.',
    whyItMatters: 'Potential for faster blood pressure control with fewer side effects through personalized medication selection.'
  },
  {
    id: 'trial-3',
    nctId: 'NCT05345678',
    title: 'RETINA-PROTECT: Early Intervention for Diabetic Retinopathy Prevention',
    shortTitle: 'Preventing Diabetic Eye Disease',
    sponsor: 'Regeneron Pharmaceuticals',
    phase: 'Phase 2',
    status: 'Recruiting',
    conditions: ['Diabetic Retinopathy', 'Type 2 Diabetes'],
    interventions: [
      { type: 'Drug', name: 'Aflibercept (Eylea) preventive injection' },
      { type: 'Other', name: 'Standard monitoring' }
    ],
    eligibility: {
      minAge: 40,
      maxAge: 70,
      gender: 'All',
      criteria: [
        'Type 2 Diabetes for 5+ years',
        'Mild or no diabetic retinopathy',
        'Willing to receive eye injections'
      ],
      exclusions: [
        'Advanced diabetic retinopathy',
        'Previous eye surgery',
        'Uncontrolled glaucoma'
      ]
    },
    locations: [
      { facility: 'Wills Eye Hospital', city: 'Philadelphia', state: 'PA', distance: 2900 },
      { facility: 'Bascom Palmer Eye Institute', city: 'Miami', state: 'FL', distance: 3200 }
    ],
    startDate: '2024-02-15',
    estimatedCompletion: '2027-02-15',
    enrollment: 1200,
    description: 'Testing whether early preventive treatment can stop diabetic eye disease before it causes vision loss.',
    whyItMatters: 'Could prevent blindness by treating diabetic eye disease before symptoms appear.'
  },
  {
    id: 'trial-4',
    nctId: 'NCT05456789',
    title: 'CARDIO-METABOLIC: Combined Treatment for Diabetes and Heart Disease Risk',
    shortTitle: 'Heart Protection for Diabetics',
    sponsor: 'Eli Lilly',
    phase: 'Phase 3',
    status: 'Enrolling by invitation',
    conditions: ['Type 2 Diabetes', 'Cardiovascular Risk'],
    interventions: [
      { type: 'Drug', name: 'Tirzepatide + low-dose statin combination' },
      { type: 'Drug', name: 'Standard diabetes care' }
    ],
    eligibility: {
      minAge: 45,
      maxAge: 75,
      gender: 'All',
      criteria: [
        'Type 2 Diabetes',
        'High cardiovascular risk score',
        'Not currently on GLP-1 therapy'
      ],
      exclusions: [
        'Previous heart attack or stroke',
        'Liver disease',
        'Statin intolerance'
      ]
    },
    locations: [
      { facility: 'Cleveland Clinic', city: 'Cleveland', state: 'OH', distance: 2400 },
      { facility: 'Mount Sinai', city: 'New York', state: 'NY', distance: 2900 }
    ],
    startDate: '2024-04-01',
    estimatedCompletion: '2028-04-01',
    enrollment: 8000,
    description: 'Evaluating a combination approach to reduce both blood sugar and heart disease risk in diabetic patients.',
    whyItMatters: 'May significantly reduce heart attack and stroke risk while improving diabetes control.'
  },
  {
    id: 'trial-5',
    nctId: 'NCT05567890',
    title: 'SMART-BP: Smartphone App for Blood Pressure Self-Management',
    shortTitle: 'App-Based BP Management',
    sponsor: 'American Heart Association',
    phase: 'Not Applicable',
    status: 'Recruiting',
    conditions: ['Hypertension'],
    interventions: [
      { type: 'Behavioral', name: 'SMART-BP mobile app with coaching' },
      { type: 'Behavioral', name: 'Standard care with BP log' }
    ],
    eligibility: {
      minAge: 21,
      maxAge: 85,
      gender: 'All',
      criteria: [
        'Diagnosed with hypertension',
        'Own a smartphone',
        'Willing to use a health app daily'
      ],
      exclusions: [
        'Unable to use mobile apps',
        'Participating in another BP study'
      ]
    },
    locations: [
      { facility: 'Duke University', city: 'Durham', state: 'NC', distance: 2700 },
      { facility: 'Emory University', city: 'Atlanta', state: 'GA', distance: 2500 },
      { facility: 'UCSD Health', city: 'San Diego', state: 'CA', distance: 120 }
    ],
    startDate: '2024-01-01',
    estimatedCompletion: '2025-06-30',
    enrollment: 1000,
    description: 'Testing whether a smartphone app with personalized coaching can help people better manage their blood pressure.',
    whyItMatters: 'Low-risk way to potentially improve blood pressure control using technology you already have.'
  }
];

// New treatments and therapies information
interface NewTreatment {
  id: string;
  name: string;
  genericName?: string;
  type: 'medication' | 'device' | 'procedure' | 'therapy';
  approvalStatus: 'FDA Approved' | 'Breakthrough Therapy' | 'Fast Track' | 'Recently Approved';
  approvalDate?: string;
  conditions: string[];
  description: string;
  keyBenefits: string[];
  considerations: string[];
  talkToDoctor: string[];
}

const NEW_TREATMENTS: NewTreatment[] = [
  {
    id: 'treatment-1',
    name: 'Mounjaro (Tirzepatide)',
    genericName: 'tirzepatide',
    type: 'medication',
    approvalStatus: 'FDA Approved',
    approvalDate: '2022-05',
    conditions: ['Type 2 Diabetes', 'Obesity'],
    description: 'A dual GIP/GLP-1 receptor agonist that helps control blood sugar and promotes significant weight loss.',
    keyBenefits: [
      'Average A1c reduction of 2.0-2.3%',
      'Average weight loss of 15-22%',
      'Once-weekly injection',
      'May reduce cardiovascular risk'
    ],
    considerations: [
      'Requires injection',
      'Can cause nausea initially',
      'Expensive without insurance',
      'Not for Type 1 diabetes'
    ],
    talkToDoctor: [
      'Is this appropriate for my diabetes management?',
      'What is my insurance coverage for this medication?',
      'What side effects should I watch for?'
    ]
  },
  {
    id: 'treatment-2',
    name: 'Continuous Glucose Monitors (CGM)',
    type: 'device',
    approvalStatus: 'FDA Approved',
    conditions: ['Type 2 Diabetes', 'Type 1 Diabetes'],
    description: 'Wearable sensors that continuously measure glucose levels, reducing the need for finger sticks.',
    keyBenefits: [
      'Real-time glucose readings every 5 minutes',
      'Alerts for high and low blood sugar',
      'Track patterns and trends',
      'Share data with care team',
      'No routine finger sticks needed'
    ],
    considerations: [
      'Sensor needs replacement every 10-14 days',
      'May require smartphone or receiver',
      'Insurance coverage varies',
      'Skin irritation possible at sensor site'
    ],
    talkToDoctor: [
      'Am I a candidate for CGM?',
      'Which CGM brand is best for me?',
      'Will my insurance cover this device?'
    ]
  },
  {
    id: 'treatment-3',
    name: 'Renal Denervation',
    type: 'procedure',
    approvalStatus: 'FDA Approved',
    approvalDate: '2023-11',
    conditions: ['Resistant Hypertension'],
    description: 'A minimally invasive procedure that uses radiofrequency energy to reduce overactive kidney nerves that contribute to high blood pressure.',
    keyBenefits: [
      'Can lower BP when medications don\'t work',
      'One-time procedure',
      'Minimally invasive (catheter-based)',
      'May reduce medication needs'
    ],
    considerations: [
      'Only for resistant hypertension',
      'Requires catheterization procedure',
      'Long-term data still emerging',
      'Not all patients respond'
    ],
    talkToDoctor: [
      'Have I tried enough medications to qualify?',
      'What are the risks of the procedure?',
      'Is this available at my hospital?'
    ]
  },
  {
    id: 'treatment-4',
    name: 'SGLT2 Inhibitors for Heart/Kidney Protection',
    genericName: 'empagliflozin, dapagliflozin',
    type: 'medication',
    approvalStatus: 'FDA Approved',
    conditions: ['Type 2 Diabetes', 'Heart Failure', 'Chronic Kidney Disease'],
    description: 'Originally diabetes medications, now proven to protect heart and kidneys even in people without diabetes.',
    keyBenefits: [
      'Reduces heart failure hospitalizations by 25-30%',
      'Slows kidney disease progression',
      'Modest blood pressure reduction',
      'Weight loss benefit',
      'Once daily pill'
    ],
    considerations: [
      'Risk of urinary/genital infections',
      'Rare risk of diabetic ketoacidosis',
      'May need dose adjustment for kidney function',
      'Can cause dehydration'
    ],
    talkToDoctor: [
      'Could this medication benefit my heart or kidneys?',
      'Am I at risk for the side effects?',
      'How does this interact with my other medications?'
    ]
  }
];

export function ClinicalTrialsMatcher({
  conditions = [],
  medications = [],
  patientAge,
  patientGender
}: ClinicalTrialsMatcherProps) {
  const [activeTab, setActiveTab] = useState('trials');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [selectedTrial, setSelectedTrial] = useState<ClinicalTrial | null>(null);
  const [useRealApi, setUseRealApi] = useState(true);

  // Extract patient condition codes and text for API search
  const conditionSearchTerms = useMemo(() => {
    const terms: string[] = [];
    conditions.forEach(condition => {
      const text = condition.code?.text ||
        condition.code?.coding?.[0]?.display || '';
      if (text) terms.push(text);

      const code = condition.code?.coding?.[0]?.code;
      if (code && CONDITION_SEARCH_TERMS[code]) {
        terms.push(CONDITION_SEARCH_TERMS[code][0]);
      }
    });
    return Array.from(new Set(terms)).slice(0, 3); // Limit to top 3 conditions
  }, [conditions]);

  // Fetch real clinical trials data from API
  const {
    data: apiTrialsData,
    isLoading: isLoadingTrials,
    isError: isApiError,
    refetch: refetchTrials
  } = useClinicalTrials({
    conditions: conditionSearchTerms,
    status: ['RECRUITING', 'ACTIVE_NOT_RECRUITING'],
    pageSize: 20,
    enabled: useRealApi && conditionSearchTerms.length > 0
  });

  // Extract patient condition codes and text for matching
  const patientConditions = useMemo(() => {
    const conditionTerms: string[] = [];
    conditions.forEach(condition => {
      // Get condition text
      const text = condition.code?.text ||
        condition.code?.coding?.[0]?.display || '';
      if (text) conditionTerms.push(text.toLowerCase());

      // Get condition codes for matching
      const code = condition.code?.coding?.[0]?.code;
      if (code && CONDITION_SEARCH_TERMS[code]) {
        conditionTerms.push(...CONDITION_SEARCH_TERMS[code]);
      }
    });
    return Array.from(new Set(conditionTerms));
  }, [conditions]);

  // Transform API trials to our internal format
  const apiTrials = useMemo((): ClinicalTrial[] => {
    if (!apiTrialsData?.trials) return [];

    return apiTrialsData.trials.map((trial, index): ClinicalTrial => ({
      id: `api-${trial.nctId}`,
      nctId: trial.nctId,
      title: trial.officialTitle || trial.briefTitle,
      shortTitle: trial.briefTitle,
      sponsor: trial.sponsor,
      phase: (trial.phase?.includes('3') ? 'Phase 3' :
              trial.phase?.includes('2') ? 'Phase 2' :
              trial.phase?.includes('1') ? 'Phase 1' :
              trial.phase?.includes('4') ? 'Phase 4' : 'Not Applicable') as ClinicalTrial['phase'],
      status: (trial.status === 'RECRUITING' ? 'Recruiting' :
               trial.status === 'ACTIVE_NOT_RECRUITING' ? 'Active, not recruiting' :
               trial.status === 'ENROLLING_BY_INVITATION' ? 'Enrolling by invitation' :
               'Recruiting') as ClinicalTrial['status'],
      conditions: trial.conditions,
      interventions: trial.interventions.map(i => ({ type: i.type, name: i.name })),
      eligibility: {
        minAge: parseInt(trial.eligibility.minAge) || 18,
        maxAge: parseInt(trial.eligibility.maxAge) || 99,
        gender: (trial.eligibility.sex === 'MALE' ? 'Male' :
                 trial.eligibility.sex === 'FEMALE' ? 'Female' : 'All') as ClinicalTrial['eligibility']['gender'],
        criteria: trial.eligibility.criteria.split('\n').filter(c => c.includes('Inclusion')).slice(0, 5),
        exclusions: trial.eligibility.criteria.split('\n').filter(c => c.includes('Exclusion')).slice(0, 3)
      },
      locations: trial.locations.slice(0, 5).map(l => ({
        facility: l.facility,
        city: l.city,
        state: l.state,
        distance: undefined
      })),
      startDate: trial.startDate,
      estimatedCompletion: trial.completionDate,
      enrollment: trial.enrollmentCount,
      description: trial.description,
      whyItMatters: `Access to potentially new treatments for ${trial.conditions[0] || 'your condition'}. Contact the study team for more information.`
    }));
  }, [apiTrialsData]);

  // Match and score trials based on patient data
  // Use API trials if available and enabled, otherwise fallback to sample data
  const trialsToScore = useRealApi && apiTrials.length > 0 ? apiTrials : SAMPLE_TRIALS;

  const matchedTrials = useMemo(() => {
    return trialsToScore.map(trial => {
      let score = 0;
      const matchReasons: string[] = [];

      // Check condition match
      const trialConditions = trial.conditions.map(c => c.toLowerCase());
      patientConditions.forEach(pc => {
        if (trialConditions.some(tc => tc.includes(pc) || pc.includes(tc))) {
          score += 30;
          matchReasons.push(`Matches your condition: ${trial.conditions.find(c =>
            c.toLowerCase().includes(pc) || pc.includes(c.toLowerCase())
          )}`);
        }
      });

      // Check age eligibility
      if (patientAge) {
        if (patientAge >= trial.eligibility.minAge && patientAge <= trial.eligibility.maxAge) {
          score += 20;
          matchReasons.push('Age eligible');
        } else {
          score -= 50; // Significant penalty for age ineligibility
        }
      }

      // Check gender eligibility
      if (patientGender && trial.eligibility.gender !== 'All') {
        if (trial.eligibility.gender.toLowerCase() === patientGender.toLowerCase()) {
          score += 10;
        } else {
          score -= 50;
        }
      }

      // Check recruiting status
      if (trial.status === 'Recruiting') {
        score += 15;
        matchReasons.push('Currently recruiting');
      }

      // Check location proximity (using mock distance)
      const nearestLocation = trial.locations.reduce((nearest, loc) =>
        (loc.distance || 9999) < (nearest.distance || 9999) ? loc : nearest
      , trial.locations[0]);

      if (nearestLocation.distance && nearestLocation.distance < 50) {
        score += 15;
        matchReasons.push(`Nearby location: ${nearestLocation.city}, ${nearestLocation.state}`);
      }

      // Phase preference (Phase 3 typically has more data)
      if (trial.phase === 'Phase 3') {
        score += 10;
      }

      return {
        ...trial,
        matchScore: Math.max(0, Math.min(100, score)),
        matchReasons: Array.from(new Set(matchReasons))
      };
    }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [trialsToScore, patientConditions, patientAge, patientGender]);

  // Filter trials based on search and phase
  const filteredTrials = useMemo(() => {
    return matchedTrials.filter(trial => {
      const matchesSearch = searchTerm === '' ||
        trial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trial.shortTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trial.conditions.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPhase = filterPhase === 'all' || trial.phase === filterPhase;

      return matchesSearch && matchesPhase;
    });
  }, [matchedTrials, searchTerm, filterPhase]);

  // Filter new treatments based on patient conditions
  const relevantTreatments = useMemo(() => {
    return NEW_TREATMENTS.filter(treatment => {
      return treatment.conditions.some(tc =>
        patientConditions.some(pc =>
          tc.toLowerCase().includes(pc) || pc.includes(tc.toLowerCase())
        )
      );
    });
  }, [patientConditions]);

  const getMatchScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-secondary';
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Phase 3': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Phase 2': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Phase 1': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Recruiting': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Enrolling by invitation': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getTreatmentIcon = (type: string) => {
    switch (type) {
      case 'medication': return Pill;
      case 'device': return Activity;
      case 'procedure': return Heart;
      case 'therapy': return Brain;
      default: return Sparkles;
    }
  };

  // Determine data source
  const isUsingLiveData = useRealApi && apiTrials.length > 0;
  const totalApiTrials = apiTrialsData?.totalCount || 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <CardTitle>Clinical Trials & New Treatments</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Data source indicator */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setUseRealApi(!useRealApi)}
              title={useRealApi ? "Switch to demo data" : "Switch to live API"}
            >
              {isUsingLiveData ? (
                <>
                  <Wifi className="w-3 h-3 mr-1 text-emerald-500" />
                  Live
                </>
              ) : isLoadingTrials ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Loading
                </>
              ) : isApiError ? (
                <>
                  <WifiOff className="w-3 h-3 mr-1 text-amber-500" />
                  Demo
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1 text-muted-foreground" />
                  Demo
                </>
              )}
            </Button>
            {isUsingLiveData && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => refetchTrials()}
                title="Refresh from ClinicalTrials.gov"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
            <Badge variant="outline" className="bg-primary/5">
              <Sparkles className="w-3 h-3 mr-1" />
              Personalized Matches
            </Badge>
          </div>
        </div>
        <CardDescription>
          {isUsingLiveData
            ? `Found ${totalApiTrials} trials from ClinicalTrials.gov matching your conditions`
            : 'Discover research opportunities and new therapies matched to your health profile'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trials" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Clinical Trials
              <Badge variant="secondary" className="ml-1">{filteredTrials.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="treatments" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              New Treatments
              <Badge variant="secondary" className="ml-1">{relevantTreatments.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trials" className="space-y-4 mt-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search trials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterPhase === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterPhase('all')}
                >
                  All Phases
                </Button>
                <Button
                  variant={filterPhase === 'Phase 3' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterPhase('Phase 3')}
                >
                  Phase 3
                </Button>
              </div>
            </div>

            {/* Matched Conditions Summary */}
            {patientConditions.length > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Matching trials for:</span>
                  {conditions.slice(0, 3).map((condition, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {condition.code?.text || condition.code?.coding?.[0]?.display}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Trial Cards */}
            <div className="space-y-3">
              {filteredTrials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No matching clinical trials found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredTrials.map((trial) => (
                  <div
                    key={trial.id}
                    className="p-4 border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTrial(selectedTrial?.id === trial.id ? null : trial)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getPhaseColor(trial.phase)}>
                            {trial.phase}
                          </Badge>
                          <Badge className={getStatusColor(trial.status)}>
                            {trial.status}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{trial.shortTitle}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{trial.sponsor}</p>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {trial.conditions.map((condition, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                        </div>

                        {/* Match reasons */}
                        {trial.matchReasons && trial.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {trial.matchReasons.slice(0, 3).map((reason, i) => (
                              <span key={i} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Match Score */}
                      <div className={`px-3 py-2 rounded-lg text-center ${getMatchScoreBg(trial.matchScore || 0)}`}>
                        <div className={`text-lg font-bold ${getMatchScoreColor(trial.matchScore || 0)}`}>
                          {trial.matchScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Match</div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedTrial?.id === trial.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <p className="text-sm text-muted-foreground">{trial.description}</p>

                        <div className="p-3 bg-primary/5 rounded-lg">
                          <h5 className="text-sm font-medium mb-1 text-primary">Why This Matters</h5>
                          <p className="text-sm">{trial.whyItMatters}</p>
                        </div>

                        {/* Eligibility */}
                        <div>
                          <h5 className="text-sm font-medium mb-2">Key Eligibility</h5>
                          <div className="space-y-1">
                            {trial.eligibility.criteria.slice(0, 3).map((criterion, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{criterion}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Locations */}
                        <div>
                          <h5 className="text-sm font-medium mb-2">Nearest Locations</h5>
                          <div className="space-y-2">
                            {trial.locations.slice(0, 2).map((location, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{location.facility}</span>
                                <span className="text-muted-foreground">
                                  {location.city}, {location.state}
                                </span>
                                {location.distance && (
                                  <Badge variant="outline" className="text-xs ml-auto">
                                    ~{location.distance} mi
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Started: {new Date(trial.startDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Enrolling: {trial.enrollment.toLocaleString()} participants
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://clinicaltrials.gov/study/${trial.nctId}`, '_blank');
                            }}
                          >
                            View Full Details
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Would open contact form or provide instructions
                            }}
                          >
                            Ask My Doctor
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* ClinicalTrials.gov Link */}
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Explore More Trials</h4>
                  <p className="text-xs text-muted-foreground">
                    Search the official NIH clinical trials database
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://clinicaltrials.gov', '_blank')}
                >
                  ClinicalTrials.gov
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="treatments" className="space-y-4 mt-4">
            {relevantTreatments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No specific new treatments matched</p>
                <p className="text-sm">Showing general recent advances</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>New treatments relevant to your conditions</span>
                  </div>
                </div>

                {relevantTreatments.map((treatment) => {
                  const TreatmentIcon = getTreatmentIcon(treatment.type);
                  return (
                    <div key={treatment.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <TreatmentIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{treatment.name}</h4>
                            {treatment.genericName && (
                              <p className="text-xs text-muted-foreground">
                                ({treatment.genericName})
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {treatment.approvalStatus}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">{treatment.description}</p>

                      <div className="flex flex-wrap gap-1">
                        {treatment.conditions.map((condition, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {condition}
                          </Badge>
                        ))}
                      </div>

                      {/* Key Benefits */}
                      <div>
                        <h5 className="text-sm font-medium mb-2 text-emerald-600 dark:text-emerald-400">
                          Key Benefits
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {treatment.keyBenefits.slice(0, 4).map((benefit, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Considerations */}
                      <div>
                        <h5 className="text-sm font-medium mb-2 text-amber-600 dark:text-amber-400">
                          Considerations
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {treatment.considerations.slice(0, 4).map((consideration, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span>{consideration}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Talk to Doctor */}
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <h5 className="text-sm font-medium mb-2">Questions to Ask Your Doctor</h5>
                        <div className="space-y-1">
                          {treatment.talkToDoctor.map((question, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{question}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Learn More */}
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Stay Informed</h4>
                  <p className="text-xs text-muted-foreground">
                    Latest FDA drug approvals and breakthrough therapies
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://www.fda.gov/drugs/new-drugs-fda-cders-new-molecular-entities-and-new-therapeutic-biological-products', '_blank')}
                >
                  FDA New Drugs
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              <strong>Important:</strong> This information is for educational purposes only.
              Always consult with your healthcare provider before making any treatment decisions
              or enrolling in clinical trials.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
