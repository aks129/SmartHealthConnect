export interface FhirProvider {
  id: string;
  name: string;
  url: string;
  description?: string;
  logoIcon?: string;
}

export const fhirProviders: FhirProvider[] = [
  {
    id: 'epic',
    name: 'Epic MyChart',
    url: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    description: 'Connect to your Epic MyChart account',
    logoIcon: 'ri-hospital-line'
  },
  {
    id: 'cerner',
    name: 'Cerner',
    url: 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
    description: 'Connect to your Cerner health records',
    logoIcon: 'ri-hospital-line'
  },
  {
    id: 'allscripts',
    name: 'Allscripts',
    url: 'https://fhir.allscriptscloud.com/fhir-ehr/api/FHIR/R4',
    description: 'Connect to your Allscripts health records',
    logoIcon: 'ri-hospital-line'
  },
  {
    id: 'athenahealth',
    name: 'Athenahealth',
    url: 'https://fhir.athenahealth.com/preview/r4/api/FHIR/R4',
    description: 'Connect to your Athenahealth records',
    logoIcon: 'ri-hospital-line'
  },
  {
    id: 'hapi',
    name: 'HAPI FHIR Server (Test)',
    url: 'https://hapi.fhir.org/baseR4',
    description: 'Connect to the public HAPI FHIR test server',
    logoIcon: 'ri-test-tube-line'
  },
  {
    id: 'other',
    name: 'Other SMART on FHIR Provider',
    url: '',
    description: 'Connect to another SMART on FHIR provider',
    logoIcon: 'ri-hospital-line'
  }
];

export function getProviderById(id: string): FhirProvider | undefined {
  return fhirProviders.find(provider => provider.id === id);
}
