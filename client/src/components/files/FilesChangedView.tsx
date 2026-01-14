/**
 * FilesChangedView - Main container for the files changed view
 *
 * Handles data fetching via useFilesChanged hook and renders
 * the appropriate state: loading, error, empty, or file list.
 */

import { cn } from '@/lib/cn';
import { useFilesChanged } from '@/hooks/useFilesChanged';
import { ErrorState } from '@/components/ui/ErrorState';
import { FileChangeList, FileChangeListSkeleton } from './FileChangeList';
import { FilesEmptyState } from './FilesEmptyState';

interface FilesChangedViewProps {
  /** Encoded project path to fetch files for */
  encodedPath: string | null;
  /** Callback when a file is tapped (for navigation to diff view) */
  onFilePress?: (filePath: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FilesChangedView component - orchestrates file list display
 *
 * @example
 * ```tsx
 * <FilesChangedView
 *   encodedPath={project.encodedPath}
 *   onFilePress={(path) => navigate(`/files/${encodeURIComponent(path)}`)}
 * />
 * ```
 */
export function FilesChangedView({ encodedPath, onFilePress, className }: FilesChangedViewProps) {
  const { files, isLoading, error, refresh } = useFilesChanged(encodedPath);

  // No project selected
  if (!encodedPath) {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <div className="flex-1 flex items-center justify-center">
          <FilesEmptyState />
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <FileChangeListSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <div className="flex-1 flex items-center justify-center">
          <ErrorState
            title="Failed to load files"
            message={error.message || 'Unable to fetch changed files. Please try again.'}
            onRetry={() => refresh()}
          />
        </div>
      </div>
    );
  }

  // Empty state (no files changed)
  if (!files || files.length === 0) {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <div className="flex-1 flex items-center justify-center">
          <FilesEmptyState />
        </div>
      </div>
    );
  }

  // Main files list view
  return (
    <div className={cn('flex flex-col flex-1 overflow-hidden', className)}>
      {/* Header showing file count */}
      <div className="px-4 py-3 border-b border-text-primary/5">
        <h2 className="text-sm font-medium text-text-secondary">
          {files.length} {files.length === 1 ? 'file' : 'files'} changed
        </h2>
      </div>

      {/* Scrollable file list */}
      <div className="flex-1 overflow-y-auto">
        <FileChangeList files={files} onFilePress={onFilePress} />
      </div>
    </div>
  );
}
