import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConnectCard } from '@/components/health/ConnectCard';
import { 
  Building, 
  Microscope, 
  Pill, 
  Shield, 
  Stethoscope, 
  Server,
  CreditCard,
  Search,
  CloudCog
} from 'lucide-react';
import { fhirProviders } from '@/lib/providers';

// Extend the FHIR providers with additional connection types
const connectionTypes = [
  {
    id: 'provider',
    name: 'Healthcare Providers',
    description: 'Connect to hospitals, clinics, and doctors',
    icon: <Stethoscope className="h-6 w-6" />,
    color: 'bg-blue-500',
    providers: fhirProviders.filter(p => p.id.includes('epic') || p.id.includes('cerner')),
  },
  {
    id: 'insurance',
    name: 'Health Insurance',
    description: 'Connect to your insurance company',
    icon: <CreditCard className="h-6 w-6" />,
    color: 'bg-green-500',
    providers: fhirProviders.filter(p => p.id.includes('insurance')),
  },
  {
    id: 'tefca',
    name: 'TEFCA QHIN',
    description: 'Connect through a Qualified Health Information Network',
    icon: <CloudCog className="h-6 w-6" />,
    color: 'bg-purple-500',
    providers: [
      {
        id: 'commonwell-qhin',
        name: 'CommonWell Health Alliance',
        url: 'https://commonwellalliance.org',
        description: 'TEFCA Qualified Health Information Network',
        logoIcon: 'building',
      },
      {
        id: 'healthgorilla-qhin',
        name: 'Health Gorilla',
        url: 'https://healthgorilla.com',
        description: 'TEFCA Qualified Health Information Network',
        logoIcon: 'server',
      },
      {
        id: 'epic-qhin',
        name: 'Epic Care Everywhere',
        url: 'https://epic.com',
        description: 'TEFCA Qualified Health Information Network',
        logoIcon: 'server',
      },
      {
        id: 'konza-qhin',
        name: 'Konza Health Information Exchange',
        url: 'https://konza.org',
        description: 'TEFCA Qualified Health Information Network',
        logoIcon: 'server',
      },
    ],
  },
  {
    id: 'lab',
    name: 'Lab Diagnostics',
    description: 'Connect to laboratories and diagnostic centers',
    icon: <Microscope className="h-6 w-6" />,
    color: 'bg-yellow-500',
    providers: [
      {
        id: 'quest',
        name: 'Quest Diagnostics',
        url: 'https://questdiagnostics.com',
        description: 'Laboratory and diagnostic services',
        logoIcon: 'microscope',
      },
      {
        id: 'labcorp',
        name: 'Labcorp',
        url: 'https://labcorp.com',
        description: 'Laboratory and diagnostic services',
        logoIcon: 'microscope',
      },
    ],
  },
  {
    id: 'pharmacy',
    name: 'Pharmacies',
    description: 'Connect to your pharmacy records',
    icon: <Pill className="h-6 w-6" />,
    color: 'bg-red-500',
    providers: [
      {
        id: 'cvs',
        name: 'CVS Pharmacy',
        url: 'https://cvs.com',
        description: 'Pharmacy and medication records',
        logoIcon: 'pill',
      },
      {
        id: 'walgreens',
        name: 'Walgreens',
        url: 'https://walgreens.com',
        description: 'Pharmacy and medication records',
        logoIcon: 'pill',
      },
    ],
  },
];

export function ConnectSelector() {
  const [activeTab, setActiveTab] = useState('provider');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTefcaSearch, setShowTefcaSearch] = useState(false);
  
  const filteredProviders = connectionTypes.find(t => t.id === activeTab)?.providers.filter(provider => 
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const handleTefcaSearch = () => {
    setShowTefcaSearch(true);
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">Connect Your Health Records</CardTitle>
        <CardDescription>
          Choose a connection type to access your health information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-6">
            {connectionTypes.map(type => (
              <TabsTrigger key={type.id} value={type.id} className="flex flex-col items-center gap-1 py-3">
                <div className={`${type.color} text-white p-2 rounded-full`}>
                  {type.icon}
                </div>
                <span className="text-xs font-medium">{type.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {connectionTypes.map(type => (
            <TabsContent key={type.id} value={type.id}>
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-1">{type.name}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
                
                {type.id === 'tefca' && (
                  <div className="mb-6">
                    <div className="border rounded-lg p-4 bg-purple-50 mb-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        TEFCA Record Locator Service
                      </h4>
                      <p className="text-sm mt-1 mb-3">
                        The Trusted Exchange Framework and Common Agreement (TEFCA) allows qualified networks to search and retrieve your 
                        health records from any participating organization across the country.
                      </p>
                      
                      {!showTefcaSearch ? (
                        <Button 
                          variant="outline" 
                          className="bg-white border-purple-200 hover:bg-purple-100"
                          onClick={handleTefcaSearch}
                        >
                          <Search className="h-4 w-4 mr-2 text-purple-500" />
                          Search for my records
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium block mb-1">Patient Identifier</label>
                              <Input placeholder="SSN, MRN, or other patient identifier" />
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-1">Date of Birth</label>
                              <Input type="date" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowTefcaSearch(false)}>
                              Cancel
                            </Button>
                            <Button>
                              <Search className="h-4 w-4 mr-2" />
                              Search QHIN Networks
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-medium mb-2">Connect to a specific QHIN:</h4>
                  </div>
                )}
                
                <div className="relative mb-4">
                  <Input
                    placeholder={`Search ${type.name.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProviders.length > 0 ? (
                    filteredProviders.map(provider => (
                      <ConnectCard 
                        key={provider.id} 
                        provider={provider} 
                        className={type.id === 'tefca' ? 'border-purple-200' : ''}
                      />
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-8">
                      <Search className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">No providers found matching your search criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}