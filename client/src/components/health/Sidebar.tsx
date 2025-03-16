import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  User,
  ChevronRight,
  ChevronDown,
  Clipboard,
  ClipboardList,
  FileText,
  Stethoscope,
  LineChart,
  BarChart,
  CalendarCheck,
  PenTool,
  Package,
  FlaskConical,
  Beaker
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Patient } from '@shared/schema';

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [openCategories, setOpenCategories] = useState({
    medications: false,
    laboratory: false,
    diagnostics: false,
    vitals: false
  });
  
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
        <ul className="space-y-2">
          {/* Summary */}
          <li>
            <Link href="#summary">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#summary') || !location.includes('#') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Activity className="mr-3 h-5 w-5" />
                <span>Summary</span>
              </a>
            </Link>
          </li>
          
          {/* Conditions */}
          <li>
            <Link href="#conditions">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#conditions') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Stethoscope className="mr-3 h-5 w-5" />
                <span>Conditions</span>
              </a>
            </Link>
          </li>
          
          {/* Laboratory & Diagnostics */}
          <li>
            <Collapsible 
              open={openCategories.laboratory} 
              onOpenChange={(open) => setOpenCategories({...openCategories, laboratory: open})}
              className="w-full"
            >
              <CollapsibleTrigger className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${location.includes('#lab') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <div className="flex items-center">
                  <FlaskConical className="mr-3 h-5 w-5" />
                  <span>Laboratory & Diagnostics</span>
                </div>
                {openCategories.laboratory ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 pr-2 mt-1 space-y-1">
                <Link href="#lab-orders">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#lab-orders') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Clipboard className="mr-2 h-4 w-4" />
                    <span>Lab Orders</span>
                  </a>
                </Link>
                <Link href="#service-requests">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#service-requests') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <span>Service Requests</span>
                  </a>
                </Link>
                <Link href="#diagnostic-reports">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#diagnostic-reports') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Diagnostic Reports</span>
                  </a>
                </Link>
                <Link href="#observations">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#observations') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <TestTube className="mr-2 h-4 w-4" />
                    <span>Lab Results</span>
                  </a>
                </Link>
              </CollapsibleContent>
            </Collapsible>
          </li>
          
          {/* Vitals */}
          <li>
            <Collapsible 
              open={openCategories.vitals} 
              onOpenChange={(open) => setOpenCategories({...openCategories, vitals: open})}
              className="w-full"
            >
              <CollapsibleTrigger className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${location.includes('#vitals') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <div className="flex items-center">
                  <LineChart className="mr-3 h-5 w-5" />
                  <span>Vital Signs</span>
                </div>
                {openCategories.vitals ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 pr-2 mt-1 space-y-1">
                <Link href="#vital-signs">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#vital-signs') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Activity className="mr-2 h-4 w-4" />
                    <span>All Vitals</span>
                  </a>
                </Link>
                <Link href="#vital-blood-pressure">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#vital-blood-pressure') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <BarChart className="mr-2 h-4 w-4" />
                    <span>Blood Pressure</span>
                  </a>
                </Link>
                <Link href="#vital-weight">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#vital-weight') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <BarChart className="mr-2 h-4 w-4" />
                    <span>Weight & BMI</span>
                  </a>
                </Link>
              </CollapsibleContent>
            </Collapsible>
          </li>
          
          {/* Medications */}
          <li>
            <Collapsible 
              open={openCategories.medications} 
              onOpenChange={(open) => setOpenCategories({...openCategories, medications: open})}
              className="w-full"
            >
              <CollapsibleTrigger className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${location.includes('#medications') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <div className="flex items-center">
                  <Pill className="mr-3 h-5 w-5" />
                  <span>Medications</span>
                </div>
                {openCategories.medications ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 pr-2 mt-1 space-y-1">
                <Link href="#medication-requests">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#medication-requests') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <PenTool className="mr-2 h-4 w-4" />
                    <span>Prescriptions</span>
                  </a>
                </Link>
                <Link href="#medication-dispenses">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#medication-dispenses') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Package className="mr-2 h-4 w-4" />
                    <span>Dispenses</span>
                  </a>
                </Link>
                <Link href="#medication-statements">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#medication-statements') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <span>Statements</span>
                  </a>
                </Link>
              </CollapsibleContent>
            </Collapsible>
          </li>
          
          {/* Allergies */}
          <li>
            <Link href="#allergies">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#allergies') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <AlertTriangle className="mr-3 h-5 w-5" />
                <span>Allergies</span>
              </a>
            </Link>
          </li>
          
          {/* Immunizations */}
          <li>
            <Link href="#immunizations">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#immunizations') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Syringe className="mr-3 h-5 w-5" />
                <span>Immunizations</span>
              </a>
            </Link>
          </li>
          
          {/* Care Gaps */}
          <li>
            <Link href="#care-gaps">
              <a className={`flex items-center px-3 py-2 rounded-lg ${location.includes('#care-gaps') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <AlertTriangle className="mr-3 h-5 w-5" />
                <span>Care Gaps</span>
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
