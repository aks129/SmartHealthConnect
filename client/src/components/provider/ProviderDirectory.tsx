import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  MapPin, 
  User, 
  Building, 
  Phone, 
  Mail, 
  Clock, 
  Calendar, 
  DollarSign,
  Filter,
  Star
} from 'lucide-react';
import Rating from 'react-rating';
import type { Practitioner, Organization, Location, PractitionerRole } from '@shared/schema';

// Google Maps container styles
const containerStyle = {
  width: '100%',
  height: '400px'
};

// Default center position (Boston)
const defaultCenter = {
  lat: 42.3601,
  lng: -71.0589
};

type LocationWithDetails = Location & {
  organization?: Organization;
  practitioners?: Practitioner[];
  rating?: number;
  reviewCount?: number;
  cost?: number;
};

export function ProviderDirectory() {
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationWithDetails | null>(null);
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [viewType, setViewType] = useState<'map' | 'list'>('map');
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Fetch locations, organizations, and practitioners
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/fhir/location'],
  });

  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ['/api/fhir/organization'],
  });

  const { data: practitioners } = useQuery<Practitioner[]>({
    queryKey: ['/api/fhir/practitioner'],
  });
  
  const { data: practitionerRoles } = useQuery<PractitionerRole[]>({
    queryKey: ['/api/fhir/practitionerrole'],
  });

  // Combined locations with details
  const locationsWithDetails: LocationWithDetails[] = locations?.map(location => {
    // Find the managing organization
    const orgReference = location.managingOrganization?.reference?.split('/')[1];
    const organization = organizations?.find(org => org.id === orgReference);
    
    // Find practitioners at this location
    const roles = practitionerRoles?.filter(role => 
      role.location?.some(loc => loc.reference?.includes(location.id || ''))
    );
    
    const pracIds = roles?.map(role => role.practitioner?.reference?.split('/')[1]);
    const locationPractitioners = practitioners?.filter(p => pracIds?.includes(p.id));
    
    // Add mock rating and cost data
    const rating = Math.floor(Math.random() * 5) + 1;
    const reviewCount = Math.floor(Math.random() * 100) + 5;
    const cost = Math.floor(Math.random() * 3) + 1; // 1-3 dollar signs
    
    return {
      ...location,
      organization,
      practitioners: locationPractitioners,
      rating,
      reviewCount,
      cost
    };
  }) || [];

  // Filter locations based on search term and specialty
  const filteredLocations = locationsWithDetails.filter(location => {
    const matchesSearch = !searchTerm || 
      location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.practitioners?.some(p => 
        p.name?.[0]?.text?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesSpecialty = !specialtyFilter || 
      practitionerRoles?.some(role => 
        role.location?.some(loc => loc.reference?.includes(location.id || '')) &&
        role.specialty?.some(s => 
          s.text?.toLowerCase().includes(specialtyFilter.toLowerCase()) ||
          s.coding?.some(c => c.display?.toLowerCase().includes(specialtyFilter.toLowerCase()))
        )
      );
    
    return matchesSearch && matchesSpecialty;
  });

  // Handle map marker click
  const handleMarkerClick = (location: LocationWithDetails) => {
    setSelectedLocation(location);
  };

  // Render cost indicators ($, $$, $$$)
  const renderCostIndicator = (cost: number) => {
    return Array(cost).fill('$').join('');
  };

  // Render star rating
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        <Rating
          initialRating={rating}
          readonly
          emptySymbol={<Star className="h-4 w-4 text-gray-300" />}
          fullSymbol={<Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
        />
        <span className="ml-2 text-sm text-gray-500">({rating})</span>
      </div>
    );
  };

  // Center map on user's location
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast({
            title: "Location updated",
            description: "Map centered on your current location",
          });
        },
        () => {
          toast({
            title: "Error",
            description: "Unable to get your location",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
    }
  };

  // For demo purposes, use a placeholder API key
  // In production, this would be stored in environment variables
  const googleMapsApiKey = "USE_YOUR_API_KEY_HERE";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Provider Directory</CardTitle>
          <CardDescription>
            Find healthcare providers, clinics, and hospitals in your area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search by name, specialty, or location..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-64">
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-full" id="specialty">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by specialty" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Specialties</SelectItem>
                  <SelectItem value="Cardiology">Cardiology</SelectItem>
                  <SelectItem value="Endocrinology">Endocrinology</SelectItem>
                  <SelectItem value="Family Medicine">Family Medicine</SelectItem>
                  <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" onClick={handleGetCurrentLocation} className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              <span>Near Me</span>
            </Button>
          </div>
          
          <Tabs defaultValue="map" onValueChange={(value) => setViewType(value as 'map' | 'list')}>
            <TabsList className="mb-6">
              <TabsTrigger value="map">Map View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="map">
              <div className="rounded-md overflow-hidden border">
                <LoadScript
                  googleMapsApiKey={googleMapsApiKey}
                  onLoad={() => setIsMapLoaded(true)}
                >
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={mapCenter}
                    zoom={12}
                  >
                    {isMapLoaded && filteredLocations.map((location) => (
                      <Marker
                        key={location.id}
                        position={{
                          lat: location.position?.latitude || defaultCenter.lat,
                          lng: location.position?.longitude || defaultCenter.lng
                        }}
                        onClick={() => handleMarkerClick(location)}
                      />
                    ))}
                    
                    {selectedLocation && (
                      <InfoWindow
                        position={{
                          lat: selectedLocation.position?.latitude || defaultCenter.lat,
                          lng: selectedLocation.position?.longitude || defaultCenter.lng
                        }}
                        onCloseClick={() => setSelectedLocation(null)}
                      >
                        <div className="p-2 max-w-xs">
                          <h3 className="font-medium text-sm">{selectedLocation.name}</h3>
                          <p className="text-sm text-gray-600">
                            {selectedLocation.organization?.name}
                          </p>
                          {selectedLocation.rating && (
                            <div className="my-1">
                              {renderRating(selectedLocation.rating)}
                            </div>
                          )}
                          {selectedLocation.cost && (
                            <div className="text-sm text-gray-600">
                              {renderCostIndicator(selectedLocation.cost)}
                            </div>
                          )}
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </LoadScript>
              </div>
              
              {/* Show list of results below map */}
              <div className="mt-6 space-y-4">
                <h3 className="font-medium text-lg">
                  {filteredLocations.length} results found
                </h3>
                
                {filteredLocations.slice(0, 3).map((location) => (
                  <Card key={location.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg">{location.name}</h3>
                            <p className="text-sm text-gray-600">
                              {location.organization?.name}
                            </p>
                            <div className="flex items-center mt-1 space-x-4">
                              {location.rating && (
                                <div>{renderRating(location.rating)}</div>
                              )}
                              {location.cost && (
                                <div className="text-sm font-medium text-gray-600">
                                  {renderCostIndicator(location.cost)}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Open
                          </Badge>
                        </div>
                        
                        <div className="mt-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="mr-2 h-4 w-4" />
                            <span>
                              {location.address?.line?.[0]}, {location.address?.city}, {location.address?.state} {location.address?.postalCode}
                            </span>
                          </div>
                          {location.telecom?.[0]?.value && (
                            <div className="flex items-center mt-1">
                              <Phone className="mr-2 h-4 w-4" />
                              <span>{location.telecom[0].value}</span>
                            </div>
                          )}
                        </div>
                        
                        {location.practitioners && location.practitioners.length > 0 && (
                          <div className="mt-3">
                            <h4 className="font-medium text-sm mb-2">Providers at this location:</h4>
                            <div className="space-y-2">
                              {location.practitioners.slice(0, 2).map(practitioner => (
                                <div key={practitioner.id} className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{practitioner.name?.[0]?.text}</p>
                                    <p className="text-xs text-gray-500">
                                      {practitionerRoles?.find(
                                        role => role.practitioner?.reference?.includes(practitioner.id || '')
                                      )?.specialty?.[0]?.text || 'Specialist'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {location.practitioners.length > 2 && (
                                <p className="text-xs text-primary mt-1">
                                  +{location.practitioners.length - 2} more providers
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 flex justify-end">
                          <Button>View Details</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredLocations.length > 3 && (
                  <div className="text-center mt-4">
                    <Button variant="outline">
                      Show More Results
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="list">
              <div className="space-y-4">
                {filteredLocations.map((location) => (
                  <Card key={location.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{location.name}</h3>
                          <p className="text-sm text-gray-600">
                            {location.organization?.name}
                          </p>
                          <div className="flex items-center mt-1 space-x-4">
                            {location.rating && (
                              <div>{renderRating(location.rating)}</div>
                            )}
                            {location.reviewCount && (
                              <div className="text-sm text-gray-500">
                                ({location.reviewCount} reviews)
                              </div>
                            )}
                            {location.cost && (
                              <div className="text-sm font-medium text-gray-600">
                                {renderCostIndicator(location.cost)}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Open
                        </Badge>
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4" />
                          <span>
                            {location.address?.line?.[0]}, {location.address?.city}, {location.address?.state} {location.address?.postalCode}
                          </span>
                        </div>
                        {location.telecom?.[0]?.value && (
                          <div className="flex items-center mt-1">
                            <Phone className="mr-2 h-4 w-4" />
                            <span>{location.telecom[0].value}</span>
                          </div>
                        )}
                      </div>
                      
                      {location.practitioners && location.practitioners.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-sm mb-2">Providers at this location:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {location.practitioners.map(practitioner => (
                              <div key={practitioner.id} className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                  <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{practitioner.name?.[0]?.text}</p>
                                  <p className="text-sm text-gray-500">
                                    {practitionerRoles?.find(
                                      role => role.practitioner?.reference?.includes(practitioner.id || '')
                                    )?.specialty?.[0]?.text || 'Specialist'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Separator className="my-4" />
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="mr-2 h-4 w-4" />
                          <span>Open 8:00 AM - 5:00 PM</span>
                        </div>
                        <Button>Book Appointment</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}