import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-surface-2', className)} />;
}

export function TableRowSkeleton() {
  return (
    <div className="flex gap-4 py-2">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/6" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg bg-surface p-4 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
