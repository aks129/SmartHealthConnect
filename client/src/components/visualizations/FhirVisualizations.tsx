import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Activity as ActivityIcon, 
  HeartPulse, 
  Pill, 
  BarChart3, 
  Thermometer, 
  LineChart, 
  TrendingUp 
} from 'lucide-react';
import type { 
  Observation, 
  Condition, 
  MedicationRequest, 
  Immunization, 
  AllergyIntolerance 
} from '@shared/schema';

// Helpers and utility functions
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Unknown date';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getObservationValue = (observation: Observation): number | null => {
  const valueQuantity = observation.valueQuantity;
  if (valueQuantity && typeof valueQuantity.value === 'number') {
    return valueQuantity.value;
  }
  return null;
};

const getObservationUnit = (observation: Observation): string => {
  const valueQuantity = observation.valueQuantity;
  if (valueQuantity && typeof valueQuantity.unit === 'string') {
    return valueQuantity.unit;
  }
  return '';
};

// Color scales for different visualization types
const conditionColorScale = d3.scaleOrdinal<string>()
  .domain(['active', 'inactive', 'resolved', 'remission'])
  .range(['#ef4444', '#f97316', '#10b981', '#3b82f6']);

const vitalsColorScale = d3.scaleOrdinal<string>()
  .domain(['8462-4', '8480-6', '8867-4', '9279-1', '29463-7'])
  .range(['#ef4444', '#3b82f6', '#10b981', '#f97316', '#8b5cf6']);

// Individual visualization components
interface VitalsChartProps {
  observations: Observation[];
}

export function VitalsChart({ observations }: VitalsChartProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<{x: number, y: number, observation: Observation} | null>(null);
  
  // Filter only vital sign observations with numeric values
  const vitalSigns = observations.filter(obs => {
    const loincCodes = ['8462-4', '8480-6', '8867-4', '9279-1', '29463-7'];
    return obs.code?.coding?.some(c => loincCodes.includes(c.code ?? '')) && getObservationValue(obs) !== null;
  }).sort((a, b) => {
    const dateA = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0;
    const dateB = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0;
    return dateA - dateB;
  });
  
  // Group observations by type (blood pressure, heart rate, etc.)
  const observationsByType = vitalSigns.reduce((acc, obs) => {
    const code = obs.code?.coding?.[0]?.code ?? 'unknown';
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(obs);
    return acc;
  }, {} as Record<string, Observation[]>);
  
  // Map LOINC codes to display names
  const codeToName: Record<string, string> = {
    '8462-4': 'Diastolic BP',
    '8480-6': 'Systolic BP',
    '8867-4': 'Heart Rate',
    '9279-1': 'Respiratory Rate',
    '29463-7': 'Body Weight'
  };
  
  useEffect(() => {
    if (!chartRef.current || Object.keys(observationsByType).length === 0) return;
    
    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    const svg = d3.select(chartRef.current);
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Find date range for x-axis
    const allDates = vitalSigns
      .map(o => o.effectiveDateTime ? new Date(o.effectiveDateTime) : null)
      .filter(d => d !== null) as Date[];
    
    const xScale = d3.scaleTime()
      .domain([
        d3.min(allDates) ?? new Date(),
        d3.max(allDates) ?? new Date()
      ])
      .range([0, width]);
    
    // Find value range for y-axis
    const allValues = vitalSigns
      .map(o => getObservationValue(o))
      .filter(v => v !== null) as number[];
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allValues) ?? 0])
      .nice()
      .range([height, 0]);
    
    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d3.timeFormat('%b %d')(d as Date)))
      .selectAll('text')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end');
    
    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale));
    
    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks())
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '5,5');
    
    // Add lines for each vital sign type
    const line = d3.line<Observation>()
      .x(d => xScale(d.effectiveDateTime ? new Date(d.effectiveDateTime) : new Date()))
      .y(d => {
        const value = getObservationValue(d);
        return yScale(value !== null ? value : 0);
      })
      .curve(d3.curveMonotoneX);
    
    Object.entries(observationsByType).forEach(([code, observations]) => {
      if (observations.length < 2) return; // Need at least 2 points for a line
      
      const color = vitalsColorScale(code);
      
      // Add the line
      g.append('path')
        .datum(observations)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', line);
      
      // Add points on the line
      g.selectAll(`.point-${code}`)
        .data(observations)
        .enter()
        .append('circle')
        .attr('class', `point-${code}`)
        .attr('cx', d => xScale(d.effectiveDateTime ? new Date(d.effectiveDateTime) : new Date()))
        .attr('cy', d => {
          const value = getObservationValue(d);
          return yScale(value !== null ? value : 0);
        })
        .attr('r', 5)
        .attr('fill', color)
        .on('mouseenter', (event, d) => {
          const [x, y] = d3.pointer(event);
          setTooltipData({ x, y, observation: d });
        })
        .on('mouseleave', () => {
          setTooltipData(null);
        });
    });
    
    // Legend
    const legend = g.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(Object.keys(observationsByType).filter(code => codeToName[code]))
      .enter().append('g')
      .attr('transform', (d, i) => `translate(0,${i * 20})`);
    
    legend.append('rect')
      .attr('x', width - 150)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => vitalsColorScale(d));
    
    legend.append('text')
      .attr('x', width - 130)
      .attr('y', 7.5)
      .attr('dy', '0.32em')
      .text(d => codeToName[d] || d);
    
  }, [vitalSigns, observationsByType]);
  
  return (
    <div className="relative">
      <svg ref={chartRef} width="100%" height="350" />
      {tooltipData && (
        <div
          className="absolute bg-white shadow-lg p-3 rounded border text-sm"
          style={{
            left: tooltipData.x + 60,
            top: tooltipData.y + 20,
            zIndex: 10
          }}
        >
          <div className="font-medium">
            {tooltipData.observation.code?.coding?.[0]?.display || 'Observation'}
          </div>
          <div>
            Value: {getObservationValue(tooltipData.observation)} {getObservationUnit(tooltipData.observation)}
          </div>
          <div>
            Date: {formatDate(tooltipData.observation.effectiveDateTime)}
          </div>
        </div>
      )}
    </div>
  );
}

interface ConditionsPieChartProps {
  conditions: Condition[];
}

export function ConditionsPieChart({ conditions }: ConditionsPieChartProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!chartRef.current || conditions.length === 0) return;
    
    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    const svg = d3.select(chartRef.current);
    const width = chartRef.current.clientWidth;
    const height = chartRef.current.clientHeight;
    const radius = Math.min(width, height) / 2 - 40;
    
    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);
    
    // Group conditions by clinical status
    const conditionsByStatus = conditions.reduce((acc, condition) => {
      const status = condition.clinicalStatus?.coding?.[0]?.code || 'unknown';
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status]++;
      return acc;
    }, {} as Record<string, number>);
    
    // Convert to array for d3
    const data = Object.entries(conditionsByStatus).map(([status, count]) => ({
      status,
      count
    }));
    
    // Create the pie layout
    const pie = d3.pie<{ status: string, count: number }>()
      .value(d => d.count)
      .sort(null);
    
    // Generate arc path data
    const arc = d3.arc<d3.PieArcDatum<{ status: string, count: number }>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);
    
    // Create the pie chart
    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');
    
    // Add colored segments
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => conditionColorScale(d.data.status))
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('opacity', 0.8)
      .on('mouseenter', function() {
        d3.select(this).style('opacity', 1);
      })
      .on('mouseleave', function() {
        d3.select(this).style('opacity', 0.8);
      });
    
    // Add labels
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('dy', '.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text(d => d.data.count);
    
    // Add legend
    const legend = svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(data)
      .enter().append('g')
      .attr('transform', (d, i) => `translate(10,${i * 20 + 20})`);
    
    legend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => conditionColorScale(d.status));
    
    legend.append('text')
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '0.1em')
      .text(d => {
        const statusMap: Record<string, string> = {
          'active': 'Active',
          'inactive': 'Inactive',
          'resolved': 'Resolved',
          'remission': 'In Remission',
          'unknown': 'Unknown'
        };
        return `${statusMap[d.status] || d.status} (${d.count})`;
      });
    
  }, [conditions]);
  
  return (
    <svg ref={chartRef} width="100%" height="300" />
  );
}

interface MedicationBarChartProps {
  medications: MedicationRequest[];
}

export function MedicationBarChart({ medications }: MedicationBarChartProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!chartRef.current || medications.length === 0) return;
    
    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    const svg = d3.select(chartRef.current);
    const margin = { top: 20, right: 30, bottom: 100, left: 40 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Group medications by name and count
    const medCounts = medications.reduce((acc, med) => {
      const name = med.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown';
      if (!acc[name]) {
        acc[name] = 0;
      }
      acc[name]++;
      return acc;
    }, {} as Record<string, number>);
    
    // Convert to array and sort by count
    const data = Object.entries(medCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Take top 10 medications
    
    // X and Y scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .padding(0.3);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .nice()
      .range([height, 0]);
    
    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');
    
    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}`));
    
    // Add bars
    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name) || 0)
      .attr('y', d => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale(d.count))
      .attr('fill', '#3b82f6')
      .on('mouseenter', function() {
        d3.select(this).attr('fill', '#2563eb');
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill', '#3b82f6');
      });
    
    // Add value labels on top of bars
    g.selectAll('.bar-label')
      .data(data)
      .enter().append('text')
      .attr('class', 'bar-label')
      .attr('x', d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.count) - 5)
      .attr('text-anchor', 'middle')
      .text(d => d.count)
      .style('font-size', '12px')
      .style('font-weight', 'bold');
    
  }, [medications]);
  
  return (
    <svg ref={chartRef} width="100%" height="350" />
  );
}

interface LabTestsTimelineProps {
  observations: Observation[];
}

export function LabTestsTimeline({ observations }: LabTestsTimelineProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  
  // Filter only lab result observations
  const labResults = observations.filter(obs => {
    // Filter for laboratory observations (usually has a LOINC code and a numeric value)
    return obs.category?.some(cat => 
      cat.coding?.some(coding => coding.code === 'laboratory')
    ) && getObservationValue(obs) !== null;
  }).sort((a, b) => {
    const dateA = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0;
    const dateB = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0;
    return dateB - dateA; // Most recent first
  }).slice(0, 20); // Only show 20 most recent tests
  
  useEffect(() => {
    if (!chartRef.current || labResults.length === 0) return;
    
    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    const svg = d3.select(chartRef.current);
    const margin = { top: 20, right: 130, bottom: 40, left: 200 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = labResults.length * 30;
    
    // Adjust SVG height based on the number of lab tests
    d3.select(chartRef.current).attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Define scales
    const xScale = d3.scaleTime()
      .domain([
        d3.min(labResults, d => d.effectiveDateTime ? new Date(d.effectiveDateTime) : new Date()) || new Date(),
        d3.max(labResults, d => d.effectiveDateTime ? new Date(d.effectiveDateTime) : new Date()) || new Date()
      ])
      .range([0, width]);
    
    const yScale = d3.scaleBand()
      .domain(labResults.map(d => d.code?.coding?.[0]?.display || 'Unknown test'))
      .range([0, height])
      .padding(0.1);
    
    // Add x-axis (timeline)
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d3.timeFormat('%b %d, %Y')(d as Date)));
    
    // Add y-axis (test names)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('font-size', '12px');
    
    // Add the test dots on the timeline
    g.selectAll('.test-dot')
      .data(labResults)
      .enter()
      .append('circle')
      .attr('class', 'test-dot')
      .attr('cx', d => xScale(d.effectiveDateTime ? new Date(d.effectiveDateTime) : new Date()))
      .attr('cy', d => (yScale(d.code?.coding?.[0]?.display || 'Unknown test') || 0) + yScale.bandwidth() / 2)
      .attr('r', 7)
      .attr('fill', d => {
        // Color code based on if the result is abnormal
        if (d.interpretation && d.interpretation.length > 0) {
          const code = d.interpretation[0].coding?.[0]?.code;
          if (code === 'H' || code === 'HH' || code === 'L' || code === 'LL') {
            return '#ef4444'; // Red for abnormal
          }
        }
        return '#10b981'; // Green for normal
      })
      .on('mouseenter', function(event, d) {
        // Highlight the dot
        d3.select(this)
          .attr('r', 10)
          .attr('stroke', '#000')
          .attr('stroke-width', 1);
        
        // Show tooltip
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${xScale(d.effectiveDateTime ? new Date(d.effectiveDateTime) : new Date())},${(yScale(d.code?.coding?.[0]?.display || 'Unknown test') || 0) + yScale.bandwidth() / 2 - 10})`);
        
        tooltip.append('rect')
          .attr('x', 10)
          .attr('y', -25)
          .attr('width', 200)
          .attr('height', 60)
          .attr('fill', 'white')
          .attr('stroke', '#ccc')
          .attr('rx', 5);
        
        tooltip.append('text')
          .attr('x', 20)
          .attr('y', -5)
          .text(`Value: ${getObservationValue(d)} ${getObservationUnit(d)}`)
          .style('font-size', '12px');
        
        tooltip.append('text')
          .attr('x', 20)
          .attr('y', 15)
          .text(`Date: ${formatDate(d.effectiveDateTime)}`)
          .style('font-size', '12px');
      })
      .on('mouseleave', function() {
        // Restore the dot
        d3.select(this)
          .attr('r', 7)
          .attr('stroke', 'none');
        
        // Remove tooltip
        g.selectAll('.tooltip').remove();
      });
    
    // Add value labels on the right side
    g.selectAll('.value-label')
      .data(labResults)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', width + 10)
      .attr('y', d => (yScale(d.code?.coding?.[0]?.display || 'Unknown test') || 0) + yScale.bandwidth() / 2 + 4)
      .text(d => {
        const value = getObservationValue(d);
        const unit = getObservationUnit(d);
        return value !== null ? `${value} ${unit}` : 'No value';
      })
      .style('font-size', '12px')
      .style('fill', d => {
        if (d.interpretation && d.interpretation.length > 0) {
          const code = d.interpretation[0].coding?.[0]?.code;
          if (code === 'H' || code === 'HH' || code === 'L' || code === 'LL') {
            return '#ef4444'; // Red for abnormal
          }
        }
        return '#10b981'; // Green for normal
      });
    
  }, [labResults]);
  
  return (
    <div className="overflow-y-auto max-h-96">
      <svg ref={chartRef} width="100%" height="400" />
    </div>
  );
}

interface AllergiesChartProps {
  allergies: AllergyIntolerance[];
}

export function AllergiesChart({ allergies }: AllergiesChartProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!chartRef.current || allergies.length === 0) return;
    
    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    const svg = d3.select(chartRef.current);
    const margin = { top: 20, right: 30, bottom: 30, left: 150 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = allergies.length * 30 + margin.top + margin.bottom;
    
    // Adjust SVG height based on the number of allergies
    d3.select(chartRef.current).attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get categories of allergies
    const allergyCategories = allergies.reduce((acc, allergy) => {
      const category = allergy.category?.[0] || 'unknown';
      if (!acc.includes(category)) {
        acc.push(category);
      }
      return acc;
    }, [] as string[]);
    
    // Color scale for categories
    const categoryColorScale = d3.scaleOrdinal<string>()
      .domain(allergyCategories)
      .range(d3.schemeCategory10);
    
    // Define scales
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, width]);
    
    const yScale = d3.scaleBand()
      .domain(allergies.map(a => a.code?.coding?.[0]?.display || 'Unknown allergy'))
      .range([0, allergies.length * 30])
      .padding(0.3);
    
    // Add bars
    g.selectAll('.allergy-bar')
      .data(allergies)
      .enter()
      .append('rect')
      .attr('class', 'allergy-bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.code?.coding?.[0]?.display || 'Unknown allergy') || 0)
      .attr('width', xScale(1))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => categoryColorScale(d.category?.[0] || 'unknown'))
      .attr('rx', 5)
      .attr('ry', 5)
      .on('mouseenter', function() {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1);
      });
    
    // Add y-axis (allergy names)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('font-size', '11px');
    
    // Add severity or reaction text on the bars
    g.selectAll('.reaction-text')
      .data(allergies)
      .enter()
      .append('text')
      .attr('class', 'reaction-text')
      .attr('x', 10)
      .attr('y', d => (yScale(d.code?.coding?.[0]?.display || 'Unknown allergy') || 0) + yScale.bandwidth() / 2 + 4)
      .text(d => {
        if (d.reaction && d.reaction.length > 0 && d.reaction[0].manifestation && d.reaction[0].manifestation.length > 0) {
          return d.reaction[0].manifestation[0].coding?.[0]?.display || '';
        }
        return d.criticality === 'high' ? 'High risk' : '';
      })
      .style('fill', 'white')
      .style('font-size', '10px')
      .style('font-weight', d => d.criticality === 'high' ? 'bold' : 'normal');
    
    // Add legend
    const legend = svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(allergyCategories)
      .enter().append('g')
      .attr('transform', (d, i) => `translate(${width + margin.left - 120},${i * 20 + 20})`);
    
    legend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => categoryColorScale(d));
    
    legend.append('text')
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '0.1em')
      .text(d => {
        const categoryMap: Record<string, string> = {
          'food': 'Food',
          'medication': 'Medication',
          'environment': 'Environmental',
          'biologic': 'Biologic',
          'unknown': 'Unknown'
        };
        return categoryMap[d] || d;
      });
    
  }, [allergies]);
  
  return (
    <div className="overflow-y-auto max-h-96">
      <svg ref={chartRef} width="100%" height="200" />
    </div>
  );
}

interface ImmunizationsTimelineProps {
  immunizations: Immunization[];
}

export function ImmunizationsTimeline({ immunizations }: ImmunizationsTimelineProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!chartRef.current || immunizations.length === 0) return;
    
    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    const svg = d3.select(chartRef.current);
    const margin = { top: 30, right: 30, bottom: 40, left: 180 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 300;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Sort immunizations by date
    const sortedImmunizations = [...immunizations].sort((a, b) => {
      const dateA = a.occurrenceDateTime ? new Date(a.occurrenceDateTime).getTime() : 0;
      const dateB = b.occurrenceDateTime ? new Date(b.occurrenceDateTime).getTime() : 0;
      return dateA - dateB;
    });
    
    // Group immunizations by vaccine type
    const vaccineGroups = sortedImmunizations.reduce((acc, immunization) => {
      const vaccineName = immunization.vaccineCode?.coding?.[0]?.display || 'Unknown vaccine';
      if (!acc[vaccineName]) {
        acc[vaccineName] = [];
      }
      acc[vaccineName].push(immunization);
      return acc;
    }, {} as Record<string, Immunization[]>);
    
    // Get unique vaccine names and assign colors
    const vaccineNames = Object.keys(vaccineGroups);
    const colorScale = d3.scaleOrdinal<string>()
      .domain(vaccineNames)
      .range(d3.schemeTableau10);
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain([
        d3.min(sortedImmunizations, d => d.occurrenceDateTime ? new Date(d.occurrenceDateTime) : new Date()) || new Date(),
        d3.max(sortedImmunizations, d => d.occurrenceDateTime ? new Date(d.occurrenceDateTime) : new Date()) || new Date()
      ])
      .range([0, width]);
    
    const yScale = d3.scaleBand()
      .domain(vaccineNames)
      .range([0, height - margin.top - margin.bottom])
      .padding(0.4);
    
    // Add x-axis (timeline)
    g.append('g')
      .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(7).tickFormat(d => d3.timeFormat('%b %Y')(d as Date)));
    
    // Add y-axis (vaccine names)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .style('font-size', '11px');
    
    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(xScale.ticks(7))
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height - margin.top - margin.bottom)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '5,5');
    
    // Draw vaccine series as connected lines and points
    Object.entries(vaccineGroups).forEach(([name, vaccines]) => {
      const y = yScale(name) || 0;
      const color = colorScale(name);
      
      // Draw line connecting vaccines in series
      if (vaccines.length > 1) {
        g.append('path')
          .datum(vaccines)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('d', d3.line<Immunization>()
            .x(d => xScale(d.occurrenceDateTime ? new Date(d.occurrenceDateTime) : new Date()))
            .y(() => y + yScale.bandwidth() / 2)
          );
      }
      
      // Draw points for each vaccine
      g.selectAll(`.vaccine-point-${name.replace(/\s+/g, '-').replace(/[,.']/g, '')}`)
        .data(vaccines)
        .enter()
        .append('circle')
        .attr('class', `vaccine-point-${name.replace(/\s+/g, '-').replace(/[,.']/g, '')}`)
        .attr('cx', d => xScale(d.occurrenceDateTime ? new Date(d.occurrenceDateTime) : new Date()))
        .attr('cy', y + yScale.bandwidth() / 2)
        .attr('r', 6)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5)
        .on('mouseenter', function(event, d) {
          // Highlight the point
          d3.select(this)
            .attr('r', 8)
            .attr('stroke-width', 2);
          
          // Show tooltip
          const tooltip = g.append('g')
            .attr('class', 'tooltip')
            .attr('transform', `translate(${xScale(d.occurrenceDateTime ? new Date(d.occurrenceDateTime) : new Date())},${y + yScale.bandwidth() / 2 - 10})`);
          
          tooltip.append('rect')
            .attr('x', 10)
            .attr('y', -35)
            .attr('width', 200)
            .attr('height', 70)
            .attr('fill', 'white')
            .attr('stroke', '#ccc')
            .attr('rx', 5);
          
          tooltip.append('text')
            .attr('x', 20)
            .attr('y', -15)
            .text(`${d.vaccineCode?.coding?.[0]?.display || 'Unknown vaccine'}`)
            .style('font-size', '12px')
            .style('font-weight', 'bold');
          
          tooltip.append('text')
            .attr('x', 20)
            .attr('y', 5)
            .text(`Date: ${formatDate(d.occurrenceDateTime)}`)
            .style('font-size', '12px');
          
          tooltip.append('text')
            .attr('x', 20)
            .attr('y', 25)
            .text(`Status: ${d.status?.charAt(0).toUpperCase() + d.status?.slice(1) || 'Unknown'}`)
            .style('font-size', '12px');
        })
        .on('mouseleave', function() {
          // Restore the point
          d3.select(this)
            .attr('r', 6)
            .attr('stroke-width', 1.5);
          
          // Remove tooltip
          g.selectAll('.tooltip').remove();
        });
      
      // Add labels showing how many doses
      if (vaccines.length > 1) {
        g.append('text')
          .attr('x', width + 5)
          .attr('y', y + yScale.bandwidth() / 2 + 4)
          .text(`${vaccines.length} doses`)
          .style('font-size', '10px')
          .style('fill', color);
      }
    });
    
  }, [immunizations]);
  
  return (
    <svg ref={chartRef} width="100%" height="300" />
  );
}

// Main component that combines all visualizations
interface FhirVisualizationsProps {
  observations: Observation[];
  conditions: Condition[];
  medications: MedicationRequest[];
  allergies: AllergyIntolerance[];
  immunizations: Immunization[];
}

export function FhirVisualizations({
  observations,
  conditions,
  medications,
  allergies,
  immunizations
}: FhirVisualizationsProps) {
  const [activeTab, setActiveTab] = useState('vitals');
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Health Visualizations
        </CardTitle>
        <CardDescription>
          Interactive visual representations of your health data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="vitals" className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4" />
              <span>Vital Signs</span>
            </TabsTrigger>
            <TabsTrigger value="conditions" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Conditions</span>
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-2">
              <Pill className="h-4 w-4" />
              <span>Medications</span>
            </TabsTrigger>
            <TabsTrigger value="labs" className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              <span>Lab Results</span>
            </TabsTrigger>
            <TabsTrigger value="immunizations" className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" />
              <span>Immunizations</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="vitals">
            <div className="mb-2">
              <h3 className="text-lg font-medium mb-1">Vital Signs Trends</h3>
              <p className="text-sm text-gray-600 mb-4">
                Tracking your vital signs over time helps monitor your overall health status
              </p>
              <VitalsChart observations={observations} />
            </div>
          </TabsContent>
          
          <TabsContent value="conditions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-1">Condition Status</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Breakdown of your health conditions by clinical status
                </p>
                <ConditionsPieChart conditions={conditions} />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Allergies and Intolerances</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Summary of your allergies and sensitivities
                </p>
                <AllergiesChart allergies={allergies} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="medications">
            <h3 className="text-lg font-medium mb-1">Medication Distribution</h3>
            <p className="text-sm text-gray-600 mb-4">
              Overview of your prescribed medications
            </p>
            <MedicationBarChart medications={medications} />
          </TabsContent>
          
          <TabsContent value="labs">
            <h3 className="text-lg font-medium mb-1">Laboratory Test Results</h3>
            <p className="text-sm text-gray-600 mb-4">
              Timeline of your laboratory test results
            </p>
            <LabTestsTimeline observations={observations} />
          </TabsContent>
          
          <TabsContent value="immunizations">
            <h3 className="text-lg font-medium mb-1">Immunization Timeline</h3>
            <p className="text-sm text-gray-600 mb-4">
              History of your vaccinations and immunizations
            </p>
            <ImmunizationsTimeline immunizations={immunizations} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}