import { useState, useMemo } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Copy,
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  User,
  Clipboard,
  ArrowRight,
  Loader2,
  Send,
  CheckCheck,
  XCircle,
  RefreshCcw,
  Stethoscope,
  MessageSquare,
  FileDown,
  Printer
} from 'lucide-react';
import { Patient, Condition, MedicationRequest, AllergyIntolerance } from '@shared/schema';

interface ReferralTask {
  id: string;
  title: string;
  type: 'referral' | 'appointment' | 'form' | 'prescription' | 'prior-auth';
  status: 'pending' | 'in-progress' | 'waiting' | 'completed' | 'blocked';
  priority: 'urgent' | 'high' | 'normal';
  provider?: string;
  specialty?: string;
  reason?: string;
  steps: TaskStep[];
  createdAt: string;
  dueDate?: string;
  notes?: string;
}

interface TaskStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  completedAt?: string;
  phoneNumber?: string;
  script?: string;
  formFields?: FormField[];
  waitingFor?: string;
}

interface FormField {
  id: string;
  label: string;
  value: string;
  source: 'fhir' | 'manual';
  fhirPath?: string;
}

interface HealthNavigatorProps {
  patient?: Patient;
  conditions?: Condition[];
  medications?: MedicationRequest[];
  allergies?: AllergyIntolerance[];
}

// Pre-populated referral workflows based on common healthcare tasks
const REFERRAL_TEMPLATES: Record<string, Omit<ReferralTask, 'id' | 'createdAt'>> = {
  'colonoscopy': {
    title: 'Colonoscopy Referral',
    type: 'referral',
    status: 'pending',
    priority: 'normal',
    specialty: 'Gastroenterology',
    reason: 'Colorectal cancer screening',
    steps: [
      {
        id: 'step-1',
        title: 'Get referral from PCP',
        description: 'Contact your primary care provider to request a referral',
        status: 'pending',
        phoneNumber: '(555) 123-4567',
        script: "Hi, I'm calling to request a referral for a colonoscopy screening. I'm [AGE] years old and due for colorectal cancer screening. Can you help me with the referral process?"
      },
      {
        id: 'step-2',
        title: 'Verify insurance coverage',
        description: 'Confirm your insurance covers the procedure and find in-network providers',
        status: 'pending',
        phoneNumber: '[Your insurance number]',
        script: "I'd like to verify coverage for a screening colonoscopy (CPT code 45378 or 45380). I also need to confirm if prior authorization is required."
      },
      {
        id: 'step-3',
        title: 'Schedule with gastroenterologist',
        description: 'Call the GI specialist office to schedule the procedure',
        status: 'pending',
        script: "I'd like to schedule a screening colonoscopy. I have a referral from my PCP, Dr. [NAME]. This is my first colonoscopy / I had one [X] years ago."
      },
      {
        id: 'step-4',
        title: 'Complete intake forms',
        description: 'Fill out new patient paperwork (we can pre-fill from your records)',
        status: 'pending',
        formFields: [
          { id: 'name', label: 'Full Name', value: '', source: 'fhir', fhirPath: 'Patient.name' },
          { id: 'dob', label: 'Date of Birth', value: '', source: 'fhir', fhirPath: 'Patient.birthDate' },
          { id: 'allergies', label: 'Allergies', value: '', source: 'fhir', fhirPath: 'AllergyIntolerance.code' },
          { id: 'medications', label: 'Current Medications', value: '', source: 'fhir', fhirPath: 'MedicationRequest.medicationCodeableConcept' },
          { id: 'conditions', label: 'Medical Conditions', value: '', source: 'fhir', fhirPath: 'Condition.code' },
          { id: 'insurance', label: 'Insurance Information', value: '', source: 'manual' },
          { id: 'emergency', label: 'Emergency Contact', value: '', source: 'manual' }
        ]
      },
      {
        id: 'step-5',
        title: 'Receive prep instructions',
        description: 'Get and understand bowel prep instructions for the procedure',
        status: 'pending',
        waitingFor: 'Instructions from GI office'
      }
    ]
  },
  'specialist-referral': {
    title: 'Specialist Referral',
    type: 'referral',
    status: 'pending',
    priority: 'normal',
    specialty: 'Specialist',
    steps: [
      {
        id: 'step-1',
        title: 'Request referral from PCP',
        description: 'Contact your primary care provider for the referral',
        status: 'pending',
        script: "I'd like to request a referral to see a [SPECIALTY] specialist for [REASON]. Can you help initiate this referral?"
      },
      {
        id: 'step-2',
        title: 'Confirm referral sent',
        description: 'Verify the referral was submitted to the specialist',
        status: 'pending',
        waitingFor: 'Referral confirmation from PCP'
      },
      {
        id: 'step-3',
        title: 'Schedule appointment',
        description: 'Contact the specialist office to schedule',
        status: 'pending'
      },
      {
        id: 'step-4',
        title: 'Complete intake forms',
        description: 'Fill out new patient paperwork',
        status: 'pending'
      }
    ]
  },
  'prior-auth': {
    title: 'Prior Authorization',
    type: 'prior-auth',
    status: 'pending',
    priority: 'high',
    steps: [
      {
        id: 'step-1',
        title: "Confirm PA requirement",
        description: "Verify with insurance that prior authorization is needed",
        status: 'pending',
        script: "I'd like to check if prior authorization is required for [PROCEDURE/MEDICATION]. The CPT/NDC code is [CODE]."
      },
      {
        id: 'step-2',
        title: "Provider submits PA",
        description: "Ensure your healthcare provider has submitted the PA request",
        status: 'pending',
        waitingFor: 'PA submission confirmation from provider'
      },
      {
        id: 'step-3',
        title: "Track PA status",
        description: "Follow up on the authorization decision",
        status: 'pending',
        script: "I'm calling to check the status of a prior authorization request. The reference number is [REF#]. The request was submitted on [DATE]."
      },
      {
        id: 'step-4',
        title: "Handle decision",
        description: "If approved, proceed. If denied, request appeal information.",
        status: 'pending'
      }
    ]
  }
};

// Pre-fill form fields from FHIR data
function prefillFormFields(
  fields: FormField[],
  patient?: Patient,
  conditions?: Condition[],
  medications?: MedicationRequest[],
  allergies?: AllergyIntolerance[]
): FormField[] {
  return fields.map(field => {
    if (field.source !== 'fhir') return field;

    let value = '';
    switch (field.fhirPath) {
      case 'Patient.name':
        value = patient?.name?.[0]
          ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
          : '';
        break;
      case 'Patient.birthDate':
        value = patient?.birthDate || '';
        break;
      case 'Patient.gender':
        value = patient?.gender || '';
        break;
      case 'Patient.address':
        const addr = patient?.address?.[0];
        value = addr ? `${addr.line?.join(', ')}, ${addr.city}, ${addr.state} ${addr.postalCode}` : '';
        break;
      case 'Patient.telecom':
        value = patient?.telecom?.find(t => t.system === 'phone')?.value || '';
        break;
      case 'AllergyIntolerance.code':
        value = allergies?.map(a => a.code?.coding?.[0]?.display).filter(Boolean).join(', ') || 'None known';
        break;
      case 'MedicationRequest.medicationCodeableConcept':
        value = medications?.map(m => m.medicationCodeableConcept?.coding?.[0]?.display).filter(Boolean).join(', ') || 'None';
        break;
      case 'Condition.code':
        value = conditions?.map(c => c.code?.coding?.[0]?.display).filter(Boolean).join(', ') || 'None';
        break;
    }

    return { ...field, value };
  });
}

export function HealthNavigator({
  patient,
  conditions,
  medications,
  allergies
}: HealthNavigatorProps) {
  const [activeTab, setActiveTab] = useState('active');
  const [tasks, setTasks] = useState<ReferralTask[]>([
    // Demo task
    {
      id: 'demo-1',
      title: 'Colonoscopy Referral',
      type: 'referral',
      status: 'in-progress',
      priority: 'normal',
      specialty: 'Gastroenterology',
      reason: 'Colorectal cancer screening - due based on age',
      createdAt: new Date().toISOString(),
      dueDate: addDays(new Date(), 30).toISOString(),
      steps: REFERRAL_TEMPLATES['colonoscopy'].steps.map((s, i) => ({
        ...s,
        status: i === 0 ? 'completed' : i === 1 ? 'in-progress' : 'pending'
      }))
    }
  ]);
  const [selectedTask, setSelectedTask] = useState<ReferralTask | null>(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskType, setNewTaskType] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
      case 'in-progress': return 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300';
      case 'waiting': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      case 'blocked': return 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in-progress': return Loader2;
      case 'waiting': return Clock;
      case 'blocked': return XCircle;
      default: return Clock;
    }
  };

  const calculateProgress = (task: ReferralTask) => {
    const completed = task.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / task.steps.length) * 100);
  };

  const updateStepStatus = (taskId: string, stepId: string, status: TaskStep['status']) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;

      const updatedSteps = task.steps.map(step => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined
        };
      });

      // Update task status based on steps
      const allCompleted = updatedSteps.every(s => s.status === 'completed' || s.status === 'skipped');
      const hasInProgress = updatedSteps.some(s => s.status === 'in-progress');
      const hasWaiting = updatedSteps.some(s => s.waitingFor && s.status !== 'completed');

      return {
        ...task,
        steps: updatedSteps,
        status: allCompleted ? 'completed' : hasWaiting ? 'waiting' : hasInProgress ? 'in-progress' : 'pending'
      };
    }));
  };

  const createNewTask = (templateKey: string, customTitle?: string) => {
    const template = REFERRAL_TEMPLATES[templateKey];
    if (!template) return;

    const newTask: ReferralTask = {
      ...template,
      id: `task-${Date.now()}`,
      title: customTitle || template.title,
      createdAt: new Date().toISOString(),
      dueDate: addDays(new Date(), 14).toISOString(),
      steps: template.steps.map(step => ({
        ...step,
        formFields: step.formFields
          ? prefillFormFields(step.formFields, patient, conditions, medications, allergies)
          : undefined
      }))
    };

    setTasks(prev => [...prev, newTask]);
    setShowNewTaskDialog(false);
    setSelectedTask(newTask);
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            Health Navigator
          </h2>
          <p className="text-sm text-muted-foreground">
            Track referrals, appointments, and healthcare tasks
          </p>
        </div>
        <Button onClick={() => setShowNewTaskDialog(true)}>
          <ArrowRight className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="relative">
            Active Tasks
            {activeTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">{activeTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeTasks.length > 0 ? (
            activeTasks.map(task => (
              <Card
                key={task.id}
                className={`cursor-pointer hover:border-primary/50 transition-colors ${
                  task.priority === 'urgent' ? 'border-rose-200 dark:border-rose-800' : ''
                }`}
                onClick={() => setSelectedTask(task)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{task.title}</h3>
                        {task.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs">Urgent</Badge>
                        )}
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      {task.specialty && (
                        <p className="text-sm text-muted-foreground mt-1">{task.specialty}</p>
                      )}
                      {task.reason && (
                        <p className="text-sm text-muted-foreground">{task.reason}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{calculateProgress(task)}%</span>
                    </div>
                    <Progress value={calculateProgress(task)} className="h-2" />
                  </div>

                  {task.dueDate && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Target: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-medium mb-1">No Active Tasks</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All your healthcare tasks are up to date
                </p>
                <Button variant="outline" onClick={() => setShowNewTaskDialog(true)}>
                  Start a New Task
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedTasks.length > 0 ? (
            completedTasks.map(task => (
              <Card key={task.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Completed {format(new Date(task.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No completed tasks yet</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedTask.reason || 'Track your progress through each step'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Progress overview */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <Badge className={getStatusColor(selectedTask.status)}>
                      {calculateProgress(selectedTask)}% complete
                    </Badge>
                  </div>
                  <Progress value={calculateProgress(selectedTask)} className="h-2" />
                </div>

                {/* Steps */}
                <div className="space-y-4">
                  {selectedTask.steps.map((step, index) => {
                    const StatusIcon = getStatusIcon(step.status);
                    const isActive = step.status === 'in-progress' || step.status === 'pending';

                    return (
                      <div
                        key={step.id}
                        className={`p-4 rounded-lg border ${
                          step.status === 'completed' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' :
                          step.status === 'in-progress' ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800' :
                          'bg-secondary/30 border-border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.status === 'completed' ? 'bg-emerald-500 text-white' :
                            step.status === 'in-progress' ? 'bg-sky-500 text-white' :
                            'bg-secondary'
                          }`}>
                            {step.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <span className="text-sm font-medium">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{step.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>

                            {/* Phone number */}
                            {step.phoneNumber && isActive && (
                              <div className="flex items-center gap-2 mt-3">
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`tel:${step.phoneNumber.replace(/\D/g, '')}`}>
                                    <Phone className="w-4 h-4 mr-2" />
                                    Call {step.phoneNumber}
                                  </a>
                                </Button>
                              </div>
                            )}

                            {/* Call script */}
                            {step.script && isActive && (
                              <div className="mt-3 p-3 bg-background rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    What to say:
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(step.script!, `script-${step.id}`)}
                                  >
                                    {copiedText === `script-${step.id}` ? (
                                      <CheckCheck className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                                <p className="text-sm italic">"{step.script}"</p>
                              </div>
                            )}

                            {/* Form fields */}
                            {step.formFields && isActive && (
                              <div className="mt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Pre-filled from your records:
                                  </span>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm">
                                      <Printer className="w-4 h-4 mr-1" />
                                      Print
                                    </Button>
                                    <Button variant="outline" size="sm">
                                      <FileDown className="w-4 h-4 mr-1" />
                                      Download PDF
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  {step.formFields.map(field => (
                                    <div key={field.id} className="flex items-center gap-2 text-sm">
                                      <span className="font-medium min-w-[120px]">{field.label}:</span>
                                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground italic'}>
                                        {field.value || 'Not available'}
                                      </span>
                                      {field.source === 'fhir' && field.value && (
                                        <Badge variant="outline" className="text-xs">Auto-filled</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Waiting indicator */}
                            {step.waitingFor && step.status !== 'completed' && (
                              <div className="flex items-center gap-2 mt-3 text-sm text-amber-600 dark:text-amber-400">
                                <Clock className="w-4 h-4" />
                                Waiting for: {step.waitingFor}
                              </div>
                            )}

                            {/* Completion time */}
                            {step.completedAt && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Completed {format(new Date(step.completedAt), 'MMM d, yyyy h:mm a')}
                              </p>
                            )}

                            {/* Action buttons */}
                            {isActive && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => updateStepStatus(selectedTask.id, step.id, 'completed')}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Mark Complete
                                </Button>
                                {step.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStepStatus(selectedTask.id, step.id, 'in-progress')}
                                  >
                                    Start
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a New Healthcare Task</DialogTitle>
            <DialogDescription>
              Choose a task type to get step-by-step guidance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => createNewTask('colonoscopy')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Colonoscopy Referral</p>
                  <p className="text-xs text-muted-foreground">Get step-by-step guidance for scheduling a colonoscopy</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => createNewTask('specialist-referral')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-sky-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Specialist Referral</p>
                  <p className="text-xs text-muted-foreground">Navigate the referral process to any specialist</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => createNewTask('prior-auth')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Prior Authorization</p>
                  <p className="text-xs text-muted-foreground">Track insurance authorization for procedures or medications</p>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
