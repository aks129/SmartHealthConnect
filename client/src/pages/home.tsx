import React from 'react';
import { ConnectCard } from '@/components/health/ConnectCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Database } from 'lucide-react';
import { fhirProviders } from '@/lib/providers';

export default function Home() {
  // Get the demo provider for the home page
  const demoProvider = fhirProviders.find(p => p.id === 'demo');
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 bg-gray-50">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <Heart className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">Health Records Connect</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Securely access and view your health records using SMART on FHIR technology
        </p>
      </header>
      
      <div className="w-full max-w-md mx-auto">
        {/* Connect Card Component */}
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
        
        {/* Additional text */}
        <p className="mt-4 text-center text-gray-600">
          Connect to the demo provider to explore the application features,
          or <a href="/dashboard" className="text-primary hover:underline">visit your dashboard</a> if you're already connected.
        </p>
      </div>
      
      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>SMART on FHIR Health Records Viewer</p>
        <p className="mt-1">Your data remains private and secure</p>
      </footer>
    </div>
  );
}
