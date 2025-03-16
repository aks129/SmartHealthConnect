import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FhirProvider } from '@/lib/providers';
import { initializeSmartAuth } from '@/lib/fhir-client';
import { Building, Database, Microscope, Pill, Server, Stethoscope } from 'lucide-react';

interface ConnectCardProps {
  provider: FhirProvider;
  className?: string;
}

export function ConnectCard({ provider, className }: ConnectCardProps) {
  const { toast } = useToast();

  // Handle connection to provider
  const handleConnect = async () => {
    try {
      // For demo provider, use the demo API route
      if (provider.id === 'demo') {
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

  // Get the appropriate icon based on provider type
  const getProviderIcon = () => {
    if (!provider || !provider.logoIcon) {
      return <Database className="h-8 w-8 text-gray-500" />;
    }
    
    switch (provider.logoIcon) {
      case 'server':
        return <Server className="h-8 w-8 text-gray-500" />;
      case 'building':
        return <Building className="h-8 w-8 text-gray-500" />;
      case 'microscope':
        return <Microscope className="h-8 w-8 text-gray-500" />;
      case 'pill':
        return <Pill className="h-8 w-8 text-gray-500" />;
      case 'stethoscope':
        return <Stethoscope className="h-8 w-8 text-gray-500" />;
      default:
        return <Database className="h-8 w-8 text-gray-500" />;
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

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {getProviderIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base truncate">{provider.name || 'Unknown Provider'}</h3>
            <p className="text-sm text-gray-500 truncate">{provider.description || 'No description available'}</p>
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