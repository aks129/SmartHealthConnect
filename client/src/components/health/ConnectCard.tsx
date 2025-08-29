import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FhirProvider } from '@/lib/providers';
import { initializeSmartAuth } from '@/lib/fhir-client';
import { 
  Building, 
  Database, 
  Microscope, 
  Pill, 
  Server, 
  Stethoscope, 
  X, 
  MapPin, 
  Link, 
  Shield, 
  Loader2, 
  ChevronRight,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProviderLogo } from '@/components/ui/provider-logo';
// Import icons from react-icons
import { SiEpicgames, SiBitcoinsv, SiSpring, SiAmazonpay } from 'react-icons/si';

interface ConnectCardProps {
  provider: FhirProvider;
  className?: string;
}

export function ConnectCard({ provider, className }: ConnectCardProps) {
  const { toast } = useToast();
  
  // State for patient ID input when connecting to HAPI
  const [hapiPatientId, setHapiPatientId] = useState('');
  const [showHapiInput, setShowHapiInput] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Handle connection to provider
  const handleConnect = async () => {
    try {
      setConnecting(true);
      
      // For HAPI FHIR test server, we need to handle this specially
      if (provider.id === 'hapi') {
        if (showHapiInput) {
          // Connect with the entered patient ID
          const response = await fetch('/api/fhir/hapi/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              patientId: hapiPatientId || '1905285' // Use default if empty
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to connect to HAPI FHIR test server');
          }
          
          const data = await response.json();
          if (data.success) {
            toast({
              title: 'Connected Successfully',
              description: `You're now connected to HAPI FHIR test server with Patient ID: ${data.patientId}`,
            });
            // Redirect to dashboard
            window.location.href = '/dashboard';
          }
        } else {
          // First click - show input form
          setShowHapiInput(true);
          setConnecting(false);
          return;
        }
      }
      // For demo provider, use the demo API route
      else if (provider.id === 'demo') {
        const response = await fetch('/api/fhir/demo/connect', {
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error('Failed to connect to demo provider');
        }
        const data = await response.json();
        if (data.success) {
          toast({
            title: 'Connected Successfully',
            description: `You're now connected to ${provider.name}`,
          });
          // Redirect to dashboard instead of reloading
          window.location.href = '/dashboard';
        }
      } else if (provider.id.includes('qhin')) {
        // For TEFCA QHIN providers
        toast({
          title: 'TEFCA Authorization',
          description: `Initiating IAS authorization flow with ${provider.name}`,
        });
        // Simulate TEFCA flow
        setTimeout(() => {
          toast({
            title: 'TEFCA Connection Successful',
            description: `${provider.name} can now search for your records across the TEFCA network`,
          });
          setConnecting(false);
          // Redirect to dashboard
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        // For SMART on FHIR providers
        toast({
          title: 'Connecting to Provider',
          description: `Initiating secure connection to ${provider.name}...`,
        });
        
        const authUrl = await initializeSmartAuth(provider.url);
        if (authUrl) {
          window.location.href = authUrl;
        }
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Could not connect to provider',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  
  
  // Get provider type badge color and text
  const getProviderTypeColor = () => {
    switch (provider.type) {
      case 'provider':
        return 'bg-blue-600';
      case 'insurance':
        return 'bg-green-600';
      case 'pharmacy':
        return 'bg-red-600';
      case 'lab':
        return 'bg-yellow-600';
      case 'tefca':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };
  
  // Get provider type text
  const getProviderTypeText = () => {
    switch (provider.type) {
      case 'provider':
        return 'Healthcare Provider';
      case 'insurance':
        return 'Insurance';
      case 'pharmacy':
        return 'Pharmacy';
      case 'lab':
        return 'Laboratory';
      case 'tefca':
        return 'TEFCA QHIN';
      case 'vendor':
        return 'Test System';
      default:
        return 'Unknown';
    }
  };

  // If provider is undefined, show a placeholder
  if (!provider) {
    return (
      <Card className={cn("overflow-hidden border border-gray-200 hover:border-gray-300 transition-all", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <Database className="h-8 w-8 text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate">Connection unavailable</h3>
              <p className="text-sm text-gray-500 truncate">Provider information missing</p>
            </div>
          </div>
          <div className="mt-4">
            <Button 
              className="w-full"
              size="sm"
              disabled
            >
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Special handling for HAPI FHIR input form
  if (provider.id === 'hapi' && showHapiInput) {
    return (
      <Card className={cn("overflow-hidden border-2 border-primary shadow-md", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <ProviderLogo
              logoUrl={provider.logoUrl}
              name={provider.name}
              type={provider.type}
              size="md"
              fallbackText={provider.brand}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate">{provider.name}</h3>
              <p className="text-sm text-gray-500 truncate">Enter patient ID to connect</p>
            </div>
            <button 
              className="text-gray-400 hover:text-gray-600" 
              onClick={() => setShowHapiInput(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <label htmlFor="patient-id" className="text-sm text-gray-500">
                Patient ID (defaults to test patient if empty)
              </label>
              <Input
                id="patient-id"
                placeholder="e.g., 1905285" 
                value={hapiPatientId}
                onChange={(e) => setHapiPatientId(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                HAPI FHIR test server contains sample patients for testing
              </p>
            </div>
            <Button 
              className="w-full"
              size="sm"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>Connect to HAPI FHIR</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Enhanced card for providers
  return (
    <Card className={cn(
      "overflow-hidden border hover:border-primary/70 hover:shadow-md transition-all duration-200",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <ProviderLogo
            logoUrl={provider.logoUrl}
            name={provider.name}
            type={provider.type}
            size="md"
            fallbackText={provider.brand}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-base truncate">{provider.name || 'Unknown Provider'}</h3>
              <Badge 
                variant="outline" 
                className={`ml-2 ${
                  provider.type === 'provider' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  provider.type === 'insurance' ? 'bg-green-50 text-green-700 border-green-200' :
                  provider.type === 'pharmacy' ? 'bg-red-50 text-red-700 border-red-200' :
                  provider.type === 'lab' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  provider.type === 'tefca' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {getProviderTypeText()}
              </Badge>
            </div>
            
            {/* Show brand information if available */}
            {provider.brand && (
              <div className="mt-1 flex items-center text-xs text-primary-600 font-medium">
                <span className="truncate">{provider.brand}</span>
              </div>
            )}
            
            {/* Show description */}
            <p className="text-sm text-gray-600 truncate mt-1">
              {provider.description || 'No description available'}
            </p>
            
            {/* Show location information if available */}
            {(provider.type === 'provider' && provider.description?.includes(',')) && (
              <div className="mt-1 flex items-center text-xs text-gray-500">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{provider.description.split('in ')[1]}</span>
              </div>
            )}
            
            {/* Connection security/protocol hint */}
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <Shield className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>Secure SMART on FHIR connection</span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button 
            className="w-full group"
            size="sm"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect
                <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}