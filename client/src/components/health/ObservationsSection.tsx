import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatFhirDateTime, getObservationValue, getObservationReferenceRange, getObservationStatusClass } from "@/lib/fhir-client";
import { TestTube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  
  // Get badge variant based on status
  const getBadgeVariant = (color: string) => {
    switch (color) {
      case 'green': return 'success';
      case 'yellow': return 'warning';
      case 'red': return 'destructive';
      default: return 'secondary';
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading lab results...</p>
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
