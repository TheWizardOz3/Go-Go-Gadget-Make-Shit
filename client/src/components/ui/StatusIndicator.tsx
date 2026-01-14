/**
 * StatusIndicator - Visual indicator for Claude Code session status
 *
 * Shows one of three states: Working, Waiting, or Idle
 * Used in the app header to provide at-a-glance status awareness.
 */

import { cn } from '@/lib/cn';
import type { SessionStatus } from '@shared/types';

interface StatusIndicatorProps {
  /** Current session status */
  status: SessionStatus | undefined;
  /** Additional CSS classes */
  className?: string;
}

/** Configuration for each status state */
const STATUS_CONFIG = {
  working: {
    label: 'Working',
    colorClass: 'bg-working/15 text-working border-working/30',
    dotClass: 'bg-working',
    animate: true,
  },
  waiting: {
    label: 'Waiting',
    colorClass: 'bg-warning/15 text-warning border-warning/30',
    dotClass: 'bg-warning',
    animate: false,
  },
  idle: {
    label: 'Idle',
    colorClass: 'bg-text-muted/15 text-text-muted border-text-muted/30',
    dotClass: 'bg-text-muted',
    animate: false,
  },
} as const;

/**
 * Status indicator pill showing Working/Waiting/Idle state
 *
 * @example
 * ```tsx
 * // In header
 * <StatusIndicator status={status} />
 *
 * // With custom styling
 * <StatusIndicator status="working" className="ml-auto" />
 * ```
 */
export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  // Default to idle when status is undefined
  const currentStatus = status ?? 'idle';
  const config = STATUS_CONFIG[currentStatus];

  return (
    <div
      className={cn(
        // Base pill styling
        'inline-flex items-center gap-1.5',
        'px-2.5 py-1',
        'rounded-full border',
        'text-xs font-medium',
        // Status-specific colors
        config.colorClass,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Status: ${config.label}`}
    >
      {/* Status dot */}
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          config.dotClass,
          config.animate && 'animate-status-pulse'
        )}
        aria-hidden="true"
      />
      {/* Status label */}
      <span>{config.label}</span>
    </div>
  );
}

/**
 * Skeleton placeholder for status indicator while loading
 */
export function StatusIndicatorSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-2.5 py-1',
        'rounded-full',
        'bg-text-primary/5',
        'animate-pulse',
        className
      )}
      aria-hidden="true"
    >
      {/* Dot placeholder */}
      <span className="h-2 w-2 rounded-full bg-text-primary/10" />
      {/* Label placeholder */}
      <span className="h-3 w-12 rounded bg-text-primary/10" />
    </div>
  );
}
