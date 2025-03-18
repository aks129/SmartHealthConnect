import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatFhirDateTime, getObservationValue, getObservationReferenceRange, getObservationStatusClass } from "@/lib/fhir-client";
import { TestTube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MedicalSpinner } from "@/components/ui/medical-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Observation } from '@shared/schema';

export function ObservationsSection() {
  const { data: observations, isLoading, error } = useQuery<Observation[]>({
    queryKey: ['/api/fhir/observation'],
  });
  
  // Get badge variant based on status, mapping to allowed variants in our UI
  const getBadgeVariant = (color: string): "destructive" | "secondary" | "default" | "outline" | null | undefined => {
    switch (color) {
      case 'red': return 'destructive';
      default: return 'secondary';
    }
  };
  
  // Get additional classes for status colors that aren't in our Badge variants
  const getStatusColorClass = (color: string): string => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      default: return '';
    }
  };

  return (
    <section id="observations" className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Lab Results</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Laboratory Observations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-6 text-center">
              <MedicalSpinner 
                size="md" 
                text="Loading lab results..." 
                variant="info"
                multiIcon={true}
                speed="normal"
              />
            </div>
          )}
          
          {error && (
            <div className="py-6 text-center">
              <p className="text-destructive">Error loading lab results</p>
            </div>
          )}
          
          {!isLoading && observations && observations.length === 0 && (
            <div className="py-6 text-center">
              <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No lab results found in your record</p>
            </div>
          )}
          
          {!isLoading && observations && observations.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reference Range</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observations.map(observation => {
                    const testName = observation.code?.text || (observation.code?.coding && observation.code.coding.length > 0 ? observation.code.coding[0].display : 'Unknown Test');
                    const value = getObservationValue(observation);
                    const referenceRange = getObservationReferenceRange(observation);
                    const date = formatFhirDateTime(observation.effectiveDateTime || observation.issued);
                    const status = getObservationStatusClass(observation);
                    
                    // Get category if available
                    let category = 'Unknown';
                    if (observation.category && observation.category.length > 0 && observation.category[0].coding && observation.category[0].coding.length > 0) {
                      category = observation.category[0].coding[0].display || observation.category[0].coding[0].code || 'Unknown';
                    }
                    
                    return (
                      <TableRow key={observation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{testName}</div>
                            <div className="text-xs text-gray-500">{category}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{value}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-500">{referenceRange}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-500">{date}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(status.color)}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
