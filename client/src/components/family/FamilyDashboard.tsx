import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { FamilyMemberCard } from './FamilyMemberCard';
import { HealthNarrativeSummary } from './HealthNarrativeSummary';
import { FamilyMember } from '@shared/schema';

interface FamilySummary {
  members: (FamilyMember & { pendingActions: number })[];
  totalPendingActions: number;
  totalMembers?: number;
  pendingActions?: number;
  upcomingAppointments?: number;
  activeGoals?: number;
}

interface FamilyDashboardProps {
  onSelectMember?: (member: FamilyMember) => void;
}

export function FamilyDashboard({ onSelectMember }: FamilyDashboardProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const queryClient = useQueryClient();

  const { data: members, isLoading, error } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family/members'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const { data: summary } = useQuery<FamilySummary>({
    queryKey: ['/api/family/summary'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      relationship: string;
      dateOfBirth?: string;
      gender?: string;
    }) => {
      return apiRequest('POST', '/api/family/members', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family/members'] });
      setIsAddDialogOpen(false);
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      name: string;
      relationship: string;
      dateOfBirth?: string;
      gender?: string;
    }) => {
      const { id, ...updateData } = data;
      return apiRequest('PUT', `/api/family/members/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family/members'] });
      setEditingMember(null);
    },
  });

  const handleAddMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addMemberMutation.mutate({
      name: formData.get('name') as string,
      relationship: formData.get('relationship') as string,
      dateOfBirth: formData.get('dateOfBirth') as string || undefined,
      gender: formData.get('gender') as string || undefined,
    });
  };

  const handleUpdateMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember) return;
    const formData = new FormData(e.currentTarget);
    updateMemberMutation.mutate({
      id: editingMember.id,
      name: formData.get('name') as string,
      relationship: formData.get('relationship') as string,
      dateOfBirth: formData.get('dateOfBirth') as string || undefined,
      gender: formData.get('gender') as string || undefined,
    });
  };

  const handleSelectMember = (member: FamilyMember) => {
    setSelectedMember(member);
    onSelectMember?.(member);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load family members</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Family Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Health Hub
              </CardTitle>
              <CardDescription>
                Manage health information for your whole family
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddMember}>
                  <DialogHeader>
                    <DialogTitle>Add Family Member</DialogTitle>
                    <DialogDescription>
                      Add a new family member to track their health information.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">Relationship</Label>
                      <Select name="relationship" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input id="dateOfBirth" name="dateOfBirth" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select name="gender">
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addMemberMutation.isPending}>
                      {addMemberMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Member'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{summary.totalMembers || summary.members?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Family Members</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{summary.pendingActions || summary.totalPendingActions || 0}</div>
                <div className="text-sm text-muted-foreground">Pending Actions</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.upcomingAppointments || 0}</div>
                <div className="text-sm text-muted-foreground">Upcoming Appts</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.activeGoals || 0}</div>
                <div className="text-sm text-muted-foreground">Active Goals</div>
              </div>
            </div>
          )}

          {/* Family Members Grid */}
          {members && members.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  onSelect={handleSelectMember}
                  onEdit={setEditingMember}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No family members yet</h3>
              <p className="text-muted-foreground mb-4">
                Add family members to start tracking their health.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Narrative for Selected Member */}
      {selectedMember && (
        <HealthNarrativeSummary
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <form onSubmit={handleUpdateMember}>
            <DialogHeader>
              <DialogTitle>Edit Family Member</DialogTitle>
              <DialogDescription>
                Update information for {editingMember?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingMember?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-relationship">Relationship</Label>
                <Select name="relationship" defaultValue={editingMember?.relationship}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Self</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
                <Input
                  id="edit-dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={editingMember?.dateOfBirth || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Gender</Label>
                <Select name="gender" defaultValue={editingMember?.gender || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMemberMutation.isPending}>
                {updateMemberMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
