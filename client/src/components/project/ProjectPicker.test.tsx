/**
 * Tests for ProjectPicker component
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectPicker } from './ProjectPicker';
import type { ProjectSerialized } from '@shared/types';

// Mock project data
const mockProjects: ProjectSerialized[] = [
  {
    path: '/Users/test/project-alpha',
    name: 'project-alpha',
    encodedPath: '-Users-test-project-alpha',
    sessionCount: 5,
    lastSessionId: 'session-1',
    lastActivityAt: new Date().toISOString(),
  },
  {
    path: '/Users/test/project-beta',
    name: 'project-beta',
    encodedPath: '-Users-test-project-beta',
    sessionCount: 3,
    lastSessionId: 'session-2',
    lastActivityAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    path: '/Users/test/project-gamma',
    name: 'project-gamma',
    encodedPath: '-Users-test-project-gamma',
    sessionCount: 1,
    lastSessionId: 'session-3',
  },
];

// Generate many projects for search testing
const generateManyProjects = (count: number): ProjectSerialized[] => {
  return Array.from({ length: count }, (_, i) => ({
    path: `/Users/test/project-${i}`,
    name: `project-${i}`,
    encodedPath: `-Users-test-project-${i}`,
    sessionCount: i + 1,
    lastSessionId: `session-${i}`,
    lastActivityAt: new Date(Date.now() - i * 3600000).toISOString(),
  }));
};

describe('ProjectPicker', () => {
  // Clean up body overflow after each test
  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('visibility', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <ProjectPicker
          isOpen={false}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays "Select Project" title', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByText('Select Project')).toBeInTheDocument();
    });

    it('displays project count in header', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByText('(3)')).toBeInTheDocument();
    });
  });

  describe('project list', () => {
    it('renders all projects', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByText('project-alpha')).toBeInTheDocument();
      expect(screen.getByText('project-beta')).toBeInTheDocument();
      expect(screen.getByText('project-gamma')).toBeInTheDocument();
    });

    it('shows empty state when no projects', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={[]}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(screen.getByText(/Start a Claude Code session/)).toBeInTheDocument();
    });
  });

  describe('closing behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <ProjectPicker
          isOpen={true}
          onClose={onClose}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      await user.click(screen.getByLabelText('Close'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <ProjectPicker
          isOpen={true}
          onClose={onClose}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      // Click on the backdrop (dialog element itself)
      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <ProjectPicker
          isOpen={true}
          onClose={onClose}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('project selection', () => {
    it('calls onSelectProject and onClose when project is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onSelectProject = vi.fn();

      render(
        <ProjectPicker
          isOpen={true}
          onClose={onClose}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={onSelectProject}
        />
      );

      await user.click(screen.getByText('project-beta'));

      expect(onSelectProject).toHaveBeenCalledWith('-Users-test-project-beta');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('search functionality', () => {
    it('does not show search input when <= 10 projects', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.queryByLabelText('Search projects')).not.toBeInTheDocument();
    });

    it('shows search input when > 10 projects', () => {
      const manyProjects = generateManyProjects(15);

      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={manyProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Search projects')).toBeInTheDocument();
    });

    it('filters projects by name (case-insensitive)', async () => {
      const user = userEvent.setup();
      const manyProjects = generateManyProjects(15);

      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={manyProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      const searchInput = screen.getByLabelText('Search projects');
      await user.type(searchInput, 'project-5');

      // Should show project-5
      expect(screen.getByText('project-5')).toBeInTheDocument();

      // Should not show project-0 (filtered out)
      expect(screen.queryByText('project-0')).not.toBeInTheDocument();
    });

    it('shows empty state when search has no matches', async () => {
      const user = userEvent.setup();
      const manyProjects = generateManyProjects(15);

      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={manyProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      const searchInput = screen.getByLabelText('Search projects');
      await user.type(searchInput, 'nonexistent-project-xyz');

      expect(screen.getByText('No projects match')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      const manyProjects = generateManyProjects(15);

      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={manyProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      const searchInput = screen.getByLabelText('Search projects');
      await user.type(searchInput, 'project-5');

      // Clear button should appear
      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      // Search should be cleared, all projects visible again
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('project-0')).toBeInTheDocument();
    });

    it('resets search when modal closes', async () => {
      const manyProjects = generateManyProjects(15);

      const { rerender } = render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={manyProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      const user = userEvent.setup();
      const searchInput = screen.getByLabelText('Search projects');
      await user.type(searchInput, 'test-query');

      // Close the modal
      rerender(
        <ProjectPicker
          isOpen={false}
          onClose={vi.fn()}
          projects={manyProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      // Reopen the modal
      rerender(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={manyProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      // Search should be reset
      const newSearchInput = screen.getByLabelText('Search projects');
      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('body scroll lock', () => {
    it('locks body scroll when modal opens', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when modal closes', () => {
      const { rerender } = render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      rerender(
        <ProjectPicker
          isOpen={false}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'project-picker-title');
      expect(screen.getByText('Select Project')).toHaveAttribute('id', 'project-picker-title');
    });

    it('has role="listbox" for project list', () => {
      render(
        <ProjectPicker
          isOpen={true}
          onClose={vi.fn()}
          projects={mockProjects}
          selectedProject={null}
          onSelectProject={vi.fn()}
        />
      );

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});
