/**
 * SessionSourceBadge - Visual indicator for session source
 *
 * Shows a small badge indicating whether a session was executed
 * on the local laptop or in the cloud (Modal).
 */

import { cn } from '@/lib/cn';

// ============================================================
// Types
// ============================================================

interface SessionSourceBadgeProps {
  /** Source of the session - 'local' or 'cloud' */
  source: 'local' | 'cloud';
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to show label text */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// Icons
// ============================================================

function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3 h-3', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3 h-3', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
      />
    </svg>
  );
}

// ============================================================
// Component
// ============================================================

/**
 * SessionSourceBadge - Shows where a session was executed
 *
 * @example
 * ```tsx
 * // Icon only (compact)
 * <SessionSourceBadge source="cloud" />
 *
 * // With label
 * <SessionSourceBadge source="cloud" showLabel />
 *
 * // Custom size
 * <SessionSourceBadge source="local" size="md" showLabel />
 * ```
 */
export function SessionSourceBadge({
  source,
  size = 'sm',
  showLabel = false,
  className,
}: SessionSourceBadgeProps) {
  const isCloud = source === 'cloud';
  const Icon = isCloud ? CloudIcon : LaptopIcon;
  const label = isCloud ? 'Cloud' : 'Local';

  // Size variants
  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
  };

  // Color variants
  const colorStyles = isCloud
    ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeStyles[size],
        colorStyles,
        className
      )}
      title={isCloud ? 'Executed in Modal cloud' : 'Executed on local laptop'}
      aria-label={`Session source: ${label}`}
    >
      <Icon />
      {showLabel && <span>{label}</span>}
    </span>
  );
}

/**
 * Check if a session is from the cloud (helper for conditional rendering)
 */
export function isCloudSource(source?: 'local' | 'cloud'): boolean {
  return source === 'cloud';
}
