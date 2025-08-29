
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain,
  Activity,
  Moon,
  Apple,
  Heart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Target,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, RadialBarChart, RadialBar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';

// Mock user data for the algorithm
const userData = {
  sleep: {
    duration: 7.2, // hours
    quality: 82, // percentage
    deepSleep: 1.8, // hours
    remSleep: 1.4, // hours
    sleepDebt: -0.5, // hours (negative means deficit)
    consistency: 85 // percentage
  },
  activity: {
    steps: 8500,
    activeMinutes: 45,
    heartRateVariability: 42, // ms
    restingHeartRate: 65, // bpm
    workoutIntensity: 'moderate',
    recoveryTime: 18 // hours since last intense workout
  },
  nutrition: {
    caloriesConsumed: 1850,
    macroBalance: {
      carbs: 45, // percentage
      protein: 25,
      fat: 30
    },
    hydration: 6, // glasses of water
    mealTiming: 'regular',
    nutritionQuality: 78 // percentage
  },
  stress: {
    level: 6, // 1-10 scale
    cortisol: 'normal',
    mindfulnessMinutes: 10,
    workLoad: 'high'
  },
  health: {
    symptoms: [],
    medication: 'compliant',
    vitals: {
      bloodPressure: { systolic: 118, diastolic: 75 },
      glucose: 95
    }
  }
};

// AI Algorithm for Daily Readiness Score
class ReadinessAlgorithm {
  static calculateScore(data: typeof userData): {
    overallScore: number;
    categoryScores: {
      sleep: number;
      activity: number;
      nutrition: number;
      stress: number;
      health: number;
    };
    recommendations: Array<{
      category: string;
      priority: 'high' | 'medium' | 'low';
      message: string;
      action: string;
      impact: number;
    }>;
    insights: Array<{
      type: 'positive' | 'warning' | 'info';
      message: string;
    }>;
  } {
    // Calculate individual category scores
    const sleepScore = this.calculateSleepScore(data.sleep);
    const activityScore = this.calculateActivityScore(data.activity);
    const nutritionScore = this.calculateNutritionScore(data.nutrition);
    const stressScore = this.calculateStressScore(data.stress);
    const healthScore = this.calculateHealthScore(data.health);

    // Weighted overall score
    const weights = {
      sleep: 0.3,
      activity: 0.25,
      nutrition: 0.2,
      stress: 0.15,
      health: 0.1
    };

    const overallScore = Math.round(
      sleepScore * weights.sleep +
      activityScore * weights.activity +
      nutritionScore * weights.nutrition +
      stressScore * weights.stress +
      healthScore * weights.health
    );

    const categoryScores = {
      sleep: sleepScore,
      activity: activityScore,
      nutrition: nutritionScore,
      stress: stressScore,
      health: healthScore
    };

    // Generate personalized recommendations
    const recommendations = this.generateRecommendations(data, categoryScores);
    const insights = this.generateInsights(data, categoryScores, overallScore);

    return {
      overallScore,
      categoryScores,
      recommendations,
      insights
    };
  }

  private static calculateSleepScore(sleep: typeof userData.sleep): number {
    let score = 100;
    
    // Duration impact (optimal: 7-9 hours)
    if (sleep.duration < 6) score -= 30;
    else if (sleep.duration < 7) score -= 15;
    else if (sleep.duration > 9) score -= 10;
    
    // Quality impact
    score = score * (sleep.quality / 100);
    
    // Sleep debt impact
    if (sleep.sleepDebt < -2) score -= 20;
    else if (sleep.sleepDebt < -1) score -= 10;
    
    // Consistency impact
    score = score * (sleep.consistency / 100);
    
    return Math.max(0, Math.round(score));
  }

  private static calculateActivityScore(activity: typeof userData.activity): number {
    let score = 100;
    
    // Steps impact (target: 8000-12000)
    if (activity.steps < 5000) score -= 30;
    else if (activity.steps < 7000) score -= 15;
    else if (activity.steps > 15000) score -= 5;
    
    // Active minutes impact (target: 30-60)
    if (activity.activeMinutes < 20) score -= 20;
    else if (activity.activeMinutes < 30) score -= 10;
    
    // Recovery impact
    if (activity.recoveryTime < 12) score -= 15;
    
    // HRV impact (higher is better for recovery)
    if (activity.heartRateVariability < 30) score -= 10;
    
    return Math.max(0, Math.round(score));
  }

  private static calculateNutritionScore(nutrition: typeof userData.nutrition): number {
    let score = 100;
    
    // Hydration impact (target: 8 glasses)
    if (nutrition.hydration < 4) score -= 20;
    else if (nutrition.hydration < 6) score -= 10;
    
    // Nutrition quality impact
    score = score * (nutrition.nutritionQuality / 100);
    
    // Macro balance impact (check if within healthy ranges)
    if (nutrition.macroBalance.protein < 15 || nutrition.macroBalance.protein > 35) score -= 10;
    if (nutrition.macroBalance.carbs < 30 || nutrition.macroBalance.carbs > 65) score -= 5;
    
    return Math.max(0, Math.round(score));
  }

  private static calculateStressScore(stress: typeof userData.stress): number {
    let score = 100;
    
    // Stress level impact (1-10 scale, lower is better)
    score -= (stress.level - 1) * 8;
    
    // Mindfulness bonus
    if (stress.mindfulnessMinutes > 0) score += 10;
    if (stress.mindfulnessMinutes > 15) score += 5;
    
    // Work load impact
    if (stress.workLoad === 'high') score -= 15;
    else if (stress.workLoad === 'very high') score -= 25;
    
    return Math.max(0, Math.round(score));
  }

  private static calculateHealthScore(health: typeof userData.health): number {
    let score = 100;
    
    // Symptoms impact
    score -= health.symptoms.length * 10;
    
    // Medication compliance
    if (health.medication !== 'compliant') score -= 20;
    
    // Vitals impact
    const bp = health.vitals.bloodPressure;
    if (bp.systolic > 140 || bp.diastolic > 90) score -= 15;
    else if (bp.systolic > 130 || bp.diastolic > 80) score -= 5;
    
    if (health.vitals.glucose > 140) score -= 15;
    else if (health.vitals.glucose > 100) score -= 5;
    
    return Math.max(0, Math.round(score));
  }

  private static generateRecommendations(data: typeof userData, scores: any) {
    const recommendations = [];

    // Sleep recommendations
    if (scores.sleep < 70) {
      if (data.sleep.duration < 7) {
        recommendations.push({
          category: 'Sleep',
          priority: 'high' as const,
          message: 'Your sleep duration is below optimal levels',
          action: 'Aim for 7-8 hours of sleep tonight by going to bed 1 hour earlier',
          impact: 25
        });
      }
      if (data.sleep.quality < 80) {
        recommendations.push({
          category: 'Sleep',
          priority: 'medium' as const,
          message: 'Sleep quality could be improved',
          action: 'Try avoiding screens 1 hour before bed and keep your room cool (65-68°F)',
          impact: 15
        });
      }
    }

    // Activity recommendations
    if (scores.activity < 70) {
      if (data.activity.steps < 8000) {
        recommendations.push({
          category: 'Activity',
          priority: 'high' as const,
          message: 'Your step count is below the daily target',
          action: 'Take a 20-minute walk or use stairs instead of elevators today',
          impact: 20
        });
      }
      if (data.activity.recoveryTime < 12) {
        recommendations.push({
          category: 'Activity',
          priority: 'medium' as const,
          message: 'Your body needs more recovery time',
          action: 'Consider a lighter workout today or focus on gentle stretching',
          impact: 15
        });
      }
    }

    // Nutrition recommendations
    if (scores.nutrition < 70) {
      if (data.nutrition.hydration < 6) {
        recommendations.push({
          category: 'Nutrition',
          priority: 'medium' as const,
          message: 'Hydration levels are below optimal',
          action: 'Drink 2-3 more glasses of water throughout the day',
          impact: 10
        });
      }
      if (data.nutrition.macroBalance.protein < 20) {
        recommendations.push({
          category: 'Nutrition',
          priority: 'low' as const,
          message: 'Protein intake could be increased',
          action: 'Include a protein source in your next meal (eggs, fish, or legumes)',
          impact: 8
        });
      }
    }

    // Stress recommendations
    if (scores.stress < 70) {
      recommendations.push({
        category: 'Stress',
        priority: 'high' as const,
        message: 'Stress levels are elevated',
        action: 'Try 10 minutes of deep breathing or meditation',
        impact: 20
      });
      if (data.stress.mindfulnessMinutes === 0) {
        recommendations.push({
          category: 'Stress',
          priority: 'medium' as const,
          message: 'Consider adding mindfulness to your routine',
          action: 'Start with just 5 minutes of guided meditation',
          impact: 12
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private static generateInsights(data: typeof userData, scores: any, overallScore: number) {
    const insights = [];

    if (overallScore >= 80) {
      insights.push({
        type: 'positive' as const,
        message: 'Great job! Your readiness score indicates you\'re well-prepared for the day ahead.'
      });
    } else if (overallScore >= 60) {
      insights.push({
        type: 'info' as const,
        message: 'Your readiness is moderate. Focus on the recommendations to optimize your performance.'
      });
    } else {
      insights.push({
        type: 'warning' as const,
        message: 'Your body may need extra care today. Consider lighter activities and prioritize recovery.'
      });
    }

    // Specific insights
    if (scores.sleep > 85) {
      insights.push({
        type: 'positive' as const,
        message: 'Excellent sleep quality! This is your strongest readiness factor today.'
      });
    }

    if (data.activity.heartRateVariability > 50) {
      insights.push({
        type: 'positive' as const,
        message: 'High heart rate variability indicates good recovery and readiness for activity.'
      });
    }

    if (data.stress.level >= 8) {
      insights.push({
        type: 'warning' as const,
        message: 'High stress levels detected. This significantly impacts your overall readiness.'
      });
    }

    return insights;
  }
}

// Historical data for trends
const historicalData = Array.from({ length: 7 }, (_, i) => {
  const date = subDays(new Date(), 6 - i);
  return {
    date: format(date, 'MMM dd'),
    score: Math.floor(Math.random() * 30) + 60, // Random scores between 60-90
    sleep: Math.floor(Math.random() * 30) + 60,
    activity: Math.floor(Math.random() * 30) + 60,
    nutrition: Math.floor(Math.random() * 30) + 60,
    stress: Math.floor(Math.random() * 30) + 60
  };
});

export function ReadinessScore() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analysis, setAnalysis] = useState<ReturnType<typeof ReadinessAlgorithm.calculateScore> | null>(null);

  useEffect(() => {
    // Calculate readiness score using AI algorithm
    const result = ReadinessAlgorithm.calculateScore(userData);
    setAnalysis(result);
  }, []);

  if (!analysis) {
    return <div>Calculating your readiness score...</div>;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const categoryData = [
    { name: 'Sleep', value: analysis.categoryScores.sleep, color: '#3B82F6' },
    { name: 'Activity', value: analysis.categoryScores.activity, color: '#10B981' },
    { name: 'Nutrition', value: analysis.categoryScores.nutrition, color: '#F59E0B' },
    { name: 'Stress', value: analysis.categoryScores.stress, color: '#EF4444' },
    { name: 'Health', value: analysis.categoryScores.health, color: '#8B5CF6' }
  ];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Daily Readiness Score</h1>
        <p className="text-gray-600">AI-powered insights for optimal performance</p>
      </div>

      {/* Main Score Display */}
      <Card className="mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-blue-500"></div>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(analysis.overallScore)} mb-2`}>
                {analysis.overallScore}
              </div>
              <div className="text-xl text-gray-600 mb-4">Readiness Score</div>
              <Badge className={`${getScoreBg(analysis.overallScore)} ${getScoreColor(analysis.overallScore)} border-0 px-4 py-2 text-lg`}>
                {analysis.overallScore >= 80 ? 'Excellent' : 
                 analysis.overallScore >= 60 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-500" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.insights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  insight.type === 'positive' ? 'bg-green-50 border-green-400' :
                  insight.type === 'warning' ? 'bg-red-50 border-red-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-start space-x-2">
                    {insight.type === 'positive' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : insight.type === 'warning' ? (
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    )}
                    <p className="text-sm">{insight.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Category Breakdown</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="trends">7-Day Trends</TabsTrigger>
        </TabsList>

        {/* Category Breakdown */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map((category) => (
                    <div key={category.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{category.name}</span>
                        <span className={`text-sm font-bold ${getScoreColor(category.value)}`}>
                          {category.value}
                        </span>
                      </div>
                      <Progress value={category.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}`, 'Score']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-500" />
                Personalized Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority} priority
                        </Badge>
                        <span className="text-sm text-gray-600">{rec.category}</span>
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        +{rec.impact} points
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-800 mb-2">{rec.message}</h4>
                    <p className="text-sm text-gray-600 mb-3">{rec.action}</p>
                    <Button size="sm" variant="outline">
                      <Zap className="h-4 w-4 mr-1" />
                      Take Action
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                7-Day Readiness Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                    <Tooltip 
                      formatter={(value, name) => [`${value}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      name="Overall Score"
                    />
                    <Line type="monotone" dataKey="sleep" stroke="#3B82F6" strokeWidth={2} name="Sleep" />
                    <Line type="monotone" dataKey="activity" stroke="#10B981" strokeWidth={2} name="Activity" />
                    <Line type="monotone" dataKey="nutrition" stroke="#F59E0B" strokeWidth={2} name="Nutrition" />
                    <Line type="monotone" dataKey="stress" stroke="#EF4444" strokeWidth={2} name="Stress" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analysis.overallScore}</div>
                  <div className="text-sm text-gray-600">Today</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {Math.round(historicalData.reduce((sum, day) => sum + day.score, 0) / historicalData.length)}
                  </div>
                  <div className="text-sm text-gray-600">7-Day Avg</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.max(...historicalData.map(d => d.score))}
                  </div>
                  <div className="text-sm text-gray-600">Best Score</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {historicalData.filter(d => d.score >= 70).length}
                  </div>
                  <div className="text-sm text-gray-600">Good Days</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
