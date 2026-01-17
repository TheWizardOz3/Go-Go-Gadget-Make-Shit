/**
 * ScheduledPromptForm - Form for creating/editing scheduled prompts
 *
 * Full-screen modal form with prompt input, schedule type picker,
 * time/day selectors, and project selector.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type {
  ScheduledPromptInput,
  ScheduleType,
  ScheduledPrompt,
} from '@/hooks/useScheduledPrompts';

// ============================================================
// Types
// ============================================================

interface ScheduledPromptFormProps {
  /** Whether the form is open */
  isOpen: boolean;
  /** Callback to close the form */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (input: ScheduledPromptInput) => Promise<void>;
  /** Existing prompt to edit (null for new) */
  editingPrompt?: ScheduledPrompt | null;
  /** List of available projects */
  projects?: Array<{ path: string; name: string }>;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// Constants
// ============================================================

const SCHEDULE_TYPES: Array<{ value: ScheduleType; label: string; description: string }> = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
  { value: 'yearly', label: 'Yearly', description: 'Once a year' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

// Days 1-28 for monthly (avoiding edge cases with 29, 30, 31)
const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1);

// ============================================================
// Icons
// ============================================================

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-6 w-6', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
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
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
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
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

// ============================================================
// Sub-components
// ============================================================

/**
 * Schedule type segmented control
 */
function ScheduleTypePicker({
  value,
  onChange,
}: {
  value: ScheduleType;
  onChange: (type: ScheduleType) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <CalendarIcon className="text-text-muted" />
        Frequency
      </label>
      <div className="grid grid-cols-4 gap-1 p-1 bg-text-primary/5 rounded-lg">
        {SCHEDULE_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium',
              'transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              value === type.value
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/5'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Time picker input
 */
function TimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="time-picker"
        className="flex items-center gap-2 text-sm font-medium text-text-primary"
      >
        <ClockIcon className="text-text-muted" />
        Time
      </label>
      <input
        id="time-picker"
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2.5',
          'bg-text-primary/5 rounded-lg',
          'text-text-primary',
          'border border-transparent',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          'transition-colors duration-150',
          // Style the native time picker
          '[&::-webkit-calendar-picker-indicator]:filter',
          '[&::-webkit-calendar-picker-indicator]:invert',
          '[&::-webkit-calendar-picker-indicator]:opacity-50'
        )}
      />
    </div>
  );
}

/**
 * Day of week picker for weekly schedules
 */
function DayOfWeekPicker({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">Day of Week</label>
      <div className="flex gap-1">
        {DAYS_OF_WEEK.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => onChange(day.value)}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-medium',
              'transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              'min-w-[40px]',
              value === day.value
                ? 'bg-accent text-white'
                : 'bg-text-primary/5 text-text-secondary hover:text-text-primary hover:bg-text-primary/10'
            )}
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Day of month picker for monthly schedules
 */
function DayOfMonthPicker({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">Day of Month</label>
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_MONTH.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            className={cn(
              'aspect-square flex items-center justify-center',
              'rounded-lg text-sm font-medium',
              'transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              value === day
                ? 'bg-accent text-white'
                : 'bg-text-primary/5 text-text-secondary hover:text-text-primary hover:bg-text-primary/10'
            )}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Project selector dropdown
 */
function ProjectSelector({
  value,
  onChange,
  projects,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  projects: Array<{ path: string; name: string }>;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="project-selector"
        className="flex items-center gap-2 text-sm font-medium text-text-primary"
      >
        <FolderIcon className="text-text-muted" />
        Project
      </label>
      <select
        id="project-selector"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className={cn(
          'w-full px-3 py-2.5',
          'bg-text-primary/5 rounded-lg',
          'text-text-primary',
          'border border-transparent',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          'transition-colors duration-150',
          'appearance-none',
          // Custom dropdown arrow
          'bg-no-repeat bg-right',
          'pr-10'
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundSize: '1.25rem',
          backgroundPosition: 'right 0.75rem center',
        }}
      >
        <option value="">Global (last active project)</option>
        {projects.map((project) => (
          <option key={project.path} value={project.path}>
            {project.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-text-muted">
        {value ? 'Runs in the selected project' : 'Runs in whichever project was last active'}
      </p>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function ScheduledPromptForm({
  isOpen,
  onClose,
  onSubmit,
  editingPrompt,
  projects = [],
  isSubmitting = false,
  className,
}: ScheduledPromptFormProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize form from editing prompt
  useEffect(() => {
    if (editingPrompt) {
      setPrompt(editingPrompt.prompt);
      setScheduleType(editingPrompt.scheduleType);
      setTimeOfDay(editingPrompt.timeOfDay);
      setDayOfWeek(editingPrompt.dayOfWeek ?? 1);
      setDayOfMonth(editingPrompt.dayOfMonth ?? 1);
      setProjectPath(editingPrompt.projectPath);
    } else {
      // Reset to defaults for new prompt
      setPrompt('');
      setScheduleType('daily');
      setTimeOfDay('09:00');
      setDayOfWeek(1);
      setDayOfMonth(1);
      setProjectPath(null);
    }
    setError(null);
  }, [editingPrompt, isOpen]);

  // Focus prompt input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        promptInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      promptInputRef.current?.focus();
      return;
    }

    const input: ScheduledPromptInput = {
      prompt: prompt.trim(),
      scheduleType,
      timeOfDay,
      projectPath,
    };

    // Add conditional fields
    if (scheduleType === 'weekly') {
      input.dayOfWeek = dayOfWeek;
    }
    if (scheduleType === 'monthly') {
      input.dayOfMonth = dayOfMonth;
    }

    try {
      await onSubmit(input);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scheduled prompt');
    }
  };

  if (!isOpen) return null;

  const isEditing = !!editingPrompt;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'bg-black/60 backdrop-blur-sm',
        'animate-fade-in',
        className
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scheduled-prompt-form-title"
    >
      <div
        ref={modalRef}
        className={cn(
          'absolute inset-x-0 bottom-0',
          'max-h-[90vh]',
          'bg-surface rounded-t-2xl',
          'flex flex-col',
          'animate-slide-up',
          'safe-bottom'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-text-primary/10">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-text-primary/20" />

          <h2 id="scheduled-prompt-form-title" className="text-lg font-semibold text-text-primary">
            {isEditing ? 'Edit Scheduled Prompt' : 'New Scheduled Prompt'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2.5 -mr-2.5 rounded-lg min-w-[44px] min-h-[44px]',
              'flex items-center justify-center',
              'text-text-muted hover:text-text-primary',
              'hover:bg-text-primary/5 active:bg-text-primary/10',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
            )}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 space-y-5">
            {/* Prompt input */}
            <div className="space-y-2">
              <label htmlFor="prompt-input" className="block text-sm font-medium text-text-primary">
                Prompt
              </label>
              <textarea
                ref={promptInputRef}
                id="prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What should Claude do? e.g., 'Review and summarize overnight changes'"
                rows={3}
                className={cn(
                  'w-full px-3 py-2.5',
                  'bg-text-primary/5 rounded-lg',
                  'text-text-primary placeholder:text-text-muted',
                  'border',
                  error ? 'border-error' : 'border-transparent',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  'transition-colors duration-150',
                  'resize-none'
                )}
              />
              {error && <p className="text-xs text-error">{error}</p>}
            </div>

            {/* Schedule type */}
            <ScheduleTypePicker value={scheduleType} onChange={setScheduleType} />

            {/* Time picker */}
            <TimePicker value={timeOfDay} onChange={setTimeOfDay} />

            {/* Conditional day pickers */}
            {scheduleType === 'weekly' && (
              <DayOfWeekPicker value={dayOfWeek} onChange={setDayOfWeek} />
            )}

            {scheduleType === 'monthly' && (
              <DayOfMonthPicker value={dayOfMonth} onChange={setDayOfMonth} />
            )}

            {/* Project selector */}
            <ProjectSelector value={projectPath} onChange={setProjectPath} projects={projects} />
          </div>

          {/* Footer with buttons */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-text-primary/10 space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full px-4 py-3 rounded-lg',
                'bg-accent text-white font-medium',
                'hover:bg-accent/90 active:bg-accent/80',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                isSubmitting && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Schedule'
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(
                'w-full px-4 py-3 rounded-lg',
                'bg-text-primary/5 text-text-secondary font-medium',
                'hover:bg-text-primary/10 active:bg-text-primary/15',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
              )}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
