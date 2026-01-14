/**
 * FileChangeItem - Individual file change row for files changed view
 *
 * Displays file path, status icon, and line change counts with touch-friendly sizing.
 */

import { cn } from '@/lib/cn';
import type { FileChange, FileChangeStatus } from '@shared/types';

interface FileChangeItemProps {
  /** The file change to display */
  file: FileChange;
  /** Callback when file is tapped */
  onPress?: (filePath: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Plus icon for added files
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

/**
 * Pencil icon for modified files
 */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

/**
 * Minus icon for deleted files
 */
function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  );
}

/**
 * Chevron right icon for navigation hint
 */
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/**
 * Get status-specific styling and icon
 */
function getStatusConfig(status: FileChangeStatus) {
  switch (status) {
    case 'added':
      return {
        icon: PlusIcon,
        iconBg: 'bg-success/20',
        iconColor: 'text-success',
        label: 'Added',
      };
    case 'modified':
      return {
        icon: PencilIcon,
        iconBg: 'bg-warning/20',
        iconColor: 'text-warning',
        label: 'Modified',
      };
    case 'deleted':
      return {
        icon: MinusIcon,
        iconBg: 'bg-error/20',
        iconColor: 'text-error',
        label: 'Deleted',
      };
  }
}

/**
 * Extract filename from path for display
 */
function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

/**
 * Get directory path from full path
 */
function getDirectoryPath(path: string): string | null {
  const parts = path.split('/');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('/');
}

/**
 * FileChangeItem component - displays a single file change row
 *
 * @example
 * ```tsx
 * <FileChangeItem
 *   file={{ path: 'src/App.tsx', status: 'modified', additions: 10, deletions: 5 }}
 *   onPress={(path) => navigate(`/files/${encodeURIComponent(path)}`)}
 * />
 * ```
 */
export function FileChangeItem({ file, onPress, className }: FileChangeItemProps) {
  const config = getStatusConfig(file.status);
  const StatusIcon = config.icon;
  const fileName = getFileName(file.path);
  const dirPath = getDirectoryPath(file.path);

  const handleClick = () => {
    onPress?.(file.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPress?.(file.path);
    }
  };

  const isInteractive = !!onPress;

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={cn(
        // Base styles - 48px min height for touch target
        'w-full text-left px-4 py-3 min-h-[48px]',
        'flex items-center gap-3',
        // Interactive states
        isInteractive && 'cursor-pointer',
        isInteractive && 'transition-colors duration-150',
        isInteractive && 'hover:bg-text-primary/5 active:bg-text-primary/10',
        isInteractive &&
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
        className
      )}
      aria-label={`${config.label} file: ${file.path}`}
    >
      {/* Status icon */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full',
          config.iconBg,
          config.iconColor
        )}
      >
        <StatusIcon />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Filename (prominent) */}
        <div className="flex items-center gap-2">
          <span className="text-text-primary font-medium truncate">{fileName}</span>
        </div>

        {/* Directory path (muted, truncated) */}
        {dirPath && <div className="text-xs text-text-muted truncate mt-0.5">{dirPath}</div>}
      </div>

      {/* Line counts */}
      <div className="flex-shrink-0 flex items-center gap-2 text-sm font-mono">
        {file.additions > 0 && <span className="text-success">+{file.additions}</span>}
        {file.deletions > 0 && <span className="text-error">-{file.deletions}</span>}
        {file.additions === 0 && file.deletions === 0 && <span className="text-text-muted">—</span>}
      </div>

      {/* Navigation chevron (if interactive) */}
      {isInteractive && (
        <div className="flex-shrink-0 text-text-muted">
          <ChevronRightIcon />
        </div>
      )}
    </div>
  );
}
