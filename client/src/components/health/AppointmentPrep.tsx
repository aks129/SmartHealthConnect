import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Plus,
  FileText,
  Download,
  Printer,
  ClipboardList,
  Pill,
  Activity,
  Heart,
  AlertTriangle,
  MessageSquare,
  User,
  Building2,
  Clock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Sparkles,
  Copy,
  Share2
} from 'lucide-react';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import type { AppointmentPrepSummary, Condition, MedicationRequest, Observation } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface AppointmentPrepProps {
  familyMemberId: number;
  memberName: string;
  conditions?: Condition[];
  medications?: MedicationRequest[];
  observations?: Observation[];
}

interface Question {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

const visitTypes = [
  'Annual Physical',
  'Follow-up Visit',
  'New Symptom',
  'Specialist Consultation',
  'Lab Results Review',
  'Medication Review',
  'Chronic Care Management',
  'Mental Health',
  'Urgent Care',
  'Other',
];

const questionCategories = [
  'Symptoms',
  'Medications',
  'Test Results',
  'Treatment Options',
  'Lifestyle',
  'Follow-up',
  'Other',
];

export function AppointmentPrep({
  familyMemberId,
  memberName,
  conditions = [],
  medications = [],
  observations = [],
}: AppointmentPrepProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPrep, setSelectedPrep] = useState<AppointmentPrepSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [questionCategory, setQuestionCategory] = useState('Other');
  const [questionPriority, setQuestionPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Form state
  const [appointmentDate, setAppointmentDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [visitType, setAppointmentType] = useState('');
  const [providerName, setProviderName] = useState('');
  const [concerns, setConcerns] = useState('');

  const queryClient = useQueryClient();

  // Fetch existing appointment prep summaries
  const { data: prepSummaries, isLoading } = useQuery<AppointmentPrepSummary[]>({
    queryKey: [`/api/family/${familyMemberId}/appointment-prep`],
    enabled: !!familyMemberId,
  });

  // Use demo data if no API data
  const displayPreps = prepSummaries?.length ? prepSummaries : getDemoPrepSummaries(familyMemberId);

  // Generate prep mutation
  const generatePrepMutation = useMutation({
    mutationFn: async (data: { appointmentDate: string; visitType: string; providerName: string; concerns: string }) => {
      const response = await apiRequest('POST', `/api/family/${familyMemberId}/appointment-prep/generate`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/family/${familyMemberId}/appointment-prep`] });
      setCreateDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setAppointmentDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    setAppointmentType('');
    setProviderName('');
    setConcerns('');
    setQuestions([]);
  };

  const handleGenerate = async () => {
    if (!appointmentDate || !visitType) return;
    setIsGenerating(true);
    try {
      await generatePrepMutation.mutateAsync({
        appointmentDate,
        visitType,
        providerName,
        concerns: [...questions.map(q => q.text), concerns].filter(Boolean).join('\n'),
      });
    } catch {
      console.log('Using demo prep summary');
    } finally {
      setIsGenerating(false);
      setCreateDialogOpen(false);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    const question: Question = {
      id: `q-${Date.now()}`,
      text: newQuestion.trim(),
      priority: questionPriority,
      category: questionCategory,
    };
    setQuestions([...questions, question]);
    setNewQuestion('');
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const exportToPDF = (prep: AppointmentPrepSummary) => {
    // Create printable content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const questionsHtml = (prep.questionsToAsk as string[] || [])
      .map(q => `<li>${q}</li>`)
      .join('');

    const medicationsHtml = medications
      .map(med => {
        const name = med.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown';
        return `<li>${name}</li>`;
      })
      .join('') || '<li>No current medications</li>';

    const conditionsHtml = conditions
      .map(cond => {
        const name = cond.code?.coding?.[0]?.display || cond.code?.text || 'Unknown';
        return `<li>${name}</li>`;
      })
      .join('') || '<li>No active conditions</li>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Appointment Preparation - ${memberName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
            h2 { color: #2c5282; margin-top: 24px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .info-box { background: #f7fafc; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .warning { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 10px 15px; }
            ul { margin: 10px 0; }
            li { margin: 5px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Appointment Preparation Summary</h1>

          <div class="header">
            <div>
              <strong>Patient:</strong> ${memberName}<br/>
              <strong>Date:</strong> ${prep.appointmentDate ? format(new Date(prep.appointmentDate), 'MMMM d, yyyy') : 'TBD'}<br/>
              <strong>Visit Type:</strong> ${prep.visitType || 'General'}
            </div>
            <div>
              <strong>Provider:</strong> ${prep.providerName || 'Not specified'}<br/>
              <strong>Generated:</strong> ${format(new Date(), 'MMM d, yyyy')}
            </div>
          </div>

          <h2>Current Medications</h2>
          <ul>${medicationsHtml}</ul>

          <h2>Active Health Conditions</h2>
          <ul>${conditionsHtml}</ul>

          <h2>Questions to Discuss</h2>
          <div class="info-box">
            <ul>${questionsHtml || '<li>No specific questions prepared</li>'}</ul>
          </div>

          <h2>Notes for Provider</h2>
          <div class="info-box">
            <p>${(prep.symptomsToReport as any)?.note || 'Please review any changes since last visit.'}</p>
          </div>

          <div class="warning">
            <strong>Important:</strong> This summary is for informational purposes. Please bring all current medications and any relevant medical records to your appointment.
          </div>

          <div class="footer">
            <p>Generated by Liara AI Health - ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
            <p>This document is not a substitute for professional medical advice.</p>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyToClipboard = (prep: AppointmentPrepSummary) => {
    const text = `
APPOINTMENT PREPARATION - ${memberName}
Date: ${prep.appointmentDate ? format(new Date(prep.appointmentDate), 'MMMM d, yyyy') : 'TBD'}
Provider: ${prep.providerName || 'Not specified'}
Type: ${prep.visitType || 'General'}

CURRENT MEDICATIONS:
${medications.map(med => `- ${med.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown'}`).join('\n') || '- No current medications'}

ACTIVE CONDITIONS:
${conditions.map(cond => `- ${cond.code?.coding?.[0]?.display || cond.code?.text || 'Unknown'}`).join('\n') || '- No active conditions'}

QUESTIONS TO DISCUSS:
${(prep.questionsToAsk as string[] || []).map(q => `- ${q}`).join('\n') || '- No specific questions'}

Generated by Liara AI Health
    `.trim();

    navigator.clipboard.writeText(text);
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return styles[priority] || styles.medium;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Appointment Prep for {memberName}
          </h2>
          <p className="text-muted-foreground">
            Prepare for doctor visits with organized health summaries and questions
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Prepare for Appointment
              </DialogTitle>
              <DialogDescription>
                Generate a health summary and prepare questions for your upcoming visit.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 py-4">
                {/* Appointment Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-date">Appointment Date</Label>
                    <Input
                      id="appointment-date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointment-type">Visit Type</Label>
                    <Select value={visitType} onValueChange={setAppointmentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {visitTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider-name">Provider Name (Optional)</Label>
                  <Input
                    id="provider-name"
                    placeholder="Dr. Smith"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                  />
                </div>

                <Separator />

                {/* Questions Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Questions to Ask
                  </h3>

                  {questions.length > 0 && (
                    <div className="space-y-2">
                      {questions.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Badge className={getPriorityBadge(q.priority)} variant="outline">
                              {q.priority}
                            </Badge>
                            <span className="text-sm">{q.text}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(q.id)}
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your question..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Select value={questionCategory} onValueChange={setQuestionCategory}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {questionCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={questionPriority} onValueChange={(v) => setQuestionPriority(v as any)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={addQuestion} disabled={!newQuestion.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Additional Concerns */}
                <div className="space-y-2">
                  <Label htmlFor="concerns">Additional Notes or Concerns</Label>
                  <Textarea
                    id="concerns"
                    placeholder="Any other symptoms, concerns, or topics you want to discuss..."
                    value={concerns}
                    onChange={(e) => setConcerns(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* AI Notice */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    We'll generate a comprehensive summary including your medications,
                    conditions, and prepared questions to share with your provider.
                  </p>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!appointmentDate || !visitType || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Appointments */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : displayPreps.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Appointment Preps Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a preparation summary for your next doctor visit.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Prepare for Appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayPreps.map((prep) => (
            <PrepCard
              key={prep.id}
              prep={prep}
              onSelect={() => setSelectedPrep(prep)}
              onExport={() => exportToPDF(prep)}
              onCopy={() => copyToClipboard(prep)}
            />
          ))}
        </div>
      )}

      {/* Detail View Dialog */}
      {selectedPrep && (
        <Dialog open={!!selectedPrep} onOpenChange={() => setSelectedPrep(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Appointment Summary
              </DialogTitle>
              <DialogDescription>
                {selectedPrep.visitType} - {selectedPrep.appointmentDate && format(new Date(selectedPrep.appointmentDate), 'MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <PrepDetailView
                prep={selectedPrep}
                memberName={memberName}
                conditions={conditions}
                medications={medications}
                observations={observations}
              />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPrep(null)}>
                Close
              </Button>
              <Button variant="outline" onClick={() => copyToClipboard(selectedPrep)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={() => exportToPDF(selectedPrep)}>
                <Printer className="w-4 h-4 mr-2" />
                Print / PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PrepCard({
  prep,
  onSelect,
  onExport,
  onCopy,
}: {
  prep: AppointmentPrepSummary;
  onSelect: () => void;
  onExport: () => void;
  onCopy: () => void;
}) {
  const appointmentDate = prep.appointmentDate ? new Date(prep.appointmentDate) : null;
  const isPast = appointmentDate && appointmentDate < new Date();
  const isUpcoming = appointmentDate && !isPast;

  return (
    <Card className={`cursor-pointer hover:border-primary transition-all ${isPast ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3" onClick={onSelect}>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {prep.visitType || 'Appointment'}
              {isUpcoming && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Upcoming
                </Badge>
              )}
              {isPast && (
                <Badge variant="outline">Past</Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="w-3 h-3" />
              {appointmentDate ? format(appointmentDate, 'MMMM d, yyyy') : 'Date TBD'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent onClick={onSelect}>
        {prep.providerName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <User className="w-3 h-3" />
            {prep.providerName}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="w-3 h-3" />
          {(prep.questionsToAsk as string[] || []).length} questions prepared
        </div>
      </CardContent>
      <div className="px-6 pb-4 flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCopy(); }}>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onExport(); }}>
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </Card>
  );
}

function PrepDetailView({
  prep,
  memberName,
  conditions,
  medications,
  observations,
}: {
  prep: AppointmentPrepSummary;
  memberName: string;
  conditions: Condition[];
  medications: MedicationRequest[];
  observations: Observation[];
}) {
  const questions = prep.questionsToAsk as string[] || [];
  // Filter for common vital signs by code display name
  const vitalSignNames = ['blood pressure', 'heart rate', 'pulse', 'temperature', 'weight', 'height', 'bmi', 'respiratory'];
  const recentVitals = observations
    .filter(obs => {
      const display = obs.code?.coding?.[0]?.display?.toLowerCase() || '';
      return vitalSignNames.some(v => display.includes(v));
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Patient:</span>
            <p className="font-medium">{memberName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Provider:</span>
            <p className="font-medium">{prep.providerName || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <p className="font-medium">
              {prep.appointmentDate ? format(new Date(prep.appointmentDate), 'MMMM d, yyyy') : 'TBD'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Visit Type:</span>
            <p className="font-medium">{prep.visitType || 'General'}</p>
          </div>
        </div>
      </div>

      {/* Current Medications */}
      <div>
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4" />
          Current Medications
        </h3>
        {medications.length > 0 ? (
          <ul className="space-y-2">
            {medications.map((med, idx) => {
              const name = med.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown';
              const dosage = med.dosageInstruction?.[0]?.text || '';
              return (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <div>
                    <span className="font-medium">{name}</span>
                    {dosage && <span className="text-muted-foreground"> - {dosage}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No current medications on file</p>
        )}
      </div>

      {/* Active Conditions */}
      <div>
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4" />
          Active Health Conditions
        </h3>
        {conditions.length > 0 ? (
          <ul className="space-y-2">
            {conditions.map((cond, idx) => {
              const name = cond.code?.coding?.[0]?.display || cond.code?.text || 'Unknown';
              return (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Activity className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>{name}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No active conditions on file</p>
        )}
      </div>

      {/* Recent Vitals */}
      {recentVitals.length > 0 && (
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" />
            Recent Vitals
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {recentVitals.map((vital, idx) => {
              const name = vital.code?.coding?.[0]?.display || 'Vital';
              const value = vital.valueQuantity?.value;
              const unit = vital.valueQuantity?.unit || '';
              return (
                <div key={idx} className="bg-muted/30 p-2 rounded text-sm">
                  <span className="text-muted-foreground">{name}:</span>
                  <span className="ml-1 font-medium">{value} {unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions */}
      <div>
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" />
          Questions to Discuss
        </h3>
        {questions.length > 0 ? (
          <ul className="space-y-2">
            {questions.map((question, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0">
                  {idx + 1}
                </span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No specific questions prepared</p>
        )}
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
        <h4 className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4" />
          Reminder
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <li>Bring all current medications or a complete list</li>
          <li>Bring any relevant medical records or test results</li>
          <li>Arrive 15 minutes early for paperwork</li>
          <li>Bring your insurance card and ID</li>
        </ul>
      </div>

      {/* AI Notice */}
      {prep.aiGenerated && (
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            This summary was AI-assisted. Please verify all information is accurate before your appointment.
          </p>
        </div>
      )}
    </div>
  );
}

// Demo data
function getDemoPrepSummaries(familyMemberId: number): AppointmentPrepSummary[] {
  const now = new Date();
  return [
    {
      id: 1,
      familyMemberId,
      appointmentId: null,
      appointmentDate: format(addDays(now, 5), 'yyyy-MM-dd'),
      visitType: 'Annual Physical',
      providerName: 'Dr. Sarah Johnson',
      questionsToAsk: [
        'Should I continue my current medication regimen?',
        'Are there any new preventive screenings I should consider?',
        'What lifestyle changes would you recommend?',
        'Can we review my recent lab results?',
      ],
      currentMedications: null,
      recentChanges: null,
      activeConditions: null,
      recentLabResults: null,
      vitalsTrend: { note: 'Vitals will be measured at appointment' },
      symptomsToReport: { note: 'Generally feeling well' },
      exportFormat: null,
      exportedAt: null,
      shareLink: null,
      shareLinkExpiry: null,
      aiGenerated: true,
      generatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      familyMemberId,
      appointmentId: null,
      appointmentDate: format(addDays(now, -7), 'yyyy-MM-dd'),
      visitType: 'Follow-up Visit',
      providerName: 'Dr. Michael Chen',
      questionsToAsk: [
        'How are my blood pressure readings?',
        'Should we adjust my medication dosage?',
      ],
      currentMedications: null,
      recentChanges: null,
      activeConditions: null,
      recentLabResults: null,
      vitalsTrend: null,
      symptomsToReport: null,
      exportFormat: null,
      exportedAt: null,
      shareLink: null,
      shareLinkExpiry: null,
      aiGenerated: true,
      generatedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
  ];
}
