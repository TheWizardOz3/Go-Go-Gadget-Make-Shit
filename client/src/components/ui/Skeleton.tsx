/**
 * Skeleton - Animated loading placeholder
 *
 * Used to show content shape while data is loading.
 */

import { cn } from '@/lib/cn';

interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Width (default: full width) */
  width?: string | number;
  /** Height (default: 1rem) */
  height?: string | number;
  /** Make it circular */
  rounded?: boolean;
}

/**
 * Animated skeleton placeholder for loading states
 *
 * @example
 * ```tsx
 * // Text line placeholder
 * <Skeleton className="h-4 w-3/4" />
 *
 * // Avatar placeholder
 * <Skeleton className="h-10 w-10" rounded />
 *
 * // Multiple lines
 * <div className="space-y-2">
 *   <Skeleton className="h-4 w-full" />
 *   <Skeleton className="h-4 w-5/6" />
 *   <Skeleton className="h-4 w-4/6" />
 * </div>
 * ```
 */
export function Skeleton({ className, width, height, rounded }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-text-primary/10',
        rounded ? 'rounded-full' : 'rounded',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for a message turn (Cursor-style layout)
 */
export function MessageSkeleton() {
  return (
    <div className="px-4 py-4 space-y-3">
      {/* Header: icon + name + timestamp */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6" rounded />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      {/* Content lines */}
      <div className="space-y-2 pl-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the full conversation view (multiple messages loading)
 */
export function ConversationSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-text-primary/5">
      <MessageSkeleton />
      <MessageSkeleton />
      <MessageSkeleton />
    </div>
  );
}
