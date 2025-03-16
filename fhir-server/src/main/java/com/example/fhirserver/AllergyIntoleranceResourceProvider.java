package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.AllergyIntolerance;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Reference;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class AllergyIntoleranceResourceProvider extends BaseResourceProvider<AllergyIntolerance> {

    @Override
    public Class<AllergyIntolerance> getResourceType() {
        return AllergyIntolerance.class;
    }

    @Create
    public MethodOutcome createAllergyIntolerance(@ResourceParam AllergyIntolerance allergyIntolerance) {
        // Generate a new ID if one doesn't exist
        if (allergyIntolerance.getId() == null || allergyIntolerance.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            allergyIntolerance.setId(id);
        }

        // Store the allergy intolerance
        storeResource(allergyIntolerance.getIdElement().getIdPart(), allergyIntolerance);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(allergyIntolerance.getIdElement());
        outcome.setResource(allergyIntolerance);
        return outcome;
    }

    @Read
    public AllergyIntolerance getAllergyIntoleranceById(@IdParam IdType id) {
        AllergyIntolerance allergyIntolerance = getResourceById(id.getIdPart());
        if (allergyIntolerance == null) {
            throw new ResourceNotFoundException("AllergyIntolerance with ID " + id.getIdPart() + " not found");
        }
        return allergyIntolerance;
    }

    @Search
    public List<AllergyIntolerance> searchAllergyIntolerances(
            @OptionalParam(name = AllergyIntolerance.SP_PATIENT) ReferenceParam patient) {
        
        List<AllergyIntolerance> matchingAllergies = new ArrayList<>();
        
        // If no search parameters provided, return all allergies
        if (patient == null) {
            return getAllResources();
        }
        
        // Filter allergies based on search criteria
        for (AllergyIntolerance allergy : getAllResources()) {
            boolean matches = true;
            
            // Check patient reference
            if (patient != null && !allergyHasPatient(allergy, patient.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingAllergies.add(allergy);
            }
        }
        
        return matchingAllergies;
    }

    @Update
    public MethodOutcome updateAllergyIntolerance(@IdParam IdType id, @ResourceParam AllergyIntolerance allergyIntolerance) {
        // Check if allergy intolerance exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("AllergyIntolerance with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, allergyIntolerance);
        
        // Store the updated allergy intolerance
        storeResource(id.getIdPart(), allergyIntolerance);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(allergyIntolerance);
        return outcome;
    }

    @Delete
    public MethodOutcome deleteAllergyIntolerance(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("AllergyIntolerance with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean allergyHasPatient(AllergyIntolerance allergy, String patientReference) {
        if (allergy.hasPatient()) {
            Reference patient = allergy.getPatient();
            
            // Check if the reference contains the patient ID
            if (patient.hasReference() && patient.getReference().contains(patientReference)) {
                return true;
            }
        }
        return false;
    }
}