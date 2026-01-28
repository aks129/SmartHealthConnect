# Privacy Policy for SmartHealthConnect

**Last Updated: January 28, 2026**

## Overview

SmartHealthConnect is a healthcare integration application that helps users access and manage their electronic health records through SMART on FHIR protocols. This privacy policy explains how we handle your health information.

## Data Collection and Use

### What Data We Access

SmartHealthConnect may access the following types of health data when you connect to a FHIR-enabled healthcare provider:

- **Patient Demographics**: Name, date of birth, gender, contact information
- **Medical Conditions**: Active and historical diagnoses
- **Medications**: Current prescriptions and dosage information
- **Allergies**: Known allergies and adverse reactions
- **Vital Signs**: Blood pressure, heart rate, weight, and other measurements
- **Immunizations**: Vaccination history
- **Lab Results**: Laboratory test results and observations

### External Data Sources

SmartHealthConnect also queries the following public healthcare databases:

- **NPI Registry**: To search for healthcare providers by specialty and location
- **OpenFDA**: To check for drug interactions and safety information
- **ClinicalTrials.gov**: To find relevant clinical trials
- **bioRxiv/medRxiv**: To access medical research preprints

### How We Use Your Data

- Display your health information in an easy-to-understand format
- Generate personalized care gap recommendations
- Check for potential drug interactions
- Prepare for healthcare appointments
- Track health journal entries (mood, symptoms, activities)

## Data Storage and Security

### Local Processing

- Health data is processed locally on your device or server
- Data is fetched directly from your FHIR provider when requested
- We do not store your health records on external servers

### Demo Mode

- Demo mode uses synthetic patient data for testing purposes
- No real patient data is used or stored in demo mode

### Encryption

- All API communications use HTTPS encryption
- OAuth 2.0 tokens are stored securely in encrypted sessions

## Data Sharing

### We Do NOT:

- Sell your health data to third parties
- Share your health information with advertisers
- Use your health data for marketing purposes
- Store your health data on our servers (except temporary session data)

### We May:

- Send queries to external healthcare APIs (NPI, OpenFDA, ClinicalTrials.gov) using non-identifiable search terms
- Log anonymized usage statistics for service improvement
- Share aggregated, de-identified data for research purposes (with explicit consent)

## Your Rights

You have the right to:

- **Access**: View all health data retrieved through SmartHealthConnect
- **Disconnect**: Revoke access to your FHIR provider at any time
- **Delete**: Remove all locally stored data and session information
- **Export**: Download your health data in standard formats

## HIPAA Compliance

SmartHealthConnect is designed with HIPAA compliance in mind:

- Protected Health Information (PHI) is accessed only with explicit authorization
- Audit logs track all access to health data
- Access tokens are time-limited and can be revoked
- No PHI is transmitted without encryption

## Children's Privacy

SmartHealthConnect is not intended for use by children under 13. We do not knowingly collect health information from children without parental consent.

## Third-Party Services

When using external healthcare APIs, your queries (condition names, drug names, specialty searches) may be logged by those services according to their respective privacy policies:

- [NPI Registry Privacy Policy](https://npiregistry.cms.hhs.gov/privacy)
- [OpenFDA Terms of Service](https://open.fda.gov/terms/)
- [ClinicalTrials.gov Privacy Policy](https://clinicaltrials.gov/ct2/about-site/privacy-policy)
- [bioRxiv/medRxiv Privacy Policy](https://www.biorxiv.org/content/about-biorxiv)

## Changes to This Policy

We may update this privacy policy from time to time. We will notify users of any material changes by updating the "Last Updated" date at the top of this policy.

## Contact Us

For questions about this privacy policy or your health data:

- GitHub Issues: https://github.com/anthropics/SmartHealthConnect/issues
- Email: privacy@smarthealthconnect.example.com

## Consent

By using SmartHealthConnect and connecting to your FHIR provider, you consent to the collection and use of your health information as described in this privacy policy.
