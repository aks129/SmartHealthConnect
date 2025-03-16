package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.api.server.IBundleProvider;
import ca.uhn.fhir.rest.param.StringParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Patient;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class PatientResourceProvider extends BaseResourceProvider<Patient> {

    @Override
    public Class<Patient> getResourceType() {
        return Patient.class;
    }

    @Create
    public MethodOutcome createPatient(@ResourceParam Patient patient) {
        // Generate a new ID if one doesn't exist
        if (patient.getId() == null || patient.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            patient.setId(id);
        }

        // Store the patient
        storeResource(patient.getIdElement().getIdPart(), patient);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(patient.getIdElement());
        outcome.setResource(patient);
        return outcome;
    }

    @Read
    public Patient getPatientById(@IdParam IdType id) {
        Patient patient = getResourceById(id.getIdPart());
        if (patient == null) {
            throw new ResourceNotFoundException("Patient with ID " + id.getIdPart() + " not found");
        }
        return patient;
    }

    @Search
    public List<Patient> searchPatients(
            @OptionalParam(name = Patient.SP_FAMILY) StringParam familyName,
            @OptionalParam(name = Patient.SP_GIVEN) StringParam givenName,
            @OptionalParam(name = Patient.SP_IDENTIFIER) StringParam identifier) {
        
        List<Patient> matchingPatients = new ArrayList<>();
        
        // If no search parameters provided, return all patients
        if (familyName == null && givenName == null && identifier == null) {
            return getAllResources();
        }
        
        // Otherwise filter patients based on search criteria
        for (Patient patient : getAllResources()) {
            boolean matches = true;
            
            // Check family name
            if (familyName != null && !patientHasFamilyName(patient, familyName.getValue())) {
                matches = false;
            }
            
            // Check given name
            if (givenName != null && !patientHasGivenName(patient, givenName.getValue())) {
                matches = false;
            }
            
            // Check identifier
            if (identifier != null && !patientHasIdentifier(patient, identifier.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingPatients.add(patient);
            }
        }
        
        return matchingPatients;
    }

    @Update
    public MethodOutcome updatePatient(@IdParam IdType id, @ResourceParam Patient patient) {
        // Check if patient exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("Patient with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, patient);
        
        // Store the updated patient
        storeResource(id.getIdPart(), patient);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(patient);
        return outcome;
    }

    @Delete
    public MethodOutcome deletePatient(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("Patient with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean patientHasFamilyName(Patient patient, String familyName) {
        if (patient.hasName()) {
            for (Patient.PatientNameComponent name : patient.getName()) {
                if (name.hasFamily() && name.getFamily().toLowerCase().contains(familyName.toLowerCase())) {
                    return true;
                }
            }
        }
        return false;
    }
    
    private boolean patientHasGivenName(Patient patient, String givenName) {
        if (patient.hasName()) {
            for (Patient.PatientNameComponent name : patient.getName()) {
                if (name.hasGiven()) {
                    for (String given : name.getGiven()) {
                        if (given.toLowerCase().contains(givenName.toLowerCase())) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    
    private boolean patientHasIdentifier(Patient patient, String identifier) {
        if (patient.hasIdentifier()) {
            for (Patient.PatientIdentifierComponent id : patient.getIdentifier()) {
                if (id.hasValue() && id.getValue().contains(identifier)) {
                    return true;
                }
            }
        }
        return false;
    }
}