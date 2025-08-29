import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from "../ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { formatFhirDate, getPatientName, endSession } from "../../lib/fhir-client";
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
  Beaker,
  CreditCard,
  Receipt,
  Files,
  Building2,
  DollarSign,
  Database,
  ServerCog,
  MessageSquare,
  Settings,
  BarChart3, // Added for Advanced Analytics
  Target,   // Added for Diabetes Dashboard
  Users,    // Added for Community Challenges
  Brain     // Added for Readiness Score
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { ThemeToggle } from "../ui/theme-toggle";
import type { Patient } from '@shared/schema';
import { LiaraLogo } from "@/components/ui/liara-logo";

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function Sidebar({ activeTab = 'health', onTabChange }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [openCategories, setOpenCategories] = useState({
    medications: false,
    laboratory: false,
    diagnostics: false,
    vitals: false,
    insurance: false,
    fhirServer: false
  });

  const { data: patient } = useQuery<Patient>({
    queryKey: ['/api/fhir/patient'],
  });

  const { toast } = useToast();

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
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <LiaraLogo size="md" className="text-slate-800" />
          <p className="text-sm text-slate-600 mt-2 font-medium">Healthcare Data Platform</p>
        </div>

      {/* Patient info summary */}
      <div className="m-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 mr-3">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">{patient ? getPatientName(patient) : 'Loading...'}</h2>
            <p className="text-sm text-slate-500">{patient?.birthDate ? formatFhirDate(patient.birthDate) : 'Unknown DOB'}</p>
          </div>
        </div>
        <div className="flex items-center text-sm text-green-600 mt-3 bg-green-50 rounded-lg px-3 py-2">
          <ShieldCheck className="mr-2 h-4 w-4" />
          <span className="font-medium">Connected securely</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {/* Summary */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'health' 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => onTabChange?.('health')}
            >
              <Activity className="mr-3 h-5 w-5" />
              <span>Summary</span>
            </Button>
          </li>

          {/* Conditions */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 py-2 ${activeTab === 'conditions' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => onTabChange?.('conditions')}
            >
              <Stethoscope className="mr-3 h-5 w-5" />
              <span>Conditions</span>
            </Button>
          </li>

          {/* Laboratory & Diagnostics */}
          <li>
            <Collapsible 
              open={openCategories.laboratory} 
              onOpenChange={(open) => setOpenCategories({...openCategories, laboratory: open})}
              className="w-full"
            >
              <CollapsibleTrigger className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${activeTab === 'laboratory' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
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
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'lab-orders' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('lab-orders')}
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  <span>Lab Orders</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'service-requests' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('service-requests')}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  <span>Service Requests</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'diagnostic-reports' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('diagnostic-reports')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Diagnostic Reports</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'lab-results' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('lab-results')}
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  <span>Lab Results</span>
                </Button>
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
              <CollapsibleTrigger className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${activeTab === 'vitals' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
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
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'vital-signs' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('vital-signs')}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  <span>All Vitals</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'blood-pressure' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('blood-pressure')}
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  <span>Blood Pressure</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'weight-bmi' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('weight-bmi')}
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  <span>Weight & BMI</span>
                </Button>
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
              <CollapsibleTrigger className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${activeTab === 'medications' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
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
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'prescriptions' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('prescriptions')}
                >
                  <PenTool className="mr-2 h-4 w-4" />
                  <span>Prescriptions</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'dispenses' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('dispenses')}
                >
                  <Package className="mr-2 h-4 w-4" />
                  <span>Dispenses</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2 text-sm ${activeTab === 'statements' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => onTabChange?.('statements')}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  <span>Statements</span>
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </li>

          {/* Allergies */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 py-2 ${activeTab === 'allergies' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => onTabChange?.('allergies')}
            >
              <AlertTriangle className="mr-3 h-5 w-5" />
              <span>Allergies</span>
            </Button>
          </li>

          {/* Immunizations */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 py-2 ${activeTab === 'immunizations' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => onTabChange?.('immunizations')}
            >
              <Syringe className="mr-3 h-5 w-5" />
              <span>Immunizations</span>
            </Button>
          </li>

          {/* Care Gaps */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 py-2 ${activeTab === 'care-gaps' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => onTabChange?.('care-gaps')}
            >
              <AlertTriangle className="mr-3 h-5 w-5" />
              <span>Care Gaps</span>
            </Button>
          </li>

          {/* Health Insurance */}
          <li>
            <Collapsible 
              open={openCategories.insurance} 
              onOpenChange={(open) => setOpenCategories({...openCategories, insurance: open})}
              className="w-full"
            >
              <CollapsibleTrigger className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${location.includes('#insurance') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <div className="flex items-center">
                  <CreditCard className="mr-3 h-5 w-5" />
                  <span>Health Insurance</span>
                </div>
                {openCategories.insurance ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 pr-2 mt-1 space-y-1">
                <Link href="#insurance-coverage">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#insurance-coverage') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Coverage Plans</span>
                  </a>
                </Link>
                <Link href="#insurance-claims">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#insurance-claims') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Receipt className="mr-2 h-4 w-4" />
                    <span>Claims</span>
                  </a>
                </Link>
                <Link href="#insurance-benefits">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#insurance-benefits') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Benefits & Eligibility</span>
                  </a>
                </Link>
                <Link href="#insurance-explanation">
                  <a className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#insurance-explanation') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Files className="mr-2 h-4 w-4" />
                    <span>Explanation of Benefits</span>
                  </a>
                </Link>
              </CollapsibleContent>
            </Collapsible>
          </li>

          {/* FHIR Server Explorer */}
          <li>
            <Collapsible
              open={openCategories.fhirServer}
              onOpenChange={(open) => setOpenCategories({...openCategories, fhirServer: open})}
              className="w-full"
            >
              <CollapsibleTrigger className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${location.includes('#fhir-explorer') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <div className="flex items-center">
                  <Database className="mr-3 h-5 w-5" />
                  <span>FHIR Server</span>
                </div>
                {openCategories.fhirServer ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 pr-2 mt-1 space-y-1">
                <Link href="#fhir-explorer">
                  <a 
                    className={`flex items-center px-3 py-2 rounded-lg text-sm ${location.includes('#fhir-explorer') ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => {
                      // Force the tab to switch to FHIR Explorer 
                      const tabElements = document.querySelectorAll('[data-state="inactive"][value="fhir-explorer"]');
                      if (tabElements.length > 0) {
                        (tabElements[0] as HTMLElement).click();
                      }
                    }}
                  >
                    <ServerCog className="mr-2 h-4 w-4" />
                    <span>Resource Explorer</span>
                  </a>
                </Link>
              </CollapsibleContent>
            </Collapsible>
          </li>

          {/* Advanced Analytics */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 py-2 ${activeTab === 'advanced-analytics' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => onTabChange?.('advanced-analytics')}
            >
              <BarChart3 className="mr-3 h-5 w-5" />
              <span>Advanced Analytics</span>
            </Button>
          </li>
          
          {/* Diabetes Dashboard */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 py-2 ${activeTab === 'diabetes-dashboard' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => onTabChange?.('diabetes-dashboard')}
            >
              <Target className="mr-3 h-5 w-5" />
              <span>Diabetes Dashboard</span>
            </Button>
          </li>

          {/* Community Challenges */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 py-2 ${activeTab === 'community-challenges' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => onTabChange?.('community-challenges')}
            >
              <Users className="mr-3 h-5 w-5" />
              <span>Community Challenges</span>
            </Button>
          </li>

          {/* Readiness Score */}
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 py-2 ${activeTab === 'readiness-score' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => onTabChange?.('readiness-score')}
            >
              <Brain className="mr-3 h-5 w-5" />
              <span>Readiness Score</span>
            </Button>
          </li>
        </ul>
      </nav>

      <div className="p-4 mt-auto border-t border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-500">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex gap-2 mb-3">
          <Button 
            variant="ghost"
            className="w-1/2 text-sm"
            onClick={() => setLocation('/about')}
          >
            <FileText className="mr-2 h-4 w-4" />
            About
          </Button>
          <Button 
            variant="ghost"
            className="w-1/2 text-sm"
            onClick={() => setLocation('/tutorial')}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Tutorial
          </Button>
        </div>
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