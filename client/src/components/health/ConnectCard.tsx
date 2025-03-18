import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FhirProvider } from '@/lib/providers';
import { initializeSmartAuth } from '@/lib/fhir-client';
import { Building, Database, Microscope, Pill, Server, Stethoscope, X, MapPin } from 'lucide-react';

interface ConnectCardProps {
  provider: FhirProvider;
  className?: string;
}

export function ConnectCard({ provider, className }: ConnectCardProps) {
  const { toast } = useToast();

  // State for patient ID input when connecting to HAPI
  const [hapiPatientId, setHapiPatientId] = React.useState('');
  const [showHapiInput, setShowHapiInput] = React.useState(false);

  // Handle connection to provider
  const handleConnect = async () => {
    try {
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
            // Reload the page to show the connected state
            window.location.reload();
          }
        } else {
          // First click - show input form
          setShowHapiInput(true);
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
          // Reload the page to show the connected state
          window.location.reload();
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
        }, 1500);
      } else {
        // For SMART on FHIR providers
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
    }
  };

  // Get the appropriate icon or image logo based on provider type
  const getProviderIcon = () => {
    // If provider has a logoUrl, use that
    if (provider.logoUrl) {
      return (
        <div className="h-10 w-10 flex-shrink-0 bg-white rounded-md border p-1 flex items-center justify-center">
          <img src={provider.logoUrl} alt={provider.name} className="max-h-full max-w-full" />
        </div>
      );
    }
    
    // Otherwise use the icon based on type or logoIcon
    if (!provider || !provider.logoIcon) {
      return <Database className="h-8 w-8 text-gray-500" />;
    }
    
    const iconSize = "h-8 w-8";
    const iconColor = provider.type === 'provider' ? "text-blue-500" : 
                      provider.type === 'insurance' ? "text-green-500" :
                      provider.type === 'pharmacy' ? "text-red-500" :
                      provider.type === 'lab' ? "text-yellow-500" :
                      provider.type === 'tefca' ? "text-purple-500" : "text-gray-500";
    
    switch (provider.logoIcon) {
      case 'server':
        return <Server className={`${iconSize} ${iconColor}`} />;
      case 'building':
        return <Building className={`${iconSize} ${iconColor}`} />;
      case 'microscope':
        return <Microscope className={`${iconSize} ${iconColor}`} />;
      case 'pill':
        return <Pill className={`${iconSize} ${iconColor}`} />;
      case 'stethoscope':
        return <Stethoscope className={`${iconSize} ${iconColor}`} />;
      default:
        return <Database className={`${iconSize} ${iconColor}`} />;
    }
  };

  // If provider is undefined, show a placeholder
  if (!provider) {
    return (
      <Card className={cn("overflow-hidden", className)}>
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
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {getProviderIcon()}
            </div>
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
            >
              Connect to HAPI FHIR
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Standard card for other providers
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {getProviderIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base truncate">{provider.name || 'Unknown Provider'}</h3>
            
            {/* Show brand information if available */}
            {provider.brand && (
              <div className="mt-1 flex items-center text-xs text-primary-600">
                <span className="truncate">{provider.brand}</span>
              </div>
            )}
            
            {/* Show description */}
            <p className="text-sm text-gray-500 truncate mt-1">
              {provider.description || 'No description available'}
            </p>
            
            {/* Show location information if available */}
            {(provider.type === 'provider' && provider.description?.includes(',')) && (
              <div className="mt-1 flex items-center text-xs text-gray-500">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{provider.description.split('in ')[1]}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Button 
            className="w-full"
            size="sm"
            onClick={handleConnect}
          >
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}