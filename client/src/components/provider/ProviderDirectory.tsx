import React, { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
// import Rating from 'react-rating'; // Removed as we're using custom stars instead
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  MapPin, 
  Search, 
  Phone, 
  Mail, 
  Building, 
  Calendar, 
  Star, 
  DollarSign, 
  Clock,
  Filter,
  User,
  Stethoscope,
  HeartPulse,
  Brain,
  Baby,
  PlusCircle
} from 'lucide-react';
import type { Practitioner, Organization, Location, PractitionerRole } from '@shared/schema';

type LocationWithDetails = Location & {
  organization?: Organization;
  practitioners?: Practitioner[];
  rating?: number;
  reviewCount?: number;
  cost?: number;
};

const containerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

export function ProviderDirectory() {
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [searchResults, setSearchResults] = useState<LocationWithDetails[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Fetch locations, organizations, practitioners, and roles
  const { data: locations, isLoading: isLoadingLocations } = useQuery<Location[]>({
    queryKey: ['/api/fhir/location'],
  });

  const { data: organizations, isLoading: isLoadingOrganizations } = useQuery<Organization[]>({
    queryKey: ['/api/fhir/organization'],
  });

  const { data: practitioners, isLoading: isLoadingPractitioners } = useQuery<Practitioner[]>({
    queryKey: ['/api/fhir/practitioner'],
  });

  const { data: practitionerRoles, isLoading: isLoadingRoles } = useQuery<PractitionerRole[]>({
    queryKey: ['/api/fhir/practitionerrole'],
  });

  // Loading state
  if (isLoadingLocations || isLoadingOrganizations || isLoadingPractitioners || isLoadingRoles) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">Loading provider directory...</p>
      </div>
    );
  }

  // Process and enhance locations with additional details
  const locationsWithDetails: LocationWithDetails[] = locations?.map(location => {
    // Find the organization that manages this location
    const organization = organizations?.find(org => 
      location.managingOrganization?.reference?.includes(org.id || '')
    );
    
    // Find practitioners at this location
    const locationPractitioners = practitioners?.filter(practitioner => {
      // Check if any of the practitioner's roles reference this location
      return practitionerRoles?.some(role => 
        role.practitioner?.reference?.includes(practitioner.id || '') &&
        role.location?.some(loc => loc.reference?.includes(location.id || ''))
      );
    });

    // Generate sample rating and cost data
    const randomRating = Math.floor(Math.random() * 5) + 1; // 1-5 stars
    const randomReviews = Math.floor(Math.random() * 100) + 1; // 1-100 reviews
    const randomCost = Math.floor(Math.random() * 3) + 1; // 1-3 dollar signs (cost level)

    return {
      ...location,
      organization,
      practitioners: locationPractitioners,
      rating: randomRating,
      reviewCount: randomReviews,
      cost: randomCost
    };
  }) || [];

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Handle location marker click
  const handleMarkerClick = (location: LocationWithDetails) => {
    setSelectedLocation(location);
    if (location.position?.latitude && location.position?.longitude) {
      // Ensure latitude and longitude are converted to numbers
      const lat = typeof location.position.latitude === 'string' 
        ? parseFloat(location.position.latitude) 
        : location.position.latitude;
      
      const lng = typeof location.position.longitude === 'string' 
        ? parseFloat(location.position.longitude) 
        : location.position.longitude;
      
      setMapCenter({ lat, lng });
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!searchQuery && specialty === 'all') {
      setSearchResults(locationsWithDetails);
      return;
    }

    const filtered = locationsWithDetails.filter(location => {
      const matchesQuery = !searchQuery || 
        location.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.practitioners?.some(p => 
          p.name?.[0]?.family?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.name?.[0]?.given?.[0]?.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesSpecialty = specialty === 'all' || 
        location.practitioners?.some(p => {
          const practitionerRolesForThisPractitioner = practitionerRoles?.filter(
            role => role.practitioner?.reference?.includes(p.id || '')
          );

          return practitionerRolesForThisPractitioner?.some(role => 
            role.specialty?.[0]?.text?.toLowerCase().includes(specialty.toLowerCase())
          );
        });

      return matchesQuery && matchesSpecialty;
    });

    setSearchResults(filtered);
  };

  // Process the cost level to dollar signs
  const getCostLevel = (level: number) => {
    return Array(level).fill('$').join('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Provider Directory</CardTitle>
          <CardDescription>
            Find doctors, specialists, and healthcare facilities near you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search for providers, locations, or specialties..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="md:w-64">
              <Tabs defaultValue="all" onValueChange={setSpecialty}>
                <TabsList className="grid grid-cols-5 h-10">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="cardiology" className="text-xs">
                    <HeartPulse className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Cardio</span>
                  </TabsTrigger>
                  <TabsTrigger value="neurology" className="text-xs">
                    <Brain className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Neuro</span>
                  </TabsTrigger>
                  <TabsTrigger value="pediatrics" className="text-xs">
                    <Baby className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Peds</span>
                  </TabsTrigger>
                  <TabsTrigger value="primary care" className="text-xs">
                    <Stethoscope className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Primary</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button onClick={handleSearch} className="md:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Map View */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}>
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={12}
                onLoad={onMapLoad}
              >
                {locationsWithDetails.map(location => {
                  if (!location.position?.latitude || !location.position?.longitude) return null;
                  
                  // Ensure coordinates are numbers
                  const lat = typeof location.position.latitude === 'string' 
                    ? parseFloat(location.position.latitude) 
                    : location.position.latitude;
                  
                  const lng = typeof location.position.longitude === 'string' 
                    ? parseFloat(location.position.longitude) 
                    : location.position.longitude;
                  
                  return (
                    <Marker
                      key={location.id}
                      position={{ lat, lng }}
                      onClick={() => handleMarkerClick(location)}
                    />
                  );
                })}
                
                {selectedLocation && selectedLocation.position?.latitude && selectedLocation.position?.longitude && (
                  <InfoWindow
                    position={{
                      lat: typeof selectedLocation.position.latitude === 'string' 
                        ? parseFloat(selectedLocation.position.latitude) 
                        : selectedLocation.position.latitude,
                      lng: typeof selectedLocation.position.longitude === 'string' 
                        ? parseFloat(selectedLocation.position.longitude) 
                        : selectedLocation.position.longitude
                    }}
                    onCloseClick={() => setSelectedLocation(null)}
                  >
                    <div className="p-2 max-w-xs">
                      <h3 className="font-medium text-sm">{selectedLocation.name}</h3>
                      <p className="text-xs text-gray-600">{selectedLocation.organization?.name}</p>
                      {selectedLocation.address && (
                        <p className="text-xs mt-1">
                          {selectedLocation.address.line?.[0]}, {selectedLocation.address.city}, {selectedLocation.address.state}
                        </p>
                      )}
                      <div className="flex items-center mt-1">
                        <div className="text-xs mr-2">
                          {Array(5).fill(0).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`inline-block h-3 w-3 ${i < (selectedLocation.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600">({selectedLocation.reviewCount} reviews)</span>
                      </div>
                      <div className="mt-1 text-xs">
                        Cost: <span className="font-medium">{getCostLevel(selectedLocation.cost || 1)}</span>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </LoadScript>
          </div>

          {/* Results List */}
          <div>
            <h3 className="text-lg font-medium mb-4">Healthcare Providers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(searchResults.length > 0 ? searchResults : locationsWithDetails).map(location => (
                <Card key={location.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div>
                      <div className="flex justify-between">
                        <h4 className="font-medium">{location.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getCostLevel(location.cost || 1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{location.organization?.name}</p>
                      
                      <div className="flex items-center mt-1 mb-2">
                        <div className="flex mr-2">
                          {Array(5).fill(0).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3 w-3 ${i < (location.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600">({location.reviewCount} reviews)</span>
                      </div>

                      {location.address && (
                        <div className="flex items-center text-xs text-gray-600 mb-1">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {location.address.line?.[0]}, {location.address.city}, {location.address.state}
                          </span>
                        </div>
                      )}

                      {location.telecom?.[0]?.value && (
                        <div className="flex items-center text-xs text-gray-600 mb-1">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{location.telecom[0].value}</span>
                        </div>
                      )}

                      {/* Available practitioners at this location */}
                      {location.practitioners && location.practitioners.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium mb-1">Available Providers:</h5>
                          <div className="space-y-1">
                            {location.practitioners.slice(0, 2).map((provider, idx) => (
                              <div key={idx} className="flex items-center text-xs">
                                <User className="h-3 w-3 mr-1 text-gray-500" />
                                <span>
                                  {provider.name?.[0]?.prefix?.[0] || ''} {provider.name?.[0]?.given?.[0] || ''} {provider.name?.[0]?.family || ''}
                                </span>
                                <span className="ml-auto text-primary">
                                  {practitionerRoles?.find(role => 
                                    role.practitioner?.reference?.includes(provider.id || '')
                                  )?.specialty?.[0]?.text || ''}
                                </span>
                              </div>
                            ))}
                            
                            {location.practitioners.length > 2 && (
                              <div className="text-xs text-primary flex items-center">
                                <PlusCircle className="h-3 w-3 mr-1" />
                                <span>{location.practitioners.length - 2} more providers</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {location.practitioners?.length || 0} providers
                    </span>
                    <Button size="sm" onClick={() => handleMarkerClick(location)}>
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}