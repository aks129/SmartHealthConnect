/**
 * Prior Authorization Workflow Component
 *
 * Guides patients through the prior authorization process for medications,
 * procedures, and specialist referrals. Tracks status and provides
 * actionable next steps.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Phone,
  Calendar,
  ChevronRight,
  Info,
  Pill,
  Stethoscope,
  Building2,
  RefreshCw,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { MedicationRequest, Coverage } from '@shared/schema';

type AuthStatus = 'pending' | 'in_review' | 'approved' | 'denied' | 'appeal' | 'expired';
type AuthType = 'medication' | 'procedure' | 'referral' | 'imaging' | 'dme';

interface PriorAuthRequest {
  id: string;
  type: AuthType;
  status: AuthStatus;
  itemName: string;
  itemCode?: string;
  requestDate: string;
  statusDate: string;
  expirationDate?: string;
  referenceNumber?: string;
  insurerName: string;
  providerName: string;
  notes?: string;
  denialReason?: string;
  requiredDocuments?: string[];
  submittedDocuments?: string[];
  estimatedDecisionDays?: number;
  appealDeadline?: string;
}

interface PriorAuthWorkflowProps {
  medications?: MedicationRequest[];
  coverage?: Coverage;
}

// Sample prior auth data - in production would come from payer APIs
const SAMPLE_AUTH_REQUESTS: PriorAuthRequest[] = [
  {
    id: 'auth-001',
    type: 'medication',
    status: 'approved',
    itemName: 'Ozempic (semaglutide) 1mg',
    itemCode: 'J3490',
    requestDate: '2024-01-05',
    statusDate: '2024-01-08',
    expirationDate: '2025-01-08',
    referenceNumber: 'PA-2024-00123',
    insurerName: 'Blue Cross Blue Shield',
    providerName: 'Dr. Sarah Chen',
    notes: 'Approved for 12 months. Requires A1c > 7.0% for renewal.',
  },
  {
    id: 'auth-002',
    type: 'procedure',
    status: 'in_review',
    itemName: 'Cardiac Stress Test',
    itemCode: '93015',
    requestDate: '2024-01-10',
    statusDate: '2024-01-10',
    referenceNumber: 'PA-2024-00156',
    insurerName: 'Blue Cross Blue Shield',
    providerName: 'Dr. Michael Roberts',
    estimatedDecisionDays: 5,
    requiredDocuments: ['Recent EKG results', 'Cardiology notes', 'Prior treatment history'],
    submittedDocuments: ['Recent EKG results', 'Cardiology notes'],
  },
  {
    id: 'auth-003',
    type: 'medication',
    status: 'denied',
    itemName: 'Dupixent (dupilumab)',
    itemCode: 'J0517',
    requestDate: '2024-01-02',
    statusDate: '2024-01-09',
    referenceNumber: 'PA-2024-00089',
    insurerName: 'Blue Cross Blue Shield',
    providerName: 'Dr. Lisa Park',
    denialReason: 'Step therapy required. Must try generic alternatives first.',
    appealDeadline: '2024-02-09',
    requiredDocuments: ['Documentation of failed alternatives', 'Specialist letter of medical necessity'],
  },
  {
    id: 'auth-004',
    type: 'referral',
    status: 'pending',
    itemName: 'Endocrinology Specialist Referral',
    requestDate: '2024-01-12',
    statusDate: '2024-01-12',
    insurerName: 'Blue Cross Blue Shield',
    providerName: 'Dr. Sarah Chen',
    estimatedDecisionDays: 3,
  },
];

export function PriorAuthWorkflow({ medications = [], coverage }: PriorAuthWorkflowProps) {
  const [authRequests] = useState<PriorAuthRequest[]>(SAMPLE_AUTH_REQUESTS);
  const [expandedAuth, setExpandedAuth] = useState<string | null>(null);

  // Group auths by status
  const groupedAuths = useMemo(() => {
    const groups: Record<AuthStatus, PriorAuthRequest[]> = {
      pending: [],
      in_review: [],
      approved: [],
      denied: [],
      appeal: [],
      expired: [],
    };
    authRequests.forEach(auth => {
      groups[auth.status].push(auth);
    });
    return groups;
  }, [authRequests]);

  // Calculate summary stats
  const stats = useMemo(() => ({
    total: authRequests.length,
    active: authRequests.filter(a => ['pending', 'in_review', 'appeal'].includes(a.status)).length,
    approved: groupedAuths.approved.length,
    denied: groupedAuths.denied.length,
    needsAction: authRequests.filter(a =>
      a.status === 'denied' ||
      (a.status === 'in_review' && a.requiredDocuments?.length !== a.submittedDocuments?.length)
    ).length,
  }), [authRequests, groupedAuths]);

  const getStatusConfig = (status: AuthStatus) => {
    switch (status) {
      case 'approved':
        return {
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
          icon: CheckCircle2,
          label: 'Approved'
        };
      case 'denied':
        return {
          color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
          icon: XCircle,
          label: 'Denied'
        };
      case 'in_review':
        return {
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          icon: Clock,
          label: 'In Review'
        };
      case 'pending':
        return {
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          icon: Clock,
          label: 'Pending'
        };
      case 'appeal':
        return {
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          icon: AlertTriangle,
          label: 'Under Appeal'
        };
      case 'expired':
        return {
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
          icon: XCircle,
          label: 'Expired'
        };
    }
  };

  const getTypeIcon = (type: AuthType) => {
    switch (type) {
      case 'medication': return Pill;
      case 'procedure': return Stethoscope;
      case 'referral': return Building2;
      case 'imaging': return FileText;
      case 'dme': return FileCheck;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            <CardTitle>Prior Authorization Tracker</CardTitle>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Track and manage your insurance prior authorization requests
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-center">
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.needsAction}</p>
            <p className="text-xs text-muted-foreground">Needs Action</p>
          </div>
        </div>

        {/* Action Required Section */}
        {stats.needsAction > 0 && (
          <div className="p-4 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {stats.needsAction} authorization{stats.needsAction > 1 ? 's' : ''} need{stats.needsAction === 1 ? 's' : ''} your attention
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Missing documents or appeal deadlines approaching
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Authorization List */}
        <Accordion type="single" collapsible className="space-y-2">
          {authRequests.map((auth) => {
            const statusConfig = getStatusConfig(auth.status);
            const TypeIcon = getTypeIcon(auth.type);
            const StatusIcon = statusConfig.icon;
            const missingDocs = auth.requiredDocuments?.filter(
              doc => !auth.submittedDocuments?.includes(doc)
            ) || [];
            const appealDaysLeft = auth.appealDeadline ? getDaysUntil(auth.appealDeadline) : null;

            return (
              <AccordionItem
                key={auth.id}
                value={auth.id}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/50">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className={`p-2 rounded-lg ${statusConfig.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{auth.itemName}</p>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {auth.insurerName} • Requested {formatDate(auth.requestDate)}
                      </p>
                    </div>
                    {(missingDocs.length > 0 || (appealDaysLeft !== null && appealDaysLeft <= 14)) && (
                      <Badge variant="destructive" className="shrink-0">
                        Action Needed
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">
                    {/* Reference Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {auth.referenceNumber && (
                        <div>
                          <p className="text-muted-foreground">Reference #</p>
                          <p className="font-mono">{auth.referenceNumber}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Provider</p>
                        <p>{auth.providerName}</p>
                      </div>
                      {auth.itemCode && (
                        <div>
                          <p className="text-muted-foreground">Procedure Code</p>
                          <p className="font-mono">{auth.itemCode}</p>
                        </div>
                      )}
                      {auth.expirationDate && (
                        <div>
                          <p className="text-muted-foreground">Valid Until</p>
                          <p>{formatDate(auth.expirationDate)}</p>
                        </div>
                      )}
                    </div>

                    {/* Status-specific content */}
                    {auth.status === 'in_review' && auth.estimatedDecisionDays && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <Clock className="w-4 h-4" />
                          <span>Estimated decision in {auth.estimatedDecisionDays} business days</span>
                        </div>
                        <Progress value={40} className="mt-2 h-2" />
                      </div>
                    )}

                    {/* Missing Documents */}
                    {missingDocs.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Missing Documents
                        </p>
                        <ul className="mt-2 space-y-1">
                          {missingDocs.map((doc, i) => (
                            <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                              <ChevronRight className="w-3 h-3" />
                              {doc}
                            </li>
                          ))}
                        </ul>
                        <Button variant="outline" size="sm" className="mt-3">
                          Upload Documents
                        </Button>
                      </div>
                    )}

                    {/* Denial Info */}
                    {auth.status === 'denied' && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                          <p className="font-medium text-rose-800 dark:text-rose-200">Denial Reason</p>
                          <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">
                            {auth.denialReason}
                          </p>
                        </div>
                        {auth.appealDeadline && (
                          <div className={`p-3 rounded-lg ${
                            appealDaysLeft && appealDaysLeft <= 7
                              ? 'bg-rose-100 dark:bg-rose-950'
                              : 'bg-amber-50 dark:bg-amber-950/30'
                          }`}>
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Appeal Deadline: {formatDate(auth.appealDeadline)}
                              {appealDaysLeft !== null && (
                                <Badge variant={appealDaysLeft <= 7 ? 'destructive' : 'secondary'}>
                                  {appealDaysLeft} days left
                                </Badge>
                              )}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="default" size="sm">
                                Start Appeal
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Start Prior Authorization Appeal</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will initiate an appeal process with your insurance company.
                                  Your provider may need to submit additional documentation.
                                  Would you like to proceed?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction>Start Appeal</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button variant="outline" size="sm">
                            <Phone className="w-4 h-4 mr-2" />
                            Call Insurance
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Approved Notes */}
                    {auth.status === 'approved' && auth.notes && (
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                          <Info className="w-4 h-4 mt-0.5 shrink-0" />
                          {auth.notes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button variant="ghost" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Phone className="w-4 h-4 mr-2" />
                        Contact Insurer
                      </Button>
                      <Button variant="ghost" size="sm">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Get Help
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Help Section */}
        <div className="p-4 bg-secondary/30 rounded-lg">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4" />
            Understanding Prior Authorization
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Prior authorization is approval from your insurance before receiving certain medications,
            procedures, or services. It helps ensure the treatment is medically necessary.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-3 h-3 mr-2" />
              Learn More
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="w-3 h-3 mr-2" />
              Insurance Help Line
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
