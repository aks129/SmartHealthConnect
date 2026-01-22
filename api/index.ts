import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// Simple in-memory session storage for demo
let demoSession: any = null;

// In-memory storage for family data (demo purposes)
let demoFamilyMembers: any[] = [
  {
    id: 1,
    userId: 1,
    name: 'Self',
    relationship: 'self',
    dateOfBirth: '1985-06-15',
    gender: 'Male',
    isPrimary: true,
    createdAt: new Date().toISOString(),
  }
];

let demoJournalEntries: any[] = [];
let demoCarePlans: any[] = [];
let demoAppointmentPrep: any[] = [];

// NPI Registry API
const NPI_REGISTRY_BASE = 'https://npiregistry.cms.hhs.gov/api';

// bioRxiv/medRxiv API
const BIORXIV_API_BASE = 'https://api.biorxiv.org';

// Condition to research keywords mapping
const CONDITION_RESEARCH_KEYWORDS: Record<string, string[]> = {
  'diabetes': ['diabetes', 'glycemic', 'insulin', 'HbA1c', 'glucose', 'metformin'],
  'hypertension': ['hypertension', 'blood pressure', 'antihypertensive', 'cardiovascular'],
  'heart disease': ['cardiovascular', 'cardiac', 'heart failure', 'coronary', 'myocardial'],
  'asthma': ['asthma', 'bronchial', 'respiratory', 'inhaler', 'bronchodilator'],
  'copd': ['COPD', 'pulmonary', 'emphysema', 'chronic obstructive'],
};

// Specialty mappings for NPI search
const SPECIALTY_MAP: Record<string, string> = {
  'family medicine': 'Family Medicine',
  'internal medicine': 'Internal Medicine',
  'pediatrics': 'Pediatrics',
  'cardiology': 'Cardiovascular Disease',
  'dermatology': 'Dermatology',
  'gastroenterology': 'Gastroenterology',
  'neurology': 'Neurology',
  'ophthalmology': 'Ophthalmology',
  'orthopedic surgery': 'Orthopaedic Surgery',
  'psychiatry': 'Psychiatry & Neurology',
  'pulmonary disease': 'Pulmonary Disease',
  'urology': 'Urology',
  'oncology': 'Hematology & Oncology',
  'endocrinology': 'Endocrinology, Diabetes & Metabolism',
  'nephrology': 'Nephrology',
  'rheumatology': 'Rheumatology',
};

function normalizeSpecialty(input: string): string {
  const lower = input.toLowerCase();
  return SPECIALTY_MAP[lower] || input;
}

// Vercel serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('API Request:', req.method, req.url);

    // Handle demo connection endpoint specifically
    if (req.method === 'POST' && req.url === '/api/fhir/demo/connect') {
      // Create demo session
      demoSession = {
        id: 1,
        provider: 'demo',
        patientId: 'demo-patient-1',
        fhirServer: '/api/fhir/demo',
        accessToken: 'demo_token',
        current: true,
        createdAt: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        message: 'Demo session created successfully',
        session: demoSession
      });
    }

    // Handle current session endpoint
    if (req.method === 'GET' && req.url === '/api/fhir/sessions/current') {
      if (demoSession && demoSession.current) {
        return res.status(200).json(demoSession);
      } else {
        return res.status(404).json({ message: 'No active session found' });
      }
    }

    // Handle session deletion
    if (req.method === 'DELETE' && req.url === '/api/fhir/sessions/current') {
      if (demoSession) {
        demoSession.current = false;
        demoSession = null;
      }
      return res.status(200).json({ success: true, message: 'Session ended' });
    }

    // Handle FHIR resource requests for SMART sandbox
    if (demoSession?.provider === 'smart-sandbox' && req.method === 'GET') {
      // Handle patient endpoint - returns single patient
      if (req.url === '/api/fhir/patient') {
        try {
          const fhirUrl = `${demoSession.fhirServer}/Patient/${demoSession.patientId}`;
          const fhirResponse = await fetch(fhirUrl, {
            headers: {
              'Authorization': `Bearer ${demoSession.accessToken}`,
              'Accept': 'application/fhir+json'
            }
          });

          if (!fhirResponse.ok) {
            console.error(`Patient fetch failed: ${fhirResponse.status}`);
            return res.status(200).json({});
          }

          const patientData = await fhirResponse.json();
          return res.status(200).json(patientData);
        } catch (error) {
          console.error('Patient fetch error:', error);
          return res.status(200).json({});
        }
      }

      // Handle other FHIR resources that use search
      const fhirResourcePatterns = [
        '/api/fhir/condition',
        '/api/fhir/observation',
        '/api/fhir/medicationrequest',
        '/api/fhir/allergyintolerance',
        '/api/fhir/immunization',
        '/api/fhir/procedure',
        '/api/fhir/encounter',
        '/api/fhir/diagnosticreport'
      ];

      const matchedPattern = fhirResourcePatterns.find(pattern =>
        req.url?.toLowerCase().startsWith(pattern)
      );

      if (matchedPattern) {
        try {
          // Map endpoint to FHIR resource type
          const resourceType = matchedPattern.replace('/api/fhir/', '');
          const fhirResourceType = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);

          // Build FHIR server URL
          const fhirUrl = `${demoSession.fhirServer}/${fhirResourceType}?patient=${demoSession.patientId}`;

          const fhirResponse = await fetch(fhirUrl, {
            headers: {
              'Authorization': `Bearer ${demoSession.accessToken}`,
              'Accept': 'application/fhir+json'
            }
          });

          if (!fhirResponse.ok) {
            console.error(`FHIR request failed: ${fhirResponse.status}`);
            return res.status(200).json([]); // Graceful fallback
          }

          const fhirData = await fhirResponse.json();

          // Extract resources from bundle
          if (fhirData.entry && Array.isArray(fhirData.entry)) {
            return res.status(200).json(fhirData.entry.map((e: any) => e.resource));
          }

          return res.status(200).json([]);
        } catch (error) {
          console.error('FHIR proxy error:', error);
          return res.status(200).json([]); // Graceful fallback
        }
      }
    }

    // Handle other demo FHIR endpoints
    if (req.url?.startsWith('/api/fhir/demo/')) {
      const resourcePath = req.url.replace('/api/fhir/demo/', '');

      // Return sample patient data for demo
      if (resourcePath === 'Patient/demo-patient-1') {
        return res.status(200).json({
          resourceType: "Patient",
          id: "demo-patient-1",
          active: true,
          name: [
            {
              use: "official",
              family: "Smith",
              given: ["John", "William"]
            }
          ],
          telecom: [
            {
              system: "phone",
              value: "555-123-4567",
              use: "home"
            }
          ],
          gender: "male",
          birthDate: "1980-01-15",
          address: [
            {
              use: "home",
              line: ["123 Main Street"],
              city: "Demo City",
              state: "CA",
              postalCode: "12345",
              country: "US"
            }
          ]
        });
      }

      // Handle Condition resources
      if (resourcePath.includes('Condition?patient=')) {
        return res.status(200).json({
          resourceType: "Bundle",
          type: "searchset",
          total: 2,
          entry: [
            {
              resource: {
                resourceType: "Condition",
                id: "demo-condition-1",
                subject: { reference: "Patient/demo-patient-1" },
                code: {
                  coding: [{
                    system: "http://snomed.info/sct",
                    code: "38341003",
                    display: "Hypertensive disorder"
                  }],
                  text: "Hypertension"
                },
                clinicalStatus: {
                  coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    code: "active"
                  }]
                },
                onsetDateTime: "2020-01-15",
                recordedDate: "2020-01-15"
              }
            },
            {
              resource: {
                resourceType: "Condition",
                id: "demo-condition-2",
                subject: { reference: "Patient/demo-patient-1" },
                code: {
                  coding: [{
                    system: "http://snomed.info/sct",
                    code: "44054006",
                    display: "Diabetes mellitus type 2"
                  }],
                  text: "Type 2 Diabetes"
                },
                clinicalStatus: {
                  coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    code: "active"
                  }]
                },
                onsetDateTime: "2019-03-10",
                recordedDate: "2019-03-10"
              }
            }
          ]
        });
      }

      // Handle Observation resources
      if (resourcePath.includes('Observation?patient=')) {
        return res.status(200).json({
          resourceType: "Bundle",
          type: "searchset",
          total: 3,
          entry: [
            {
              resource: {
                resourceType: "Observation",
                id: "demo-obs-1",
                subject: { reference: "Patient/demo-patient-1" },
                code: {
                  coding: [{
                    system: "http://loinc.org",
                    code: "85354-9",
                    display: "Blood pressure panel"
                  }]
                },
                valueQuantity: {
                  value: 135,
                  unit: "mmHg"
                },
                effectiveDateTime: "2024-01-15",
                status: "final"
              }
            },
            {
              resource: {
                resourceType: "Observation",
                id: "demo-obs-2",
                subject: { reference: "Patient/demo-patient-1" },
                code: {
                  coding: [{
                    system: "http://loinc.org",
                    code: "33747-0",
                    display: "Hemoglobin A1c"
                  }]
                },
                valueQuantity: {
                  value: 7.2,
                  unit: "%"
                },
                effectiveDateTime: "2024-01-10",
                status: "final"
              }
            },
            {
              resource: {
                resourceType: "Observation",
                id: "demo-obs-3",
                subject: { reference: "Patient/demo-patient-1" },
                code: {
                  coding: [{
                    system: "http://loinc.org",
                    code: "29463-7",
                    display: "Body weight"
                  }]
                },
                valueQuantity: {
                  value: 180,
                  unit: "lbs"
                },
                effectiveDateTime: "2024-01-15",
                status: "final"
              }
            }
          ]
        });
      }

      // Return empty bundle for other resources
      return res.status(200).json({
        resourceType: "Bundle",
        type: "searchset",
        total: 0,
        entry: []
      });
    }

    // Handle SMART on FHIR OAuth callback
    if (req.method === 'POST' && req.url === '/api/fhir/smart/callback') {
      const { code, redirectUri, provider } = req.body as any;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
      }

      // Determine token endpoint based on provider
      let tokenEndpoint: string;
      let fhirBaseUrl: string;
      const clientId = 'my_web_app'; // Public client ID for SMART launcher

      if (provider === 'smart-sandbox') {
        // SMART Health IT Launcher
        const launchConfig = Buffer.from(JSON.stringify({ h: '1', i: '1', j: '1' })).toString('base64');
        tokenEndpoint = `https://launch.smarthealthit.org/v/r4/sim/${launchConfig}/auth/token`;
        fhirBaseUrl = `https://launch.smarthealthit.org/v/r4/sim/${launchConfig}/fhir`;
      } else {
        // Epic sandbox (fallback)
        tokenEndpoint = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';
        fhirBaseUrl = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
      }

      try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId
          })
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error('Token exchange failed:', errorData);
          return res.status(400).json({
            success: false,
            message: 'Failed to exchange authorization code'
          });
        }

        const tokenData = await tokenResponse.json();

        // Extract patient ID from the token response
        const patientId = tokenData.patient;

        if (!patientId) {
          return res.status(400).json({
            success: false,
            message: 'No patient context in token response'
          });
        }

        // Create FHIR session with tokens
        demoSession = {
          id: Date.now(),
          provider: provider || 'smart-sandbox',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpiry: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
          fhirServer: fhirBaseUrl,
          patientId: patientId,
          scope: tokenData.scope || 'patient/*.read',
          current: true,
          createdAt: new Date().toISOString()
        };

        return res.status(200).json({
          success: true,
          message: 'SMART connection successful',
          patientId: patientId
        });
      } catch (error) {
        console.error('SMART OAuth callback error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to complete SMART authentication'
        });
      }
    }

    // Handle care gaps endpoint
    if (req.method === 'GET' && req.url === '/api/fhir/care-gaps') {
      // For demo, return sample care gaps based on the demo patient data
      if (demoSession && demoSession.current) {
        const careGaps = [
          {
            id: 'gap-1',
            title: 'Annual Wellness Visit',
            description: 'Regular wellness visits help detect health issues early and maintain preventive care.',
            status: 'due',
            category: 'preventive',
            priority: 'high',
            measureId: 'AWV',
            recommendedAction: 'Schedule your annual wellness visit with your primary care provider to review your health status and update preventive care plans.',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            reason: null,
            lastPerformedDate: null
          },
          {
            id: 'gap-2',
            title: 'Diabetes HbA1c Testing',
            description: 'Regular A1c testing is essential for diabetes management and monitoring blood sugar control.',
            status: 'due',
            category: 'chronic',
            priority: 'high',
            measureId: 'CDC-E',
            recommendedAction: 'Schedule an HbA1c test with your healthcare provider. This test should be done at least twice a year for diabetic patients.',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
            reason: null,
            lastPerformedDate: '2024-01-10'
          },
          {
            id: 'gap-3',
            title: 'Blood Pressure Control',
            description: 'Monitoring and controlling blood pressure reduces the risk of heart disease and stroke.',
            status: 'satisfied',
            category: 'chronic',
            priority: 'medium',
            measureId: 'CBP',
            recommendedAction: 'Continue current blood pressure management plan.',
            dueDate: null,
            reason: null,
            lastPerformedDate: '2024-01-15'
          },
          {
            id: 'gap-4',
            title: 'Colorectal Cancer Screening',
            description: 'Screening for colorectal cancer is recommended for adults aged 50-75.',
            status: 'not_applicable',
            category: 'preventive',
            priority: 'low',
            measureId: 'COL',
            recommendedAction: 'Not currently required based on age.',
            dueDate: null,
            reason: 'Patient age does not meet screening criteria (under 50)',
            lastPerformedDate: null
          },
          {
            id: 'gap-5',
            title: 'Flu Vaccination',
            description: 'Annual flu vaccination helps prevent influenza and its complications.',
            status: 'due',
            category: 'preventive',
            priority: 'medium',
            measureId: 'FVA',
            recommendedAction: 'Get your annual flu vaccine. Available at your pharmacy or healthcare provider.',
            dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
            reason: null,
            lastPerformedDate: '2023-10-15'
          },
          {
            id: 'gap-6',
            title: 'Eye Exam for Diabetic Patients',
            description: 'Annual dilated eye exams help detect diabetic retinopathy early.',
            status: 'due',
            category: 'chronic',
            priority: 'medium',
            measureId: 'EED',
            recommendedAction: 'Schedule a dilated eye exam with an eye care professional to screen for diabetic complications.',
            dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
            reason: null,
            lastPerformedDate: '2023-03-20'
          }
        ];

        return res.status(200).json(careGaps);
      } else {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
    }

    // ============================================
    // External Healthcare API Routes
    // ============================================

    // Provider specialists search - NPI Registry
    if (req.method === 'GET' && req.url?.startsWith('/api/external/providers/specialists')) {
      try {
        const url = new URL(req.url, 'http://localhost');
        const specialty = url.searchParams.get('specialty');

        if (!specialty) {
          return res.status(400).json({
            error: 'specialty parameter is required',
            availableSpecialties: Object.keys(SPECIALTY_MAP)
          });
        }

        const city = url.searchParams.get('city');
        const state = url.searchParams.get('state');
        const postalCode = url.searchParams.get('postalCode');
        const limit = parseInt(url.searchParams.get('limit') || '10');

        const queryParams: Record<string, string | number> = {
          version: '2.1',
          limit: limit,
          taxonomy_description: normalizeSpecialty(specialty),
        };

        if (city) queryParams.city = city;
        if (state) queryParams.state = state;
        if (postalCode) queryParams.postal_code = postalCode;

        const response = await axios.get(`${NPI_REGISTRY_BASE}/`, {
          params: queryParams,
          timeout: 10000,
        });

        // Transform NPI API results
        const providers = (response.data.results || []).map((result: any) => {
          const basic = result.basic || {};
          return {
            npi: result.number,
            type: result.enumeration_type === 'NPI-1' ? 'individual' : 'organization',
            name: {
              first: basic.first_name,
              last: basic.last_name,
              middle: basic.middle_name,
              credential: basic.credential,
              organizationName: basic.organization_name,
            },
            specialties: (result.taxonomies || []).map((t: any) => ({
              code: t.code,
              description: t.desc,
              isPrimary: t.primary,
              state: t.state,
              licenseNumber: t.license,
            })),
            addresses: (result.addresses || []).map((a: any) => ({
              type: a.address_purpose === 'MAILING' ? 'mailing' : 'practice',
              line1: a.address_1,
              line2: a.address_2,
              city: a.city,
              state: a.state,
              postalCode: a.postal_code,
              country: a.country_code,
              phone: a.telephone_number,
              fax: a.fax_number,
            })),
            identifiers: (result.identifiers || []).map((i: any) => ({
              type: i.desc,
              identifier: i.identifier,
              state: i.state,
              issuer: i.issuer,
            })),
            enumerationDate: basic.enumeration_date || '',
            lastUpdated: basic.last_updated || '',
            status: basic.status === 'A' ? 'active' : 'deactivated',
          };
        }).filter((p: any) =>
          p.status === 'active' &&
          p.addresses.some((a: any) => a.type === 'practice')
        );

        return res.status(200).json({
          specialty: normalizeSpecialty(specialty),
          location: { city, state, postalCode },
          providers,
          totalCount: providers.length
        });
      } catch (error) {
        console.error('[External API] Provider search error:', error);
        return res.status(500).json({ error: 'Failed to find specialists' });
      }
    }

    // Provider specialties list
    if (req.method === 'GET' && req.url === '/api/external/providers/specialties') {
      return res.status(200).json({
        specialties: SPECIALTY_MAP,
        description: 'Common specialty terms mapped to NPI taxonomy descriptions'
      });
    }

    // Research preprints by condition
    if (req.method === 'GET' && req.url?.startsWith('/api/external/research/condition/')) {
      try {
        const urlPath = req.url.split('?')[0];
        const condition = decodeURIComponent(urlPath.replace('/api/external/research/condition/', ''));
        const lowerCondition = condition.toLowerCase();

        // Find matching keywords for the condition
        let keywords: string[] = [];
        for (const [key, terms] of Object.entries(CONDITION_RESEARCH_KEYWORDS)) {
          if (lowerCondition.includes(key) || key.includes(lowerCondition)) {
            keywords = terms;
            break;
          }
        }

        if (keywords.length === 0) {
          keywords = [condition];
        }

        const url = new URL(req.url, 'http://localhost');
        const server = (url.searchParams.get('server') as 'biorxiv' | 'medrxiv') || 'medrxiv';

        // Fetch recent preprints from bioRxiv/medRxiv
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const interval = `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`;

        const preprintResponse = await axios.get(
          `${BIORXIV_API_BASE}/details/${server}/${interval}/0/json`,
          { timeout: 15000 }
        );

        // Filter articles by keywords
        const lowerKeywords = keywords.map(k => k.toLowerCase());
        const articles = (preprintResponse.data.collection || [])
          .filter((article: any) => {
            const searchText = `${article.title} ${article.abstract}`.toLowerCase();
            return lowerKeywords.some(keyword => searchText.includes(keyword));
          })
          .slice(0, 15)
          .map((article: any) => ({
            doi: article.doi,
            title: article.title,
            authors: article.authors,
            authorList: article.authors.split(';').map((a: string) => a.trim()).filter(Boolean),
            abstract: article.abstract,
            category: article.category,
            date: article.date,
            server: article.server,
            version: article.version,
            type: article.type,
            license: article.license,
            published: article.published,
            url: `https://doi.org/${article.doi}`,
          }));

        return res.status(200).json({
          condition,
          keywords,
          server,
          articles,
          totalCount: articles.length
        });
      } catch (error) {
        console.error('[External API] Research search error:', error);
        return res.status(500).json({ error: 'Failed to search research for condition' });
      }
    }

    // ============================================
    // Family API Routes (In-memory demo data)
    // ============================================

    // Get all family members
    if (req.method === 'GET' && req.url === '/api/family/members') {
      return res.status(200).json(demoFamilyMembers);
    }

    // Get single family member
    if (req.method === 'GET' && req.url?.match(/^\/api\/family\/members\/\d+$/)) {
      const memberId = parseInt(req.url.split('/').pop() || '0');
      const member = demoFamilyMembers.find(m => m.id === memberId);
      if (member) {
        return res.status(200).json(member);
      }
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Create family member
    if (req.method === 'POST' && req.url === '/api/family/members') {
      const newMember = {
        id: demoFamilyMembers.length + 1,
        userId: 1,
        ...req.body,
        createdAt: new Date().toISOString(),
      };
      demoFamilyMembers.push(newMember);
      return res.status(201).json(newMember);
    }

    // Get journal entries for a family member
    if (req.method === 'GET' && req.url?.match(/^\/api\/family\/\d+\/journal/)) {
      const urlPath = req.url.split('?')[0];
      const memberId = parseInt(urlPath.split('/')[3]);
      const entries = demoJournalEntries.filter(e => e.familyMemberId === memberId);
      return res.status(200).json(entries);
    }

    // Create journal entry
    if (req.method === 'POST' && req.url?.match(/^\/api\/family\/\d+\/journal$/)) {
      const memberId = parseInt(req.url.split('/')[3]);
      const newEntry = {
        id: demoJournalEntries.length + 1,
        familyMemberId: memberId,
        ...req.body,
        createdAt: new Date().toISOString(),
      };
      demoJournalEntries.push(newEntry);
      return res.status(201).json(newEntry);
    }

    // Get care plans for a family member
    if (req.method === 'GET' && req.url?.match(/^\/api\/family\/\d+\/care-plans/)) {
      const urlPath = req.url.split('?')[0];
      const memberId = parseInt(urlPath.split('/')[3]);
      const plans = demoCarePlans.filter(p => p.familyMemberId === memberId);
      return res.status(200).json(plans);
    }

    // Generate AI care plan
    if (req.method === 'POST' && req.url?.match(/^\/api\/family\/\d+\/care-plans\/generate$/)) {
      const memberId = parseInt(req.url.split('/')[3]);
      const { conditionName, memberName } = req.body;

      const newPlan = {
        id: demoCarePlans.length + 1,
        familyMemberId: memberId,
        conditionName,
        title: `${conditionName} Management Plan`,
        summary: `Comprehensive care plan for managing ${conditionName} for ${memberName || 'patient'}.`,
        status: 'active',
        goals: [
          {
            id: `goal-${Date.now()}-1`,
            goal: `Achieve optimal control of ${conditionName} symptoms`,
            targetDate: '3 months',
            status: 'not_started',
          },
          {
            id: `goal-${Date.now()}-2`,
            goal: 'Maintain medication adherence above 90%',
            targetDate: 'Ongoing',
            status: 'not_started',
          },
        ],
        interventions: [
          {
            id: `int-${Date.now()}-1`,
            type: 'medication',
            description: 'Follow prescribed medication regimen',
            frequency: 'As prescribed',
            responsible: 'Patient',
          },
          {
            id: `int-${Date.now()}-2`,
            type: 'monitoring',
            description: 'Regular symptom monitoring and journaling',
            frequency: 'Daily',
            responsible: 'Patient',
          },
        ],
        monitoringPlan: [
          {
            metric: 'Symptom severity',
            frequency: 'Daily',
            target: 'Minimal symptoms',
          },
        ],
        lifestyle: {
          diet: ['Follow balanced, nutritious diet', 'Stay well hydrated'],
          exercise: ['Engage in appropriate physical activity as tolerated'],
          sleep: ['Maintain consistent sleep schedule', 'Aim for 7-8 hours of sleep'],
        },
        warningSignsToWatch: [
          'Sudden worsening of symptoms',
          'New or unusual symptoms',
        ],
        whenToSeekCare: 'Contact your healthcare provider if symptoms worsen significantly.',
        careTeam: [],
        aiGenerated: true,
        aiModel: 'template-v1',
        createdAt: new Date().toISOString(),
      };

      demoCarePlans.push(newPlan);
      return res.status(201).json(newPlan);
    }

    // Create care plan manually
    if (req.method === 'POST' && req.url?.match(/^\/api\/family\/\d+\/care-plans$/)) {
      const memberId = parseInt(req.url.split('/')[3]);
      const newPlan = {
        id: demoCarePlans.length + 1,
        familyMemberId: memberId,
        ...req.body,
        createdAt: new Date().toISOString(),
      };
      demoCarePlans.push(newPlan);
      return res.status(201).json(newPlan);
    }

    // Update care plan goal status
    if (req.method === 'PATCH' && req.url?.match(/^\/api\/care-plans\/\d+\/goals\/[\w-]+$/)) {
      const urlParts = req.url.split('/');
      const planId = parseInt(urlParts[3]);
      const goalId = urlParts[5];
      const { status } = req.body;

      const plan = demoCarePlans.find(p => p.id === planId);
      if (!plan) {
        return res.status(404).json({ error: 'Care plan not found' });
      }

      plan.goals = (plan.goals || []).map((goal: any) =>
        goal.id === goalId ? { ...goal, status } : goal
      );
      plan.updatedAt = new Date().toISOString();

      return res.status(200).json(plan);
    }

    // Get appointment prep summaries
    if (req.method === 'GET' && req.url?.match(/^\/api\/family\/\d+\/appointment-prep/)) {
      const memberId = parseInt(req.url.split('/')[3]);
      const summaries = demoAppointmentPrep.filter(s => s.familyMemberId === memberId);
      return res.status(200).json(summaries);
    }

    // Generate appointment prep summary
    if (req.method === 'POST' && req.url?.match(/^\/api\/family\/\d+\/appointment-prep\/generate$/)) {
      const memberId = parseInt(req.url.split('/')[3]);
      const { appointmentDate, visitType, providerName, concerns } = req.body;

      const newSummary = {
        id: demoAppointmentPrep.length + 1,
        familyMemberId: memberId,
        appointmentId: null,
        appointmentDate,
        visitType: visitType || 'General',
        providerName: providerName || 'Healthcare Provider',
        recentChanges: null,
        currentMedications: null,
        activeConditions: null,
        recentLabResults: null,
        vitalsTrend: { note: 'Vitals will be measured at appointment' },
        questionsToAsk: concerns ? concerns.split('\n').filter((c: string) => c.trim()) : [
          'What are the next steps for my care?',
          'Are there any lifestyle changes I should make?',
          'When should I follow up?',
        ],
        symptomsToReport: { note: 'Please prepare to discuss any symptoms' },
        exportFormat: null,
        exportedAt: null,
        shareLink: null,
        shareLinkExpiry: null,
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      demoAppointmentPrep.push(newSummary);
      return res.status(201).json(newSummary);
    }

    // Family summary endpoint
    if (req.method === 'GET' && req.url === '/api/family/summary') {
      const summary = demoFamilyMembers.map(member => ({
        ...member,
        pendingActions: 0,
      }));
      return res.status(200).json({
        members: summary,
        totalPendingActions: 0,
      });
    }

    // Default response for other API calls
    return res.status(404).json({
      error: 'Not Found',
      message: 'API endpoint not found'
    });

  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}