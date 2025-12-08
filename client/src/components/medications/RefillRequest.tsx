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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Pill,
  RefreshCw,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  Clock,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MedicationRequest } from '@shared/schema';

// Form validation schema
const refillFormSchema = z.object({
  pharmacy: z.string().min(1, 'Please select a pharmacy'),
  urgency: z.string().min(1, 'Please select urgency'),
  notes: z.string().optional(),
  confirmAccuracy: z.boolean().refine((val) => val === true, {
    message: 'Please confirm the medication information is accurate',
  }),
});

type RefillFormData = z.infer<typeof refillFormSchema>;

// Mock pharmacy data
const pharmacies = [
  { id: 'cvs-main', name: 'CVS Pharmacy - Main St', address: '100 Main Street', phone: '(555) 123-4567' },
  { id: 'walgreens-downtown', name: 'Walgreens - Downtown', address: '200 Center Ave', phone: '(555) 234-5678' },
  { id: 'rite-aid-west', name: 'Rite Aid - West Side', address: '300 West Blvd', phone: '(555) 345-6789' },
  { id: 'local-pharmacy', name: 'Local Family Pharmacy', address: '400 Oak Lane', phone: '(555) 456-7890' },
  { id: 'mail-order', name: 'Mail Order Pharmacy', address: 'Delivery to Home', phone: '1-800-555-0000' },
];

const urgencyOptions = [
  { id: 'routine', name: 'Routine', description: 'Standard processing (1-2 business days)', icon: Clock },
  { id: 'urgent', name: 'Urgent', description: 'Priority processing (same day if possible)', icon: AlertCircle },
];

interface RefillRequestProps {
  medication: MedicationRequest;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function RefillRequest({ medication, trigger, onSuccess }: RefillRequestProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RefillFormData>({
    resolver: zodResolver(refillFormSchema),
    defaultValues: {
      pharmacy: '',
      urgency: 'routine',
      notes: '',
      confirmAccuracy: false,
    },
  });

  // Extract medication info
  const medicationName = medication.medicationCodeableConcept?.coding?.[0]?.display ||
                         medication.medicationCodeableConcept?.text ||
                         'Unknown Medication';

  const dosage = medication.dosageInstruction?.[0]?.text || 'As directed';

  const prescriber = 'Your healthcare provider';

  // Mock refill submission
  const submitRefill = async (data: RefillFormData) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create mock FHIR MedicationRequest update
    const refillRequest = {
      resourceType: 'MedicationRequest',
      id: medication.id,
      status: 'active',
      intent: 'refill-request',
      medicationCodeableConcept: medication.medicationCodeableConcept,
      subject: medication.subject,
      authoredOn: new Date().toISOString(),
      requester: { display: prescriber },
      dosageInstruction: medication.dosageInstruction,
      dispenseRequest: {
        numberOfRepeatsAllowed: 1,
        quantity: {
          value: 30,
          unit: 'tablets',
        },
        expectedSupplyDuration: {
          value: 30,
          unit: 'days',
        },
        performer: {
          reference: `Organization/${data.pharmacy}`,
          display: pharmacies.find(p => p.id === data.pharmacy)?.name,
        },
      },
      note: data.notes ? [{
        text: data.notes,
        time: new Date().toISOString(),
      }] : undefined,
      extension: [{
        url: 'http://example.org/fhir/StructureDefinition/refill-urgency',
        valueCode: data.urgency,
      }],
    };

    console.log('Submitted Refill Request:', refillRequest);
    return refillRequest;
  };

  const onSubmit = async (data: RefillFormData) => {
    setIsSubmitting(true);
    try {
      await submitRefill(data);
      setShowSuccess(true);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/fhir/medicationrequest'] });

      const selectedPharmacy = pharmacies.find(p => p.id === data.pharmacy);
      toast({
        title: 'Refill Requested',
        description: `Your refill request has been sent to ${selectedPharmacy?.name}.`,
      });

      // Reset after showing success
      setTimeout(() => {
        setShowSuccess(false);
        setOpen(false);
        form.reset();
        onSuccess?.();
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit refill request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Request Refill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Request Medication Refill
          </DialogTitle>
          <DialogDescription>
            Submit a refill request to your preferred pharmacy
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
              <h3 className="text-xl font-semibold mb-2">Refill Requested!</h3>
              <p className="text-muted-foreground">
                Your pharmacy will process your request shortly.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Medication Info Card */}
              <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Medication Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
                      <Pill className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">{medicationName}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{dosage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                      {medication.status || 'Active'}
                    </Badge>
                    <span className="text-blue-500">•</span>
                    <span>Prescribed by {prescriber}</span>
                  </div>
                </CardContent>
              </Card>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pharmacy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Pharmacy</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a pharmacy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pharmacies.map((pharmacy) => (
                              <SelectItem key={pharmacy.id} value={pharmacy.id}>
                                <div className="flex flex-col">
                                  <span className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {pharmacy.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-6">
                                    {pharmacy.address}
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

                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Processing Speed</FormLabel>
                        <div className="grid grid-cols-2 gap-3">
                          {urgencyOptions.map((option) => (
                            <div
                              key={option.id}
                              className={cn(
                                'relative flex cursor-pointer rounded-lg border p-4 transition-all',
                                field.value === option.id
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                  : 'border-border hover:border-primary/50'
                              )}
                              onClick={() => field.onChange(option.id)}
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <option.icon className={cn(
                                    'h-4 w-4',
                                    option.id === 'urgent' ? 'text-amber-500' : 'text-muted-foreground'
                                  )} />
                                  <span className="font-medium">{option.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {option.description}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
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
                            placeholder="Any special instructions or requests..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmAccuracy"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/50">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            I confirm that the medication information is accurate
                          </FormLabel>
                          <FormDescription>
                            By checking this box, you verify that you need a refill for this medication
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 mr-2" />
                          Submit Refill Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// Component to display a medication card with refill action
interface MedicationCardProps {
  medication: MedicationRequest;
}

export function MedicationCard({ medication }: MedicationCardProps) {
  const medicationName = medication.medicationCodeableConcept?.coding?.[0]?.display ||
                         medication.medicationCodeableConcept?.text ||
                         'Unknown Medication';

  const dosage = medication.dosageInstruction?.[0]?.text || 'As directed';
  const status = medication.status || 'active';

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    stopped: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'on-hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <Pill className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium">{medicationName}</h4>
              <p className="text-sm text-muted-foreground">{dosage}</p>
              <Badge
                variant="secondary"
                className={cn('mt-2 text-xs', statusColors[status as keyof typeof statusColors] || statusColors.active)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          </div>

          {status === 'active' && (
            <RefillRequest medication={medication} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
