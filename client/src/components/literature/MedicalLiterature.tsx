import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Info, BookOpen, FileText, AlertCircle, Check, Building, Globe, BookOpenText } from 'lucide-react';
import { MedicalSpinner, MedicalLoadingOverlay } from '@/components/ui/medical-spinner';

import type { 
  Condition, 
  MedicationRequest
} from '@shared/schema';

// Types
type SourceType = 'mayo' | 'wikipedia' | 'medlineplus';

interface MedicalResource {
  id: string;
  title: string;
  description: string;
  source: SourceType;
  url: string;
  tags: string[];
}

// Helper functions to extract resource information
const getConditionName = (condition: Condition): string => {
  if (condition.code?.text) {
    return condition.code.text;
  }
  if (condition.code?.coding && condition.code.coding.length > 0) {
    return condition.code.coding[0].display || 'Unknown Condition';
  }
  return 'Unknown Condition';
};

const getMedicationName = (medication: MedicationRequest): string => {
  if (medication.medicationCodeableConcept?.text) {
    return medication.medicationCodeableConcept.text;
  }
  if (medication.medicationCodeableConcept?.coding && medication.medicationCodeableConcept.coding.length > 0) {
    return medication.medicationCodeableConcept.coding[0].display || 'Unknown Medication';
  }
  return 'Unknown Medication';
};

// Helper to generate lookup URL for different sources
const generateLookupUrl = (term: string, source: SourceType): string => {
  const encodedTerm = encodeURIComponent(term);
  switch(source) {
    case 'mayo':
      return `https://www.mayoclinic.org/search/search-results?q=${encodedTerm}`;
    case 'wikipedia':
      return `https://en.wikipedia.org/wiki/Special:Search?search=${encodedTerm}`;
    case 'medlineplus':
      return `https://medlineplus.gov/search/?query=${encodedTerm}`;
    default:
      return '';
  }
};

// Function to fetch medical resources for a given term
// Note: In a production app, this would call an API to get real data
// For now, we're simulating the lookup with authoritative sources
const fetchResourcesForTerm = async (term: string): Promise<MedicalResource[]> => {
  // Generate a unique but deterministic ID based on the term
  const generateId = (term: string, source: string) => {
    return `${term.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${source}`;
  };
  
  // Create a simulated delay to mimic API call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const resources: MedicalResource[] = [
    {
      id: generateId(term, 'mayo'),
      title: `${term} - Mayo Clinic Medical Information`,
      description: `Comprehensive medical information about ${term} from Mayo Clinic, including symptoms, causes, diagnosis, treatment, and prevention.`,
      source: 'mayo',
      url: generateLookupUrl(term, 'mayo'),
      tags: ['symptoms', 'treatment', 'diagnosis', 'medical']
    },
    {
      id: generateId(term, 'wikipedia'),
      title: `${term} - Wikipedia Medical Overview`,
      description: `Detailed reference information about ${term}, including medical classification, causes, symptoms, and standard treatments.`,
      source: 'wikipedia',
      url: generateLookupUrl(term, 'wikipedia'),
      tags: ['reference', 'overview', 'medical', 'research']
    },
    {
      id: generateId(term, 'medlineplus'),
      title: `${term} - MedlinePlus Health Information`,
      description: `Trusted health information about ${term} from the National Library of Medicine, including latest research, clinical trials, and patient education resources.`,
      source: 'medlineplus',
      url: generateLookupUrl(term, 'medlineplus'),
      tags: ['NIH', 'trusted', 'patient education', 'research']
    }
  ];
  
  return resources;
};

// Source icon mapping
const SourceIcon = ({ source }: { source: SourceType }) => {
  switch(source) {
    case 'mayo':
      return <Building className="h-4 w-4 text-blue-600" />;
    case 'wikipedia':
      return <Globe className="h-4 w-4 text-gray-600" />;
    case 'medlineplus':
      return <BookOpenText className="h-4 w-4 text-green-600" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

// Source name mapping
const getSourceName = (source: SourceType): string => {
  switch(source) {
    case 'mayo':
      return 'Mayo Clinic';
    case 'wikipedia':
      return 'Wikipedia';
    case 'medlineplus':
      return 'MedlinePlus';
    default:
      return 'Unknown Source';
  }
};

interface ConditionResourceProps {
  condition: Condition;
  isExpanded: boolean;
  onToggle: () => void;
  resources: MedicalResource[];
}

function ConditionResource({ condition, isExpanded, onToggle, resources }: ConditionResourceProps) {
  const conditionName = getConditionName(condition);
  const clinicalStatus = condition.clinicalStatus?.coding?.[0]?.code || 'unknown';
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{conditionName}</CardTitle>
            <CardDescription>
              {condition.recordedDate && (
                <span>Recorded: {new Date(condition.recordedDate).toLocaleDateString()}</span>
              )}
            </CardDescription>
          </div>
          <Badge variant={clinicalStatus === 'active' ? 'default' : 'outline'}>
            {clinicalStatus.charAt(0).toUpperCase() + clinicalStatus.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <h4 className="font-medium mb-2">Medical Information</h4>
            <p className="text-sm text-muted-foreground">
              {isExpanded ? (
                "View authoritative medical information about this condition from trusted sources."
              ) : (
                "Expand to view authoritative medical information about this condition."
              )}
            </p>
          </div>
          
          {isExpanded && (
            <div className="space-y-4">
              {resources.map(resource => (
                <div key={resource.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SourceIcon source={resource.source} />
                    <h5 className="font-medium">{getSourceName(resource.source)}</h5>
                  </div>
                  <p className="text-sm mb-3">{resource.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {resource.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on {getSourceName(resource.source)}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          onClick={onToggle}
          className="w-full text-primary"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface MedicationResourceProps {
  medication: MedicationRequest;
  isExpanded: boolean;
  onToggle: () => void;
  resources: MedicalResource[];
}

function MedicationResource({ medication, isExpanded, onToggle, resources }: MedicationResourceProps) {
  const medicationName = getMedicationName(medication);
  const status = medication.status || 'unknown';
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{medicationName}</CardTitle>
            <CardDescription>
              {medication.authoredOn && (
                <span>Prescribed: {new Date(medication.authoredOn).toLocaleDateString()}</span>
              )}
            </CardDescription>
          </div>
          <Badge variant={status === 'active' ? 'default' : 'outline'}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <h4 className="font-medium mb-2">Medication Information</h4>
            <p className="text-sm text-muted-foreground">
              {isExpanded ? (
                "View authoritative information about this medication from trusted sources."
              ) : (
                "Expand to view authoritative information about this medication."
              )}
            </p>
          </div>
          
          {medication.dosageInstruction && medication.dosageInstruction.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-1">Dosage Instructions</h5>
              <p className="text-sm text-muted-foreground">
                {medication.dosageInstruction[0].text || "No specific instructions provided."}
              </p>
            </div>
          )}
          
          {isExpanded && (
            <div className="space-y-4">
              {resources.map(resource => (
                <div key={resource.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SourceIcon source={resource.source} />
                    <h5 className="font-medium">{getSourceName(resource.source)}</h5>
                  </div>
                  <p className="text-sm mb-3">{resource.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {resource.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on {getSourceName(resource.source)}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          onClick={onToggle}
          className="w-full text-primary"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface MedicalLiteratureProps {
  conditions: Condition[];
  medications: MedicationRequest[];
}

export function MedicalLiterature({ conditions, medications }: MedicalLiteratureProps) {
  const [selectedTab, setSelectedTab] = useState('conditions');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [resourcesMap, setResourcesMap] = useState<Record<string, MedicalResource[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Toggle expanded state for an item
  const toggleItem = async (id: string, term: string) => {
    // If expanding and we don't have resources yet, fetch them
    if (!expandedItems[id] && !resourcesMap[term]) {
      setIsLoading(true);
      try {
        const resources = await fetchResourcesForTerm(term);
        setResourcesMap(prev => ({
          ...prev,
          [term]: resources
        }));
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Get resources for a term
  const getResourcesForTerm = (term: string): MedicalResource[] => {
    return resourcesMap[term] || [];
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Medical Literature</h2>
        <p className="text-muted-foreground">
          Explore authoritative medical information about your conditions and medications from trusted sources.
        </p>
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="conditions" className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Conditions
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            About Sources
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="conditions">
            {conditions.length > 0 ? (
              <div className="space-y-4">
                {conditions.map(condition => {
                  const conditionName = getConditionName(condition);
                  const isExpanded = expandedItems[condition.id] || false;
                  
                  return (
                    <ConditionResource 
                      key={condition.id}
                      condition={condition}
                      isExpanded={isExpanded}
                      onToggle={() => toggleItem(condition.id, conditionName)}
                      resources={getResourcesForTerm(conditionName)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-full flex justify-center mb-4">
                  <MedicalSpinner 
                    size="md" 
                    text="No conditions found"
                    variant="secondary"
                    speed="slow" 
                  />
                </div>
                <p className="text-muted-foreground">
                  We couldn't find any conditions in your health record.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="medications">
            {medications.length > 0 ? (
              <div className="space-y-4">
                {medications.map(medication => {
                  const medicationName = getMedicationName(medication);
                  const isExpanded = expandedItems[medication.id] || false;
                  
                  return (
                    <MedicationResource 
                      key={medication.id}
                      medication={medication}
                      isExpanded={isExpanded}
                      onToggle={() => toggleItem(medication.id, medicationName)}
                      resources={getResourcesForTerm(medicationName)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-full flex justify-center mb-4">
                  <MedicalSpinner 
                    size="md" 
                    text="No medications found"
                    variant="secondary"
                    speed="slow" 
                  />
                </div>
                <p className="text-muted-foreground">
                  We couldn't find any medications in your health record.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sources">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Building className="h-6 w-6 text-blue-600" />
                    <CardTitle>Mayo Clinic</CardTitle>
                  </div>
                  <CardDescription>
                    A nonprofit academic medical center focused on integrated clinical practice, education, and research.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Expert-Reviewed Content</p>
                        <p className="text-sm text-muted-foreground">
                          All content is written or reviewed by physicians, scientists, and researchers.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Patient-Focused Explanations</p>
                        <p className="text-sm text-muted-foreground">
                          Information is designed to be accessible and helpful for patients.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Up-to-Date Medical Information</p>
                        <p className="text-sm text-muted-foreground">
                          Content is regularly reviewed and updated with the latest medical evidence.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('https://www.mayoclinic.org/about-this-site', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Learn More About Mayo Clinic
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Globe className="h-6 w-6 text-gray-600" />
                    <CardTitle>Wikipedia Medical Content</CardTitle>
                  </div>
                  <CardDescription>
                    Medical information on Wikipedia is subject to special editorial guidelines and oversight.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">WikiProject Medicine</p>
                        <p className="text-sm text-muted-foreground">
                          Dedicated group of editors, including medical professionals, who maintain and improve medical articles.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Scientific Citation Requirements</p>
                        <p className="text-sm text-muted-foreground">
                          Medical content must be backed by reliable sources from peer-reviewed medical literature.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Encyclopedic Overview</p>
                        <p className="text-sm text-muted-foreground">
                          Provides comprehensive reference information about medical conditions and treatments.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Medicine', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Learn About Wikipedia Medical Content
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BookOpenText className="h-6 w-6 text-green-600" />
                    <CardTitle>MedlinePlus</CardTitle>
                  </div>
                  <CardDescription>
                    Produced by the National Library of Medicine, the world's largest medical library and part of the National Institutes of Health (NIH).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Government-Backed Information</p>
                        <p className="text-sm text-muted-foreground">
                          Trusted health information from the National Library of Medicine, part of the U.S. federal government.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Plain Language Health Information</p>
                        <p className="text-sm text-muted-foreground">
                          Content is written in easy-to-understand language specifically for patients and families.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">No Commercial Influence</p>
                        <p className="text-sm text-muted-foreground">
                          Information is free from commercial bias and advertising.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('https://medlineplus.gov/about.html', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Learn More About MedlinePlus
                  </Button>
                </CardFooter>
              </Card>
              
              <div className="border rounded-lg p-6 bg-gray-50">
                <h3 className="font-semibold text-lg mb-4">Important Information</h3>
                <div className="flex items-start gap-3 text-sm">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p>
                    The information provided through these resources is for educational purposes only and is not intended 
                    as medical advice. Always consult with your healthcare provider for diagnosis and treatment decisions.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <MedicalSpinner
              size="md"
              text="Loading medical information..."
              variant="primary"
              multiIcon={true}
              speed="normal"
              className="mx-auto mb-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}