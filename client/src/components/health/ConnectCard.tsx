import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthModal } from "@/components/auth/AuthModal";
import { ErrorModal } from "@/components/auth/ErrorModal";
import { initializeSmartAuth } from "@/lib/fhir-client";
import { fhirProviders, getProviderById } from "@/lib/providers";
import { toast } from "@/hooks/use-toast";
import { Link2, ShieldCheck, Lock, GitFork } from "lucide-react";

export function ConnectCard() {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [customEndpoint, setCustomEndpoint] = useState<string>("");
  const [showCustomEndpoint, setShowCustomEndpoint] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    // Show custom endpoint field if "other" is selected
    setShowCustomEndpoint(selectedProvider === "other");
    
    // Save selected provider to localStorage for after redirect
    if (selectedProvider) {
      localStorage.setItem('selected_provider', selectedProvider);
    }
  }, [selectedProvider]);

  const handleConnect = async () => {
    if (!selectedProvider) {
      toast({
        title: "Provider Required",
        description: "Please select a healthcare provider.",
        variant: "destructive",
      });
      return;
    }
    
    // If "other" provider is selected, make sure custom endpoint is provided
    if (selectedProvider === "other" && !customEndpoint) {
      toast({
        title: "FHIR Server URL Required",
        description: "Please enter the FHIR server URL provided by your healthcare provider.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsConnecting(true);
      setShowAuthModal(true);
      
      // Special handling for demo connection
      if (selectedProvider === "demo") {
        // Use the demo API endpoint to establish a session with sample data
        const response = await fetch('/api/fhir/demo/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to connect to demo server");
        }
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
        
        return;
      }
      
      // Normal SMART on FHIR flow for real providers
      // Get the FHIR server URL
      let fhirServerUrl = "";
      if (selectedProvider === "other") {
        fhirServerUrl = customEndpoint;
      } else {
        const provider = getProviderById(selectedProvider);
        if (provider) {
          fhirServerUrl = provider.url;
        }
      }
      
      if (!fhirServerUrl) {
        throw new Error("Invalid FHIR server URL");
      }
      
      // Initialize SMART on FHIR authentication
      const authUrl = await initializeSmartAuth(fhirServerUrl);
      
      // Redirect to the authorization URL after a brief delay
      setTimeout(() => {
        window.location.href = authUrl;
      }, 1500);
      
    } catch (error) {
      console.error("Error connecting to FHIR server:", error);
      setShowAuthModal(false);
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect to the FHIR server. Please try again.");
      setShowErrorModal(true);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Connect to Your Health Records</CardTitle>
          <CardDescription>
            This application uses SMART on FHIR to securely connect to your health provider and display your medical information.
          </CardDescription>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
              <Lock className="mr-1 h-3 w-3" />
              <span>Secure Connection</span>
            </div>
            <div className="flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
              <ShieldCheck className="mr-1 h-3 w-3" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
              <GitFork className="mr-1 h-3 w-3" />
              <span>Privacy Protected</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="provider" className="block text-sm font-medium mb-2">
              Select Your Health Provider
            </Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue placeholder="Choose a provider" />
              </SelectTrigger>
              <SelectContent>
                {fhirProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showCustomEndpoint && (
            <div className="mb-6">
              <Label htmlFor="fhir-endpoint" className="block text-sm font-medium mb-2">
                FHIR Server Endpoint
              </Label>
              <Input
                type="url"
                id="fhir-endpoint"
                placeholder="https://fhir.example.org/api/fhir"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the FHIR server URL provided by your healthcare provider
              </p>
            </div>
          )}

          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Connect to Health Records
          </Button>
        </CardContent>
        
        <CardFooter className="flex-col bg-gray-50 rounded-b-lg border-t">
          <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3 w-full">How It Works</h3>
          <div className="space-y-4 w-full">
            <div className="flex">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                1
              </div>
              <div>
                <p className="text-gray-700">Select your healthcare provider from the dropdown list</p>
              </div>
            </div>
            <div className="flex">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                2
              </div>
              <div>
                <p className="text-gray-700">You'll be redirected to your provider's secure login page</p>
              </div>
            </div>
            <div className="flex">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                3
              </div>
              <div>
                <p className="text-gray-700">Authorize this app to access your health records</p>
              </div>
            </div>
            <div className="flex">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                4
              </div>
              <div>
                <p className="text-gray-700">View your health information securely in this application</p>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      <ErrorModal 
        isOpen={showErrorModal} 
        onClose={() => setShowErrorModal(false)} 
        message={errorMessage}
      />
    </>
  );
}
