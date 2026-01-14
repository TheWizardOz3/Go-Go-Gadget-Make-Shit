/**
 * Tests for FileChangeList component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileChangeList, FileChangeListSkeleton } from './FileChangeList';
import type { FileChange } from '@shared/types';

// Mock file changes data
const mockFiles: FileChange[] = [
  { path: 'src/index.ts', status: 'modified', additions: 10, deletions: 5 },
  { path: 'src/new-file.ts', status: 'added', additions: 20, deletions: 0 },
  { path: 'src/removed.ts', status: 'deleted', additions: 0, deletions: 15 },
];

describe('FileChangeList', () => {
  describe('rendering', () => {
    it('renders all files in the list', () => {
      render(<FileChangeList files={mockFiles} />);

      expect(screen.getByText('index.ts')).toBeInTheDocument();
      expect(screen.getByText('new-file.ts')).toBeInTheDocument();
      expect(screen.getByText('removed.ts')).toBeInTheDocument();
    });

    it('renders empty list when no files', () => {
      render(<FileChangeList files={[]} />);

      // Should render a list container with aria-label
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list.children).toHaveLength(0);
    });

    it('has accessible list role', () => {
      render(<FileChangeList files={mockFiles} />);

      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label', 'Changed files');
    });

    it('renders the correct number of file items', () => {
      render(<FileChangeList files={mockFiles} />);

      const list = screen.getByRole('list');
      expect(list.children).toHaveLength(3);
    });

    it('shows skeleton when loading', () => {
      render(<FileChangeList files={[]} isLoading={true} />);

      // Should not render the list when loading
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onFilePress with file path when a file is clicked', async () => {
      const user = userEvent.setup();
      const handleFilePress = vi.fn();

      render(<FileChangeList files={mockFiles} onFilePress={handleFilePress} />);

      await user.click(screen.getByText('index.ts'));

      expect(handleFilePress).toHaveBeenCalledTimes(1);
      expect(handleFilePress).toHaveBeenCalledWith('src/index.ts');
    });

    it('calls onFilePress for each file clicked', async () => {
      const user = userEvent.setup();
      const handleFilePress = vi.fn();

      render(<FileChangeList files={mockFiles} onFilePress={handleFilePress} />);

      await user.click(screen.getByText('index.ts'));
      await user.click(screen.getByText('new-file.ts'));

      expect(handleFilePress).toHaveBeenCalledTimes(2);
      expect(handleFilePress).toHaveBeenNthCalledWith(1, 'src/index.ts');
      expect(handleFilePress).toHaveBeenNthCalledWith(2, 'src/new-file.ts');
    });

    it('items are interactive when onFilePress is provided', () => {
      render(<FileChangeList files={mockFiles} onFilePress={vi.fn()} />);

      // Items should have role="button" when interactive
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('items are not interactive when onFilePress is not provided', () => {
      render(<FileChangeList files={mockFiles} />);

      // Items should not have role="button" when not interactive
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      render(<FileChangeList files={mockFiles} className="custom-class" />);

      const list = screen.getByRole('list');
      expect(list).toHaveClass('custom-class');
    });
  });
});

describe('FileChangeListSkeleton', () => {
  it('renders skeleton loading state', () => {
    const { container } = render(<FileChangeListSkeleton />);

    // Should render a container with skeleton children
    const skeletonContainer = container.querySelector('.flex.flex-col');
    expect(skeletonContainer).toBeInTheDocument();
    // Should have 4 skeleton items (children are divs)
    expect(skeletonContainer?.children.length).toBe(4);
  });
});
