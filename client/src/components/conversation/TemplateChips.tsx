/**
 * TemplateChips - Horizontally scrollable quick-select prompt templates
 *
 * Displays prompt templates as tappable chips above the input field.
 * Templates are loaded from .claude/templates.yaml or fallback to defaults.
 */

import { useCallback } from 'react';
import { cn } from '@/lib/cn';
import type { Template } from '@/hooks/useTemplates';

// ============================================================
// Types
// ============================================================

interface TemplateChipsProps {
  /** Array of templates to display */
  templates: Template[];
  /** Callback when a template is selected */
  onSelect: (prompt: string) => void;
  /** Whether chips are disabled (e.g., when Claude is working) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface TemplateChipProps {
  /** Template to display */
  template: Template;
  /** Callback when chip is clicked */
  onClick: () => void;
  /** Whether the chip is disabled */
  disabled?: boolean;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Trigger haptic feedback if available
 *
 * Uses the Vibration API for tactile feedback on mobile devices.
 * Fails silently if not supported.
 */
function triggerHapticFeedback(): void {
  try {
    if ('vibrate' in navigator) {
      // Short vibration (30ms) for chip tap feedback
      navigator.vibrate(30);
    }
  } catch {
    // Silently ignore - haptics are a nice-to-have
  }
}

// ============================================================
// Components
// ============================================================

/**
 * Individual template chip button
 */
function TemplateChip({ template, onClick, disabled = false }: TemplateChipProps) {
  const handleClick = useCallback(() => {
    if (disabled) return;
    triggerHapticFeedback();
    onClick();
  }, [disabled, onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Insert ${template.label} template`}
      className={cn(
        // Base styling
        'flex-shrink-0',
        'flex items-center gap-1',
        'px-2.5 py-1.5',
        'rounded-md',
        'border',
        'text-sm font-medium',
        'whitespace-nowrap',
        'transition-colors duration-150',
        // Min height for touch target (36px - slightly smaller but still tappable)
        'min-h-[36px]',
        // Enabled state
        !disabled &&
          'bg-surface border-text-primary/10 text-text-primary hover:bg-text-primary/5 active:bg-text-primary/10 active:scale-[0.98]',
        // Disabled state
        disabled && 'bg-text-primary/5 border-text-primary/5 text-text-muted cursor-not-allowed'
      )}
    >
      <span className="text-sm" aria-hidden="true">
        {template.icon}
      </span>
      <span>{template.label}</span>
    </button>
  );
}

/**
 * Horizontally scrollable template chips container
 *
 * @example
 * ```tsx
 * <TemplateChips
 *   templates={templates}
 *   onSelect={(prompt) => setInputValue(prompt)}
 *   disabled={status === 'working'}
 * />
 * ```
 */
export function TemplateChips({
  templates,
  onSelect,
  disabled = false,
  className,
}: TemplateChipsProps) {
  // Don't render if no templates
  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <div
      role="toolbar"
      aria-label="Quick prompts"
      className={cn(
        // Container styling
        'flex items-center',
        'px-3 py-1.5',
        'bg-background',
        // Horizontal scroll
        'overflow-x-auto',
        // Hide scrollbar but keep functionality
        'scrollbar-hide',
        // Gap between chips
        'gap-1.5',
        className
      )}
    >
      {templates.map((template, index) => (
        <TemplateChip
          key={`${template.label}-${index}`}
          template={template}
          onClick={() => onSelect(template.prompt)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

// ============================================================
// Skeleton Component
// ============================================================

/**
 * Loading skeleton for template chips
 *
 * Shows placeholder chips while templates are loading.
 */
export function TemplateChipsSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-label="Loading templates"
      className={cn(
        // Container styling (matches TemplateChips)
        'flex items-center',
        'px-3 py-1.5',
        'bg-background',
        'overflow-x-auto',
        'scrollbar-hide',
        'gap-1.5',
        className
      )}
    >
      {/* Skeleton chips - varying widths for realistic look */}
      {[80, 100, 70, 90].map((width, index) => (
        <div
          key={index}
          className={cn(
            'flex-shrink-0',
            'h-[36px]',
            'rounded-lg',
            'bg-text-primary/10',
            'animate-pulse'
          )}
          style={{ width: `${width}px` }}
        />
      ))}
    </div>
  );
}
