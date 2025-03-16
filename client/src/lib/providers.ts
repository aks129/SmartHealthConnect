export interface FhirProvider {
  id: string;
  name: string;
  url: string;
  description?: string;
  logoIcon?: string;
}

export const fhirProviders: FhirProvider[] = [
  {
    id: 'demo',
    name: 'Demo Connection (Sample Data)',
    url: '/api/fhir/demo',
    description: 'Connect to a sample dataset to try the application',
    logoIcon: 'database'
  },
  {
    id: 'epic',
    name: 'Epic MyChart',
    url: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    description: 'Connect to your Epic MyChart account',
    logoIcon: 'stethoscope'
  },
  {
    id: 'cerner',
    name: 'Cerner',
    url: 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
    description: 'Connect to your Cerner health records',
    logoIcon: 'stethoscope'
  },
  {
    id: 'allscripts',
    name: 'Allscripts',
    url: 'https://fhir.allscriptscloud.com/fhir-ehr/api/FHIR/R4',
    description: 'Connect to your Allscripts health records',
    logoIcon: 'stethoscope'
  },
  {
    id: 'athenahealth',
    name: 'Athenahealth',
    url: 'https://fhir.athenahealth.com/preview/r4/api/FHIR/R4',
    description: 'Connect to your Athenahealth records',
    logoIcon: 'stethoscope'
  },
  {
    id: 'bluecross-insurance',
    name: 'Blue Cross Blue Shield',
    url: 'https://fhir.bluecross.com/api/FHIR/R4',
    description: 'Connect to your BCBS insurance',
    logoIcon: 'building'
  },
  {
    id: 'aetna-insurance',
    name: 'Aetna',
    url: 'https://fhir.aetna.com/api/FHIR/R4',
    description: 'Connect to your Aetna insurance records',
    logoIcon: 'building'
  },
  {
    id: 'cigna-insurance',
    name: 'Cigna',
    url: 'https://fhir.cigna.com/api/FHIR/R4',
    description: 'Connect to your Cigna insurance records',
    logoIcon: 'building'
  },
  {
    id: 'hapi',
    name: 'HAPI FHIR Server (Test)',
    url: 'https://hapi.fhir.org/baseR4',
    description: 'Connect to the public HAPI FHIR test server',
    logoIcon: 'database'
  },
  {
    id: 'other',
    name: 'Other SMART on FHIR Provider',
    url: '',
    description: 'Connect to another SMART on FHIR provider',
    logoIcon: 'database'
  }
];

export function getProviderById(id: string): FhirProvider | undefined {
  return fhirProviders.find(provider => provider.id === id);
}
