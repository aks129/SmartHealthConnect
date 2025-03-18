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
import { 
  AlertTriangle, 
  Syringe, 
  Pill, 
  PenTool, 
  Package, 
  ClipboardList, 
  TestTube, 
  Activity, 
  BarChart 
} from 'lucide-react';
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
            
            <TabsContent value="medications">
              <div className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Pill className="mr-2 h-6 w-6 text-blue-500" />
                    Medications Overview
                  </h2>
                  
                  <div className="space-y-4">
                    {medications.length === 0 ? (
                      <p className="text-gray-500">No medication information found in your records.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {medications.map((medication: MedicationRequest) => (
                          <div key={medication.id} className="border rounded-lg p-4 bg-blue-50">
                            <h3 className="font-medium text-blue-700">
                              {medication.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown Medication'}
                            </h3>
                            <div className="mt-2 text-sm text-gray-700">
                              <div className="flex items-center">
                                <span className="font-medium mr-2">Status:</span>
                                <span className={`${
                                  medication.status === 'active' ? 'text-green-600' : 
                                  medication.status === 'stopped' ? 'text-red-600' : 'text-gray-600'
                                } font-medium`}>
                                  {medication.status === 'active' ? 'Active' : 
                                  medication.status === 'stopped' ? 'Stopped' : 
                                  medication.status === 'completed' ? 'Completed' : 
                                  medication.status}
                                </span>
                              </div>
                              {medication.dosageInstruction && medication.dosageInstruction.length > 0 && (
                                <div className="flex items-start mt-1">
                                  <span className="font-medium mr-2">Instructions:</span>
                                  <span>{medication.dosageInstruction[0].text || 'No instructions provided'}</span>
                                </div>
                              )}
                              {medication.authoredOn && (
                                <div className="flex items-center mt-1">
                                  <span className="font-medium mr-2">Prescribed:</span>
                                  <span>{formatFhirDate(medication.authoredOn)}</span>
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
            
            <TabsContent value="prescriptions">
              <div className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <PenTool className="mr-2 h-6 w-6 text-indigo-500" />
                    Prescriptions
                  </h2>
                  
                  <div className="space-y-4">
                    {medications.length === 0 ? (
                      <p className="text-gray-500">No prescription information found in your records.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {medications.map((medication: MedicationRequest) => (
                          <div key={medication.id} className="border rounded-lg p-4 bg-indigo-50">
                            <div className="flex justify-between">
                              <h3 className="font-medium text-indigo-700">
                                {medication.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown Medication'}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                medication.status === 'active' ? 'bg-green-100 text-green-800' : 
                                medication.status === 'stopped' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {medication.status === 'active' ? 'Active' : 
                                medication.status === 'stopped' ? 'Stopped' : 
                                medication.status === 'completed' ? 'Completed' : 
                                medication.status}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-700">
                              {medication.dosageInstruction && medication.dosageInstruction.length > 0 && (
                                <div className="flex items-start mt-1">
                                  <span className="font-medium mr-2">Instructions:</span>
                                  <span>{medication.dosageInstruction[0].text || 'No instructions provided'}</span>
                                </div>
                              )}
                              {medication.authoredOn && (
                                <div className="flex items-center mt-1">
                                  <span className="font-medium mr-2">Prescribed:</span>
                                  <span>{formatFhirDate(medication.authoredOn)}</span>
                                </div>
                              )}
                              {/* Prescriber info is not in our current schema */}
                              <div className="flex items-center mt-1">
                                <span className="font-medium mr-2">Prescriber:</span>
                                <span>Primary Provider</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="dispenses">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center">
                  <Package className="mr-2 h-6 w-6 text-purple-500" />
                  Medication Dispenses
                </h2>
                <p className="text-gray-700">
                  This section would display information about how your medications were dispensed by pharmacies.
                  Currently, no dispensing information is available in your records.
                </p>
                <div className="mt-4 p-4 border-l-4 border-amber-400 bg-amber-50">
                  <h3 className="text-amber-700 font-medium">Information</h3>
                  <p className="text-amber-700 text-sm mt-1">
                    Dispensing records typically come from pharmacy systems and may not be available in all electronic health record exports.
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="statements">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center">
                  <ClipboardList className="mr-2 h-6 w-6 text-teal-500" />
                  Medication Statements
                </h2>
                <p className="text-gray-700">
                  This section would display statements about medications you are taking, have taken, or plan to take,
                  including over-the-counter medications and supplements that may not have formal prescriptions.
                </p>
                <div className="mt-4 p-4 border-l-4 border-amber-400 bg-amber-50">
                  <h3 className="text-amber-700 font-medium">Information</h3>
                  <p className="text-amber-700 text-sm mt-1">
                    Medication statements are often collected during medical visits when providers ask about current medications.
                    No medication statements are currently available in your records.
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="lab-results">
              <div className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <TestTube className="mr-2 h-6 w-6 text-indigo-500" />
                    Laboratory Results
                  </h2>
                  
                  <div className="space-y-4">
                    {observations.filter(obs => 
                      obs.code?.coding?.some(code => 
                        // Common lab test LOINC codes
                        code.code === '2093-3' || // Cholesterol
                        code.code === '2085-9' || // HDL
                        code.code === '2089-1' || // LDL
                        code.code === '6301-6' || // INR
                        code.code === '4548-4' || // HbA1c
                        code.code === '2823-3'    // Potassium
                      )
                    ).length === 0 ? (
                      <p className="text-gray-500">No laboratory results found in your records.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Range</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {observations.filter(obs => 
                              obs.code?.coding?.some(code => 
                                // Common lab test LOINC codes
                                code.code === '2093-3' || // Cholesterol
                                code.code === '2085-9' || // HDL
                                code.code === '2089-1' || // LDL
                                code.code === '6301-6' || // INR
                                code.code === '4548-4' || // HbA1c
                                code.code === '2823-3'    // Potassium
                              )
                            ).map((observation: Observation) => (
                              <tr key={observation.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {observation.code?.coding?.[0]?.display || 'Unknown Test'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {observation.valueQuantity ? 
                                    `${observation.valueQuantity.value} ${observation.valueQuantity.unit || ''}` : 
                                    observation.valueString || 'No value recorded'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {observation.referenceRange && observation.referenceRange.length > 0 ? 
                                    `${observation.referenceRange[0].low?.value || ''} - ${observation.referenceRange[0].high?.value || ''} ${observation.referenceRange[0].high?.unit || ''}` : 
                                    'Not specified'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {observation.effectiveDateTime ? formatFhirDate(observation.effectiveDateTime) : 'Unknown date'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    observation.status === 'final' ? 'bg-green-100 text-green-800' : 
                                    observation.status === 'preliminary' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {observation.status === 'final' ? 'Final' : 
                                     observation.status === 'preliminary' ? 'Preliminary' : 
                                     observation.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="vital-signs">
              <div className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Activity className="mr-2 h-6 w-6 text-green-500" />
                    Vital Signs
                  </h2>
                  
                  <div className="space-y-4">
                    {observations.filter(obs => 
                      obs.code?.coding?.some(code => 
                        // Common vital signs LOINC codes
                        code.code === '8867-4' || // Heart rate
                        code.code === '8310-5' || // Body temperature
                        code.code === '8480-6' || // Systolic blood pressure
                        code.code === '8462-4' || // Diastolic blood pressure
                        code.code === '9279-1' || // Respiratory rate
                        code.code === '59408-5'   // Oxygen saturation
                      )
                    ).length === 0 ? (
                      <p className="text-gray-500">No vital signs found in your records.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vital Sign</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {observations.filter(obs => 
                              obs.code?.coding?.some(code => 
                                // Common vital signs LOINC codes
                                code.code === '8867-4' || // Heart rate
                                code.code === '8310-5' || // Body temperature
                                code.code === '8480-6' || // Systolic blood pressure
                                code.code === '8462-4' || // Diastolic blood pressure
                                code.code === '9279-1' || // Respiratory rate
                                code.code === '59408-5'   // Oxygen saturation
                              )
                            ).map((observation: Observation) => (
                              <tr key={observation.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {observation.code?.coding?.[0]?.display || 'Unknown Vital Sign'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {observation.valueQuantity ? 
                                    `${observation.valueQuantity.value} ${observation.valueQuantity.unit || ''}` : 
                                    observation.valueString || 'No value recorded'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {observation.effectiveDateTime ? formatFhirDate(observation.effectiveDateTime) : 'Unknown date'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="blood-pressure">
              <div className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <BarChart className="mr-2 h-6 w-6 text-red-500" />
                    Blood Pressure History
                  </h2>
                  
                  <div className="space-y-4">
                    {observations.filter(obs => 
                      obs.code?.coding?.some(code => 
                        code.code === '85354-9' || // Blood pressure panel
                        code.code === '8480-6' ||  // Systolic blood pressure
                        code.code === '8462-4'     // Diastolic blood pressure
                      )
                    ).length === 0 ? (
                      <p className="text-gray-500">No blood pressure measurements found in your records.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        <div className="h-80 bg-gray-50 rounded-lg p-4">
                          <p className="text-center text-gray-700 font-medium">Blood Pressure Trend Chart would display here</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Systolic</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diastolic</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {observations.filter(obs => 
                                obs.code?.coding?.some(code => 
                                  code.code === '85354-9' // Blood pressure panel
                                )
                              ).map((observation: Observation) => {
                                // Get systolic and diastolic values from separate observations with matching dates
                                const effectiveDate = observation.effectiveDateTime;
                                
                                // Find matching systolic and diastolic observations
                                const systolicObs = observations.find(obs => 
                                  obs.code?.coding?.some(code => code.code === '8480-6') &&
                                  obs.effectiveDateTime === effectiveDate
                                );
                                
                                const diastolicObs = observations.find(obs => 
                                  obs.code?.coding?.some(code => code.code === '8462-4') &&
                                  obs.effectiveDateTime === effectiveDate
                                );
                                
                                return (
                                  <tr key={observation.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      {observation.effectiveDateTime ? formatFhirDate(observation.effectiveDateTime) : 'Unknown date'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      {systolic?.valueQuantity ? 
                                        `${systolic.valueQuantity.value} ${systolic.valueQuantity.unit || 'mmHg'}` : 
                                        'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      {diastolic?.valueQuantity ? 
                                        `${diastolic.valueQuantity.value} ${diastolic.valueQuantity.unit || 'mmHg'}` : 
                                        'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        (systolic?.valueQuantity?.value || 0) > 140 || (diastolic?.valueQuantity?.value || 0) > 90 ? 
                                          'bg-red-100 text-red-800' : 
                                          'bg-green-100 text-green-800'
                                      }`}>
                                        {(systolic?.valueQuantity?.value || 0) > 140 || (diastolic?.valueQuantity?.value || 0) > 90 ? 
                                          'Elevated' : 'Normal'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="weight-bmi">
              <div className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <BarChart className="mr-2 h-6 w-6 text-blue-500" />
                    Weight & BMI History
                  </h2>
                  
                  <div className="space-y-4">
                    {observations.filter(obs => 
                      obs.code?.coding?.some(code => 
                        code.code === '29463-7' || // Weight
                        code.code === '39156-5' || // BMI
                        code.code === '8302-2'     // Height
                      )
                    ).length === 0 ? (
                      <p className="text-gray-500">No weight or BMI measurements found in your records.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        <div className="h-80 bg-gray-50 rounded-lg p-4">
                          <p className="text-center text-gray-700 font-medium">Weight & BMI Trend Chart would display here</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Height</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BMI</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {observations.filter(obs => 
                                obs.code?.coding?.some(code => 
                                  code.code === '29463-7' // Weight
                                )
                              ).map((observation: Observation) => {
                                // Find matching height and BMI measurements by date
                                const effectiveDate = observation.effectiveDateTime;
                                
                                const heightObs = observations.find(obs => 
                                  obs.code?.coding?.some(code => code.code === '8302-2') &&
                                  obs.effectiveDateTime === effectiveDate
                                );
                                
                                const bmiObs = observations.find(obs => 
                                  obs.code?.coding?.some(code => code.code === '39156-5') &&
                                  obs.effectiveDateTime === effectiveDate
                                );
                                
                                return (
                                  <tr key={observation.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      {effectiveDate ? formatFhirDate(effectiveDate) : 'Unknown date'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      {observation.valueQuantity ? 
                                        `${observation.valueQuantity.value} ${observation.valueQuantity.unit || 'kg'}` : 
                                        'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      {heightObs?.valueQuantity ? 
                                        `${heightObs.valueQuantity.value} ${heightObs.valueQuantity.unit || 'cm'}` : 
                                        'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      {bmiObs?.valueQuantity ? 
                                        `${bmiObs.valueQuantity.value} ${bmiObs.valueQuantity.unit || 'kg/m²'}` : 
                                        'N/A'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
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
