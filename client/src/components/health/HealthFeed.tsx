import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HistoryIcon, 
  AlertCircle, 
  CheckCircle2,
  Calendar, 
  Bell,
  Clock,
  ArrowUpCircle,
  PlusCircle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { 
  Condition, 
  MedicationRequest,
  Observation,
  AllergyIntolerance,
  Immunization,
  CareGap 
} from '@shared/schema';

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  type: 'condition' | 'medication' | 'observation' | 'allergy' | 'immunization' | 'care-gap' | 'appointment' | 'system';
  status?: 'info' | 'warning' | 'success' | 'error' | 'pending';
};

// Formats a date for display in the feed
const formatTimestamp = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true });
};

// Helper to generate activity items from FHIR resources
const generateActivityItems = (
  conditions: Condition[],
  medications: MedicationRequest[],
  observations: Observation[],
  allergies: AllergyIntolerance[],
  immunizations: Immunization[],
  careGaps: CareGap[]
): ActivityItem[] => {
  const activityItems: ActivityItem[] = [];
  
  // Add conditions to activity feed
  conditions.forEach(condition => {
    if (!condition.onsetDateTime) return;
    
    const conditionName = condition.code?.coding?.[0]?.display || 'Unknown condition';
    const status = condition.clinicalStatus?.coding?.[0]?.code || 'unknown';
    
    let statusText = 'recorded';
    let activityStatus: ActivityItem['status'] = 'info';
    
    if (status === 'active') {
      statusText = 'diagnosed';
      activityStatus = 'warning';
    } else if (status === 'resolved') {
      statusText = 'resolved';
      activityStatus = 'success';
    }
    
    activityItems.push({
      id: `condition-${condition.id}`,
      title: `Condition ${statusText}`,
      description: conditionName,
      timestamp: new Date(condition.onsetDateTime),
      type: 'condition',
      status: activityStatus
    });
  });
  
  // Add medications to activity feed
  medications.forEach(med => {
    if (!med.authoredOn) return;
    
    const medicationName = med.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown medication';
    const status = med.status || 'unknown';
    
    let statusText = 'prescribed';
    let activityStatus: ActivityItem['status'] = 'info';
    
    if (status === 'active') {
      statusText = 'prescribed';
      activityStatus = 'info';
    } else if (status === 'stopped') {
      statusText = 'stopped';
      activityStatus = 'warning';
    } else if (status === 'completed') {
      statusText = 'completed';
      activityStatus = 'success';
    }
    
    activityItems.push({
      id: `medication-${med.id}`,
      title: `Medication ${statusText}`,
      description: medicationName,
      timestamp: new Date(med.authoredOn),
      type: 'medication',
      status: activityStatus
    });
  });
  
  // Add observations to activity feed
  observations.forEach(obs => {
    if (!obs.effectiveDateTime) return;
    
    const observationName = obs.code?.coding?.[0]?.display || 'Unknown observation';
    let activityStatus: ActivityItem['status'] = 'info';
    
    // Check if the observation has an abnormal flag
    if (obs.interpretation && obs.interpretation.length > 0) {
      const interpretationCode = obs.interpretation[0].coding?.[0]?.code;
      if (interpretationCode === 'H' || interpretationCode === 'HH') {
        activityStatus = 'warning';
      } else if (interpretationCode === 'L' || interpretationCode === 'LL') {
        activityStatus = 'warning';
      }
    }
    
    // Format value if available
    let valueText = '';
    if (obs.valueQuantity && obs.valueQuantity.value !== undefined) {
      valueText = ` - ${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}`;
    }
    
    activityItems.push({
      id: `observation-${obs.id}`,
      title: 'New measurement',
      description: `${observationName}${valueText}`,
      timestamp: new Date(obs.effectiveDateTime),
      type: 'observation',
      status: activityStatus
    });
  });
  
  // Add allergies to activity feed
  allergies.forEach(allergy => {
    if (!allergy.recordedDate) return;
    
    const allergyName = allergy.code?.coding?.[0]?.display || 'Unknown allergy';
    let activityStatus: ActivityItem['status'] = 'info';
    
    if (allergy.criticality === 'high') {
      activityStatus = 'error';
    } else if (allergy.criticality === 'low') {
      activityStatus = 'warning';
    }
    
    activityItems.push({
      id: `allergy-${allergy.id}`,
      title: 'Allergy recorded',
      description: allergyName,
      timestamp: new Date(allergy.recordedDate),
      type: 'allergy',
      status: activityStatus
    });
  });
  
  // Add immunizations to activity feed
  immunizations.forEach(immunization => {
    if (!immunization.occurrenceDateTime) return;
    
    const vaccineName = immunization.vaccineCode?.coding?.[0]?.display || 'Unknown vaccine';
    let activityStatus: ActivityItem['status'] = 'success';
    
    activityItems.push({
      id: `immunization-${immunization.id}`,
      title: 'Immunization received',
      description: vaccineName,
      timestamp: new Date(immunization.occurrenceDateTime),
      type: 'immunization',
      status: activityStatus
    });
  });
  
  // Add care gaps to activity feed
  careGaps.forEach(careGap => {
    const gapName = careGap.title || 'Unknown care gap';
    let activityStatus: ActivityItem['status'] = 'warning';
    
    if (careGap.status === 'due') {
      activityStatus = 'warning';
    } else if (careGap.status === 'overdue') {
      activityStatus = 'error';
    }
    
    activityItems.push({
      id: `care-gap-${careGap.id}`,
      title: 'Care gap identified',
      description: gapName,
      timestamp: new Date(), // Care gaps don't have dates in our model, use current date
      type: 'care-gap',
      status: activityStatus
    });
  });
  
  // Add a system notification about the new visualizations
  activityItems.push({
    id: 'system-visualization',
    title: 'New feature',
    description: 'Interactive health visualizations are now available',
    timestamp: new Date(),
    type: 'system',
    status: 'info'
  });
  
  // Sort by timestamp (newest first)
  return activityItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Individual activity item component
interface ActivityItemProps {
  item: ActivityItem;
}

function ActivityItem({ item }: ActivityItemProps) {
  // Different icons for different activity types
  const getIcon = () => {
    switch (item.type) {
      case 'condition':
        return <AlertCircle className="h-5 w-5" />;
      case 'medication':
        return <Pill className="h-5 w-5" />;
      case 'observation':
        return <Activity className="h-5 w-5" />;
      case 'allergy':
        return <AlertCircle className="h-5 w-5" />;
      case 'immunization':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'care-gap':
        return <Clock className="h-5 w-5" />;
      case 'appointment':
        return <Calendar className="h-5 w-5" />;
      case 'system':
        return <Bell className="h-5 w-5" />;
      default:
        return <HistoryIcon className="h-5 w-5" />;
    }
  };
  
  // Different colors for different statuses
  const getStatusColor = () => {
    switch (item.status) {
      case 'info':
        return 'text-blue-500 bg-blue-50';
      case 'warning':
        return 'text-amber-500 bg-amber-50';
      case 'success':
        return 'text-green-500 bg-green-50';
      case 'error':
        return 'text-red-500 bg-red-50';
      case 'pending':
        return 'text-purple-500 bg-purple-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };
  
  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <div className={cn("rounded-full p-2 flex-shrink-0", getStatusColor())}>
        {getIcon()}
      </div>
      <div className="grid gap-1">
        <div className="font-medium">{item.title}</div>
        <div className="text-sm text-gray-600">{item.description}</div>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

// Main health feed component
interface HealthFeedProps {
  conditions: Condition[];
  medications: MedicationRequest[];
  observations: Observation[];
  allergies: AllergyIntolerance[];
  immunizations: Immunization[];
  careGaps: CareGap[];
}

export function HealthFeed({
  conditions,
  medications,
  observations,
  allergies,
  immunizations,
  careGaps
}: HealthFeedProps) {
  
  // Generate all activity items
  const allActivityItems = generateActivityItems(
    conditions,
    medications,
    observations,
    allergies,
    immunizations,
    careGaps
  );
  
  // Filter for recent activity (last 30 days)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const recentActivity = allActivityItems.filter(item => item.timestamp >= cutoffDate);
  
  // Filter by type for specific feeds
  const medicalActivity = allActivityItems.filter(
    item => ['condition', 'medication', 'observation'].includes(item.type)
  );
  
  const preventiveActivity = allActivityItems.filter(
    item => ['immunization', 'care-gap'].includes(item.type)
  );
  
  const alertsActivity = allActivityItems.filter(
    item => item.status === 'warning' || item.status === 'error'
  );
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-primary" />
          Health Feed
        </CardTitle>
        <CardDescription>
          Recent updates and activity in your health record
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recent">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Recent</span>
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Medical</span>
            </TabsTrigger>
            <TabsTrigger value="preventive" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Preventive</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Alerts</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent">
            <div className="space-y-2 divide-y">
              {recentActivity.length > 0 ? (
                recentActivity.map(item => (
                  <ActivityItem key={item.id} item={item} />
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <HistoryIcon className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p>No recent activity in the last 30 days</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="medical">
            <div className="space-y-2 divide-y">
              {medicalActivity.length > 0 ? (
                medicalActivity.map(item => (
                  <ActivityItem key={item.id} item={item} />
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <Activity className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p>No medical activity found</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="preventive">
            <div className="space-y-2 divide-y">
              {preventiveActivity.length > 0 ? (
                preventiveActivity.map(item => (
                  <ActivityItem key={item.id} item={item} />
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p>No preventive care activity found</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="alerts">
            <div className="space-y-2 divide-y">
              {alertsActivity.length > 0 ? (
                alertsActivity.map(item => (
                  <ActivityItem key={item.id} item={item} />
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p>No alerts found</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}