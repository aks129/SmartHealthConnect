import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  Plus,
  Smile,
  Frown,
  Meh,
  Activity,
  Moon,
  Utensils,
  Pill,
  ThermometerSun,
  Calendar,
  Clock,
  Tag,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { format, formatDistanceToNow, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import type { HealthJournalEntry } from '@shared/schema';

interface HealthJournalProps {
  familyMemberId: number;
  memberName: string;
  conditions?: Array<{ code?: { coding?: Array<{ display?: string }> } }>;
  medications?: Array<{ medicationCodeableConcept?: { coding?: Array<{ display?: string }> } }>;
}

interface JournalEntryForm {
  entryType: 'symptom' | 'mood' | 'activity' | 'medication' | 'meal' | 'sleep' | 'note';
  entryDate: string;
  entryTime: string;
  title: string;
  content: string;
  mood: number;
  moodTags: string[];
  symptoms: Array<{ name: string; severity: number; location?: string }>;
  sleepHours: number;
  sleepQuality: number;
  activityType: string;
  activityDuration: number;
  activityIntensity: 'light' | 'moderate' | 'vigorous';
  medicationsTaken: Array<{ name: string; dose?: string; taken: boolean }>;
  tags: string[];
}

const moodEmojis = [
  { value: 1, emoji: '😫', label: 'Terrible' },
  { value: 2, emoji: '😢', label: 'Very Bad' },
  { value: 3, emoji: '😔', label: 'Bad' },
  { value: 4, emoji: '😕', label: 'Not Great' },
  { value: 5, emoji: '😐', label: 'Okay' },
  { value: 6, emoji: '🙂', label: 'Fine' },
  { value: 7, emoji: '😊', label: 'Good' },
  { value: 8, emoji: '😄', label: 'Very Good' },
  { value: 9, emoji: '😁', label: 'Great' },
  { value: 10, emoji: '🤩', label: 'Excellent' },
];

const moodTagOptions = [
  'anxious', 'calm', 'energetic', 'tired', 'stressed', 'relaxed',
  'focused', 'scattered', 'hopeful', 'worried', 'grateful', 'frustrated',
  'motivated', 'unmotivated', 'social', 'withdrawn'
];

const commonSymptoms = [
  'Headache', 'Fatigue', 'Nausea', 'Dizziness', 'Pain', 'Shortness of breath',
  'Chest tightness', 'Joint pain', 'Back pain', 'Stomach ache', 'Cough',
  'Congestion', 'Sore throat', 'Fever', 'Chills', 'Sweating', 'Insomnia',
  'Brain fog', 'Anxiety', 'Heart palpitations'
];

const activityTypes = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Strength Training',
  'Stretching', 'Dancing', 'Sports', 'Hiking', 'Gardening', 'Housework', 'Other'
];

export function HealthJournal({ familyMemberId, memberName, conditions = [], medications = [] }: HealthJournalProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'symptom' | 'mood' | 'activity' | 'medication'>('all');
  const [selectedEntry, setSelectedEntry] = useState<HealthJournalEntry | null>(null);
  const queryClient = useQueryClient();

  const today = new Date();
  const [form, setForm] = useState<JournalEntryForm>({
    entryType: 'mood',
    entryDate: format(today, 'yyyy-MM-dd'),
    entryTime: format(today, 'HH:mm'),
    title: '',
    content: '',
    mood: 5,
    moodTags: [],
    symptoms: [],
    sleepHours: 7,
    sleepQuality: 5,
    activityType: '',
    activityDuration: 30,
    activityIntensity: 'moderate',
    medicationsTaken: medications.map(m => ({
      name: m.medicationCodeableConcept?.coding?.[0]?.display || '',
      taken: false
    })).filter(m => m.name),
    tags: [],
  });

  // Fetch journal entries
  const { data: entries = [], isLoading } = useQuery<HealthJournalEntry[]>({
    queryKey: ['/api/family/members', familyMemberId, 'journal'],
    queryFn: async () => {
      const response = await fetch(`/api/family/members/${familyMemberId}/journal`);
      if (!response.ok) {
        return getDemoEntries(familyMemberId);
      }
      return response.json();
    },
  });

  // Add entry mutation
  const addEntryMutation = useMutation({
    mutationFn: async (entry: Partial<JournalEntryForm>) => {
      const response = await fetch(`/api/family/members/${familyMemberId}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!response.ok) throw new Error('Failed to add journal entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family/members', familyMemberId, 'journal'] });
      setIsAddDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    const now = new Date();
    setForm({
      entryType: 'mood',
      entryDate: format(now, 'yyyy-MM-dd'),
      entryTime: format(now, 'HH:mm'),
      title: '',
      content: '',
      mood: 5,
      moodTags: [],
      symptoms: [],
      sleepHours: 7,
      sleepQuality: 5,
      activityType: '',
      activityDuration: 30,
      activityIntensity: 'moderate',
      medicationsTaken: medications.map(m => ({
        name: m.medicationCodeableConcept?.coding?.[0]?.display || '',
        taken: false
      })).filter(m => m.name),
      tags: [],
    });
  };

  const handleAddEntry = () => {
    addEntryMutation.mutate({
      entryType: form.entryType,
      entryDate: form.entryDate,
      entryTime: form.entryTime,
      title: form.title || getDefaultTitle(form.entryType),
      content: form.content,
      mood: form.entryType === 'mood' ? form.mood : undefined,
      moodTags: form.entryType === 'mood' ? form.moodTags : undefined,
      symptoms: form.entryType === 'symptom' ? form.symptoms : undefined,
      sleepHours: form.entryType === 'sleep' ? form.sleepHours : undefined,
      sleepQuality: form.entryType === 'sleep' ? form.sleepQuality : undefined,
      activityType: form.entryType === 'activity' ? form.activityType : undefined,
      activityDuration: form.entryType === 'activity' ? form.activityDuration : undefined,
      activityIntensity: form.entryType === 'activity' ? form.activityIntensity : undefined,
      medicationsTaken: form.entryType === 'medication' ? form.medicationsTaken : undefined,
      tags: form.tags,
    });
  };

  const getDefaultTitle = (type: string) => {
    const titles: Record<string, string> = {
      mood: 'Mood Check-in',
      symptom: 'Symptom Log',
      activity: 'Activity Log',
      medication: 'Medication Check',
      sleep: 'Sleep Log',
      meal: 'Meal Log',
      note: 'Health Note',
    };
    return titles[type] || 'Journal Entry';
  };

  const filteredEntries = activeTab === 'all'
    ? entries
    : entries.filter(e => e.entryType === activeTab);

  // Calculate weekly mood average
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekMoods = entries
    .filter(e => e.entryType === 'mood' && e.mood)
    .filter(e => {
      const entryDate = new Date(e.entryDate);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
  const avgMood = weekMoods.length > 0
    ? Math.round(weekMoods.reduce((sum, e) => sum + (e.mood || 0), 0) / weekMoods.length * 10) / 10
    : null;

  // Calculate symptom frequency
  const symptomCounts: Record<string, number> = {};
  entries
    .filter(e => e.entryType === 'symptom' && e.symptoms)
    .forEach(e => {
      const symptoms = e.symptoms as Array<{ name: string }>;
      symptoms.forEach(s => {
        symptomCounts[s.name] = (symptomCounts[s.name] || 0) + 1;
      });
    });
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Health Journal</CardTitle>
                <CardDescription>
                  Track symptoms, mood, and daily health for {memberName}
                </CardDescription>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Journal Entry</DialogTitle>
                  <DialogDescription>
                    Record your health observations for {memberName}
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={form.entryType} onValueChange={(v: any) => setForm({ ...form, entryType: v })}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="mood">
                      <Smile className="w-4 h-4 mr-1" />
                      Mood
                    </TabsTrigger>
                    <TabsTrigger value="symptom">
                      <ThermometerSun className="w-4 h-4 mr-1" />
                      Symptom
                    </TabsTrigger>
                    <TabsTrigger value="activity">
                      <Activity className="w-4 h-4 mr-1" />
                      Activity
                    </TabsTrigger>
                    <TabsTrigger value="medication">
                      <Pill className="w-4 h-4 mr-1" />
                      Meds
                    </TabsTrigger>
                  </TabsList>

                  {/* Date/Time for all types */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={form.entryDate}
                        onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={form.entryTime}
                        onChange={(e) => setForm({ ...form, entryTime: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Mood Entry */}
                  <TabsContent value="mood" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <Label>How are you feeling? ({form.mood}/10)</Label>
                      <div className="flex justify-between text-2xl">
                        {moodEmojis.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setForm({ ...form, mood: m.value })}
                            className={`p-2 rounded-full transition-all ${
                              form.mood === m.value
                                ? 'bg-purple-100 dark:bg-purple-900 scale-125'
                                : 'hover:bg-muted'
                            }`}
                            title={m.label}
                          >
                            {m.emoji}
                          </button>
                        ))}
                      </div>
                      <p className="text-center text-muted-foreground">
                        {moodEmojis.find(m => m.value === form.mood)?.label}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>What's influencing your mood?</Label>
                      <div className="flex flex-wrap gap-2">
                        {moodTagOptions.map((tag) => (
                          <Badge
                            key={tag}
                            variant={form.moodTags.includes(tag) ? 'default' : 'outline'}
                            className="cursor-pointer capitalize"
                            onClick={() => {
                              setForm({
                                ...form,
                                moodTags: form.moodTags.includes(tag)
                                  ? form.moodTags.filter(t => t !== tag)
                                  : [...form.moodTags, tag]
                              });
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder="Any thoughts or observations..."
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* Symptom Entry */}
                  <TabsContent value="symptom" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>What symptoms are you experiencing?</Label>
                      <div className="flex flex-wrap gap-2">
                        {commonSymptoms.map((symptom) => {
                          const isSelected = form.symptoms.some(s => s.name === symptom);
                          return (
                            <Badge
                              key={symptom}
                              variant={isSelected ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => {
                                if (isSelected) {
                                  setForm({
                                    ...form,
                                    symptoms: form.symptoms.filter(s => s.name !== symptom)
                                  });
                                } else {
                                  setForm({
                                    ...form,
                                    symptoms: [...form.symptoms, { name: symptom, severity: 5 }]
                                  });
                                }
                              }}
                            >
                              {symptom}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {form.symptoms.length > 0 && (
                      <div className="space-y-4">
                        <Label>Severity for each symptom</Label>
                        {form.symptoms.map((symptom, idx) => (
                          <div key={symptom.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{symptom.name}</span>
                              <span className="text-sm text-muted-foreground">{symptom.severity}/10</span>
                            </div>
                            <Slider
                              value={[symptom.severity]}
                              onValueChange={([value]) => {
                                const updated = [...form.symptoms];
                                updated[idx] = { ...updated[idx], severity: value };
                                setForm({ ...form, symptoms: updated });
                              }}
                              max={10}
                              min={1}
                              step={1}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Additional notes</Label>
                      <Textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder="Describe when it started, what makes it better/worse..."
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* Activity Entry */}
                  <TabsContent value="activity" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Activity Type</Label>
                      <Select
                        value={form.activityType}
                        onValueChange={(v) => setForm({ ...form, activityType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {activityTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration: {form.activityDuration} minutes</Label>
                      <Slider
                        value={[form.activityDuration]}
                        onValueChange={([value]) => setForm({ ...form, activityDuration: value })}
                        max={180}
                        min={5}
                        step={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Intensity</Label>
                      <div className="flex gap-2">
                        {(['light', 'moderate', 'vigorous'] as const).map((intensity) => (
                          <Button
                            key={intensity}
                            type="button"
                            variant={form.activityIntensity === intensity ? 'default' : 'outline'}
                            onClick={() => setForm({ ...form, activityIntensity: intensity })}
                            className="flex-1 capitalize"
                          >
                            {intensity}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder="How did you feel during/after?"
                        rows={2}
                      />
                    </div>
                  </TabsContent>

                  {/* Medication Entry */}
                  <TabsContent value="medication" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <Label>Medications</Label>
                      {form.medicationsTaken.length > 0 ? (
                        form.medicationsTaken.map((med, idx) => (
                          <div key={med.name} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={med.taken}
                                onCheckedChange={(checked) => {
                                  const updated = [...form.medicationsTaken];
                                  updated[idx] = { ...updated[idx], taken: checked };
                                  setForm({ ...form, medicationsTaken: updated });
                                }}
                              />
                              <div>
                                <p className="font-medium">{med.name}</p>
                                {med.dose && <p className="text-sm text-muted-foreground">{med.dose}</p>}
                              </div>
                            </div>
                            {med.taken ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No medications on file</p>
                          <p className="text-sm">Connect health records to import medications</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (side effects, missed doses, etc.)</Label>
                      <Textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder="Any observations about your medications..."
                        rows={2}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEntry} disabled={addEntryMutation.isPending}>
                    Save Entry
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {/* Quick Stats */}
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Smile className="w-4 h-4" />
                Weekly Mood
              </div>
              <div className="text-2xl font-bold">
                {avgMood ? (
                  <span className="flex items-center gap-2">
                    {avgMood}
                    <span className="text-lg">{moodEmojis.find(m => m.value === Math.round(avgMood))?.emoji}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <BookOpen className="w-4 h-4" />
                Entries
              </div>
              <div className="text-2xl font-bold">{entries.length}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ThermometerSun className="w-4 h-4" />
                Symptoms Tracked
              </div>
              <div className="text-2xl font-bold">{Object.keys(symptomCounts).length}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Sparkles className="w-4 h-4" />
                AI Insights
              </div>
              <div className="text-2xl font-bold text-purple-600">3</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Journal Entries</CardTitle>
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="mood">Mood</TabsTrigger>
                    <TabsTrigger value="symptom">Symptoms</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {filteredEntries.length > 0 ? (
                  <div className="space-y-3">
                    {filteredEntries.map((entry) => (
                      <JournalEntryCard
                        key={entry.id}
                        entry={entry}
                        onClick={() => setSelectedEntry(entry)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No entries yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start tracking your health journey
                    </p>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Entry
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Insights Sidebar */}
        <div className="space-y-4">
          {/* Top Symptoms */}
          {topSymptoms.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Most Reported Symptoms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topSymptoms.map(([symptom, count]) => (
                    <div key={symptom} className="flex items-center justify-between">
                      <span className="text-sm">{symptom}</span>
                      <Badge variant="secondary">{count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                AI Health Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="text-sm">
                  <strong>Pattern detected:</strong> Your mood tends to be higher on days with physical activity.
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <p className="text-sm">
                  <strong>Heads up:</strong> Headache occurrences have increased this week.
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm">
                  <strong>Great work:</strong> Medication adherence improved to 95% this month!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function JournalEntryCard({ entry, onClick }: { entry: HealthJournalEntry; onClick: () => void }) {
  const getEntryIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      mood: <Smile className="w-4 h-4" />,
      symptom: <ThermometerSun className="w-4 h-4" />,
      activity: <Activity className="w-4 h-4" />,
      medication: <Pill className="w-4 h-4" />,
      sleep: <Moon className="w-4 h-4" />,
      meal: <Utensils className="w-4 h-4" />,
      note: <BookOpen className="w-4 h-4" />,
    };
    return icons[type] || <BookOpen className="w-4 h-4" />;
  };

  const getEntryColor = (type: string) => {
    const colors: Record<string, string> = {
      mood: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      symptom: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      activity: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medication: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sleep: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      meal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      note: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div
      className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Badge className={getEntryColor(entry.entryType)}>
            {getEntryIcon(entry.entryType)}
          </Badge>
          <div>
            <h4 className="font-medium">{entry.title || 'Journal Entry'}</h4>
            <p className="text-sm text-muted-foreground">
              {format(new Date(entry.entryDate), 'MMM d, yyyy')}
              {entry.entryTime && ` at ${entry.entryTime}`}
            </p>
          </div>
        </div>
        {entry.entryType === 'mood' && entry.mood && (
          <span className="text-xl">
            {moodEmojis.find(m => m.value === entry.mood)?.emoji}
          </span>
        )}
      </div>
      {entry.content && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {entry.content}
        </p>
      )}
      {entry.entryType === 'symptom' && entry.symptoms ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {(entry.symptoms as Array<{ name: string }>).slice(0, 3).map((s) => (
            <Badge key={s.name} variant="outline" className="text-xs">
              {s.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Demo entries for when API is not available
function getDemoEntries(familyMemberId: number): HealthJournalEntry[] {
  const today = new Date();
  return [
    {
      id: 1,
      familyMemberId,
      entryDate: format(today, 'yyyy-MM-dd'),
      entryTime: '08:30',
      entryType: 'mood',
      title: 'Morning Check-in',
      content: 'Feeling well-rested after a good night\'s sleep. Ready for the day!',
      mood: 8,
      moodTags: ['energetic', 'calm'] as any,
      symptoms: null,
      sleepHours: null,
      sleepQuality: null,
      activityType: null,
      activityDuration: null,
      activityIntensity: null,
      medicationsTaken: null,
      aiCorrelations: null,
      tags: null,
      attachments: null,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: 2,
      familyMemberId,
      entryDate: format(new Date(today.getTime() - 86400000), 'yyyy-MM-dd'),
      entryTime: '14:00',
      entryType: 'symptom',
      title: 'Afternoon Headache',
      content: 'Mild headache started after lunch. May be related to skipping morning coffee.',
      mood: null,
      moodTags: null,
      symptoms: [{ name: 'Headache', severity: 4, location: 'temples' }] as any,
      sleepHours: null,
      sleepQuality: null,
      activityType: null,
      activityDuration: null,
      activityIntensity: null,
      medicationsTaken: null,
      aiCorrelations: { possibleTriggers: ['caffeine withdrawal', 'dehydration'] } as any,
      tags: null,
      attachments: null,
      createdAt: new Date(today.getTime() - 86400000),
      updatedAt: new Date(today.getTime() - 86400000),
    },
    {
      id: 3,
      familyMemberId,
      entryDate: format(new Date(today.getTime() - 172800000), 'yyyy-MM-dd'),
      entryTime: '18:30',
      entryType: 'activity',
      title: 'Evening Walk',
      content: 'Nice 30 minute walk around the neighborhood.',
      mood: null,
      moodTags: null,
      symptoms: null,
      sleepHours: null,
      sleepQuality: null,
      activityType: 'Walking',
      activityDuration: 30,
      activityIntensity: 'moderate',
      medicationsTaken: null,
      aiCorrelations: null,
      tags: ['outdoor', 'cardio'] as any,
      attachments: null,
      createdAt: new Date(today.getTime() - 172800000),
      updatedAt: new Date(today.getTime() - 172800000),
    },
  ];
}
