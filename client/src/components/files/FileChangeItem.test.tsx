/**
 * Tests for FileChangeItem component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileChangeItem } from './FileChangeItem';
import type { FileChange } from '@shared/types';

// Mock file change data
const mockModifiedFile: FileChange = {
  path: 'src/components/Button.tsx',
  status: 'modified',
  additions: 10,
  deletions: 5,
};

const mockAddedFile: FileChange = {
  path: 'src/utils/helpers.ts',
  status: 'added',
  additions: 25,
  deletions: 0,
};

const mockDeletedFile: FileChange = {
  path: 'src/old/deprecated.ts',
  status: 'deleted',
  additions: 0,
  deletions: 30,
};

const mockRootFile: FileChange = {
  path: 'README.md',
  status: 'modified',
  additions: 3,
  deletions: 1,
};

describe('FileChangeItem', () => {
  describe('rendering', () => {
    it('renders file name', () => {
      render(<FileChangeItem file={mockModifiedFile} />);

      expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    });

    it('renders directory path', () => {
      render(<FileChangeItem file={mockModifiedFile} />);

      expect(screen.getByText('src/components')).toBeInTheDocument();
    });

    it('does not render directory for root-level files', () => {
      render(<FileChangeItem file={mockRootFile} />);

      // Should show file name
      expect(screen.getByText('README.md')).toBeInTheDocument();
      // Should not show any directory path
      expect(screen.queryByText('.')).not.toBeInTheDocument();
    });

    it('renders additions count with plus sign', () => {
      render(<FileChangeItem file={mockModifiedFile} />);

      expect(screen.getByText('+10')).toBeInTheDocument();
    });

    it('renders deletions count with minus sign', () => {
      render(<FileChangeItem file={mockModifiedFile} />);

      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('does not render additions when zero', () => {
      render(<FileChangeItem file={mockDeletedFile} />);

      expect(screen.queryByText('+0')).not.toBeInTheDocument();
    });

    it('does not render deletions when zero', () => {
      render(<FileChangeItem file={mockAddedFile} />);

      expect(screen.queryByText('-0')).not.toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('has correct aria-label for modified file', () => {
      render(<FileChangeItem file={mockModifiedFile} onPress={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Modified file: src/components/Button.tsx');
    });

    it('has correct aria-label for added file', () => {
      render(<FileChangeItem file={mockAddedFile} onPress={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Added file: src/utils/helpers.ts');
    });

    it('has correct aria-label for deleted file', () => {
      render(<FileChangeItem file={mockDeletedFile} onPress={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Deleted file: src/old/deprecated.ts');
    });
  });

  describe('interaction', () => {
    it('calls onPress with file path when clicked', async () => {
      const user = userEvent.setup();
      const handlePress = vi.fn();

      render(<FileChangeItem file={mockModifiedFile} onPress={handlePress} />);

      await user.click(screen.getByRole('button'));

      expect(handlePress).toHaveBeenCalledTimes(1);
      expect(handlePress).toHaveBeenCalledWith('src/components/Button.tsx');
    });

    it('renders as non-interactive div when onPress is not provided', () => {
      render(<FileChangeItem file={mockModifiedFile} />);

      // Should not have role="button" when not interactive
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows chevron when onPress is provided', () => {
      render(<FileChangeItem file={mockModifiedFile} onPress={vi.fn()} />);

      // Chevron should be present (it's an svg with aria-hidden)
      const button = screen.getByRole('button');
      const svgs = button.querySelectorAll('svg[aria-hidden="true"]');
      // Should have multiple SVGs: status icon + chevron
      expect(svgs.length).toBeGreaterThan(1);
    });

    it('does not show chevron when onPress is not provided', () => {
      const { container } = render(<FileChangeItem file={mockModifiedFile} />);

      // Should only have one SVG (the status icon)
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBe(1);
    });

    it('handles keyboard navigation (Enter)', async () => {
      const user = userEvent.setup();
      const handlePress = vi.fn();

      render(<FileChangeItem file={mockModifiedFile} onPress={handlePress} />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(handlePress).toHaveBeenCalledWith('src/components/Button.tsx');
    });

    it('handles keyboard navigation (Space)', async () => {
      const user = userEvent.setup();
      const handlePress = vi.fn();

      render(<FileChangeItem file={mockModifiedFile} onPress={handlePress} />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

      expect(handlePress).toHaveBeenCalledWith('src/components/Button.tsx');
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <FileChangeItem file={mockModifiedFile} className="custom-class" />
      );

      // The root element should have the custom class
      const rootElement = container.firstChild;
      expect(rootElement).toHaveClass('custom-class');
    });

    it('has interactive styles when onPress is provided', () => {
      render(<FileChangeItem file={mockModifiedFile} onPress={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('cursor-pointer');
    });

    it('does not have interactive styles when onPress is not provided', () => {
      const { container } = render(<FileChangeItem file={mockModifiedFile} />);

      const rootElement = container.firstChild;
      expect(rootElement).not.toHaveClass('cursor-pointer');
    });
  });
});
