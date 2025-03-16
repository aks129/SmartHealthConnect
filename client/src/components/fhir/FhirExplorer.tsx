import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Download, FileJson, Search, RefreshCw, FileText } from 'lucide-react';
import { formatFhirDate, formatFhirDateTime, getDisplayFromCodeableConcept } from '@/lib/fhir-client';

// Define FHIR resource types we support
const resourceTypes = [
  'Patient',
  'Condition',
  'Observation',
  'MedicationRequest',
  'AllergyIntolerance',
  'Immunization',
  'Coverage',
  'Claim',
  'ExplanationOfBenefit'
];

// Utility to generate PDF from FHIR resource
const generatePdf = async (resource: any) => {
  try {
    // For a real implementation, we would use a library like jsPDF
    // This is a placeholder for demonstration
    const blob = new Blob([JSON.stringify(resource, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resource.resourceType || 'resource'}-${resource.id || 'unknown'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating PDF', error);
  }
};

// Format the resource for display
const formatResourceForDisplay = (resource: any) => {
  if (!resource) return 'No resource selected';
  
  return JSON.stringify(resource, null, 2);
};

export function FhirExplorer() {
  const [selectedType, setSelectedType] = useState<string>('Patient');
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>('formatted');
  
  // Fetch resources based on the selected type
  const { data: resources = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/fhir/${selectedType.toLowerCase()}`],
    enabled: !!selectedType,
  });

  // Reset selected resource when type changes
  useEffect(() => {
    setSelectedResource(null);
  }, [selectedType]);

  // Filter resources based on search query
  const filteredResources = Array.isArray(resources) 
    ? resources.filter(resource => 
        JSON.stringify(resource).toLowerCase().includes(searchQuery.toLowerCase()))
    : [resources].filter(resource => 
        JSON.stringify(resource).toLowerCase().includes(searchQuery.toLowerCase()));

  // Get a display name for the resource
  const getResourceDisplayName = (resource: any) => {
    if (!resource) return 'Unknown';
    
    if (resource.resourceType === 'Patient') {
      const name = resource.name?.[0];
      if (name) {
        return `${name.family}, ${name.given?.join(' ') || ''}`;
      }
      return `Patient ${resource.id}`;
    }
    
    if (resource.code) {
      return getDisplayFromCodeableConcept(resource.code);
    }
    
    return `${resource.resourceType} ${resource.id}`;
  };

  // Render resource details based on type
  const renderResourceDetails = (resource: any) => {
    if (!resource) return <p>Select a resource to view details</p>;

    if (viewMode === 'json') {
      return (
        <pre className="p-4 bg-secondary/30 rounded-md text-xs overflow-auto">
          {JSON.stringify(resource, null, 2)}
        </pre>
      );
    }

    switch (resource.resourceType) {
      case 'Patient':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Demographics</h4>
              <p>Gender: {resource.gender || 'Unknown'}</p>
              <p>Birth Date: {formatFhirDate(resource.birthDate)}</p>
              {resource.address && (
                <p>
                  Address: {resource.address.map((addr: any) => 
                    addr.line?.join(', ') + ', ' + 
                    addr.city + ', ' + 
                    addr.state + ' ' + 
                    addr.postalCode
                  ).join('; ')}
                </p>
              )}
            </div>
            
            <div>
              <h4 className="font-medium">Contact Information</h4>
              {resource.telecom?.map((telecom: any, i: number) => (
                <p key={i}>{telecom.system}: {telecom.value}</p>
              ))}
            </div>
          </div>
        );
        
      case 'Condition':
        return (
          <div className="space-y-4">
            <p>
              <span className="font-medium">Status:</span> {resource.clinicalStatus?.coding?.[0]?.code || 'Unknown'}
            </p>
            <p>
              <span className="font-medium">Severity:</span> {getDisplayFromCodeableConcept(resource.severity)}
            </p>
            <p>
              <span className="font-medium">Onset:</span> {formatFhirDate(resource.onsetDateTime)}
            </p>
            <p>
              <span className="font-medium">Recorded:</span> {formatFhirDate(resource.recordedDate)}
            </p>
          </div>
        );
        
      case 'Observation':
        return (
          <div className="space-y-4">
            <p>
              <span className="font-medium">Value:</span> {
                resource.valueQuantity 
                  ? `${resource.valueQuantity.value} ${resource.valueQuantity.unit}` 
                  : (resource.valueString || getDisplayFromCodeableConcept(resource.valueCodeableConcept) || 'Unknown')
              }
            </p>
            <p>
              <span className="font-medium">Status:</span> {resource.status || 'Unknown'}
            </p>
            <p>
              <span className="font-medium">Date:</span> {formatFhirDateTime(resource.effectiveDateTime)}
            </p>
            {resource.referenceRange && (
              <p>
                <span className="font-medium">Reference Range:</span> {
                  resource.referenceRange.map((range: any) => 
                    `${range.low?.value || ''} - ${range.high?.value || ''} ${range.high?.unit || ''}`
                  ).join(', ')
                }
              </p>
            )}
          </div>
        );
        
      case 'MedicationRequest':
        return (
          <div className="space-y-4">
            <p>
              <span className="font-medium">Status:</span> {resource.status || 'Unknown'}
            </p>
            <p>
              <span className="font-medium">Intent:</span> {resource.intent || 'Unknown'}
            </p>
            <p>
              <span className="font-medium">Authored:</span> {formatFhirDateTime(resource.authoredOn)}
            </p>
            <p>
              <span className="font-medium">Dosage:</span> {
                resource.dosageInstruction?.[0]?.text || 
                (resource.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value + ' ' + 
                resource.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.unit) || 
                'Not specified'
              }
            </p>
          </div>
        );
        
      // Add cases for other resource types as needed
      default:
        return (
          <div>
            <p>View the JSON tab for detailed information about this resource.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={() => setViewMode('json')}
            >
              <FileJson className="mr-2 h-4 w-4" /> View JSON
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold">FHIR Explorer</CardTitle>
        <CardDescription>
          Browse and search FHIR resources
        </CardDescription>
      </CardHeader>
      
      <div className="px-4 space-y-3">
        <div className="flex items-center space-x-2">
          <Select 
            value={selectedType} 
            onValueChange={setSelectedType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select resource type" />
            </SelectTrigger>
            <SelectContent>
              {resourceTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <Separator className="my-3" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden">
        {/* Resource List */}
        <div className="border-r">
          <div className="px-4 py-2 bg-muted/40 text-sm font-medium">
            Resources {filteredResources.length > 0 && `(${filteredResources.length})`}
          </div>
          <ScrollArea className="h-[calc(100%-40px)]">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <p className="text-center py-4 text-muted-foreground">Loading...</p>
              ) : filteredResources.length > 0 ? (
                filteredResources.map((resource, index) => (
                  <Button
                    key={`${resource.resourceType}-${resource.id}-${index}`}
                    variant={selectedResource === resource ? "default" : "ghost"}
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => setSelectedResource(resource)}
                  >
                    <div>
                      <div className="font-medium">{getResourceDisplayName(resource)}</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {resource.resourceType}
                        </Badge>
                        {resource.id && (
                          <span className="ml-2">ID: {resource.id}</span>
                        )}
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <p className="text-center py-4 text-muted-foreground">No resources found</p>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Resource Details */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-muted/40 text-sm font-medium flex justify-between items-center">
            <span>Resource Details</span>
            {selectedResource && (
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => setViewMode(viewMode === 'formatted' ? 'json' : 'formatted')}
                  title={viewMode === 'formatted' ? "View JSON" : "View Formatted"}
                >
                  {viewMode === 'formatted' ? (
                    <FileJson className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => generatePdf(selectedResource)}
                  title="Export as PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {renderResourceDetails(selectedResource)}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}