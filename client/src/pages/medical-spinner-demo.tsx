import { useState } from 'react';
import { MedicalSpinner, MedicalLoadingOverlay } from '@/components/ui/medical-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function MedicalSpinnerDemo() {
  const [loading, setLoading] = useState(true);
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Medical Spinners &amp; Loading Indicators</h1>
      
      <div className="space-y-8">
        <Tabs defaultValue="spinners">
          <TabsList className="mb-4">
            <TabsTrigger value="spinners">Spinner Variations</TabsTrigger>
            <TabsTrigger value="overlays">Loading Overlays</TabsTrigger>
          </TabsList>
          
          <TabsContent value="spinners" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Size Variations</CardTitle>
                <CardDescription>
                  Medical spinners available in different sizes from small to extra large.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-8 items-center">
                <MedicalSpinner size="sm" text="Small" />
                <MedicalSpinner size="md" text="Medium" />
                <MedicalSpinner size="lg" text="Large" />
                <MedicalSpinner size="xl" text="Extra Large" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Speed Variations</CardTitle>
                <CardDescription>
                  Customize the animation speed to indicate different loading states.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-8 items-center">
                <MedicalSpinner speed="slow" text="Slow" />
                <MedicalSpinner speed="normal" text="Normal" />
                <MedicalSpinner speed="fast" text="Fast" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Color Variations</CardTitle>
                <CardDescription>
                  Different color options to indicate various states or types of data.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-8 items-center">
                <MedicalSpinner variant="primary" text="Primary" />
                <MedicalSpinner variant="secondary" text="Secondary" />
                <MedicalSpinner variant="success" text="Success" />
                <MedicalSpinner variant="warning" text="Warning" />
                <MedicalSpinner variant="info" text="Info" />
                <MedicalSpinner variant="destructive" text="Destructive" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Medical Icons</CardTitle>
                <CardDescription>
                  Cycle through different medical-themed icons for a more engaging loading experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-8 items-center">
                <MedicalSpinner multiIcon text="Cycling through medical icons" />
                <MedicalSpinner multiIcon size="lg" variant="info" text="Processing health records" />
                <MedicalSpinner multiIcon variant="success" text="Analyzing data" />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="overlays" className="space-y-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Content Overlays</CardTitle>
                  <CardDescription>
                    Place loading indicators over content while data is being processed.
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="airplane-mode" 
                    checked={loading}
                    onCheckedChange={setLoading}
                  />
                  <Label htmlFor="airplane-mode">Show Loading</Label>
                </div>
              </CardHeader>
              <CardContent>
                <MedicalLoadingOverlay 
                  loading={loading} 
                  multiIcon 
                  size="lg"
                  text="Loading patient data..."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Patient Record {i + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm">Sample health record information that would be displayed once loading is complete.</p>
                          <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
                          <div className="h-4 w-1/2 bg-gray-100 rounded"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </MedicalLoadingOverlay>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Implementation Examples</CardTitle>
                <CardDescription>
                  How to use the spinners in various parts of the application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Initial Page Load</h3>
                  <MedicalLoadingOverlay
                    loading={loading}
                    multiIcon
                    variant="primary"
                    text="Establishing secure connection..."
                  >
                    <div className="p-6 border rounded-md">
                      <p>Secure connection established. Your health data is protected.</p>
                    </div>
                  </MedicalLoadingOverlay>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Data Refresh</h3>
                  <div className="flex items-center justify-between mb-2">
                    <p>Periodically refresh data from your provider</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLoading(true);
                        setTimeout(() => setLoading(false), 2000);
                      }}
                      disabled={loading}
                    >
                      Refresh Data
                    </Button>
                  </div>
                  <MedicalLoadingOverlay
                    loading={loading}
                    size="md"
                    variant="info"
                    text="Syncing with provider..."
                    blur={false}
                  >
                    <Card className="bg-gray-50">
                      <CardContent className="p-4">
                        <p className="text-sm">Last synced: {new Date().toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  </MedicalLoadingOverlay>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}