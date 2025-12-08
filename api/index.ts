import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory session storage for demo
let demoSession: any = null;

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