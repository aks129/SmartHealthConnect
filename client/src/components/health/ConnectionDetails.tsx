import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConnectSelector } from './ConnectSelector';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Database, AlertCircle } from 'lucide-react';

export function ConnectionDetails() {
  const [showConnectOptions, setShowConnectOptions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/fhir/sessions/current'],
  });

  // Mutation to disconnect from current FHIR server
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/fhir/sessions/current', { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({
        title: 'Disconnected',
        description: 'You have been disconnected from the FHIR server.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fhir/sessions/current'] });
      setShowConnectOptions(true);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to disconnect from the FHIR server.',
        variant: 'destructive',
      });
    },
  });

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  // If no session, show connect options
  if (!session && !isLoading) {
    return <ConnectSelector />;
  }

  // If showing connect options, display them
  if (showConnectOptions) {
    return <ConnectSelector />;
  }

  return (
    <section className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Connected Health Records
          </CardTitle>
          <CardDescription>
            You're currently connected to a health data source. Here are the details of your connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session?.provider === 'demo' && (
            <Alert variant="warning" className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Demo Connection</AlertTitle>
              <AlertDescription className="text-yellow-700">
                You're connected to a demo environment with sample data. To connect to your real health records, 
                disconnect and choose another provider.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">Provider</span>
                <span className="font-medium">{session?.provider || 'Unknown'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">FHIR Server</span>
                <span className="font-mono text-sm truncate">{session?.fhirServer || 'Unknown'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">Authorization</span>
                <span>SMART on FHIR OAuth 2.0</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">FHIR Version</span>
                <span>R4 (4.0.1)</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">Resources Accessed</span>
                <span className="text-sm">Patient, Condition, Observation, MedicationRequest, AllergyIntolerance, Immunization</span>
              </div>
              
              {session?.scope && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">Authorized Scopes</span>
                  <span className="font-mono text-xs truncate">{session.scope}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={() => setShowConnectOptions(true)}
          >
            Connect another source
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Show additional connection options when needed */}
      {showConnectOptions && <ConnectSelector />}
    </section>
  );
}
