/**
 * Tests for FileTreeNode component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileTreeNode } from './FileTreeNode';
import type { FileTreeEntry } from '@shared/types';

// Mock file entries
const mockFile: FileTreeEntry = {
  name: 'App.tsx',
  path: 'src/App.tsx',
  type: 'file',
  extension: 'tsx',
};

const mockFolder: FileTreeEntry = {
  name: 'components',
  path: 'src/components',
  type: 'directory',
  extension: null,
  children: [
    { name: 'Button.tsx', path: 'src/components/Button.tsx', type: 'file', extension: 'tsx' },
    { name: 'Input.tsx', path: 'src/components/Input.tsx', type: 'file', extension: 'tsx' },
  ],
};

const mockEmptyFolder: FileTreeEntry = {
  name: 'empty',
  path: 'src/empty',
  type: 'directory',
  extension: null,
  children: [],
};

const mockLongFileName: FileTreeEntry = {
  name: 'this-is-a-very-long-file-name-that-should-be-truncated.component.tsx',
  path: 'src/this-is-a-very-long-file-name-that-should-be-truncated.component.tsx',
  type: 'file',
  extension: 'tsx',
};

describe('FileTreeNode', () => {
  describe('file rendering', () => {
    it('renders file name', () => {
      render(<FileTreeNode entry={mockFile} />);

      expect(screen.getByText('App.tsx')).toBeInTheDocument();
    });

    it('renders file with correct ARIA label', () => {
      render(<FileTreeNode entry={mockFile} />);

      expect(screen.getByRole('button', { name: /File: App.tsx/i })).toBeInTheDocument();
    });

    it('renders treeitem role', () => {
      render(<FileTreeNode entry={mockFile} />);

      expect(screen.getByRole('treeitem')).toBeInTheDocument();
    });

    it('renders long file names (truncation handled by CSS)', () => {
      render(<FileTreeNode entry={mockLongFileName} />);

      expect(
        screen.getByText('this-is-a-very-long-file-name-that-should-be-truncated.component.tsx')
      ).toBeInTheDocument();
    });
  });

  describe('folder rendering', () => {
    it('renders folder name', () => {
      render(<FileTreeNode entry={mockFolder} />);

      expect(screen.getByText('components')).toBeInTheDocument();
    });

    it('renders folder with correct ARIA label', () => {
      render(<FileTreeNode entry={mockFolder} />);

      expect(screen.getByRole('button', { name: /Folder: components/i })).toBeInTheDocument();
    });

    it('does not render children by default (collapsed)', () => {
      render(<FileTreeNode entry={mockFolder} />);

      expect(screen.queryByText('Button.tsx')).not.toBeInTheDocument();
    });

    it('has aria-expanded false by default', () => {
      render(<FileTreeNode entry={mockFolder} />);

      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('folder expand/collapse', () => {
    it('expands folder on click', async () => {
      const user = userEvent.setup();
      render(<FileTreeNode entry={mockFolder} />);

      await user.click(screen.getByRole('button', { name: /Folder: components/i }));

      expect(screen.getByText('Button.tsx')).toBeInTheDocument();
      expect(screen.getByText('Input.tsx')).toBeInTheDocument();
    });

    it('collapses folder on second click', async () => {
      const user = userEvent.setup();
      render(<FileTreeNode entry={mockFolder} />);

      // Expand
      await user.click(screen.getByRole('button', { name: /Folder: components/i }));
      expect(screen.getByText('Button.tsx')).toBeInTheDocument();

      // Collapse
      await user.click(screen.getByRole('button', { name: /Folder: components/i }));
      expect(screen.queryByText('Button.tsx')).not.toBeInTheDocument();
    });

    it('updates aria-expanded when expanded', async () => {
      const user = userEvent.setup();
      render(<FileTreeNode entry={mockFolder} />);

      await user.click(screen.getByRole('button', { name: /Folder: components/i }));

      // Get all treeitems, first one is the folder with aria-expanded
      const treeitems = screen.getAllByRole('treeitem');
      expect(treeitems[0]).toHaveAttribute('aria-expanded', 'true');
    });

    it('handles empty folder gracefully', async () => {
      const user = userEvent.setup();
      render(<FileTreeNode entry={mockEmptyFolder} />);

      await user.click(screen.getByRole('button', { name: /Folder: empty/i }));

      // Should expand without crashing, no children visible
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('file selection', () => {
    it('calls onSelectFile when file is clicked', async () => {
      const user = userEvent.setup();
      const onSelectFile = vi.fn();
      render(<FileTreeNode entry={mockFile} onSelectFile={onSelectFile} />);

      await user.click(screen.getByRole('button', { name: /File: App.tsx/i }));

      expect(onSelectFile).toHaveBeenCalledWith('src/App.tsx');
    });

    it('calls onSelectFile for nested files', async () => {
      const user = userEvent.setup();
      const onSelectFile = vi.fn();
      render(<FileTreeNode entry={mockFolder} onSelectFile={onSelectFile} />);

      // Expand folder first
      await user.click(screen.getByRole('button', { name: /Folder: components/i }));

      // Click child file
      await user.click(screen.getByRole('button', { name: /File: Button.tsx/i }));

      expect(onSelectFile).toHaveBeenCalledWith('src/components/Button.tsx');
    });

    it('does not call onSelectFile when folder is clicked', async () => {
      const user = userEvent.setup();
      const onSelectFile = vi.fn();
      render(<FileTreeNode entry={mockFolder} onSelectFile={onSelectFile} />);

      await user.click(screen.getByRole('button', { name: /Folder: components/i }));

      expect(onSelectFile).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('expands folder on Enter key', async () => {
      const user = userEvent.setup();
      render(<FileTreeNode entry={mockFolder} />);

      const folderButton = screen.getByRole('button', { name: /Folder: components/i });
      folderButton.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    });

    it('expands folder on Space key', async () => {
      const user = userEvent.setup();
      render(<FileTreeNode entry={mockFolder} />);

      const folderButton = screen.getByRole('button', { name: /Folder: components/i });
      folderButton.focus();
      await user.keyboard(' ');

      expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    });

    it('selects file on Enter key', async () => {
      const user = userEvent.setup();
      const onSelectFile = vi.fn();
      render(<FileTreeNode entry={mockFile} onSelectFile={onSelectFile} />);

      const fileButton = screen.getByRole('button', { name: /File: App.tsx/i });
      fileButton.focus();
      await user.keyboard('{Enter}');

      expect(onSelectFile).toHaveBeenCalledWith('src/App.tsx');
    });
  });

  describe('indentation', () => {
    it('applies correct padding for root level (depth 0)', () => {
      render(<FileTreeNode entry={mockFile} depth={0} />);

      const button = screen.getByRole('button', { name: /File: App.tsx/i });
      // depth 0 = 12px base padding
      expect(button).toHaveStyle({ paddingLeft: '12px' });
    });

    it('applies increased padding for nested items', () => {
      render(<FileTreeNode entry={mockFile} depth={2} />);

      const button = screen.getByRole('button', { name: /File: App.tsx/i });
      // depth 2 = 12px + (2 * 16px) = 44px
      expect(button).toHaveStyle({ paddingLeft: '44px' });
    });
  });
});
