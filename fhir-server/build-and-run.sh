#!/bin/bash

# Create logs directory
mkdir -p logs

# Build the project
echo "Building FHIR server..."
mvn clean package

# Run the server
echo "Starting FHIR server..."
java -jar target/fhir-server-1.0-SNAPSHOT.jar