package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.Claim;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Reference;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ClaimResourceProvider extends BaseResourceProvider<Claim> {

    @Override
    public Class<Claim> getResourceType() {
        return Claim.class;
    }

    @Create
    public MethodOutcome createClaim(@ResourceParam Claim claim) {
        // Generate a new ID if one doesn't exist
        if (claim.getId() == null || claim.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            claim.setId(id);
        }

        // Store the claim
        storeResource(claim.getIdElement().getIdPart(), claim);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(claim.getIdElement());
        outcome.setResource(claim);
        return outcome;
    }

    @Read
    public Claim getClaimById(@IdParam IdType id) {
        Claim claim = getResourceById(id.getIdPart());
        if (claim == null) {
            throw new ResourceNotFoundException("Claim with ID " + id.getIdPart() + " not found");
        }
        return claim;
    }

    @Search
    public List<Claim> searchClaims(
            @OptionalParam(name = Claim.SP_PATIENT) ReferenceParam patient) {
        
        List<Claim> matchingClaims = new ArrayList<>();
        
        // If no search parameters provided, return all claims
        if (patient == null) {
            return getAllResources();
        }
        
        // Filter claims based on search criteria
        for (Claim claim : getAllResources()) {
            boolean matches = true;
            
            // Check patient reference
            if (patient != null && !claimHasPatient(claim, patient.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingClaims.add(claim);
            }
        }
        
        return matchingClaims;
    }

    @Update
    public MethodOutcome updateClaim(@IdParam IdType id, @ResourceParam Claim claim) {
        // Check if claim exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("Claim with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, claim);
        
        // Store the updated claim
        storeResource(id.getIdPart(), claim);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(claim);
        return outcome;
    }

    @Delete
    public MethodOutcome deleteClaim(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("Claim with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean claimHasPatient(Claim claim, String patientReference) {
        if (claim.hasPatient()) {
            Reference patient = claim.getPatient();
            
            // Check if the reference contains the patient ID
            if (patient.hasReference() && patient.getReference().contains(patientReference)) {
                return true;
            }
        }
        return false;
    }
}