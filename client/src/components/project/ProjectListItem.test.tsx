/**
 * Tests for ProjectListItem component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectListItem } from './ProjectListItem';
import type { ProjectSerialized } from '@shared/types';

// Mock project data
const mockProject: ProjectSerialized = {
  path: '/Users/test/my-project',
  name: 'my-project',
  encodedPath: '-Users-test-my-project',
  sessionCount: 3,
  lastSessionId: 'session-123',
  lastActivityAt: new Date().toISOString(),
};

const mockProjectNoActivity: ProjectSerialized = {
  path: '/Users/test/old-project',
  name: 'old-project',
  encodedPath: '-Users-test-old-project',
  sessionCount: 1,
  lastSessionId: 'session-456',
};

describe('ProjectListItem', () => {
  describe('rendering', () => {
    it('renders project name', () => {
      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByText('my-project')).toBeInTheDocument();
    });

    it('renders session count with correct pluralization', () => {
      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByText('3 sessions')).toBeInTheDocument();
    });

    it('renders singular "session" for count of 1', () => {
      render(
        <ProjectListItem project={mockProjectNoActivity} isSelected={false} onSelect={vi.fn()} />
      );

      expect(screen.getByText('1 session')).toBeInTheDocument();
    });

    it('renders last activity time when available', () => {
      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={vi.fn()} />);

      // Should show "just now" or similar relative time
      expect(screen.getByText(/just now|ago/)).toBeInTheDocument();
    });

    it('does not render activity time when not available', () => {
      render(
        <ProjectListItem project={mockProjectNoActivity} isSelected={false} onSelect={vi.fn()} />
      );

      // Should only show session count, not any time
      expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
    });
  });

  describe('selected state', () => {
    it('shows checkmark when selected', () => {
      render(<ProjectListItem project={mockProject} isSelected={true} onSelect={vi.fn()} />);

      // Check for aria-selected attribute
      const button = screen.getByRole('option');
      expect(button).toHaveAttribute('aria-selected', 'true');
    });

    it('does not show checkmark when not selected', () => {
      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={vi.fn()} />);

      const button = screen.getByRole('option');
      expect(button).toHaveAttribute('aria-selected', 'false');
    });

    it('applies selected styling when selected', () => {
      render(<ProjectListItem project={mockProject} isSelected={true} onSelect={vi.fn()} />);

      const button = screen.getByRole('option');
      expect(button).toHaveClass('bg-accent/10');
    });
  });

  describe('interaction', () => {
    it('calls onSelect with encodedPath when clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={onSelect} />);

      await user.click(screen.getByRole('option'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('-Users-test-my-project');
    });

    it('calls onSelect when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={onSelect} />);

      const button = screen.getByRole('option');
      button.focus();
      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('-Users-test-my-project');
    });

    it('calls onSelect when Space key is pressed', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={onSelect} />);

      const button = screen.getByRole('option');
      button.focus();
      await user.keyboard(' ');

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('-Users-test-my-project');
    });
  });

  describe('accessibility', () => {
    it('has role="option" for listbox integration', () => {
      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    it('has data-project attribute for scroll targeting', () => {
      render(<ProjectListItem project={mockProject} isSelected={false} onSelect={vi.fn()} />);

      const button = screen.getByRole('option');
      expect(button).toHaveAttribute('data-project', '-Users-test-my-project');
    });
  });
});
