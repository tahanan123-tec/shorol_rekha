import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={clsx(
        'animate-shimmer bg-gray-200',
        variants[variant],
        className
      )}
      style={{ width, height }}
    />
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="glass rounded-2xl p-6">
      <Skeleton variant="rectangular" height="200px" className="mb-4" />
      <Skeleton variant="text" width="70%" className="mb-2" />
      <Skeleton variant="text" width="100%" className="mb-4" />
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="60px" />
        <Skeleton variant="rectangular" width="120px" height="40px" />
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width="150px" />
        <Skeleton variant="circular" width="40px" height="40px" />
      </div>
      <Skeleton variant="text" width="100%" className="mb-2" />
      <Skeleton variant="text" width="80%" className="mb-4" />
      <Skeleton variant="rectangular" height="60px" />
    </div>
  );
}
