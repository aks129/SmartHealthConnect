
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar,
  TrendingUp, 
  Heart, 
  Activity, 
  Target,
  Award,
  Flame,
  BarChart3,
  Droplets,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';

// Mock data for diabetes management
const glucoseData = [
  { date: '2024-01-15', morning: 95, afternoon: 110, evening: 105 },
  { date: '2024-01-16', morning: 88, afternoon: 125, evening: 98 },
  { date: '2024-01-17', morning: 92, afternoon: 115, evening: 102 },
  { date: '2024-01-18', morning: 85, afternoon: 108, evening: 96 },
  { date: '2024-01-19', morning: 90, afternoon: 118, evening: 100 },
  { date: '2024-01-20', morning: 87, afternoon: 112, evening: 94 },
  { date: '2024-01-21', morning: 93, afternoon: 120, evening: 103 }
];

const dailyGoals = [
  { 
    id: 'glucose',
    title: 'Glucose Monitoring',
    description: 'Check blood sugar 3x daily',
    current: 3,
    target: 3,
    streak: 14,
    icon: <Droplets className="h-5 w-5" />,
    color: 'bg-blue-500'
  },
  {
    id: 'medication',
    title: 'Medication',
    description: 'Take prescribed medication',
    current: 1,
    target: 1,
    streak: 28,
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-green-500'
  },
  {
    id: 'exercise',
    title: 'Physical Activity',
    description: '30 minutes of exercise',
    current: 25,
    target: 30,
    streak: 7,
    icon: <Activity className="h-5 w-5" />,
    color: 'bg-purple-500'
  },
  {
    id: 'diet',
    title: 'Carb Tracking',
    description: 'Log all meals',
    current: 2,
    target: 3,
    streak: 12,
    icon: <Target className="h-5 w-5" />,
    color: 'bg-orange-500'
  }
];

export function DiabetesDashboard() {
  const [currentGlucose, setCurrentGlucose] = useState(95);
  const [hba1c, setHba1c] = useState(6.8);
  const [totalStreak, setTotalStreak] = useState(14);

  // Calculate average glucose for the week
  const weeklyAverage = Math.round(
    glucoseData.reduce((sum, day) => 
      sum + (day.morning + day.afternoon + day.evening) / 3, 0
    ) / glucoseData.length
  );

  // Determine glucose status
  const getGlucoseStatus = (value: number) => {
    if (value < 70) return { status: 'Low', color: 'text-red-600', bg: 'bg-red-50' };
    if (value > 140) return { status: 'High', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const glucoseStatus = getGlucoseStatus(currentGlucose);

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Diabetes Journey</h1>
        <p className="text-gray-600">Small steps, big progress</p>
      </div>

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Glucose */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Droplets className="h-5 w-5 mr-2 text-blue-500" />
              Current Glucose
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800">{currentGlucose}</div>
                <div className="text-sm text-gray-500">mg/dL</div>
              </div>
              <Badge className={`${glucoseStatus.bg} ${glucoseStatus.color} border-0`}>
                {glucoseStatus.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* HbA1c */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-400"></div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="h-5 w-5 mr-2 text-green-500" />
              HbA1c
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800">{hba1c}%</div>
                <div className="text-sm text-gray-500">3-month avg</div>
              </div>
              <Badge className="bg-green-50 text-green-600 border-0">
                Target: &lt;7%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Streak */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-400"></div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Flame className="h-5 w-5 mr-2 text-orange-500" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800">{totalStreak}</div>
                <div className="text-sm text-gray-500">days</div>
              </div>
              <div className="text-2xl">🔥</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Goals Progress */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-500" />
            Today's Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dailyGoals.map((goal) => (
              <div key={goal.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${goal.color} text-white`}>
                      {goal.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{goal.title}</div>
                      <div className="text-sm text-gray-500">{goal.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">{goal.streak}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{goal.current} / {goal.target}</span>
                    <span>{Math.round((goal.current / goal.target) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(goal.current / goal.target) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Glucose Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
            7-Day Glucose Trend
          </CardTitle>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span>Morning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
              <span>Afternoon</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span>Evening</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={glucoseData}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  stroke="#9CA3AF"
                />
                <YAxis 
                  domain={[60, 160]}
                  stroke="#9CA3AF"
                />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                  formatter={(value, name) => [
                    `${value} mg/dL`,
                    typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : name
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="morning" 
                  stroke="#60A5FA" 
                  strokeWidth={3}
                  dot={{ fill: '#60A5FA', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="afternoon" 
                  stroke="#A78BFA" 
                  strokeWidth={3}
                  dot={{ fill: '#A78BFA', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="evening" 
                  stroke="#34D399" 
                  strokeWidth={3}
                  dot={{ fill: '#34D399', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Weekly Average</div>
                <div className="text-lg font-semibold text-gray-800">{weeklyAverage} mg/dL</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Target Range</div>
                <div className="text-lg font-semibold text-gray-800">80-130 mg/dL</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motivational Section */}
      <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Keep up the great work! 🌟</h3>
              <p className="text-purple-100">
                You're {totalStreak} days into building healthy habits. 
                Every day matters on your wellness journey.
              </p>
            </div>
            <div className="text-6xl opacity-20">
              🏆
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
