/**
 * FileIcon - Icon component for file tree entries
 *
 * Displays appropriate icons for files and directories based on type/extension.
 */

import { cn } from '@/lib/cn';

interface FileIconProps {
  /** File or directory name */
  name: string;
  /** Entry type */
  type: 'file' | 'directory';
  /** Whether the directory is expanded (for directory icons) */
  isExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Folder icon (closed)
 */
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M3.75 3A1.75 1.75 0 002 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-8.5A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75z" />
    </svg>
  );
}

/**
 * Folder icon (open)
 */
function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2 4.75C2 3.784 2.784 3 3.75 3h4.836c.464 0 .909.184 1.237.513l1.414 1.414a.25.25 0 00.177.073h4.836c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0116.25 17H3.75A1.75 1.75 0 012 15.25V4.75zm8.5 3a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Generic document icon
 */
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z" />
    </svg>
  );
}

/**
 * Code file icon (TypeScript, JavaScript, etc.)
 */
function CodeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.377 2.011a.75.75 0 01.612.867l-2.5 14.5a.75.75 0 01-1.478-.255l2.5-14.5a.75.75 0 01.866-.612z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * JSON/config file icon
 */
function ConfigIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.113a7.047 7.047 0 010-2.228L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Markdown/document file icon
 */
function MarkdownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Image file icon
 */
function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.97 1.969-2.97-2.969a.75.75 0 00-1.06 0l-5.72 5.72zM12.5 8a1 1 0 11-2 0 1 1 0 012 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Get file extension from name */
function getExtension(name: string): string | null {
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1 || lastDot === name.length - 1) return null;
  return name.slice(lastDot + 1).toLowerCase();
}

/** Code file extensions */
const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'php',
  'lua',
  'vue',
  'svelte',
  'html',
  'css',
  'scss',
  'sass',
  'less',
]);

/** Config/data file extensions */
const CONFIG_EXTENSIONS = new Set([
  'json',
  'yaml',
  'yml',
  'toml',
  'xml',
  'ini',
  'cfg',
  'conf',
  'env',
  'gitignore',
  'dockerignore',
  'editorconfig',
]);

/** Markdown/doc file extensions */
const MARKDOWN_EXTENSIONS = new Set(['md', 'mdx', 'txt', 'rst', 'adoc']);

/** Image file extensions */
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']);

/**
 * Get icon and color based on file type and extension
 */
function getFileIconConfig(name: string): {
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
} {
  const ext = getExtension(name);

  if (!ext) {
    return { Icon: DocumentIcon, colorClass: 'text-text-muted' };
  }

  if (CODE_EXTENSIONS.has(ext)) {
    return { Icon: CodeIcon, colorClass: 'text-accent' };
  }

  if (CONFIG_EXTENSIONS.has(ext)) {
    return { Icon: ConfigIcon, colorClass: 'text-warning' };
  }

  if (MARKDOWN_EXTENSIONS.has(ext)) {
    return { Icon: MarkdownIcon, colorClass: 'text-success' };
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return { Icon: ImageIcon, colorClass: 'text-purple-400' };
  }

  return { Icon: DocumentIcon, colorClass: 'text-text-muted' };
}

/**
 * FileIcon component - displays appropriate icon for file tree entries
 *
 * @example
 * ```tsx
 * <FileIcon name="App.tsx" type="file" />
 * <FileIcon name="src" type="directory" isExpanded={true} />
 * ```
 */
export function FileIcon({ name, type, isExpanded, className }: FileIconProps) {
  // Directory icon
  if (type === 'directory') {
    const FolderComponent = isExpanded ? FolderOpenIcon : FolderIcon;
    return <FolderComponent className={cn('text-amber-500', className)} />;
  }

  // File icon based on extension
  const { Icon, colorClass } = getFileIconConfig(name);
  return <Icon className={cn(colorClass, className)} />;
}
