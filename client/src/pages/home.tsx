import React from 'react';
import { Link } from 'wouter';
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
  HelpCircle
} from 'lucide-react';
import { fhirProviders, epicBrands } from '@/lib/providers';
import { LiaraLogo } from "@/components/ui/liara-logo";

export default function Home() {
  // Get the demo provider for the home page
  const demoProvider = fhirProviders.find(p => p.id === 'demo');

  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-gray-50">
      {/* Header */}
      <header className="w-full max-w-4xl mb-6 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Liara AI Health</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your secure gateway to comprehensive health records
        </p>
      </header>

      {/* Main navigation */}
      <div className="w-full max-w-4xl mb-6">
        <div className="flex justify-center space-x-4">
          <Link href="/about">
            <Button variant="ghost" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              About
            </Button>
          </Link>
          <Link href="/tutorial">
            <Button variant="ghost" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Tutorial
            </Button>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full max-w-4xl mx-auto">
        <Card className="mb-8 shadow-sm border-primary/20">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-2xl">Get Started</CardTitle>
            <CardDescription>Connect to your health records or try a demo</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Tabs defaultValue="connect" className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="connect" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>Healthcare Providers</span>
                </TabsTrigger>
                <TabsTrigger value="demo" className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  <span>Try Demo</span>
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span>Find Provider</span>
                </TabsTrigger>
              </TabsList>

              {/* Provider Connections Tab */}
              <TabsContent value="connect" className="space-y-4">
                <h3 className="text-lg font-medium">Popular Healthcare Systems</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {epicBrands.slice(0, 6).map((brand) => (
                    <Card 
                      key={brand.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-all hover:border-primary"
                      onClick={() => window.location.href = '/dashboard'}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 flex-shrink-0 bg-white rounded-md border p-1 flex items-center justify-center">
                            {brand.logoUrl ? (
                              <img src={brand.logoUrl} alt={brand.name} className="max-h-full max-w-full" />
                            ) : (
                              <Stethoscope className="h-8 w-8 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{brand.name}</h3>
                            <p className="text-xs text-gray-500">
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
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    View All Healthcare Providers
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Demo Tab */}
              <TabsContent value="demo" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Explore with Sample Data</h3>
                    <p className="text-gray-600 mb-4">
                      Try out the application features with pre-populated health data. No account needed.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-center text-sm text-gray-700">
                        <Shield className="h-5 w-5 mr-2 text-green-500" />
                        <span>View comprehensive medical records</span>
                      </li>
                      <li className="flex items-center text-sm text-gray-700">
                        <Shield className="h-5 w-5 mr-2 text-green-500" />
                        <span>Explore health analytics and visualizations</span>
                      </li>
                      <li className="flex items-center text-sm text-gray-700">
                        <Shield className="h-5 w-5 mr-2 text-green-500" />
                        <span>Identify care gaps and health insights</span>
                      </li>
                      <li className="flex items-center text-sm text-gray-700">
                        <Shield className="h-5 w-5 mr-2 text-green-500" />
                        <span>Chat with AI about health data (sample only)</span>
                      </li>
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
                                <p className="text-sm text-gray-500 mb-4">Access sample health records</p>
                                <Button 
                                  className="w-full"
                                  size="lg"
                                  onClick={() => window.location.href = '/dashboard'}
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
                    <p className="text-gray-600 mt-2">
                      Search for your healthcare provider by name, location, or system
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
                    <Card className="flex-1 cursor-pointer hover:shadow-md transition-all" onClick={() => window.location.href = '/dashboard'}>
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <Building2 className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Health Systems</h4>
                        <p className="text-sm text-gray-500">Major hospitals & networks</p>
                      </CardContent>
                    </Card>

                    <Card className="flex-1 cursor-pointer hover:shadow-md transition-all" onClick={() => window.location.href = '/dashboard'}>
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <FilePlus2 className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Insurance Providers</h4>
                        <p className="text-sm text-gray-500">Claims & coverage data</p>
                      </CardContent>
                    </Card>

                    <Card className="flex-1 cursor-pointer hover:shadow-md transition-all" onClick={() => window.location.href = '/dashboard'}>
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <FolderOpen className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Clinics & Specialists</h4>
                        <p className="text-sm text-gray-500">Independent providers</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="mt-4"
                  >
                    Advanced Provider Search
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="bg-gray-50 border-t flex flex-col sm:flex-row sm:justify-between items-center p-4 gap-4">
            <div className="text-sm text-gray-500">
              <Shield className="inline-block h-4 w-4 mr-1 text-green-500" />
              Your health data remains private and secure
            </div>
            <div className="flex gap-3">
              <Link href="/about">
                <Button variant="outline" size="sm" className="text-xs">
                  Learn More
                </Button>
              </Link>
              <Link href="/tutorial">
                <Button variant="outline" size="sm" className="text-xs">
                  How It Works
                </Button>
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Privacy First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Your health data is encrypted and secure. We use SMART on FHIR protocols to ensure your information remains private.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Multiple Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Connect to multiple healthcare providers, hospitals, and insurance companies all in one secure platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Health Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Gain valuable insights about your health with visualizations, care gap analysis, and personalized recommendations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 w-full border-t">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center px-4">
          <div className="flex items-center mb-4 sm:mb-0">
            <LiaraLogo size="sm" className="mr-2" />
            <span className="font-medium text-gray-700">Liara AI Health</span>
          </div>

          <div className="flex gap-6">
            <Link href="/about" className="text-sm text-gray-600 hover:text-primary">
              About
            </Link>
            <Link href="/tutorial" className="text-sm text-gray-600 hover:text-primary">
              Tutorial
            </Link>
            <a href="#" className="text-sm text-gray-600 hover:text-primary">Privacy</a>
            <a href="#" className="text-sm text-gray-600 hover:text-primary">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}