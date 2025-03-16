package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.Immunization;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Reference;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ImmunizationResourceProvider extends BaseResourceProvider<Immunization> {

    @Override
    public Class<Immunization> getResourceType() {
        return Immunization.class;
    }

    @Create
    public MethodOutcome createImmunization(@ResourceParam Immunization immunization) {
        // Generate a new ID if one doesn't exist
        if (immunization.getId() == null || immunization.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            immunization.setId(id);
        }

        // Store the immunization
        storeResource(immunization.getIdElement().getIdPart(), immunization);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(immunization.getIdElement());
        outcome.setResource(immunization);
        return outcome;
    }

    @Read
    public Immunization getImmunizationById(@IdParam IdType id) {
        Immunization immunization = getResourceById(id.getIdPart());
        if (immunization == null) {
            throw new ResourceNotFoundException("Immunization with ID " + id.getIdPart() + " not found");
        }
        return immunization;
    }

    @Search
    public List<Immunization> searchImmunizations(
            @OptionalParam(name = Immunization.SP_PATIENT) ReferenceParam patient) {
        
        List<Immunization> matchingImmunizations = new ArrayList<>();
        
        // If no search parameters provided, return all immunizations
        if (patient == null) {
            return getAllResources();
        }
        
        // Filter immunizations based on search criteria
        for (Immunization immunization : getAllResources()) {
            boolean matches = true;
            
            // Check patient reference
            if (patient != null && !immunizationHasPatient(immunization, patient.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingImmunizations.add(immunization);
            }
        }
        
        return matchingImmunizations;
    }

    @Update
    public MethodOutcome updateImmunization(@IdParam IdType id, @ResourceParam Immunization immunization) {
        // Check if immunization exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("Immunization with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, immunization);
        
        // Store the updated immunization
        storeResource(id.getIdPart(), immunization);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(immunization);
        return outcome;
    }

    @Delete
    public MethodOutcome deleteImmunization(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("Immunization with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean immunizationHasPatient(Immunization immunization, String patientReference) {
        if (immunization.hasPatient()) {
            Reference patient = immunization.getPatient();
            
            // Check if the reference contains the patient ID
            if (patient.hasReference() && patient.getReference().contains(patientReference)) {
                return true;
            }
        }
        return false;
    }
}