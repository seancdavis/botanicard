export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-border/50 rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
