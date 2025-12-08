import { useEffect, useState, useCallback } from 'react';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  Play,
  SkipForward,
  BookOpen
} from 'lucide-react';

// Tour step configurations
export interface TourStep extends DriveStep {
  id: string;
}

// Dashboard tour steps
export const dashboardTourSteps: TourStep[] = [
  {
    id: 'welcome',
    element: undefined, // No element - centered modal
    popover: {
      title: 'Welcome to Liara AI Health! ',
      description: 'Let us show you around the platform. This quick tour will highlight key features that help you take control of your health data.',
      side: 'top' as const,
    },
  },
  {
    id: 'sidebar',
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Navigation Sidebar',
      description: 'Access all your health records, medications, lab results, and more from this sidebar. Categories are organized for easy navigation.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    id: 'patient-info',
    element: '[data-tour="patient-info"]',
    popover: {
      title: 'Your Profile',
      description: 'View your connected patient information and security status. Your data is encrypted and securely stored.',
      side: 'right' as const,
    },
  },
  {
    id: 'health-summary',
    element: '[data-tour="health-summary"]',
    popover: {
      title: 'Health Summary',
      description: 'Get a quick overview of your conditions, medications, allergies, and immunizations all in one place.',
      side: 'bottom' as const,
    },
  },
  {
    id: 'care-gaps',
    element: '[data-tour="care-gaps"]',
    popover: {
      title: 'Preventive Care Alerts',
      description: 'AI analyzes your health records to identify care gaps and preventive measures you might need. Stay on top of recommended screenings and vaccinations.',
      side: 'left' as const,
    },
  },
  {
    id: 'ai-insights',
    element: '[data-tour="ai-insights"]',
    popover: {
      title: 'AI Health Insights',
      description: 'Our AI reviews your lab results and health data to provide personalized insights and recommendations based on clinical guidelines.',
      side: 'top' as const,
    },
  },
  {
    id: 'visualizations',
    element: '[data-tour="visualizations"]',
    popover: {
      title: 'Health Trends',
      description: 'Interactive charts show your vital signs, lab values, and other metrics over time. Spot trends and track your progress.',
      side: 'left' as const,
    },
  },
  {
    id: 'schedule-action',
    element: '[data-tour="schedule-action"]',
    popover: {
      title: 'Take Action',
      description: 'Schedule appointments, request medication refills, and more directly from the platform. Your healthcare is just a click away.',
      side: 'bottom' as const,
    },
  },
  {
    id: 'complete',
    element: undefined,
    popover: {
      title: 'You\'re All Set!',
      description: 'You now know the essentials of Liara AI Health. Explore your health data and don\'t hesitate to revisit this tour from the Help menu.',
      side: 'top' as const,
    },
  },
];

// Landing page tour steps
export const landingTourSteps: TourStep[] = [
  {
    id: 'welcome',
    element: undefined,
    popover: {
      title: 'Welcome to Liara AI Health',
      description: 'Your secure gateway to comprehensive health records. Let\'s show you how to get started.',
      side: 'top' as const,
    },
  },
  {
    id: 'connect-providers',
    element: '[data-tour="connect-tab"]',
    popover: {
      title: 'Connect Healthcare Providers',
      description: 'Link your existing healthcare providers to import your medical records securely using SMART on FHIR protocols.',
      side: 'bottom' as const,
    },
  },
  {
    id: 'try-demo',
    element: '[data-tour="demo-tab"]',
    popover: {
      title: 'Try the Demo',
      description: 'Not ready to connect? Explore the platform with sample health data to see what insights you can gain.',
      side: 'bottom' as const,
    },
  },
  {
    id: 'features',
    element: '[data-tour="features"]',
    popover: {
      title: 'Key Features',
      description: 'Privacy-first design, support for multiple providers, and AI-powered health insights - all in one platform.',
      side: 'top' as const,
    },
  },
];

// Custom CSS for driver.js to match our design system
const customDriverCSS = `
  .driver-popover {
    background: hsl(var(--card));
    color: hsl(var(--card-foreground));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.2);
    padding: 20px;
    max-width: 340px;
  }

  .driver-popover-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 8px;
  }

  .driver-popover-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    line-height: 1.5;
  }

  .driver-popover-progress-text {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }

  .driver-popover-navigation-btns {
    gap: 8px;
    margin-top: 16px;
  }

  .driver-popover-prev-btn,
  .driver-popover-next-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .driver-popover-prev-btn {
    background: transparent;
    border: 1px solid hsl(var(--border));
    color: hsl(var(--foreground));
  }

  .driver-popover-prev-btn:hover {
    background: hsl(var(--accent));
  }

  .driver-popover-next-btn {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border: none;
  }

  .driver-popover-next-btn:hover {
    opacity: 0.9;
  }

  .driver-popover-close-btn {
    color: hsl(var(--muted-foreground));
  }

  .driver-popover-close-btn:hover {
    color: hsl(var(--foreground));
  }

  .driver-popover-arrow-side-left,
  .driver-popover-arrow-side-right,
  .driver-popover-arrow-side-top,
  .driver-popover-arrow-side-bottom {
    border-color: hsl(var(--border));
  }

  .driver-popover-arrow-side-left .driver-popover-arrow,
  .driver-popover-arrow-side-right .driver-popover-arrow,
  .driver-popover-arrow-side-top .driver-popover-arrow,
  .driver-popover-arrow-side-bottom .driver-popover-arrow {
    background: hsl(var(--card));
  }

  .driver-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .driver-active-element {
    box-shadow: 0 0 0 4px hsl(var(--primary) / 0.3) !important;
  }
`;

// Inject custom CSS
function injectTourStyles() {
  const styleId = 'guided-tour-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = customDriverCSS;
    document.head.appendChild(style);
  }
}

interface GuidedTourProps {
  steps: TourStep[];
  storageKey: string;
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function useGuidedTour({
  steps,
  storageKey,
  autoStart = false,
  onComplete,
  onSkip,
}: GuidedTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(() => {
    return localStorage.getItem(storageKey) === 'completed';
  });

  const startTour = useCallback(() => {
    injectTourStyles();

    const driverInstance = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      progressText: '{{current}} of {{total}}',
      allowClose: true,
      overlayClickBehavior: 'nextStep',
      stagePadding: 10,
      stageRadius: 8,
      animate: true,
      smoothScroll: true,
      steps: steps.map(step => ({
        element: step.element,
        popover: step.popover,
      })),
      onDestroyStarted: () => {
        setIsActive(false);
        localStorage.setItem(storageKey, 'completed');
        setHasCompleted(true);
        onComplete?.();
        driverInstance.destroy();
      },
      onCloseClick: () => {
        setIsActive(false);
        onSkip?.();
        driverInstance.destroy();
      },
    });

    setIsActive(true);
    driverInstance.drive();
  }, [steps, storageKey, onComplete, onSkip]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasCompleted(false);
  }, [storageKey]);

  // Auto-start tour if enabled and not completed
  useEffect(() => {
    if (autoStart && !hasCompleted) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(startTour, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompleted, startTour]);

  return {
    startTour,
    resetTour,
    isActive,
    hasCompleted,
  };
}

// Tour trigger button component
interface TourButtonProps {
  onClick: () => void;
  variant?: 'default' | 'minimal';
  className?: string;
}

export function TourButton({ onClick, variant = 'default', className }: TourButtonProps) {
  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={className}
        title="Start guided tour"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={className}
    >
      <Play className="h-4 w-4 mr-2" />
      Take a Tour
    </Button>
  );
}

// Full tour control panel for settings/help menu
interface TourControlPanelProps {
  dashboardTour: ReturnType<typeof useGuidedTour>;
  landingTour?: ReturnType<typeof useGuidedTour>;
}

export function TourControlPanel({ dashboardTour, landingTour }: TourControlPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Dashboard Tour</h4>
            <p className="text-sm text-muted-foreground">
              Learn about dashboard features
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {dashboardTour.hasCompleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={dashboardTour.resetTour}
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={dashboardTour.startTour}
          >
            <Play className="h-4 w-4 mr-1" />
            {dashboardTour.hasCompleted ? 'Restart' : 'Start'}
          </Button>
        </div>
      </div>

      {landingTour && (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium">Getting Started</h4>
              <p className="text-sm text-muted-foreground">
                Learn how to connect providers
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={landingTour.startTour}
          >
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        </div>
      )}
    </div>
  );
}
