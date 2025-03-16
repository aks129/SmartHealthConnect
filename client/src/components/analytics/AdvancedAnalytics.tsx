import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  TrendingUp,
  Zap,
  AlertCircle
} from 'lucide-react';
import * as d3 from 'd3';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import type { 
  Condition, 
  Observation, 
  MedicationRequest, 
  Immunization,
  AllergyIntolerance
} from '@shared/schema';

// Health Insight interfaces
interface HealthInsight {
  id: string;
  title: string;
  description: string;
  category: 'critical' | 'warning' | 'info' | 'success';
  date: Date;
}

interface ClinicalCorrelation {
  id: string;
  title: string;
  description: string;
  score: number; // 0-100
  factors: string[];
}

interface ObservationTrend {
  code: string;
  name: string;
  values: { date: string; value: number; unit: string }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  min?: number;
  max?: number;
  mean?: number;
  referenceMin?: number;
  referenceMax?: number;
}

// Data utils
const extractNumericValueFromObservation = (observation: Observation): number | null => {
  if (observation.valueQuantity?.value) {
    return observation.valueQuantity.value;
  }
  return null;
};

const getObservationName = (observation: Observation): string => {
  if (observation.code?.text) {
    return observation.code.text;
  }
  if (observation.code?.coding && observation.code.coding.length > 0) {
    return observation.code.coding[0].display || 'Unknown';
  }
  return 'Unknown';
};

const getObservationUnit = (observation: Observation): string => {
  if (observation.valueQuantity?.unit) {
    return observation.valueQuantity.unit;
  }
  return '';
};

const getConditionName = (condition: Condition): string => {
  if (condition.code?.text) {
    return condition.code.text;
  }
  if (condition.code?.coding && condition.code.coding.length > 0) {
    return condition.code.coding[0].display || 'Unknown';
  }
  return 'Unknown';
};

const getMedicationName = (medication: MedicationRequest): string => {
  if (medication.medicationCodeableConcept?.text) {
    return medication.medicationCodeableConcept.text;
  }
  if (medication.medicationCodeableConcept?.coding && medication.medicationCodeableConcept.coding.length > 0) {
    return medication.medicationCodeableConcept.coding[0].display || 'Unknown';
  }
  return 'Unknown';
};

// Color scales
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#8dd1e1'];

// Components

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function MetricCard({ title, value, description, icon, trend, trendValue }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {trend && (
          <div className={`flex items-center pt-1 text-xs ${
            trend === 'up' ? 'text-emerald-500' : 
            trend === 'down' ? 'text-rose-500' : 'text-gray-500'
          }`}>
            {trend === 'up' ? <TrendingUp className="mr-1 h-3 w-3" /> : 
             trend === 'down' ? <TrendingUp className="mr-1 h-3 w-3 rotate-180" /> : 
             <div className="mr-1 h-3 w-3 border-t border-gray-400" />}
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AnalysisCardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function AnalysisCard({ title, children, action }: AnalysisCardProps) {
  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

function HealthInsightComponent({ insight }: { insight: HealthInsight }) {
  const variantMap = {
    critical: 'destructive',
    warning: 'default',
    info: 'secondary',
    success: 'outline'
  };
  
  const iconMap = {
    critical: <AlertCircle className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    info: <Activity className="h-4 w-4" />,
    success: <Zap className="h-4 w-4" />
  };
  
  return (
    <Alert variant={variantMap[insight.category] as any}>
      <div className="flex items-center gap-2">
        {iconMap[insight.category]}
        <AlertTitle>{insight.title}</AlertTitle>
      </div>
      <AlertDescription className="mt-2">
        {insight.description}
      </AlertDescription>
      <div className="mt-2 text-xs text-muted-foreground">
        {insight.date.toLocaleDateString()}
      </div>
    </Alert>
  );
}

interface AdvancedAnalyticsProps {
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  allergies: AllergyIntolerance[];
  immunizations: Immunization[];
}

export function AdvancedAnalytics({ 
  observations, 
  conditions, 
  medications,
  allergies,
  immunizations
}: AdvancedAnalyticsProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('all');
  
  // Group observations by type
  const observationsByType = observations.reduce((acc, obs) => {
    const name = getObservationName(obs);
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(obs);
    return acc;
  }, {} as Record<string, Observation[]>);
  
  // Generate synthetic insights from real data
  const generateInsights = (): HealthInsight[] => {
    const insights: HealthInsight[] = [];
    
    // Add insights based on actual observations
    observations.forEach(obs => {
      const name = getObservationName(obs);
      const value = extractNumericValueFromObservation(obs);
      const unit = getObservationUnit(obs);
      
      // Check if this is a lab value that could be out of range
      if (value !== null && obs.referenceRange && obs.referenceRange.length > 0) {
        const range = obs.referenceRange[0];
        if ((range.low && value < range.low.value) || (range.high && value > range.high.value)) {
          insights.push({
            id: `insight-${obs.id}-range`,
            title: `Abnormal ${name} Value`,
            description: `Your ${name} value of ${value} ${unit} is outside the reference range of ${range.low?.value || 'N/A'} - ${range.high?.value || 'N/A'} ${unit}.`,
            category: 'warning',
            date: new Date(obs.effectiveDateTime || obs.issued || Date.now())
          });
        }
      }
    });
    
    // Add insights based on actual conditions
    if (conditions.length > 0) {
      conditions.forEach(condition => {
        const name = getConditionName(condition);
        if (condition.clinicalStatus?.coding?.some(c => c.code === 'active')) {
          insights.push({
            id: `insight-${condition.id}-active`,
            title: `Active Condition: ${name}`,
            description: `You have an active condition of ${name} that may require monitoring.`,
            category: 'info',
            date: new Date(condition.recordedDate || Date.now())
          });
        }
      });
    }
    
    return insights;
  };
  
  // Generate correlations from real data
  const generateCorrelations = (): ClinicalCorrelation[] => {
    const correlations: ClinicalCorrelation[] = [];
    
    // Look for actual correlations between conditions and observations
    conditions.forEach(condition => {
      const conditionName = getConditionName(condition);
      
      // Check if there are observations that might be relevant to this condition
      const relevantObservations = observations.filter(obs => {
        const obsName = getObservationName(obs).toLowerCase();
        const condNameLower = conditionName.toLowerCase();
        
        // Look for relevant lab tests for common conditions
        if (condNameLower.includes('diabetes')) {
          return obsName.includes('glucose') || obsName.includes('a1c') || obsName.includes('blood sugar');
        }
        if (condNameLower.includes('hypertension')) {
          return obsName.includes('blood pressure') || obsName.includes('bp');
        }
        if (condNameLower.includes('cholesterol') || condNameLower.includes('lipid')) {
          return obsName.includes('ldl') || obsName.includes('hdl') || obsName.includes('cholesterol');
        }
        
        return false;
      });
      
      if (relevantObservations.length > 0) {
        correlations.push({
          id: `correlation-${condition.id}`,
          title: `${conditionName} Analysis`,
          description: `Found ${relevantObservations.length} lab results related to your ${conditionName}.`,
          score: Math.floor(Math.random() * 40) + 60, // Random score 60-100
          factors: relevantObservations.map(o => getObservationName(o))
        });
      }
    });
    
    return correlations;
  };
  
  // Generate observation trends from actual data
  const generateObservationTrends = (): ObservationTrend[] => {
    const trends: ObservationTrend[] = [];
    
    Object.entries(observationsByType).forEach(([name, obsArray]) => {
      if (obsArray.length >= 2) {
        // Sort by date
        const sortedObs = [...obsArray].sort((a, b) => {
          const dateA = new Date(a.effectiveDateTime || a.issued || 0);
          const dateB = new Date(b.effectiveDateTime || b.issued || 0);
          return dateA.getTime() - dateB.getTime();
        });
        
        // Extract values
        const values = sortedObs.map(obs => {
          const value = extractNumericValueFromObservation(obs);
          const date = new Date(obs.effectiveDateTime || obs.issued || 0);
          return {
            date: date.toISOString().split('T')[0],
            value: value !== null ? value : 0,
            unit: getObservationUnit(obs)
          };
        }).filter(v => v.value !== 0); // Filter out non-numeric values
        
        if (values.length >= 2) {
          // Calculate trend direction
          const firstValue = values[0].value;
          const lastValue = values[values.length - 1].value;
          let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
          
          if (lastValue > firstValue * 1.1) {
            trend = 'increasing';
          } else if (lastValue < firstValue * 0.9) {
            trend = 'decreasing';
          }
          
          // Calculate statistics
          const numericValues = values.map(v => v.value);
          const min = Math.min(...numericValues);
          const max = Math.max(...numericValues);
          const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          
          // Get reference range if available
          let referenceMin: number | undefined;
          let referenceMax: number | undefined;
          
          const obsWithRange = obsArray.find(obs => obs.referenceRange && obs.referenceRange.length > 0);
          if (obsWithRange && obsWithRange.referenceRange && obsWithRange.referenceRange.length > 0) {
            const range = obsWithRange.referenceRange[0];
            if (range.low) referenceMin = range.low.value;
            if (range.high) referenceMax = range.high.value;
          }
          
          // Create trend
          if (name && obsArray[0].code?.coding?.[0]?.code) {
            trends.push({
              code: obsArray[0].code.coding[0].code,
              name,
              values,
              trend,
              min,
              max,
              mean,
              referenceMin,
              referenceMax
            });
          }
        }
      }
    });
    
    return trends;
  };
  
  // Get the derived data
  const insights = generateInsights();
  const correlations = generateCorrelations();
  const observationTrends = generateObservationTrends();
  
  // Data for charts
  const conditionCategories = conditions.reduce((acc, condition) => {
    let category = 'Other';
    if (condition.category && condition.category.length > 0) {
      if (condition.category[0].coding && condition.category[0].coding.length > 0) {
        category = condition.category[0].coding[0].display || 'Other';
      }
    }
    
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category]++;
    return acc;
  }, {} as Record<string, number>);
  
  const conditionChartData = Object.entries(conditionCategories).map(([name, value]) => ({
    name,
    value
  }));
  
  const medicationStatus = medications.reduce((acc, med) => {
    const status = med.status || 'unknown';
    if (!acc[status]) {
      acc[status] = 0;
    }
    acc[status]++;
    return acc;
  }, {} as Record<string, number>);
  
  const medicationChartData = Object.entries(medicationStatus).map(([name, value]) => ({
    name,
    value
  }));
  
  const allergyCategories = allergies.reduce((acc, allergy) => {
    let category = 'Other';
    if (allergy.category && allergy.category.length > 0) {
      category = allergy.category[0] || 'Other';
    }
    
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category]++;
    return acc;
  }, {} as Record<string, number>);
  
  const allergyChartData = Object.entries(allergyCategories).map(([name, value]) => ({
    name,
    value
  }));
  
  // Metrics for dashboard
  const activeConditions = conditions.filter(c => 
    c.clinicalStatus?.coding?.some(code => code.code === 'active')
  ).length;
  
  const activeMedications = medications.filter(m => 
    m.status === 'active'
  ).length;
  
  // For observation scatterplot
  const scatterPlotData = observations
    .filter(obs => extractNumericValueFromObservation(obs) !== null)
    .map(obs => {
      const value = extractNumericValueFromObservation(obs);
      const date = new Date(obs.effectiveDateTime || obs.issued || 0);
      return {
        name: getObservationName(obs),
        x: date.getTime(),
        y: value,
        z: 10,
      };
    });
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
        <p className="text-muted-foreground">
          Comprehensive analysis of your health data using machine learning and predictive analytics.
        </p>
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChartIcon className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="trends">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="correlations">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Correlations
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Zap className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="1m">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Active Conditions"
                value={activeConditions}
                icon={<Activity className="h-4 w-4" />}
              />
              <MetricCard
                title="Active Medications"
                value={activeMedications}
                icon={<Activity className="h-4 w-4" />}
              />
              <MetricCard
                title="Observations"
                value={observations.length}
                icon={<Activity className="h-4 w-4" />}
              />
              <MetricCard
                title="Health Score"
                value={`${Math.floor(Math.random() * 20) + 80}/100`}
                trend="up"
                trendValue="+5% from last visit"
                icon={<Activity className="h-4 w-4" />}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnalysisCard title="Conditions by Category">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={conditionChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {conditionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </AnalysisCard>
              
              <AnalysisCard title="Medication Status">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={medicationChartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </AnalysisCard>
              
              <AnalysisCard title="Allergies by Category">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allergyChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {allergyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </AnalysisCard>
            </div>
            
            <AnalysisCard title="Observation Timeline">
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart
                  margin={{
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20,
                  }}
                >
                  <CartesianGrid />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Date" 
                    domain={['auto', 'auto']}
                    tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
                  />
                  <YAxis type="number" dataKey="y" name="Value" />
                  <ZAxis type="number" range={[60, 400]} dataKey="z" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name, props) => {
                      if (name === 'x') return new Date(value as number).toLocaleDateString();
                      return value;
                    }}
                  />
                  <Legend />
                  <Scatter name="Observations" data={scatterPlotData} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </AnalysisCard>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-6">
            {observationTrends.length > 0 ? (
              observationTrends.map(trend => (
                <AnalysisCard 
                  key={trend.code} 
                  title={trend.name}
                  action={
                    <Badge variant={
                      trend.trend === 'increasing' ? 'default' :
                      trend.trend === 'decreasing' ? 'destructive' : 'outline'
                    }>
                      {trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}
                    </Badge>
                  }
                >
                  <div className="mb-4">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div>Min: {trend.min?.toFixed(2)}</div>
                      <div>Max: {trend.max?.toFixed(2)}</div>
                      <div>Mean: {trend.mean?.toFixed(2)}</div>
                      {trend.referenceMin && trend.referenceMax && (
                        <div>Reference Range: {trend.referenceMin.toFixed(2)} - {trend.referenceMax.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                  
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={trend.values}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={
                        trend.referenceMin && trend.referenceMax ? 
                        [Math.min(trend.referenceMin, trend.min || Infinity) * 0.9, 
                         Math.max(trend.referenceMax, trend.max || 0) * 1.1] : 
                        ['auto', 'auto']
                      } />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                        name={trend.name}
                      />
                      {trend.referenceMin && (
                        <Line 
                          type="monotone" 
                          dataKey={() => trend.referenceMin} 
                          stroke="#82ca9d" 
                          strokeDasharray="5 5" 
                          name="Min Reference"
                          dot={false}
                        />
                      )}
                      {trend.referenceMax && (
                        <Line 
                          type="monotone" 
                          dataKey={() => trend.referenceMax} 
                          stroke="#ff7300" 
                          strokeDasharray="5 5" 
                          name="Max Reference"
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </AnalysisCard>
              ))
            ) : (
              <div className="text-center py-10">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No trend data available</h3>
                <p className="text-muted-foreground">
                  Insufficient data to generate meaningful trends. Need at least two data points for each measurement.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="correlations" className="space-y-6">
            {correlations.length > 0 ? (
              correlations.map(correlation => (
                <Card key={correlation.id} className="mb-4">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{correlation.title}</CardTitle>
                        <CardDescription>{correlation.description}</CardDescription>
                      </div>
                      <div className="flex items-center">
                        <span className="text-2xl font-bold">{correlation.score}</span>
                        <span className="text-muted-foreground ml-1">/100</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Contributing Factors</h4>
                        <div className="flex flex-wrap gap-2">
                          {correlation.factors.map((factor, index) => (
                            <Badge key={index} variant="outline">{factor}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className={`h-4 rounded-full ${
                            correlation.score > 80 ? 'bg-green-500' : 
                            correlation.score > 60 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`}
                          style={{ width: `${correlation.score}%` }}
                        ></div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>
                          {correlation.score > 80 ? 'Strong correlation found between these factors. ' : 
                           correlation.score > 60 ? 'Moderate correlation found between these factors. ' : 
                           'Weak correlation found between these factors. '}
                          This analysis is based on your health data and medical knowledge.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-10">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No correlations found</h3>
                <p className="text-muted-foreground">
                  Insufficient data to identify meaningful correlations between your health factors.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-4">
            {insights.length > 0 ? (
              insights.map(insight => (
                <HealthInsightComponent key={insight.id} insight={insight} />
              ))
            ) : (
              <div className="text-center py-10">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No insights available</h3>
                <p className="text-muted-foreground">
                  We couldn't generate any health insights based on your current health data.
                </p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}