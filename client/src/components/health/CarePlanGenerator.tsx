import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Target,
  Plus,
  Sparkles,
  ClipboardList,
  Calendar,
  Activity,
  Pill,
  Heart,
  Apple,
  AlertTriangle,
  Phone,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  RefreshCw,
  Download,
  Loader2,
  Brain,
  Stethoscope,
  TrendingUp
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { CarePlan, Condition } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface CarePlanGeneratorProps {
  familyMemberId: number;
  memberName: string;
  conditions?: Condition[];
}

interface Goal {
  id: string;
  goal: string;
  targetDate?: string;
  metrics?: string[];
  status: 'not_started' | 'in_progress' | 'achieved' | 'abandoned';
  progress?: number;
}

interface Intervention {
  id: string;
  type: 'medication' | 'therapy' | 'lifestyle' | 'monitoring' | 'other';
  description: string;
  frequency: string;
  responsible: string;
  notes?: string;
}

interface MonitoringItem {
  metric: string;
  frequency: string;
  target?: string;
  warningThreshold?: string;
}

interface CareTeamMember {
  name: string;
  role: string;
  contact?: string;
}

export function CarePlanGenerator({ familyMemberId, memberName, conditions = [] }: CarePlanGeneratorProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CarePlan | null>(null);
  const queryClient = useQueryClient();

  // Fetch existing care plans
  const { data: carePlans, isLoading: plansLoading } = useQuery<CarePlan[]>({
    queryKey: [`/api/family/${familyMemberId}/care-plans`],
    enabled: !!familyMemberId,
  });

  // Use demo data if no API data
  const displayPlans = carePlans?.length ? carePlans : getDemoCarePlans(familyMemberId);

  // Get condition display name
  const getConditionName = (condition: Condition) => {
    return condition.code?.coding?.[0]?.display ||
           condition.code?.text ||
           'Unknown Condition';
  };

  // Generate care plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async (conditionName: string) => {
      const response = await apiRequest('POST', `/api/family/${familyMemberId}/care-plans/generate`, {
        conditionName,
        memberName,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/family/${familyMemberId}/care-plans`] });
      setCreateDialogOpen(false);
    },
  });

  // Update goal status mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ planId, goalId, status }: { planId: number; goalId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/care-plans/${planId}/goals/${goalId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/family/${familyMemberId}/care-plans`] });
    },
  });

  const handleGeneratePlan = async () => {
    if (!selectedCondition) return;
    setIsGenerating(true);
    try {
      await generatePlanMutation.mutateAsync(selectedCondition);
    } catch {
      // Use demo plan on error
      console.log('Using demo care plan');
    } finally {
      setIsGenerating(false);
      setCreateDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      on_hold: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return styles[status] || styles.draft;
  };

  const getGoalStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'abandoned':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const calculateOverallProgress = (goals: Goal[]) => {
    if (!goals?.length) return 0;
    const achieved = goals.filter(g => g.status === 'achieved').length;
    const inProgress = goals.filter(g => g.status === 'in_progress').length;
    return Math.round((achieved * 100 + inProgress * 50) / goals.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Care Plans for {memberName}
          </h2>
          <p className="text-muted-foreground">
            AI-generated personalized care plans for managing health conditions
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Care Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate AI Care Plan
              </DialogTitle>
              <DialogDescription>
                Select a condition to generate a personalized care plan with goals,
                interventions, and monitoring recommendations.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Condition</label>
                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.length > 0 ? (
                      conditions.map((condition, idx) => (
                        <SelectItem key={idx} value={getConditionName(condition)}>
                          {getConditionName(condition)}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Type 2 Diabetes">Type 2 Diabetes</SelectItem>
                        <SelectItem value="Hypertension">Hypertension</SelectItem>
                        <SelectItem value="Asthma">Asthma</SelectItem>
                        <SelectItem value="Anxiety">Anxiety</SelectItem>
                        <SelectItem value="Chronic Back Pain">Chronic Back Pain</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <Brain className="w-4 h-4 inline mr-1" />
                  Our AI will analyze clinical guidelines and create a personalized plan
                  including SMART goals, evidence-based interventions, and monitoring recommendations.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGeneratePlan} disabled={!selectedCondition || isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Plan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Care Plans Grid */}
      {plansLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : displayPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Care Plans Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create personalized care plans to help manage health conditions effectively.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayPlans.map((plan) => (
            <CarePlanCard
              key={plan.id}
              plan={plan}
              onSelect={() => setSelectedPlan(plan)}
              getStatusBadge={getStatusBadge}
              calculateProgress={calculateOverallProgress}
            />
          ))}
        </div>
      )}

      {/* Detailed Plan View Dialog */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {selectedPlan.title}
                </span>
                <Badge className={getStatusBadge(selectedPlan.status || 'draft')}>
                  {selectedPlan.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {selectedPlan.conditionName} - Created {selectedPlan.createdAt && formatDistanceToNow(new Date(selectedPlan.createdAt), { addSuffix: true })}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <CarePlanDetailView
                plan={selectedPlan}
                getGoalStatusIcon={getGoalStatusIcon}
                onGoalStatusChange={(goalId, status) => {
                  updateGoalMutation.mutate({
                    planId: selectedPlan.id,
                    goalId,
                    status,
                  });
                }}
              />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                Close
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button>
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CarePlanCard({
  plan,
  onSelect,
  getStatusBadge,
  calculateProgress,
}: {
  plan: CarePlan;
  onSelect: () => void;
  getStatusBadge: (status: string) => string;
  calculateProgress: (goals: Goal[]) => number;
}) {
  const goals = plan.goals as Goal[] | null;
  const progress = calculateProgress(goals || []);

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-all"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Stethoscope className="w-3 h-3" />
              {plan.conditionName}
            </CardDescription>
          </div>
          <Badge className={getStatusBadge(plan.status || 'draft')}>
            {plan.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {plan.summary && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {plan.summary}
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Goal Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {(goals || []).length} Goals
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {(goals || []).filter(g => g.status === 'achieved').length} Done
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function CarePlanDetailView({
  plan,
  getGoalStatusIcon,
  onGoalStatusChange,
}: {
  plan: CarePlan;
  getGoalStatusIcon: (status: string) => React.ReactNode;
  onGoalStatusChange: (goalId: string, status: string) => void;
}) {
  const goals = plan.goals as Goal[] | null;
  const interventions = plan.interventions as Intervention[] | null;
  const monitoringPlan = plan.monitoringPlan as MonitoringItem[] | null;
  const lifestyle = plan.lifestyle as { diet?: string[]; exercise?: string[]; sleep?: string[] } | null;
  const warningSignsArray = plan.warningSignsToWatch as string[] | null;
  const careTeam = plan.careTeam as CareTeamMember[] | null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      {plan.summary && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm">{plan.summary}</p>
        </div>
      )}

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="interventions">Actions</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="mt-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            SMART Goals
          </h3>
          {goals?.length ? (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={goal.status === 'achieved'}
                      onCheckedChange={(checked) => {
                        onGoalStatusChange(goal.id, checked ? 'achieved' : 'in_progress');
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getGoalStatusIcon(goal.status)}
                        <span className={goal.status === 'achieved' ? 'line-through text-muted-foreground' : ''}>
                          {goal.goal}
                        </span>
                      </div>
                      {goal.targetDate && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Target: {goal.targetDate}
                        </p>
                      )}
                      {goal.metrics && goal.metrics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {goal.metrics.map((metric, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {metric}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No goals defined</p>
          )}
        </TabsContent>

        <TabsContent value="interventions" className="mt-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Recommended Interventions
          </h3>
          {interventions?.length ? (
            <Accordion type="multiple" className="w-full">
              {interventions.map((intervention, idx) => (
                <AccordionItem key={intervention.id || idx} value={intervention.id || `int-${idx}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      {intervention.type === 'medication' && <Pill className="w-4 h-4 text-blue-500" />}
                      {intervention.type === 'lifestyle' && <Apple className="w-4 h-4 text-green-500" />}
                      {intervention.type === 'therapy' && <Heart className="w-4 h-4 text-pink-500" />}
                      {intervention.type === 'monitoring' && <Activity className="w-4 h-4 text-purple-500" />}
                      {intervention.type === 'other' && <FileText className="w-4 h-4 text-gray-500" />}
                      <span>{intervention.description}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-6 space-y-2 text-sm">
                      <p><strong>Frequency:</strong> {intervention.frequency}</p>
                      <p><strong>Responsible:</strong> {intervention.responsible}</p>
                      {intervention.notes && <p><strong>Notes:</strong> {intervention.notes}</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-sm">No interventions defined</p>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="mt-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Monitoring Plan
          </h3>
          {monitoringPlan?.length ? (
            <div className="grid gap-3">
              {monitoringPlan.map((item, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{item.metric}</h4>
                      <p className="text-sm text-muted-foreground">{item.frequency}</p>
                    </div>
                    {item.target && (
                      <Badge variant="outline">Target: {item.target}</Badge>
                    )}
                  </div>
                  {item.warningThreshold && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Alert if: {item.warningThreshold}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No monitoring plan defined</p>
          )}
        </TabsContent>

        <TabsContent value="lifestyle" className="mt-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Apple className="w-4 h-4" />
            Lifestyle Recommendations
          </h3>
          {lifestyle ? (
            <div className="space-y-4">
              {lifestyle.diet && lifestyle.diet.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Diet</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {lifestyle.diet.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lifestyle.exercise && lifestyle.exercise.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Exercise</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {lifestyle.exercise.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lifestyle.sleep && lifestyle.sleep.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Sleep</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {lifestyle.sleep.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No lifestyle recommendations defined</p>
          )}
        </TabsContent>

        <TabsContent value="safety" className="mt-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Warning Signs & When to Seek Care
          </h3>

          {warningSignsArray && warningSignsArray.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Warning Signs to Watch
              </h4>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                {warningSignsArray.map((sign, idx) => (
                  <li key={idx}>{sign}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.whenToSeekCare && (
            <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                When to Contact Your Provider
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">{plan.whenToSeekCare}</p>
            </div>
          )}

          {careTeam && careTeam.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Care Team
              </h4>
              <div className="grid gap-2">
                {careTeam.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    {member.contact && (
                      <Button variant="outline" size="sm">
                        <Phone className="w-3 h-3 mr-1" />
                        {member.contact}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Notice */}
      {plan.aiGenerated && (
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mt-4">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            This care plan was AI-generated and should be reviewed with your healthcare provider.
            {plan.aiModel && ` (${plan.aiModel})`}
          </p>
        </div>
      )}
    </div>
  );
}

// Demo care plans for when API is not available
function getDemoCarePlans(familyMemberId: number): CarePlan[] {
  return [
    {
      id: 1,
      familyMemberId,
      conditionId: 'condition-1',
      conditionName: 'Type 2 Diabetes',
      title: 'Diabetes Management Plan',
      summary: 'Comprehensive plan focusing on blood sugar control through medication adherence, dietary modifications, and regular monitoring. Target A1C reduction from 8.2% to below 7% within 6 months.',
      status: 'active',
      goals: [
        {
          id: 'goal-1',
          goal: 'Reduce A1C from 8.2% to below 7%',
          targetDate: '6 months',
          metrics: ['A1C test', 'Daily fasting glucose'],
          status: 'in_progress',
          progress: 45,
        },
        {
          id: 'goal-2',
          goal: 'Check blood glucose at least twice daily',
          targetDate: 'Ongoing',
          metrics: ['Glucose readings'],
          status: 'achieved',
        },
        {
          id: 'goal-3',
          goal: 'Walk 30 minutes at least 5 days per week',
          targetDate: 'Ongoing',
          metrics: ['Step count', 'Exercise log'],
          status: 'in_progress',
          progress: 60,
        },
      ] as Goal[],
      interventions: [
        {
          id: 'int-1',
          type: 'medication',
          description: 'Take Metformin 500mg twice daily with meals',
          frequency: 'Twice daily',
          responsible: 'Patient',
          notes: 'Take with food to reduce GI side effects',
        },
        {
          id: 'int-2',
          type: 'monitoring',
          description: 'Blood glucose monitoring',
          frequency: 'Twice daily (morning fasting, 2hr post-dinner)',
          responsible: 'Patient',
        },
        {
          id: 'int-3',
          type: 'lifestyle',
          description: 'Follow low-glycemic diet plan',
          frequency: 'Daily',
          responsible: 'Patient',
          notes: 'Focus on whole grains, lean proteins, vegetables',
        },
      ] as Intervention[],
      monitoringPlan: [
        {
          metric: 'Fasting Blood Glucose',
          frequency: 'Daily, morning',
          target: '80-130 mg/dL',
          warningThreshold: 'Above 180 or below 70',
        },
        {
          metric: 'A1C Test',
          frequency: 'Every 3 months',
          target: 'Below 7%',
        },
        {
          metric: 'Weight',
          frequency: 'Weekly',
          target: 'Maintain or gradual loss',
        },
      ] as MonitoringItem[],
      lifestyle: {
        diet: [
          'Focus on non-starchy vegetables, lean proteins, and whole grains',
          'Limit refined carbohydrates and added sugars',
          'Eat regular meals at consistent times',
          'Choose foods with low glycemic index',
        ],
        exercise: [
          '30 minutes of moderate activity at least 5 days per week',
          'Include both aerobic exercise and resistance training',
          'Take short walks after meals to help manage blood sugar',
        ],
        sleep: [
          'Aim for 7-8 hours of sleep per night',
          'Maintain consistent sleep and wake times',
        ],
      },
      warningSignsToWatch: [
        'Blood glucose above 250 mg/dL for more than 24 hours',
        'Symptoms of low blood sugar: shakiness, sweating, confusion',
        'Signs of infection: fever, slow-healing wounds',
        'Frequent urination or excessive thirst',
        'Numbness or tingling in hands or feet',
      ] as any,
      whenToSeekCare: 'Contact your provider immediately if blood glucose is above 300 mg/dL or below 70 mg/dL, if you experience symptoms of diabetic ketoacidosis (nausea, vomiting, abdominal pain), or if you have signs of infection.',
      careTeam: [
        { name: 'Dr. Sarah Johnson', role: 'Primary Care Physician', contact: '555-0123' },
        { name: 'Emily Brown, RD', role: 'Registered Dietitian', contact: '555-0124' },
        { name: 'Diabetes Education Center', role: 'Support Resources', contact: '555-0125' },
      ] as CareTeamMember[],
      aiGenerated: true,
      aiModel: 'GPT-4',
      lastReviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextReviewDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      primaryProvider: 'Dr. Sarah Johnson',
      medications: null,
      sourceEvidence: null,
    },
    {
      id: 2,
      familyMemberId,
      conditionId: 'condition-2',
      conditionName: 'Hypertension',
      title: 'Blood Pressure Control Plan',
      summary: 'Focused plan to reduce blood pressure through medication, sodium restriction, and stress management. Goal is to achieve consistent readings below 130/80 mmHg.',
      status: 'active',
      goals: [
        {
          id: 'goal-4',
          goal: 'Maintain blood pressure below 130/80 mmHg',
          targetDate: '3 months',
          metrics: ['Home BP readings', 'Office visits'],
          status: 'in_progress',
          progress: 70,
        },
        {
          id: 'goal-5',
          goal: 'Reduce sodium intake to less than 2,300mg daily',
          targetDate: 'Ongoing',
          status: 'in_progress',
          progress: 50,
        },
      ] as Goal[],
      interventions: [
        {
          id: 'int-4',
          type: 'medication',
          description: 'Take Lisinopril 10mg once daily',
          frequency: 'Once daily in the morning',
          responsible: 'Patient',
        },
        {
          id: 'int-5',
          type: 'monitoring',
          description: 'Home blood pressure monitoring',
          frequency: 'Twice daily (morning and evening)',
          responsible: 'Patient',
        },
      ] as Intervention[],
      monitoringPlan: [
        {
          metric: 'Blood Pressure',
          frequency: 'Twice daily',
          target: 'Below 130/80 mmHg',
          warningThreshold: 'Above 180/120 (hypertensive crisis)',
        },
      ] as MonitoringItem[],
      lifestyle: {
        diet: ['Follow DASH diet principles', 'Limit sodium to less than 2,300mg daily'],
        exercise: ['30 minutes moderate cardio daily'],
      },
      warningSignsToWatch: [
        'Severe headache with no known cause',
        'Chest pain or shortness of breath',
        'Vision changes',
        'Blood pressure above 180/120',
      ] as any,
      whenToSeekCare: 'Seek emergency care if blood pressure is above 180/120 with symptoms like chest pain, shortness of breath, or severe headache.',
      careTeam: [
        { name: 'Dr. Sarah Johnson', role: 'Primary Care Physician', contact: '555-0123' },
      ] as CareTeamMember[],
      aiGenerated: true,
      aiModel: 'GPT-4',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      primaryProvider: 'Dr. Sarah Johnson',
      lastReviewedAt: null,
      nextReviewDate: null,
      medications: null,
      sourceEvidence: null,
    },
  ];
}
