import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarPlus,
  Clock,
  User,
  Building2,
  Stethoscope,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone
} from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

// Form validation schema
const appointmentFormSchema = z.object({
  appointmentType: z.string().min(1, 'Please select an appointment type'),
  specialty: z.string().min(1, 'Please select a specialty'),
  provider: z.string().optional(),
  location: z.string().min(1, 'Please select a location'),
  date: z.date({ required_error: 'Please select a date' }),
  timeSlot: z.string().min(1, 'Please select a time slot'),
  reason: z.string().min(10, 'Please provide a brief reason for your visit (at least 10 characters)'),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

// Mock data for appointment options
const appointmentTypes = [
  { id: 'routine', name: 'Routine Check-up', duration: 30 },
  { id: 'followup', name: 'Follow-up Visit', duration: 20 },
  { id: 'urgent', name: 'Urgent Care', duration: 45 },
  { id: 'annual', name: 'Annual Physical', duration: 60 },
  { id: 'consultation', name: 'Specialist Consultation', duration: 45 },
  { id: 'preventive', name: 'Preventive Care', duration: 30 },
];

const specialties = [
  { id: 'primary', name: 'Primary Care', icon: '🏥' },
  { id: 'cardiology', name: 'Cardiology', icon: '❤️' },
  { id: 'dermatology', name: 'Dermatology', icon: '🩹' },
  { id: 'endocrinology', name: 'Endocrinology', icon: '🦋' },
  { id: 'gastroenterology', name: 'Gastroenterology', icon: '🫁' },
  { id: 'neurology', name: 'Neurology', icon: '🧠' },
  { id: 'orthopedics', name: 'Orthopedics', icon: '🦴' },
  { id: 'ophthalmology', name: 'Ophthalmology', icon: '👁️' },
];

const providers = [
  { id: 'dr-smith', name: 'Dr. Sarah Smith, MD', specialty: 'primary' },
  { id: 'dr-johnson', name: 'Dr. Michael Johnson, MD', specialty: 'cardiology' },
  { id: 'dr-williams', name: 'Dr. Emily Williams, DO', specialty: 'primary' },
  { id: 'dr-chen', name: 'Dr. David Chen, MD', specialty: 'endocrinology' },
  { id: 'dr-patel', name: 'Dr. Priya Patel, MD', specialty: 'neurology' },
];

const locations = [
  { id: 'main', name: 'Main Medical Center', address: '123 Healthcare Ave, Suite 100' },
  { id: 'downtown', name: 'Downtown Clinic', address: '456 City Center Blvd, Floor 2' },
  { id: 'west', name: 'West Side Medical', address: '789 Sunset Drive' },
  { id: 'telehealth', name: 'Telehealth (Video Visit)', address: 'Virtual Appointment' },
];

// Generate available time slots for a given date
const generateTimeSlots = (date: Date) => {
  const slots = [];
  const dayOfWeek = date.getDay();

  // No weekend appointments
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];

  // Generate slots from 8 AM to 5 PM
  for (let hour = 8; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Randomly mark some slots as unavailable for realism
      const isAvailable = Math.random() > 0.3;
      if (isAvailable) {
        const time = setMinutes(setHours(date, hour), minute);
        slots.push({
          id: `${hour}-${minute}`,
          time: format(time, 'h:mm a'),
          available: true,
        });
      }
    }
  }
  return slots;
};

interface AppointmentSchedulerProps {
  trigger?: React.ReactNode;
  careGapId?: string;
  suggestedType?: string;
  suggestedSpecialty?: string;
}

export function AppointmentScheduler({
  trigger,
  careGapId,
  suggestedType,
  suggestedSpecialty
}: AppointmentSchedulerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeSlots, setTimeSlots] = useState<{ id: string; time: string; available: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      appointmentType: suggestedType || '',
      specialty: suggestedSpecialty || '',
      provider: '',
      location: '',
      reason: '',
      notes: '',
    },
  });

  const selectedSpecialty = form.watch('specialty');
  const filteredProviders = providers.filter(
    p => !selectedSpecialty || p.specialty === selectedSpecialty
  );

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const slots = generateTimeSlots(date);
      setTimeSlots(slots);
      form.setValue('date', date);
    }
  };

  // Mock appointment submission
  const submitAppointment = async (data: AppointmentFormData) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create mock FHIR Appointment resource
    const appointmentResource = {
      resourceType: 'Appointment',
      id: `apt-${Date.now()}`,
      status: 'proposed',
      serviceType: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/service-type',
          code: data.appointmentType,
          display: appointmentTypes.find(t => t.id === data.appointmentType)?.name,
        }],
      }],
      specialty: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: data.specialty,
          display: specialties.find(s => s.id === data.specialty)?.name,
        }],
      }],
      reasonCode: [{
        text: data.reason,
      }],
      description: data.notes,
      start: format(data.date, "yyyy-MM-dd'T'") + data.timeSlot.replace(' ', '').toLowerCase(),
      participant: [
        {
          actor: {
            reference: `Patient/demo-patient`,
            display: 'Demo Patient',
          },
          status: 'accepted',
        },
        ...(data.provider ? [{
          actor: {
            reference: `Practitioner/${data.provider}`,
            display: providers.find(p => p.id === data.provider)?.name,
          },
          status: 'needs-action',
        }] : []),
      ],
      location: [{
        location: {
          reference: `Location/${data.location}`,
          display: locations.find(l => l.id === data.location)?.name,
        },
      }],
    };

    console.log('Created FHIR Appointment:', appointmentResource);
    return appointmentResource;
  };

  const onSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true);
    try {
      await submitAppointment(data);
      setShowSuccess(true);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/fhir/appointment'] });

      toast({
        title: 'Appointment Request Submitted',
        description: `Your appointment for ${format(data.date, 'MMMM d, yyyy')} at ${data.timeSlot} has been requested.`,
      });

      // Reset after showing success
      setTimeout(() => {
        setShowSuccess(false);
        setOpen(false);
        setStep(1);
        form.reset();
        setSelectedDate(undefined);
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit appointment request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const canProceedStep1 = form.watch('appointmentType') && form.watch('specialty');
  const canProceedStep2 = form.watch('date') && form.watch('timeSlot') && form.watch('location');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            Schedule Visit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Schedule an Appointment
          </DialogTitle>
          <DialogDescription>
            Request a new appointment with your healthcare provider
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 flex flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
              <p className="text-muted-foreground">
                You'll receive a confirmation once your appointment is scheduled.
              </p>
            </motion.div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                          step >= s
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {s}
                      </div>
                      {s < 3 && (
                        <div
                          className={cn(
                            'w-12 h-1 mx-1 rounded transition-colors',
                            step > s ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Step 1: Type & Specialty */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="appointmentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Appointment Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select appointment type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {appointmentTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{type.name}</span>
                                      <Badge variant="secondary" className="ml-2">
                                        {type.duration} min
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="specialty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specialty</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select specialty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {specialties.map((specialty) => (
                                  <SelectItem key={specialty.id} value={specialty.id}>
                                    <span className="flex items-center gap-2">
                                      <span>{specialty.icon}</span>
                                      <span>{specialty.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Provider (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Any available provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Any available provider</SelectItem>
                                {filteredProviders.map((provider) => (
                                  <SelectItem key={provider.id} value={provider.id}>
                                    <span className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>{provider.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select a specific provider or leave blank for any available
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 2: Date, Time & Location */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Date</FormLabel>
                            <div className="border rounded-lg p-3">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                disabled={(date) =>
                                  date < new Date() ||
                                  date > addDays(new Date(), 90) ||
                                  date.getDay() === 0 ||
                                  date.getDay() === 6
                                }
                                className="mx-auto"
                              />
                            </div>
                            <FormDescription>
                              Appointments available Monday-Friday, up to 90 days out
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedDate && timeSlots.length > 0 && (
                        <FormField
                          control={form.control}
                          name="timeSlot"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available Times</FormLabel>
                              <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-1">
                                {timeSlots.map((slot) => (
                                  <Button
                                    key={slot.id}
                                    type="button"
                                    variant={field.value === slot.time ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => field.onChange(slot.time)}
                                    className="text-xs"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    {slot.time}
                                  </Button>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedDate && timeSlots.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No available appointments on this date. Please select another date.
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {locations.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    <div className="flex flex-col">
                                      <span className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        {location.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-6">
                                        {location.address}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 3: Reason & Notes */}
                  {step === 3 && (
                    <div className="space-y-4">
                      {/* Summary Card */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Appointment Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {appointmentTypes.find(t => t.id === form.watch('appointmentType'))?.name} - {' '}
                              {specialties.find(s => s.id === form.watch('specialty'))?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} at {form.watch('timeSlot')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {locations.find(l => l.id === form.watch('location'))?.name}
                            </span>
                          </div>
                          {form.watch('provider') && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {providers.find(p => p.id === form.watch('provider'))?.name}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reason for Visit</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Briefly describe the reason for your appointment..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              This helps your provider prepare for your visit
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any additional information or special requests..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </motion.div>

                {/* Navigation buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1}
                  >
                    Back
                  </Button>

                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={
                        (step === 1 && !canProceedStep1) ||
                        (step === 2 && !canProceedStep2)
                      }
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CalendarCheck className="h-4 w-4 mr-2" />
                          Request Appointment
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
