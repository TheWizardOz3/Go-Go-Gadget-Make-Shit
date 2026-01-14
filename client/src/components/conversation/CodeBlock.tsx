/**
 * CodeBlock - Syntax highlighted code block using Shiki
 *
 * Provides syntax highlighting with a dark theme matching the app aesthetic.
 */

import { useEffect, useState, useCallback } from 'react';
import { codeToHtml } from 'shiki';
import { cn } from '@/lib/cn';

interface CodeBlockProps {
  /** The code content to highlight */
  code: string;
  /** Programming language (e.g., 'typescript', 'python') */
  language?: string;
  /** Additional CSS classes */
  className?: string;
}

/** Common language aliases */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  rs: 'rust',
  go: 'go',
  json: 'json',
  html: 'html',
  css: 'css',
  sql: 'sql',
  graphql: 'graphql',
  dockerfile: 'dockerfile',
  plaintext: 'plaintext',
  text: 'plaintext',
};

/** Supported languages for display label */
const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  jsx: 'JSX',
  python: 'Python',
  ruby: 'Ruby',
  bash: 'Bash',
  yaml: 'YAML',
  markdown: 'Markdown',
  rust: 'Rust',
  go: 'Go',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  graphql: 'GraphQL',
  dockerfile: 'Dockerfile',
  plaintext: 'Plain Text',
};

/**
 * Normalize language string to a supported Shiki language
 */
function normalizeLanguage(lang?: string): string {
  if (!lang) return 'plaintext';

  const normalized = lang.toLowerCase().trim();

  // Check aliases first
  if (normalized in LANGUAGE_ALIASES) {
    return LANGUAGE_ALIASES[normalized];
  }

  // Return as-is if it looks like a valid language
  return normalized;
}

/**
 * Get display label for a language
 */
function getLanguageLabel(lang?: string): string {
  if (!lang) return '';

  const normalized = normalizeLanguage(lang);
  return LANGUAGE_LABELS[normalized] || lang;
}

/**
 * CodeBlock component with syntax highlighting
 *
 * @example
 * ```tsx
 * <CodeBlock code="const x = 1;" language="typescript" />
 * ```
 */
export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const normalizedLang = normalizeLanguage(language);
  const displayLabel = getLanguageLabel(language);

  // Highlight code with Shiki
  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        const html = await codeToHtml(code, {
          lang: normalizedLang,
          theme: 'github-dark-default',
        });

        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch (error) {
        // If highlighting fails (e.g., unsupported language), keep showing plain code
        console.warn('Shiki highlighting failed:', error);
        if (!cancelled) {
          setHighlightedHtml(null);
        }
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, normalizedLang]);

  // Copy to clipboard handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [code]);

  return (
    <div className={cn('relative group my-3', className)}>
      {/* Header with language label and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/10 rounded-t-lg">
        {/* Language label */}
        <span className="text-xs font-medium text-text-muted">{displayLabel}</span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs',
            'text-text-muted hover:text-text-secondary',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-1 focus:ring-accent'
          )}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto bg-[#0d1117] rounded-b-lg">
        {highlightedHtml ? (
          // Highlighted code (Shiki generates its own pre/code tags)
          <div
            className="shiki-wrapper text-sm [&_pre]:p-4 [&_pre]:m-0 [&_pre]:bg-transparent [&_code]:bg-transparent"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          // Fallback: plain code while loading or if highlighting failed
          <pre className="p-4 m-0 text-sm font-mono text-[#e6edf3] overflow-x-auto">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

/**
 * Copy icon
 */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Check icon (for copied state)
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
