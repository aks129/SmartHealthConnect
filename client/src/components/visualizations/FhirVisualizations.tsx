import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  Area,
  AreaChart,
  ReferenceLine,
  Legend
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { 
  Activity, 
  Heart, 
  Droplets, 
  Weight, 
  Thermometer,
  TrendingUp,
  AlertTriangle,
  Info,
  Calendar
} from 'lucide-react';
import type { Observation, Condition, MedicationRequest, AllergyIntolerance, Immunization } from '@shared/schema';

interface FhirVisualizationsProps {
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  allergies: AllergyIntolerance[];
  immunizations: Immunization[];
}

// Health thresholds for color coding
const HEALTH_THRESHOLDS = {
  bloodPressureSystolic: { low: 90, normal: 120, high: 140, critical: 180 },
  bloodPressureDiastolic: { low: 60, normal: 80, high: 90, critical: 110 },
  heartRate: { low: 60, normal: 100, high: 120, critical: 150 },
  cholesterol: { optimal: 200, borderline: 240, high: 300 },
  glucose: { low: 70, normal: 100, prediabetic: 126, diabetic: 200 },
  bmi: { underweight: 18.5, normal: 25, overweight: 30, obese: 35 },
  temperature: { low: 97, normal: 99, fever: 100.4, highFever: 103 }
};

// Color schemes for different health metrics
const getThresholdColor = (value: number, metric: keyof typeof HEALTH_THRESHOLDS) => {
  const thresholds = HEALTH_THRESHOLDS[metric];

  switch (metric) {
    case 'bloodPressureSystolic':
    case 'bloodPressureDiastolic':
      if (value < thresholds.low) return '#EF4444'; // red
      if (value <= thresholds.normal) return '#10B981'; // green
      if (value <= thresholds.high) return '#F59E0B'; // amber
      return '#DC2626'; // dark red

    case 'heartRate':
      if (value < thresholds.low || value > thresholds.critical) return '#EF4444';
      if (value <= thresholds.normal) return '#10B981';
      if (value <= thresholds.high) return '#F59E0B';
      return '#DC2626';

    case 'cholesterol':
      if (value <= thresholds.optimal) return '#10B981';
      if (value <= thresholds.borderline) return '#F59E0B';
      return '#EF4444';

    case 'glucose':
      if (value < thresholds.low) return '#EF4444';
      if (value <= thresholds.normal) return '#10B981';
      if (value <= thresholds.prediabetic) return '#F59E0B';
      return '#EF4444';

    case 'bmi':
      if (value < thresholds.underweight) return '#F59E0B';
      if (value <= thresholds.normal) return '#10B981';
      if (value <= thresholds.overweight) return '#F59E0B';
      return '#EF4444';

    case 'temperature':
      if (value < thresholds.low) return '#3B82F6';
      if (value <= thresholds.normal) return '#10B981';
      if (value <= thresholds.fever) return '#F59E0B';
      return '#EF4444';

    default:
      return '#6B7280';
  }
};

const getStatusText = (value: number, metric: keyof typeof HEALTH_THRESHOLDS) => {
  const thresholds = HEALTH_THRESHOLDS[metric];

  switch (metric) {
    case 'bloodPressureSystolic':
    case 'bloodPressureDiastolic':
      if (value < thresholds.low) return 'Low';
      if (value <= thresholds.normal) return 'Normal';
      if (value <= thresholds.high) return 'Elevated';
      return 'High';

    case 'cholesterol':
      if (value <= thresholds.optimal) return 'Optimal';
      if (value <= thresholds.borderline) return 'Borderline';
      return 'High';

    case 'glucose':
      if (value < thresholds.low) return 'Low';
      if (value <= thresholds.normal) return 'Normal';
      if (value <= thresholds.prediabetic) return 'Prediabetic';
      return 'Diabetic';

    default:
      return 'Normal';
  }
};

// Custom tooltip component with enhanced styling
const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const value = data.value;
    const status = getStatusText(value, metric);
    const color = getThresholdColor(value, metric);

    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-800 mb-2">
          {format(new Date(label), 'MMM dd, yyyy')}
        </p>
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-slate-600">
            {data.name}: <span className="font-semibold">{value}</span>
            {data.unit && ` ${data.unit}`}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color }}>
          Status: {status}
        </p>
      </div>
    );
  }
  return null;
};

export function FhirVisualizations({ observations, conditions, medications, allergies, immunizations }: FhirVisualizationsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Process observations into chart data
  const chartData = useMemo(() => {
    const processedData: { [key: string]: any[] } = {};

    // Group observations by type
    const observationGroups = {
      bloodPressure: observations.filter(obs => 
        obs.code?.coding?.some(code => 
          code.code === '85354-9' || // Blood pressure panel
          code.code === '8480-6' ||  // Systolic
          code.code === '8462-4'     // Diastolic
        )
      ),
      heartRate: observations.filter(obs => 
        obs.code?.coding?.some(code => code.code === '8867-4')
      ),
      weight: observations.filter(obs => 
        obs.code?.coding?.some(code => code.code === '29463-7')
      ),
      height: observations.filter(obs => 
        obs.code?.coding?.some(code => code.code === '8302-2')
      ),
      bmi: observations.filter(obs => 
        obs.code?.coding?.some(code => code.code === '39156-5')
      ),
      cholesterol: observations.filter(obs => 
        obs.code?.coding?.some(code => code.code === '2093-3')
      ),
      glucose: observations.filter(obs => 
        obs.code?.coding?.some(code => code.code === '33743-4' || code.code === '2339-0')
      ),
      temperature: observations.filter(obs => 
        obs.code?.coding?.some(code => code.code === '8310-5')
      )
    };

    // Process each group
    Object.entries(observationGroups).forEach(([type, obs]) => {
      processedData[type] = obs
        .filter(o => o.effectiveDateTime && o.valueQuantity?.value)
        .map(o => {
          const date = o.effectiveDateTime;
          const value = o.valueQuantity?.value;
          const unit = o.valueQuantity?.unit;

          if (!date || !value) return null;

          try {
            const parsedDate = typeof date === 'string' ? parseISO(date) : date;
            if (!isValid(parsedDate)) return null;

            return {
              date: parsedDate.toISOString(),
              value: Number(value),
              unit,
              name: type,
              color: getThresholdColor(Number(value), type as keyof typeof HEALTH_THRESHOLDS)
            };
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());
    });

    // Special handling for blood pressure (combine systolic and diastolic)
    const bpSystolic = observations.filter(obs => 
      obs.code?.coding?.some(code => code.code === '8480-6')
    );
    const bpDiastolic = observations.filter(obs => 
      obs.code?.coding?.some(code => code.code === '8462-4')
    );

    if (bpSystolic.length > 0 && bpDiastolic.length > 0) {
      const combinedBP = bpSystolic.map(sysObs => {
        const matchingDias = bpDiastolic.find(diasObs => 
          diasObs.effectiveDateTime === sysObs.effectiveDateTime
        );

        if (matchingDias && sysObs.valueQuantity?.value && matchingDias.valueQuantity?.value) {
          const systolic = Number(sysObs.valueQuantity.value);
          const diastolic = Number(matchingDias.valueQuantity.value);

          return {
            date: sysObs.effectiveDateTime,
            systolic,
            diastolic,
            systolicColor: getThresholdColor(systolic, 'bloodPressureSystolic'),
            diastolicColor: getThresholdColor(diastolic, 'bloodPressureDiastolic')
          };
        }
        return null;
      }).filter(Boolean);

      processedData.bloodPressureCombined = combinedBP;
    }

    return processedData;
  }, [observations]);

  // Filter data by time range
  const filteredData = useMemo(() => {
    const now = new Date();
    const timeRanges = {
      '1month': 30,
      '3months': 90,
      '6months': 180,
      '1year': 365,
      'all': Infinity
    };

    const daysBack = timeRanges[selectedTimeRange as keyof typeof timeRanges];
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    const filtered: { [key: string]: any[] } = {};

    Object.entries(chartData).forEach(([key, data]) => {
      filtered[key] = data.filter(point => 
        new Date(point.date) >= cutoffDate
      );
    });

    return filtered;
  }, [chartData, selectedTimeRange]);

  return (
    <div className="space-y-8">
      {/* Controls */}
      <Card className="health-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Health Trends & Analytics</span>
              </CardTitle>
              <CardDescription>
                Interactive charts with color-coded health thresholds
              </CardDescription>
            </div>

            <div className="flex space-x-3">
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="vitals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="physical">Physical Metrics</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Vital Signs Tab */}
        <TabsContent value="vitals" className="space-y-6">
          {/* Blood Pressure Chart */}
          {filteredData.bloodPressureCombined && filteredData.bloodPressureCombined.length > 0 && (
            <Card className="chart-container">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <span>Blood Pressure Trends</span>
                </CardTitle>
                <CardDescription>
                  Systolic and diastolic pressure over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredData.bloodPressureCombined}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                        stroke="#64748B"
                        fontSize={12}
                      />
                      <YAxis 
                        domain={[60, 180]}
                        stroke="#64748B"
                        fontSize={12}
                      />
                      <Tooltip 
                        content={<CustomTooltip metric="bloodPressureSystolic" />}
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      />

                      {/* Reference lines for normal ranges */}
                      <ReferenceLine y={120} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.6} />
                      <ReferenceLine y={140} stroke="#F59E0B" strokeDasharray="5 5" strokeOpacity={0.6} />
                      <ReferenceLine y={80} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.6} />
                      <ReferenceLine y={90} stroke="#F59E0B" strokeDasharray="5 5" strokeOpacity={0.6} />

                      <Line 
                        type="monotone" 
                        dataKey="systolic" 
                        stroke="#EF4444" 
                        strokeWidth={3}
                        dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                        name="Systolic"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="diastolic" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        name="Diastolic"
                      />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart legend with threshold info */}
                <div className="chart-legend mt-4">
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Normal (&lt;120/80)</span>
                  </div>
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span>Elevated (120-139/80-89)</span>
                  </div>
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>High (≥140/90)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Heart Rate Chart */}
          {filteredData.heartRate && filteredData.heartRate.length > 0 && (
            <Card className="chart-container">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-pink-500" />
                  <span>Heart Rate</span>
                </CardTitle>
                <CardDescription>
                  Heart rate measurements over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData.heartRate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                        stroke="#64748B"
                        fontSize={12}
                      />
                      <YAxis 
                        domain={[40, 160]}
                        stroke="#64748B"
                        fontSize={12}
                      />
                      <Tooltip 
                        content={<CustomTooltip metric="heartRate" />}
                      />

                      {/* Normal range references */}
                      <ReferenceLine y={60} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.6} />
                      <ReferenceLine y={100} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.6} />

                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#EC4899" 
                        fill="url(#heartRateGradient)"
                        strokeWidth={2}
                      />

                      <defs>
                        <linearGradient id="heartRateGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#EC4899" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-legend">
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Normal (60-100 bpm)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lab Results Tab */}
        <TabsContent value="labs" className="space-y-6">
          {/* Cholesterol Chart */}
          {filteredData.cholesterol && filteredData.cholesterol.length > 0 && (
            <Card className="chart-container">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <span>Cholesterol Levels</span>
                </CardTitle>
                <CardDescription>
                  Total cholesterol over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData.cholesterol}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                        stroke="#64748B"
                        fontSize={12}
                      />
                      <YAxis 
                        domain={[100, 350]}
                        stroke="#64748B"
                        fontSize={12}
                      />
                      <Tooltip 
                        content={<CustomTooltip metric="cholesterol" />}
                      />

                      {/* Threshold reference lines */}
                      <ReferenceLine y={200} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.8} />
                      <ReferenceLine y={240} stroke="#F59E0B" strokeDasharray="5 5" strokeOpacity={0.8} />

                      <Bar 
                        dataKey="value" 
                        fill={(entry: any) => entry.color || '#6B7280'}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-legend">
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Optimal (&lt;200 mg/dL)</span>
                  </div>
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span>Borderline (200-239)</span>
                  </div>
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>High (≥240)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Glucose Chart */}
          {filteredData.glucose && filteredData.glucose.length > 0 && (
            <Card className="chart-container">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Droplets className="h-5 w-5 text-orange-500" />
                  <span>Blood Glucose</span>
                </CardTitle>
                <CardDescription>
                  Blood glucose levels over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={filteredData.glucose}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                        stroke="#64748B"
                        fontSize={12}
                        type="category"
                      />
                      <YAxis 
                        domain={[60, 250]}
                        stroke="#64748B"
                        fontSize={12}
                      />
                      <Tooltip 
                        content={<CustomTooltip metric="glucose" />}
                      />

                      {/* Reference lines for glucose levels */}
                      <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="5 5" strokeOpacity={0.6} />
                      <ReferenceLine y={100} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.8} />
                      <ReferenceLine y={126} stroke="#F59E0B" strokeDasharray="5 5" strokeOpacity={0.8} />

                      <Scatter 
                        dataKey="value" 
                        fill="#F97316"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-legend">
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Low (&lt;70 mg/dL)</span>
                  </div>
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Normal (70-100)</span>
                  </div>
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span>Prediabetic (100-126)</span>
                  </div>
                  <div className="chart-legend-item">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Diabetic (≥126)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Physical Metrics Tab */}
        <TabsContent value="physical" className="space-y-6">
          {/* Weight/BMI Chart */}
          {(filteredData.weight?.length > 0 || filteredData.bmi?.length > 0) && (
            <div className="grid-health-detailed">
              {filteredData.weight && filteredData.weight.length > 0 && (
                <Card className="chart-container">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Weight className="h-5 w-5 text-purple-500" />
                      <span>Weight Trends</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredData.weight}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis 
                            dataKey="date"
                            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                            stroke="#64748B"
                            fontSize={12}
                          />
                          <YAxis stroke="#64748B" fontSize={12} />
                          <Tooltip 
                            formatter={(value: any, name: any) => [`${value} ${filteredData.weight[0]?.unit || 'kg'}`, 'Weight']}
                            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#8B5CF6" 
                            strokeWidth={3}
                            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredData.bmi && filteredData.bmi.length > 0 && (
                <Card className="chart-container">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-indigo-500" />
                      <span>BMI Trends</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredData.bmi}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis 
                            dataKey="date"
                            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                            stroke="#64748B"
                            fontSize={12}
                          />
                          <YAxis 
                            domain={[15, 40]}
                            stroke="#64748B"
                            fontSize={12}
                          />
                          <Tooltip 
                            content={<CustomTooltip metric="bmi" />}
                          />

                          {/* BMI category references */}
                          <ReferenceLine y={18.5} stroke="#F59E0B" strokeDasharray="5 5" strokeOpacity={0.6} />
                          <ReferenceLine y={25} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.8} />
                          <ReferenceLine y={30} stroke="#F59E0B" strokeDasharray="5 5" strokeOpacity={0.8} />

                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#6366F1" 
                            fill="url(#bmiGradient)"
                            strokeWidth={2}
                          />

                          <defs>
                            <linearGradient id="bmiGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-legend">
                      <div className="chart-legend-item">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                        <span>Underweight (&lt;18.5)</span>
                      </div>
                      <div className="chart-legend-item">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Normal (18.5-25)</span>
                      </div>
                      <div className="chart-legend-item">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                        <span>Overweight (25-30)</span>
                      </div>
                      <div className="chart-legend-item">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Obese (≥30)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid-health-summary">
            {/* Quick Stats Cards */}
            {Object.entries(filteredData).map(([key, data]) => {
              if (!data || data.length === 0) return null;

              const latest = data[data.length - 1];
              const previous = data.length > 1 ? data[data.length - 2] : null;
              const trend = previous ? (latest.value > previous.value ? 'up' : 'down') : 'stable';

              const iconMap: { [key: string]: JSX.Element } = {
                heartRate: <Heart className="h-5 w-5" />,
                weight: <Weight className="h-5 w-5" />,
                cholesterol: <Droplets className="h-5 w-5" />,
                glucose: <Droplets className="h-5 w-5" />,
                temperature: <Thermometer className="h-5 w-5" />,
                bmi: <Activity className="h-5 w-5" />
              };

              return (
                <div key={key} className="health-card-compact">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        {iconMap[key] || <Activity className="h-5 w-5" />}
                      </div>
                      <h3 className="font-medium text-slate-800 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                    </div>
                    <Badge variant="outline" className={`text-xs ${
                      trend === 'up' ? 'text-green-600' : 
                      trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-slate-800">
                      {latest.value} {latest.unit || ''}
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(latest.date), 'MMM dd')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Availability Info */}
          <Card className="health-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5 text-blue-500" />
                <span>Data Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800">{observations.length}</div>
                  <div className="text-sm text-slate-600">Total Observations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800">{conditions.length}</div>
                  <div className="text-sm text-slate-600">Conditions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800">{medications.length}</div>
                  <div className="text-sm text-slate-600">Medications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800">{allergies.length}</div>
                  <div className="text-sm text-slate-600">Allergies</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}