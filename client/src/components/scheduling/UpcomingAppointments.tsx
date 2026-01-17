import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { ScheduledAppointment } from '@shared/schema';

interface UpcomingAppointmentsProps {
  memberId?: number;
  limit?: number;
  showHeader?: boolean;
}

export function UpcomingAppointments({
  memberId,
  limit = 5,
  showHeader = true
}: UpcomingAppointmentsProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const queryClient = useQueryClient();

  const queryKey = memberId
    ? [`/api/scheduling/appointments/${memberId}`, { upcoming: 'true' }]
    : ['/api/scheduling/appointments'];

  const { data: appointments, isLoading, error } = useQuery({
    queryKey,
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return apiRequest('POST', `/api/scheduling/appointments/${appointmentId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/appointments'] });
      setCancelDialogOpen(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return apiRequest('POST', `/api/scheduling/appointments/${appointmentId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/appointments'] });
    },
  });

  const handleCancelClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="default">Scheduled</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDateLabel = (dateTime: string) => {
    const date = new Date(dateTime);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const getTimeUntil = (dateTime: string) => {
    const date = new Date(dateTime);
    if (isPast(date)) return 'Past';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load appointments</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const appointmentList = Array.isArray(appointments)
    ? appointments.slice(0, limit)
    : [];

  return (
    <>
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>
              Your scheduled healthcare visits
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          {appointmentList.length > 0 ? (
            <div className="space-y-3">
              {appointmentList.map((item: any) => {
                const appointment = item.appointment || item;
                const memberName = item.memberName;
                const dateTime = new Date(appointment.scheduledDateTime);

                return (
                  <div
                    key={appointment.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {appointment.appointmentType || 'Appointment'}
                          </span>
                          {getStatusBadge(appointment.status)}
                        </div>
                        {memberName && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {memberName}
                          </div>
                        )}
                        {appointment.providerName && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {appointment.providerName}
                          </div>
                        )}
                        {appointment.facilityName && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {appointment.facilityName}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-primary">
                          {getDateLabel(appointment.scheduledDateTime)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(dateTime, 'h:mm a')}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getTimeUntil(appointment.scheduledDateTime)}
                        </div>
                      </div>
                    </div>

                    {appointment.status === 'scheduled' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        {appointment.prefilledFormId && (
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            View Form
                          </Button>
                        )}
                        {isToday(dateTime) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => completeMutation.mutate(appointment.id)}
                            disabled={completeMutation.isPending}
                          >
                            {completeMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Mark Complete
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleCancelClick(appointment)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Upcoming Appointments</h3>
              <p className="text-muted-foreground">
                Schedule your next healthcare visit
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAppointment && cancelMutation.mutate(selectedAppointment.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
