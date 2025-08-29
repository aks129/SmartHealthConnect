
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Link, 
  BarChart3, 
  Shield, 
  Heart,
  Check,
  Users
} from 'lucide-react';
import { Link as RouterLink } from 'wouter';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingCarousel({ onComplete, onSkip }: OnboardingCarouselProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Liara AI Health',
      description: 'Your personal health companion that brings all your medical records together in one secure place.',
      icon: <Heart className="h-12 w-12 text-red-500" />,
      features: [
        'Secure access to all your health records',
        'AI-powered health insights and recommendations',
        'Care gap identification and preventive reminders',
        'HIPAA-compliant and privacy-focused'
      ]
    },
    {
      id: 'connect',
      title: 'Connect Your Health Providers',
      description: 'Link your healthcare providers to create a comprehensive view of your medical history.',
      icon: <Link className="h-12 w-12 text-blue-500" />,
      features: [
        'Connect to major health systems and clinics',
        'Secure SMART on FHIR authentication',
        'Automatic data synchronization',
        'Support for Epic, Cerner, and other EHR systems'
      ],
      action: {
        label: 'Connect Providers',
        href: '/dashboard#connections'
      }
    },
    {
      id: 'insights',
      title: 'Get Personalized Health Insights',
      description: 'Our AI analyzes your health data to provide personalized recommendations and identify potential care gaps.',
      icon: <BarChart3 className="h-12 w-12 text-green-500" />,
      features: [
        'Personalized health score and trends',
        'Preventive care reminders',
        'Chronic condition monitoring',
        'Evidence-based recommendations'
      ]
    },
    {
      id: 'care-gaps',
      title: 'Stay on Top of Preventive Care',
      description: 'Never miss important health screenings and check-ups with our intelligent care gap management.',
      icon: <Shield className="h-12 w-12 text-purple-500" />,
      features: [
        'HEDIS quality measure tracking',
        'Age-appropriate screening reminders',
        'Chronic disease management support',
        'Easy-to-understand explanations'
      ]
    }
  ];
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const currentStepData = steps[currentStep];
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl border-2">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10">
                {currentStepData.icon}
              </div>
            </div>
            
            <CardTitle className="text-2xl text-center">{currentStepData.title}</CardTitle>
            <CardDescription className="text-center text-lg">
              {currentStepData.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {currentStepData.features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center justify-center space-x-2 mt-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-primary' : 
                    index < currentStep ? 'bg-primary/60' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
          
          <CardFooter className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} of {steps.length}
              </span>
            </div>
            
            {currentStepData.action ? (
              <RouterLink href={currentStepData.action.href || '#'}>
                <Button 
                  onClick={() => {
                    if (currentStepData.action?.onClick) {
                      currentStepData.action.onClick();
                    }
                    onComplete();
                  }}
                  className="flex items-center space-x-2"
                >
                  <span>{currentStepData.action.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </RouterLink>
            ) : (
              <Button
                onClick={nextStep}
                className="flex items-center space-x-2"
              >
                <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
