import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatFhirDate, getPatientName } from "@/lib/fhir-client";
import { Activity, Pill, AlertTriangle, Syringe, User } from "lucide-react";
import { MedicalLoadingOverlay } from "@/components/ui/medical-spinner";
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
    <MedicalLoadingOverlay loading={isLoading} size="md" variant="primary" blur={true}>
      <section id="summary" className="mb-8 px-4 md:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Health Summary</h2>

        <Card className="shadow-lg rounded-xl border-none">
          <CardHeader className="border-b dark:border-gray-700 pb-4 px-6 pt-6">
            <CardTitle className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 px-6 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                <p className="font-medium text-base text-gray-900 dark:text-white">{patientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                <p className="font-medium text-base text-gray-900 dark:text-white">{patientDOB}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
                <p className="font-medium text-base text-gray-900 dark:text-white">{patientGender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">MRN</p>
                <p className="font-medium text-base text-gray-900 dark:text-white">{getMRN()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-medium text-base text-gray-900 dark:text-white">{getPhone()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-base text-gray-900 dark:text-white">{getEmail()}</p>
              </div>
            </div>
          </CardContent>

          <CardHeader className="border-t dark:border-gray-700 border-b pb-4 px-6 pt-6 mt-4">
            <CardTitle className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 px-6 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Conditions count */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border dark:border-gray-700 shadow-sm flex items-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Conditions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isLoadingConditions ? "..." : conditions?.length || 0}
                  </p>
                </div>
              </div>

              {/* Medications count */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border dark:border-gray-700 shadow-sm flex items-center">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400 mr-4">
                  <Pill className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Medications</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isLoadingMedications ? "..." : medications?.length || 0}
                  </p>
                </div>
              </div>

              {/* Allergies count */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border dark:border-gray-700 shadow-sm flex items-center">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400 mr-4">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Allergies</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isLoadingAllergies ? "..." : allergies?.length || 0}
                  </p>
                </div>
              </div>

              {/* Immunizations count */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border dark:border-gray-700 shadow-sm flex items-center">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-4">
                  <Syringe className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Immunizations</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isLoadingImmunizations ? "..." : immunizations?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </MedicalLoadingOverlay>
  );
}