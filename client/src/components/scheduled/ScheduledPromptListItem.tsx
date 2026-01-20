/**
 * ScheduledPromptListItem - Individual row in the scheduled prompts list
 *
 * Displays prompt text, schedule info, project, next run, and last execution status.
 * Includes toggle switch and swipe-to-delete functionality.
 */

import { cn } from '@/lib/cn';
import {
  type ScheduledPrompt,
  getScheduleDescription,
  formatNextRun,
  formatLastExecution,
  isPromptMissed,
} from '@/hooks/useScheduledPrompts';

interface ScheduledPromptListItemProps {
  /** The scheduled prompt data */
  prompt: ScheduledPrompt;
  /** Callback when toggle is clicked */
  onToggle: (id: string) => void;
  /** Callback when delete is clicked */
  onDelete: (id: string) => void;
  /** Callback when edit is clicked */
  onEdit: (prompt: ScheduledPrompt) => void;
  /** Callback when run now is clicked */
  onRunNow: (id: string) => void;
  /** Whether an action is in progress */
  isLoading?: boolean;
}

/**
 * Clock icon for schedule badge
 */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-3.5 w-3.5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * Folder icon for project badge
 */
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-3.5 w-3.5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
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
 * Pencil icon for edit button
 */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

/**
 * Trash icon for delete button
 */
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

/**
 * Play icon for run now button
 */
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('h-4 w-4', className)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * Toggle switch component
 */
function ToggleSwitch({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        enabled ? 'bg-accent' : 'bg-text-primary/20',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0',
          'transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0.5',
          'mt-0.5'
        )}
      />
    </button>
  );
}

/**
 * Get project display name from path
 */
function getProjectName(projectPath: string | null): string {
  if (!projectPath) return 'Global';
  const parts = projectPath.split('/');
  return parts[parts.length - 1] || 'Unknown';
}

export function ScheduledPromptListItem({
  prompt,
  onToggle,
  onDelete,
  onEdit,
  onRunNow,
  isLoading,
}: ScheduledPromptListItemProps) {
  const scheduleDesc = getScheduleDescription(prompt);
  const nextRun = formatNextRun(prompt.nextRunAt);
  const lastExec = formatLastExecution(prompt);
  const projectName = getProjectName(prompt.projectPath);
  const isMissed = isPromptMissed(prompt);

  return (
    <div
      className={cn(
        'group px-4 py-3',
        'border-b border-text-primary/5 last:border-b-0',
        'transition-colors duration-150',
        !prompt.enabled && 'opacity-60',
        'cursor-pointer hover:bg-text-primary/5'
      )}
      onClick={() => onEdit(prompt)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(prompt);
        }
      }}
    >
      {/* Top row: prompt text + toggle */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className={cn('text-sm text-text-primary leading-snug', 'line-clamp-2 flex-1')}>
          {prompt.prompt}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(prompt);
            }}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-lg min-w-[44px] min-h-[44px]',
              'flex items-center justify-center',
              'text-accent',
              'hover:bg-accent/10 active:bg-accent/20',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Edit scheduled prompt"
          >
            <PencilIcon />
          </button>
          <ToggleSwitch
            enabled={prompt.enabled}
            onToggle={() => onToggle(prompt.id)}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(prompt.id);
            }}
            disabled={isLoading}
            className={cn(
              'p-2 -mr-2 rounded-lg min-w-[44px] min-h-[44px]',
              'flex items-center justify-center',
              'text-text-muted hover:text-error active:text-error',
              'hover:bg-error/10 active:bg-error/20',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-error',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Delete scheduled prompt"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Middle row: schedule + project badges */}
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        {/* Schedule badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
            'text-xs font-medium',
            'bg-accent/10 text-accent'
          )}
        >
          <ClockIcon />
          {scheduleDesc}
        </span>

        {/* Project badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
            'text-xs font-medium',
            prompt.projectPath
              ? 'bg-text-primary/10 text-text-secondary'
              : 'bg-warning/10 text-warning'
          )}
        >
          <FolderIcon />
          {projectName}
        </span>
      </div>

      {/* Bottom row: next run + last execution OR run now button if missed */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        {isMissed ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRunNow(prompt.id);
            }}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'bg-warning/20 text-warning font-medium',
              'hover:bg-warning/30 active:bg-warning/40',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-warning',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <PlayIcon />
            Run Now (Missed)
          </button>
        ) : (
          <span>Next: {nextRun}</span>
        )}
        {lastExec && (
          <span
            className={cn(
              prompt.lastExecution?.status === 'success' ? 'text-success' : 'text-error'
            )}
          >
            {lastExec}
          </span>
        )}
      </div>
    </div>
  );
}
