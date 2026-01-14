/**
 * PullToRefresh - Visual indicator for pull-to-refresh gesture
 *
 * Shows a spinner and status when user pulls down at top of scroll area.
 */

import { cn } from '@/lib/cn';

interface PullToRefreshProps {
  /** Current pull distance in pixels */
  pullDistance: number;
  /** Threshold distance to trigger refresh */
  threshold: number;
  /** Whether refresh is currently in progress */
  isRefreshing: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PullToRefresh indicator component
 *
 * @example
 * ```tsx
 * <PullToRefresh
 *   pullDistance={pullDistance}
 *   threshold={80}
 *   isRefreshing={isRefreshing}
 * />
 * ```
 */
export function PullToRefresh({
  pullDistance,
  threshold,
  isRefreshing,
  className,
}: PullToRefreshProps) {
  // Only show if pulling or refreshing
  if (pullDistance <= 0 && !isRefreshing) {
    return null;
  }

  // Calculate opacity based on pull distance (fade in as user pulls)
  const opacity = isRefreshing ? 1 : Math.min(pullDistance / threshold, 1);

  // Calculate scale based on pull distance
  const scale = isRefreshing ? 1 : 0.5 + Math.min(pullDistance / threshold, 1) * 0.5;

  // Whether we've pulled past the threshold
  const willRefresh = pullDistance >= threshold;

  return (
    <div
      className={cn(
        'absolute left-0 right-0 flex justify-center pointer-events-none z-20',
        className
      )}
      style={{
        top: Math.min(pullDistance - 40, threshold - 20),
        opacity,
        transform: `scale(${scale})`,
        transition: isRefreshing ? 'all 0.2s ease-out' : 'none',
      }}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full',
          'bg-surface border border-text-primary/20 shadow-lg',
          'text-sm font-medium',
          willRefresh || isRefreshing ? 'text-accent' : 'text-text-muted'
        )}
      >
        {/* Spinner */}
        <svg
          className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isRefreshing ? (
            // Spinning loader
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          ) : (
            // Down arrow (rotates to up when ready)
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
              style={{
                transform: willRefresh ? 'rotate(180deg)' : 'none',
                transformOrigin: 'center',
                transition: 'transform 0.2s ease-out',
              }}
            />
          )}
        </svg>

        {/* Text */}
        <span>
          {isRefreshing ? 'Refreshing...' : willRefresh ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}
