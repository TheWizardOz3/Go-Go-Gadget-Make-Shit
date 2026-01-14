/**
 * Markdown rendering configuration
 *
 * Custom components for react-markdown to style markdown content
 * with Tailwind classes matching our design system.
 */

import { isValidElement, type ReactNode } from 'react';
import type { Components } from 'react-markdown';
import { CodeBlock } from '@/components/conversation/CodeBlock';

/**
 * Extract text content from React children (for code blocks)
 */
function extractTextContent(children: ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('');
  }
  if (isValidElement(children) && children.props?.children) {
    return extractTextContent(children.props.children);
  }
  return '';
}

/**
 * Custom components for react-markdown
 *
 * These override default HTML elements with styled versions.
 * Code blocks use Shiki for syntax highlighting.
 */
export const markdownComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-text-primary mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-text-primary mt-3 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-text-primary mt-3 mb-1 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-medium text-text-primary mt-2 mb-1 first:mt-0">{children}</h4>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="text-base text-text-primary mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-5 mb-3 last:mb-0 space-y-1 text-text-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 mb-3 last:mb-0 space-y-1 text-text-primary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-base leading-relaxed">{children}</li>,

  // Inline styles
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent/80 transition-colors"
    >
      {children}
    </a>
  ),

  // Inline code (not code blocks)
  // Note: Code blocks are handled by the `pre` component below
  code: ({ children, className }) => {
    // If this code element has a language class, it's inside a pre block
    // and will be handled by the pre component's CodeBlock
    const isCodeBlock = className?.includes('language-');

    if (isCodeBlock) {
      // Return children as-is; the pre component will handle it
      return <code className={className}>{children}</code>;
    }

    // Inline code styling
    return (
      <code className="px-1.5 py-0.5 rounded bg-text-primary/10 text-sm font-mono text-accent">
        {children}
      </code>
    );
  },

  // Code blocks (pre wrapper) - uses Shiki for syntax highlighting
  pre: ({ children }) => {
    // Extract language and code content from the nested code element
    if (isValidElement(children) && children.type === 'code') {
      const className = children.props?.className || '';
      const languageMatch = className.match(/language-(\w+)/);
      const language = languageMatch ? languageMatch[1] : undefined;
      const code = extractTextContent(children.props?.children);

      return <CodeBlock code={code} language={language} />;
    }

    // Fallback for non-code content in pre tags
    return (
      <pre className="my-3 p-4 rounded-lg bg-[#0d1117] border border-text-primary/10 overflow-x-auto text-sm font-mono text-[#e6edf3]">
        {children}
      </pre>
    );
  },

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/50 pl-4 my-3 text-text-secondary italic">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-4 border-t border-text-primary/10" />,

  // Tables
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-text-primary/20">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-text-primary/10 last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-text-primary">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-text-secondary">{children}</td>,
};

/**
 * Props for the MarkdownContent component
 */
export interface MarkdownContentProps {
  /** Markdown string to render */
  content: string;
  /** Additional CSS classes */
  className?: string;
  /** Custom components to override defaults */
  components?: Components;
}
