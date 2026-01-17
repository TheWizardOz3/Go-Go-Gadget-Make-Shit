/**
 * Tests for Waveform component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Waveform } from './Waveform';

// Mock useAudioAnalyser hook
vi.mock('@/hooks/useAudioAnalyser', () => ({
  useAudioAnalyser: vi.fn(() => ({
    frequencyData: null,
    isAnalysing: false,
  })),
}));

import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';

// Mock MediaStream
class MockMediaStream {}

describe('Waveform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render null when no audioStream', () => {
    const { container } = render(<Waveform audioStream={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render waveform container when audioStream is provided', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    render(<Waveform audioStream={mockStream} />);

    const waveform = screen.getByRole('status');
    expect(waveform).toBeInTheDocument();
  });

  it('should have correct ARIA attributes', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    render(<Waveform audioStream={mockStream} />);

    const waveform = screen.getByRole('status');
    expect(waveform).toHaveAttribute('aria-live', 'polite');
    expect(waveform).toHaveAttribute('aria-label', 'Recording audio');
  });

  it('should render correct number of bars', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const customBarCount = 30;

    const { container } = render(<Waveform audioStream={mockStream} barCount={customBarCount} />);

    const waveform = container.querySelector('[role="status"]');
    const bars = waveform?.querySelectorAll('div > div');

    expect(bars?.length).toBe(customBarCount);
  });

  it('should render default number of bars (45)', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    const { container } = render(<Waveform audioStream={mockStream} />);

    const waveform = container.querySelector('[role="status"]');
    const bars = waveform?.querySelectorAll('div > div');

    expect(bars?.length).toBe(45); // DEFAULT_BAR_COUNT
  });

  it('should apply custom height', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const customHeight = 64;

    const { container } = render(<Waveform audioStream={mockStream} height={customHeight} />);

    const waveform = container.querySelector('[role="status"]');
    expect(waveform).toHaveStyle({ height: '64px' });
  });

  it('should apply custom className', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const customClass = 'my-custom-class';

    const { container } = render(<Waveform audioStream={mockStream} className={customClass} />);

    const waveform = container.querySelector('[role="status"]');
    expect(waveform).toHaveClass(customClass);
  });

  it('should apply slide-up-fade animation', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    const { container } = render(<Waveform audioStream={mockStream} />);

    const waveform = container.querySelector('[role="status"]');
    expect(waveform).toHaveClass('animate-slide-up-fade');
  });

  it('should render bars with minimum height when no frequency data', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    // Mock useAudioAnalyser to return null data
    vi.mocked(useAudioAnalyser).mockReturnValue({
      frequencyData: null,
      isAnalysing: false,
    });

    const { container } = render(<Waveform audioStream={mockStream} />);

    const waveform = container.querySelector('[role="status"]');
    const bars = waveform?.querySelectorAll('div > div') as NodeListOf<HTMLElement>;

    // All bars should have minimum height (4%)
    bars?.forEach((bar) => {
      expect(bar.style.height).toBe('4%');
    });
  });

  it('should render bars with varying heights based on frequency data', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    // Mock frequency data with varying values
    // With barCount=3 and 128 bins, each bar averages ~42 bins
    // So we need to fill entire ranges with different values
    const mockFrequencyData = new Uint8Array(128);

    // Fill first third with high values (bar 0)
    for (let i = 0; i < 43; i++) {
      mockFrequencyData[i] = 255;
    }
    // Fill last third with low values (bar 2)
    for (let i = 85; i < 128; i++) {
      mockFrequencyData[i] = 0;
    }

    vi.mocked(useAudioAnalyser).mockReturnValue({
      frequencyData: mockFrequencyData,
      isAnalysing: true,
    });

    const { container } = render(<Waveform audioStream={mockStream} barCount={3} />);

    const waveform = container.querySelector('[role="status"]');
    const bars = waveform?.querySelectorAll('div > div') as NodeListOf<HTMLElement>;

    expect(bars?.length).toBe(3);

    // First bar should be taller (from max frequency)
    const firstBarHeight = parseFloat(bars[0]!.style.height);
    const lastBarHeight = parseFloat(bars[2]!.style.height);

    expect(firstBarHeight).toBeGreaterThan(lastBarHeight);
  });

  it('should apply transition duration when motion is not reduced', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    // Mock window.matchMedia to return false for reduced motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { container } = render(<Waveform audioStream={mockStream} />);

    const waveform = container.querySelector('[role="status"]');
    const bars = waveform?.querySelectorAll('div > div');

    bars?.forEach((bar) => {
      expect(bar).toHaveClass('duration-75');
    });
  });

  it('should not apply transition duration when reduced motion is preferred', () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;

    // Mock window.matchMedia to return true for reduced motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { container } = render(<Waveform audioStream={mockStream} />);

    const waveform = container.querySelector('[role="status"]');
    const bars = waveform?.querySelectorAll('div > div');

    bars?.forEach((bar) => {
      expect(bar).not.toHaveClass('duration-75');
    });
  });
});
