import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConnectSelector } from './ConnectSelector';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  AlertCircle, 
  Compass as CompassIcon, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Shield, 
  Share2,
  Copy
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';
import { SiEpicgames, SiBitcoinsv } from 'react-icons/si';
import { getProviderById } from '@/lib/providers';

export function ConnectionDetails() {
  const [showConnectOptions, setShowConnectOptions] = useState(false);
  const [showConnectSuccess, setShowConnectSuccess] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/fhir/sessions/current'],
  });
  
  // Check if we just established a new connection
  useEffect(() => {
    const justConnected = sessionStorage.getItem('just_connected');
    if (justConnected && session) {
      setShowConnectSuccess(true);
      sessionStorage.removeItem('just_connected');
      
      // Animate the progress bar
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setConnectionProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          // Auto-redirect to dashboard after a short delay
          setTimeout(() => {
            setShowConnectSuccess(false);
          }, 1500);
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [session]);

  // Mutation to disconnect from current FHIR server
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/fhir/sessions/current', 'DELETE');
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
  
  // Get provider info
  const getProviderInfo = () => {
    if (!session) return null;
    return getProviderById(session.provider);
  };
  
  // Get provider logo
  const getProviderLogo = () => {
    const provider = getProviderInfo();
    if (!provider) return <Database className="h-10 w-10 text-primary" />;
    
    if (provider.id.includes('epic') || provider.brandId?.includes('epic')) {
      return <SiEpicgames className="h-10 w-10 text-blue-600" />;
    } else if (provider.id.includes('cerner')) {
      return <SiBitcoinsv className="h-10 w-10 text-blue-600" />;
    } else if (provider.logoUrl) {
      return (
        <div className="h-12 w-12 flex-shrink-0 bg-white rounded-md border p-1 flex items-center justify-center">
          <img 
            src={provider.logoUrl} 
            alt={provider.name} 
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <Database className="h-8 w-8 text-gray-500 hidden" />
        </div>
      );
    }
    
    return <Database className="h-10 w-10 text-primary" />;
  };
  
  // Connection Success View
  if (showConnectSuccess && session) {
    const provider = getProviderInfo();
    
    return (
      <section className="mb-8">
        <Card className="shadow-md border-primary/20 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Connection Established
            </CardTitle>
            <CardDescription>
              Your health data is being securely accessed
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0">
                {getProviderLogo()}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg">{provider?.name || session.provider}</h3>
                <p className="text-sm text-gray-600">{provider?.description || 'Connected healthcare system'}</p>
                <div className="mt-1 flex items-center text-xs text-gray-500">
                  <Shield className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>Secure connection established</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span>Processing health records</span>
                <span className="font-medium">{connectionProgress}%</span>
              </div>
              <Progress value={connectionProgress} className="h-2" />
            </div>
            <div className="p-3 bg-green-100 border border-green-200 rounded-md text-green-800 text-sm">
              <p className="flex items-start">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                <span>
                  Your health data is now securely available in your dashboard. You can explore your
                  medical history, conditions, medications, and more.
                </span>
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 group"
              onClick={() => setShowConnectSuccess(false)}
            >
              Go to Health Dashboard
              <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardFooter>
        </Card>
      </section>
    );
  }

  // If no session, show connect options
  if (!session && !isLoading) {
    return (
      <section className="mb-8">
        <Card className="shadow-md border-primary/20 mb-4 bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CompassIcon className="h-6 w-6 text-primary" />
              Connect to Your Health Records
            </CardTitle>
            <CardDescription>
              Choose a connection option to access your health data
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid md:grid-cols-3 gap-4 mt-2 mb-4">
              <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="h-10 w-10 text-blue-600 mb-2" />
                <h3 className="font-medium text-sm mb-1">Secure Access</h3>
                <p className="text-xs text-gray-600">Your data remains protected with industry-standard security</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-green-50 rounded-lg border border-green-100">
                <Share2 className="h-10 w-10 text-green-600 mb-2" />
                <h3 className="font-medium text-sm mb-1">Multiple Sources</h3>
                <p className="text-xs text-gray-600">Connect to providers, pharmacies, labs, and insurance</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                <Copy className="h-10 w-10 text-purple-600 mb-2" />
                <h3 className="font-medium text-sm mb-1">Complete History</h3>
                <p className="text-xs text-gray-600">View your comprehensive medical records in one place</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Use the connection selector below to find healthcare providers, insurance companies, 
              pharmacies, labs, and more. Your data stays private and secure.
            </p>
          </CardContent>
          <CardFooter className="pt-0 flex justify-end">
            <Button className="bg-gradient-to-r from-primary to-primary-600 shadow-sm">
              Get Started
            </Button>
          </CardFooter>
        </Card>
        <ConnectSelector />
      </section>
    );
  }

  // If showing connect options, display them
  if (showConnectOptions) {
    return (
      <section className="mb-8">
        <Card className="shadow-md border-primary/20 mb-4 bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CompassIcon className="h-5 w-5 text-primary" />
              Add Another Health Data Source
            </CardTitle>
            <CardDescription>
              Connect to additional providers, insurers, pharmacies, labs, or TEFCA
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-gray-600">
              Add connections to expand your health record. You can connect to multiple sources
              to build a more complete picture of your health.
            </p>
          </CardContent>
        </Card>
        <ConnectSelector />
        <div className="mt-4 flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => setShowConnectOptions(false)}
          >
            Cancel
          </Button>
        </div>
      </section>
    );
  }

  // Regular connected state view
  const provider = getProviderInfo();
  
  return (
    <section className="mb-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Database className="h-6 w-6 text-primary" />
            Connected Health Records
          </CardTitle>
          <CardDescription>
            You're currently connected to a health data source. Here are the details of your connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session?.provider === 'demo' && (
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Demo Connection</AlertTitle>
              <AlertDescription className="text-yellow-700">
                You're connected to a demo environment with sample data. To connect to your real health records, 
                disconnect and choose another provider.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-lg border">
            <div className="flex-shrink-0">
              {getProviderLogo()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{provider?.name || session?.provider || 'Unknown'}</h3>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Connected
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {provider?.description || 'Connected healthcare system'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex flex-col bg-gray-50 p-3 rounded-md">
                <span className="text-sm font-medium text-gray-500">Provider</span>
                <span className="font-medium">{session?.provider || 'Unknown'}</span>
              </div>
              
              <div className="flex flex-col bg-gray-50 p-3 rounded-md">
                <span className="text-sm font-medium text-gray-500">FHIR Server</span>
                <span className="font-mono text-sm truncate">{session?.fhirServer || 'Unknown'}</span>
              </div>
              
              <div className="flex flex-col bg-gray-50 p-3 rounded-md">
                <span className="text-sm font-medium text-gray-500">Authorization</span>
                <span>SMART on FHIR OAuth 2.0</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-col bg-gray-50 p-3 rounded-md">
                <span className="text-sm font-medium text-gray-500">FHIR Version</span>
                <span>R4 (4.0.1)</span>
              </div>
              
              <div className="flex flex-col bg-gray-50 p-3 rounded-md">
                <span className="text-sm font-medium text-gray-500">Resources Accessed</span>
                <span className="text-sm">Patient, Condition, Observation, MedicationRequest, AllergyIntolerance, Immunization</span>
              </div>
              
              {session?.scope && (
                <div className="flex flex-col bg-gray-50 p-3 rounded-md">
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
            {disconnectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              'Disconnect'
            )}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
