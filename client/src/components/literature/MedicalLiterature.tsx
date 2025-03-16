import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle, ExternalLink, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Condition, MedicationRequest } from '@shared/schema';

type SourceType = 'mayo' | 'wikipedia' | 'medlineplus';

interface MedicalResource {
  id: string;
  title: string;
  description: string;
  source: SourceType;
  url: string;
  tags: string[];
}

interface ConditionResourceProps {
  condition: Condition;
  isExpanded: boolean;
  onToggle: () => void;
  resources: MedicalResource[];
}

function ConditionResource({ condition, isExpanded, onToggle, resources }: ConditionResourceProps) {
  const getConditionName = () => {
    if (condition.code?.text) {
      return condition.code.text;
    }
    
    if (condition.code?.coding && condition.code.coding.length > 0) {
      return condition.code.coding[0].display || 'Unknown Condition';
    }
    
    return 'Unknown Condition';
  };
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{getConditionName()}</CardTitle>
            <CardDescription>
              {condition.recordedDate && (
                <span>Recorded: {new Date(condition.recordedDate).toLocaleDateString()}</span>
              )}
            </CardDescription>
          </div>
          <Button onClick={onToggle} variant="outline" size="sm">
            {isExpanded ? 'Close' : 'Learn More'}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <Tabs defaultValue="resources">
            <TabsList className="mb-4">
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="mayo">Mayo Clinic</TabsTrigger>
              <TabsTrigger value="wikipedia">Wikipedia</TabsTrigger>
              <TabsTrigger value="medlineplus">MedlinePlus</TabsTrigger>
            </TabsList>
            
            <TabsContent value="resources">
              <div className="space-y-4">
                {resources.length > 0 ? (
                  resources.map(resource => (
                    <div key={resource.id} className="p-4 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{resource.title}</h4>
                          <p className="text-sm text-muted-foreground">{resource.description}</p>
                          <div className="mt-2 flex gap-2">
                            {resource.tags.map(tag => (
                              <Badge key={tag} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p>No medical literature resources found for this condition.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="mayo">
              <iframe 
                src={`https://www.mayoclinic.org/search/search-results?q=${encodeURIComponent(getConditionName())}`}
                className="w-full h-[500px] border rounded-md"
                title="Mayo Clinic Resources"
              />
            </TabsContent>
            
            <TabsContent value="wikipedia">
              <iframe 
                src={`https://en.wikipedia.org/wiki/${encodeURIComponent(getConditionName().replace(/ /g, '_'))}`}
                className="w-full h-[500px] border rounded-md"
                title="Wikipedia Resources"
              />
            </TabsContent>
            
            <TabsContent value="medlineplus">
              <iframe 
                src={`https://medlineplus.gov/search.html?query=${encodeURIComponent(getConditionName())}`}
                className="w-full h-[500px] border rounded-md"
                title="MedlinePlus Resources"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
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
  const getMedicationName = () => {
    if (medication.medicationCodeableConcept?.text) {
      return medication.medicationCodeableConcept.text;
    }
    
    if (medication.medicationCodeableConcept?.coding && medication.medicationCodeableConcept.coding.length > 0) {
      return medication.medicationCodeableConcept.coding[0].display || 'Unknown Medication';
    }
    
    return 'Unknown Medication';
  };
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{getMedicationName()}</CardTitle>
            <CardDescription>
              Status: {medication.status || 'Unknown'} 
              {medication.authoredOn && (
                <span> | Prescribed: {new Date(medication.authoredOn).toLocaleDateString()}</span>
              )}
            </CardDescription>
          </div>
          <Button onClick={onToggle} variant="outline" size="sm">
            {isExpanded ? 'Close' : 'Learn More'}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <Tabs defaultValue="resources">
            <TabsList className="mb-4">
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="mayo">Mayo Clinic</TabsTrigger>
              <TabsTrigger value="wikipedia">Wikipedia</TabsTrigger>
              <TabsTrigger value="medlineplus">MedlinePlus</TabsTrigger>
            </TabsList>
            
            <TabsContent value="resources">
              <div className="space-y-4">
                {resources.length > 0 ? (
                  resources.map(resource => (
                    <div key={resource.id} className="p-4 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{resource.title}</h4>
                          <p className="text-sm text-muted-foreground">{resource.description}</p>
                          <div className="mt-2 flex gap-2">
                            {resource.tags.map(tag => (
                              <Badge key={tag} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p>No medical literature resources found for this medication.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="mayo">
              <iframe 
                src={`https://www.mayoclinic.org/search/search-results?q=${encodeURIComponent(getMedicationName())}`}
                className="w-full h-[500px] border rounded-md"
                title="Mayo Clinic Resources"
              />
            </TabsContent>
            
            <TabsContent value="wikipedia">
              <iframe 
                src={`https://en.wikipedia.org/wiki/${encodeURIComponent(getMedicationName().replace(/ /g, '_'))}`}
                className="w-full h-[500px] border rounded-md"
                title="Wikipedia Resources"
              />
            </TabsContent>
            
            <TabsContent value="medlineplus">
              <iframe 
                src={`https://medlineplus.gov/search.html?query=${encodeURIComponent(getMedicationName())}`}
                className="w-full h-[500px] border rounded-md"
                title="MedlinePlus Resources"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

interface MedicalLiteratureProps {
  conditions: Condition[];
  medications: MedicationRequest[];
}

export function MedicalLiterature({ conditions, medications }: MedicalLiteratureProps) {
  const [expandedConditionId, setExpandedConditionId] = useState<string | null>(null);
  const [expandedMedicationId, setExpandedMedicationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'conditions' | 'medications'>('conditions');
  
  // Mock resources - in a real app, these would come from an API
  const getMockResources = (name: string): MedicalResource[] => {
    if (!name) return [];
    
    return [
      {
        id: `resource-1-${name}`,
        title: `${name} Overview`,
        description: 'Comprehensive medical information about symptoms, causes, diagnosis, and treatment.',
        source: 'mayo',
        url: `https://www.mayoclinic.org/search/search-results?q=${encodeURIComponent(name)}`,
        tags: ['Overview', 'Symptoms', 'Treatment']
      },
      {
        id: `resource-2-${name}`,
        title: `${name} Research`,
        description: 'Current clinical research and studies related to this condition.',
        source: 'wikipedia',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`,
        tags: ['Research', 'Clinical Trials']
      },
      {
        id: `resource-3-${name}`,
        title: `Living with ${name}`,
        description: 'Patient resources and support for managing this condition.',
        source: 'medlineplus',
        url: `https://medlineplus.gov/search.html?query=${encodeURIComponent(name)}`,
        tags: ['Patient Resources', 'Support', 'Management']
      }
    ];
  };
  
  const filteredConditions = conditions.filter(condition => {
    const conditionName = condition.code?.text || 
                          (condition.code?.coding && condition.code.coding.length > 0 ? 
                           condition.code.coding[0].display : '');
    
    return conditionName.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  const filteredMedications = medications.filter(med => {
    const medicationName = med.medicationCodeableConcept?.text || 
                          (med.medicationCodeableConcept?.coding && med.medicationCodeableConcept.coding.length > 0 ? 
                           med.medicationCodeableConcept.coding[0].display : '');
    
    return medicationName.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Medical Literature</h2>
        
        <div className="relative flex w-full max-w-xs items-center">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search" 
            placeholder="Search conditions..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'conditions' | 'medications')}>
        <TabsList>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="conditions" className="space-y-4 pt-4">
          {filteredConditions.length > 0 ? (
            filteredConditions.map(condition => (
              <ConditionResource 
                key={condition.id}
                condition={condition}
                isExpanded={expandedConditionId === condition.id}
                onToggle={() => setExpandedConditionId(
                  expandedConditionId === condition.id ? null : condition.id
                )}
                resources={getMockResources(
                  condition.code?.text || 
                  (condition.code?.coding && condition.code.coding.length > 0 ? 
                  condition.code.coding[0].display || '' : '')
                )}
              />
            ))
          ) : (
            <div className="text-center py-10">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No conditions found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 
                  `No conditions match "${searchQuery}"` : 
                  "No conditions have been recorded in your health record"}
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="medications" className="space-y-4 pt-4">
          {filteredMedications.length > 0 ? (
            filteredMedications.map(medication => (
              <MedicationResource 
                key={medication.id}
                medication={medication}
                isExpanded={expandedMedicationId === medication.id}
                onToggle={() => setExpandedMedicationId(
                  expandedMedicationId === medication.id ? null : medication.id
                )}
                resources={getMockResources(
                  medication.medicationCodeableConcept?.text || 
                  (medication.medicationCodeableConcept?.coding && medication.medicationCodeableConcept.coding.length > 0 ? 
                  medication.medicationCodeableConcept.coding[0].display || '' : '')
                )}
              />
            ))
          ) : (
            <div className="text-center py-10">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No medications found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 
                  `No medications match "${searchQuery}"` : 
                  "No medications have been recorded in your health record"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}