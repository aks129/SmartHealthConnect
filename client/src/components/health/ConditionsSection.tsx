import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatFhirDateTime, getDisplayFromCodeableConcept } from "@/lib/fhir-client";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Condition } from '@shared/schema';

export function ConditionsSection() {
  const { data: conditions, isLoading, error } = useQuery<Condition[]>({
    queryKey: ['/api/fhir/condition'],
  });
  
  // Function to determine condition category/chronicity
  const getConditionCategory = (condition: Condition) => {
    // Check for specific category codings
    if (condition.category && condition.category.length > 0) {
      for (const category of condition.category) {
        if (category.coding) {
          for (const coding of category.coding) {
            // Look for common category codes
            if (coding.code === 'problem-list-item') {
              return { label: 'Chronic', color: 'yellow' };
            }
            if (coding.code === 'encounter-diagnosis') {
              return { label: 'Acute', color: 'blue' };
            }
            if (coding.display?.toLowerCase().includes('chronic')) {
              return { label: 'Chronic', color: 'yellow' };
            }
          }
        }
      }
    }
    
    // Check clinical status if available
    if (condition.clinicalStatus?.coding) {
      for (const coding of condition.clinicalStatus.coding) {
        if (coding.code === 'active') {
          return { label: 'Active', color: 'yellow' };
        }
        if (coding.code === 'resolved') {
          return { label: 'Resolved', color: 'green' };
        }
        if (coding.code === 'inactive') {
          return { label: 'Inactive', color: 'gray' };
        }
      }
    }
    
    // Default category
    return { label: 'Unknown', color: 'gray' };
  };
  
  // Function to get clinical status text
  const getClinicalStatus = (condition: Condition) => {
    if (!condition.clinicalStatus?.coding?.length) {
      return 'Unknown status';
    }
    
    const coding = condition.clinicalStatus.coding[0];
    
    if (coding.display) {
      return coding.display;
    }
    
    // Map common clinical status codes to human-readable text
    if (coding.code === 'active') {
      return 'Clinically active';
    }
    if (coding.code === 'recurrence') {
      return 'Recurrent';
    }
    if (coding.code === 'relapse') {
      return 'Relapsed';
    }
    if (coding.code === 'inactive') {
      return 'Inactive';
    }
    if (coding.code === 'remission') {
      return 'In remission';
    }
    if (coding.code === 'resolved') {
      return 'Resolved';
    }
    
    return coding.code || 'Unknown status';
  };
  
  // Function to determine the onset date to display
  const getOnsetDate = (condition: Condition) => {
    // Check for various date fields
    if (condition.onsetDateTime) {
      return {
        date: formatFhirDateTime(condition.onsetDateTime),
        label: 'Onset'
      };
    }
    
    if (condition.recordedDate) {
      return {
        date: formatFhirDateTime(condition.recordedDate),
        label: 'Recorded'
      };
    }
    
    return {
      date: 'Unknown date',
      label: 'Diagnosed'
    };
  };
  
  // Get badge color based on category
  const getBadgeVariant = (color: string) => {
    switch (color) {
      case 'yellow': return 'warning';
      case 'blue': return 'info';
      case 'green': return 'success';
      case 'red': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <section id="conditions" className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Conditions</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Medical Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading conditions...</p>
            </div>
          )}
          
          {error && (
            <div className="py-6 text-center">
              <p className="text-destructive">Error loading conditions</p>
            </div>
          )}
          
          {!isLoading && conditions && conditions.length === 0 && (
            <div className="py-6 text-center">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No conditions found in your record</p>
            </div>
          )}
          
          {!isLoading && conditions && conditions.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {conditions.map(condition => {
                const conditionName = getDisplayFromCodeableConcept(condition.code);
                const status = getClinicalStatus(condition);
                const category = getConditionCategory(condition);
                const onsetInfo = getOnsetDate(condition);
                
                return (
                  <li key={condition.id} className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{conditionName}</h3>
                        <p className="text-sm text-gray-500 mt-1">{status}</p>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <Badge variant={getBadgeVariant(category.color)}>
                          {category.label}
                        </Badge>
                        <span className="text-sm text-gray-500 ml-2">
                          {onsetInfo.label}: {onsetInfo.date}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
