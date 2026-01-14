/**
 * FileDiffPlaceholder - Placeholder for the diff view feature
 *
 * Shows file path and back button. Actual diff rendering will be
 * implemented in a separate feature (File Diff View).
 */

import { cn } from '@/lib/cn';

interface FileDiffPlaceholderProps {
  /** File path being viewed */
  filePath: string;
  /** Callback to go back to file list */
  onBack: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Back arrow icon
 */
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

/**
 * Code bracket icon for diff placeholder
 */
function CodeBracketIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-8 w-8', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    </svg>
  );
}

/**
 * Extract filename from path
 */
function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

/**
 * FileDiffPlaceholder component - placeholder until diff view is implemented
 *
 * @example
 * ```tsx
 * <FileDiffPlaceholder
 *   filePath="src/App.tsx"
 *   onBack={() => setSelectedFile(null)}
 * />
 * ```
 */
export function FileDiffPlaceholder({ filePath, onBack, className }: FileDiffPlaceholderProps) {
  const fileName = getFileName(filePath);

  return (
    <div className={cn('flex flex-col flex-1', className)}>
      {/* Header with back button and file name */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-text-primary/5">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 -ml-2',
            'rounded-lg',
            'text-text-primary',
            'hover:bg-text-primary/5 active:bg-text-primary/10',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
          )}
          aria-label="Go back to file list"
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-medium text-text-primary truncate">{fileName}</h2>
          <p className="text-xs text-text-muted truncate">{filePath}</p>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <CodeBracketIcon className="text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">Diff View Coming Soon</h3>
        <p className="text-sm text-text-secondary text-center max-w-xs">
          Full file diff with green/red highlighting will be available in the next update.
        </p>
        <p className="mt-4 text-xs text-text-muted font-mono bg-text-primary/5 px-3 py-2 rounded-lg">
          {filePath}
        </p>
      </div>
    </div>
  );
}
