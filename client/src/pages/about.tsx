import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BookOpenText, Heart, HelpCircle, Shield, BadgeCheck, History, Lightbulb } from 'lucide-react';

export default function About() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">About Health Connect</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            An advanced healthcare platform that securely connects your health records and 
            provides comprehensive medical data management with clinical insights.
          </p>
        </div>
        
        <Tabs defaultValue="overview">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="mission" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Our Mission
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security & Privacy
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                Our Team
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>What is Health Connect?</CardTitle>
                <CardDescription>
                  A comprehensive healthcare records platform
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpenText className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium">Unified Health Records</h3>
                    </div>
                    <p className="text-muted-foreground ml-15">
                      Access all your health records from different providers in one secure location, 
                      giving you a complete picture of your health history.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <HelpCircle className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium">Healthcare Insights</h3>
                    </div>
                    <p className="text-muted-foreground ml-15">
                      Get personalized insights and recommendations based on your health data, 
                      helping you make informed decisions about your care.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium">SMART on FHIR Integration</h3>
                    </div>
                    <p className="text-muted-foreground ml-15">
                      Built on healthcare industry standards (SMART on FHIR) to securely connect 
                      with hospitals, clinics, and health systems across the country.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <BadgeCheck className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium">Care Gap Management</h3>
                    </div>
                    <p className="text-muted-foreground ml-15">
                      Identify and address potential gaps in care to ensure you're 
                      receiving all recommended preventive services and treatments.
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-xl font-medium mb-4">Our Technology</h3>
                  <p className="mb-4">
                    Health Connect leverages cutting-edge technologies and healthcare standards to provide 
                    a seamless, secure experience:
                  </p>
                  
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <span className="font-medium">FHIR Standard Compliance:</span> Utilizes the Fast Healthcare 
                      Interoperability Resources (FHIR) standard for exchanging healthcare information electronically.
                    </li>
                    <li>
                      <span className="font-medium">SMART on FHIR Protocol:</span> Implements the SMART on FHIR 
                      protocol for secure authorization and authentication with healthcare systems.
                    </li>
                    <li>
                      <span className="font-medium">Advanced Data Visualization:</span> Features interactive charts 
                      and graphs to help you understand your health data at a glance.
                    </li>
                    <li>
                      <span className="font-medium">Health Analytics:</span> Applies data analysis to identify 
                      trends and potential health concerns based on your medical history.
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mission">
            <Card>
              <CardHeader>
                <CardTitle>Our Mission</CardTitle>
                <CardDescription>
                  Empowering individuals through accessible health information
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="border-l-4 border-primary pl-6 py-2 italic text-lg">
                  "To transform healthcare by connecting patients with their health data, 
                  enabling better decisions and improving outcomes through accessible, 
                  personalized health information."
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-medium flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Core Values
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Patient Empowerment</h4>
                      <p className="text-muted-foreground">
                        We believe that access to complete health information empowers individuals 
                        to take control of their healthcare journey and make informed decisions.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Data Security</h4>
                      <p className="text-muted-foreground">
                        We are committed to maintaining the highest standards of security and privacy 
                        for sensitive health information.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Innovation</h4>
                      <p className="text-muted-foreground">
                        We continuously explore new technologies and approaches to improve 
                        the healthcare experience for all stakeholders.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Health Equity</h4>
                      <p className="text-muted-foreground">
                        We strive to make health information accessible to everyone, 
                        regardless of background, location, or technological expertise.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-xl font-medium flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Our Story
                  </h3>
                  
                  <p>
                    Health Connect was founded by healthcare professionals and technology experts who
                    recognized the challenges patients face in accessing and understanding their health information.
                    Our team experienced firsthand the fragmentation of healthcare data across different systems,
                    making it difficult for patients to have a complete view of their health history.
                  </p>
                  
                  <p>
                    Inspired by the potential of emerging healthcare interoperability standards like FHIR,
                    we set out to build a platform that could securely connect to various healthcare systems
                    and present information in a way that's meaningful to patients, families, and caregivers.
                  </p>
                  
                  <p>
                    Today, Health Connect is helping thousands of users access their health information,
                    identify care gaps, and make more informed health decisions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security & Privacy</CardTitle>
                <CardDescription>
                  How we protect your sensitive health information
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                    <p className="text-amber-800">
                      Your health data is sensitive and personal. We employ multiple layers of security
                      and adhere to stringent privacy standards to ensure your information remains
                      private and protected.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-medium">Data Protection</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Encryption</h4>
                      <p className="text-muted-foreground">
                        All data is encrypted both in transit and at rest using industry-standard
                        encryption protocols to protect your information from unauthorized access.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Authentication</h4>
                      <p className="text-muted-foreground">
                        Multi-factor authentication options to verify your identity and
                        prevent unauthorized access to your account.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Authorization</h4>
                      <p className="text-muted-foreground">
                        SMART on FHIR protocol ensures you explicitly authorize access to your
                        health information from each provider.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Regular Audits</h4>
                      <p className="text-muted-foreground">
                        Our systems undergo regular security audits and assessments to
                        identify and address potential vulnerabilities.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-xl font-medium">Privacy Commitments</h3>
                  
                  <ul className="list-disc pl-6 space-y-3">
                    <li>
                      <span className="font-medium">HIPAA Compliance:</span> Our platform is designed to comply
                      with the Health Insurance Portability and Accountability Act (HIPAA) requirements.
                    </li>
                    <li>
                      <span className="font-medium">No Data Selling:</span> We never sell your personal
                      health information to third parties for marketing or advertising.
                    </li>
                    <li>
                      <span className="font-medium">Transparency:</span> We provide clear information about
                      how your data is used and secured throughout our platform.
                    </li>
                    <li>
                      <span className="font-medium">User Control:</span> You maintain control over your data,
                      including the ability to revoke access to connected providers.
                    </li>
                    <li>
                      <span className="font-medium">Minimal Data Collection:</span> We only collect the
                      information necessary to provide our services.
                    </li>
                  </ul>
                  
                  <div className="mt-6">
                    <p className="font-medium">For more information, please review our:</p>
                    <div className="flex gap-4 mt-2">
                      <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                      <a href="#" className="text-primary hover:underline">Terms of Service</a>
                      <a href="#" className="text-primary hover:underline">Security Practices</a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Our Team</CardTitle>
                <CardDescription>
                  Meet the people behind Health Connect
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-8">
                <div className="text-center max-w-2xl mx-auto">
                  <p>
                    Our team brings together experts from healthcare, technology, and patient advocacy
                    to create a platform that truly serves the needs of patients and healthcare providers alike.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="border rounded-lg p-6 text-center">
                    <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-xl font-semibold">JS</span>
                    </div>
                    <h4 className="font-semibold text-lg">Dr. Jennifer Smith</h4>
                    <p className="text-primary">Chief Medical Officer</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Board-certified physician with 15+ years of experience in internal medicine and
                      healthcare informatics.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-6 text-center">
                    <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-xl font-semibold">DP</span>
                    </div>
                    <h4 className="font-semibold text-lg">David Park</h4>
                    <p className="text-primary">Chief Technology Officer</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Former senior engineer at major health tech companies with expertise in
                      FHIR implementation and healthcare interoperability.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-6 text-center">
                    <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-xl font-semibold">MR</span>
                    </div>
                    <h4 className="font-semibold text-lg">Maria Rodriguez</h4>
                    <p className="text-primary">Head of User Experience</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Specialist in healthcare UX design with a background in patient advocacy
                      and medical information design.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-6 text-center">
                    <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-xl font-semibold">JC</span>
                    </div>
                    <h4 className="font-semibold text-lg">James Chen</h4>
                    <p className="text-primary">Security & Compliance Officer</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Expert in healthcare data security and HIPAA compliance with 12+ years
                      of experience in healthcare IT security.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-6 text-center">
                    <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-xl font-semibold">SJ</span>
                    </div>
                    <h4 className="font-semibold text-lg">Sarah Johnson</h4>
                    <p className="text-primary">Director of Patient Engagement</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Former healthcare administrator focused on improving the patient experience
                      and promoting health literacy.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-6 text-center">
                    <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-xl font-semibold">RB</span>
                    </div>
                    <h4 className="font-semibold text-lg">Robert Brown</h4>
                    <p className="text-primary">Data Science Lead</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      PhD in biostatistics with expertise in healthcare analytics and
                      developing insightful data visualizations from complex medical data.
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-medium mb-4">Advisory Board</h3>
                  <p className="max-w-2xl mx-auto">
                    Our platform is guided by an advisory board of healthcare providers, patient advocates,
                    healthcare administrators, and technology experts who ensure we're addressing the
                    real needs of the healthcare ecosystem.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}