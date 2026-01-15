/**
 * DiffLine - Single line in a diff view
 *
 * Renders a line of code/text with line number, background color based on type,
 * and optional syntax highlighting tokens.
 */

import { cn } from '@/lib/cn';
import type { DiffLine as DiffLineType } from '@shared/types';
import { DiffLineNumber } from './DiffLineNumber';

interface DiffLineProps {
  /** The diff line data */
  line: DiffLineType;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get background color classes based on line type
 */
function getBackgroundClasses(type: DiffLineType['type']): string {
  switch (type) {
    case 'add':
      return 'bg-green-50 dark:bg-green-950/30';
    case 'delete':
      return 'bg-red-50 dark:bg-red-950/30';
    case 'context':
      return 'bg-white dark:bg-zinc-950';
    default:
      return 'bg-white dark:bg-zinc-950';
  }
}

/**
 * DiffLine Component
 *
 * Renders a single line in the diff view with line number gutter and content.
 * Supports horizontal scrolling for long lines.
 *
 * @example
 * ```tsx
 * <DiffLine
 *   line={{
 *     type: 'add',
 *     content: 'const foo = "bar";',
 *     newLineNumber: 5
 *   }}
 * />
 * ```
 */
export function DiffLine({ line, className }: DiffLineProps) {
  const { type, content, oldLineNumber, newLineNumber } = line;

  // Determine which line number to display
  // - For added lines: show new line number
  // - For deleted lines: show old line number
  // - For context lines: show new line number (or old if new not available)
  const displayLineNumber = type === 'delete' ? oldLineNumber : (newLineNumber ?? oldLineNumber);

  return (
    <div
      className={cn(
        // Flex container for line number + content
        'flex items-stretch text-xs leading-[1.5]',
        // Background color based on line type
        getBackgroundClasses(type),
        // Hover effect for better visibility
        'hover:brightness-95 dark:hover:brightness-110',
        className
      )}
    >
      {/* Line number gutter */}
      <DiffLineNumber lineNumber={displayLineNumber ?? null} type={type} />

      {/* Code content */}
      <div
        className={cn(
          // Flex-grow to fill remaining space
          'flex-1 overflow-x-auto px-3 py-0',
          // Monospace font for code
          'font-mono',
          // Text color
          'text-gray-900 dark:text-gray-100',
          // Strikethrough for deleted lines
          type === 'delete' && 'line-through opacity-75'
        )}
      >
        {/* Pre-formatted content preserves whitespace */}
        <pre className="inline">
          <code>{content || ' '}</code>
        </pre>
      </div>
    </div>
  );
}
