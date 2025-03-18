import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  BookOpen, 
  FileText, 
  User, 
  Users, 
  UserPlus,
  Building, 
  ShieldCheck, 
  CheckCircle, 
  PanelRight, 
  RefreshCw, 
  Search, 
  Link, 
  Info, 
  HelpCircle, 
  BarChart3, 
  Pill,
  CalendarPlus,
  UserCog,
  Building2
} from 'lucide-react';
import { MedicalSpinner } from "@/components/ui/medical-spinner";
import { Link as RouterLink } from 'wouter';

// User role types
type UserRole = 'patient' | 'family' | 'provider' | 'payer' | 'employer' | 'pharmacist';

// Component for the user role selector
function RoleSelector({ selectedRole, onRoleChange }: { 
  selectedRole: UserRole | null, 
  onRoleChange: (role: UserRole) => void 
}) {
  const roles: Array<{ id: UserRole; name: string; icon: React.ReactNode; description: string }> = [
    { 
      id: 'patient', 
      name: 'Patient', 
      icon: <User className="h-8 w-8 text-blue-500" />,
      description: 'Access and manage your personal health records'
    },
    { 
      id: 'family', 
      name: 'Family Member/Caregiver', 
      icon: <Users className="h-8 w-8 text-green-500" />,
      description: 'Help manage health records for loved ones'
    },
    { 
      id: 'provider', 
      name: 'Healthcare Provider', 
      icon: <UserPlus className="h-8 w-8 text-red-500" />,
      description: 'Access patient records and clinical tools'
    },
    { 
      id: 'payer', 
      name: 'Insurance/Payer', 
      icon: <Building className="h-8 w-8 text-purple-500" />,
      description: 'Track claims, coverage, and patient care'
    },
    { 
      id: 'employer', 
      name: 'Employer', 
      icon: <Building2 className="h-8 w-8 text-orange-500" />,
      description: 'Manage employee health programs'
    },
    { 
      id: 'pharmacist', 
      name: 'Pharmacist', 
      icon: <Pill className="h-8 w-8 text-teal-500" />,
      description: 'Access medication records and manage prescriptions'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">What is your role?</h2>
        <p className="text-muted-foreground">
          Select your role to get personalized guidance on using Health Connect
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card 
            key={role.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRole === role.id ? 'border-primary ring-2 ring-primary ring-opacity-50' : ''
            }`}
            onClick={() => onRoleChange(role.id)}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="p-3 rounded-full bg-primary/10">
                  {role.icon}
                </div>
                <h3 className="font-semibold text-lg">{role.name}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
                
                {selectedRole === role.id && (
                  <Badge className="mt-2 bg-primary">Selected</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!selectedRole && (
        <div className="text-center mt-4 text-amber-600">
          <HelpCircle className="inline-block mr-2 h-4 w-4" />
          Please select a role to continue
        </div>
      )}
    </div>
  );
}

// Content for each role
function RoleBasedContent({ role }: { role: UserRole }) {
  return (
    <div className="mt-8 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          Health Connect for {getRoleName(role)}
        </h2>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          {getRoleDescription(role)}
        </p>
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto">
          <TabsTrigger value="overview">
            <Info className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="features">
            <CheckCircle className="h-4 w-4 mr-2" />
            Key Features
          </TabsTrigger>
          <TabsTrigger value="getting-started">
            <BookOpen className="h-4 w-4 mr-2" />
            Getting Started
          </TabsTrigger>
          <TabsTrigger value="faqs">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQs
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Overview for {getRoleName(role)}</CardTitle>
                <CardDescription>
                  Learn how Health Connect helps {getRoleName(role).toLowerCase()}s
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      Tutorial video for {getRoleName(role).toLowerCase()}s
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-medium">How Health Connect Works for You</h3>
                  {getRoleOverview(role)}
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                        Secure Access
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 text-sm">
                      {getSecureAccessContent(role)}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                        Insights & Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 text-sm">
                      {getInsightsContent(role)}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center">
                        <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                        Integration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 text-sm">
                      {getIntegrationContent(role)}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Ready to explore more? Check out the features and getting started guides specific to your role.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Key Features for {getRoleName(role)}</CardTitle>
                <CardDescription>
                  Discover the powerful tools and capabilities available to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {getFeaturesContent(role).map((feature, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-primary/10">
                          {feature.icon}
                        </div>
                        <div>
                          <h3 className="font-medium text-lg mb-1">{feature.title}</h3>
                          <p className="text-muted-foreground">{feature.description}</p>
                          
                          {feature.details && (
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              {feature.details.map((detail, i) => (
                                <li key={i} className="text-sm">{detail}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="getting-started">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started Guide</CardTitle>
                <CardDescription>
                  Follow these steps to begin using Health Connect as a {getRoleName(role).toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <p className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        This guide will help you set up and start using Health Connect efficiently.
                      </span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    {getGettingStartedSteps(role).map((step, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-medium text-lg">{step.title}</h3>
                          <p className="text-muted-foreground">{step.description}</p>
                          
                          {step.image && (
                            <div className="my-2 aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  Screenshot: {step.image}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {step.note && (
                            <div className="bg-amber-50 p-3 rounded border border-amber-200 text-sm">
                              <span className="font-medium">Note:</span> {step.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-primary/5 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Need More Help?</h3>
                    <p className="text-sm">
                      If you have additional questions or need assistance, please contact our support team
                      or check out our detailed documentation.
                    </p>
                    <div className="flex gap-4 mt-4">
                      <Button size="sm" variant="outline">
                        Contact Support
                      </Button>
                      <Button size="sm" variant="outline">
                        View Documentation
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faqs">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>
                  Common questions from {getRoleName(role).toLowerCase()}s using Health Connect
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {getFAQs(role).map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-muted-foreground space-y-2">
                          <p>{faq.answer}</p>
                          {faq.additionalInfo && (
                            <p className="text-sm italic">{faq.additionalInfo}</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
              <CardFooter className="flex-col items-start space-y-2">
                <h3 className="font-medium">Still have questions?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If you couldn't find the answer you were looking for, please reach out to our support team.
                </p>
                <div className="flex gap-4">
                  <Button size="sm" variant="outline">
                    Contact Support
                  </Button>
                  <Button size="sm" variant="outline">
                    Browse Knowledge Base
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Helper functions for role-specific content
function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    'patient': 'Patient',
    'family': 'Family Member/Caregiver',
    'provider': 'Healthcare Provider',
    'payer': 'Insurance/Payer',
    'employer': 'Employer',
    'pharmacist': 'Pharmacist'
  };
  return roleNames[role];
}

function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    'patient': 'Access, understand, and manage your personal health records in one secure location.',
    'family': 'Help manage and coordinate healthcare for your loved ones with secure access to their health information.',
    'provider': 'Access comprehensive patient records to provide more informed and coordinated care.',
    'payer': 'Track claims, coverage details, and monitor care quality and outcomes.',
    'employer': 'Support employee health and wellness programs with secure, HIPAA-compliant tools.',
    'pharmacist': 'Access medication histories and manage prescriptions with comprehensive health context.'
  };
  return descriptions[role];
}

function getRoleOverview(role: UserRole): React.ReactNode {
  const overviews: Record<UserRole, React.ReactNode> = {
    'patient': (
      <div className="space-y-3">
        <p>
          Health Connect gives you a complete view of your medical records from multiple providers in one
          secure platform. No more keeping track of paper records or navigating different patient portals.
        </p>
        <p>
          You can easily see your conditions, medications, lab results, immunizations, and appointments
          in a clear, organized interface. The platform also helps identify potential care gaps and
          provides educational resources about your specific health conditions.
        </p>
        <p>
          With Health Connect, you're empowered to take an active role in your healthcare decisions with
          better access to your complete medical information.
        </p>
      </div>
    ),
    'family': (
      <div className="space-y-3">
        <p>
          As a caregiver or family member, Health Connect helps you coordinate care for your loved ones
          by providing secure access to their health information (with appropriate permissions).
        </p>
        <p>
          The platform simplifies managing multiple appointments, medications, and care instructions,
          reducing the burden of caregiving. You can easily share relevant health information with
          different providers to ensure coordinated care.
        </p>
        <p>
          Health Connect also provides resources and support specific to caregivers, helping you
          navigate the healthcare system more effectively.
        </p>
      </div>
    ),
    'provider': (
      <div className="space-y-3">
        <p>
          For healthcare providers, Health Connect offers a comprehensive view of patient health data
          from multiple sources, helping you make more informed clinical decisions.
        </p>
        <p>
          The platform integrates with existing EHR systems through SMART on FHIR protocols,
          providing seamless access to patient data without replacing your primary clinical systems.
        </p>
        <p>
          Health Connect also identifies potential care gaps based on clinical guidelines,
          supports quality measure reporting, and provides analytics to help improve care delivery
          and patient outcomes.
        </p>
      </div>
    ),
    'payer': (
      <div className="space-y-3">
        <p>
          Health Connect helps payers and insurance organizations track claims processing,
          monitor care quality, and identify opportunities for improved health outcomes.
        </p>
        <p>
          The platform provides analytics on population health metrics, helps identify care gaps
          across member populations, and facilitates more effective care management programs.
        </p>
        <p>
          With secure access to comprehensive health data, you can make more informed decisions
          about benefits design, provider networks, and member engagement strategies.
        </p>
      </div>
    ),
    'employer': (
      <div className="space-y-3">
        <p>
          For employers, Health Connect offers tools to support employee health and wellness programs
          while maintaining strict HIPAA compliance and data privacy.
        </p>
        <p>
          The platform provides aggregated, de-identified analytics on health trends to help shape
          wellness programs, benefits offerings, and other health-related initiatives.
        </p>
        <p>
          Health Connect can integrate with existing wellness platforms and benefits administration
          systems to create a more cohesive employee health experience.
        </p>
      </div>
    ),
    'pharmacist': (
      <div className="space-y-3">
        <p>
          Health Connect gives pharmacists access to comprehensive medication histories and clinical
          context to support medication therapy management and improve patient safety.
        </p>
        <p>
          The platform helps identify potential drug interactions, adherence issues, and opportunities
          for medication optimization based on the patient's complete health record.
        </p>
        <p>
          With access to lab results, conditions, and other clinical data, you can provide more
          informed medication counseling and collaborate more effectively with other healthcare providers.
        </p>
      </div>
    )
  };
  return overviews[role];
}

function getSecureAccessContent(role: UserRole): React.ReactNode {
  const content: Record<UserRole, string> = {
    'patient': 'Securely access your health records from multiple providers through a single portal with strong authentication and encryption.',
    'family': 'Gain authorized access to your loved ones\' health information while maintaining privacy and security with customizable permission levels.',
    'provider': 'Connect securely to patient records across systems with clinical-grade security and appropriate access controls.',
    'payer': 'Access authorized member health information with robust security controls and detailed audit trails for compliance.',
    'employer': 'Maintain HIPAA compliance with secure, role-based access to appropriate health information for wellness programs.',
    'pharmacist': 'Securely access medication histories and related clinical information with appropriate authentication and authorization.'
  };
  return content[role];
}

function getInsightsContent(role: UserRole): React.ReactNode {
  const content: Record<UserRole, string> = {
    'patient': 'Receive personalized insights about your health trends, care gaps, and recommendations based on your specific health profile.',
    'family': 'Get a clearer picture of care needs, medication schedules, and health trends for those you care for.',
    'provider': 'Access clinical analytics, care gap identification, and population health insights to improve patient outcomes.',
    'payer': 'Leverage data analytics for cost management, quality improvement, and care management program optimization.',
    'employer': 'View aggregated, de-identified insights on health trends to inform wellness program design and benefits strategy.',
    'pharmacist': 'Identify adherence patterns, potential medication issues, and opportunities for clinical interventions.'
  };
  return content[role];
}

function getIntegrationContent(role: UserRole): React.ReactNode {
  const content: Record<UserRole, string> = {
    'patient': 'Connect to multiple healthcare providers and systems to create a comprehensive health record in one place.',
    'family': 'Integrate care plans, appointments, and instructions from various providers into a unified dashboard.',
    'provider': 'Seamlessly integrate with your EHR system through SMART on FHIR protocols with minimal workflow disruption.',
    'payer': 'Connect with provider systems, wellness platforms, and other data sources for a more complete view of member health.',
    'employer': 'Integrate with benefits administration systems, wellness platforms, and health plan data for cohesive program management.',
    'pharmacist': 'Connect with pharmacy management systems, EHRs, and other healthcare platforms for comprehensive medication management.'
  };
  return content[role];
}

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  details?: string[];
}

function getFeaturesContent(role: UserRole): Feature[] {
  const features: Record<UserRole, Feature[]> = {
    'patient': [
      {
        title: 'Health Dashboard',
        description: 'View all your important health information at a glance with an intuitive, personalized dashboard.',
        icon: <PanelRight className="h-6 w-6 text-primary" />,
        details: [
          'Summary of recent health events and upcoming appointments',
          'Key health metrics and trends visualized with simple charts',
          'Identified care gaps that need attention',
          'Quick access to medications and immunization records'
        ]
      },
      {
        title: 'Medical Records Access',
        description: 'Access your complete medical records from multiple healthcare providers in one secure location.',
        icon: <FileText className="h-6 w-6 text-primary" />,
        details: [
          'View conditions, allergies, medications, and procedures',
          'Access lab results with easy-to-understand explanations',
          'Track immunizations and preventive care history',
          'View clinical notes and visit summaries'
        ]
      },
      {
        title: 'Provider Connections',
        description: 'Securely connect to your healthcare providers to access your medical records.',
        icon: <Link className="h-6 w-6 text-primary" />,
        details: [
          'Connect to major health systems, hospitals, and clinics',
          'Support for Epic, Cerner, and other major EHR systems',
          'Secure authentication using SMART on FHIR protocols',
          'Control which providers have access to your information'
        ]
      },
      {
        title: 'Health Education',
        description: 'Access reliable educational resources about your specific health conditions and medications.',
        icon: <BookOpen className="h-6 w-6 text-primary" />,
        details: [
          'Condition-specific information from trusted medical sources',
          'Medication guides with important usage and side effect information',
          'Preventive care recommendations based on your health profile',
          'Interactive learning tools to improve health literacy'
        ]
      },
      {
        title: 'Care Gap Management',
        description: 'Identify and address potential gaps in your healthcare based on clinical guidelines.',
        icon: <CheckCircle className="h-6 w-6 text-primary" />,
        details: [
          'Personalized preventive care recommendations',
          'Reminders for screenings and vaccinations',
          'Monitoring of chronic condition management',
          'Suggestions for discussing care gaps with your provider'
        ]
      }
    ],
    'family': [
      {
        title: 'Caregiver Dashboard',
        description: 'Manage the health information of your loved ones with a dedicated caregiver dashboard.',
        icon: <PanelRight className="h-6 w-6 text-primary" />,
        details: [
          'Multi-patient view to manage multiple family members',
          'Calendar integration for appointment management',
          'Medication schedules and reminders',
          'Care plan tracking and task management'
        ]
      },
      {
        title: 'Authorized Access',
        description: 'Gain secure, authorized access to the health records of those you care for.',
        icon: <ShieldCheck className="h-6 w-6 text-primary" />,
        details: [
          'Flexible permission options based on care needs',
          'Secure verification process for caregiver authorization',
          'Ability to manage specific access privileges',
          'Detailed audit trail of information access'
        ]
      },
      {
        title: 'Care Coordination',
        description: 'Coordinate care across multiple providers and share relevant information securely.',
        icon: <Users className="h-6 w-6 text-primary" />,
        details: [
          'Share health information with different providers',
          'Track care instructions and follow-up tasks',
          'Maintain a unified care plan across providers',
          'Secure messaging with healthcare team members'
        ]
      },
      {
        title: 'Health Monitoring',
        description: 'Track health metrics, symptoms, and medication adherence for those you care for.',
        icon: <BarChart3 className="h-6 w-6 text-primary" />,
        details: [
          'Record and track symptoms and health changes',
          'Monitor medication adherence and effectiveness',
          'Track progress against care plan goals',
          'Set up alerts for concerning changes'
        ]
      },
      {
        title: 'Caregiver Resources',
        description: 'Access resources and support specifically designed for caregivers.',
        icon: <Heart className="h-6 w-6 text-primary" />,
        details: [
          'Educational materials on caregiving best practices',
          'Self-care resources and stress management tools',
          'Connection to caregiver support groups',
          'Information on available community resources'
        ]
      }
    ],
    'provider': [
      {
        title: 'Clinical Dashboard',
        description: 'Access a comprehensive view of patient health information to support clinical decision-making.',
        icon: <PanelRight className="h-6 w-6 text-primary" />,
        details: [
          'Patient summary with key health metrics and alerts',
          'Chronological view of health events across providers',
          'Medication reconciliation tools',
          'Care gap identification and quality measure tracking'
        ]
      },
      {
        title: 'EHR Integration',
        description: 'Seamlessly integrate with existing EHR systems through SMART on FHIR protocols.',
        icon: <RefreshCw className="h-6 w-6 text-primary" />,
        details: [
          'Launch within existing EHR workflow',
          'Bidirectional data exchange for complete records',
          'Compatible with major EHR systems (Epic, Cerner, etc.)',
          'Minimal training required for clinical staff'
        ]
      },
      {
        title: 'Clinical Analytics',
        description: 'Access analytics and insights to improve patient care and practice management.',
        icon: <BarChart3 className="h-6 w-6 text-primary" />,
        details: [
          'Population health management tools',
          'Quality measure tracking and reporting',
          'Care gap analysis at patient and population levels',
          'Clinical outcome trending and benchmarking'
        ]
      },
      {
        title: 'Referral Management',
        description: 'Streamline the referral process and track patient care across the healthcare ecosystem.',
        icon: <UserPlus className="h-6 w-6 text-primary" />,
        details: [
          'Electronic referral generation and tracking',
          'Secure sharing of relevant clinical information',
          'Notification of referral status updates',
          'Closed-loop communication with specialists'
        ]
      },
      {
        title: 'Care Planning',
        description: 'Create and manage comprehensive care plans that can be shared across the care team.',
        icon: <FileText className="h-6 w-6 text-primary" />,
        details: [
          'Collaborative care plan development',
          'Evidence-based care plan templates',
          'Progress tracking against care goals',
          'Care team communication and coordination'
        ]
      }
    ],
    'payer': [
      {
        title: 'Claims Dashboard',
        description: 'Track claims processing, payments, and related healthcare utilization metrics.',
        icon: <PanelRight className="h-6 w-6 text-primary" />,
        details: [
          'Real-time claims status tracking',
          'Payment reconciliation and reporting',
          'Utilization trends and analytics',
          'Provider performance metrics'
        ]
      },
      {
        title: 'Population Health Analytics',
        description: 'Analyze population health trends to inform care management and benefits design.',
        icon: <BarChart3 className="h-6 w-6 text-primary" />,
        details: [
          'Risk stratification tools',
          'Chronic condition prevalence and management metrics',
          'Preventive care utilization tracking',
          'Geographic and demographic health trend analysis'
        ]
      },
      {
        title: 'Care Gap Management',
        description: 'Identify and address care gaps across member populations to improve health outcomes and quality measures.',
        icon: <CheckCircle className="h-6 w-6 text-primary" />,
        details: [
          'HEDIS measure tracking and improvement',
          'Member outreach campaign management',
          'Provider care gap notifications',
          'Intervention tracking and effectiveness measurement'
        ]
      },
      {
        title: 'Provider Network Management',
        description: 'Evaluate provider performance and network adequacy for optimized healthcare delivery.',
        icon: <Building className="h-6 w-6 text-primary" />,
        details: [
          'Provider quality and cost metrics',
          'Network adequacy analysis',
          'Value-based care program management',
          'Provider communication and engagement tools'
        ]
      },
      {
        title: 'Member Engagement',
        description: 'Tools to improve member engagement with preventive care and health management programs.',
        icon: <Heart className="h-6 w-6 text-primary" />,
        details: [
          'Personalized member communication capabilities',
          'Health and wellness program management',
          'Incentive program tracking and administration',
          'Member portal integration options'
        ]
      }
    ],
    'employer': [
      {
        title: 'Wellness Program Dashboard',
        description: 'Manage employee wellness programs with comprehensive analytics and program tracking.',
        icon: <PanelRight className="h-6 w-6 text-primary" />,
        details: [
          'Program participation and engagement metrics',
          'Aggregated health trend analysis',
          'ROI and effectiveness measurement',
          'Program comparison and optimization tools'
        ]
      },
      {
        title: 'Health Analytics',
        description: 'Access de-identified, aggregated data on employee health trends to inform benefits strategy.',
        icon: <BarChart3 className="h-6 w-6 text-primary" />,
        details: [
          'Population health risk assessment',
          'Chronic condition prevalence tracking',
          'Healthcare utilization patterns',
          'Preventive care engagement metrics'
        ]
      },
      {
        title: 'Benefits Integration',
        description: 'Integrate with benefits administration systems for a cohesive employee health experience.',
        icon: <RefreshCw className="h-6 w-6 text-primary" />,
        details: [
          'Single sign-on with benefits platforms',
          'Health savings account integration',
          'Incentive program management',
          'Benefits utilization tracking'
        ]
      },
      {
        title: 'Wellness Resources',
        description: 'Provide employees with health education and wellness resources tailored to their needs.',
        icon: <BookOpen className="h-6 w-6 text-primary" />,
        details: [
          'Health education content library',
          'Customizable wellness challenges',
          'Mental health and well-being resources',
          'Preventive care recommendations'
        ]
      },
      {
        title: 'HIPAA-Compliant Administration',
        description: 'Manage wellness programs with strict privacy controls and HIPAA compliance.',
        icon: <ShieldCheck className="h-6 w-6 text-primary" />,
        details: [
          'Role-based access controls',
          'De-identified data analytics',
          'Secure communication channels',
          'Comprehensive audit trails'
        ]
      }
    ],
    'pharmacist': [
      {
        title: 'Medication Management Dashboard',
        description: 'Comprehensive view of patient medications with clinical context for improved pharmacy care.',
        icon: <PanelRight className="h-6 w-6 text-primary" />,
        details: [
          'Complete medication history across providers',
          'Drug interaction checking with clinical context',
          'Medication adherence tracking',
          'Therapeutic duplication identification'
        ]
      },
      {
        title: 'Clinical Context Access',
        description: 'View relevant clinical information to support medication therapy management.',
        icon: <FileText className="h-6 w-6 text-primary" />,
        details: [
          'Access to diagnoses and conditions',
          'Lab result trends related to medications',
          'Allergy and adverse reaction history',
          'Relevant vital signs and clinical metrics'
        ]
      },
      {
        title: 'Medication Therapy Management',
        description: 'Tools to support comprehensive medication reviews and therapy optimization.',
        icon: <Pill className="h-6 w-6 text-primary" />,
        details: [
          'Comprehensive medication review documentation',
          'Therapy problem identification tools',
          'Intervention tracking and documentation',
          'Follow-up scheduling and monitoring'
        ]
      },
      {
        title: 'Provider Collaboration',
        description: 'Communicate securely with other healthcare providers about medication-related concerns.',
        icon: <UserCog className="h-6 w-6 text-primary" />,
        details: [
          'Secure messaging with prescribers',
          'Intervention recommendation sharing',
          'Care team collaboration tools',
          'Documentation sharing capabilities'
        ]
      },
      {
        title: 'Patient Education',
        description: 'Access and share medication education resources to improve patient understanding and adherence.',
        icon: <BookOpen className="h-6 w-6 text-primary" />,
        details: [
          'Medication-specific education materials',
          'Customizable patient instructions',
          'Adherence support resources',
          'Multilingual education options'
        ]
      }
    ]
  };
  return features[role];
}

interface Step {
  title: string;
  description: string;
  image?: string;
  note?: string;
}

function getGettingStartedSteps(role: UserRole): Step[] {
  const steps: Record<UserRole, Step[]> = {
    'patient': [
      {
        title: 'Create Your Account',
        description: 'Sign up for Health Connect with a valid email address and create a secure password. Verify your email to activate your account.',
        image: 'Account creation screen'
      },
      {
        title: 'Complete Your Profile',
        description: 'Add your basic information including name, date of birth, and contact details. This information helps verify your identity when connecting to healthcare providers.',
        image: 'Profile completion form'
      },
      {
        title: 'Connect to Your Healthcare Providers',
        description: 'Navigate to the "Connections" tab and select your healthcare providers from our comprehensive directory. You\'ll be guided through a secure authentication process for each provider.',
        image: 'Provider connection interface',
        note: 'You\'ll need your patient portal credentials for each healthcare provider you want to connect.'
      },
      {
        title: 'Review Your Health Dashboard',
        description: 'Once connected, your health information will be displayed on your personalized dashboard. Take time to review the different sections including conditions, medications, lab results, and care gaps.',
        image: 'Health dashboard overview'
      },
      {
        title: 'Set Up Notifications',
        description: 'Configure your notification preferences to stay informed about new records, upcoming appointments, medication refills, and identified care gaps.',
        image: 'Notification settings screen'
      }
    ],
    'family': [
      {
        title: 'Create Your Account',
        description: 'Sign up for Health Connect with a valid email address and create a secure password. Verify your email to activate your account.',
        image: 'Account creation screen'
      },
      {
        title: 'Complete Your Profile',
        description: 'Add your basic information including name, date of birth, and contact details.',
        image: 'Profile completion form'
      },
      {
        title: 'Request Caregiver Access',
        description: 'Navigate to the "Caregiver Access" section and follow the steps to request access to your loved one\'s health information. This will require verification of your relationship and authorization from the patient (or legal documentation).',
        image: 'Caregiver access request form',
        note: 'Different levels of access are available depending on the needs and preferences of the patient.'
      },
      {
        title: 'Set Up the Caregiver Dashboard',
        description: 'Once authorized, customize your caregiver dashboard to focus on the most important aspects of care for your loved one, such as medications, appointments, and care plan tasks.',
        image: 'Caregiver dashboard customization'
      },
      {
        title: 'Connect Additional Providers',
        description: 'If needed, help connect additional healthcare providers to ensure a complete health record for the person you\'re caring for.',
        image: 'Provider connection interface',
        note: 'You may need the patient\'s portal credentials or their assistance during this process, depending on your access level.'
      }
    ],
    'provider': [
      {
        title: 'Request Organizational Access',
        description: 'Contact Health Connect\'s provider services team to set up organizational access for your practice or health system.',
        note: 'You\'ll need to provide information about your organization, EHR system, and complete a business associate agreement.'
      },
      {
        title: 'Complete Administrator Setup',
        description: 'Designated administrators will receive instructions to set up the initial account and configure system settings for your organization.',
        image: 'Administrator setup screen'
      },
      {
        title: 'Configure EHR Integration',
        description: 'Work with our technical team to establish SMART on FHIR integration with your existing EHR system.',
        image: 'Integration configuration screen',
        note: 'Our team will work directly with your IT department to ensure a smooth integration.'
      },
      {
        title: 'Set Up User Accounts',
        description: 'Create accounts for clinical staff with appropriate role-based permissions based on their job functions and data access needs.',
        image: 'User management interface'
      },
      {
        title: 'Complete Training',
        description: 'Schedule and complete training sessions for clinical staff to ensure effective use of the platform within existing workflows.',
        image: 'Training module selection screen'
      }
    ],
    'payer': [
      {
        title: 'Establish Organizational Contract',
        description: 'Contact Health Connect\'s payer services team to establish a contract and service agreement for your organization.',
        note: 'You\'ll need to provide information about your organization, covered member population, and complete necessary data sharing agreements.'
      },
      {
        title: 'Complete Technical Integration',
        description: 'Work with our integration team to establish connections with your claims, membership, and care management systems.',
        image: 'Integration workflow diagram'
      },
      {
        title: 'Configure Analytics Dashboard',
        description: 'Set up your organizational analytics dashboard to focus on key metrics relevant to your population health and quality improvement initiatives.',
        image: 'Analytics configuration screen'
      },
      {
        title: 'Set Up User Roles and Permissions',
        description: 'Create accounts for staff with appropriate role-based permissions for different functions (care management, quality improvement, network management, etc.).',
        image: 'User role configuration'
      },
      {
        title: 'Implement Member Communication Strategy',
        description: 'Work with our team to develop a communication strategy to inform members about the availability of Health Connect and its benefits.',
        image: 'Member communication templates'
      }
    ],
    'employer': [
      {
        title: 'Establish Organizational Contract',
        description: 'Contact Health Connect\'s employer services team to set up a contract and service agreement tailored to your employee wellness needs.',
        note: 'We\'ll work with you to ensure HIPAA compliance and appropriate data privacy protections.'
      },
      {
        title: 'Configure Wellness Program Integration',
        description: 'Work with our team to integrate Health Connect with your existing wellness programs and benefits administration systems.',
        image: 'Integration configuration screen'
      },
      {
        title: 'Set Up Administrative Access',
        description: 'Create administrator accounts with appropriate permissions to manage your wellness programs while maintaining employee privacy.',
        image: 'Administrator setup screen'
      },
      {
        title: 'Customize Employee Resources',
        description: 'Select and customize health resources and education materials relevant to your employee population.',
        image: 'Resource customization interface'
      },
      {
        title: 'Develop Employee Onboarding Plan',
        description: 'Work with our team to create a communication and onboarding plan to introduce Health Connect to your employees.',
        image: 'Onboarding plan template',
        note: 'We provide communication templates, training materials, and launch support to ensure successful adoption.'
      }
    ],
    'pharmacist': [
      {
        title: 'Request Professional Access',
        description: 'Register for a professional pharmacist account with your NPI number and professional credentials.',
        image: 'Professional registration form'
      },
      {
        title: 'Complete Identity Verification',
        description: 'Complete the identity verification process to ensure only authorized healthcare professionals can access patient information.',
        image: 'Identity verification screen'
      },
      {
        title: 'Connect Your Pharmacy System',
        description: 'If applicable, work with our integration team to connect Health Connect with your pharmacy management system.',
        image: 'System integration options',
        note: 'We support integration with major pharmacy management systems for streamlined workflow.'
      },
      {
        title: 'Configure Your Clinical Dashboard',
        description: 'Customize your clinical dashboard to focus on medication-related information most relevant to your pharmacy practice.',
        image: 'Dashboard configuration screen'
      },
      {
        title: 'Complete Clinical Training',
        description: 'Access and complete training modules on using Health Connect for medication therapy management and clinical pharmacy services.',
        image: 'Training module selection',
        note: 'Continuing education credits may be available for completing certain training modules.'
      }
    ]
  };
  return steps[role];
}

interface FAQ {
  question: string;
  answer: string;
  additionalInfo?: string;
}

function getFAQs(role: UserRole): FAQ[] {
  const faqs: Record<UserRole, FAQ[]> = {
    'patient': [
      {
        question: 'How secure is my health information in Health Connect?',
        answer: 'Health Connect employs multiple layers of security including encryption, secure authentication, and strict access controls to protect your health information. We comply with all HIPAA requirements and industry best practices for healthcare data security.',
        additionalInfo: 'We undergo regular security audits and continuously update our security measures to address emerging threats.'
      },
      {
        question: 'Which healthcare providers can I connect to through Health Connect?',
        answer: 'Health Connect supports integration with thousands of healthcare providers across the country, including major health systems, hospitals, clinics, and specialty practices that use FHIR-compatible electronic health record systems.',
        additionalInfo: 'Our directory includes providers using Epic, Cerner, Allscripts, Meditech, and other major EHR systems.'
      },
      {
        question: 'Is there a cost to use Health Connect as a patient?',
        answer: 'Health Connect offers both free and premium subscription options for patients. The free version provides basic health record access and organization, while premium subscriptions offer advanced features like care gap analysis, unlimited provider connections, and enhanced health analytics.',
      },
      {
        question: 'How do I connect my existing health records to Health Connect?',
        answer: 'Navigate to the "Connections" tab in your dashboard, search for your healthcare provider, and follow the secure authentication process. You\'ll typically need to log in using your existing patient portal credentials for that provider.',
      },
      {
        question: 'What should I do if I notice incorrect information in my health records?',
        answer: 'Health Connect displays information directly from your healthcare providers\' systems. If you notice an error, you should contact the original healthcare provider to request a correction. Once they update their records, the corrected information will flow into Health Connect.',
      }
    ],
    'family': [
      {
        question: 'How do I get access to a family member\'s health information?',
        answer: 'There are several ways to gain caregiver access, depending on your relationship with the patient and their ability to provide consent. Adult patients can grant you access through their account. For children or adults who cannot provide consent, you\'ll need to provide documentation of legal guardianship or healthcare proxy status.',
      },
      {
        question: 'What level of access can I have as a caregiver?',
        answer: 'Health Connect offers different levels of caregiver access, from view-only access to full management capabilities. The patient or legal documentation determines the appropriate level of access.',
        additionalInfo: 'Even with full access, certain sensitive information may still be restricted based on privacy regulations.'
      },
      {
        question: 'Can I manage multiple family members\' health information in one account?',
        answer: 'Yes, the caregiver dashboard is designed to help you manage health information for multiple family members. You can easily switch between different family members\' records and see a combined view of appointments and care tasks.',
      },
      {
        question: 'How can I communicate with healthcare providers on behalf of my family member?',
        answer: 'With appropriate access permissions, you can use the secure messaging features to communicate with healthcare providers on behalf of your family member. The system clearly identifies messages sent by caregivers to maintain transparency.',
      },
      {
        question: 'What happens to my access if my caregiving role changes?',
        answer: 'Access permissions can be updated if your caregiving role changes. The patient can modify your access level at any time if they have capacity. For legal guardianship or healthcare proxy situations, updated documentation would need to be provided.',
      }
    ],
    'provider': [
      {
        question: 'How does Health Connect integrate with our existing EHR system?',
        answer: 'Health Connect uses SMART on FHIR protocols to integrate with major EHR systems. This allows for seamless data exchange without duplicating data entry. The integration can be configured to launch Health Connect within your existing EHR workflow.',
        additionalInfo: 'We have established integrations with Epic, Cerner, Allscripts, Meditech, NextGen, and other major EHR systems.'
      },
      {
        question: 'What kind of technical support is available during implementation?',
        answer: 'We provide comprehensive technical support during implementation, including a dedicated integration specialist, IT support team, and clinical informatics experts to ensure a smooth integration with minimal disruption to your clinical workflows.',
      },
      {
        question: 'How does Health Connect help with quality measures and reporting?',
        answer: 'Health Connect includes analytics tools designed to track quality measures, identify care gaps, and generate reports for quality improvement initiatives and regulatory reporting requirements.',
        additionalInfo: 'The platform supports HEDIS, MIPS, and other common quality measurement frameworks.'
      },
      {
        question: 'What training is available for our clinical staff?',
        answer: 'We offer a variety of training options including in-person sessions, live webinars, on-demand video tutorials, and comprehensive documentation. Training can be customized based on different staff roles and responsibilities.',
      },
      {
        question: 'How does Health Connect handle patient consent for data sharing?',
        answer: 'Health Connect implements a comprehensive consent management system that allows patients to control which providers can access their information. The platform maintains detailed audit trails of all data access and sharing activities.',
      }
    ],
    'payer': [
      {
        question: 'How can Health Connect help improve our quality measures?',
        answer: 'Health Connect provides analytics to identify care gaps based on quality measure specifications, facilitates member outreach for needed services, and tracks improvement over time. The platform can help prioritize interventions based on potential impact and feasibility.',
      },
      {
        question: 'What kind of data interfaces are supported for integration with our systems?',
        answer: 'Health Connect supports various data interfaces including FHIR, HL7, secure file transfers, and API-based integrations. Our technical team works with your IT department to determine the most appropriate integration approach based on your existing systems.',
      },
      {
        question: 'How is member privacy protected when using Health Connect?',
        answer: 'Health Connect implements strict data access controls, encryption, and audit logging to protect member privacy. The platform is designed to comply with HIPAA regulations and other applicable privacy laws governing health information.',
        additionalInfo: 'Members always maintain control over who can access their health information.'
      },
      {
        question: 'Can Health Connect support our value-based care initiatives?',
        answer: 'Yes, Health Connect includes analytics and reporting tools specifically designed to support value-based care programs. The platform can track quality metrics, utilization patterns, and outcome measures relevant to value-based contracts.',
      },
      {
        question: 'How does Health Connect support care management programs?',
        answer: 'Health Connect provides care managers with a comprehensive view of member health information, identifies members who may benefit from care management based on risk factors, and offers tools to track interventions and monitor outcomes.',
      }
    ],
    'employer': [
      {
        question: 'How does Health Connect maintain employee privacy while providing useful analytics?',
        answer: 'Health Connect provides employers with only aggregated, de-identified data about employee health trends. Individual health information is never shared with employers. All analytics are presented at a population level with privacy thresholds to prevent identification of individuals.',
      },
      {
        question: 'How can we integrate Health Connect with our existing wellness programs?',
        answer: 'Health Connect offers several integration options for existing wellness platforms and benefits administration systems. Our implementation team works with your wellness program vendors to establish appropriate data sharing while maintaining privacy protections.',
      },
      {
        question: 'What types of analytics are available to employers?',
        answer: 'Employers receive anonymized, aggregated analytics on health trends such as preventive care utilization, chronic condition prevalence, wellness program engagement, and healthcare utilization patterns. These insights can help guide benefits strategy and wellness program design.',
        additionalInfo: 'All analytics comply with privacy regulations including HIPAA.'
      },
      {
        question: 'How do employees sign up for and access Health Connect?',
        answer: 'We provide a streamlined enrollment process for employees, typically integrated with your benefits enrollment system. Employees can access Health Connect through a dedicated web portal or mobile app using secure authentication.',
      },
      {
        question: 'Can Health Connect demonstrate ROI for our wellness investments?',
        answer: 'Health Connect includes analytics tools designed to measure the impact of wellness programs on health outcomes, healthcare utilization, and engagement. These metrics can help demonstrate the value and ROI of your wellness investments.',
      }
    ],
    'pharmacist': [
      {
        question: 'What patient information can I access as a pharmacist?',
        answer: 'With appropriate authorization, you can access medication history across providers, relevant diagnoses and conditions, lab results related to medication therapy, allergy information, vital signs, and other clinical data needed for comprehensive medication management.',
      },
      {
        question: 'How do patients authorize me to access their health information?',
        answer: 'Patients can authorize pharmacy access through their Health Connect account, or you can initiate an authorization request. The system implements appropriate consent management to ensure patient privacy is protected.',
        additionalInfo: 'Different levels of access can be granted depending on the patient\'s preferences and clinical needs.'
      },
      {
        question: 'Can Health Connect integrate with my pharmacy management system?',
        answer: 'Yes, Health Connect supports integration with major pharmacy management systems to streamline workflow and reduce duplicate data entry. Our technical team can work with your pharmacy to establish the appropriate integration.',
      },
      {
        question: 'How can I document medication therapy management services in Health Connect?',
        answer: 'Health Connect includes documentation tools specifically designed for medication therapy management services, including comprehensive medication reviews, care plans, interventions, and follow-up monitoring.',
      },
      {
        question: 'How does Health Connect support communication with other healthcare providers?',
        answer: 'The platform includes secure messaging tools to facilitate communication with physicians and other healthcare providers about medication-related concerns. You can share intervention recommendations and receive notifications when other providers respond.',
      }
    ]
  };
  return faqs[role];
}

export default function Tutorial() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">Health Connect Tutorial</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Learn how to use Health Connect to manage your health information securely and efficiently
          </p>
        </div>
        
        <Separator className="my-8" />
        
        {!selectedRole ? (
          <RoleSelector 
            selectedRole={selectedRole} 
            onRoleChange={setSelectedRole}
          />
        ) : (
          <>
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={() => setSelectedRole(null)}
                className="mb-4"
              >
                ← Change Role
              </Button>
              
              <RoleBasedContent role={selectedRole} />
            </div>
            
            <div className="mt-12 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-4">Need Additional Help?</h3>
              <p className="mb-4">
                If you need more assistance or have questions not covered in this tutorial, 
                we're here to help.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button variant="outline">
                  Contact Support
                </Button>
                <Button variant="outline">
                  Video Tutorials
                </Button>
                <Button variant="outline">
                  User Documentation
                </Button>
                <RouterLink href="/about">
                  <Button variant="outline">
                    About Health Connect
                  </Button>
                </RouterLink>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}