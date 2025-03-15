import React from 'react';
import { ConnectCard } from '@/components/health/ConnectCard';
import { Heart } from 'lucide-react';

export default function Home() {
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
      
      {/* Connect Card Component */}
      <ConnectCard />
      
      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>SMART on FHIR Health Records Viewer</p>
        <p className="mt-1">Your data remains private and secure</p>
      </footer>
    </div>
  );
}
