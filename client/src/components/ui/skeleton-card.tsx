import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Base skeleton element with shimmer
function SkeletonBase({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-muted rounded animate-pulse', className)}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-background/50 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// Patient Summary Card Skeleton
export function PatientSummarySkeleton() {
  return (
    <Card className="shadow-lg rounded-xl border-none">
      <CardHeader className="border-b pb-4 px-6 pt-6">
        <div className="flex items-center">
          <SkeletonBase className="w-10 h-10 rounded-xl mr-3" />
          <SkeletonBase className="h-6 w-40" />
        </div>
      </CardHeader>
      <CardContent className="pt-6 px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <SkeletonBase className="h-4 w-20 mb-2" />
              <SkeletonBase className="h-5 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Health Overview Stats Skeleton
export function HealthStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-muted/50 rounded-xl p-5 border shadow-sm flex items-center">
          <SkeletonBase className="h-12 w-12 rounded-full mr-4" />
          <div>
            <SkeletonBase className="h-4 w-20 mb-2" />
            <SkeletonBase className="h-8 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Medication Card Skeleton
export function MedicationCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <SkeletonBase className="w-10 h-10 rounded-lg" />
            <div>
              <SkeletonBase className="h-5 w-40 mb-2" />
              <SkeletonBase className="h-4 w-24 mb-2" />
              <SkeletonBase className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <SkeletonBase className="h-9 w-28 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// List of Medication Cards Skeleton
export function MedicationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <MedicationCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Care Gap Card Skeleton
export function CareGapCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <SkeletonBase className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <SkeletonBase className="h-5 w-3/4 mb-2" />
            <SkeletonBase className="h-4 w-full mb-2" />
            <div className="flex gap-2 mt-3">
              <SkeletonBase className="h-6 w-16 rounded-full" />
              <SkeletonBase className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Care Gaps List Skeleton
export function CareGapsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <CareGapCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Chart/Visualization Skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <SkeletonBase className="h-6 w-40" />
        <SkeletonBase className="h-4 w-60 mt-2" />
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between">
            {[...Array(5)].map((_, i) => (
              <SkeletonBase key={i} className="h-4 w-8" />
            ))}
          </div>
          {/* Chart area */}
          <div className="ml-12 h-full flex items-end gap-2 pb-8">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex-1 relative overflow-hidden bg-muted rounded animate-pulse"
                style={{ height: `${30 + Math.random() * 60}%` }}
              />
            ))}
          </div>
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-12 right-0 flex justify-between">
            {[...Array(6)].map((_, i) => (
              <SkeletonBase key={i} className="h-4 w-12" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sidebar Skeleton
export function SidebarSkeleton() {
  return (
    <aside className="bg-background shadow w-64 h-screen overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b">
        <SkeletonBase className="h-8 w-32 mb-2" />
        <SkeletonBase className="h-4 w-40" />
      </div>

      {/* Patient Info */}
      <div className="m-4 p-4 bg-muted/50 rounded-2xl">
        <div className="flex items-center mb-3">
          <SkeletonBase className="w-12 h-12 rounded-2xl mr-3" />
          <div>
            <SkeletonBase className="h-5 w-28 mb-1" />
            <SkeletonBase className="h-4 w-20" />
          </div>
        </div>
        <SkeletonBase className="h-8 w-full rounded-lg" />
      </div>

      {/* Navigation */}
      <nav className="p-6">
        <SkeletonBase className="h-4 w-20 mb-4" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center p-3">
              <SkeletonBase className="w-8 h-8 rounded-xl mr-3" />
              <SkeletonBase className="h-4 w-24" />
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}

// Dashboard Page Full Skeleton
export function DashboardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 p-6"
    >
      <PatientSummarySkeleton />
      <HealthStatsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={250} />
        <CareGapsListSkeleton count={3} />
      </div>
      <MedicationListSkeleton count={2} />
    </motion.div>
  );
}

// Generic Content Skeleton
export function ContentSkeleton({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(lines)].map((_, i) => (
        <SkeletonBase
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 p-4 flex gap-4">
        {[...Array(columns)].map((_, i) => (
          <SkeletonBase key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="p-4 flex gap-4 border-t">
          {[...Array(columns)].map((_, colIndex) => (
            <SkeletonBase key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
