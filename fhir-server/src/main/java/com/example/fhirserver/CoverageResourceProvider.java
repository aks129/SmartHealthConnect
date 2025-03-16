package com.example.fhirserver;

import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.Coverage;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Reference;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class CoverageResourceProvider extends BaseResourceProvider<Coverage> {

    @Override
    public Class<Coverage> getResourceType() {
        return Coverage.class;
    }

    @Create
    public MethodOutcome createCoverage(@ResourceParam Coverage coverage) {
        // Generate a new ID if one doesn't exist
        if (coverage.getId() == null || coverage.getId().isEmpty()) {
            String id = UUID.randomUUID().toString();
            coverage.setId(id);
        }

        // Store the coverage
        storeResource(coverage.getIdElement().getIdPart(), coverage);

        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(coverage.getIdElement());
        outcome.setResource(coverage);
        return outcome;
    }

    @Read
    public Coverage getCoverageById(@IdParam IdType id) {
        Coverage coverage = getResourceById(id.getIdPart());
        if (coverage == null) {
            throw new ResourceNotFoundException("Coverage with ID " + id.getIdPart() + " not found");
        }
        return coverage;
    }

    @Search
    public List<Coverage> searchCoverages(
            @OptionalParam(name = Coverage.SP_BENEFICIARY) ReferenceParam beneficiary) {
        
        List<Coverage> matchingCoverages = new ArrayList<>();
        
        // If no search parameters provided, return all coverages
        if (beneficiary == null) {
            return getAllResources();
        }
        
        // Filter coverages based on search criteria
        for (Coverage coverage : getAllResources()) {
            boolean matches = true;
            
            // Check beneficiary reference
            if (beneficiary != null && !coverageHasBeneficiary(coverage, beneficiary.getValue())) {
                matches = false;
            }
            
            if (matches) {
                matchingCoverages.add(coverage);
            }
        }
        
        return matchingCoverages;
    }

    @Update
    public MethodOutcome updateCoverage(@IdParam IdType id, @ResourceParam Coverage coverage) {
        // Check if coverage exists
        if (getResourceById(id.getIdPart()) == null) {
            throw new ResourceNotFoundException("Coverage with ID " + id.getIdPart() + " not found");
        }
        
        // Update metadata
        updateResourceMetadata(id, coverage);
        
        // Store the updated coverage
        storeResource(id.getIdPart(), coverage);
        
        // Return the outcome with the resource ID
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        outcome.setResource(coverage);
        return outcome;
    }

    @Delete
    public MethodOutcome deleteCoverage(@IdParam IdType id) {
        boolean deleted = deleteResource(id.getIdPart());
        if (!deleted) {
            throw new ResourceNotFoundException("Coverage with ID " + id.getIdPart() + " not found");
        }
        
        MethodOutcome outcome = new MethodOutcome();
        outcome.setId(id);
        return outcome;
    }
    
    /* Helper methods for searching */
    
    private boolean coverageHasBeneficiary(Coverage coverage, String beneficiaryReference) {
        if (coverage.hasBeneficiary()) {
            Reference beneficiary = coverage.getBeneficiary();
            
            // Check if the reference contains the beneficiary ID
            if (beneficiary.hasReference() && beneficiary.getReference().contains(beneficiaryReference)) {
                return true;
            }
        }
        return false;
    }
}