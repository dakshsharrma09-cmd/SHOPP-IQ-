

const shimmerStyles = `
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
.skeleton-shimmer {
  background-image: linear-gradient(90deg, rgba(255, 255, 255, 0) 0, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0.4) 60%, rgba(255, 255, 255, 0));
  background-size: 200px 100%;
  background-repeat: no-repeat;
  animation: shimmer 1.5s infinite;
}
.dark .skeleton-shimmer {
  background-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 0, rgba(255, 255, 255, 0.05) 20%, rgba(255, 255, 255, 0.1) 60%, rgba(0, 0, 0, 0));
}
`;

export function SkeletonCard() {
  return (
    <div className="rounded-2xl h-28 bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
      <style>{shimmerStyles}</style>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="w-full h-12 rounded-lg bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
      <style>{shimmerStyles}</style>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="w-full h-64 rounded-2xl bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
      <style>{shimmerStyles}</style>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonChart />
        </div>
        <div className="space-y-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </div>
  );
}
