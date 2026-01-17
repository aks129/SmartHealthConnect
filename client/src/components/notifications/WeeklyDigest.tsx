import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Users,
  Sparkles,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { HealthDigest } from '@shared/schema';

export function WeeklyDigest() {
  const queryClient = useQueryClient();

  const { data: digest, isLoading, error } = useQuery({
    queryKey: ['/api/notifications/digests/latest'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/notifications/digests/generate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/digests'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (digestId: number) => {
      return apiRequest('POST', `/api/notifications/digests/${digestId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/digests'] });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const digestData = digest as HealthDigest | undefined;
  const summary = digestData?.summary as any;

  return (
    <Card className={!digestData?.readAt ? 'ring-2 ring-primary/20' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Weekly Health Digest
              {digestData && !digestData.readAt && (
                <Badge variant="secondary">New</Badge>
              )}
            </CardTitle>
            {digestData && (
              <CardDescription>
                {format(new Date(digestData.weekStartDate), 'MMM d')}{digestData.weekEndDate ? ` - ${format(new Date(digestData.weekEndDate), 'MMM d, yyyy')}` : ''}
              </CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {digestData ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
                <Calendar className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {digestData.appointmentCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Appointments</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-1" />
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {digestData.completedActionsCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3 text-center">
                <Clock className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {digestData.actionItemCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 text-center">
                <Users className="h-6 w-6 mx-auto text-purple-500 mb-1" />
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {summary?.familyMembers?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Family Members</div>
              </div>
            </div>

            {/* Highlights */}
            {digestData.highlights && (digestData.highlights as string[]).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  This Week's Highlights
                </h4>
                <div className="space-y-2">
                  {(digestData.highlights as string[]).map((highlight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 rounded-lg bg-muted/50"
                    >
                      <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appointments This Week */}
            {summary?.appointments && summary.appointments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointments
                </h4>
                <div className="space-y-2">
                  {summary.appointments.slice(0, 3).map((apt: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <span className="font-medium">
                          {apt.appointment?.appointmentType || 'Appointment'}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          - {apt.memberName}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(apt.appointment?.scheduledDateTime), 'EEE, MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals Progress */}
            {summary?.goalProgress && summary.goalProgress.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Active Health Goals
                </h4>
                <div className="space-y-2">
                  {summary.goalProgress.slice(0, 3).map((item: any, idx: number) => {
                    const goal = item.goal;
                    const progress = goal.targetValue && goal.currentValue !== null
                      ? (goal.currentValue / goal.targetValue) * 100
                      : 0;

                    return (
                      <div key={idx} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{goal.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.memberName}
                          </span>
                        </div>
                        {goal.targetValue && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Digest Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first weekly health summary
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Digest
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
      {digestData && !digestData.readAt && (
        <CardFooter className="border-t pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => markReadMutation.mutate(digestData.id)}
            disabled={markReadMutation.isPending}
          >
            {markReadMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Mark as Read
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
