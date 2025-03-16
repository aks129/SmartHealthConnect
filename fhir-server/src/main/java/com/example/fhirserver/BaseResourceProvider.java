package com.example.fhirserver;

import ca.uhn.fhir.rest.server.IResourceProvider;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Meta;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public abstract class BaseResourceProvider<T extends IBaseResource> implements IResourceProvider {
    
    protected Map<String, T> resourceMap = new HashMap<>();
    
    /**
     * Get a resource by its ID
     */
    protected T getResourceById(String id) {
        return resourceMap.get(id);
    }
    
    /**
     * Store a resource
     */
    protected void storeResource(String id, T resource) {
        resourceMap.put(id, resource);
    }
    
    /**
     * Get all resources
     */
    protected List<T> getAllResources() {
        return new ArrayList<>(resourceMap.values());
    }
    
    /**
     * Delete a resource by its ID
     */
    protected boolean deleteResource(String id) {
        if (resourceMap.containsKey(id)) {
            resourceMap.remove(id);
            return true;
        }
        return false;
    }
    
    /**
     * Update resource metadata
     */
    protected void updateResourceMetadata(IdType id, T resource) {
        // Update the resource metadata
        Meta meta = new Meta();
        meta.setVersionId(id.getVersionIdPart());
        meta.setLastUpdated(java.util.Date.from(java.time.Instant.now()));
        
        // Set the meta information on the resource
        if (resource instanceof org.hl7.fhir.r4.model.Resource) {
            ((org.hl7.fhir.r4.model.Resource) resource).setMeta(meta);
        }
    }
}