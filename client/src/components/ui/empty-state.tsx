import React from 'react';
import { LucideIcon, FileX2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    title,
    description,
    icon: Icon = FileX2,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-gray-50/50", className)}>
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gray-100">
                <Icon className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="mb-1 text-lg font-medium text-gray-900">{title}</h3>
            <p className="max-w-sm mb-4 text-sm text-gray-500">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="outline" size="sm">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
