
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { CareGap } from '@shared/schema';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  Heart, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Target,
  Activity,
  Shield,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

export function HealthInsights() {
  const [activeTab, setActiveTab] = useState<string>('recommendations');
  
  const { data: careGaps, isLoading, error } = useQuery({
    queryKey: ['/api/fhir/care-gaps'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Group recommendations by priority and category
  const groupRecommendations = () => {
    if (!careGaps) return { urgent: [], important: [], routine: [] };
    
    const urgent: CareGap[] = [];
    const important: CareGap[] = [];
    const routine: CareGap[] = [];
    
    (careGaps as CareGap[]).forEach((gap: CareGap) => {
      if (gap.status === 'due') {
        if (gap.priority === 'high') {
          urgent.push(gap);
        } else if (gap.priority === 'medium') {
          important.push(gap);
        } else {
          routine.push(gap);
        }
      }
    });
    
    return { urgent, important, routine };
  };
  
  const { urgent, important, routine } = groupRecommendations();
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'preventive':
        return <Shield className="h-5 w-5 text-blue-500" />;
      case 'chronic':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'wellness':
        return <Activity className="h-5 w-5 text-green-500" />;
      default:
        return <Target className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Get priority styling
  const getPriorityStyle = (priority?: string) => {
    switch(priority) {
      case 'high':
        return 'border-l-4 border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-4 border-l-amber-500 bg-amber-50';
      default:
        return 'border-l-4 border-l-blue-500 bg-blue-50';
    }
  };
  
  // Generate health score
  const calculateHealthScore = () => {
    if (!careGaps) return { score: 85, status: 'Good' };
    
    const totalGaps = (careGaps as CareGap[]).filter(gap => gap.status === 'due').length;
    const urgentGaps = urgent.length;
    const importantGaps = important.length;
    
    let score = 100;
    score -= urgentGaps * 15;
    score -= importantGaps * 8;
    score -= routine.length * 3;
    
    score = Math.max(60, Math.min(100, score));
    
    let status = 'Excellent';
    if (score < 70) status = 'Needs Attention';
    else if (score < 85) status = 'Good';
    else if (score < 95) status = 'Very Good';
    
    return { score, status };
  };
  
  const healthScore = calculateHealthScore();
  
  const RecommendationCard = ({ gap }: { gap: CareGap }) => (
    <Card className={`mb-4 ${getPriorityStyle(gap.priority)}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {getCategoryIcon(gap.category)}
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">{gap.title}</h3>
              <p className="text-sm text-slate-600 mb-3">{gap.description}</p>
              
              <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Recommended Action:</p>
                    <p className="text-sm text-slate-600">{gap.recommendedAction}</p>
                  </div>
                </div>
              </div>
              
              {gap.dueDate && (
                <div className="flex items-center mt-3 text-xs text-slate-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>Due by: {format(new Date(gap.dueDate), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col space-y-2 ml-4">
            <Badge variant={gap.priority === 'high' ? 'destructive' : gap.priority === 'medium' ? 'secondary' : 'outline'}>
              {gap.priority === 'high' ? 'Urgent' : gap.priority === 'medium' ? 'Important' : 'Routine'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {gap.category}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle>AI Health Insights</CardTitle>
          </div>
          <CardDescription>Loading personalized health recommendations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle>AI Health Insights</CardTitle>
          </div>
          <CardDescription>Unable to load health insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            <p>Failed to analyze your health data. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            <div>
              <CardTitle className="text-xl">AI Health Insights</CardTitle>
              <CardDescription className="mt-1">
                Personalized recommendations based on your health data
              </CardDescription>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800">{healthScore.score}</div>
            <div className="text-sm text-slate-600">Health Score</div>
            <Badge variant={healthScore.score >= 85 ? 'default' : healthScore.score >= 70 ? 'secondary' : 'destructive'}>
              {healthScore.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs defaultValue="recommendations" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="recommendations">
              Recommendations
              {(urgent.length + important.length + routine.length) > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {urgent.length + important.length + routine.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recommendations" className="space-y-6">
            {urgent.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-slate-800">Urgent Actions Needed</h3>
                </div>
                {urgent.map((gap) => (
                  <RecommendationCard key={gap.id} gap={gap} />
                ))}
              </div>
            )}
            
            {important.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Info className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-800">Important Reminders</h3>
                </div>
                {important.map((gap) => (
                  <RecommendationCard key={gap.id} gap={gap} />
                ))}
              </div>
            )}
            
            {routine.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-slate-800">Routine Care</h3>
                </div>
                {routine.map((gap) => (
                  <RecommendationCard key={gap.id} gap={gap} />
                ))}
              </div>
            )}
            
            {urgent.length === 0 && important.length === 0 && routine.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">You're all caught up!</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Great job staying on top of your health. Continue with your regular care routine.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    Health Momentum
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Your health score of {healthScore.score} indicates {healthScore.status.toLowerCase()} health management. 
                    {urgent.length === 0 
                      ? " Keep up the excellent work with preventive care!"
                      : " Focus on urgent items to improve your score."
                    }
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Target className="h-4 w-4 mr-2 text-blue-500" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    {urgent.length > 0 
                      ? `Address ${urgent.length} urgent item${urgent.length > 1 ? 's' : ''} first, then focus on routine care.`
                      : important.length > 0
                      ? `Schedule ${important.length} important health check${important.length > 1 ? 's' : ''} in the coming weeks.`
                      : "Continue your excellent health management routine!"
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Health Management Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">Preventive Care</span>
                    <Badge variant="outline">
                      {routine.length + important.length} pending
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">Chronic Care Management</span>
                    <Badge variant="outline">
                      {urgent.filter(g => g.category === 'chronic').length} urgent
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">Overall Health Score</span>
                    <Badge variant={healthScore.score >= 85 ? 'default' : 'secondary'}>
                      {healthScore.score}/100
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Recommendations updated based on your latest health data
            </p>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Appointments
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
