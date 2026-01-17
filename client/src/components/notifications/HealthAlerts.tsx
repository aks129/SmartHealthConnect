import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  BellOff,
  Calendar,
  Target,
  AlertTriangle,
  Heart,
  TrendingUp,
  Shield,
  Pill,
  CheckCheck,
  X,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { HealthAlert } from '@shared/schema';
import { cn } from '@/lib/utils';

interface HealthAlertsProps {
  showAsPopover?: boolean;
  maxAlerts?: number;
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  medication_reminder: {
    icon: <Pill className="h-4 w-4" />,
    color: 'text-purple-500'
  },
  appointment_upcoming: {
    icon: <Calendar className="h-4 w-4" />,
    color: 'text-blue-500'
  },
  care_gap: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-500'
  },
  goal_milestone: {
    icon: <Target className="h-4 w-4" />,
    color: 'text-green-500'
  },
  health_trend: {
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'text-blue-500'
  },
  preventive_care: {
    icon: <Shield className="h-4 w-4" />,
    color: 'text-indigo-500'
  },
  follow_up_needed: {
    icon: <Heart className="h-4 w-4" />,
    color: 'text-red-500'
  },
};

const priorityConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  urgent: { variant: 'destructive' },
  high: { variant: 'destructive' },
  medium: { variant: 'secondary' },
  low: { variant: 'outline' },
};

export function HealthAlerts({ showAsPopover = false, maxAlerts = 10 }: HealthAlertsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['/api/notifications/alerts', { unreadOnly: 'true' }],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: alertCount } = useQuery({
    queryKey: ['/api/notifications/alerts/count'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest('POST', `/api/notifications/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/alerts'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/notifications/alerts/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/alerts'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest('POST', `/api/notifications/alerts/${alertId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/alerts'] });
    },
  });

  const unreadCount = (alertCount as any)?.count || 0;
  const alertList = Array.isArray(alerts) ? alerts.slice(0, maxAlerts) : [];

  const AlertContent = () => (
    <div className="space-y-1">
      {isLoading ? (
        <div className="space-y-2 p-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : alertList.length > 0 ? (
        <>
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-medium">
              {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              <span className="ml-1 hidden sm:inline">Mark all read</span>
            </Button>
          </div>
          <ScrollArea className="h-[400px]">
            {alertList.map((item: any) => {
              const alert = item.alert || item;
              const memberName = item.memberName;
              const config = categoryConfig[alert.category] || categoryConfig.follow_up_needed;
              const priority = priorityConfig[alert.priority] || priorityConfig.low;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0',
                    !alert.readAt && 'bg-muted/30'
                  )}
                >
                  <div className={cn('mt-0.5', config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {alert.title}
                      </span>
                      <Badge variant={priority.variant} className="text-xs shrink-0">
                        {alert.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {memberName && (
                        <span className="text-xs text-muted-foreground">
                          {memberName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!alert.readAt && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markReadMutation.mutate(alert.id)}
                      >
                        <CheckCheck className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground"
                      onClick={() => dismissMutation.mutate(alert.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <BellOff className="h-10 w-10 text-muted-foreground mb-3" />
          <h4 className="font-medium mb-1">No new alerts</h4>
          <p className="text-sm text-muted-foreground">
            You're all caught up! We'll notify you when there's something important.
          </p>
        </div>
      )}
    </div>
  );

  if (showAsPopover) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="end">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h4 className="font-semibold">Health Alerts</h4>
          </div>
          <AlertContent />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Health Alerts
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Important updates about your family's health
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AlertContent />
      </CardContent>
    </Card>
  );
}
