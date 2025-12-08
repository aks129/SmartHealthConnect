import { EmptyState } from "@/components/ui/empty-state";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatFhirDateTime, getDisplayFromCodeableConcept } from "@/lib/fhir-client";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MedicalSpinner } from "@/components/ui/medical-spinner";
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

  // Map category colors to badge variants that exist in our Badge component
  const getBadgeVariant = (color: string) => {
    switch (color) {
      case 'red': return 'destructive';
      // For other colors, use secondary with custom styling
      default: return 'secondary';
    }
  };

  // Get CSS class based on category color
  const getBadgeColorClass = (color: string) => {
    switch (color) {
      case 'yellow': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'blue': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'green': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'red': return ''; // Will use the destructive variant
      default: return '';
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
              <MedicalSpinner
                size="md"
                text="Loading conditions..."
                variant="primary"
                multiIcon={true}
                speed="normal"
              />
            </div>
          )}

          {error && (
            <div className="py-8 text-center bg-destructive/5 rounded-lg border border-destructive/20 mx-4">
              <div className="flex flex-col items-center justify-center text-destructive">
                <p className="font-semibold mb-1">Unable to load conditions</p>
                <p className="text-sm opacity-80">Our system encountered a temporary error.</p>
              </div>
            </div>
          )}



          {!isLoading && conditions && conditions.length === 0 && (
            <EmptyState
              title="No Conditions Found"
              description="No medical conditions were found in your record."
              icon={Activity}
              className="border-none bg-transparent"
            />
          )}

          {!isLoading && conditions && conditions.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {conditions
                .sort((a, b) => {
                  const dateA = a.onsetDateTime || a.recordedDate || '';
                  const dateB = b.onsetDateTime || b.recordedDate || '';
                  return dateB.localeCompare(dateA);
                })
                .map(condition => {
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
                          <Badge
                            variant={getBadgeVariant(category.color)}
                            className={getBadgeColorClass(category.color)}
                          >
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
