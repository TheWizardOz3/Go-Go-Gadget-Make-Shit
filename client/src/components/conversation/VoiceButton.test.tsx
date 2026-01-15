/**
 * Tests for VoiceButton Component
 *
 * Tests the voice input button states, interactions, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceButton } from './VoiceButton';

// Mock navigator.vibrate
const mockVibrate = vi.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
});

describe('VoiceButton', () => {
  const defaultProps = {
    isRecording: false,
    isProcessing: false,
    onStart: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render microphone icon when idle', () => {
      render(<VoiceButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Start voice input');
      // Check for SVG with microphone path (stroke icon)
      const svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
    });

    it('should render stop icon when recording', () => {
      render(<VoiceButton {...defaultProps} isRecording={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Stop recording');
      // Check for SVG with rect (filled stop icon)
      const rect = button.querySelector('rect');
      expect(rect).toBeInTheDocument();
    });

    it('should render spinner icon when processing', () => {
      render(<VoiceButton {...defaultProps} isProcessing={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Processing audio');
      // Check for spinning animation class
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });
  });

  describe('Interactions', () => {
    it('should call onStart when clicked while idle', () => {
      const onStart = vi.fn();
      render(<VoiceButton {...defaultProps} onStart={onStart} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when clicked while recording', () => {
      const onStop = vi.fn();
      render(<VoiceButton {...defaultProps} isRecording={true} onStop={onStop} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('should not call any handler when disabled', () => {
      const onStart = vi.fn();
      const onStop = vi.fn();
      render(<VoiceButton {...defaultProps} disabled={true} onStart={onStart} onStop={onStop} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onStart).not.toHaveBeenCalled();
      expect(onStop).not.toHaveBeenCalled();
    });

    it('should not call any handler when processing', () => {
      const onStart = vi.fn();
      const onStop = vi.fn();
      render(
        <VoiceButton {...defaultProps} isProcessing={true} onStart={onStart} onStop={onStop} />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(onStart).not.toHaveBeenCalled();
      expect(onStop).not.toHaveBeenCalled();
    });

    it('should trigger haptic feedback on click', () => {
      render(<VoiceButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockVibrate).toHaveBeenCalledWith(50);
    });
  });

  describe('Styling', () => {
    it('should have pulse animation when recording', () => {
      render(<VoiceButton {...defaultProps} isRecording={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('animate-pulse');
      expect(button).toHaveClass('bg-error');
    });

    it('should have accent background when processing', () => {
      render(<VoiceButton {...defaultProps} isProcessing={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-accent');
    });

    it('should have reduced opacity when disabled', () => {
      render(<VoiceButton {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('cursor-not-allowed');
    });

    it('should be disabled when processing', () => {
      render(<VoiceButton {...defaultProps} isProcessing={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply custom className', () => {
      render(<VoiceButton {...defaultProps} className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label for idle state', () => {
      render(<VoiceButton {...defaultProps} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Start voice input');
    });

    it('should have correct aria-label for recording state', () => {
      render(<VoiceButton {...defaultProps} isRecording={true} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Stop recording');
    });

    it('should have correct aria-label for processing state', () => {
      render(<VoiceButton {...defaultProps} isProcessing={true} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Processing audio');
    });

    it('should be keyboard accessible', () => {
      const onStart = vi.fn();
      render(<VoiceButton {...defaultProps} onStart={onStart} />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have type="button" to prevent form submission', () => {
      render(<VoiceButton {...defaultProps} />);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });
});
