import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectCard } from '@/components/health/ConnectCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Heart,
  Database,
  Stethoscope,
  Shield,
  ChevronRight,
  Building2,
  FilePlus2,
  FolderOpen,
  Search,
  PlayCircle,
  BookOpen,
  HelpCircle,
  Sparkles,
  Lock,
  BarChart3,
  Brain,
  Users,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Globe
} from 'lucide-react';
import { fhirProviders, epicBrands } from '@/lib/providers';
import { LiaraLogo } from "@/components/ui/liara-logo";
import { AuthModal } from '@/components/auth/AuthModal';
import { ModeToggle } from "@/components/mode-toggle";
import { BrandSwitcher, QuickBrandToggle } from '@/components/branding/BrandSwitcher';
import { useGuidedTour, landingTourSteps, TourButton } from '@/components/tour/GuidedTour';

// Animated stats counter
function AnimatedStat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-primary">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// Trust badge component
function TrustBadge({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-green-500" />
      <span>{text}</span>
    </div>
  );
}

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const demoProvider = fhirProviders.find(p => p.id === 'demo');

  const landingTour = useGuidedTour({
    steps: landingTourSteps,
    storageKey: 'liara-landing-tour',
    autoStart: false,
  });

  const features = [
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Enterprise-grade security with end-to-end encryption. Your data is never stored on our servers.",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      icon: Building2,
      title: "Universal Connectivity",
      description: "Connect to 250+ healthcare systems including Epic, Cerner, and major insurance providers.",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: Brain,
      title: "AI Health Insights",
      description: "Advanced AI analyzes your records to identify care gaps and provide personalized recommendations.",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      icon: BarChart3,
      title: "Visual Analytics",
      description: "Interactive dashboards track your health metrics over time with beautiful visualizations.",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    }
  ];

  const testimonials = [
    {
      quote: "Finally, all my health records in one place. The AI insights helped me catch a preventive screening I had missed.",
      author: "Sarah M.",
      role: "Patient",
      rating: 5
    },
    {
      quote: "The white-label solution was exactly what our hospital needed. Implementation took just weeks, not months.",
      author: "Dr. James Chen",
      role: "CIO, Metro Health System",
      rating: 5
    },
    {
      quote: "My patients love being able to see their complete health picture. It's transformed our care coordination.",
      author: "Dr. Emily Roberts",
      role: "Primary Care Physician",
      rating: 5
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors duration-300">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <LiaraLogo size="sm" />
            <span className="font-semibold text-lg hidden sm:inline">Liara AI Health</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/about')}>About</Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation('/tutorial')}>How It Works</Button>
            <TourButton onClick={landingTour.startTour} variant="minimal" />
          </nav>

          <div className="flex items-center gap-2">
            <BrandSwitcher />
            <ModeToggle />
            <Button onClick={() => setLocation('/dashboard')} className="hidden sm:flex">
              Get Started
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge variant="secondary" className="mb-6 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Now with AI-Powered Health Insights
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Your Complete Health Story,{' '}
              <span className="text-primary">One Secure Platform</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect all your healthcare providers, unlock AI-powered insights, and take control of your health data with enterprise-grade security.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12" data-tour="demo-tab">
              <Button size="lg" className="text-lg px-8" onClick={() => setLocation('/dashboard')}>
                <PlayCircle className="h-5 w-5 mr-2" />
                Try Free Demo
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => setIsAuthModalOpen(true)}>
                Connect Your Records
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <TrustBadge icon={Shield} text="HIPAA Compliant" />
              <TrustBadge icon={Lock} text="256-bit Encryption" />
              <TrustBadge icon={CheckCircle} text="SOC 2 Type II" />
              <TrustBadge icon={Globe} text="SMART on FHIR Certified" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedStat value={250} label="Healthcare Systems" suffix="+" />
            <AnimatedStat value={50000} label="Active Users" suffix="+" />
            <AnimatedStat value={99} label="Uptime SLA" suffix="%" />
            <AnimatedStat value={4.9} label="User Rating" suffix="/5" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20" data-tour="features">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Better Health Management
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed to help you understand, track, and improve your health outcomes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="shadow-xl border-primary/20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-b">
                <CardTitle className="text-2xl">Get Started in Seconds</CardTitle>
                <CardDescription>Connect your healthcare providers or explore with sample data</CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                <Tabs defaultValue="demo" className="w-full">
                  <TabsList className="grid grid-cols-3 mb-8" data-tour="connect-tab">
                    <TabsTrigger value="demo" className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Try Demo</span>
                      <span className="sm:hidden">Demo</span>
                    </TabsTrigger>
                    <TabsTrigger value="connect" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Connect Providers</span>
                      <span className="sm:hidden">Connect</span>
                    </TabsTrigger>
                    <TabsTrigger value="enterprise" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span className="hidden sm:inline">Enterprise</span>
                      <span className="sm:hidden">Enterprise</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Demo Tab */}
                  <TabsContent value="demo">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid md:grid-cols-2 gap-8 items-center"
                    >
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Experience the Full Platform</h3>
                        <p className="text-muted-foreground mb-6">
                          Explore all features with realistic sample health data. No account or credit card required.
                        </p>
                        <ul className="space-y-3 mb-6">
                          {[
                            "Complete medical record dashboard",
                            "AI-powered health insights",
                            "Interactive health visualizations",
                            "Care gap identification",
                            "Appointment scheduling demo"
                          ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                        <Button size="lg" onClick={() => setLocation('/dashboard')}>
                          <PlayCircle className="h-5 w-5 mr-2" />
                          Launch Demo
                        </Button>
                      </div>
                      <div className="flex justify-center">
                        {demoProvider ? (
                          <ConnectCard provider={demoProvider} />
                        ) : (
                          <Card className="w-full max-w-sm border-2 border-primary/50 shadow-lg">
                            <CardContent className="p-8 text-center">
                              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Database className="h-10 w-10 text-primary" />
                              </div>
                              <h3 className="text-xl font-semibold mb-2">Demo Patient</h3>
                              <p className="text-muted-foreground mb-6">Access sample health records</p>
                              <Button className="w-full" size="lg" onClick={() => setLocation('/dashboard')}>
                                Start Demo
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </motion.div>
                  </TabsContent>

                  {/* Connect Tab */}
                  <TabsContent value="connect">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h3 className="text-lg font-semibold mb-4">Popular Healthcare Systems</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                        {epicBrands.slice(0, 6).map((brand) => (
                          <Card
                            key={brand.id}
                            className="cursor-pointer hover:shadow-md hover:border-primary transition-all group"
                            onClick={() => setLocation('/dashboard')}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="h-12 w-12 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center">
                                {brand.logoUrl ? (
                                  <img src={brand.logoUrl} alt={brand.name} className="max-h-8 max-w-8" />
                                ) : (
                                  <Stethoscope className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                                {brand.name}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="flex justify-center">
                        <Button onClick={() => setIsAuthModalOpen(true)}>
                          Connect to Provider
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </motion.div>
                  </TabsContent>

                  {/* Enterprise Tab */}
                  <TabsContent value="enterprise">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <Building2 className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">White-Label Solution for Healthcare Organizations</h3>
                      <p className="text-muted-foreground max-w-lg mx-auto mb-6">
                        Deploy a fully branded patient portal with custom colors, logos, and domain. Perfect for hospitals, health systems, and insurance companies.
                      </p>
                      <div className="flex flex-wrap justify-center gap-4 mb-8">
                        <Badge variant="secondary">Custom Branding</Badge>
                        <Badge variant="secondary">SSO Integration</Badge>
                        <Badge variant="secondary">Dedicated Support</Badge>
                        <Badge variant="secondary">SLA Guarantee</Badge>
                      </div>
                      <div className="flex justify-center gap-4">
                        <BrandSwitcher
                          trigger={
                            <Button variant="outline">
                              <Sparkles className="h-4 w-4 mr-2" />
                              Preview Themes
                            </Button>
                          }
                        />
                        <Button>
                          Contact Sales
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </motion.div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Patients and Providers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Join thousands of users who trust Liara AI Health to manage their health records securely.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => setLocation('/dashboard')}>
              <PlayCircle className="h-5 w-5 mr-2" />
              Start Free Demo
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <LiaraLogo size="sm" />
                <span className="font-semibold">Liara AI Health</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your secure gateway to comprehensive health records.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer" onClick={() => setLocation('/dashboard')}>Features</li>
                <li className="hover:text-primary cursor-pointer">Pricing</li>
                <li className="hover:text-primary cursor-pointer">Enterprise</li>
                <li className="hover:text-primary cursor-pointer">Security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer" onClick={() => setLocation('/about')}>About</li>
                <li className="hover:text-primary cursor-pointer" onClick={() => setLocation('/tutorial')}>Tutorial</li>
                <li className="hover:text-primary cursor-pointer">Documentation</li>
                <li className="hover:text-primary cursor-pointer">Blog</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer">Privacy Policy</li>
                <li className="hover:text-primary cursor-pointer">Terms of Service</li>
                <li className="hover:text-primary cursor-pointer">HIPAA Compliance</li>
                <li className="hover:text-primary cursor-pointer">BAA</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Liara AI Health. All rights reserved.
            </p>
            <div className="flex gap-4">
              <TrustBadge icon={Shield} text="HIPAA Compliant" />
              <TrustBadge icon={Lock} text="SOC 2 Certified" />
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onConfirm={async () => {
          setIsAuthModalOpen(false);
          try {
            const { smartAuth } = await import('@/lib/smart-auth');
            await smartAuth.authorize();
          } catch (e) {
            console.error(e);
            alert("Failed to start authorization");
          }
        }}
      />
    </div>
  );
}
