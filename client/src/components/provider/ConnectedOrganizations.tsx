import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Link2,
  Share2,
  CheckCircle,
  Clock,
  CalendarCheck,
  Users
} from 'lucide-react';
import type { Organization, Location } from '@shared/schema';

export function ConnectedOrganizations() {
  // Fetch organizations and locations
  const { data: organizations, isLoading: isLoadingOrganizations } = useQuery<Organization[]>({
    queryKey: ['/api/fhir/organization'],
  });

  const { data: locations, isLoading: isLoadingLocations } = useQuery<Location[]>({
    queryKey: ['/api/fhir/location'],
  });

  // Loading state
  if (isLoadingOrganizations || isLoadingLocations) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">Loading your connected organizations...</p>
      </div>
    );
  }

  // Combine organizations with their locations
  const organizationsWithLocations = organizations?.map(organization => {
    const orgLocations = locations?.filter(location => 
      location.managingOrganization?.reference?.includes(organization.id || '')
    );
    
    return {
      ...organization,
      locations: orgLocations
    };
  });

  // No organizations connected yet
  if (!organizations?.length) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Connected Healthcare Organizations</CardTitle>
            <CardDescription>
              View and manage your connected healthcare systems
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Connected Organizations</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              You haven't connected to any healthcare organizations yet. Connect with hospitals, clinics, and health systems to view your complete medical records.
            </p>
            <Button className="mx-auto">
              Connect Healthcare System
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
          <CardTitle className="text-2xl">Connected Healthcare Organizations</CardTitle>
          <CardDescription>
            Hospitals, clinics, and health systems connected to your records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {organizationsWithLocations?.map(organization => (
              <Card key={organization.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Organization info */}
                      <div className="flex-1">
                        <div className="flex items-start">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                            <Building className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium">{organization.name}</h3>
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                Active
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-500 mt-1">
                              {organization.type?.[0]?.text || 'Healthcare Organization'}
                            </div>
                            
                            <div className="mt-3 space-y-2">
                              {organization.telecom?.map((telecom, i) => (
                                <div key={i} className="flex items-center text-sm">
                                  {telecom.system === 'phone' ? (
                                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                                  ) : telecom.system === 'email' ? (
                                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                                  ) : null}
                                  <span>{telecom.value}</span>
                                </div>
                              ))}
                              
                              {organization.address?.[0] && (
                                <div className="flex items-center text-sm">
                                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                                  <span>
                                    {organization.address[0].line?.[0]}, {organization.address[0].city}, {organization.address[0].state} {organization.address[0].postalCode}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <h4 className="font-medium text-sm mb-3">Connected Locations</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {organization.locations?.map((location, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-md">
                                <div className="font-medium text-sm">{location.name}</div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {location.address?.line?.[0]}, {location.address?.city}
                                </div>
                                {location.telecom?.[0]?.value && (
                                  <div className="mt-1 flex items-center text-xs text-gray-500">
                                    <Phone className="h-3 w-3 mr-1" />
                                    <span>{location.telecom[0].value}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {(!organization.locations || organization.locations.length === 0) && (
                              <div className="text-sm text-gray-500">No locations found</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Connection details */}
                      <div className="md:w-64 bg-gray-50 p-4 rounded-md flex flex-col">
                        <h4 className="font-medium text-sm mb-3">Connection Details</h4>
                        
                        <div className="flex items-center mb-3">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">Connected since Jan 2025</span>
                        </div>
                        
                        <div className="flex items-center mb-3">
                          <CalendarCheck className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm">Last updated: Mar 15, 2025</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm">3 providers linked</span>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="mt-auto space-y-2">
                          <Button variant="outline" className="w-full flex items-center justify-center" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            <span>View Records</span>
                          </Button>
                          <Button variant="outline" className="w-full flex items-center justify-center" size="sm">
                            <Link2 className="h-4 w-4 mr-2" />
                            <span>Patient Portal</span>
                          </Button>
                          <Button className="w-full flex items-center justify-center" size="sm">
                            <Share2 className="h-4 w-4 mr-2" />
                            <span>Share Records</span>
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