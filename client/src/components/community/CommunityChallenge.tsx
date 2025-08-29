
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Trophy, 
  Users, 
  Plus, 
  Timer, 
  Target,
  Medal,
  Crown,
  Zap,
  TrendingUp,
  Calendar,
  Award,
  Star,
  Footprints
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

// Mock data for challenges and users
const challenges = [
  {
    id: '1',
    title: '10K Steps Daily',
    description: 'Walk 10,000 steps every day for a week',
    type: 'steps',
    duration: 7,
    participants: 24,
    maxParticipants: 50,
    prize: '🏆 Digital Badge + 100 Points',
    startDate: new Date(),
    endDate: addDays(new Date(), 7),
    isActive: true,
    difficulty: 'Medium',
    createdBy: 'Sarah M.',
    category: 'Daily Goal'
  },
  {
    id: '2',
    title: 'Weekend Warrior',
    description: 'Complete 15,000 steps on both Saturday and Sunday',
    type: 'steps',
    duration: 2,
    participants: 12,
    maxParticipants: 25,
    prize: '🥇 Gold Badge + 200 Points',
    startDate: addDays(new Date(), 5),
    endDate: addDays(new Date(), 7),
    isActive: false,
    difficulty: 'Hard',
    createdBy: 'Mike T.',
    category: 'Weekend'
  },
  {
    id: '3',
    title: 'Step it Up!',
    description: 'Reach 50,000 total steps this week',
    type: 'steps',
    duration: 7,
    participants: 8,
    maxParticipants: 20,
    prize: '⭐ Star Badge + 150 Points',
    startDate: addDays(new Date(), -2),
    endDate: addDays(new Date(), 5),
    isActive: true,
    difficulty: 'Easy',
    createdBy: 'Alex K.',
    category: 'Weekly Goal'
  }
];

const leaderboard = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    avatar: '/api/placeholder/40/40',
    steps: 12450,
    points: 1250,
    badges: ['🏆', '🥇', '⭐'],
    rank: 1,
    streak: 15,
    isCurrentUser: false
  },
  {
    id: '2',
    name: 'You',
    avatar: '/api/placeholder/40/40',
    steps: 11200,
    points: 1100,
    badges: ['🏆', '⭐'],
    rank: 2,
    streak: 8,
    isCurrentUser: true
  },
  {
    id: '3',
    name: 'Mike Torres',
    avatar: '/api/placeholder/40/40',
    steps: 10800,
    points: 980,
    badges: ['🥇', '⭐'],
    rank: 3,
    streak: 12,
    isCurrentUser: false
  },
  {
    id: '4',
    name: 'Alex Kim',
    avatar: '/api/placeholder/40/40',
    steps: 9500,
    points: 850,
    badges: ['⭐'],
    rank: 4,
    streak: 5,
    isCurrentUser: false
  },
  {
    id: '5',
    name: 'Jamie Lee',
    avatar: '/api/placeholder/40/40',
    steps: 8900,
    points: 720,
    badges: ['🏆'],
    rank: 5,
    streak: 3,
    isCurrentUser: false
  }
];

const userBadges = [
  { id: '1', name: 'First Steps', emoji: '👶', description: 'Complete your first challenge', earned: true },
  { id: '2', name: 'Consistent Walker', emoji: '🚶', description: '7-day walking streak', earned: true },
  { id: '3', name: 'Step Master', emoji: '🏆', description: 'Reach 10,000 steps in a day', earned: true },
  { id: '4', name: 'Weekend Warrior', emoji: '⚔️', description: 'Complete weekend challenge', earned: false },
  { id: '5', name: 'Community Leader', emoji: '👑', description: 'Win a community challenge', earned: false },
  { id: '6', name: 'Marathon Walker', emoji: '🏃', description: 'Walk 100,000 steps in a month', earned: false }
];

export function CommunityChallenge() {
  const [activeTab, setActiveTab] = useState('challenges');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    type: 'steps',
    duration: '7',
    maxParticipants: '25',
    difficulty: 'Medium'
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-gray-500 font-bold">#{rank}</span>;
    }
  };

  const joinChallenge = (challengeId: string) => {
    console.log(`Joining challenge ${challengeId}`);
    // Implementation would update the challenge participants
  };

  const createChallenge = () => {
    console.log('Creating challenge:', newChallenge);
    setShowCreateDialog(false);
    // Reset form
    setNewChallenge({
      title: '',
      description: '',
      type: 'steps',
      duration: '7',
      maxParticipants: '25',
      difficulty: 'Medium'
    });
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-green-50 via-white to-blue-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Community Challenges</h1>
        <p className="text-gray-600">Connect, compete, and celebrate together</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Footprints className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">11,200</div>
                <div className="text-sm text-gray-500">Steps Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">1,100</div>
                <div className="text-sm text-gray-500">Total Points</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">8</div>
                <div className="text-sm text-gray-500">Day Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">2</div>
                <div className="text-sm text-gray-500">Rank</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="challenges">Active Challenges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="badges">My Badges</TabsTrigger>
        </TabsList>

        {/* Active Challenges Tab */}
        <TabsContent value="challenges" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Join a Challenge</h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Challenge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Challenge</DialogTitle>
                  <DialogDescription>
                    Design a challenge to motivate your community
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Challenge Title</Label>
                    <Input
                      id="title"
                      value={newChallenge.title}
                      onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})}
                      placeholder="e.g., 10K Steps Daily"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newChallenge.description}
                      onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                      placeholder="Describe your challenge..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="duration">Duration (days)</Label>
                      <Select value={newChallenge.duration} onValueChange={(value) => setNewChallenge({...newChallenge, duration: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="7">1 week</SelectItem>
                          <SelectItem value="14">2 weeks</SelectItem>
                          <SelectItem value="30">1 month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={newChallenge.difficulty} onValueChange={(value) => setNewChallenge({...newChallenge, difficulty: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createChallenge}>Create Challenge</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  challenge.isActive ? 'bg-gradient-to-r from-green-400 to-blue-500' : 'bg-gray-300'
                }`}></div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getDifficultyColor(challenge.difficulty)}>
                          {challenge.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {challenge.category}
                        </Badge>
                      </div>
                    </div>
                    {challenge.isActive && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{challenge.description}</p>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-1" />
                        Participants
                      </span>
                      <span className="font-medium">{challenge.participants}/{challenge.maxParticipants}</span>
                    </div>
                    <Progress value={(challenge.participants / challenge.maxParticipants) * 100} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-gray-600">
                        <Timer className="h-4 w-4 mr-1" />
                        Duration
                      </span>
                      <span className="font-medium">{challenge.duration} days</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-gray-600">
                        <Award className="h-4 w-4 mr-1" />
                        Prize
                      </span>
                      <span className="font-medium text-xs">{challenge.prize}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>Created by {challenge.createdBy}</span>
                    <span>Ends {format(challenge.endDate, 'MMM dd')}</span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant={challenge.isActive ? "default" : "outline"}
                    onClick={() => joinChallenge(challenge.id)}
                    disabled={!challenge.isActive}
                  >
                    {challenge.isActive ? 'Join Challenge' : 'Coming Soon'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                Weekly Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((user, index) => (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      user.isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8">
                        {getRankIcon(user.rank)}
                      </div>
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{user.steps.toLocaleString()} steps</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <Zap className="h-3 w-3 mr-1" />
                            {user.streak} day streak
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{user.points}</div>
                      <div className="text-sm text-gray-500">points</div>
                      <div className="flex space-x-1 mt-1">
                        {user.badges.map((badge, idx) => (
                          <span key={idx} className="text-lg">{badge}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-purple-500" />
                Achievement Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userBadges.map((badge) => (
                  <div 
                    key={badge.id} 
                    className={`p-4 rounded-lg border text-center ${
                      badge.earned 
                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' 
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="text-4xl mb-2">{badge.emoji}</div>
                    <div className="font-medium text-gray-800">{badge.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{badge.description}</div>
                    {badge.earned && (
                      <Badge className="mt-2 bg-green-100 text-green-700 border-green-200">
                        Earned
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
