package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.MedicationRequest;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Reference;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class MedicationRequestResourceProvider extends BaseResourceProvider<MedicationRequest> {

    @Override
    public Class<MedicationRequest> getResourceType() {
        return MedicationRequest.class;
    }

    @Create
    public MethodOutcome createMedicationRequest(@ResourceParam MedicationRequest medicationRequest) {
        // Generate a new ID if one doesn't exist
        if (medicationRequest.getId() == null || medicationRequest.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            medicationRequest.setId(id);
        }

        // Store the medication request
        storeResource(medicationRequest.getIdElement().getIdPart(), medicationRequest);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(medicationRequest.getIdElement());
        outcome.setResource(medicationRequest);
        return outcome;
    }

    @Read
    public MedicationRequest getMedicationRequestById(@IdParam IdType id) {
        MedicationRequest medicationRequest = getResourceById(id.getIdPart());
        if (medicationRequest == null) {
            throw new ResourceNotFoundException("MedicationRequest with ID " + id.getIdPart() + " not found");
        }
        return medicationRequest;
    }

    @Search
    public List<MedicationRequest> searchMedicationRequests(
            @OptionalParam(name = MedicationRequest.SP_PATIENT) ReferenceParam patient) {
        
        List<MedicationRequest> matchingRequests = new ArrayList<>();
        
        // If no search parameters provided, return all medication requests
        if (patient == null) {
            return getAllResources();
        }
        
        // Filter medication requests based on search criteria
        for (MedicationRequest request : getAllResources()) {
            boolean matches = true;
            
            // Check patient reference
            if (patient != null && !medicationRequestHasPatient(request, patient.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingRequests.add(request);
            }
        }
        
        return matchingRequests;
    }

    @Update
    public MethodOutcome updateMedicationRequest(@IdParam IdType id, @ResourceParam MedicationRequest medicationRequest) {
        // Check if medication request exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("MedicationRequest with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, medicationRequest);
        
        // Store the updated medication request
        storeResource(id.getIdPart(), medicationRequest);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(medicationRequest);
        return outcome;
    }

    @Delete
    public MethodOutcome deleteMedicationRequest(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("MedicationRequest with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean medicationRequestHasPatient(MedicationRequest request, String patientReference) {
        if (request.hasSubject()) {
            Reference subject = request.getSubject();
            
            // Check if the reference contains the patient ID
            if (subject.hasReference() && subject.getReference().contains(patientReference)) {
                return true;
            }
        }
        return false;
    }
}