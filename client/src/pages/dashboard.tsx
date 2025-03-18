import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Sidebar } from '@/components/health/Sidebar';
import { PatientSummary } from '@/components/health/PatientSummary';
import { PatientSummaryIPS } from '@/components/health/PatientSummaryIPS';
import { ConditionsSection } from '@/components/health/ConditionsSection';
import { ObservationsSection } from '@/components/health/ObservationsSection';
import { ConnectionDetails } from '@/components/health/ConnectionDetails';
import { ConnectSelector } from '@/components/health/ConnectSelector';
import { CareGapsSection } from '@/components/health/CareGapsSection';
import { InsuranceSection } from '@/components/health/InsuranceSection';
import { HealthFeed } from '@/components/health/HealthFeed';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { FhirExplorer } from '@/components/fhir/FhirExplorer';
import { ProviderDirectory } from '@/components/provider/ProviderDirectory';
import { ConnectedProviders } from '@/components/provider/ConnectedProviders';
import { ConnectedOrganizations } from '@/components/provider/ConnectedOrganizations';
import { ResearchDashboard } from '@/components/research/ResearchDashboard';
import { FhirVisualizations } from '@/components/visualizations/FhirVisualizations';
import { AdvancedAnalytics } from '@/components/analytics/AdvancedAnalytics';
import { MedicalLiterature } from '@/components/literature/MedicalLiterature';
import { completeSmartAuth, checkAuth, formatFhirDate } from '@/lib/fhir-client';
import { ErrorModal } from '@/components/auth/ErrorModal';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { TabNavigation } from '@/components/ui/tab-navigation';
import { useQuery } from '@tanstack/react-query';
import { UserSettings } from '@/components/settings/UserSettings';
import { AlertTriangle, Syringe } from 'lucide-react';
import { 
  Patient,
  Observation, 
  Condition, 
  MedicationRequest, 
  AllergyIntolerance, 
  Immunization,
  CareGap
} from '@shared/schema';

export default function Dashboard() {
  const [location, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);
  const [activeTab, setActiveTab] = useState(location.includes('#fhir-explorer') ? 'fhir-explorer' : 'health');
  const { toast } = useToast();
  
  // Fetch patient data for visualizations and feed
  const { data: patient } = useQuery<Patient>({ 
    queryKey: ['/api/fhir/patient'],
    enabled: !isLoading
  });
  
  const { data: conditions = [] as Condition[] } = useQuery<Condition[]>({
    queryKey: ['/api/fhir/condition'],
    enabled: !isLoading
  });
  
  const { data: observations = [] as Observation[] } = useQuery<Observation[]>({
    queryKey: ['/api/fhir/observation'],
    enabled: !isLoading
  });
  
  const { data: medications = [] as MedicationRequest[] } = useQuery<MedicationRequest[]>({
    queryKey: ['/api/fhir/medicationrequest'],
    enabled: !isLoading
  });
  
  const { data: allergies = [] as AllergyIntolerance[] } = useQuery<AllergyIntolerance[]>({
    queryKey: ['/api/fhir/allergyintolerance'],
    enabled: !isLoading
  });
  
  const { data: immunizations = [] as Immunization[] } = useQuery<Immunization[]>({
    queryKey: ['/api/fhir/immunization'],
    enabled: !isLoading
  });
  
  const { data: careGaps = [] as CareGap[] } = useQuery<CareGap[]>({
    queryKey: ['/api/fhir/care-gaps'],
    enabled: !isLoading
  });

  // Check if we're in an auth callback or if we're already authenticated
  useEffect(() => {
    const handleAuthFlow = async () => {
      try {
        setIsLoading(true);
        
        // First, see if there's an existing session
        const isAuthed = await checkAuth();
        
        if (isAuthed) {
          setIsLoading(false);
          return; // We're already authenticated
        }
        
        // If we're in a callback situation (we have a code and state in URL)
        if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
          // Complete the SMART auth flow
          await completeSmartAuth();
          
          // Clean up the URL by removing the query params
          window.history.replaceState({}, document.title, window.location.pathname);
          
          toast({
            title: "Connected Successfully",
            description: "You are now connected to your health records.",
          });
        } else {
          // If we're not in a callback and not already authenticated, redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error("Auth error:", error);
        setErrorMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
        setShowError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    handleAuthFlow();
  }, [navigate, toast]);

  // Handle closing error modal
  const handleCloseError = () => {
    setShowError(false);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-700">Loading your health records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row">
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          <Tabs 
            value={activeTab} 
            className="w-full"
          >
            <TabNavigation 
              activeTab={activeTab} 
              onTabChange={(tabId) => setActiveTab(tabId)} 
            />
            
            <TabsContent value="health" className="space-y-6">
              <PatientSummary />
              <HealthFeed 
                conditions={conditions as Condition[]}
                medications={medications as MedicationRequest[]}
                observations={observations as Observation[]}
                allergies={allergies as AllergyIntolerance[]}
                immunizations={immunizations as Immunization[]}
                careGaps={careGaps as CareGap[]}
              />
              <FhirVisualizations 
                observations={observations as Observation[]}
                conditions={conditions as Condition[]}
                medications={medications as MedicationRequest[]}
                allergies={allergies as AllergyIntolerance[]}
                immunizations={immunizations as Immunization[]}
              />
              <ConditionsSection />
              <ObservationsSection />
              <ConnectionDetails />
            </TabsContent>
            
            <TabsContent value="ips">
              <PatientSummaryIPS />
            </TabsContent>

            <TabsContent value="care-gaps">
              <CareGapsSection />
            </TabsContent>
            
            <TabsContent value="allergies">
              <div className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <AlertTriangle className="mr-2 h-6 w-6 text-red-500" />
                    Allergies & Intolerances
                  </h2>
                  
                  <div className="space-y-4">
                    {allergies.length === 0 ? (
                      <p className="text-gray-500">No allergies or intolerances found in your records.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allergies.map((allergy: AllergyIntolerance) => (
                          <div key={allergy.id} className="border rounded-lg p-4 bg-red-50">
                            <h3 className="font-medium text-red-700">
                              {allergy.code?.coding?.[0]?.display || 'Unknown Allergen'}
                            </h3>
                            <div className="mt-2 text-sm text-gray-700">
                              <div className="flex items-center">
                                <span className="font-medium mr-2">Severity:</span>
                                {allergy.reaction?.[0]?.severity === 'severe' ? (
                                  <span className="text-red-600 font-medium">Severe</span>
                                ) : allergy.reaction?.[0]?.severity === 'moderate' ? (
                                  <span className="text-orange-600 font-medium">Moderate</span>
                                ) : (
                                  <span className="text-yellow-600 font-medium">Mild</span>
                                )}
                              </div>
                              <div className="flex items-center mt-1">
                                <span className="font-medium mr-2">Type:</span>
                                <span>{allergy.type === 'allergy' ? 'Allergy' : 'Intolerance'}</span>
                              </div>
                              {allergy.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display && (
                                <div className="flex items-start mt-1">
                                  <span className="font-medium mr-2">Manifestation:</span>
                                  <span>{allergy.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="immunizations">
              <div className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Syringe className="mr-2 h-6 w-6 text-blue-500" />
                    Immunizations
                  </h2>
                  
                  <div className="space-y-4">
                    {immunizations.length === 0 ? (
                      <p className="text-gray-500">No immunization records found.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {immunizations.map((immunization: Immunization) => (
                          <div key={immunization.id} className="border rounded-lg p-4 bg-blue-50">
                            <h3 className="font-medium text-blue-700">
                              {immunization.vaccineCode?.coding?.[0]?.display || 'Unknown Vaccine'}
                            </h3>
                            <div className="mt-2 text-sm text-gray-700">
                              <div className="flex items-center">
                                <span className="font-medium mr-2">Date:</span>
                                <span>{immunization.occurrenceDateTime ? formatFhirDate(immunization.occurrenceDateTime) : 'Unknown'}</span>
                              </div>
                              <div className="flex items-center mt-1">
                                <span className="font-medium mr-2">Status:</span>
                                <span className={`${
                                  immunization.status === 'completed' ? 'text-green-600' : 
                                  immunization.status === 'entered-in-error' ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {immunization.status === 'completed' ? 'Completed' : 
                                   immunization.status === 'not-done' ? 'Not Done' :
                                   immunization.status === 'entered-in-error' ? 'Error' : 'Unknown'}
                                </span>
                              </div>
                              {/* Note: Remove note section as it's not in our schema */}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="insurance">
              <InsuranceSection />
            </TabsContent>
            
            <TabsContent value="visualizations" className="space-y-6">
              <FhirVisualizations 
                observations={observations as Observation[]}
                conditions={conditions as Condition[]}
                medications={medications as MedicationRequest[]}
                allergies={allergies as AllergyIntolerance[]}
                immunizations={immunizations as Immunization[]}
              />
            </TabsContent>
            
            <TabsContent value="activity-feed" className="space-y-6">
              <HealthFeed 
                conditions={conditions as Condition[]}
                medications={medications as MedicationRequest[]}
                observations={observations as Observation[]}
                allergies={allergies as AllergyIntolerance[]}
                immunizations={immunizations as Immunization[]}
                careGaps={careGaps as CareGap[]}
              />
            </TabsContent>
            
            <TabsContent value="trends" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold text-lg mb-4 text-primary">Health Trends</h3>
                  <p className="text-muted-foreground">
                    Track your health data over time with interactive trends analysis. See patterns, correlations, and progress 
                    toward your health goals.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold text-lg mb-4 text-primary">Longitudinal Analysis</h3>
                  <p className="text-muted-foreground">
                    Evaluate your health data across time to identify important changes and help you make informed decisions
                    about your care.
                  </p>
                </div>
              </div>
              <FhirVisualizations 
                observations={observations as Observation[]}
                conditions={conditions as Condition[]}
                medications={medications as MedicationRequest[]}
                allergies={allergies as AllergyIntolerance[]}
                immunizations={immunizations as Immunization[]}
              />
            </TabsContent>
            
            <TabsContent value="advanced-analytics" className="space-y-6">
              <AdvancedAnalytics
                observations={observations as Observation[]}
                conditions={conditions as Condition[]}
                medications={medications as MedicationRequest[]}
                allergies={allergies as AllergyIntolerance[]}
                immunizations={immunizations as Immunization[]}
              />
            </TabsContent>
            
            <TabsContent value="medical-literature" className="space-y-6">
              <MedicalLiterature
                conditions={conditions as Condition[]}
                medications={medications as MedicationRequest[]}
              />
            </TabsContent>
            
            <TabsContent value="fhir-explorer" className="h-[calc(100vh-160px)]">
              <div className="border rounded-lg overflow-hidden h-full bg-white">
                <FhirExplorer />
              </div>
            </TabsContent>
            
            <TabsContent value="providers">
              <ConnectedProviders />
            </TabsContent>
            
            <TabsContent value="organizations">
              <ConnectedOrganizations />
            </TabsContent>
            
            <TabsContent value="provider-directory">
              <ProviderDirectory />
            </TabsContent>
            
            <TabsContent value="research">
              <ResearchDashboard />
            </TabsContent>
            
            <TabsContent value="connect-records">
              <ConnectSelector />
            </TabsContent>
            
            <TabsContent value="chat">
              <ChatInterface />
            </TabsContent>
            
            <TabsContent value="settings">
              <UserSettings />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      <ErrorModal 
        isOpen={showError} 
        onClose={handleCloseError} 
        message={errorMessage} 
      />
    </div>
  );
}
