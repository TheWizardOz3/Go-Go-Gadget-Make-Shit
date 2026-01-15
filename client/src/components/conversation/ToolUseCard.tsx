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

/** Tool type configurations with icon components */
type ToolIconComponent = React.FC<{ className?: string }>;

interface ToolMeta {
  Icon: ToolIconComponent;
  label: string;
  getSummary: (input: Record<string, unknown>) => string;
  color?: string;
}

/** File write icon */
function WriteIcon({ className }: { className?: string }) {
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
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

/** File read icon */
function ReadIcon({ className }: { className?: string }) {
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

/** Terminal icon */
function TerminalIcon({ className }: { className?: string }) {
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
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

/** Search icon */
function SearchIcon({ className }: { className?: string }) {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

/** Folder icon */
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
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

/** Globe/Web icon */
function GlobeIcon({ className }: { className?: string }) {
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
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

/** Checklist icon */
function ChecklistIcon({ className }: { className?: string }) {
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
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

/** Trash icon */
function TrashIcon({ className }: { className?: string }) {
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
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

/** Default tool icon */
function ToolIcon({ className }: { className?: string }) {
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
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/** Tool type configurations */
const TOOL_CONFIG: Record<string, ToolMeta> = {
  write_file: {
    Icon: WriteIcon,
    label: 'Write',
    getSummary: (input) => String(input.path || input.file_path || ''),
    color: 'text-success',
  },
  read_file: {
    Icon: ReadIcon,
    label: 'Read',
    getSummary: (input) => String(input.path || input.file_path || ''),
    color: 'text-accent',
  },
  edit_file: {
    Icon: WriteIcon,
    label: 'Edit',
    getSummary: (input) => String(input.path || input.file_path || ''),
    color: 'text-warning',
  },
  create_file: {
    Icon: WriteIcon,
    label: 'Create',
    getSummary: (input) => String(input.path || input.file_path || ''),
    color: 'text-success',
  },
  delete_file: {
    Icon: TrashIcon,
    label: 'Delete',
    getSummary: (input) => String(input.path || input.file_path || ''),
    color: 'text-error',
  },
  run_command: {
    Icon: TerminalIcon,
    label: 'Bash',
    getSummary: (input) => String(input.command || '').slice(0, 50),
    color: 'text-accent',
  },
  bash: {
    Icon: TerminalIcon,
    label: 'Bash',
    getSummary: (input) => String(input.command || '').slice(0, 50),
    color: 'text-accent',
  },
  execute_command: {
    Icon: TerminalIcon,
    label: 'Bash',
    getSummary: (input) => String(input.command || '').slice(0, 50),
    color: 'text-accent',
  },
  search: {
    Icon: SearchIcon,
    label: 'Search',
    getSummary: (input) => String(input.query || input.pattern || ''),
    color: 'text-accent',
  },
  grep: {
    Icon: SearchIcon,
    label: 'Grep',
    getSummary: (input) => String(input.pattern || input.query || ''),
    color: 'text-accent',
  },
  list_dir: {
    Icon: FolderIcon,
    label: 'List',
    getSummary: (input) => String(input.path || input.directory || ''),
    color: 'text-accent',
  },
  glob: {
    Icon: FolderIcon,
    label: 'Glob',
    getSummary: (input) => String(input.pattern || ''),
    color: 'text-accent',
  },
  web_search: {
    Icon: GlobeIcon,
    label: 'Web',
    getSummary: (input) => String(input.query || ''),
    color: 'text-accent',
  },
  TodoWrite: {
    Icon: ChecklistIcon,
    label: 'Todos',
    getSummary: () => '',
    color: 'text-success',
  },
};

/** Default config for unknown tools */
const DEFAULT_TOOL_CONFIG: ToolMeta = {
  Icon: ToolIcon,
  label: 'Tool',
  getSummary: () => '',
  color: 'text-text-muted',
};

/**
 * Get tool configuration for display
 */
function getToolConfig(toolName: string): ToolMeta {
  // Normalize tool name - handle various formats
  const normalizedName = toolName.toLowerCase().replace(/-/g, '_');

  return (
    TOOL_CONFIG[toolName] ||
    TOOL_CONFIG[normalizedName] || {
      ...DEFAULT_TOOL_CONFIG,
      label: toolName.replace(/_/g, ' ').replace(/-/g, ' '),
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
  const { Icon, color } = config;

  const hasDetails = Object.keys(tool.input).length > 0 || tool.output;

  return (
    <div
      className={cn('rounded-md border border-tool-border bg-tool-bg overflow-hidden', className)}
    >
      {/* Collapsed header - always visible */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-1.5 text-left',
          'transition-colors duration-150',
          hasDetails && 'hover:bg-text-primary/5 cursor-pointer',
          !hasDetails && 'cursor-default'
        )}
        aria-expanded={expanded}
      >
        {/* Status dot */}
        <StatusDot status={tool.status} />

        {/* Tool icon */}
        <span className={cn('flex-shrink-0', color)} aria-hidden="true">
          <Icon />
        </span>

        {/* Tool label and summary */}
        <span className="flex-1 min-w-0 flex items-center gap-1.5 text-xs">
          <span className="font-medium text-text-secondary">{config.label}</span>
          {summary && <span className="text-text-muted truncate font-mono">{summary}</span>}
        </span>

        {/* Expand chevron (only if has details) */}
        {hasDetails && <ChevronIcon expanded={expanded} className="text-text-muted h-3 w-3" />}
      </button>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-2.5 pb-2 pt-1 border-t border-tool-border">
          {/* Input parameters */}
          {Object.keys(tool.input).length > 0 && (
            <div className="mb-2">
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Input
              </span>
              <pre className="mt-1 p-2 rounded bg-background text-xs font-mono text-text-secondary overflow-x-auto max-h-32 overflow-y-auto">
                {formatInput(tool.input)}
              </pre>
            </div>
          )}

          {/* Output */}
          {tool.output && (
            <div>
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Output
              </span>
              <pre className="mt-1 p-2 rounded bg-background text-xs font-mono text-text-secondary overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
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
