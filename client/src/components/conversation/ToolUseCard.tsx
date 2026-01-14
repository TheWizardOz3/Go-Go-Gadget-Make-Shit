/**
 * ToolUseCard - Collapsible card for displaying tool usage
 *
 * Shows file edits, commands, searches, etc. with expand/collapse.
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { ToolUseEvent } from '@shared/types';

interface ToolUseCardProps {
  /** The tool use event to display */
  tool: ToolUseEvent;
  /** Additional CSS classes */
  className?: string;
}

/** Tool metadata for display */
interface ToolMeta {
  icon: string;
  label: string;
  getSummary: (input: Record<string, unknown>) => string;
}

/** Tool type configurations */
const TOOL_CONFIG: Record<string, ToolMeta> = {
  write_file: {
    icon: '📝',
    label: 'Wrote file',
    getSummary: (input) => String(input.path || input.file_path || ''),
  },
  read_file: {
    icon: '📖',
    label: 'Read file',
    getSummary: (input) => String(input.path || input.file_path || ''),
  },
  edit_file: {
    icon: '✏️',
    label: 'Edited file',
    getSummary: (input) => String(input.path || input.file_path || ''),
  },
  create_file: {
    icon: '📄',
    label: 'Created file',
    getSummary: (input) => String(input.path || input.file_path || ''),
  },
  delete_file: {
    icon: '🗑️',
    label: 'Deleted file',
    getSummary: (input) => String(input.path || input.file_path || ''),
  },
  run_command: {
    icon: '💻',
    label: 'Ran command',
    getSummary: (input) => String(input.command || '').slice(0, 50),
  },
  bash: {
    icon: '💻',
    label: 'Ran command',
    getSummary: (input) => String(input.command || '').slice(0, 50),
  },
  execute_command: {
    icon: '💻',
    label: 'Ran command',
    getSummary: (input) => String(input.command || '').slice(0, 50),
  },
  search: {
    icon: '🔍',
    label: 'Searched',
    getSummary: (input) => String(input.query || input.pattern || ''),
  },
  grep: {
    icon: '🔍',
    label: 'Searched',
    getSummary: (input) => String(input.pattern || input.query || ''),
  },
  list_dir: {
    icon: '📁',
    label: 'Listed directory',
    getSummary: (input) => String(input.path || input.directory || ''),
  },
  glob: {
    icon: '📁',
    label: 'Found files',
    getSummary: (input) => String(input.pattern || ''),
  },
  web_search: {
    icon: '🌐',
    label: 'Web search',
    getSummary: (input) => String(input.query || ''),
  },
  TodoWrite: {
    icon: '✅',
    label: 'Updated todos',
    getSummary: () => '',
  },
};

/** Default config for unknown tools */
const DEFAULT_TOOL_CONFIG: ToolMeta = {
  icon: '🔧',
  label: 'Used tool',
  getSummary: () => '',
};

/**
 * Get tool configuration for display
 */
function getToolConfig(toolName: string): ToolMeta {
  return (
    TOOL_CONFIG[toolName] || {
      ...DEFAULT_TOOL_CONFIG,
      label: toolName.replace(/_/g, ' '),
    }
  );
}

/**
 * Status indicator dot
 */
function StatusDot({ status }: { status: ToolUseEvent['status'] }) {
  return (
    <span
      className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        status === 'complete' && 'bg-success',
        status === 'pending' && 'bg-working animate-pulse',
        status === 'error' && 'bg-error'
      )}
      aria-label={`Status: ${status}`}
    />
  );
}

/**
 * Chevron icon for expand/collapse
 */
function ChevronIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={cn(
        'h-4 w-4 transition-transform duration-200',
        expanded && 'rotate-180',
        className
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * ToolUseCard component - collapsible tool usage display
 *
 * @example
 * ```tsx
 * <ToolUseCard tool={toolUseEvent} />
 * ```
 */
export function ToolUseCard({ tool, className }: ToolUseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = getToolConfig(tool.tool);
  const summary = config.getSummary(tool.input);

  const hasDetails = Object.keys(tool.input).length > 0 || tool.output;

  return (
    <div
      className={cn(
        'rounded-lg border border-text-primary/10 bg-surface overflow-hidden',
        className
      )}
    >
      {/* Collapsed header - always visible */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          'transition-colors duration-150',
          hasDetails && 'hover:bg-text-primary/5 cursor-pointer',
          !hasDetails && 'cursor-default'
        )}
        aria-expanded={expanded}
      >
        {/* Status dot */}
        <StatusDot status={tool.status} />

        {/* Tool icon */}
        <span className="text-base" aria-hidden="true">
          {config.icon}
        </span>

        {/* Tool label and summary */}
        <span className="flex-1 min-w-0 flex items-center gap-2 text-sm">
          <span className="font-medium text-text-secondary">{config.label}</span>
          {summary && <span className="text-text-muted truncate font-mono text-xs">{summary}</span>}
        </span>

        {/* Expand chevron (only if has details) */}
        {hasDetails && <ChevronIcon expanded={expanded} className="text-text-muted" />}
      </button>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 border-t border-text-primary/5">
          {/* Input parameters */}
          {Object.keys(tool.input).length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Input
              </span>
              <pre className="mt-1 p-2 rounded bg-[#0d1117] text-xs font-mono text-[#e6edf3] overflow-x-auto max-h-40 overflow-y-auto">
                {formatInput(tool.input)}
              </pre>
            </div>
          )}

          {/* Output */}
          {tool.output && (
            <div>
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Output
              </span>
              <pre className="mt-1 p-2 rounded bg-[#0d1117] text-xs font-mono text-[#e6edf3] overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                {tool.output.length > 500 ? tool.output.slice(0, 500) + '...' : tool.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Format input object for display
 */
function formatInput(input: Record<string, unknown>): string {
  // For file operations, show path prominently
  if ('path' in input || 'file_path' in input) {
    const path = input.path || input.file_path;
    const rest = { ...input };
    delete rest.path;
    delete rest.file_path;

    // If there's content, truncate it
    if ('content' in rest && typeof rest.content === 'string') {
      const content = rest.content as string;
      rest.content =
        content.length > 200 ? content.slice(0, 200) + `... (${content.length} chars)` : content;
    }

    const hasOtherKeys = Object.keys(rest).length > 0;
    return hasOtherKeys ? `path: ${path}\n${JSON.stringify(rest, null, 2)}` : `path: ${path}`;
  }

  // For commands, show command prominently
  if ('command' in input) {
    return `$ ${input.command}`;
  }

  // Default: JSON format
  return JSON.stringify(input, null, 2);
}
