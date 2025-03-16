package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.ExplanationOfBenefit;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Reference;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ExplanationOfBenefitResourceProvider extends BaseResourceProvider<ExplanationOfBenefit> {

    @Override
    public Class<ExplanationOfBenefit> getResourceType() {
        return ExplanationOfBenefit.class;
    }

    @Create
    public MethodOutcome createExplanationOfBenefit(@ResourceParam ExplanationOfBenefit explanationOfBenefit) {
        // Generate a new ID if one doesn't exist
        if (explanationOfBenefit.getId() == null || explanationOfBenefit.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            explanationOfBenefit.setId(id);
        }

        // Store the explanation of benefit
        storeResource(explanationOfBenefit.getIdElement().getIdPart(), explanationOfBenefit);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(explanationOfBenefit.getIdElement());
        outcome.setResource(explanationOfBenefit);
        return outcome;
    }

    @Read
    public ExplanationOfBenefit getExplanationOfBenefitById(@IdParam IdType id) {
        ExplanationOfBenefit explanationOfBenefit = getResourceById(id.getIdPart());
        if (explanationOfBenefit == null) {
            throw new ResourceNotFoundException("ExplanationOfBenefit with ID " + id.getIdPart() + " not found");
        }
        return explanationOfBenefit;
    }

    @Search
    public List<ExplanationOfBenefit> searchExplanationOfBenefits(
            @OptionalParam(name = ExplanationOfBenefit.SP_PATIENT) ReferenceParam patient) {
        
        List<ExplanationOfBenefit> matchingExplanations = new ArrayList<>();
        
        // If no search parameters provided, return all explanation of benefits
        if (patient == null) {
            return getAllResources();
        }
        
        // Filter explanation of benefits based on search criteria
        for (ExplanationOfBenefit explanation : getAllResources()) {
            boolean matches = true;
            
            // Check patient reference
            if (patient != null && !explanationHasPatient(explanation, patient.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingExplanations.add(explanation);
            }
        }
        
        return matchingExplanations;
    }

    @Update
    public MethodOutcome updateExplanationOfBenefit(@IdParam IdType id, @ResourceParam ExplanationOfBenefit explanationOfBenefit) {
        // Check if explanation of benefit exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("ExplanationOfBenefit with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, explanationOfBenefit);
        
        // Store the updated explanation of benefit
        storeResource(id.getIdPart(), explanationOfBenefit);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(explanationOfBenefit);
        return outcome;
    }

    @Delete
    public MethodOutcome deleteExplanationOfBenefit(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("ExplanationOfBenefit with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean explanationHasPatient(ExplanationOfBenefit explanation, String patientReference) {
        if (explanation.hasPatient()) {
            Reference patient = explanation.getPatient();
            
            // Check if the reference contains the patient ID
            if (patient.hasReference() && patient.getReference().contains(patientReference)) {
                return true;
            }
        }
        return false;
    }
}