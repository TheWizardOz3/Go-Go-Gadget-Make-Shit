/**
 * Tests for FileContentView component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileContentView } from './FileContentView';
import type { FileContentResponse } from '@shared/types';

// Mock file content
const mockFileContent: FileContentResponse = {
  path: 'src/App.tsx',
  name: 'App.tsx',
  extension: 'tsx',
  language: 'tsx',
  content: 'import React from "react";\n\nexport function App() {\n  return <div>Hello</div>;\n}',
  lineCount: 5,
  githubUrl: 'https://github.com/user/repo/blob/main/src/App.tsx',
};

const mockFileWithoutGitHub: FileContentResponse = {
  path: 'local/file.ts',
  name: 'file.ts',
  extension: 'ts',
  language: 'typescript',
  content: 'const x = 1;\nconst y = 2;',
  lineCount: 2,
  githubUrl: null,
};

const mockLargeFile: FileContentResponse = {
  path: 'src/data.json',
  name: 'data.json',
  extension: 'json',
  language: 'json',
  content: Array.from({ length: 100 }, (_, i) => `"line${i + 1}": ${i + 1}`).join(',\n'),
  lineCount: 100,
  githubUrl: null,
};

describe('FileContentView', () => {
  describe('content rendering', () => {
    it('renders file name in header', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      expect(screen.getByText('App.tsx')).toBeInTheDocument();
    });

    it('renders file path', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    });

    it('renders language and line count', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      expect(screen.getByText(/TypeScript JSX/i)).toBeInTheDocument();
      expect(screen.getByText(/5 lines/i)).toBeInTheDocument();
    });

    it('renders file content', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      expect(screen.getByText(/import React/)).toBeInTheDocument();
      expect(screen.getByText(/export function App/)).toBeInTheDocument();
    });

    it('renders line numbers', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      // Should have line numbers 1-5
      expect(screen.getByLabelText('Line 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Line 5')).toBeInTheDocument();
    });

    it('renders multiple lines correctly', () => {
      render(<FileContentView file={mockLargeFile} onBack={() => {}} />);

      // Check first and last line numbers exist
      expect(screen.getByLabelText('Line 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Line 100')).toBeInTheDocument();
    });
  });

  describe('GitHub link', () => {
    it('renders GitHub link when available', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      const githubLink = screen.getByRole('link', { name: /View on GitHub/i });
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute(
        'href',
        'https://github.com/user/repo/blob/main/src/App.tsx'
      );
    });

    it('opens GitHub link in new tab', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      const githubLink = screen.getByRole('link', { name: /View on GitHub/i });
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not render GitHub link when not available', () => {
      render(<FileContentView file={mockFileWithoutGitHub} onBack={() => {}} />);

      expect(screen.queryByRole('link', { name: /View on GitHub/i })).not.toBeInTheDocument();
    });
  });

  describe('back button', () => {
    it('renders back button', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      expect(screen.getByRole('button', { name: /Go back to file tree/i })).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();
      render(<FileContentView file={mockFileContent} onBack={onBack} />);

      await user.click(screen.getByRole('button', { name: /Go back to file tree/i }));

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('renders loading spinner when isLoading is true', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} isLoading />);

      expect(screen.getByText('Loading file...')).toBeInTheDocument();
    });

    it('does not render content when loading', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} isLoading />);

      expect(screen.queryByText(/import React/)).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error message when error is provided', () => {
      render(
        <FileContentView
          file={mockFileContent}
          onBack={() => {}}
          error="File not found in repository"
        />
      );

      expect(screen.getByText('Failed to load file')).toBeInTheDocument();
      expect(screen.getByText('File not found in repository')).toBeInTheDocument();
    });

    it('renders back button in error state', () => {
      render(
        <FileContentView file={mockFileContent} onBack={() => {}} error="Something went wrong" />
      );

      expect(screen.getByRole('button', { name: /Go back/i })).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked in error state', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();
      render(<FileContentView file={mockFileContent} onBack={onBack} error="Error occurred" />);

      await user.click(screen.getByRole('button', { name: /Go back/i }));

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has accessible header structure', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      // Header should contain file info
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    it('has accessible line number labels', () => {
      render(<FileContentView file={mockFileContent} onBack={() => {}} />);

      // Line numbers should have aria-labels
      expect(screen.getByLabelText('Line 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Line 3')).toBeInTheDocument();
    });
  });
});
