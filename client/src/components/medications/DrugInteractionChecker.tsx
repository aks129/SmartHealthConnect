/**
 * Drug Interaction Checker Component
 *
 * Uses OpenFDA API to check for drug interactions between patient's medications.
 * Features:
 * - Automatic checking of current medication list
 * - Severity indicators (major, moderate, minor)
 * - Detailed interaction information
 * - Manual drug lookup
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Pill,
  Search,
  Shield,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MedicationRequest } from '@shared/schema';
import { useDrugInteractions, useDrugSearch, useAdverseEvents, type DrugInteraction } from '@/hooks/use-external-apis';

interface DrugInteractionCheckerProps {
  medications?: MedicationRequest[];
}

export function DrugInteractionChecker({ medications = [] }: DrugInteractionCheckerProps) {
  const [expandedInteraction, setExpandedInteraction] = useState<string | null>(null);
  const [searchDrug, setSearchDrug] = useState('');
  const [selectedDrugForDetails, setSelectedDrugForDetails] = useState<string | null>(null);

  // Extract drug names from medications
  const drugNames = useMemo(() => {
    return medications
      .filter(m => m.status === 'active')
      .map(m => {
        const name = m.medicationCodeableConcept?.coding?.[0]?.display ||
                     m.medicationCodeableConcept?.text || '';
        // Extract just the drug name (remove dosage info)
        return name.split(/\s+\d/)[0].trim();
      })
      .filter(Boolean);
  }, [medications]);

  // Check interactions using mutation
  const interactionsMutation = useDrugInteractions();

  // Auto-check interactions when medications change
  useEffect(() => {
    if (drugNames.length >= 2) {
      interactionsMutation.mutate(drugNames);
    }
  }, [drugNames.join(',')]); // Only re-run when drug list changes

  // Get details for selected drug
  const { data: drugDetails, isLoading: isLoadingDrugDetails } = useDrugSearch(
    selectedDrugForDetails || '',
    !!selectedDrugForDetails
  );

  // Get adverse events for selected drug
  const { data: adverseEvents, isLoading: isLoadingAdverseEvents } = useAdverseEvents(
    selectedDrugForDetails || '',
    5,
    !!selectedDrugForDetails
  );

  const getSeverityColor = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'major':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      case 'moderate':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'minor':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getSeverityIcon = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'major':
        return AlertTriangle;
      case 'moderate':
        return AlertCircle;
      case 'minor':
        return Info;
      default:
        return Info;
    }
  };

  const interactions = interactionsMutation.data?.interactions || [];
  const hasInteractions = interactions.length > 0;
  const majorCount = interactions.filter(i => i.severity === 'major').length;
  const moderateCount = interactions.filter(i => i.severity === 'moderate').length;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Drug Interaction Checker</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {interactionsMutation.isPending ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking...
              </Badge>
            ) : interactionsMutation.isSuccess ? (
              <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
                <Wifi className="w-3 h-3" />
                FDA Data
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <WifiOff className="w-3 h-3" />
                Offline
              </Badge>
            )}
            {drugNames.length >= 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => interactionsMutation.mutate(drugNames)}
                disabled={interactionsMutation.isPending}
              >
                <RefreshCw className={`w-3 h-3 ${interactionsMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          {drugNames.length >= 2
            ? `Checking ${drugNames.length} medications for potential interactions`
            : 'Add at least 2 medications to check for interactions'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Banner */}
        {drugNames.length >= 2 && (
          <div className={`p-4 rounded-lg border ${
            hasInteractions
              ? majorCount > 0
                ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
          }`}>
            <div className="flex items-center gap-3">
              {hasInteractions ? (
                majorCount > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                )
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              )}
              <div>
                <p className="font-medium">
                  {hasInteractions
                    ? `${interactions.length} potential interaction${interactions.length > 1 ? 's' : ''} found`
                    : 'No known interactions detected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasInteractions
                    ? `${majorCount} major, ${moderateCount} moderate, ${interactions.length - majorCount - moderateCount} minor`
                    : 'Your current medications appear safe to take together'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Medications */}
        <div>
          <h4 className="text-sm font-medium mb-2">Your Medications ({drugNames.length})</h4>
          <div className="flex flex-wrap gap-2">
            {drugNames.length > 0 ? (
              drugNames.map((drug, i) => (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary transition-colors"
                        onClick={() => setSelectedDrugForDetails(selectedDrugForDetails === drug ? null : drug)}
                      >
                        <Pill className="w-3 h-3 mr-1" />
                        {drug}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click for drug details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active medications found</p>
            )}
          </div>
        </div>

        {/* Drug Details Panel */}
        {selectedDrugForDetails && (
          <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Pill className="w-4 h-4" />
                {selectedDrugForDetails}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDrugForDetails(null)}
              >
                Close
              </Button>
            </div>

            {isLoadingDrugDetails ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading drug information...
              </div>
            ) : drugDetails ? (
              <div className="space-y-2 text-sm">
                {drugDetails.genericName && (
                  <p><span className="font-medium">Generic:</span> {drugDetails.genericName}</p>
                )}
                {drugDetails.manufacturer && (
                  <p><span className="font-medium">Manufacturer:</span> {drugDetails.manufacturer}</p>
                )}
                {drugDetails.dosageForm && (
                  <p><span className="font-medium">Form:</span> {drugDetails.dosageForm}</p>
                )}
                {drugDetails.boxedWarning && (
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded text-rose-700 dark:text-rose-400">
                    <p className="font-medium flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Boxed Warning
                    </p>
                    <p className="text-xs mt-1 line-clamp-3">{drugDetails.boxedWarning}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Drug information not available</p>
            )}

            {/* Adverse Events */}
            {adverseEvents && adverseEvents.reactions.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Top Reported Side Effects (FDA FAERS)
                </p>
                <div className="flex flex-wrap gap-1">
                  {adverseEvents.reactions.slice(0, 5).map((reaction, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {reaction.term.toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interaction List */}
        {hasInteractions && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Interaction Details</h4>
            {interactions.map((interaction, index) => {
              const SeverityIcon = getSeverityIcon(interaction.severity);
              const isExpanded = expandedInteraction === `${interaction.drug1}-${interaction.drug2}`;

              return (
                <Collapsible
                  key={index}
                  open={isExpanded}
                  onOpenChange={() => setExpandedInteraction(
                    isExpanded ? null : `${interaction.drug1}-${interaction.drug2}`
                  )}
                >
                  <div className={`rounded-lg border ${getSeverityColor(interaction.severity)}`}>
                    <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <SeverityIcon className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-medium text-sm">
                            {interaction.drug1} + {interaction.drug2}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`mt-1 text-xs ${getSeverityColor(interaction.severity)}`}
                          >
                            {interaction.severity.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2 text-sm">
                        <p>{interaction.description}</p>
                        {interaction.mechanism && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Mechanism:</span> {interaction.mechanism}
                          </p>
                        )}
                        {interaction.management && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Management:</span> {interaction.management}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground pt-2 border-t">
                          Always consult your healthcare provider before making changes to your medications.
                        </p>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* No medications message */}
        {drugNames.length < 2 && (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Add medications to your profile to check for interactions</p>
            <p className="text-sm">Powered by OpenFDA drug interaction data</p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              <strong>Important:</strong> This tool uses FDA data to identify known interactions
              but may not include all possible interactions. Always consult your pharmacist
              or healthcare provider before starting new medications.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
