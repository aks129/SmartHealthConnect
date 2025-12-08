import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ConnectCard } from '@/components/health/ConnectCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  ShieldCheck
} from 'lucide-react';
import { fhirProviders, epicBrands } from '@/lib/providers';
import { LiaraLogo } from "@/components/ui/liara-logo";
import { AuthModal } from '@/components/auth/AuthModal';
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  // Get the demo provider for the home page
  const demoProvider = fhirProviders.find(p => p.id === 'demo');

  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-background transition-colors duration-300">
      {/* Header */}
      <header className="w-full max-w-4xl mb-6 flex flex-col items-center relative">
        <div className="absolute right-0 top-0 hidden md:block">
          <ModeToggle />
        </div>
        <div className="md:hidden w-full flex justify-end mb-2">
          <ModeToggle />
        </div>

        <h1 className="text-4xl font-bold text-foreground mb-2">Liara AI Health</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center">
          Your secure gateway to comprehensive health records
        </p>
      </header>

      {/* Main navigation */}
      <div className="w-full max-w-4xl mb-6">
        <div className="flex justify-center space-x-4">
          <Button variant="ghost" onClick={() => setLocation('/about')} className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            About
          </Button>
          <Button variant="ghost" onClick={() => setLocation('/tutorial')} className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Tutorial
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full max-w-4xl mx-auto">
        <Card className="mb-8 shadow-sm border-primary/20">
          <CardHeader className="bg-primary/5 dark:bg-primary/10 border-b border-primary/10">
            <CardTitle className="text-2xl">Get Started</CardTitle>
            <CardDescription>Connect to your health records or try a demo</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Tabs defaultValue="connect" className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="connect" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Healthcare Providers</span>
                  <span className="sm:hidden">Providers</span>
                </TabsTrigger>
                <TabsTrigger value="demo" className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  <span>Try Demo</span>
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Find Provider</span>
                  <span className="sm:hidden">Search</span>
                </TabsTrigger>
              </TabsList>

              {/* Provider Connections Tab */}
              <TabsContent value="connect" className="space-y-4">
                <h3 className="text-lg font-medium">Popular Healthcare Systems</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {epicBrands.slice(0, 6).map((brand) => (
                    <Card
                      key={brand.id}
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-all hover:border-primary group"
                      onClick={() => setLocation('/dashboard')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 flex-shrink-0 bg-background rounded-md border p-1 flex items-center justify-center">
                            {brand.logoUrl ? (
                              <img src={brand.logoUrl} alt={brand.name} className="max-h-full max-w-full" />
                            ) : (
                              <Stethoscope className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium group-hover:text-primary transition-colors">{brand.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {brand.organizations.length} {brand.organizations.length === 1 ? 'location' : 'locations'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center mt-4">
                  <Button
                    className="mt-2"
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    Connect to Provider
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

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
              </TabsContent>

              {/* Demo Tab */}
              <TabsContent value="demo" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Explore with Sample Data</h3>
                    <p className="text-muted-foreground mb-4">
                      Try out the application features with pre-populated health data. No account needed.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "View comprehensive medical records",
                        "Explore health analytics and visualizations",
                        "Identify care gaps and health insights",
                        "Chat with AI about health data (sample only)"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center text-sm text-foreground">
                          <Shield className="h-5 w-5 mr-2 text-green-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-center">
                    <div className="max-w-xs w-full">
                      {demoProvider ? (
                        <ConnectCard provider={demoProvider} />
                      ) : (
                        <Card className="overflow-hidden border-2 border-primary/50 shadow-md">
                          <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Database className="h-8 w-8 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-medium text-xl">Demo Patient</h3>
                                <p className="text-sm text-muted-foreground mb-4">Access sample health records</p>
                                <Button
                                  className="w-full"
                                  size="lg"
                                  onClick={() => setLocation('/dashboard')}
                                >
                                  Start Demo
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Search Tab */}
              <TabsContent value="search">
                <div className="text-center p-6 space-y-6">
                  <div className="mb-4">
                    <Search className="h-12 w-12 text-primary mx-auto mb-2" />
                    <h3 className="text-xl font-medium">Find Your Healthcare Provider</h3>
                    <p className="text-muted-foreground mt-2">
                      Search for your healthcare provider by name, location, or system
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
                    {[
                      { icon: Building2, label: "Health Systems", sub: "Major hospitals & networks" },
                      { icon: FilePlus2, label: "Insurance Providers", sub: "Claims & coverage data" },
                      { icon: FolderOpen, label: "Clinics & Specialists", sub: "Independent providers" }
                    ].map((item, i) => (
                      <Card key={i} className="flex-1 cursor-pointer hover:shadow-md transition-all hover:bg-muted/50" onClick={() => setLocation('/dashboard')}>
                        <CardContent className="p-6 flex flex-col items-center text-center">
                          <item.icon className="h-8 w-8 text-primary mb-2" />
                          <h4 className="font-medium">{item.label}</h4>
                          <p className="text-sm text-muted-foreground">{item.sub}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button
                    onClick={() => setLocation('/dashboard')}
                    className="mt-4"
                  >
                    Advanced Provider Search
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="bg-muted/30 border-t flex flex-col sm:flex-row sm:justify-between items-center p-4 gap-4">
            <div className="text-sm text-muted-foreground">
              <Shield className="inline-block h-4 w-4 mr-1 text-green-500" />
              Your health data remains private and secure
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setLocation('/about')}>
                Learn More
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setLocation('/tutorial')}>
                How It Works
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Shield, title: "Privacy First", desc: "Your health data is encrypted and secure. We use SMART on FHIR protocols to ensure your information remains private." },
            { icon: Building2, title: "Multiple Providers", desc: "Connect to multiple healthcare providers, hospitals, and insurance companies all in one secure platform." },
            { icon: Heart, title: "Health Insights", desc: "Gain valuable insights about your health with visualizations, care gap analysis, and personalized recommendations." }
          ].map((item, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <item.icon className="h-5 w-5 text-primary" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 w-full border-t">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center px-4">
          <div className="flex items-center mb-4 sm:mb-0">
            <LiaraLogo size="sm" className="mr-2" />
            <span className="font-medium text-foreground">Liara AI Health</span>
          </div>

          <div className="flex gap-6">
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer" onClick={() => setLocation('/about')}>About</span>
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer" onClick={() => setLocation('/tutorial')}>Tutorial</span>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}