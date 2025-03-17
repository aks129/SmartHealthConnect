import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { CareGap } from '@shared/schema';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  Check, 
  Clock, 
  Calendar, 
  Info, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  Shield,
  Pill,
  Syringe,
  Microscope
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Progress
} from "@/components/ui/progress";

export function CareGapsSection() {
  const [activeTab, setActiveTab] = useState<string>('due');
  
  const { data: careGaps, isLoading, error } = useQuery({
    queryKey: ['/api/fhir/care-gaps'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Group care gaps by status
  const groupedGaps = {
    due: [] as CareGap[],
    satisfied: [] as CareGap[],
    not_applicable: [] as CareGap[]
  };
  
  if (careGaps) {
    (careGaps as CareGap[]).forEach((gap: CareGap) => {
      if (gap.status in groupedGaps) {
        groupedGaps[gap.status].push(gap);
      }
    });
  }
  
  // Get priority badge
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="ml-2">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="ml-2 bg-amber-500 hover:bg-amber-600">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline" className="ml-2">Low Priority</Badge>;
      default:
        return null;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'due':
        return <Badge variant="destructive">Due</Badge>;
      case 'satisfied':
        return <Badge variant="default">Satisfied</Badge>;
      case 'not_applicable':
        return <Badge variant="outline">Not Applicable</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };
  
  // Get category badge
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'preventive':
        return <Badge variant="default" className="bg-blue-500">Preventive</Badge>;
      case 'chronic':
        return <Badge variant="default" className="bg-purple-500">Chronic</Badge>;
      case 'wellness':
        return <Badge variant="default" className="bg-green-500">Wellness</Badge>;
      default:
        return <Badge variant="outline">General</Badge>;
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'due':
        return <Clock className="h-5 w-5 text-destructive" />;
      case 'satisfied':
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'not_applicable':
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Calculate completion stats
  const calculateCompletionStats = () => {
    if (!careGaps) return { total: 0, completed: 0, due: 0, percentage: 0 };
    
    const total = (careGaps as CareGap[]).length;
    const completed = groupedGaps.satisfied.length;
    const due = groupedGaps.due.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, due, percentage };
  };
  
  const stats = calculateCompletionStats();
  
  // Get icon for care gap category
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'preventive':
        return <Shield className="h-5 w-5 mr-2 text-blue-500" />;
      case 'chronic':
        return <HeartPulse className="h-5 w-5 mr-2 text-purple-500" />;
      case 'wellness':
        return <Stethoscope className="h-5 w-5 mr-2 text-green-500" />;
      default:
        return <Microscope className="h-5 w-5 mr-2 text-gray-500" />;
    }
  };
  
  if (isLoading) {
    return (
      <Card className="shadow-md border-red-100">
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            <CardTitle>Preventive Care & HEDIS Measures</CardTitle>
          </div>
          <CardDescription>
            Loading preventive healthcare opportunities...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="shadow-md border-red-100">
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            <CardTitle>Preventive Care & HEDIS Measures</CardTitle>
          </div>
          <CardDescription>Error loading preventive care opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">Unable to load care gaps</p>
              <p className="text-sm">Please try again later or contact support if the problem persists.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-md border-2 border-amber-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2 text-amber-500" />
            <div>
              <CardTitle className="text-xl">Care Gaps & Preventive Health</CardTitle>
              <CardDescription className="mt-1">
                HEDIS quality measures and preventive healthcare opportunities
              </CardDescription>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Care gaps are generated based on HEDIS Clinical Quality measures and are designed to improve healthcare outcomes and reduce costs by identifying preventive care opportunities.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-amber-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Preventive Health Status</span>
            <span className="text-sm font-semibold">{stats.completed} of {stats.total} measures satisfied</span>
          </div>
          <Progress value={stats.percentage} className="h-2" />
          <div className="flex justify-between items-center mt-3 text-sm">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
              <span>{stats.due} due ({stats.due > 0 ? "action needed" : "all clear"})</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              <span>{stats.completed} complete ({stats.percentage}%)</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="due" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="due" className="relative">
              Due
              {groupedGaps.due.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {groupedGaps.due.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="satisfied">Satisfied</TabsTrigger>
            <TabsTrigger value="not_applicable">Not Applicable</TabsTrigger>
          </TabsList>
          
          <TabsContent value="due" className="space-y-4">
            {groupedGaps.due.length > 0 ? (
              groupedGaps.due.map((gap) => (
                <div 
                  key={gap.id} 
                  className="border rounded-lg p-4 bg-destructive/5 border-destructive/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                      <div>
                        <h3 className="font-medium">{gap.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getStatusBadge(gap.status)}
                      {getCategoryBadge(gap.category)}
                      {getPriorityBadge(gap.priority)}
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-background/80 rounded p-3 border border-border/50">
                    <h4 className="text-sm font-semibold mb-2">Recommended Action:</h4>
                    <p className="text-sm">{gap.recommendedAction}</p>
                  </div>
                  
                  {gap.dueDate && (
                    <div className="flex items-center mt-3 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Due by: {formatDate(gap.dueDate)}</span>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => window.open(`https://www.ncqa.org/hedis/measures/${gap.measureId.toLowerCase()}`, '_blank')}
                    >
                      <Info className="h-3 w-3 mr-1" />
                      Learn more about {gap.measureId}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Check className="h-12 w-12 text-primary mb-3" />
                <h3 className="text-lg font-medium">No Due Care Gaps</h3>
                <p className="text-muted-foreground max-w-md mt-1">
                  Great job! All recommended care measures are currently satisfied or not applicable.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="satisfied" className="space-y-4">
            {groupedGaps.satisfied.length > 0 ? (
              groupedGaps.satisfied.map((gap) => (
                <div 
                  key={gap.id} 
                  className="border rounded-lg p-4 bg-primary/5 border-primary/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-primary mr-2 mt-0.5" />
                      <div>
                        <h3 className="font-medium">{gap.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getStatusBadge(gap.status)}
                      {getCategoryBadge(gap.category)}
                    </div>
                  </div>
                  
                  {gap.lastPerformedDate && (
                    <div className="flex items-center mt-3 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Last performed: {formatDate(gap.lastPerformedDate)}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No Satisfied Care Gaps</h3>
                <p className="text-muted-foreground max-w-md mt-1">
                  There are currently no satisfied care measures. Please check the Due tab for recommended actions.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="not_applicable" className="space-y-4">
            {groupedGaps.not_applicable.length > 0 ? (
              groupedGaps.not_applicable.map((gap) => (
                <div 
                  key={gap.id} 
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <XCircle className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                      <div>
                        <h3 className="font-medium">{gap.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getStatusBadge(gap.status)}
                      {getCategoryBadge(gap.category)}
                    </div>
                  </div>
                  
                  {gap.reason && (
                    <div className="mt-4 bg-muted/30 rounded p-3">
                      <h4 className="text-sm font-semibold mb-1">Reason:</h4>
                      <p className="text-sm text-muted-foreground">{gap.reason}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Info className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No Excluded Care Gaps</h3>
                <p className="text-muted-foreground max-w-md mt-1">
                  There are currently no care measures that are not applicable to you.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-blue-50 border-t border-blue-100 flex flex-col space-y-3 text-sm">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
          <p>
            <span className="font-semibold">HEDIS Measures:</span> The Healthcare Effectiveness Data and Information Set (HEDIS) is a widely used set of performance measures in the managed care industry, developed by the National Committee for Quality Assurance (NCQA).
          </p>
        </div>
        <div className="flex items-start">
          <HeartPulse className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
          <p>
            <span className="font-semibold">Value-Based Care:</span> Closing care gaps helps providers meet quality measures for value-based care programs, improving patient outcomes and reducing healthcare costs.
          </p>
        </div>
        <div className="flex items-start">
          <Stethoscope className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
          <p>
            <span className="font-semibold">Preventive Focus:</span> Regular screenings, immunizations, and check-ups can detect health issues early, when they're most treatable, and prevent serious complications.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 w-full" 
          onClick={() => window.open('https://www.ncqa.org/hedis/measures/', '_blank')}
        >
          Learn more about HEDIS Measures
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}