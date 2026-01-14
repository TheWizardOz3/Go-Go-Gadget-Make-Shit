/**
 * Tests for TemplateChips component
 *
 * Tests rendering, click handling, disabled states, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateChips, TemplateChipsSkeleton } from './TemplateChips';
import type { Template } from '@/hooks/useTemplates';

// Mock templates data
const mockTemplates: Template[] = [
  { label: 'Plan Milestone', icon: '📋', prompt: 'Plan a milestone...' },
  { label: 'Plan Feature', icon: '📝', prompt: 'Plan a feature...' },
  { label: 'Build Task', icon: '🔨', prompt: 'Build a task...' },
];

// Mock navigator.vibrate
const mockVibrate = vi.fn();

describe('TemplateChips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock vibrate API
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    });
  });

  describe('rendering', () => {
    it('renders all template chips', () => {
      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} />);

      expect(screen.getByText('Plan Milestone')).toBeInTheDocument();
      expect(screen.getByText('Plan Feature')).toBeInTheDocument();
      expect(screen.getByText('Build Task')).toBeInTheDocument();
    });

    it('renders template icons', () => {
      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} />);

      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('📝')).toBeInTheDocument();
      expect(screen.getByText('🔨')).toBeInTheDocument();
    });

    it('renders as toolbar with correct aria-label', () => {
      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} />);

      expect(screen.getByRole('toolbar', { name: 'Quick prompts' })).toBeInTheDocument();
    });

    it('renders buttons with correct aria-labels', () => {
      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} />);

      expect(
        screen.getByRole('button', { name: 'Insert Plan Milestone template' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Insert Plan Feature template' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Insert Build Task template' })
      ).toBeInTheDocument();
    });

    it('returns null when templates array is empty', () => {
      const { container } = render(<TemplateChips templates={[]} onSelect={vi.fn()} />);

      expect(container.firstChild).toBeNull();
    });

    it('returns null when templates is undefined', () => {
      const { container } = render(
        <TemplateChips templates={undefined as never} onSelect={vi.fn()} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('applies custom className', () => {
      render(
        <TemplateChips templates={mockTemplates} onSelect={vi.fn()} className="custom-class" />
      );

      expect(screen.getByRole('toolbar')).toHaveClass('custom-class');
    });
  });

  describe('click handling', () => {
    it('calls onSelect with prompt when chip is clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<TemplateChips templates={mockTemplates} onSelect={onSelect} />);

      await user.click(screen.getByText('Plan Feature'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('Plan a feature...');
    });

    it('calls onSelect with correct prompt for each chip', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<TemplateChips templates={mockTemplates} onSelect={onSelect} />);

      await user.click(screen.getByText('Plan Milestone'));
      expect(onSelect).toHaveBeenLastCalledWith('Plan a milestone...');

      await user.click(screen.getByText('Build Task'));
      expect(onSelect).toHaveBeenLastCalledWith('Build a task...');
    });

    it('triggers haptic feedback on click', async () => {
      const user = userEvent.setup();

      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} />);

      await user.click(screen.getByText('Plan Feature'));

      expect(mockVibrate).toHaveBeenCalledWith(30);
    });
  });

  describe('disabled state', () => {
    it('does not call onSelect when disabled', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<TemplateChips templates={mockTemplates} onSelect={onSelect} disabled />);

      await user.click(screen.getByText('Plan Feature'));

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('renders buttons as disabled', () => {
      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('does not trigger haptic feedback when disabled', async () => {
      const user = userEvent.setup();

      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} disabled />);

      await user.click(screen.getByText('Plan Feature'));

      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it('applies disabled styling', () => {
      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('cursor-not-allowed');
      });
    });
  });

  describe('touch target size', () => {
    it('buttons have minimum height of 44px for accessibility', () => {
      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('min-h-[44px]');
      });
    });
  });

  describe('keyboard accessibility', () => {
    it('buttons are focusable', async () => {
      const user = userEvent.setup();

      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} />);

      await user.tab();

      const firstButton = screen.getByRole('button', { name: 'Insert Plan Milestone template' });
      expect(firstButton).toHaveFocus();
    });

    it('can activate button with Enter key', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<TemplateChips templates={mockTemplates} onSelect={onSelect} />);

      const firstButton = screen.getByRole('button', { name: 'Insert Plan Milestone template' });
      firstButton.focus();

      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalledWith('Plan a milestone...');
    });

    it('can activate button with Space key', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<TemplateChips templates={mockTemplates} onSelect={onSelect} />);

      const firstButton = screen.getByRole('button', { name: 'Insert Plan Milestone template' });
      firstButton.focus();

      await user.keyboard(' ');

      expect(onSelect).toHaveBeenCalledWith('Plan a milestone...');
    });
  });

  describe('icon rendering', () => {
    it('marks icons as aria-hidden', () => {
      render(<TemplateChips templates={mockTemplates} onSelect={vi.fn()} />);

      const icons = screen.getAllByText(/📋|📝|🔨/);
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});

describe('TemplateChipsSkeleton', () => {
  it('renders skeleton container', () => {
    render(<TemplateChipsSkeleton />);

    expect(screen.getByLabelText('Loading templates')).toBeInTheDocument();
  });

  it('renders 4 skeleton chips', () => {
    const { container } = render(<TemplateChipsSkeleton />);

    const skeletonChips = container.querySelectorAll('.animate-pulse');
    expect(skeletonChips).toHaveLength(4);
  });

  it('skeleton chips have varying widths', () => {
    const { container } = render(<TemplateChipsSkeleton />);

    const skeletonChips = container.querySelectorAll('.animate-pulse');
    const widths = Array.from(skeletonChips).map((chip) => (chip as HTMLElement).style.width);

    expect(widths).toEqual(['80px', '100px', '70px', '90px']);
  });

  it('skeleton chips have correct height for touch targets', () => {
    const { container } = render(<TemplateChipsSkeleton />);

    const skeletonChips = container.querySelectorAll('.animate-pulse');
    skeletonChips.forEach((chip) => {
      expect(chip).toHaveClass('h-[44px]');
    });
  });

  it('applies custom className', () => {
    render(<TemplateChipsSkeleton className="custom-class" />);

    expect(screen.getByLabelText('Loading templates')).toHaveClass('custom-class');
  });
});
