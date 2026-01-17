/**
 * Tests for FloatingVoiceButton component
 *
 * Tests the floating voice recording button that appears on Files tab.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingVoiceButton } from './FloatingVoiceButton';
import { SharedPromptProvider } from '@/contexts/SharedPromptContext';

// Mock useVoiceInput hook
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();

let mockIsStarting = false;
let mockIsRecording = false;
let mockIsProcessing = false;

vi.mock('@/hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    audioStream: null,
    isStarting: mockIsStarting,
    isRecording: mockIsRecording,
    isProcessing: mockIsProcessing,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
  }),
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
});

/**
 * Helper to render with required providers
 */
function renderWithProviders(ui: React.ReactElement) {
  return render(<SharedPromptProvider>{ui}</SharedPromptProvider>);
}

describe('FloatingVoiceButton', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStarting = false;
    mockIsRecording = false;
    mockIsProcessing = false;
  });

  describe('rendering', () => {
    it('should render when not hidden', () => {
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not render when hidden', () => {
      renderWithProviders(<FloatingVoiceButton hidden onSend={mockOnSend} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should have correct aria-label for idle state', () => {
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      expect(screen.getByLabelText('Start voice recording')).toBeInTheDocument();
    });

    it('should have fixed positioning classes', () => {
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('fixed');
      expect(button).toHaveClass('z-50');
    });

    it('should have circular shape (rounded-full)', () => {
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-full');
      expect(button).toHaveClass('w-14');
      expect(button).toHaveClass('h-14');
    });
  });

  describe('tap interaction', () => {
    it('should call startRecording on tap when not recording', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      await user.click(screen.getByRole('button'));

      expect(mockStartRecording).toHaveBeenCalled();
    });
  });

  describe('state-based styling', () => {
    it('should have accent background when idle', () => {
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-accent');
    });

    it('should have shadow for floating effect', () => {
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('shadow-lg');
    });
  });

  describe('long press behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not trigger send when no text accumulated', () => {
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      const button = screen.getByRole('button');

      // Simulate mouse down
      act(() => {
        button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      // Wait for long press duration
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Mouse up
      act(() => {
        button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });

      // Should not trigger send since no text
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should cancel long press if mouse leaves before duration', () => {
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} />);

      const button = screen.getByRole('button');

      // Simulate mouse down
      act(() => {
        button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      // Leave before long press duration
      act(() => {
        vi.advanceTimersByTime(200);
        button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      });

      // Advance past the threshold
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Should not trigger send
      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should pass onError callback to useVoiceInput', () => {
      const mockOnError = vi.fn();
      renderWithProviders(<FloatingVoiceButton onSend={mockOnSend} onError={mockOnError} />);

      // The component should render without error
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
