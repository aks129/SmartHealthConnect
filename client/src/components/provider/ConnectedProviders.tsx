import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock,
  FileText,
  Star,
  CheckCircle,
  Building,
  Calendar as CalendarIcon
} from 'lucide-react';
import type { Practitioner, PractitionerRole, Organization } from '@shared/schema';

export function ConnectedProviders() {
  // Fetch practitioners, roles, and organizations
  const { data: practitioners, isLoading: isLoadingPractitioners } = useQuery<Practitioner[]>({
    queryKey: ['/api/fhir/practitioner'],
  });

  const { data: practitionerRoles, isLoading: isLoadingRoles } = useQuery<PractitionerRole[]>({
    queryKey: ['/api/fhir/practitionerrole'],
  });

  const { data: organizations, isLoading: isLoadingOrganizations } = useQuery<Organization[]>({
    queryKey: ['/api/fhir/organization'],
  });

  // Loading state
  if (isLoadingPractitioners || isLoadingRoles || isLoadingOrganizations) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">Loading your connected healthcare providers...</p>
      </div>
    );
  }

  // Combine practitioners with their roles and organizations
  const practitionersWithDetails = practitioners?.map(practitioner => {
    // Find roles for this practitioner
    const roles = practitionerRoles?.filter(role => 
      role.practitioner?.reference?.includes(practitioner.id || '')
    );
    
    // Find organizations for this practitioner
    const practitionerOrganizations = organizations?.filter(org => 
      roles?.some(role => role.organization?.reference?.includes(org.id || ''))
    );
    
    return {
      ...practitioner,
      roles,
      organizations: practitionerOrganizations
    };
  });

  // No practitioners connected yet
  if (!practitioners?.length) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Connected Healthcare Providers</CardTitle>
            <CardDescription>
              View and manage your care team and healthcare providers
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Connected Providers</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              You haven't connected to any healthcare providers yet. Connect with doctors, specialists, and other healthcare professionals to coordinate your care.
            </p>
            <Button className="mx-auto">
              Find Providers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Connected Healthcare Providers</CardTitle>
          <CardDescription>
            Your care team and healthcare providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {practitionersWithDetails?.map(provider => (
              <Card key={provider.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Provider info */}
                      <div className="flex-1">
                        <div className="flex items-start">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium">
                                {provider.name?.[0]?.prefix?.[0] || ''} {provider.name?.[0]?.given?.[0] || ''} {provider.name?.[0]?.family || ''}
                              </h3>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                                Primary Care
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-500 mt-1">
                              {provider.roles?.[0]?.specialty?.[0]?.text || 'Healthcare Provider'}
                            </div>
                            
                            <div className="mt-3 space-y-2">
                              {provider.telecom?.map((telecom, i) => (
                                <div key={i} className="flex items-center text-sm">
                                  {telecom.system === 'phone' ? (
                                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                                  ) : telecom.system === 'email' ? (
                                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                                  ) : null}
                                  <span>{telecom.value}</span>
                                </div>
                              ))}
                              
                              {provider.address?.[0] && (
                                <div className="flex items-center text-sm">
                                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                                  <span>
                                    {provider.address[0].line?.[0]}, {provider.address[0].city}, {provider.address[0].state} {provider.address[0].postalCode}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Organizations section */}
                        {provider.organizations && provider.organizations.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Affiliated Organizations</h4>
                            <div className="space-y-2">
                              {provider.organizations.map((org, index) => (
                                <div key={index} className="flex items-center text-sm bg-gray-50 p-2 rounded-md">
                                  <Building className="h-4 w-4 mr-2 text-gray-500" />
                                  <span>{org.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Action sidebar */}
                      <div className="md:w-48 bg-gray-50 p-4 rounded-md flex flex-col">
                        <div>
                          <div className="text-sm font-medium mb-3">Next Appointment</div>
                          <div className="flex items-center mb-2 text-sm">
                            <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                            <span>March 25, 2025</span>
                          </div>
                          <div className="flex items-center mb-4 text-sm">
                            <Clock className="h-4 w-4 mr-2 text-primary" />
                            <span>10:30 AM</span>
                          </div>
                        </div>
                        
                        <div className="my-4 flex items-center">
                          <div className="text-xs text-gray-500 mr-2">Provider Rating</div>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center mb-3">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">In-network provider</span>
                        </div>
                        
                        <div className="mt-auto pt-4 space-y-2 border-t border-gray-200">
                          <Button variant="outline" className="w-full flex items-center justify-center" size="sm">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Schedule</span>
                          </Button>
                          <Button variant="outline" className="w-full flex items-center justify-center" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            <span>View Records</span>
                          </Button>
                          <Button className="w-full flex items-center justify-center" size="sm">
                            <Mail className="h-4 w-4 mr-2" />
                            <span>Message</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}