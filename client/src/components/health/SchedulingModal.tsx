import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Stethoscope,
  Eye,
  Syringe,
  TestTube,
  Heart,
  Activity,
  Clipboard,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { CareGap } from '@shared/schema';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  careGap: CareGap | null;
  patientAge?: number | null;
  conditions?: string[];
}

// Scheduling guidance configuration for different care gap types
const SCHEDULING_GUIDANCE: Record<string, {
  providerType: string;
  referralNeeded: boolean;
  typicalWaitTime: string;
  prepInstructions: string[];
  whatToSay: string;
  questions: string[];
  icon: any;
}> = {
  'AWV': {
    providerType: 'Primary Care Provider (PCP)',
    referralNeeded: false,
    typicalWaitTime: '1-2 weeks',
    prepInstructions: [
      'Bring a list of all current medications (including supplements)',
      'Note any new symptoms or health concerns',
      'Have your insurance card ready',
      'Prepare a list of questions for your doctor'
    ],
    whatToSay: "I'd like to schedule my Annual Wellness Visit. This is a preventive care appointment covered by Medicare/my insurance.",
    questions: [
      'What screenings are recommended for my age?',
      'Are my immunizations up to date?',
      'Should I make any lifestyle changes?'
    ],
    icon: Stethoscope
  },
  'CDC-E': {
    providerType: 'Primary Care Provider or Endocrinologist',
    referralNeeded: false,
    typicalWaitTime: '3-7 days for lab, 1-2 weeks for follow-up',
    prepInstructions: [
      'Fast for 8-12 hours before the blood draw (water is OK)',
      'Continue taking your diabetes medications unless told otherwise',
      'Note any recent blood sugar readings to share',
      'Write down any symptoms (increased thirst, fatigue, vision changes)'
    ],
    whatToSay: "I need to schedule an HbA1c test for diabetes management. This is part of my routine diabetes care.",
    questions: [
      'What is my target A1c level?',
      'Should I adjust my diabetes medications?',
      'What diet changes might help my numbers?'
    ],
    icon: TestTube
  },
  'CBP': {
    providerType: 'Primary Care Provider',
    referralNeeded: false,
    typicalWaitTime: '1-2 weeks',
    prepInstructions: [
      'Avoid caffeine and exercise 30 minutes before',
      'Use the restroom before your appointment',
      'Bring your home blood pressure log if you track it',
      'Sit quietly for 5 minutes before measurement'
    ],
    whatToSay: "I'd like to schedule a blood pressure check as part of my ongoing hypertension management.",
    questions: [
      'Is my current medication dosage appropriate?',
      'What lifestyle changes can help lower my BP?',
      'Should I get a home BP monitor?'
    ],
    icon: Activity
  },
  'COL': {
    providerType: 'Gastroenterologist',
    referralNeeded: true,
    typicalWaitTime: '2-4 weeks (may be longer)',
    prepInstructions: [
      'You will need a referral from your PCP first',
      'Plan for someone to drive you home (sedation required)',
      'Expect a bowel prep the day before (clear liquids, special drink)',
      'Take the day off work for the procedure'
    ],
    whatToSay: "I need to schedule a colonoscopy for colorectal cancer screening. I'm [age] and this is my [first/routine] screening.",
    questions: [
      'What does the bowel prep involve?',
      'How long will the procedure take?',
      'When will I get my results?'
    ],
    icon: Stethoscope
  },
  'FVA': {
    providerType: 'Primary Care, Pharmacy, or Urgent Care',
    referralNeeded: false,
    typicalWaitTime: 'Same day to 1 week',
    prepInstructions: [
      'Wear a short-sleeved shirt for easy arm access',
      'Mention any past vaccine reactions',
      'Bring your insurance or Medicare card',
      'You can get this at most pharmacies without an appointment'
    ],
    whatToSay: "I'd like to get my annual flu shot. I'm [age] years old and [have/don't have] any chronic conditions.",
    questions: [
      'Which flu vaccine is recommended for my age?',
      'Are there any side effects I should watch for?',
      'Can I get other vaccines at the same time?'
    ],
    icon: Syringe
  },
  'EED': {
    providerType: 'Ophthalmologist or Optometrist',
    referralNeeded: false,
    typicalWaitTime: '2-4 weeks',
    prepInstructions: [
      'Bring sunglasses (your pupils will be dilated)',
      'Arrange for someone to drive you home',
      'Bring your current eyeglasses or contact prescription',
      'List any vision changes you\'ve noticed'
    ],
    whatToSay: "I have diabetes and need to schedule a dilated eye exam to check for diabetic retinopathy.",
    questions: [
      'Are there any signs of diabetic eye disease?',
      'How often should I have this exam?',
      'What symptoms should I watch for between exams?'
    ],
    icon: Eye
  }
};

// Default guidance for unknown care gap types
const DEFAULT_GUIDANCE = {
  providerType: 'Your Healthcare Provider',
  referralNeeded: false,
  typicalWaitTime: '1-2 weeks',
  prepInstructions: [
    'Bring your insurance card',
    'List any medications you are taking',
    'Note any questions or concerns you have'
  ],
  whatToSay: "I'd like to schedule an appointment for preventive care.",
  questions: [
    'What should I expect during this visit?',
    'Are there any preparations I need to make?'
  ],
  icon: Stethoscope
};

export function SchedulingModal({ isOpen, onClose, careGap, patientAge, conditions }: SchedulingModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!careGap) return null;

  const guidance = SCHEDULING_GUIDANCE[careGap.measureId] || DEFAULT_GUIDANCE;
  const Icon = guidance.icon;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Calculate urgency based on due date
  const getUrgency = () => {
    if (!careGap.dueDate) return { level: 'normal', text: 'Schedule when convenient', color: 'text-muted-foreground' };

    const dueDate = new Date(careGap.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return { level: 'overdue', text: `Overdue by ${Math.abs(daysUntilDue)} days`, color: 'text-destructive' };
    } else if (daysUntilDue <= 14) {
      return { level: 'urgent', text: `Due in ${daysUntilDue} days - Schedule this week`, color: 'text-amber-600 dark:text-amber-400' };
    } else if (daysUntilDue <= 30) {
      return { level: 'soon', text: `Due in ${daysUntilDue} days - Schedule soon`, color: 'text-amber-600 dark:text-amber-400' };
    } else {
      return { level: 'normal', text: `Due in ${daysUntilDue} days`, color: 'text-muted-foreground' };
    }
  };

  const urgency = getUrgency();

  // Personalize the "what to say" based on patient info
  const personalizedWhatToSay = guidance.whatToSay
    .replace('[age]', patientAge?.toString() || 'my age')
    .replace('[first/routine]', 'routine');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            Schedule: {careGap.title}
          </DialogTitle>
          <DialogDescription>
            Follow these steps to schedule your appointment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Urgency Banner */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            urgency.level === 'overdue' ? 'bg-destructive/10' :
            urgency.level === 'urgent' || urgency.level === 'soon' ? 'bg-amber-50 dark:bg-amber-950/30' :
            'bg-secondary/50'
          }`}>
            <Clock className={`w-4 h-4 ${urgency.color}`} />
            <span className={`text-sm font-medium ${urgency.color}`}>{urgency.text}</span>
          </div>

          {/* Step 1: Who to Contact */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
              <h4 className="font-semibold">Who to Contact</h4>
            </div>
            <div className="ml-8 p-3 bg-secondary/50 rounded-lg">
              <p className="font-medium">{guidance.providerType}</p>
              {guidance.referralNeeded && (
                <div className="flex items-center gap-2 mt-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Referral required - Contact your PCP first</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Typical wait time: {guidance.typicalWaitTime}</span>
              </div>
            </div>
          </div>

          {/* Step 2: What to Say */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
              <h4 className="font-semibold">What to Say When You Call</h4>
            </div>
            <div className="ml-8 p-3 bg-secondary/50 rounded-lg relative">
              <p className="text-sm pr-8 italic">"{personalizedWhatToSay}"</p>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={() => copyToClipboard(personalizedWhatToSay, 'script')}
              >
                {copiedText === 'script' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Step 3: How to Prepare */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
              <h4 className="font-semibold">How to Prepare</h4>
            </div>
            <div className="ml-8 space-y-2">
              {guidance.prepInstructions.map((instruction, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{instruction}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Questions to Ask */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
              <h4 className="font-semibold">Questions to Ask Your Provider</h4>
            </div>
            <div className="ml-8 space-y-2">
              {guidance.questions.map((question, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{question}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-8"
              onClick={() => copyToClipboard(guidance.questions.join('\n'), 'questions')}
            >
              {copiedText === 'questions' ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> : <Clipboard className="w-4 h-4 mr-2" />}
              Copy Questions
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button className="w-full" onClick={() => window.open('https://www.zocdoc.com', '_blank')}>
              <Calendar className="w-4 h-4 mr-2" />
              Find Providers on ZocDoc
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.open('https://www.google.com/maps/search/healthcare+providers+near+me', '_blank')}>
              <MapPin className="w-4 h-4 mr-2" />
              Find Nearby Providers
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Why This Matters */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="text-sm font-semibold mb-1 text-primary">Why This Matters</h4>
            <p className="text-sm text-muted-foreground">{careGap.description}</p>
            {careGap.category === 'chronic' && conditions && conditions.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Based on your conditions ({conditions.slice(0, 2).join(', ')}), staying current on this care is especially important.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
