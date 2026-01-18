/**
 * useVisualViewport - Handle iOS Safari keyboard visibility
 *
 * iOS Safari pushes the entire page up when the virtual keyboard opens.
 * This hook detects keyboard visibility and provides values to compensate.
 *
 * Uses the Visual Viewport API to detect the actual visible area.
 */

import { useState, useEffect, useCallback } from 'react';

interface ViewportState {
  /** Whether the keyboard is likely visible (viewport significantly shorter than window) */
  isKeyboardVisible: boolean;
  /** Height of the visible viewport in pixels */
  viewportHeight: number;
  /** Offset from top of window to top of visual viewport (how much page was pushed up) */
  offsetTop: number;
  /** Estimated keyboard height in pixels */
  keyboardHeight: number;
}

/**
 * Hook to track visual viewport changes (keyboard visibility on iOS)
 *
 * @returns Viewport state with keyboard visibility and dimensions
 *
 * @example
 * ```tsx
 * function MyInput() {
 *   const { isKeyboardVisible, keyboardHeight } = useVisualViewport();
 *   return (
 *     <div style={{ paddingBottom: isKeyboardVisible ? keyboardHeight : 0 }}>
 *       <input />
 *     </div>
 *   );
 * }
 * ```
 */
export function useVisualViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>({
    isKeyboardVisible: false,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    offsetTop: 0,
    keyboardHeight: 0,
  });

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const vv = window.visualViewport;
    const windowHeight = window.innerHeight;
    const viewportHeight = vv.height;
    const offsetTop = vv.offsetTop;

    // Consider keyboard visible if viewport is significantly smaller than window
    // Use a threshold of 150px to account for browser chrome changes
    const heightDiff = windowHeight - viewportHeight;
    const isKeyboardVisible = heightDiff > 150;

    setState({
      isKeyboardVisible,
      viewportHeight,
      offsetTop,
      keyboardHeight: isKeyboardVisible ? heightDiff : 0,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const vv = window.visualViewport;

    // Initial update
    updateViewport();

    // Listen for viewport changes
    vv.addEventListener('resize', updateViewport);
    vv.addEventListener('scroll', updateViewport);

    return () => {
      vv.removeEventListener('resize', updateViewport);
      vv.removeEventListener('scroll', updateViewport);
    };
  }, [updateViewport]);

  return state;
}
