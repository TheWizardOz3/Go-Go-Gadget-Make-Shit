/**
 * DiffLoadingSkeleton - Loading state for diff view
 *
 * Shows animated skeleton placeholders while diff is loading.
 * Mimics the structure of the actual diff view for a smooth transition.
 */

import { cn } from '@/lib/cn';

interface DiffLoadingSkeletonProps {
  /** Number of skeleton lines to show (default: 12) */
  lines?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single skeleton line (line number + code placeholder)
 */
function SkeletonLine({ variant = 'normal' }: { variant?: 'normal' | 'add' | 'delete' }) {
  // Vary the width of code placeholders for realism
  const widths = ['w-3/4', 'w-full', 'w-2/3', 'w-5/6', 'w-4/5'];
  const randomWidth = widths[Math.floor(Math.random() * widths.length)];

  return (
    <div
      className={cn(
        'flex items-stretch text-xs leading-[1.5]',
        variant === 'add' && 'bg-green-50/50 dark:bg-green-950/10',
        variant === 'delete' && 'bg-red-50/50 dark:bg-red-950/10',
        variant === 'normal' && 'bg-white dark:bg-zinc-950'
      )}
    >
      {/* Line number placeholder */}
      <div
        className={cn(
          'flex-shrink-0 w-16 px-2',
          'bg-gray-50 dark:bg-zinc-900',
          'border-r border-gray-200 dark:border-zinc-800'
        )}
      >
        <div className="h-[18px] w-10 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
      </div>

      {/* Code content placeholder */}
      <div className="flex-1 px-3 py-0">
        <div
          className={cn('h-[18px] bg-gray-200 dark:bg-zinc-800 rounded animate-pulse', randomWidth)}
        />
      </div>
    </div>
  );
}

/**
 * DiffLoadingSkeleton Component
 *
 * Displays an animated loading skeleton that mimics the diff view structure.
 * Shows line numbers and code placeholders with shimmer animation.
 *
 * @example
 * ```tsx
 * {isLoading && <DiffLoadingSkeleton lines={10} />}
 * ```
 */
export function DiffLoadingSkeleton({ lines = 12, className }: DiffLoadingSkeletonProps) {
  // Create a mix of normal, add, and delete lines for realism
  const lineVariants: Array<'normal' | 'add' | 'delete'> = [];
  for (let i = 0; i < lines; i++) {
    const rand = Math.random();
    if (rand < 0.7) {
      lineVariants.push('normal');
    } else if (rand < 0.85) {
      lineVariants.push('add');
    } else {
      lineVariants.push('delete');
    }
  }

  return (
    <div
      className={cn(
        'w-full',
        'bg-white dark:bg-zinc-950',
        'border-t border-gray-200 dark:border-zinc-800',
        className
      )}
      role="status"
      aria-label="Loading diff"
    >
      {/* Skeleton lines */}
      {lineVariants.map((variant, index) => (
        <SkeletonLine key={index} variant={variant} />
      ))}

      {/* Screen reader text */}
      <span className="sr-only">Loading file diff...</span>
    </div>
  );
}
