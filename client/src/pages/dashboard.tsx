import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Sidebar } from '@/components/health/Sidebar';
import { PatientSummary } from '@/components/health/PatientSummary';
import { PatientSummaryIPS } from '@/components/health/PatientSummaryIPS';
import { ConditionsSection } from '@/components/health/ConditionsSection';
import { ObservationsSection } from '@/components/health/ObservationsSection';
import { ConnectionDetails } from '@/components/health/ConnectionDetails';
import { CareGapsSection } from '@/components/health/CareGapsSection';
import { InsuranceSection } from '@/components/health/InsuranceSection';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { FhirExplorer } from '@/components/fhir/FhirExplorer';
import { ProviderDirectory } from '@/components/provider/ProviderDirectory';
import { ConnectedProviders } from '@/components/provider/ConnectedProviders';
import { ConnectedOrganizations } from '@/components/provider/ConnectedOrganizations';
import { ResearchDashboard } from '@/components/research/ResearchDashboard';
import { completeSmartAuth, checkAuth } from '@/lib/fhir-client';
import { ErrorModal } from '@/components/auth/ErrorModal';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { TabNavigation } from '@/components/ui/tab-navigation';

export default function Dashboard() {
  const [location, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);
  const [activeTab, setActiveTab] = useState(location.includes('#fhir-explorer') ? 'fhir-explorer' : 'health');
  const { toast } = useToast();

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
        <Sidebar />
        
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
            
            <TabsContent value="insurance">
              <InsuranceSection />
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
            
            <TabsContent value="chat">
              <ChatInterface />
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
