import { EmptyState } from "@/components/ui/empty-state";
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

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function ObservationsSection() {
  const { data: observations, isLoading, error } = useQuery<Observation[]>({
    queryKey: ['/api/fhir/observation'],
  });

  // Helper for safe date parsing
  const parseDateSafe = (dateStr: string): string => {
    if (!dateStr) return 'Unknown';
    // Handle YYYY-MM or YYYY format which new Date() might handle inconsistently across browsers
    const cleanDate = dateStr.length === 4 ? `${dateStr}-01-01` : dateStr;
    const date = new Date(cleanDate);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
  };

  // Group observations by code for trend analysis
  const getTrendData = (code: string) => {
    if (!observations) return [];
    return observations
      .filter(o =>
        (o.code?.text === code || o.code?.coding?.[0]?.display === code) &&
        o.valueQuantity?.value !== undefined
      )
      .sort((a, b) => {
        const dateA = a.effectiveDateTime || a.issued || '';
        const dateB = b.effectiveDateTime || b.issued || '';
        return dateA.localeCompare(dateB); // Oldest first for charts
      })
      .map(o => ({
        date: parseDateSafe(o.effectiveDateTime || o.issued || ''),
        value: o.valueQuantity?.value
      }));
  };

  // Identify key metrics that usually have numeric trends
  const trendMetrics = ['Body Weight', 'Body Mass Index', 'Systolic Blood Pressure', 'Diastolic Blood Pressure', 'Heart Rate'];

  // Find which of these actually have data
  const availableTrends = observations
    ? trendMetrics.filter(metric => getTrendData(metric).length > 1)
    : [];

  // Get badge variant based on status
  const getBadgeVariant = (color: string): "destructive" | "secondary" | "default" | "outline" | null | undefined => {
    switch (color) {
      case 'red': return 'destructive';
      default: return 'secondary';
    }
  };

  // Get additional classes for status colors
  const getStatusColorClass = (color: string): string => {
    switch (color) {
      case 'green': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30';
      case 'yellow': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30';
      default: return '';
    }
  };

  return (
    <section id="observations" className="mb-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">Recent Lab Results</h2>

      {/* Trend Analysis Section */}
      {!isLoading && availableTrends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {availableTrends.map(metric => {
            const data = getTrendData(metric);
            const latest = data[data.length - 1];
            return (
              <Card key={metric} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{metric}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latest?.value}</div>
                  <div className="h-[80px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
            <div className="py-8 text-center bg-destructive/5 rounded-lg border border-destructive/20 mx-4">
              <div className="flex flex-col items-center justify-center text-destructive">
                <p className="font-semibold mb-1">Unable to load lab results</p>
                <p className="text-sm opacity-80">Our system encountered a temporary error.</p>
              </div>
            </div>
          )}

          {!isLoading && observations && observations.length === 0 && (
            <EmptyState
              title="No Lab Results"
              description="No laboratory results or observations found in your record."
              icon={TestTube}
              className="border-none bg-transparent"
            />
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
                  {observations
                    .sort((a, b) => {
                      const dateA = a.effectiveDateTime || a.issued || '';
                      const dateB = b.effectiveDateTime || b.issued || '';
                      return dateB.localeCompare(dateA);
                    })
                    .map(observation => {
                      const testName = observation.code?.text || (observation.code?.coding && observation.code.coding.length > 0 ? observation.code.coding[0].display : 'Unknown Test');
                      const value = getObservationValue(observation);
                      const referenceRange = getObservationReferenceRange(observation);
                      const date = formatFhirDateTime(observation.effectiveDateTime || observation.issued);
                      const status = getObservationStatusClass(observation);

                      // Get category if available
                      let category = 'Unknown';
                      // Using type assertion to work around schema mismatch
                      const obsWithCategory = observation as any;
                      if (obsWithCategory.category &&
                        Array.isArray(obsWithCategory.category) &&
                        obsWithCategory.category.length > 0 &&
                        obsWithCategory.category[0].coding &&
                        Array.isArray(obsWithCategory.category[0].coding) &&
                        obsWithCategory.category[0].coding.length > 0) {
                        category = obsWithCategory.category[0].coding[0].display ||
                          obsWithCategory.category[0].coding[0].code ||
                          'Unknown';
                      }

                      return (
                        <TableRow key={observation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{testName}</div>
                              <div className="text-xs text-muted-foreground">{category}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{value}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-muted-foreground">{referenceRange}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-muted-foreground">{date}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getBadgeVariant(status.color)}
                              className={getStatusColorClass(status.color)}
                            >
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
