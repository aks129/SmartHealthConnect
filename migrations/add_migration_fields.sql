-- Add migration tracking fields to the fhir_sessions table
ALTER TABLE fhir_sessions 
ADD COLUMN IF NOT EXISTS migrated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS migration_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS migration_counts JSONB;