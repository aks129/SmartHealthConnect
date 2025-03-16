package com.example.fhirserver;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.rest.server.RestfulServer;
import ca.uhn.fhir.rest.server.interceptor.ResponseHighlighterInterceptor;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletException;
import java.util.Arrays;

public class FhirServerApplication extends RestfulServer {

    private static final Logger logger = LoggerFactory.getLogger(FhirServerApplication.class);
    private static final int PORT = 8000;

    public FhirServerApplication() {
        super(FhirContext.forR4());
    }

    @Override
    protected void initialize() throws ServletException {
        // Register resource providers
        registerProviders();

        // Add response highlighting for better response readability
        registerInterceptor(new ResponseHighlighterInterceptor());
    }

    private void registerProviders() {
        // Register resource providers for each FHIR resource type
        setResourceProviders(Arrays.asList(
            new PatientResourceProvider(),
            new ConditionResourceProvider(),
            new ObservationResourceProvider(),
            new MedicationRequestResourceProvider(),
            new AllergyIntoleranceResourceProvider(),
            new ImmunizationResourceProvider(),
            new CoverageResourceProvider(),
            new ClaimResourceProvider(),
            new ExplanationOfBenefitResourceProvider()
        ));
    }

    public static void main(String[] args) {
        try {
            // Create a Jetty server
            Server server = new Server(PORT);

            // Create a servlet context
            ServletContextHandler contextHandler = new ServletContextHandler(ServletContextHandler.SESSIONS);
            contextHandler.setContextPath("/");
            server.setHandler(contextHandler);

            // Create the FHIR server servlet
            FhirServerApplication fhirServerServlet = new FhirServerApplication();
            ServletHolder servletHolder = new ServletHolder(fhirServerServlet);
            
            // Map the FHIR server servlet to the /fhir/* context
            contextHandler.addServlet(servletHolder, "/fhir/*");

            // Start the server
            server.start();
            logger.info("FHIR Server started on port " + PORT);
            
            // Wait for the server to be stopped
            server.join();
        } catch (Exception e) {
            logger.error("Error starting FHIR server: " + e.getMessage(), e);
        }
    }
}