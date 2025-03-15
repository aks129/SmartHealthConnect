import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatFhirDate, getPatientName } from "@/lib/fhir-client";
import { Activity, Pill, AlertTriangle, Syringe } from "lucide-react";
import type { Patient } from '@shared/schema';

export function PatientSummary() {
  const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient>({
    queryKey: ['/api/fhir/patient'],
  });
  
  const { data: conditions, isLoading: isLoadingConditions } = useQuery<any[]>({
    queryKey: ['/api/fhir/condition'],
  });

  const { data: medications, isLoading: isLoadingMedications } = useQuery<any[]>({
    queryKey: ['/api/fhir/medicationrequest'],
  });
  
  const { data: allergies, isLoading: isLoadingAllergies } = useQuery<any[]>({
    queryKey: ['/api/fhir/allergyintolerance'],
  });
  
  const { data: immunizations, isLoading: isLoadingImmunizations } = useQuery<any[]>({
    queryKey: ['/api/fhir/immunization'],
  });
  
  const isLoading = isLoadingPatient || isLoadingConditions || isLoadingMedications || 
                     isLoadingAllergies || isLoadingImmunizations;

  // Get patient data safely
  const patientName = patient ? getPatientName(patient) : 'Loading...';
  const patientDOB = patient?.birthDate ? formatFhirDate(patient.birthDate) : 'Unknown';
  const patientGender = patient?.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Unknown';
  
  // Get identifier (MRN)
  const getMRN = () => {
    if (!patient?.identifier || !patient.identifier.length) return 'Unknown';
    // Try to find an MRN identifier
    const mrn = patient.identifier.find(id => 
      id.type?.coding?.some(coding => 
        coding.code === 'MR' || coding.display?.includes('Medical Record')
      )
    );
    return mrn ? mrn.value : patient.identifier[0].value;
  };
  
  // Get contact information
  const getPhone = () => {
    if (!patient?.telecom || !patient.telecom.length) return 'Unknown';
    const phone = patient.telecom.find(t => t.system === 'phone');
    return phone ? phone.value : 'Unknown';
  };
  
  const getEmail = () => {
    if (!patient?.telecom || !patient.telecom.length) return 'Unknown';
    const email = patient.telecom.find(t => t.system === 'email');
    return email ? email.value : 'Unknown';
  };

  return (
    <section id="summary" className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Health Summary</h2>
      
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{patientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">{patientDOB}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium">{patientGender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MRN</p>
              <p className="font-medium">{getMRN()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{getPhone()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{getEmail()}</p>
            </div>
          </div>
        </CardContent>
        
        <CardHeader className="border-t border-b pb-4 mt-4">
          <CardTitle>Health Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Conditions count */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Conditions</p>
                  <p className="text-xl font-semibold">
                    {isLoadingConditions ? "..." : conditions?.length || 0}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Medications count */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Medications</p>
                  <p className="text-xl font-semibold">
                    {isLoadingMedications ? "..." : medications?.length || 0}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Allergies count */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-3">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Allergies</p>
                  <p className="text-xl font-semibold">
                    {isLoadingAllergies ? "..." : allergies?.length || 0}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Immunizations count */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3">
                  <Syringe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Immunizations</p>
                  <p className="text-xl font-semibold">
                    {isLoadingImmunizations ? "..." : immunizations?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
