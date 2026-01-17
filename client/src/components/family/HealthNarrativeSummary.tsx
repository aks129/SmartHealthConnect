import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  RefreshCw,
  Clock,
  Heart,
  Shield,
  TrendingUp,
  Pill,
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { HealthNarrative, ActionItem, HealthGoal } from '@shared/schema';

interface HealthNarrativeSummaryProps {
  memberId: number;
  memberName: string;
  onClose?: () => void;
}

type NarrativeType = 'overview' | 'condition_focus' | 'preventive' | 'growth' | 'medication';

const narrativeTypeConfig: Record<NarrativeType, { label: string; icon: React.ReactNode; description: string }> = {
  overview: {
    label: 'Overview',
    icon: <Heart className="h-4 w-4" />,
    description: 'A comprehensive view of overall health status'
  },
  condition_focus: {
    label: 'Conditions',
    icon: <FileText className="h-4 w-4" />,
    description: 'Focus on specific health conditions'
  },
  preventive: {
    label: 'Preventive Care',
    icon: <Shield className="h-4 w-4" />,
    description: 'Preventive care and screening recommendations'
  },
  growth: {
    label: 'Growth',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Growth and development tracking'
  },
  medication: {
    label: 'Medications',
    icon: <Pill className="h-4 w-4" />,
    description: 'Medication management summary'
  }
};

export function HealthNarrativeSummary({ memberId, memberName, onClose }: HealthNarrativeSummaryProps) {
  const [activeTab, setActiveTab] = useState<NarrativeType>('overview');
  const queryClient = useQueryClient();

  const { data: narratives, isLoading: narrativesLoading } = useQuery<HealthNarrative[]>({
    queryKey: ['/api/family/narratives', memberId],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const { data: actionItems, isLoading: actionsLoading } = useQuery<ActionItem[]>({
    queryKey: ['/api/family/actions', memberId],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<HealthGoal[]>({
    queryKey: ['/api/family/goals', memberId],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const generateNarrativeMutation = useMutation({
    mutationFn: async (narrativeType: NarrativeType) => {
      return apiRequest('POST', '/api/family/narratives/generate', { familyMemberId: memberId, narrativeType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family/narratives', memberId] });
    },
  });

  const completeActionMutation = useMutation({
    mutationFn: async (actionId: number) => {
      return apiRequest('PUT', `/api/family/actions/${actionId}`, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family/actions', memberId] });
    },
  });

  // Get the most recent narrative of the active type
  const currentNarrative = narratives?.find(n => n.narrativeType === activeTab);

  // Filter pending action items
  const pendingActions = actionItems?.filter(a => a.status === 'pending') || [];

  // Filter active goals
  const activeGoals = goals?.filter(g => g.status === 'active') || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="relative">
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Health Summary for {memberName}
        </CardTitle>
        <CardDescription>
          AI-generated health narratives and action items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Narrative Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NarrativeType)}>
          <TabsList className="grid w-full grid-cols-5">
            {Object.entries(narrativeTypeConfig).map(([type, config]) => (
              <TabsTrigger key={type} value={type} className="flex items-center gap-1">
                {config.icon}
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(narrativeTypeConfig).map(([type, config]) => (
            <TabsContent key={type} value={type} className="mt-4">
              {narrativesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : currentNarrative && currentNarrative.narrativeType === type ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Generated {currentNarrative.generatedAt ? format(new Date(currentNarrative.generatedAt), 'MMM d, yyyy') : 'Recently'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateNarrativeMutation.mutate(type as NarrativeType)}
                      disabled={generateNarrativeMutation.isPending}
                    >
                      {generateNarrativeMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{currentNarrative.content}</p>
                    </div>
                  </ScrollArea>
                  {(() => {
                    const insights = currentNarrative.keyInsights as string[] | null;
                    if (!insights || !Array.isArray(insights) || insights.length === 0) return null;
                    return (
                      <div className="bg-muted rounded-lg p-3">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Key Insights
                        </h4>
                        <ul className="space-y-1">
                          {insights.map((insight: string, idx: number) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No {config.label} Summary Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {config.description}
                  </p>
                  <Button
                    onClick={() => generateNarrativeMutation.mutate(type as NarrativeType)}
                    disabled={generateNarrativeMutation.isPending}
                  >
                    {generateNarrativeMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Action Items Section */}
        {pendingActions.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Pending Action Items ({pendingActions.length})
            </h3>
            <div className="space-y-2">
              {pendingActions.slice(0, 5).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{action.title}</span>
                      <Badge variant={getPriorityColor(action.priority || 'medium')}>
                        {action.priority || 'medium'}
                      </Badge>
                    </div>
                    {action.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {action.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => completeActionMutation.mutate(action.id)}
                    disabled={completeActionMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Goals Section */}
        {activeGoals.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Active Health Goals ({activeGoals.length})
            </h3>
            <div className="space-y-2">
              {activeGoals.slice(0, 3).map((goal) => (
                <div
                  key={goal.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{goal.title}</span>
                    <Badge variant="secondary">{goal.category}</Badge>
                  </div>
                  {goal.targetValue && goal.currentValue !== null && goal.currentValue !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {goal.currentValue} / {goal.targetValue} {goal.unit}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(((goal.currentValue ?? 0) / goal.targetValue) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
