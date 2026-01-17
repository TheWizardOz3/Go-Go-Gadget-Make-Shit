# Feature: Floating Voice Button

> **Status**: ✅ Complete  
> **Started**: 2026-01-17  
> **Completed**: 2026-01-17  
> **Milestone**: V1  
> **Feature Doc Version**: 1.1

---

## Overview

The Floating Voice Button is a simple, persistent voice recording button visible on the Files tab. It allows users to dictate prompts while browsing code—recordings append to the shared prompt text, which can be viewed/edited/sent from the Conversation tab. A press-and-hold gesture enables quick-send without switching tabs.

**Design Philosophy**: Keep it minimal. No preview panel, no waveform—just a button that records. Users can jump to Conversation tab to see/edit the accumulated prompt.

## User Story

> As a developer reviewing code changes on my phone, I want to record voice notes while looking at diffs or browsing the file tree, so I can dictate instructions to Claude without switching back to the conversation view.

## Requirements (from Project Status)

From `project_status.md` V1 milestone:

- [x] **Persistent mic across views**: Voice button visible while on Files tab and sub-views
- [x] **Record while browsing file tree**: Can dictate while viewing file content
- [x] **Shared prompt state**: Transcriptions append to same text as PromptInput

## Design Specification

### Visual Design

**Current State** (voice button only in conversation view):
```
┌──────────────────────────────────────────────────────────┐
│  Header: Project / Session                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Files Changed View / File Tree View                     │
│  (NO voice input available)                              │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Chat]              [Files]                             │
└──────────────────────────────────────────────────────────┘
```

**Enhanced State** (floating voice button):
```
┌──────────────────────────────────────────────────────────┐
│  Header: Project / Session                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Files Changed View / File Tree View                     │
│  (can browse while recording)                            │
│                                                     ┌──┐ │
│                                                     │🎤│ │  ← Floating
│                                                     └──┘ │    Voice Button
├──────────────────────────────────────────────────────────┤
│  [Chat]              [Files]                             │
└──────────────────────────────────────────────────────────┘
```

**Recording State** (button changes, no panel):
```
┌──────────────────────────────────────────────────────────┐
│  Header: Project / Session                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Files Changed View / File Tree View                     │
│  (user continues browsing while recording)               │
│                                                     ┌──┐ │
│                                                     │⏹ │ │  ← Red, pulsing
│                                                     └──┘ │    (recording)
├──────────────────────────────────────────────────────────┤
│  [Chat]              [Files]                             │
└──────────────────────────────────────────────────────────┘
```

### Floating Button Specifications

| Property         | Value                          | Rationale                                   |
|------------------|--------------------------------|---------------------------------------------|
| Size             | 56×56px                        | Consistent with voice button in PromptInput |
| Position         | Bottom-right corner            | Thumb-reachable, doesn't obscure content    |
| Offset from edge | 16px right, 16px above tab bar | Consistent with app padding                 |
| Z-index          | 50                             | Above content, below modals                 |
| Visibility       | Hidden on Conversation tab     | Voice input already in PromptInput          |

### Interaction Patterns

| Gesture          | State      | Action                                                  |
|------------------|------------|---------------------------------------------------------|
| **Tap**          | Idle       | Start recording                                         |
| **Tap**          | Recording  | Stop recording → transcribe → append to shared prompt   |
| **Press & hold** | Idle       | No action (or: start recording + auto-send on release?) |
| **Press & hold** | Has text   | Send accumulated prompt immediately (haptic feedback)   |
| **Tap**          | Processing | No action (wait for transcription)                      |

**Press & Hold to Send**: When user has accumulated prompt text, a long press (500ms) triggers immediate send without switching tabs. Provides haptic feedback and visual confirmation (brief checkmark or flash).

### States

| State           | Button Appearance        | Behavior                         |
|-----------------|--------------------------|----------------------------------|
| Idle (no text)  | Mic icon, accent bg      | Tap to start recording           |
| Idle (has text) | Mic icon + dot badge     | Tap to record more, hold to send |
| Recording       | Stop icon, red bg, pulse | Tap to stop                      |
| Processing      | Spinner, accent bg       | Wait for transcription           |
| Error           | Mic icon, neutral        | Error toast shown, can retry     |

### Badge Indicator

When the shared prompt has accumulated text, show a small dot badge on the floating button:
- **Position**: Top-right of button
- **Size**: 12×12px
- **Color**: `--color-success` (green)
- **Purpose**: Indicates there's pending prompt text to send/review

### Shared Prompt State

The floating voice button shares the same prompt text as `PromptInput`:
1. Recording from floating button → transcription appends to prompt text
2. Recording from PromptInput → same behavior (existing)
3. User can switch to Conversation tab to see/edit the full prompt
4. Sending (from either location) clears the shared state

### Accessibility

- Floating button has `aria-label` that updates based on state
- Press & hold action has alternative: switch to conversation tab to send
- All touch targets meet 44×44px minimum
- Reduced motion preference disables pulse animation

## Acceptance Criteria

- [ ] **Given** I'm on the Files tab, **when** I tap the floating voice button, **then** recording starts (button turns red with stop icon)
- [ ] **Given** I'm recording on Files tab, **when** I tap stop, **then** the transcription appends to the shared prompt text
- [ ] **Given** I have accumulated prompt text, **when** I switch to Conversation tab, **then** I see the text in PromptInput
- [ ] **Given** I have accumulated prompt text, **when** I press & hold the floating button, **then** the prompt sends immediately with haptic feedback
- [ ] **Given** I'm on Conversation tab, **when** viewing the page, **then** the floating button is hidden (uses existing voice input)
- [ ] **Given** I have accumulated text, **when** viewing the floating button, **then** it shows a badge indicator

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  App.tsx                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  SharedPromptProvider (Context)                                     ││
│  │  ┌─────────────────────────────────────────────────────────────────┐││
│  │  │  promptText: string                                             │││
│  │  │  setPromptText, appendText, clearText, sendPrompt              │││
│  │  └─────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌──────────────────┐        ┌──────────────────────────────────────────│
│  │ ConversationView │        │ Files Views (Changed / Tree / Diff)     │
│  │                  │        │                                          │
│  │  ┌────────────┐  │        │  ┌─────────────────────────────────────┐│
│  │  │PromptInput │  │        │  │ FloatingVoiceButton                 ││
│  │  │ (existing) │  │        │  │ - uses useVoiceInput (existing)     ││
│  │  │            │  │        │  │ - appends to shared prompt          ││
│  │  │ - Syncs    │  │        │  │ - press & hold to send              ││
│  │  │   with     │  │        │  └─────────────────────────────────────┘│
│  │  │   context  │  │        │                                          │
│  │  └────────────┘  │        └──────────────────────────────────────────│
│  └──────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Simplification**: Instead of duplicating voice recording logic, we:
1. Create a simple context for **shared prompt text** only
2. Reuse the existing `useVoiceInput` hook in FloatingVoiceButton
3. Both PromptInput and FloatingVoiceButton append to the same shared text

### New Files to Create

| File                                                  | Purpose                                 | Estimated Lines |
|-------------------------------------------------------|-----------------------------------------|-----------------|
| `client/src/contexts/SharedPromptContext.tsx`         | Shared prompt text state                | ~60             |
| `client/src/components/voice/FloatingVoiceButton.tsx` | Floating button with press-hold gesture | ~150            |
| `client/src/components/voice/index.ts`                | Barrel export                           | ~3              |

### Files to Modify

| File                                                 | Changes                                       | Estimated Impact |
|------------------------------------------------------|-----------------------------------------------|------------------|
| `client/src/App.tsx`                                 | Add SharedPromptProvider, FloatingVoiceButton | ~25 lines        |
| `client/src/components/conversation/PromptInput.tsx` | Sync value with shared context                | ~15 lines        |

### Dependencies

No new npm dependencies required.

### SharedPromptContext Implementation

Simple context just for sharing the prompt text between views:

```typescript
// client/src/contexts/SharedPromptContext.tsx

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SharedPromptContextValue {
  /** Current prompt text */
  promptText: string;
  /** Whether there's text to send */
  hasText: boolean;
  /** Set the prompt text (replaces) */
  setPromptText: (text: string) => void;
  /** Append text to prompt (with space separator) */
  appendText: (text: string) => void;
  /** Clear all text */
  clearText: () => void;
}

const SharedPromptContext = createContext<SharedPromptContextValue | null>(null);

export function SharedPromptProvider({ children }: { children: ReactNode }) {
  const [promptText, setPromptText] = useState('');

  const appendText = useCallback((text: string) => {
    setPromptText(prev => {
      if (!prev.trim()) return text;
      return `${prev.trim()} ${text}`;
    });
  }, []);

  const clearText = useCallback(() => {
    setPromptText('');
  }, []);

  return (
    <SharedPromptContext.Provider value={{
      promptText,
      hasText: promptText.trim().length > 0,
      setPromptText,
      appendText,
      clearText,
    }}>
      {children}
    </SharedPromptContext.Provider>
  );
}

export function useSharedPrompt() {
  const context = useContext(SharedPromptContext);
  if (!context) {
    throw new Error('useSharedPrompt must be used within SharedPromptProvider');
  }
  return context;
}
```

### FloatingVoiceButton Component

```typescript
// client/src/components/voice/FloatingVoiceButton.tsx

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useSharedPrompt } from '@/contexts/SharedPromptContext';

interface FloatingVoiceButtonProps {
  /** Hide the button (e.g., when on Conversation tab) */
  hidden?: boolean;
  /** Called when user long-presses to send */
  onSend: (text: string) => void;
  /** Called on voice error */
  onError?: (error: Error) => void;
  className?: string;
}

const LONG_PRESS_DURATION = 500; // ms

export function FloatingVoiceButton({ 
  hidden, 
  onSend,
  onError,
  className 
}: FloatingVoiceButtonProps) {
  const { promptText, hasText, appendText, clearText } = useSharedPrompt();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  // Voice input - appends transcription to shared prompt
  const handleTranscription = useCallback((text: string) => {
    appendText(text);
  }, [appendText]);

  const { 
    isStarting, 
    isRecording, 
    isProcessing, 
    startRecording, 
    stopRecording 
  } = useVoiceInput({
    onTranscription: handleTranscription,
    onError,
  });

  if (hidden) return null;

  // Handle tap (short press)
  const handleClick = () => {
    // If this was a long press, don't handle as click
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    
    if (isProcessing || isStarting) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Handle long press start
  const handlePressStart = () => {
    if (!hasText || isRecording || isProcessing) return;
    
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
      // Send the prompt
      onSend(promptText);
      clearText();
    }, LONG_PRESS_DURATION);
  };

  // Handle long press end
  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      disabled={isProcessing || isStarting}
      className={cn(
        // Positioning - fixed bottom right above tab bar
        'fixed z-50',
        'right-4 bottom-[calc(56px+16px+env(safe-area-inset-bottom))]',
        // Size and shape
        'w-14 h-14 rounded-full',
        'flex items-center justify-center',
        // Shadow for floating effect
        'shadow-lg shadow-black/25',
        // Transition
        'transition-all duration-150',
        // State-based styling
        isRecording && 'bg-error animate-pulse',
        isProcessing && 'bg-accent/80',
        isStarting && 'bg-accent/60',
        !isRecording && !isProcessing && !isStarting && 'bg-accent hover:bg-accent/90',
        // Disabled
        (isProcessing || isStarting) && 'cursor-wait',
        className
      )}
      aria-label={
        isRecording ? 'Stop recording' : 
        isProcessing ? 'Transcribing...' :
        isStarting ? 'Starting...' :
        hasText ? 'Record more (hold to send)' : 
        'Start voice recording'
      }
    >
      {/* Badge for accumulated text */}
      {hasText && !isRecording && !isProcessing && !isStarting && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface" />
      )}
      
      {/* Icon */}
      {isProcessing || isStarting ? (
        <SpinnerIcon className="w-6 h-6 text-white" />
      ) : isRecording ? (
        <StopIcon className="w-6 h-6 text-white" />
      ) : (
        <MicrophoneIcon className="w-6 h-6 text-white" />
      )}
    </button>
  );
}

// Icon components
function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
```

### Integration with App.tsx

```tsx
// In App.tsx

import { SharedPromptProvider } from '@/contexts/SharedPromptContext';
import { FloatingVoiceButton } from '@/components/voice';

export default function App() {
  return (
    <SharedPromptProvider>
      <AppContent />
    </SharedPromptProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('conversation');
  
  // Reference to trigger send in ConversationView
  const sendPromptRef = useRef<((text: string) => void) | null>(null);

  // Handler for long-press send from floating button
  const handleFloatingSend = useCallback((text: string) => {
    // Switch to conversation tab and send
    setActiveTab('conversation');
    // Use ref or event to trigger send in ConversationView
    sendPromptRef.current?.(text);
  }, []);

  return (
    <div className="...">
      {/* ... header, content ... */}

      {/* Floating Voice Button - only on Files tab */}
      <FloatingVoiceButton 
        hidden={activeTab === 'conversation'} 
        onSend={handleFloatingSend}
      />

      {/* Tab Bar */}
      <TabBar ... />
    </div>
  );
}
```

### Integration with PromptInput

PromptInput syncs with the shared context:

```tsx
// In PromptInput.tsx - key changes

import { useSharedPrompt } from '@/contexts/SharedPromptContext';

export function PromptInput({ ... }) {
  const { promptText, setPromptText, hasText: hasSharedText } = useSharedPrompt();
  
  // Sync local value with shared context
  const [value, setValue] = useState(() => {
    // Initialize from context if available, otherwise localStorage
    if (promptText) return promptText;
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // When shared context changes (e.g., voice from floating button), update local
  useEffect(() => {
    if (promptText && promptText !== value) {
      setValue(promptText);
    }
  }, [promptText]);

  // When local value changes, sync to context
  useEffect(() => {
    setPromptText(value);
  }, [value, setPromptText]);

  // ... rest of existing implementation
}
```

### Edge Cases

| Scenario                             | Expected Behavior                                    |
|--------------------------------------|------------------------------------------------------|
| Record on Files, switch to Chat      | Shared prompt text appears in PromptInput            |
| Long-press with no text              | Nothing happens (long-press only works when hasText) |
| Long-press while recording           | Nothing happens (must stop recording first)          |
| Network offline during transcription | Show error toast, text NOT appended                  |
| App backgrounded while recording     | Recording stops (iOS), transcribe what we have       |

## Implementation Tasks

| # | Task                                   | Est. Time | Dependencies | Notes                                    |
|---|----------------------------------------|-----------|--------------|------------------------------------------|
| 1 | Create `SharedPromptContext`           | 30 min    | —            | Simple context for shared prompt text    |
| 2 | Create `FloatingVoiceButton` component | 45 min    | Task 1       | Button, states, long-press gesture       |
| 3 | Integrate into App.tsx                 | 20 min    | Tasks 1-2    | Wrap provider, add button to Files views |
| 4 | Connect PromptInput to shared context  | 30 min    | Task 3       | Sync local state with context            |
| 5 | Wire up long-press send                | 20 min    | Tasks 3-4    | Send triggers navigation + actual send   |

**Total Estimated Time**: ~2.5 hours

## Test Plan

### Unit Tests

**SharedPromptContext.test.tsx** (8 tests):
- Provides context value to children
- setPromptText updates text
- appendText adds to existing with space
- appendText works when empty
- clearText resets to empty
- hasText returns true when non-empty
- hasText returns false when empty/whitespace
- Throws when used outside provider

**FloatingVoiceButton.test.tsx** (14 tests):
- Renders when hidden=false
- Does not render when hidden=true
- Shows mic icon in idle state
- Shows stop icon when recording
- Shows spinner when processing/starting
- Shows badge when has text
- Tap starts recording
- Tap stops recording when active
- Disabled during processing
- Long-press calls onSend when has text
- Long-press does nothing when no text
- Long-press does nothing when recording
- Correct aria-labels for each state
- Haptic feedback on long-press send

### Integration Tests

- FloatingVoiceButton + SharedPromptContext interaction
- PromptInput syncs with SharedPromptContext
- Recording appends to shared prompt
- Long-press send triggers navigation and send

### Manual Testing Checklist

- [ ] Floating button appears on Files tab
- [ ] Floating button hidden on Conversation tab
- [ ] Can record while viewing file diff
- [ ] Can record while browsing file tree
- [ ] Recording shows red button with stop icon
- [ ] Transcription appends to prompt on stop
- [ ] Badge appears when prompt has text
- [ ] Long-press sends and shows haptic feedback
- [ ] Switching to Chat shows accumulated text in input
- [ ] Editing in Chat syncs back to context
- [ ] Works on iPhone SE (smallest screen)
- [ ] Works on iPhone 15 Pro Max (largest screen)

## Out of Scope (for this feature)

- **Waveform on floating button**: Keep it simple, just button state changes
- **Preview panel**: User can switch tabs to see full prompt
- **Saving drafts to localStorage**: Shared prompt in memory only
- **Voice commands**: No "send" or "clear" voice commands
- **Landscape mode optimization**: Portrait-first design

## Dependencies

| Dependency         | Type    | Status     | Notes                              |
|--------------------|---------|------------|------------------------------------|
| Voice Input (MVP)  | Feature | ✅ Complete | Base recording/transcription logic |
| Tab Navigation     | Feature | ✅ Complete | Conversation/Files tab structure   |
| useVoiceInput hook | Code    | ✅ Complete | Reused directly in floating button |

## Related Documents

- [Product Spec - Voice Input](../product_spec.md#feature-voice-prompt-input)
- [Voice Input (MVP)](./voice-input.md)
- [Architecture - Frontend Stack](../architecture.md#frontend-stack)
- [Project Status - V1 Build Order](../project_status.md#v1-build-order)

---

*Created: 2026-01-17*  
*Updated: 2026-01-17 (v1.1 - Simplified scope per user feedback)*

