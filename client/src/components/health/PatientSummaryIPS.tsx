import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Patient, Condition, Observation, MedicationRequest, AllergyIntolerance, Immunization } from '@shared/schema';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import {
  formatFhirDate,
  formatFhirDateTime,
  getDisplayFromCodeableConcept,
  getObservationValue,
} from '@/lib/fhir-client';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, FileText, Shield, Pill, Droplet, Syringe, AlertCircle, FileUp, User, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AudienceType = 'patient' | 'provider';

export function PatientSummaryIPS() {
  const [audience, setAudience] = useState<AudienceType>('patient');

  // Fetch patient data
  const { data: patient } = useQuery<Patient>({
    queryKey: ['/api/fhir/patient'],
  });

  // Fetch conditions
  const { data: conditions = [] } = useQuery<Condition[]>({
    queryKey: ['/api/fhir/condition'],
  });

  // Fetch observations
  const { data: observations = [] } = useQuery<Observation[]>({
    queryKey: ['/api/fhir/observation'],
  });

  // Fetch medications
  const { data: medications = [] } = useQuery<MedicationRequest[]>({
    queryKey: ['/api/fhir/medicationrequest'],
  });

  // Fetch allergies
  const { data: allergies = [] } = useQuery<AllergyIntolerance[]>({
    queryKey: ['/api/fhir/allergyintolerance'],
  });

  // Fetch immunizations
  const { data: immunizations = [] } = useQuery<Immunization[]>({
    queryKey: ['/api/fhir/immunization'],
  });

  // Sort observations by category for better organization
  const organizedObservations = useMemo(() => {
    const result: Record<string, Observation[]> = {
      'vital-signs': [],
      'laboratory': [],
      'imaging': [],
      'other': []
    };

    observations.forEach(obs => {
      // Default category
      let category = 'other';
      
      // Use the code system to determine observation type
      // Since category field isn't in our schema, we'll determine by code
      if (obs.code?.coding) {
        // Check code system and code value to identify lab results
        if (obs.code.coding.some(c => 
          (c.system?.includes('loinc') || c.system?.includes('LOINC')) || 
          (obs.code.text?.toLowerCase().includes('lab') || 
           obs.code.text?.toLowerCase().includes('test')))) {
          category = 'laboratory';
        }
        
        // Check for vital signs by common codes or display names
        else if (obs.code.coding.some(c => 
          c.code === '8867-4' || // Heart rate
          c.code === '8480-6' || // Blood pressure
          c.code === '8310-5' || // Temperature
          c.code === '8462-4' || // Diastolic blood pressure
          c.code === '8480-6' || // Systolic blood pressure
          c.code === '9279-1' || // Respiratory rate
          c.code === '8310-5' || // Body temperature
          c.code === '39156-5' || // BMI
          c.code === '8287-5' || // Head circumference
          c.code === '9843-4' || // Head circumference percentile
          c.code === '29463-7' || // Weight
          c.code === '3141-9' || // Weight
          c.code === '8302-2' || // Height
          c.code === '8306-3' || // Height
          c.display?.toLowerCase().includes('blood pressure') ||
          c.display?.toLowerCase().includes('heart rate') ||
          c.display?.toLowerCase().includes('pulse') ||
          c.display?.toLowerCase().includes('temperature') ||
          c.display?.toLowerCase().includes('respiratory') ||
          c.display?.toLowerCase().includes('bmi') ||
          c.display?.toLowerCase().includes('weight') ||
          c.display?.toLowerCase().includes('height'))) {
          category = 'vital-signs';
        }
        
        // Check for imaging results
        else if (obs.code.coding.some(c => 
          c.display?.toLowerCase().includes('x-ray') ||
          c.display?.toLowerCase().includes('mri') ||
          c.display?.toLowerCase().includes('ct scan') ||
          c.display?.toLowerCase().includes('ultrasound') ||
          c.display?.toLowerCase().includes('imaging') ||
          c.display?.toLowerCase().includes('radiology'))) {
          category = 'imaging';
        }
      }
      
      result[category].push(obs);
    });
    
    return result;
  }, [observations]);

  // Group conditions by clinical status
  const organizedConditions = useMemo(() => {
    const result: Record<string, Condition[]> = {
      'active': [],
      'resolved': [],
      'other': []
    };

    conditions.forEach(condition => {
      let status = 'other';
      
      if (condition.clinicalStatus?.coding?.[0]?.code) {
        status = condition.clinicalStatus.coding[0].code === 'active' 
          ? 'active' 
          : condition.clinicalStatus.coding[0].code === 'resolved'
            ? 'resolved'
            : 'other';
      }
      
      result[status].push(condition);
    });
    
    return result;
  }, [conditions]);

  // Sort medications by status
  const organizedMedications = useMemo(() => {
    const result: Record<string, MedicationRequest[]> = {
      'active': [],
      'completed': [],
      'other': []
    };

    medications.forEach(med => {
      let status = 'other';
      
      if (med.status) {
        status = med.status === 'active' 
          ? 'active' 
          : med.status === 'completed'
            ? 'completed'
            : 'other';
      }
      
      result[status].push(med);
    });
    
    return result;
  }, [medications]);

  // Helper function to format a date based on audience preference
  const formatDate = (date: string | undefined, forProvider = false) => {
    if (!date) return 'Unknown';
    return forProvider ? formatFhirDateTime(date) : formatFhirDate(date);
  };

  // Generate downloadable summary
  const generateSummaryFile = () => {
    let content = '';
    
    // Format patient info
    if (patient) {
      content += `INTERNATIONAL PATIENT SUMMARY\n`;
      content += `===============================\n\n`;
      content += `PATIENT INFORMATION\n`;
      content += `Name: ${patient.name?.[0]?.family}, ${patient.name?.[0]?.given?.join(' ') || 'Unknown'}\n`;
      content += `Birth Date: ${formatFhirDate(patient.birthDate)}\n`;
      content += `Gender: ${patient.gender || 'Unknown'}\n\n`;
    }
    
    // Format conditions
    content += `PROBLEMS & CONDITIONS\n`;
    conditions.forEach(cond => {
      const conditionName = getDisplayFromCodeableConcept(cond.code);
      const status = cond.clinicalStatus?.coding?.[0]?.display || 'Unknown status';
      const onset = cond.onsetDateTime ? formatFhirDate(cond.onsetDateTime) : 'Unknown onset';
      content += `- ${conditionName} (${status}, onset: ${onset})\n`;
    });
    content += `\n`;
    
    // Format medications
    content += `MEDICATIONS\n`;
    medications.forEach(med => {
      let medName = 'Unknown medication';
      if (med.medicationCodeableConcept) {
        medName = getDisplayFromCodeableConcept(med.medicationCodeableConcept);
      } else if (med.medicationReference?.display) {
        medName = med.medicationReference.display;
      }
      const dosage = med.dosageInstruction?.[0]?.text || 'No dosage information';
      content += `- ${medName}: ${dosage}\n`;
    });
    content += `\n`;
    
    // Format allergies
    content += `ALLERGIES\n`;
    allergies.forEach(allergy => {
      const allergyName = getDisplayFromCodeableConcept(allergy.code);
      const severity = allergy.reaction?.[0]?.severity || 'Unknown severity';
      content += `- ${allergyName} (${severity})\n`;
    });
    content += `\n`;
    
    // Format vital signs (common observations)
    content += `VITAL SIGNS\n`;
    organizedObservations['vital-signs'].forEach(obs => {
      const obsName = getDisplayFromCodeableConcept(obs.code);
      const value = getObservationValue(obs);
      const date = formatFhirDate(obs.effectiveDateTime);
      content += `- ${obsName}: ${value} (${date})\n`;
    });
    content += `\n`;
    
    // Format lab results
    content += `LABORATORY RESULTS\n`;
    organizedObservations['laboratory'].forEach(obs => {
      const obsName = getDisplayFromCodeableConcept(obs.code);
      const value = getObservationValue(obs);
      const date = formatFhirDate(obs.effectiveDateTime);
      content += `- ${obsName}: ${value} (${date})\n`;
    });
    content += `\n`;
    
    // Format immunizations
    content += `IMMUNIZATIONS\n`;
    immunizations.forEach(imm => {
      const vaccineCode = getDisplayFromCodeableConcept(imm.vaccineCode);
      const date = formatFhirDate(imm.occurrenceDateTime);
      content += `- ${vaccineCode} (${date})\n`;
    });
    
    // Create and download the text file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-summary-${audience}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderPatientView = () => (
    <div className="space-y-6">
      {/* Patient Information */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <User size={20} />
            <CardTitle>My Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {patient && (
            <>
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">
                  {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Date of Birth:</span>{' '}
                <span className="font-medium">{formatDate(patient.birthDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Gender:</span>{' '}
                <span className="font-medium">{patient.gender}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Health Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <FileText size={20} />
            <CardTitle>Health Conditions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Current Health Issues</h4>
            {organizedConditions.active.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {organizedConditions.active.map((condition, index) => (
                  <li key={index}>
                    {getDisplayFromCodeableConcept(condition.code)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No active conditions recorded</p>
            )}
          </div>
          
          {organizedConditions.resolved.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Past Health Issues (Resolved)</h4>
              <ul className="list-disc pl-5 space-y-1">
                {organizedConditions.resolved.map((condition, index) => (
                  <li key={index}>
                    {getDisplayFromCodeableConcept(condition.code)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Pill size={20} />
            <CardTitle>Medications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Current Medications</h4>
            {organizedMedications.active.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {organizedMedications.active.map((med, index) => {
                  const medication = med.medicationCodeableConcept 
                    ? getDisplayFromCodeableConcept(med.medicationCodeableConcept)
                    : med.medicationReference?.display || 'Unknown medication';
                  
                  const dosage = med.dosageInstruction?.[0]?.text;
                  
                  return (
                    <li key={index}>
                      <div>{medication}</div>
                      {dosage && <div className="text-sm text-muted-foreground">{dosage}</div>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No active medications recorded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} />
            <CardTitle>Allergies</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {allergies.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {allergies.map((allergy, index) => (
                <li key={index}>
                  <span className="font-medium">{getDisplayFromCodeableConcept(allergy.code)}</span>
                  {allergy.reaction && allergy.reaction.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Reactions: {allergy.reaction?.map(r => 
                        r.manifestation?.map(m => getDisplayFromCodeableConcept(m)).join(', ')
                      ).join('; ')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No allergies recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Immunizations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Syringe size={20} />
            <CardTitle>Immunizations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {immunizations.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {immunizations.map((immunization, index) => (
                <li key={index}>
                  <div>{getDisplayFromCodeableConcept(immunization.vaccineCode)}</div>
                  <div className="text-sm text-muted-foreground">
                    Date: {formatDate(immunization.occurrenceDateTime)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No immunizations recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Lab Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Droplet size={20} />
            <CardTitle>Recent Lab Results</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {organizedObservations.laboratory.length > 0 ? (
            <div className="space-y-4">
              {organizedObservations.laboratory.slice(0, 6).map((obs, index) => (
                <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                  <div className="font-medium">{getDisplayFromCodeableConcept(obs.code)}</div>
                  <div className="flex justify-between">
                    <span>{getObservationValue(obs)}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(obs.effectiveDateTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No laboratory results recorded</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={generateSummaryFile}
          className="flex items-center space-x-2"
        >
          <FileUp size={16} />
          <span>Download Full Summary</span>
        </Button>
      </div>
    </div>
  );

  const renderProviderView = () => (
    <div className="space-y-6">
      {/* Patient Demographics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <User size={20} />
            <CardTitle>Patient Demographics</CardTitle>
          </div>
          <CardDescription>IPS Conformant Patient Data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {patient && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Full Name</div>
                  <div className="font-medium">
                    {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Gender</div>
                  <div className="font-medium">{patient.gender}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Date of Birth</div>
                  <div className="font-medium">{formatDate(patient.birthDate, true)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Patient ID</div>
                  <div className="font-medium">{patient.id}</div>
                </div>
              </div>
              {patient.identifier && patient.identifier.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground mb-1">Identifiers</div>
                  <div className="grid grid-cols-1 gap-2">
                    {patient.identifier.map((id, index) => (
                      <div key={index} className="text-sm flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {id.system ? id.system.split('/').pop() : 'ID'}
                        </Badge>
                        <span>{id.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Problems List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <FileText size={20} />
            <CardTitle>Problem List</CardTitle>
          </div>
          <CardDescription>Current and Past Medical Conditions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="font-semibold flex items-center space-x-2 mb-2">
              <Badge variant="default">Active</Badge>
            </div>
            {organizedConditions.active.length > 0 ? (
              <div className="space-y-3">
                {organizedConditions.active.map((condition, index) => {
                  const codings = condition.code?.coding || [];
                  return (
                    <div key={index} className="border-b pb-3 last:border-0">
                      <div className="font-medium">{getDisplayFromCodeableConcept(condition.code)}</div>
                      {codings.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {codings.map((coding, idx) => (
                            <div key={idx} className="text-xs">
                              <Badge variant="outline" className="mr-1">
                                {coding.system?.split('/').pop() || 'code'}
                              </Badge>
                              {coding.code}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-sm mt-1 text-muted-foreground">
                        <span>Onset: {formatDate(condition.onsetDateTime, true)}</span>
                        {condition.recordedDate && (
                          <span className="ml-3">Recorded: {formatDate(condition.recordedDate, true)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No active conditions recorded</p>
            )}
          </div>
          
          {organizedConditions.resolved.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold flex items-center space-x-2 mb-2">
                <Badge variant="outline">Resolved</Badge>
              </div>
              <div className="space-y-3">
                {organizedConditions.resolved.map((condition, index) => {
                  const codings = condition.code?.coding || [];
                  return (
                    <div key={index} className="border-b pb-3 last:border-0">
                      <div className="font-medium">{getDisplayFromCodeableConcept(condition.code)}</div>
                      {codings.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {codings.map((coding, idx) => (
                            <div key={idx} className="text-xs">
                              <Badge variant="outline" className="mr-1">
                                {coding.system?.split('/').pop() || 'code'}
                              </Badge>
                              {coding.code}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-sm mt-1 text-muted-foreground">
                        <span>Onset: {formatDate(condition.onsetDateTime, true)}</span>
                        {condition.recordedDate && (
                          <span className="ml-3">Recorded: {formatDate(condition.recordedDate, true)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Pill size={20} />
            <CardTitle>Medication Summary</CardTitle>
          </div>
          <CardDescription>Current and Past Medications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="font-semibold flex items-center space-x-2 mb-2">
              <Badge variant="default">Active</Badge>
            </div>
            {organizedMedications.active.length > 0 ? (
              <div className="space-y-3">
                {organizedMedications.active.map((med, index) => {
                  const medication = med.medicationCodeableConcept 
                    ? getDisplayFromCodeableConcept(med.medicationCodeableConcept)
                    : med.medicationReference?.display || 'Unknown medication';
                  
                  const codings = med.medicationCodeableConcept?.coding || [];
                  
                  return (
                    <div key={index} className="border-b pb-3 last:border-0">
                      <div className="font-medium">{medication}</div>
                      {codings.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {codings.map((coding, idx) => (
                            <div key={idx} className="text-xs">
                              <Badge variant="outline" className="mr-1">
                                {coding.system?.split('/').pop() || 'code'}
                              </Badge>
                              {coding.code}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-sm mt-1">
                        {med.dosageInstruction?.[0]?.text && (
                          <div>{med.dosageInstruction[0].text}</div>
                        )}
                        <div className="text-muted-foreground">
                          Authorized: {formatDate(med.authoredOn, true)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No active medications recorded</p>
            )}
          </div>
          
          {organizedMedications.completed.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold flex items-center space-x-2 mb-2">
                <Badge variant="outline">Completed</Badge>
              </div>
              <div className="space-y-3">
                {organizedMedications.completed.map((med, index) => {
                  const medication = med.medicationCodeableConcept 
                    ? getDisplayFromCodeableConcept(med.medicationCodeableConcept)
                    : med.medicationReference?.display || 'Unknown medication';
                  
                  return (
                    <div key={index} className="border-b pb-3 last:border-0">
                      <div className="font-medium">{medication}</div>
                      <div className="text-sm mt-1 text-muted-foreground">
                        {med.dosageInstruction?.[0]?.text && (
                          <div>{med.dosageInstruction[0].text}</div>
                        )}
                        <div>
                          Authorized: {formatDate(med.authoredOn, true)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Shield size={20} />
            <CardTitle>Allergies & Intolerances</CardTitle>
          </div>
          <CardDescription>Documented Allergic Reactions</CardDescription>
        </CardHeader>
        <CardContent>
          {allergies.length > 0 ? (
            <div className="space-y-4">
              {allergies.map((allergy, index) => {
                const codings = allergy.code?.coding || [];
                const clinicalStatus = allergy.clinicalStatus?.coding?.[0]?.code || 'unknown';
                
                return (
                  <div key={index} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{getDisplayFromCodeableConcept(allergy.code)}</div>
                      <Badge variant={clinicalStatus === 'active' ? 'default' : 'outline'}>
                        {clinicalStatus}
                      </Badge>
                    </div>
                    
                    {codings.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {codings.map((coding, idx) => (
                          <div key={idx} className="text-xs">
                            <Badge variant="outline" className="mr-1">
                              {coding.system?.split('/').pop() || 'code'}
                            </Badge>
                            {coding.code}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {allergy.reaction && allergy.reaction.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium">Reactions:</div>
                        <ul className="pl-5 list-disc">
                          {allergy.reaction?.map((r, ridx) => (
                            <li key={ridx}>
                              <div>
                                {r.manifestation?.map(m => getDisplayFromCodeableConcept(m)).join(', ')}
                              </div>
                              {r.severity && (
                                <div className="text-sm text-muted-foreground">
                                  Severity: {r.severity}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {allergy.recordedDate && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Recorded: {formatDate(allergy.recordedDate, true)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No allergies or intolerances recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Immunizations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Syringe size={20} />
            <CardTitle>Immunization Record</CardTitle>
          </div>
          <CardDescription>Vaccination History</CardDescription>
        </CardHeader>
        <CardContent>
          {immunizations.length > 0 ? (
            <div className="space-y-3">
              {immunizations.map((imm, index) => {
                const codings = imm.vaccineCode?.coding || [];
                
                return (
                  <div key={index} className="border-b pb-3 last:border-0">
                    <div className="font-medium">{getDisplayFromCodeableConcept(imm.vaccineCode)}</div>
                    
                    {codings.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {codings.map((coding, idx) => (
                          <div key={idx} className="text-xs">
                            <Badge variant="outline" className="mr-1">
                              {coding.system?.split('/').pop() || 'code'}
                            </Badge>
                            {coding.code}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-sm">
                        Status: <Badge variant={imm.status === 'completed' ? 'default' : 'outline'}>
                          {imm.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Date: {formatDate(imm.occurrenceDateTime, true)}
                      </div>
                    </div>
                    
                    {imm.doseQuantity && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Dose: {imm.doseQuantity.value} {imm.doseQuantity.unit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No immunizations recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Laboratory Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Droplet size={20} />
            <CardTitle>Laboratory Results</CardTitle>
          </div>
          <CardDescription>Lab Test Results</CardDescription>
        </CardHeader>
        <CardContent>
          {organizedObservations.laboratory.length > 0 ? (
            <div className="space-y-4">
              {organizedObservations.laboratory.slice(0, 10).map((obs, index) => {
                const codings = obs.code?.coding || [];
                
                return (
                  <div key={index} className="border-b pb-4 last:border-0">
                    <div className="font-medium">{getDisplayFromCodeableConcept(obs.code)}</div>
                    
                    {codings.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {codings.map((coding, idx) => (
                          <div key={idx} className="text-xs">
                            <Badge variant="outline" className="mr-1">
                              {coding.system?.split('/').pop() || 'code'}
                            </Badge>
                            {coding.code}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Value</div>
                        <div className="font-medium">{getObservationValue(obs)}</div>
                      </div>
                      
                      {obs.referenceRange && obs.referenceRange.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground">Reference Range</div>
                          <div>
                            {obs.referenceRange[0].text || 
                              `${obs.referenceRange[0].low?.value || ''}-${obs.referenceRange[0].high?.value || ''} ${obs.referenceRange[0].high?.unit || ''}`}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <div className="text-xs text-muted-foreground">Date</div>
                        <div>{formatDate(obs.effectiveDateTime, true)}</div>
                      </div>
                    </div>
                    
                    <div className="mt-1">
                      <Badge 
                        variant={obs.status === 'final' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {obs.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No laboratory results recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Vital Signs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Stethoscope size={20} />
            <CardTitle>Vital Signs</CardTitle>
          </div>
          <CardDescription>Patient Vital Measurements</CardDescription>
        </CardHeader>
        <CardContent>
          {organizedObservations['vital-signs'].length > 0 ? (
            <div className="space-y-4">
              {organizedObservations['vital-signs'].map((obs, index) => (
                <div key={index} className="border-b pb-3 last:border-0">
                  <div className="font-medium">{getDisplayFromCodeableConcept(obs.code)}</div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <div className="text-xs text-muted-foreground">Value</div>
                      <div className="font-medium">{getObservationValue(obs)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div>
                        <Badge 
                          variant={obs.status === 'final' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {obs.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Date</div>
                      <div>{formatDate(obs.effectiveDateTime, true)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No vital signs recorded</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={generateSummaryFile}
          className="flex items-center space-x-2"
        >
          <FileUp size={16} />
          <span>Download Clinical Summary (IPS Format)</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">International Patient Summary (IPS)</h2>
        <div className="flex items-center space-x-2">
          <InfoIcon size={16} className="text-muted-foreground" />
          <span className="text-muted-foreground text-sm">
            Based on HL7 FHIR IPS Implementation Guide
          </span>
        </div>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Health Summary</AlertTitle>
        <AlertDescription>
          This summary follows the International Patient Summary standard format for
          sharing health information across systems and providers.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="patient" className="w-full">
        <TabsList>
          <TabsTrigger 
            value="patient" 
            onClick={() => setAudience('patient')}
          >
            Patient View
          </TabsTrigger>
          <TabsTrigger 
            value="provider" 
            onClick={() => setAudience('provider')}
          >
            Provider View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="patient">
          {renderPatientView()}
        </TabsContent>
        
        <TabsContent value="provider">
          {renderProviderView()}
        </TabsContent>
      </Tabs>
    </div>
  );
}