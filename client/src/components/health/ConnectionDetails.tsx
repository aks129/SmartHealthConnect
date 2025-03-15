import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export function ConnectionDetails() {
  const { data: session } = useQuery({
    queryKey: ['/api/fhir/sessions/current'],
  });

  return (
    <section className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>FHIR Connection Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500">FHIR Server</span>
              <span className="font-mono">{session?.fhirServer || 'Unknown'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">Authorization</span>
              <span className="font-mono">SMART on FHIR OAuth 2.0</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">FHIR Version</span>
              <span className="font-mono">R4 (4.0.1)</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">Resources Accessed</span>
              <span className="font-mono">Patient, Condition, Observation, MedicationRequest, AllergyIntolerance, Immunization</span>
            </div>
            {session?.scope && (
              <div className="flex flex-col">
                <span className="text-gray-500">Authorized Scopes</span>
                <span className="font-mono">{session.scope}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
