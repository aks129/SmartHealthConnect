import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Heart,
  Activity,
  ChevronRight
} from 'lucide-react';
import { FamilyMember } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface FamilyMemberCardProps {
  member: FamilyMember;
  onSelect?: (member: FamilyMember) => void;
  onEdit?: (member: FamilyMember) => void;
  compact?: boolean;
}

export function FamilyMemberCard({
  member,
  onSelect,
  onEdit,
  compact = false
}: FamilyMemberCardProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/family/members/${member.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family/members'] });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRelationshipColor = (relationship: string) => {
    const colors: Record<string, string> = {
      self: 'bg-primary text-primary-foreground',
      spouse: 'bg-pink-500 text-white',
      child: 'bg-blue-500 text-white',
      parent: 'bg-purple-500 text-white',
      sibling: 'bg-green-500 text-white',
      other: 'bg-gray-500 text-white',
    };
    return colors[relationship.toLowerCase()] || colors.other;
  };

  const calculateAge = (dateOfBirth?: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(member.dateOfBirth);

  if (compact) {
    return (
      <button
        onClick={() => onSelect?.(member)}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors w-full text-left"
      >
        <Avatar className="h-10 w-10">
          {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
          <AvatarFallback className={getRelationshipColor(member.relationship)}>
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{member.name}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {member.relationship}
            {age !== null && ` - ${age} years`}
          </p>
        </div>
        {member.isPrimary && (
          <Badge variant="secondary" className="shrink-0">Primary</Badge>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
              <AvatarFallback className={getRelationshipColor(member.relationship)}>
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {member.name}
                {member.isPrimary && (
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{member.relationship}</span>
                {age !== null && (
                  <>
                    <span>-</span>
                    <span>{age} years old</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(member)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {!member.isPrimary && (
                <DropdownMenuItem
                  onClick={() => deleteMutation.mutate()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mt-2">
          <button
            onClick={() => onSelect?.(member)}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Heart className="h-5 w-5 text-red-500 mb-1" />
            <span className="text-xs text-muted-foreground">Health</span>
          </button>
          <button
            onClick={() => onSelect?.(member)}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Calendar className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-xs text-muted-foreground">Appts</span>
          </button>
          <button
            onClick={() => onSelect?.(member)}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Activity className="h-5 w-5 text-green-500 mb-1" />
            <span className="text-xs text-muted-foreground">Goals</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
