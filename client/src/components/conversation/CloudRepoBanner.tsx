/**
 * CloudRepoBanner - Shows pending changes and push button for cloud repos
 *
 * This banner appears in cloud mode when there are unpushed changes in the
 * persistent repo volume. Users must explicitly push changes to GitHub.
 * Banner is STICKY so it's always visible when there are unpushed changes.
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { useCloudRepo } from '@/hooks/useCloudRepo';
import { getApiMode } from '@/lib/api';

interface CloudRepoBannerProps {
  /** Project name (used to identify the repo in the volume) */
  projectName: string;
  /** Git remote URL (used for pushing) */
  gitRemoteUrl: string;
  /** Callback to view changes in the Files tab diff viewer */
  onViewChanges?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function CloudRepoBanner({
  projectName,
  gitRemoteUrl,
  onViewChanges,
  className,
}: CloudRepoBannerProps) {
  const { checkChanges, pushChanges, pendingChanges, isChecking, isPushing } = useCloudRepo();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check for changes when component mounts or projectName changes
  useEffect(() => {
    if (getApiMode() === 'cloud' && projectName) {
      checkChanges(projectName);
    }
  }, [projectName, checkChanges]);

  // Clear push result after a delay
  useEffect(() => {
    if (pushResult) {
      const timer = setTimeout(() => setPushResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pushResult]);

  const handlePush = useCallback(async () => {
    const result = await pushChanges(projectName, gitRemoteUrl);
    setPushResult({
      success: result.success,
      message:
        result.message || result.error || (result.success ? 'Changes pushed!' : 'Push failed'),
    });
    // Refresh changes after push
    if (result.success) {
      checkChanges(projectName);
    }
  }, [projectName, gitRemoteUrl, pushChanges, checkChanges]);

  // Don't show if not in cloud mode or no pending changes
  if (getApiMode() !== 'cloud' || !pendingChanges?.hasPendingChanges) {
    return null;
  }

  const commitCount = pendingChanges.commitCount || 0;

  return (
    <div
      className={cn(
        // Sticky positioning - always visible at top when scrolling
        'sticky top-0 z-20',
        'bg-amber-500/10 border-b border-amber-500/20',
        'backdrop-blur-sm',
        'px-3 py-2',
        className
      )}
    >
      {/* Main banner row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 014.322 5.13L19.5 14.25M6.75 19.5L6 21m0 0l-.75-1.5M6 21l1.5-.75"
              />
            </svg>
          </div>

          {/* Text + View Changes link */}
          <div className="min-w-0 flex items-center gap-2">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400 truncate">
              {commitCount} unpushed commit{commitCount !== 1 ? 's' : ''}
            </p>
            {onViewChanges && (
              <button
                onClick={onViewChanges}
                className="text-xs text-amber-600 dark:text-amber-300 underline hover:text-amber-700 dark:hover:text-amber-200"
              >
                View diff
              </button>
            )}
          </div>

          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            <svg
              className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Push button */}
        <button
          onClick={handlePush}
          disabled={isPushing || isChecking}
          className={cn(
            'flex-shrink-0',
            'px-3 py-1 rounded-md',
            'text-sm font-medium',
            'bg-amber-500 text-white',
            'hover:bg-amber-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          {isPushing ? (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Pushing...
            </span>
          ) : (
            'Push to GitHub'
          )}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-amber-500/20">
          {/* Unpushed commits */}
          {pendingChanges.unpushedCommits && pendingChanges.unpushedCommits.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                Commits:
              </p>
              <ul className="text-xs text-amber-600 dark:text-amber-300/80 space-y-0.5 pl-2">
                {pendingChanges.unpushedCommits.slice(0, 5).map((commit, i) => (
                  <li key={i} className="truncate">
                    {commit}
                  </li>
                ))}
                {pendingChanges.unpushedCommits.length > 5 && (
                  <li className="text-amber-500">
                    +{pendingChanges.unpushedCommits.length - 5} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Diff summary */}
          {pendingChanges.diffSummary && (
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                Changes:
              </p>
              <pre className="text-xs text-amber-600 dark:text-amber-300/80 whitespace-pre-wrap overflow-x-auto">
                {pendingChanges.diffSummary}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Push result toast */}
      {pushResult && (
        <div
          className={cn(
            'mt-2 px-2 py-1 rounded text-xs',
            pushResult.success
              ? 'bg-green-500/20 text-green-700 dark:text-green-400'
              : 'bg-red-500/20 text-red-700 dark:text-red-400'
          )}
        >
          {pushResult.message}
        </div>
      )}
    </div>
  );
}
