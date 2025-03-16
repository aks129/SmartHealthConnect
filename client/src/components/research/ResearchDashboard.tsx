import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  FileText, 
  Beaker, 
  Stethoscope, 
  Calendar,
  Clock,
  ExternalLink, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Bookmark,
  Sparkles
} from 'lucide-react';
import type { Patient, Condition, Observation, MedicationRequest } from '@shared/schema';

// Define the trial interface
interface ClinicalTrial {
  id: string;
  title: string;
  description: string;
  status: 'Recruiting' | 'Active, not recruiting' | 'Completed' | 'Not yet recruiting';
  phase: string;
  conditions: string[];
  location: string;
  sponsor: string;
  contact: string;
  url: string;
  lastUpdated: string;
}

// Define the user trial participation interface
interface TrialParticipation {
  id: string;
  trialId: string;
  trialTitle: string;
  status: 'Data submitted' | 'Under review' | 'Accepted' | 'Rejected' | 'Active' | 'Completed';
  submittedDate: string;
  lastUpdated: string;
  notes?: string;
}

// Mock data for example trials
const mockTrials: ClinicalTrial[] = [
  {
    id: 'NCT01234567',
    title: 'Effects of Statin Therapy on Cardiovascular Outcomes in Adults with Hypertension',
    description: 'This study evaluates the effectiveness of statin therapy in reducing major cardiovascular events in adults with hypertension.',
    status: 'Recruiting',
    phase: 'Phase 3',
    conditions: ['Hypertension', 'Cardiovascular Disease'],
    location: 'Multiple locations, USA',
    sponsor: 'National Heart, Lung, and Blood Institute',
    contact: 'research@cardiovascular.org',
    url: 'https://clinicaltrials.gov/study/NCT01234567',
    lastUpdated: '2024-01-15'
  },
  {
    id: 'NCT02345678',
    title: 'Novel Monoclonal Antibody Treatment for Type 2 Diabetes',
    description: 'A randomized controlled trial of a new monoclonal antibody treatment for improving glycemic control in adults with Type 2 Diabetes.',
    status: 'Recruiting',
    phase: 'Phase 2',
    conditions: ['Type 2 Diabetes'],
    location: 'Boston, MA and Chicago, IL',
    sponsor: 'Pharmaceutical Research Institute',
    contact: 'diabetes.research@pri.org',
    url: 'https://clinicaltrials.gov/study/NCT02345678',
    lastUpdated: '2024-02-10'
  },
  {
    id: 'NCT03456789',
    title: 'Comparison of Bronchodilators in Patients with COPD',
    description: 'This study compares the effectiveness of three different bronchodilator medications in patients with Chronic Obstructive Pulmonary Disease.',
    status: 'Active, not recruiting',
    phase: 'Phase 4',
    conditions: ['COPD', 'Respiratory Insufficiency'],
    location: 'San Francisco, CA',
    sponsor: 'Respiratory Research Foundation',
    contact: 'copd.trial@respresearch.org',
    url: 'https://clinicaltrials.gov/study/NCT03456789',
    lastUpdated: '2023-11-28'
  },
  {
    id: 'NCT04567890',
    title: 'Immunotherapy for Early Stage Breast Cancer',
    description: 'A trial to evaluate the efficacy of combination immunotherapy in patients with early stage breast cancer.',
    status: 'Recruiting',
    phase: 'Phase 2',
    conditions: ['Breast Cancer', 'HER2-negative Breast Cancer'],
    location: 'Multiple locations, USA',
    sponsor: 'National Cancer Institute',
    contact: 'breast.trial@nci.org',
    url: 'https://clinicaltrials.gov/study/NCT04567890',
    lastUpdated: '2024-03-05'
  }
];

// Mock data for user participation
const mockParticipations: TrialParticipation[] = [
  {
    id: 'PART-001',
    trialId: 'NCT01234567',
    trialTitle: 'Effects of Statin Therapy on Cardiovascular Outcomes in Adults with Hypertension',
    status: 'Under review',
    submittedDate: '2024-02-20',
    lastUpdated: '2024-02-22',
    notes: 'Initial screening call scheduled for next week'
  },
  {
    id: 'PART-002',
    trialId: 'NCT04567890',
    trialTitle: 'Immunotherapy for Early Stage Breast Cancer',
    status: 'Rejected',
    submittedDate: '2024-01-10',
    lastUpdated: '2024-01-25',
    notes: 'Did not meet inclusion criteria due to medical history'
  }
];

export function ResearchDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClinicalTrial[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('find');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<ClinicalTrial | null>(null);
  const [applicationNote, setApplicationNote] = useState('');
  const [userParticipations, setUserParticipations] = useState(mockParticipations);
  
  // Fetch patient data
  const { data: patient } = useQuery<Patient>({
    queryKey: ['/api/fhir/patient'],
  });
  
  // Fetch conditions
  const { data: conditions } = useQuery<Condition[]>({
    queryKey: ['/api/fhir/condition'],
  });
  
  // Fetch observations
  const { data: observations } = useQuery<Observation[]>({
    queryKey: ['/api/fhir/observation'],
  });
  
  // Fetch medications
  const { data: medications } = useQuery<MedicationRequest[]>({
    queryKey: ['/api/fhir/medicationrequest'],
  });
  
  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(mockTrials);
    } else {
      const query = searchQuery.toLowerCase();
      const results = mockTrials.filter(trial => 
        trial.title.toLowerCase().includes(query) || 
        trial.description.toLowerCase().includes(query) || 
        trial.conditions.some(condition => condition.toLowerCase().includes(query)) ||
        trial.location.toLowerCase().includes(query) ||
        trial.sponsor.toLowerCase().includes(query)
      );
      setSearchResults(results);
    }
    setHasSearched(true);
  };
  
  // Handle suggested trials based on patient data
  const handleSuggestedTrials = () => {
    if (!conditions) {
      return;
    }
    
    // Extract condition names
    const patientConditions = conditions.map(condition => 
      condition.code?.text?.toLowerCase() || ''
    ).filter(text => text.length > 0);
    
    // Filter trials based on patient conditions
    const suggestedResults = mockTrials.filter(trial => 
      trial.conditions.some(trialCondition => 
        patientConditions.some(patientCondition => 
          patientCondition.includes(trialCondition.toLowerCase()) || 
          trialCondition.toLowerCase().includes(patientCondition)
        )
      )
    );
    
    setSearchResults(suggestedResults.length > 0 ? suggestedResults : mockTrials);
    setHasSearched(true);
  };
  
  // Handle trial application
  const handleApplyToTrial = (trial: ClinicalTrial) => {
    setSelectedTrial(trial);
    setShowApplicationForm(true);
  };
  
  // Submit trial application
  const handleSubmitApplication = () => {
    if (!selectedTrial) return;
    
    const newParticipation: TrialParticipation = {
      id: `PART-${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`,
      trialId: selectedTrial.id,
      trialTitle: selectedTrial.title,
      status: 'Data submitted',
      submittedDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
      notes: applicationNote
    };
    
    setUserParticipations([...userParticipations, newParticipation]);
    setShowApplicationForm(false);
    setApplicationNote('');
    setSelectedTrial(null);
    setActiveTab('participating');
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Recruiting':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Recruiting</Badge>;
      case 'Active, not recruiting':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Active, not recruiting</Badge>;
      case 'Completed':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Completed</Badge>;
      case 'Not yet recruiting':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Not yet recruiting</Badge>;
      case 'Data submitted':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Data submitted</Badge>;
      case 'Under review':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Under review</Badge>;
      case 'Accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Accepted</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case 'Active':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Active</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Data submitted':
        return <Clock className="h-4 w-4 text-purple-500" />;
      case 'Under review':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'Accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Active':
        return <Beaker className="h-4 w-4 text-blue-500" />;
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Clinical Research</CardTitle>
          <CardDescription>
            Find and participate in medical research and clinical trials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="find" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="find" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Find Trials</span>
              </TabsTrigger>
              <TabsTrigger value="participating" className="flex items-center gap-2">
                <Beaker className="h-4 w-4" />
                <span>My Participation</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="find" className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input 
                      placeholder="Search for clinical trials by condition, treatment, or location..." 
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSearch} className="md:w-auto">
                    <Filter className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button 
                    onClick={handleSuggestedTrials} 
                    variant="outline" 
                    className="md:w-auto"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Suggest Trials
                  </Button>
                </div>
                
                {(hasSearched && searchResults.length === 0) ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">No matching trials found</h3>
                    <p className="text-gray-500 mt-2">
                      Try adjusting your search terms or checking for suggested trials based on your health data.
                    </p>
                  </div>
                ) : hasSearched ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Available Clinical Trials</h3>
                    <div className="space-y-4">
                      {searchResults.map((trial) => (
                        <Card key={trial.id} className="overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-lg font-medium">{trial.title}</h4>
                              {getStatusBadge(trial.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-4">{trial.description}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <h5 className="text-sm font-medium mb-1">Conditions</h5>
                                <div className="flex flex-wrap gap-1">
                                  {trial.conditions.map((condition, idx) => (
                                    <Badge key={idx} variant="outline">{condition}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium mb-1">Details</h5>
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center">
                                    <FileText className="h-3 w-3 mr-2 text-gray-500" />
                                    <span>Trial ID: {trial.id}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Stethoscope className="h-3 w-3 mr-2 text-gray-500" />
                                    <span>Phase: {trial.phase}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-2 text-gray-500" />
                                    <span>Updated: {trial.lastUpdated}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-sm mb-4">
                              <h5 className="font-medium mb-1">Location</h5>
                              <p>{trial.location}</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-4">
                              <div className="text-sm">
                                <span className="font-medium">Sponsor:</span> {trial.sponsor}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => window.open(trial.url, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                                
                                <Button
                                  size="sm"
                                  className="h-8"
                                  onClick={() => handleApplyToTrial(trial)}
                                >
                                  Apply to Participate
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium">Find Clinical Trials</h3>
                    <p className="text-gray-500 mt-2">
                      Search for trials by condition, treatment or location, or use the "Suggest Trials" 
                      button to find trials that match your health profile.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="participating" className="space-y-6">
              {userParticipations.length === 0 ? (
                <div className="text-center py-16">
                  <Beaker className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium">No Active Participations</h3>
                  <p className="text-gray-500 mt-2">
                    You haven't applied to any clinical trials yet. Search for trials in the "Find Trials" tab.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium mb-4">My Trial Participations</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trial</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userParticipations.map((participation) => (
                        <TableRow key={participation.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{participation.trialTitle}</div>
                              <div className="text-xs text-gray-500">ID: {participation.trialId}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(participation.status)}
                              {getStatusBadge(participation.status)}
                            </div>
                          </TableCell>
                          <TableCell>{participation.submittedDate}</TableCell>
                          <TableCell>{participation.lastUpdated}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {participation.notes || "No notes available"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Application Form Dialog */}
          <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Apply to Clinical Trial</DialogTitle>
                <DialogDescription>
                  Submit your information to apply for participation in this clinical trial.
                </DialogDescription>
              </DialogHeader>
              
              {selectedTrial && (
                <div>
                  <div className="mb-4">
                    <h4 className="font-medium">{selectedTrial.title}</h4>
                    <div className="text-sm text-gray-600">ID: {selectedTrial.id}</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Information</Label>
                      <Textarea 
                        id="notes" 
                        placeholder="Please provide any additional information about your medical history or reason for interest in this trial..."
                        value={applicationNote}
                        onChange={(e) => setApplicationNote(e.target.value)}
                        rows={4}
                      />
                    </div>
                    
                    <div className="text-sm">
                      <p className="mb-2">By submitting this application, you:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Consent to share your health information with trial administrators</li>
                        <li>May be contacted for additional screening information</li>
                        <li>Can withdraw your application at any time</li>
                      </ul>
                    </div>
                  </div>
                  
                  <DialogFooter className="mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowApplicationForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitApplication}>
                      Submit Application
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}