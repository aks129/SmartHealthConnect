import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModeToggle } from "@/components/mode-toggle";
import {
  Heart,
  Shield,
  Activity,
  Calendar,
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Play,
  ChevronRight,
  Lock,
  AlertCircle,
  Stethoscope,
  ExternalLink
} from 'lucide-react';

// SMART Health IT Public Sandbox Configuration
// This uses the public SMART launcher which doesn't require app registration
const SMART_SANDBOX_CONFIG = {
  // SMART Health IT Launcher - simulates Epic/Cerner with test patients
  launcherUrl: 'https://launch.smarthealthit.org',
  fhirBaseUrl: 'https://launch.smarthealthit.org/v/r4/fhir',
  // Public client - no registration required
  clientId: 'my_web_app',
  scope: 'launch/patient patient/*.read openid fhirUser',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/callback` : ''
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEpicLoading, setIsEpicLoading] = useState(false);

  const handleDemoClick = () => {
    setShowPasswordDialog(true);
    setPassword('');
    setError('');
  };

  const handleEpicConnect = () => {
    setIsEpicLoading(true);

    // Generate a random state for CSRF protection
    const state = crypto.randomUUID();
    localStorage.setItem('epic_oauth_state', state);
    localStorage.setItem('selected_provider', 'smart-sandbox');

    // Use SMART Health IT Launcher - publicly accessible sandbox
    // The launcher will simulate an EHR launch and let user pick a test patient
    const launchParams = {
      launch_type: 'patient-standalone',
      patient: '', // Empty = let user pick
      fhir_version: 'r4',
      skip_login: false,
      skip_auth: false
    };

    // Encode launch parameters
    const launchConfig = btoa(JSON.stringify({
      h: '1', // Show patient picker
      i: '1', // Include patient
      j: '1'  // Include encounter
    }));

    // Build the SMART launcher authorization URL
    const authUrl = new URL(`${SMART_SANDBOX_CONFIG.launcherUrl}/v/r4/sim/${launchConfig}/auth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', SMART_SANDBOX_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', SMART_SANDBOX_CONFIG.redirectUri);
    authUrl.searchParams.set('scope', SMART_SANDBOX_CONFIG.scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('aud', `${SMART_SANDBOX_CONFIG.launcherUrl}/v/r4/sim/${launchConfig}/fhir`);

    // Redirect to SMART launcher
    window.location.href = authUrl.toString();
  };

  const handleDemoConnect = async () => {
    if (!password.trim()) {
      setError('Please enter the demo password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/fhir/demo/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Invalid password');
        setIsLoading(false);
        return;
      }

      window.location.href = '/dashboard';
    } catch (e) {
      setError('Failed to connect. Please try again.');
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Heart,
      title: "Health Records",
      description: "View all your medical records, conditions, and medications in one place",
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-950"
    },
    {
      icon: Activity,
      title: "Vitals & Labs",
      description: "Track vital signs, lab results, and health trends over time",
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950"
    },
    {
      icon: Calendar,
      title: "Appointments",
      description: "Schedule visits and receive reminders for preventive care",
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      icon: Users,
      title: "Family Health",
      description: "Manage health records for your entire family in one account",
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-950"
    }
  ];

  const demoFeatures = [
    "Complete patient health dashboard",
    "Vital signs and lab results tracking",
    "Care gap recommendations",
    "Family member management",
    "Appointment scheduling",
    "AI-powered health insights"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-soft">
        <div className="container-app h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">SmartHealth</span>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button onClick={handleDemoClick}>
              Try Demo
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container-app">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Demo Preview Available
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              Your health story,{' '}
              <span className="text-primary">beautifully organized</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              A modern health records platform that brings together your medical data,
              tracks your wellness, and helps your family stay healthy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={handleDemoClick} className="text-base px-8">
                <Play className="w-5 h-5 mr-2" />
                Explore Demo
              </Button>
              <Button size="lg" variant="outline" onClick={handleEpicConnect} disabled={isEpicLoading} className="text-base px-8">
                <Stethoscope className="w-5 h-5 mr-2" />
                {isEpicLoading ? 'Connecting...' : 'SMART Sandbox'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-secondary/30">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Everything you need to manage your health
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A comprehensive platform designed to give you complete visibility into your healthcare journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-elevated p-6 hover:border-primary/20 transition-all cursor-pointer"
                onClick={handleDemoClick}
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20">
        <div className="container-app">
          <div className="card-elevated p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-4">
                  <CheckCircle2 className="w-4 h-4" />
                  No signup required
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Try the interactive demo
                </h2>

                <p className="text-muted-foreground mb-6">
                  Experience the full platform with sample health data.
                  See how easy it is to view records, track vitals, and manage your family's health.
                </p>

                <ul className="space-y-3 mb-8">
                  {demoFeatures.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3">
                  <Button size="lg" onClick={handleDemoClick}>
                    <Play className="w-5 h-5 mr-2" />
                    Launch Demo
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleEpicConnect} disabled={isEpicLoading}>
                    <Stethoscope className="w-5 h-5 mr-2" />
                    {isEpicLoading ? 'Connecting...' : 'SMART Sandbox'}
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-violet-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-lg font-medium text-foreground">Health Dashboard</p>
                    <p className="text-sm text-muted-foreground">Click to explore</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SMART Sandbox Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container-app">
          <div className="card-elevated p-8 md:p-10">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                  <Stethoscope className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Connect to SMART Health IT Sandbox
                </h3>
                <p className="text-muted-foreground mb-4">
                  Test the SMART on FHIR integration with real EHR workflows.
                  Choose from dozens of synthetic test patients with full medical histories.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>No login required - Select any test patient</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Button onClick={handleEpicConnect} disabled={isEpicLoading} className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {isEpicLoading ? 'Connecting...' : 'Try SMART Sandbox'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 border-t">
        <div className="container-app">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>SMART on FHIR</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container-app">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">SmartHealthConnect</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Demo application for health records management
            </p>
          </div>
        </div>
      </footer>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Demo Access
            </DialogTitle>
            <DialogDescription>
              Enter the demo password to access the health records preview.
              This demo uses de-identified sample data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter demo password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDemoConnect()}
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDemoConnect} disabled={isLoading}>
              {isLoading ? 'Connecting...' : 'Access Demo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
