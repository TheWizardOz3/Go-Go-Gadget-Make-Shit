/**
 * FileContentView - File content viewer with syntax highlighting
 *
 * Displays file content with line numbers, back navigation, and optional GitHub link.
 * Touch-friendly with proper scrolling for mobile use.
 */

import { cn } from '@/lib/cn';
import { getLanguageName } from '@/lib/languageDetector';
import type { FileContentResponse } from '@shared/types';

interface FileContentViewProps {
  /** File content data */
  file: FileContentResponse;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Whether content is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Back arrow icon
 */
function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-6 w-6', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/**
 * External link icon for GitHub
 */
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

/**
 * Loading spinner
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin h-8 w-8', className)}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Format line number with padding
 */
function formatLineNumber(lineNumber: number, maxDigits: number): string {
  return lineNumber.toString().padStart(maxDigits, ' ');
}

/**
 * FileContentView component - displays file content with line numbers
 *
 * @example
 * ```tsx
 * <FileContentView
 *   file={{
 *     path: 'src/App.tsx',
 *     name: 'App.tsx',
 *     content: 'export function App() { ... }',
 *     lineCount: 50,
 *     language: 'tsx',
 *     extension: 'tsx',
 *     githubUrl: 'https://github.com/...'
 *   }}
 *   onBack={() => setSelectedFile(null)}
 * />
 * ```
 */
export function FileContentView({
  file,
  onBack,
  isLoading,
  error,
  className,
}: FileContentViewProps) {
  // Split content into lines
  const lines = file?.content?.split('\n') ?? [];
  const maxDigits = Math.max(3, file?.lineCount?.toString().length ?? 3);
  const languageName = file ? getLanguageName(file.path) : '';

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full',
          'text-text-muted',
          className
        )}
      >
        <LoadingSpinner className="text-accent mb-4" />
        <p className="text-sm">Loading file...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header with back button */}
        <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-bg-secondary border-b border-border shadow-sm">
          <button
            onClick={onBack}
            className={cn(
              'h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-lg',
              'text-text-secondary hover:bg-text-primary/5 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-150'
            )}
            aria-label="Go back"
          >
            <BackIcon />
          </button>
          <span className="text-text-primary font-medium">Error</span>
        </header>

        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <p className="text-error font-medium mb-2">Failed to load file</p>
            <p className="text-text-muted text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-bg-primary', className)}>
      {/* Sticky header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-bg-secondary border-b border-border shadow-sm">
        {/* Back button */}
        <button
          onClick={onBack}
          className={cn(
            'h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-lg',
            'text-text-secondary hover:bg-text-primary/5 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-150'
          )}
          aria-label="Go back to file tree"
        >
          <BackIcon />
        </button>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-text-primary truncate">{file.name}</p>
          <p className="text-xs text-text-muted truncate">
            {languageName} • {file.lineCount.toLocaleString()} lines
          </p>
        </div>

        {/* GitHub link (if available) */}
        {file.githubUrl && (
          <a
            href={file.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-lg',
              'text-text-secondary hover:bg-text-primary/5 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-150'
            )}
            aria-label="View on GitHub"
          >
            <ExternalLinkIcon />
          </a>
        )}
      </header>

      {/* File path breadcrumb */}
      <div className="px-4 py-2 bg-bg-tertiary border-b border-border">
        <p className="font-mono text-xs text-text-muted truncate" title={file.path}>
          {file.path}
        </p>
      </div>

      {/* Content area with line numbers */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-0">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            return (
              <div
                key={lineNumber}
                className={cn('flex text-xs leading-[1.5]', 'hover:bg-text-primary/3')}
              >
                {/* Line number gutter */}
                <div
                  className={cn(
                    'flex-shrink-0 select-none px-2 py-0 text-right font-mono',
                    'bg-bg-tertiary text-text-muted',
                    'border-r border-border'
                  )}
                  aria-label={`Line ${lineNumber}`}
                >
                  <span className="inline-block" style={{ width: `${maxDigits}ch` }}>
                    {formatLineNumber(lineNumber, maxDigits)}
                  </span>
                </div>

                {/* Code content */}
                <div className="flex-1 min-w-0 px-3 py-0 font-mono text-text-primary">
                  <pre className="whitespace-pre-wrap break-words">
                    <code>{line || ' '}</code>
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
