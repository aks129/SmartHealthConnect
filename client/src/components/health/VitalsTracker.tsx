import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Heart,
  Droplets,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Info,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';

interface VitalsTrackerProps {
  familyMemberId?: number;
}

interface VitalsReading {
  id: number;
  readingDate: string;
  readingTime?: string;
  readingType: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  glucoseValue?: number;
  glucoseContext?: string;
  notes?: string;
  source?: string;
  tags?: string[];
  aiEducation?: {
    summary: string;
    tips: string[];
    resources: { title: string; url: string; type: string }[];
    riskLevel: string;
    category: string;
    trendDirection: string;
    infographic: {
      title: string;
      ranges: { label: string; min: number; max: number; color: string; current: boolean }[];
      currentValue: string;
      unit: string;
    };
  };
}

interface TrendsData {
  bloodPressure: {
    stats: {
      count: number;
      latestSystolic: number;
      latestDiastolic: number;
      avgSystolic: number;
      avgDiastolic: number;
      classification: { category: string; color: string; riskLevel: string } | null;
    } | null;
    chartData: { date: string; time?: string; systolic?: number; diastolic?: number; heartRate?: number }[];
  };
  bloodGlucose: {
    stats: {
      count: number;
      latestValue: number;
      avgValue: number;
      classification: { category: string; color: string; riskLevel: string } | null;
    } | null;
    chartData: { date: string; time?: string; value?: number; context?: string }[];
  };
  education: VitalsReading['aiEducation'] | null;
  totalReadings: number;
}

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  very_high: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-red-200 text-red-900 border-red-300',
};

export function VitalsTracker({ familyMemberId = 1 }: VitalsTrackerProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [readingType, setReadingType] = useState<'blood_pressure' | 'blood_glucose'>('blood_pressure');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [glucoseValue, setGlucoseValue] = useState('');
  const [glucoseContext, setGlucoseContext] = useState('fasting');
  const [notes, setNotes] = useState('');
  const [photoText, setPhotoText] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);

  // Fetch trends
  const { data: trends, isLoading } = useQuery<TrendsData>({
    queryKey: ['/api/vitals', familyMemberId, 'trends'],
    queryFn: async () => {
      const res = await fetch(`/api/vitals/${familyMemberId}/trends`);
      if (!res.ok) throw new Error('Failed to fetch trends');
      return res.json();
    },
    staleTime: Infinity,
  });

  // Fetch readings
  const { data: readings = [] } = useQuery<VitalsReading[]>({
    queryKey: ['/api/vitals', familyMemberId],
    queryFn: async () => {
      const res = await fetch(`/api/vitals/${familyMemberId}?limit=50`);
      if (!res.ok) throw new Error('Failed to fetch readings');
      return res.json();
    },
    staleTime: Infinity,
  });

  // Submit reading
  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/vitals/${familyMemberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ? JSON.stringify(err.error) : 'Failed to save');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vitals', familyMemberId] });
      queryClient.invalidateQueries({ queryKey: ['/api/vitals', familyMemberId, 'trends'] });
      resetForm();
    },
  });

  // Parse photo text
  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/vitals/${familyMemberId}/parse-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Failed to parse');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.parsed) {
        if (data.readingType === 'blood_pressure') {
          setReadingType('blood_pressure');
          setSystolic(String(data.systolic || ''));
          setDiastolic(String(data.diastolic || ''));
          if (data.heartRate) setHeartRate(String(data.heartRate));
        } else if (data.readingType === 'blood_glucose') {
          setReadingType('blood_glucose');
          setGlucoseValue(String(data.glucoseValue || ''));
        }
        setShowPhotoInput(false);
        setShowForm(true);
      }
    },
  });

  function resetForm() {
    setShowForm(false);
    setSystolic('');
    setDiastolic('');
    setHeartRate('');
    setGlucoseValue('');
    setGlucoseContext('fasting');
    setNotes('');
    setPhotoText('');
    setShowPhotoInput(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);

    const data: Record<string, unknown> = {
      readingDate: today,
      readingTime: now,
      readingType,
      notes: notes || undefined,
      source: 'manual',
    };

    if (readingType === 'blood_pressure') {
      data.systolic = parseInt(systolic);
      data.diastolic = parseInt(diastolic);
      if (heartRate) data.heartRate = parseInt(heartRate);
    } else {
      data.glucoseValue = parseInt(glucoseValue);
      data.glucoseContext = glucoseContext;
    }

    submitMutation.mutate(data);
  }

  const latestEducation = readings[0]?.aiEducation || trends?.education;

  return (
    <div className="space-y-6">
      {/* Header with quick actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vitals Tracker</h2>
          <p className="text-muted-foreground">Track blood pressure and blood glucose with personalized education</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowPhotoInput(!showPhotoInput); setShowForm(false); }}
          >
            <Camera className="w-4 h-4 mr-2" />
            From Photo
          </Button>
          <Button size="sm" onClick={() => { setShowForm(!showForm); setShowPhotoInput(false); }}>
            <Plus className="w-4 h-4 mr-2" />
            Log Reading
          </Button>
        </div>
      </div>

      {/* Photo text input (simulated OCR) */}
      {showPhotoInput && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label>Paste or type the text from your meter/monitor reading</Label>
              <Textarea
                value={photoText}
                onChange={(e) => setPhotoText(e.target.value)}
                placeholder='e.g., "BP 135/85 mmHg Pulse 72 bpm" or "Glucose: 105 mg/dL"'
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => parseMutation.mutate(photoText)}
                  disabled={!photoText.trim() || parseMutation.isPending}
                  size="sm"
                >
                  Parse Reading
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowPhotoInput(false)}>
                  Cancel
                </Button>
              </div>
              {parseMutation.data && !parseMutation.data.parsed && (
                <p className="text-sm text-orange-600">{parseMutation.data.message}</p>
              )}
              {parseMutation.data?.parsed && (
                <p className="text-sm text-green-600">Values detected! Review and submit below.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log New Reading</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Reading Type</Label>
                <Select value={readingType} onValueChange={(v) => setReadingType(v as 'blood_pressure' | 'blood_glucose')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blood_pressure">
                      <span className="flex items-center gap-2"><Heart className="w-4 h-4" /> Blood Pressure</span>
                    </SelectItem>
                    <SelectItem value="blood_glucose">
                      <span className="flex items-center gap-2"><Droplets className="w-4 h-4" /> Blood Glucose</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {readingType === 'blood_pressure' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Systolic (mmHg)</Label>
                    <Input type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="120" required min={50} max={300} />
                  </div>
                  <div>
                    <Label>Diastolic (mmHg)</Label>
                    <Input type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="80" required min={20} max={200} />
                  </div>
                  <div>
                    <Label>Heart Rate (bpm)</Label>
                    <Input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72" min={30} max={250} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Glucose (mg/dL)</Label>
                    <Input type="number" value={glucoseValue} onChange={(e) => setGlucoseValue(e.target.value)} placeholder="100" required min={20} max={600} />
                  </div>
                  <div>
                    <Label>Context</Label>
                    <Select value={glucoseContext} onValueChange={setGlucoseContext}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fasting">Fasting</SelectItem>
                        <SelectItem value="before_meal">Before Meal</SelectItem>
                        <SelectItem value="after_meal">After Meal</SelectItem>
                        <SelectItem value="bedtime">Bedtime</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., feeling stressed, after exercise..." />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Saving...' : 'Save Reading'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
              </div>

              {submitMutation.isError && (
                <p className="text-sm text-red-600">Error: {submitMutation.error?.message}</p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blood Pressure Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <CardTitle className="text-lg">Blood Pressure</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {trends?.bloodPressure?.stats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">
                      {trends.bloodPressure.stats.latestSystolic}/{trends.bloodPressure.stats.latestDiastolic}
                    </p>
                    <p className="text-sm text-muted-foreground">mmHg · Latest reading</p>
                  </div>
                  {trends.bloodPressure.stats.classification && (
                    <Badge className={riskColors[trends.bloodPressure.stats.classification.riskLevel] || ''}>
                      {trends.bloodPressure.stats.classification.category}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Average: {trends.bloodPressure.stats.avgSystolic}/{trends.bloodPressure.stats.avgDiastolic} mmHg
                  · {trends.bloodPressure.stats.count} readings
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No blood pressure readings yet</p>
                <Button variant="link" size="sm" onClick={() => { setReadingType('blood_pressure'); setShowForm(true); }}>
                  Log your first reading
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blood Glucose Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Blood Glucose</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {trends?.bloodGlucose?.stats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{trends.bloodGlucose.stats.latestValue}</p>
                    <p className="text-sm text-muted-foreground">mg/dL · Latest reading</p>
                  </div>
                  {trends.bloodGlucose.stats.classification && (
                    <Badge className={riskColors[trends.bloodGlucose.stats.classification.riskLevel] || ''}>
                      {trends.bloodGlucose.stats.classification.category}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Average: {trends.bloodGlucose.stats.avgValue} mg/dL
                  · {trends.bloodGlucose.stats.count} readings
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Droplets className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No blood glucose readings yet</p>
                <Button variant="link" size="sm" onClick={() => { setReadingType('blood_glucose'); setShowForm(true); }}>
                  Log your first reading
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {(trends?.bloodPressure?.chartData?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Blood Pressure Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trends!.bloodPressure.chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis domain={[40, 200]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} mmHg`, name === 'systolic' ? 'Systolic' : 'Diastolic']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '120', fontSize: 10 }} />
                <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '140', fontSize: 10 }} />
                <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="systolic" />
                <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="diastolic" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {(trends?.bloodGlucose?.chartData?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Droplets className="w-5 h-5" />
              Blood Glucose Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trends!.bloodGlucose.chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis domain={[40, 300]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} mg/dL`, 'Glucose']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '70', fontSize: 10 }} />
                <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '100', fontSize: 10 }} />
                <ReferenceLine y={126} stroke="#f97316" strokeDasharray="3 3" label={{ value: '126', fontSize: 10 }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Health Education Section */}
      {latestEducation && (
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Personalized Health Education</CardTitle>
              {latestEducation.trendDirection && (
                <Badge variant="outline" className="ml-auto">
                  {latestEducation.trendDirection === 'improving' && <TrendingDown className="w-3 h-3 mr-1 text-green-600" />}
                  {latestEducation.trendDirection === 'rising' && <TrendingUp className="w-3 h-3 mr-1 text-red-600" />}
                  {latestEducation.trendDirection === 'stable' && <Minus className="w-3 h-3 mr-1" />}
                  Trend: {latestEducation.trendDirection}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Infographic gauge */}
            {latestEducation.infographic && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{latestEducation.infographic.title}</h4>
                <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                  {latestEducation.infographic.ranges.map((range) => (
                    <div
                      key={range.label}
                      className={`flex items-center justify-center text-xs font-medium text-white relative ${range.current ? 'ring-2 ring-offset-1 ring-black' : ''}`}
                      style={{
                        backgroundColor: range.color,
                        flex: range.max - range.min,
                      }}
                      title={`${range.label}: ${range.min}-${range.max}`}
                    >
                      {range.label}
                    </div>
                  ))}
                </div>
                <p className="text-center font-bold text-lg">
                  {latestEducation.infographic.currentValue} {latestEducation.infographic.unit}
                </p>
              </div>
            )}

            {/* Summary */}
            <div className={`p-3 rounded-lg border ${riskColors[latestEducation.riskLevel] || 'bg-gray-50'}`}>
              {latestEducation.riskLevel === 'critical' && (
                <div className="flex items-center gap-2 mb-2 font-bold text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  Seek immediate medical attention
                </div>
              )}
              <p className="text-sm">{latestEducation.summary}</p>
            </div>

            {/* Tips */}
            {latestEducation.tips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Recommended Actions
                </h4>
                <ul className="space-y-1">
                  {latestEducation.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">-</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resources */}
            {latestEducation.resources.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Info className="w-4 h-4 text-blue-600" />
                  Learn More
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {latestEducation.resources.map((res, i) => (
                    <a
                      key={i}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent transition-colors text-sm"
                    >
                      <Badge variant="outline" className="text-xs shrink-0">
                        {res.type}
                      </Badge>
                      <span className="truncate">{res.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground italic mt-4">
              This educational content is for informational purposes only and does not constitute medical advice.
              Always consult your healthcare provider about your readings and treatment plan.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Readings Log */}
      {readings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Readings</CardTitle>
            <CardDescription>{readings.length} total readings logged</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readings.slice(0, 10).map((reading) => (
                <div key={reading.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {reading.readingType === 'blood_pressure' ? (
                      <Heart className="w-4 h-4 text-red-500" />
                    ) : (
                      <Droplets className="w-4 h-4 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {reading.readingType === 'blood_pressure'
                          ? `${reading.systolic}/${reading.diastolic} mmHg`
                          : `${reading.glucoseValue} mg/dL`}
                        {reading.heartRate && ` · ${reading.heartRate} bpm`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reading.readingDate}
                        {reading.readingTime && ` at ${reading.readingTime}`}
                        {reading.glucoseContext && ` · ${reading.glucoseContext.replace('_', ' ')}`}
                        {reading.notes && ` · ${reading.notes}`}
                      </p>
                    </div>
                  </div>
                  {reading.aiEducation && (
                    <Badge className={riskColors[reading.aiEducation.riskLevel] || ''} variant="outline">
                      {reading.aiEducation.category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && readings.length === 0 && !showForm && !showPhotoInput && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Start Tracking Your Vitals</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Log your blood pressure and blood glucose readings to see trends,
              get personalized health education, and prepare for provider visits.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setReadingType('blood_pressure'); setShowForm(true); }}>
                <Heart className="w-4 h-4 mr-2" />
                Log Blood Pressure
              </Button>
              <Button variant="outline" onClick={() => { setReadingType('blood_glucose'); setShowForm(true); }}>
                <Droplets className="w-4 h-4 mr-2" />
                Log Blood Glucose
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
