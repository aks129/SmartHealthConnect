export interface FhirProvider {
  id: string;
  name: string;
  url: string;
  description?: string;
  logoIcon?: string;
  type?: 'provider' | 'insurance' | 'pharmacy' | 'lab' | 'tefca' | 'vendor';
  brandId?: string;
  organizationId?: string;
  logoUrl?: string;
  brand?: string;
  fallbackText?: string; // Added for fallback logo display
}

export interface EpicBrand {
  id: string;
  name: string;
  logoUrl: string;
  fallbackText?: string;
  organizations: EpicOrganization[];
}

export interface EpicOrganization {
  id: string;
  name: string;
  url: string;
  state?: string;
  city?: string;
}

// Epic brands and organizations with working logo URLs
export const epicBrands: EpicBrand[] = [
  {
    id: 'epic-mychart',
    name: 'Epic MyChart',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Epic_Systems_logo.svg/320px-Epic_Systems_logo.svg.png',
    fallbackText: 'Epic',
    organizations: [
      {
        id: 'demo-epic',
        name: 'Demo Epic MyChart',
        url: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
        state: 'Demo',
        city: 'Test'
      }
    ]
  },
  {
    id: 'mayo-clinic',
    name: 'Mayo Clinic',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Mayo_Clinic_logo.svg/320px-Mayo_Clinic_logo.svg.png',
    fallbackText: 'Mayo',
    organizations: [
      {
        id: 'mayo-clinic-arizona',
        name: 'Mayo Clinic Arizona',
        url: 'https://epicproxy.et1089.epichosted.com/FHIRProxy/api/FHIR/R4',
        state: 'Arizona',
        city: 'Phoenix'
      },
      {
        id: 'mayo-clinic-florida',
        name: 'Mayo Clinic Florida',
        url: 'https://epicproxy.et1089.epichosted.com/FHIRProxy/api/FHIR/R4',
        state: 'Florida',
        city: 'Jacksonville'
      },
      {
        id: 'mayo-clinic-rochester',
        name: 'Mayo Clinic Rochester',
        url: 'https://epicproxy.et1089.epichosted.com/FHIRProxy/api/FHIR/R4',
        state: 'Minnesota',
        city: 'Rochester'
      }
    ]
  },
  {
    id: 'kaiser-permanente',
    name: 'Kaiser Permanente',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Kaiser_Permanente_logo.svg/320px-Kaiser_Permanente_logo.svg.png',
    fallbackText: 'Kaiser',
    organizations: [
      {
        id: 'kaiser-permanente-norcal',
        name: 'Kaiser Permanente Northern California',
        url: 'https://fhir.kp.org/fhir/r4/api/FHIR/R4',
        state: 'California',
        city: 'Oakland'
      },
      {
        id: 'kaiser-permanente-socal',
        name: 'Kaiser Permanente Southern California',
        url: 'https://fhir.kp.org/fhir/r4/api/FHIR/R4',
        state: 'California',
        city: 'Pasadena'
      },
      {
        id: 'kaiser-permanente-northwest',
        name: 'Kaiser Permanente Northwest',
        url: 'https://fhir.kp.org/fhir/r4/api/FHIR/R4',
        state: 'Oregon',
        city: 'Portland'
      }
    ]
  },
  {
    id: 'cleveland-clinic',
    name: 'Cleveland Clinic',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Cleveland_Clinic_logo.svg/320px-Cleveland_Clinic_logo.svg.png',
    fallbackText: 'Cleveland',
    organizations: [
      {
        id: 'cleveland-clinic-main',
        name: 'Cleveland Clinic',
        url: 'https://eprescribe.allscripts.com/eprescribing-live/fhir/r4',
        state: 'Ohio',
        city: 'Cleveland'
      },
      {
        id: 'cleveland-clinic-florida',
        name: 'Cleveland Clinic Florida',
        url: 'https://eprescribe.allscripts.com/eprescribing-live/fhir/r4',
        state: 'Florida',
        city: 'Weston'
      }
    ]
  },
  {
    id: 'ucsf',
    name: 'UCSF Health',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/UCSF_logo.svg/320px-UCSF_logo.svg.png',
    fallbackText: 'UCSF',
    organizations: [
      {
        id: 'ucsf-main',
        name: 'UCSF Medical Center',
        url: 'https://interconnect.ucsfmedicalcenter.org/interconnect-fhir-oauth/api/FHIR/R4',
        state: 'California',
        city: 'San Francisco'
      }
    ]
  },
  {
    id: 'uw-medicine',
    name: 'UW Medicine',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/University_of_Washington_seal.svg/320px-University_of_Washington_seal.svg.png',
    fallbackText: 'UW',
    organizations: [
      {
        id: 'uw-medicine-main',
        name: 'UW Medicine',
        url: 'https://epicproxy.et0927.epichosted.com/FHIRProxy/api/FHIR/R4',
        state: 'Washington',
        city: 'Seattle'
      }
    ]
  }
];

// Convert Epic brands to provider format for use in the application
const epicProviders: FhirProvider[] = epicBrands.flatMap(brand => {
  return brand.organizations.map(org => ({
    id: org.id,
    name: org.name,
    url: org.url,
    description: `Connect to ${org.name}${org.city ? ` in ${org.city}` : ''}${org.state ? `, ${org.state}` : ''}`,
    logoIcon: 'stethoscope',
    type: 'provider' as const,
    brandId: brand.id,
    brand: brand.name,
    organizationId: org.id,
    logoUrl: brand.logoUrl,
    fallbackText: brand.fallbackText
  }));
});

// Other healthcare system providers
const otherProviders: FhirProvider[] = [
  {
    id: 'cerner',
    name: 'Cerner',
    url: 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
    description: 'Connect to your Cerner health records',
    logoIcon: 'stethoscope',
    type: 'provider'
  },
  {
    id: 'allscripts',
    name: 'Allscripts',
    url: 'https://fhir.allscriptscloud.com/fhir-ehr/api/FHIR/R4',
    description: 'Connect to your Allscripts health records',
    logoIcon: 'stethoscope',
    type: 'provider'
  },
  {
    id: 'athenahealth',
    name: 'Athenahealth',
    url: 'https://fhir.athenahealth.com/preview/r4/api/FHIR/R4',
    description: 'Connect to your Athenahealth records',
    logoIcon: 'stethoscope',
    type: 'provider'
  }
];

// Insurance providers
const insuranceProviders: FhirProvider[] = [
  {
    id: 'bluecross-insurance',
    name: 'Blue Cross Blue Shield',
    url: 'https://fhir.bluecross.com/api/FHIR/R4',
    description: 'Connect to your BCBS insurance',
    logoIcon: 'building',
    type: 'insurance'
  },
  {
    id: 'aetna-insurance',
    name: 'Aetna',
    url: 'https://fhir.aetna.com/api/FHIR/R4',
    description: 'Connect to your Aetna insurance records',
    logoIcon: 'building',
    type: 'insurance'
  },
  {
    id: 'cigna-insurance',
    name: 'Cigna',
    url: 'https://fhir.cigna.com/api/FHIR/R4',
    description: 'Connect to your Cigna insurance records',
    logoIcon: 'building',
    type: 'insurance'
  },
  {
    id: 'united-insurance',
    name: 'UnitedHealthcare',
    url: 'https://fhir.uhc.com/api/FHIR/R4',
    description: 'Connect to your UnitedHealthcare insurance records',
    logoIcon: 'building',
    type: 'insurance'
  }
];

// Pharmacy providers
const pharmacyProviders: FhirProvider[] = [
  {
    id: 'cvs',
    name: 'CVS Pharmacy',
    url: 'https://fhir.cvs.com/api/FHIR/R4',
    description: 'Connect to your CVS prescription history',
    logoIcon: 'pill',
    type: 'pharmacy'
  },
  {
    id: 'walgreens',
    name: 'Walgreens',
    url: 'https://fhir.walgreens.com/api/FHIR/R4',
    description: 'Connect to your Walgreens prescription history',
    logoIcon: 'pill',
    type: 'pharmacy'
  },
  {
    id: 'walmart-pharmacy',
    name: 'Walmart Pharmacy',
    url: 'https://fhir.walmart.com/api/FHIR/R4',
    description: 'Connect to your Walmart prescription history',
    logoIcon: 'pill',
    type: 'pharmacy'
  }
];

// Lab and diagnostic providers
const labProviders: FhirProvider[] = [
  {
    id: 'quest',
    name: 'Quest Diagnostics',
    url: 'https://fhir.questdiagnostics.com/api/FHIR/R4',
    description: 'Connect to your Quest lab results',
    logoIcon: 'microscope',
    type: 'lab'
  },
  {
    id: 'labcorp',
    name: 'Labcorp',
    url: 'https://fhir.labcorp.com/api/FHIR/R4',
    description: 'Connect to your Labcorp test results',
    logoIcon: 'microscope',
    type: 'lab'
  },
  {
    id: 'sonora-quest',
    name: 'Sonora Quest',
    url: 'https://fhir.sonoraquest.com/api/FHIR/R4',
    description: 'Connect to your Sonora Quest lab results',
    logoIcon: 'microscope',
    type: 'lab'
  }
];

// TEFCA QHIN providers
const tefcaProviders: FhirProvider[] = [
  {
    id: 'commonwell-qhin',
    name: 'CommonWell Health Alliance',
    url: 'https://fhir.commonwellalliance.org/api/FHIR/R4',
    description: 'TEFCA Qualified Health Information Network',
    logoIcon: 'server',
    type: 'tefca'
  },
  {
    id: 'healthgorilla-qhin',
    name: 'Health Gorilla',
    url: 'https://fhir.healthgorilla.com/api/FHIR/R4',
    description: 'TEFCA Qualified Health Information Network',
    logoIcon: 'server',
    type: 'tefca'
  },
  {
    id: 'epic-qhin',
    name: 'Epic Care Everywhere',
    url: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    description: 'TEFCA Qualified Health Information Network',
    logoIcon: 'server',
    type: 'tefca'
  },
  {
    id: 'konza-qhin',
    name: 'Konza Health Information Exchange',
    url: 'https://fhir.konza.org/api/FHIR/R4',
    description: 'TEFCA Qualified Health Information Network',
    logoIcon: 'server',
    type: 'tefca'
  }
];

// Testing and development providers
const developmentProviders: FhirProvider[] = [
  {
    id: 'demo',
    name: 'Demo Connection (Sample Data)',
    url: '/api/fhir/demo',
    description: 'Connect to a sample dataset to try the application',
    logoIcon: 'database',
    type: 'vendor'
  },
  {
    id: 'epic-sandbox',
    name: 'Epic Sandbox (Test Patient)',
    url: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    description: 'Connect to Epic\'s test sandbox with sample patient data (fhircamila/epicepic1)',
    logoIcon: 'stethoscope',
    type: 'vendor'
  },
  {
    id: 'hapi',
    name: 'HAPI FHIR Server (Test)',
    url: 'https://hapi.fhir.org/baseR4',
    description: 'Connect to the public HAPI FHIR test server',
    logoIcon: 'database',
    type: 'vendor'
  },
  {
    id: 'other',
    name: 'Other SMART on FHIR Provider',
    url: '',
    description: 'Connect to another SMART on FHIR provider',
    logoIcon: 'database',
    type: 'vendor'
  }
];

// Combine all providers
export const fhirProviders: FhirProvider[] = [
  ...epicProviders,
  ...otherProviders,
  ...insuranceProviders,
  ...pharmacyProviders,
  ...labProviders,
  ...tefcaProviders,
  ...developmentProviders
];

export function getProviderById(id: string): FhirProvider | undefined {
  return fhirProviders.find(provider => provider.id === id);
}