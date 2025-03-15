import React from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { formatFhirDate, getPatientName, endSession } from "@/lib/fhir-client";
import { 
  Activity, 
  Pill, 
  TestTube, 
  AlertTriangle, 
  Syringe, 
  Heart, 
  ShieldCheck, 
  LogOut,
  User
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Patient } from '@shared/schema';

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { data: patient } = useQuery<Patient>({
    queryKey: ['/api/fhir/patient'],
  });

  const handleDisconnect = async () => {
    try {
      await endSession();
      setLocation('/');
      toast({
        title: "Disconnected",
        description: "You've been securely disconnected from your health records.",
      });
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="bg-white shadow md:w-64 md:fixed md:h-screen md:overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center">
          <Heart className="h-5 w-5 text-primary mr-2" />
          <h1 className="text-xl font-bold text-gray-800">Health Records</h1>
        </div>
      </div>
      
      {/* Patient info summary */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center mb-2">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-medium">{patient ? getPatientName(patient) : 'Loading...'}</h2>
            <p className="text-sm text-gray-500">{patient?.birthDate ? formatFhirDate(patient.birthDate) : 'Unknown DOB'}</p>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-600 mt-2">
          <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
          <span>Connected securely</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-1">
          <li>
            <Link href="#summary">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#summary') || !location.includes('#') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Activity className="mr-3 h-5 w-5" />
                <span>Summary</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="#conditions">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#conditions') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Activity className="mr-3 h-5 w-5" />
                <span>Conditions</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="#observations">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#observations') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <TestTube className="mr-3 h-5 w-5" />
                <span>Lab Results</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="#medications">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#medications') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Pill className="mr-3 h-5 w-5" />
                <span>Medications</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="#allergies">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#allergies') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <AlertTriangle className="mr-3 h-5 w-5" />
                <span>Allergies</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="#immunizations">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#immunizations') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Syringe className="mr-3 h-5 w-5" />
                <span>Immunizations</span>
              </a>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="p-4 mt-auto border-t border-gray-100">
        <Button 
          variant="outline"
          className="w-full"
          onClick={handleDisconnect}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
      </div>
    </aside>
  );
}
