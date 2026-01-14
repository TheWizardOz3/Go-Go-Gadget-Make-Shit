/**
 * FileChangeList - Renders a list of file changes
 *
 * Displays FileChangeItem components with loading state support.
 */

import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import { FileChangeItem } from './FileChangeItem';
import type { FileChange } from '@shared/types';

interface FileChangeListProps {
  /** Array of file changes to render */
  files: FileChange[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when a file is tapped */
  onFilePress?: (filePath: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for a single file change item
 */
function FileChangeSkeleton() {
  return (
    <div className="px-4 py-3 min-h-[48px] flex items-center gap-3">
      {/* Status icon placeholder */}
      <Skeleton className="h-8 w-8 flex-shrink-0" rounded />

      {/* File info placeholder */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>

      {/* Line counts placeholder */}
      <Skeleton className="h-4 w-16 flex-shrink-0" />
    </div>
  );
}

/**
 * Loading skeleton for the file list
 */
function FileChangeListSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-text-primary/5">
      <FileChangeSkeleton />
      <FileChangeSkeleton />
      <FileChangeSkeleton />
      <FileChangeSkeleton />
    </div>
  );
}

/**
 * FileChangeList component - renders file changes in order
 *
 * @example
 * ```tsx
 * <FileChangeList
 *   files={files}
 *   isLoading={isLoading}
 *   onFilePress={(path) => navigate(`/files/${encodeURIComponent(path)}`)}
 * />
 * ```
 */
export function FileChangeList({ files, isLoading, onFilePress, className }: FileChangeListProps) {
  // Show skeleton while loading
  if (isLoading) {
    return <FileChangeListSkeleton />;
  }

  return (
    <div
      className={cn('flex flex-col divide-y divide-text-primary/5', className)}
      role="list"
      aria-label="Changed files"
    >
      {files.map((file) => (
        <FileChangeItem key={file.path} file={file} onPress={onFilePress} />
      ))}
    </div>
  );
}

// Export skeleton for use in parent components
export { FileChangeListSkeleton };
