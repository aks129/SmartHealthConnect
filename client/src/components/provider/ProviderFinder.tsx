/**
 * Provider Finder Component
 *
 * Uses NPI Registry API to find healthcare providers and specialists.
 * Features:
 * - Search by specialty, location, name
 * - Real-time results from NPI Registry
 * - Provider details display
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Phone,
  Building2,
  User,
  Stethoscope,
  Loader2,
  ExternalLink,
  ChevronRight,
  Award
} from 'lucide-react';
import { useFindSpecialists, useSpecialties, type Provider } from '@/hooks/use-external-apis';

interface ProviderFinderProps {
  onSelectProvider?: (provider: Provider) => void;
  initialSpecialty?: string;
  initialLocation?: { city?: string; state?: string };
}

// US States for dropdown
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

// Common specialties
const COMMON_SPECIALTIES = [
  'Family Medicine',
  'Internal Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Gastroenterology',
  'Neurology',
  'Ophthalmology',
  'Orthopedic Surgery',
  'Psychiatry',
  'Pulmonary Disease',
  'Urology',
  'Oncology',
  'Endocrinology',
  'Nephrology',
  'Rheumatology'
];

export function ProviderFinder({
  onSelectProvider,
  initialSpecialty = '',
  initialLocation = {}
}: ProviderFinderProps) {
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [city, setCity] = useState(initialLocation.city || '');
  const [state, setState] = useState(initialLocation.state || '');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [shouldSearch, setShouldSearch] = useState(false);

  // Fetch specialists
  const {
    data: searchResults,
    isLoading,
    isError
  } = useFindSpecialists({
    specialty: specialty,
    city: city || undefined,
    state: state || undefined,
    limit: 15,
    enabled: shouldSearch && !!specialty
  });

  const handleSearch = () => {
    if (specialty) {
      setShouldSearch(true);
    }
  };

  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    onSelectProvider?.(provider);
  };

  const getProviderName = (provider: Provider) => {
    if (provider.type === 'organization') {
      return provider.name.organizationName || 'Unknown Organization';
    }
    const parts = [provider.name.first, provider.name.middle, provider.name.last]
      .filter(Boolean);
    const name = parts.join(' ');
    return provider.name.credential ? `${name}, ${provider.name.credential}` : name;
  };

  const getPracticeAddress = (provider: Provider) => {
    const addr = provider.addresses.find(a => a.type === 'practice') || provider.addresses[0];
    if (!addr) return null;
    return {
      ...addr,
      formatted: `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.city}, ${addr.state} ${addr.postalCode}`
    };
  };

  const getPrimarySpecialty = (provider: Provider) => {
    return provider.specialties.find(s => s.isPrimary) || provider.specialties[0];
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          <CardTitle>Find Healthcare Providers</CardTitle>
        </div>
        <CardDescription>
          Search the NPI Registry for specialists and healthcare providers
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger id="specialty">
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_SPECIALTIES.map(spec => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City (optional)</Label>
            <Input
              id="city"
              placeholder="e.g., San Francisco"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State (optional)</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={!specialty || isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search Providers
            </>
          )}
        </Button>

        {/* Results */}
        {shouldSearch && (
          <>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                <p>Searching NPI Registry...</p>
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>Failed to search providers. Please try again.</p>
              </div>
            ) : searchResults && searchResults.providers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found {searchResults.totalCount} providers
                  </p>
                  <Badge variant="outline" className="text-xs">
                    NPI Registry
                  </Badge>
                </div>

                <div className="space-y-2">
                  {searchResults.providers.map((provider) => {
                    const address = getPracticeAddress(provider);
                    const primarySpec = getPrimarySpecialty(provider);
                    const isSelected = selectedProvider?.npi === provider.npi;

                    return (
                      <div
                        key={provider.npi}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50 hover:bg-secondary/50'
                        }`}
                        onClick={() => handleSelectProvider(provider)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {provider.type === 'individual' ? (
                                <User className="w-4 h-4 text-primary" />
                              ) : (
                                <Building2 className="w-4 h-4 text-primary" />
                              )}
                              <h4 className="font-medium truncate">
                                {getProviderName(provider)}
                              </h4>
                            </div>

                            {primarySpec && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Award className="w-3 h-3" />
                                <span>{primarySpec.description}</span>
                                {primarySpec.state && (
                                  <Badge variant="secondary" className="text-xs">
                                    {primarySpec.state}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {address && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-1">{address.formatted}</span>
                              </div>
                            )}

                            {address?.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Phone className="w-3 h-3" />
                                <span>{address.phone}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              NPI: {provider.npi}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Expanded details when selected */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t space-y-2">
                            <p className="text-sm">
                              <span className="font-medium">Status:</span>{' '}
                              <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                                {provider.status}
                              </Badge>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Enumeration Date:</span>{' '}
                              {provider.enumerationDate || 'N/A'}
                            </p>
                            {provider.specialties.length > 1 && (
                              <div>
                                <p className="text-sm font-medium mb-1">All Specialties:</p>
                                <div className="flex flex-wrap gap-1">
                                  {provider.specialties.map((spec, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {spec.description}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `https://npiregistry.cms.hhs.gov/provider-view/${provider.npi}`,
                                  '_blank'
                                );
                              }}
                            >
                              View on NPI Registry
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : searchResults ? (
              <div className="py-8 text-center text-muted-foreground">
                <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No providers found matching your criteria</p>
                <p className="text-sm">Try broadening your search</p>
              </div>
            ) : null}
          </>
        )}

        {/* Initial state */}
        {!shouldSearch && (
          <div className="py-8 text-center text-muted-foreground">
            <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Select a specialty to search for providers</p>
            <p className="text-sm">Data from CMS NPI Registry</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
