/**
 * ProjectListItem - Individual project row for project picker
 *
 * Displays project name, last activity, session count with touch-friendly sizing.
 */

import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/formatters';
import type { ProjectSerialized } from '@shared/types';

interface ProjectListItemProps {
  /** The project to display */
  project: ProjectSerialized;
  /** Whether this project is currently selected */
  isSelected: boolean;
  /** Callback when project is selected */
  onSelect: (encodedPath: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Checkmark icon for selected state
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Folder icon for project
 */
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

/**
 * ProjectListItem component - displays a single project row
 *
 * @example
 * ```tsx
 * <ProjectListItem
 *   project={project}
 *   isSelected={selectedProject === project.encodedPath}
 *   onSelect={handleSelectProject}
 * />
 * ```
 */
export function ProjectListItem({
  project,
  isSelected,
  onSelect,
  className,
}: ProjectListItemProps) {
  const handleClick = () => {
    onSelect(project.encodedPath);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(project.encodedPath);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base styles
        'w-full text-left px-4 py-3 min-h-[56px]',
        'flex items-center gap-3',
        // Interactive states
        'transition-colors duration-150',
        'hover:bg-text-primary/5 active:bg-text-primary/10',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
        // Selected state
        isSelected && 'bg-accent/10',
        className
      )}
      aria-selected={isSelected}
      role="option"
      data-project={project.encodedPath}
    >
      {/* Folder icon */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg',
          isSelected ? 'bg-accent/20 text-accent' : 'bg-text-primary/5 text-text-muted'
        )}
      >
        <FolderIcon />
      </div>

      {/* Project info */}
      <div className="flex-1 min-w-0">
        {/* Project name */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-semibold truncate',
              isSelected ? 'text-accent' : 'text-text-primary'
            )}
          >
            {project.name}
          </span>
        </div>

        {/* Last activity and session count */}
        <div className="flex items-center gap-2 mt-0.5">
          {project.lastActivityAt && (
            <span className="text-xs text-text-muted">
              {formatRelativeTime(project.lastActivityAt)}
            </span>
          )}
          {project.lastActivityAt && project.sessionCount > 0 && (
            <span className="text-text-muted">·</span>
          )}
          {project.sessionCount > 0 && (
            <span className="text-xs text-text-muted">
              {project.sessionCount} {project.sessionCount === 1 ? 'session' : 'sessions'}
            </span>
          )}
        </div>
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <div className="flex-shrink-0 text-accent">
          <CheckIcon />
        </div>
      )}
    </button>
  );
}
