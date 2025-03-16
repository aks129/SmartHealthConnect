package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.Condition;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Reference;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ConditionResourceProvider extends BaseResourceProvider<Condition> {

    @Override
    public Class<Condition> getResourceType() {
        return Condition.class;
    }

    @Create
    public MethodOutcome createCondition(@ResourceParam Condition condition) {
        // Generate a new ID if one doesn't exist
        if (condition.getId() == null || condition.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            condition.setId(id);
        }

        // Store the condition
        storeResource(condition.getIdElement().getIdPart(), condition);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(condition.getIdElement());
        outcome.setResource(condition);
        return outcome;
    }

    @Read
    public Condition getConditionById(@IdParam IdType id) {
        Condition condition = getResourceById(id.getIdPart());
        if (condition == null) {
            throw new ResourceNotFoundException("Condition with ID " + id.getIdPart() + " not found");
        }
        return condition;
    }

    @Search
    public List<Condition> searchConditions(
            @OptionalParam(name = Condition.SP_PATIENT) ReferenceParam patient) {
        
        List<Condition> matchingConditions = new ArrayList<>();
        
        // If no search parameters provided, return all conditions
        if (patient == null) {
            return getAllResources();
        }
        
        // Filter conditions based on patient reference
        for (Condition condition : getAllResources()) {
            boolean matches = true;
            
            // Check patient reference
            if (patient != null && !conditionHasPatient(condition, patient.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingConditions.add(condition);
            }
        }
        
        return matchingConditions;
    }

    @Update
    public MethodOutcome updateCondition(@IdParam IdType id, @ResourceParam Condition condition) {
        // Check if condition exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("Condition with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, condition);
        
        // Store the updated condition
        storeResource(id.getIdPart(), condition);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(condition);
        return outcome;
    }

    @Delete
    public MethodOutcome deleteCondition(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("Condition with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean conditionHasPatient(Condition condition, String patientReference) {
        if (condition.hasSubject()) {
            Reference subject = condition.getSubject();
            
            // Check if the reference contains the patient ID
            if (subject.hasReference() && subject.getReference().contains(patientReference)) {
                return true;
            }
        }
        return false;
    }
}