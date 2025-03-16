package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.param.TokenParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.Observation;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Reference;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ObservationResourceProvider extends BaseResourceProvider<Observation> {

    @Override
    public Class<Observation> getResourceType() {
        return Observation.class;
    }

    @Create
    public MethodOutcome createObservation(@ResourceParam Observation observation) {
        // Generate a new ID if one doesn't exist
        if (observation.getId() == null || observation.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            observation.setId(id);
        }

        // Store the observation
        storeResource(observation.getIdElement().getIdPart(), observation);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(observation.getIdElement());
        outcome.setResource(observation);
        return outcome;
    }

    @Read
    public Observation getObservationById(@IdParam IdType id) {
        Observation observation = getResourceById(id.getIdPart());
        if (observation == null) {
            throw new ResourceNotFoundException("Observation with ID " + id.getIdPart() + " not found");
        }
        return observation;
    }

    @Search
    public List<Observation> searchObservations(
            @OptionalParam(name = Observation.SP_PATIENT) ReferenceParam patient,
            @OptionalParam(name = Observation.SP_CODE) TokenParam code) {
        
        List<Observation> matchingObservations = new ArrayList<>();
        
        // If no search parameters provided, return all observations
        if (patient == null && code == null) {
            return getAllResources();
        }
        
        // Filter observations based on search criteria
        for (Observation observation : getAllResources()) {
            boolean matches = true;
            
            // Check patient reference
            if (patient != null && !observationHasPatient(observation, patient.getValue())) {
                matches = false;
            }
            
            // Check code
            if (code != null && !observationHasCode(observation, code.getSystem(), code.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingObservations.add(observation);
            }
        }
        
        return matchingObservations;
    }

    @Update
    public MethodOutcome updateObservation(@IdParam IdType id, @ResourceParam Observation observation) {
        // Check if observation exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("Observation with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, observation);
        
        // Store the updated observation
        storeResource(id.getIdPart(), observation);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(observation);
        return outcome;
    }

    @Delete
    public MethodOutcome deleteObservation(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("Observation with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean observationHasPatient(Observation observation, String patientReference) {
        if (observation.hasSubject()) {
            Reference subject = observation.getSubject();
            
            // Check if the reference contains the patient ID
            if (subject.hasReference() && subject.getReference().contains(patientReference)) {
                return true;
            }
        }
        return false;
    }
    
    private boolean observationHasCode(Observation observation, String system, String code) {
        if (observation.hasCode() && observation.getCode().hasCoding()) {
            for (org.hl7.fhir.r4.model.Coding coding : observation.getCode().getCoding()) {
                // If system is provided, it should match
                boolean systemMatches = (system == null) || 
                    (coding.hasSystem() && coding.getSystem().equals(system));
                    
                // If code is provided, it should match
                boolean codeMatches = (code == null) || 
                    (coding.hasCode() && coding.getCode().equals(code));
                    
                if (systemMatches && codeMatches) {
                    return true;
                }
            }
        }
        return false;
    }
}