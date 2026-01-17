import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { getQueryFn } from "@/lib/queryClient";
import { formatFhirDate } from "@/lib/fhir-client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Coverage, type Claim, type ExplanationOfBenefit } from "@shared/schema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MedicalSpinner } from "@/components/ui/medical-spinner";

export function InsuranceSection() {
  const [activeTab, setActiveTab] = useState("coverage");

  // Fetch insurance data
  const { data: coverages, isLoading: isLoadingCoverage } = useQuery<Coverage[]>({
    queryKey: ['/api/fhir/coverage'],
    queryFn: getQueryFn({ on401: 'returnNull' })
  });

  const { data: claims, isLoading: isLoadingClaims } = useQuery<Claim[]>({
    queryKey: ['/api/fhir/claim'],
    queryFn: getQueryFn({ on401: 'returnNull' })
  });

  const { data: explanationOfBenefits, isLoading: isLoadingEOB } = useQuery<ExplanationOfBenefit[]>({
    queryKey: ['/api/fhir/explanation-of-benefit'],
    queryFn: getQueryFn({ on401: 'returnNull' })
  });

  const isLoading = isLoadingCoverage || isLoadingClaims || isLoadingEOB;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insurance</CardTitle>
          <CardDescription>Loading insurance information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <MedicalSpinner
              size="md"
              text="Loading insurance data..."
              variant="info"
              multiIcon={true}
              speed="normal"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insurance</CardTitle>
        <CardDescription>View your health insurance coverage, claims, and explanations of benefits</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="coverage" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="coverage">Coverage</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="benefits">Explanations of Benefits</TabsTrigger>
          </TabsList>
          
          <TabsContent value="coverage">
            {coverages && coverages.length > 0 ? (
              <div className="space-y-4">
                {coverages.map((coverage: Coverage) => (
                  <div key={coverage.id} className="rounded-lg border p-4">
                    <h3 className="text-lg font-semibold">
                      {coverage.class?.[0]?.name || coverage.class?.[0]?.value || "Health Insurance"}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Subscriber ID</p>
                        <p className="font-medium">{coverage.subscriberId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={coverage.status === "active" ? "default" : "destructive"} className={coverage.status === "active" ? "bg-green-500 hover:bg-green-500/80" : ""}>
                          {coverage.status === "active" ? "Active" : coverage.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Coverage Period</h4>
                      {coverage.period ? (
                        <p>
                          {formatFhirDate(coverage.period.start)} to {formatFhirDate(coverage.period.end || "")}
                        </p>
                      ) : (
                        <p>No period specified</p>
                      )}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Plan Details</h4>
                      {coverage.class && coverage.class.length > 0 ? (
                        <div className="space-y-2">
                          {coverage.class.map((classItem, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-sm text-muted-foreground">{classItem.type?.coding?.[0]?.display || 'Plan'}</span>
                              <span className="font-medium">{classItem.name || classItem.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No plan details available</p>
                      )}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Payor</h4>
                      {coverage.payor && coverage.payor.length > 0 ? (
                        <div>
                          {coverage.payor.map((payor, index) => (
                            <p key={index}>{payor.display || "Insurance Provider"}</p>
                          ))}
                        </div>
                      ) : (
                        <p>No payor information available</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No coverage information available</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="claims">
            {claims && claims.length > 0 ? (
              <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  {claims.map((claim: Claim) => (
                    <AccordionItem key={claim.id} value={claim.id || "claim"}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-col items-start sm:flex-row sm:justify-between sm:w-full pr-4">
                          <div className="font-medium">
                            {claim.item && claim.item.length > 0 && claim.item[0].productOrService?.text 
                              ? claim.item[0].productOrService.text 
                              : "Medical Claim"}
                          </div>
                          <div className="flex items-center gap-3 mt-1 sm:mt-0">
                            <span className="text-sm text-muted-foreground">
                              {claim.created && formatFhirDate(claim.created)}
                            </span>
                            <Badge variant={claim.status === "active" ? "outline" : "secondary"}>
                              {claim.status}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Claim Type</p>
                              <p className="font-medium">{claim.type?.coding?.[0]?.display || "Unknown"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Provider</p>
                              <p className="font-medium">{claim.provider?.display || "Unknown"}</p>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h4 className="font-medium mb-2">Services</h4>
                            {claim.item && claim.item.length > 0 ? (
                              <div className="space-y-2">
                                {claim.item.map((item, index) => (
                                  <div key={index} className="border rounded p-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium">{item.productOrService?.text || "Medical Service"}</p>
                                        {item.servicedDate && (
                                          <p className="text-sm text-muted-foreground">
                                            Date: {formatFhirDate(item.servicedDate)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No service details available</p>
                            )}
                          </div>
                          
                          <Separator />
                          
                          <div className="flex justify-between">
                            <span className="font-medium">Total Amount:</span>
                            <span className="font-semibold">
                              {claim.total ? `$${claim.total.value} ${claim.total.currency || "USD"}` : "Not specified"}
                            </span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No claims information available</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="benefits">
            {explanationOfBenefits && explanationOfBenefits.length > 0 ? (
              <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  {explanationOfBenefits.map((eob: ExplanationOfBenefit) => (
                    <AccordionItem key={eob.id} value={eob.id || "eob"}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-col items-start sm:flex-row sm:justify-between sm:w-full pr-4">
                          <div className="font-medium">
                            {eob.item && eob.item.length > 0 && eob.item[0].productOrService?.text 
                              ? eob.item[0].productOrService.text 
                              : "Explanation of Benefit"}
                          </div>
                          <div className="flex items-center gap-3 mt-1 sm:mt-0">
                            <span className="text-sm text-muted-foreground">
                              {eob.created && formatFhirDate(eob.created)}
                            </span>
                            <Badge variant={eob.status === "active" ? "outline" : "secondary"}>
                              {eob.status}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Type</p>
                              <p className="font-medium">{eob.type?.coding?.[0]?.display || "Unknown"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Outcome</p>
                              <p className="font-medium capitalize">{eob.outcome || "Unknown"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Provider</p>
                              <p className="font-medium">{eob.provider?.display || "Unknown"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Insurer</p>
                              <p className="font-medium">{eob.insurer?.display || "Unknown"}</p>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h4 className="font-medium mb-2">Services</h4>
                            {eob.item && eob.item.length > 0 ? (
                              <div className="space-y-3">
                                {eob.item.map((item, index) => (
                                  <div key={index} className="border rounded p-3">
                                    <p className="font-medium">{item.productOrService?.text || "Medical Service"}</p>
                                    {item.servicedDate && (
                                      <p className="text-sm text-muted-foreground">
                                        Date: {formatFhirDate(item.servicedDate)}
                                      </p>
                                    )}
                                    
                                    {item.adjudication && item.adjudication.length > 0 && (
                                      <div className="mt-3 space-y-1">
                                        <p className="text-sm font-medium">Adjudication</p>
                                        {item.adjudication.map((adj, adjIndex) => (
                                          <div key={adjIndex} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                              {adj.category?.coding?.[0]?.display || "Amount"}:
                                            </span>
                                            <span>
                                              ${adj.amount?.value} {adj.amount?.currency || "USD"}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No service details available</p>
                            )}
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h4 className="font-medium mb-2">Payment Summary</h4>
                            {eob.total && eob.total.length > 0 ? (
                              <div className="space-y-2">
                                {eob.total.map((total, index) => (
                                  <div key={index} className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      {total.category?.coding?.[0]?.display || "Amount"}:
                                    </span>
                                    <span className="font-medium">
                                      ${total.amount?.value} {total.amount?.currency || "USD"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No payment summary available</p>
                            )}
                            
                            {eob.payment && eob.payment.amount && (
                              <div className="mt-3 flex justify-between font-semibold">
                                <span>Total Payment:</span>
                                <span>
                                  ${eob.payment.amount.value} {eob.payment.amount.currency || "USD"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No explanation of benefits information available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}