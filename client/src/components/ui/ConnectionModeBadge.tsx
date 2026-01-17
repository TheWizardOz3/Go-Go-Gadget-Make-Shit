/**
 * Connection Mode Badge Component
 *
 * Displays the current API connection mode (Local or Cloud) in the header.
 * Shows a small indicator with icon and label, with a tooltip on tap.
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import type { ApiEndpointMode } from '@shared/types';

// ============================================================
// Types
// ============================================================

interface ConnectionModeBadgeProps {
  /** Current connection mode */
  mode: ApiEndpointMode;
  /** Whether laptop is currently available */
  isLaptopAvailable: boolean;
  /** Whether cloud is configured */
  isCloudConfigured: boolean;
  /** Whether a connectivity check is in progress */
  isChecking?: boolean;
  /** Callback when badge is tapped (for manual refresh) */
  onTap?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// Icons
// ============================================================

function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3.5 h-3.5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
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
      className={cn('w-3.5 h-3.5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-3 h-3 animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================
// Component
// ============================================================

/**
 * Connection Mode Badge
 *
 * Shows current connection status (Local laptop or Cloud Modal).
 * Tapping shows a tooltip with more details and triggers a refresh.
 */
export function ConnectionModeBadge({
  mode,
  isLaptopAvailable: _isLaptopAvailable, // Used for future tooltip expansion
  isCloudConfigured,
  isChecking = false,
  onTap,
  className,
}: ConnectionModeBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleTap = useCallback(() => {
    // Show tooltip briefly
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2500);

    // Trigger refresh if provided
    onTap?.();
  }, [onTap]);

  // Determine badge appearance based on mode
  const isLocal = mode === 'local';
  const Icon = isLocal ? LaptopIcon : CloudIcon;
  const label = isLocal ? 'Local' : 'Cloud';

  // Badge colors
  const badgeColors = isLocal
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : 'bg-violet-500/15 text-violet-400 border-violet-500/30';

  // Tooltip message
  const tooltipMessage = isLocal
    ? 'Connected to your laptop'
    : isCloudConfigured
      ? 'Using Modal cloud'
      : 'Cloud not configured';

  return (
    <div className={cn('relative', className)}>
      {/* Badge button */}
      <button
        type="button"
        onClick={handleTap}
        disabled={isChecking}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full',
          'text-xs font-medium',
          'border',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          badgeColors,
          isChecking && 'opacity-70'
        )}
        aria-label={`Connection mode: ${label}. ${tooltipMessage}`}
      >
        {isChecking ? <SpinnerIcon /> : <Icon />}
        <span>{label}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={cn(
            'absolute top-full right-0 mt-2 z-50',
            'px-3 py-2 rounded-lg',
            'bg-surface border border-border',
            'shadow-lg',
            'text-xs text-text-secondary',
            'whitespace-nowrap',
            'animate-in fade-in slide-in-from-top-1 duration-200'
          )}
        >
          <div className="flex items-center gap-2">
            {isLocal ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-violet-500" />
            )}
            <span>{tooltipMessage}</span>
          </div>
          {!isLocal && !isCloudConfigured && (
            <p className="mt-1 text-text-muted text-[11px]">Enable in Settings → Serverless</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for ConnectionModeBadge
 */
export function ConnectionModeBadgeSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-text-primary/5 border border-text-primary/10',
        'animate-pulse',
        className
      )}
    >
      <div className="w-3.5 h-3.5 rounded bg-text-primary/10" />
      <div className="w-8 h-3 rounded bg-text-primary/10" />
    </div>
  );
}
