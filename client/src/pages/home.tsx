import React from 'react';
import { ConnectCard } from '@/components/health/ConnectCard';
import { ConnectSelector } from '@/components/health/ConnectSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Database, Stethoscope, Shield, ChevronRight } from 'lucide-react';
import { fhirProviders, epicBrands } from '@/lib/providers';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Home() {
  // Get the demo provider for the home page
  const demoProvider = fhirProviders.find(p => p.id === 'demo');
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-gray-50">
      {/* Header */}
      <header className="w-full max-w-5xl mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <Heart className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">Health Records Connect</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Securely access and view your health records using SMART on FHIR technology
        </p>
      </header>
      
      <div className="w-full max-w-5xl mx-auto">
        {/* Quick Connect Demo */}
        <div className="mb-12 p-4 bg-white border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Start with Demo Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-1">
              {demoProvider ? (
                <ConnectCard provider={demoProvider} />
              ) : (
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <Database className="h-8 w-8 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base truncate">Demo Connection</h3>
                        <p className="text-sm text-gray-500 truncate">Connect to a sample dataset</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button 
                        className="w-full"
                        size="sm"
                        onClick={() => window.location.href = '/dashboard'}
                      >
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="col-span-1 md:col-span-2 flex flex-col justify-center">
              <h3 className="text-lg font-medium mb-2">Explore with Sample Data</h3>
              <p className="text-gray-600 mb-4">
                Try out the application features with pre-populated health data. No account needed.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-700">
                  <Shield className="h-4 w-4 mr-2 text-green-500" />
                  View medical conditions, lab results, and more
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <Shield className="h-4 w-4 mr-2 text-green-500" />
                  Explore health analytics and visualizations
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <Shield className="h-4 w-4 mr-2 text-green-500" />
                  Chat with AI about health data (sample only)
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Connect to Real Health Records */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Connect to Your Real Health Records</h2>
          
          {/* Epic Healthcare Systems */}
          <div className="mb-8 p-4 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-4">Popular Healthcare Systems</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {epicBrands.slice(0, 6).map((brand) => (
                <Card 
                  key={brand.id} 
                  className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
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
            
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/dashboard'}
                className="inline-flex items-center"
              >
                View All Healthcare Connections
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Full Connect Selector for wider screens */}
          {!isMobile && (
            <ConnectSelector />
          )}
          
          {/* For mobile, show a button to dashboard */}
          {isMobile && (
            <div className="text-center mb-8">
              <p className="mb-4 text-gray-600">
                Connect to more healthcare systems, pharmacies, insurance providers and more
              </p>
              <Button 
                size="lg"
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Connection Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>SMART on FHIR Health Records Viewer</p>
        <p className="mt-1">Your data remains private and secure</p>
        <div className="flex justify-center gap-4 mt-3">
          <a href="/about" className="text-primary hover:underline hover:text-primary/80">About Health Connect</a>
          <a href="/tutorial" className="text-primary hover:underline hover:text-primary/80">Tutorial</a>
        </div>
      </footer>
    </div>
  );
}
