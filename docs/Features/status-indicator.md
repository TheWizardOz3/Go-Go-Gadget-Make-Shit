# Feature: Status Indicator

> **Status**: ✅ Complete  
> **Started**: 2026-01-14  
> **Completed**: 2026-01-14  
> **Feature Doc Version**: 1.1

---

## Overview

A persistent visual indicator showing the current state of the Claude Code session: **Working**, **Waiting**, or **Idle**. This is the primary feedback mechanism for users to understand what's happening at a glance.

## User Story

> As a developer, I want to see at a glance whether Claude is working, waiting for input, or idle, so I know if I need to take action.

## Requirements (from Product Spec)

- [x] Display one of three states: Working, Waiting, Idle
- [x] "Working" shown when Claude is actively processing/generating
- [x] "Waiting" shown when Claude has finished and awaits input
- [x] "Idle" shown when no active session
- [x] Visual distinction (color + icon) for each state
- [x] Visible at top of screen at all times

## Design Specification

### Visual Design

**Component Style**: Pill-shaped badge

| State | Color Token | Hex (Dark Mode) | Icon | Animation |
|-------|-------------|-----------------|------|-----------|
| Working | `--color-working` | `#60A5FA` | Filled circle ● | Pulse animation |
| Waiting | `--color-warning` | `#FBBF24` | Filled circle ● | None (static) |
| Idle | `--color-text-tertiary` | `#5B5B5B` | Filled circle ● | None (static) |

**Typography**:
- Font: System (SF Pro / Inter)
- Size: 13px (Caption)
- Weight: 500 (Medium)

**Spacing**:
- Pill padding: 6px 10px
- Border radius: 9999px (full pill)
- Gap between icon and text: 6px

### Layout

```
┌──────────────────────────────────────────────────┐
│  [Project Name]              ● Working     [⋮]  │
│  Header                      ▲ Status      Menu │
└──────────────────────────────────────────────────┘
```

- Status indicator positioned in the center-right of the header
- Between project name and menu button
- Always visible (sticky header)

### Animation

**Working State Pulse**:
```css
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```
- Duration: 1.5s
- Timing: ease-in-out
- Iteration: infinite
- Respects `prefers-reduced-motion: reduce` (disabled when set)

## Acceptance Criteria

- [x] Given Claude is generating a response, when viewing the app, then status shows "Working" with blue indicator and pulse animation
- [x] Given Claude has finished and printed its response, when viewing the app, then status shows "Waiting" with yellow/amber indicator
- [x] Given no Claude Code process is running, when viewing the app, then status shows "Idle" with gray indicator
- [x] Given `prefers-reduced-motion: reduce` is set, when viewing "Working" status, then pulse animation is disabled
- [x] Given the app is loading, when status is unknown, then show a loading skeleton for the status pill

## Technical Design

### Existing Infrastructure

The following already exists and was leveraged:

1. **Types**: `SessionStatus = 'working' | 'waiting' | 'idle'` in `shared/types/index.ts`
2. **API**: `/api/sessions/:id/messages` returns `status` in response
3. **Hook**: `useConversation` returns `status` alongside messages
4. **Detection**: `detectStatus()` and `inferStatusFromTiming()` in `sessionManager.ts`

### New Components

1. **StatusIndicator** (`client/src/components/ui/StatusIndicator.tsx`)
   - Pure presentational component
   - Props: `status: SessionStatus | undefined`, `className?: string`
   - Renders pill badge with appropriate styling
   - Exports `StatusIndicatorSkeleton` for loading state

### Integration Points

- `App.tsx`: Calls `useConversation` to get status, passes to Header
- `Header`: Renders `StatusIndicator` or `StatusIndicatorSkeleton` based on loading state

### State Management

No new state management needed. Status is derived from:
1. `useConversation(sessionId)` hook returns `status`
2. Status comes from API response (polled every 2.5s)

## Implementation Summary

### Files Created
| File | Purpose |
|------|---------|
| `client/src/components/ui/StatusIndicator.tsx` | Main component + skeleton |
| `client/src/components/ui/StatusIndicator.test.tsx` | 9 unit tests |

### Files Modified
| File | Changes |
|------|---------|
| `client/src/App.tsx` | Added useConversation hook, integrated StatusIndicator into Header |
| `client/src/index.css` | Added `--color-warning` token, `@keyframes status-pulse`, `.animate-status-pulse` utility |
| `client/tailwind.config.js` | Added `warning` color to theme |

### Implementation Tasks

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Create StatusIndicator component | ✅ | Core component with three state variants |
| 2 | Add pulse animation CSS | ✅ | Keyframes + reduced-motion support |
| 3 | Integrate into Header | ✅ | Wired up to useConversation status |
| 4 | Handle loading/undefined state | ✅ | Skeleton shown during loading, defaults to Idle |

**Actual Time**: ~1 hour (estimate was 1.5 hours)

## Test Results

### Unit Tests (9 tests, all passing)
- ✅ StatusIndicator renders correct styling for each status (Working, Waiting, Idle)
- ✅ StatusIndicator handles undefined status gracefully (defaults to Idle)
- ✅ Animation class applied only for "working" state
- ✅ Proper ARIA attributes (role="status", aria-live="polite")
- ✅ Custom className support
- ✅ StatusIndicatorSkeleton renders with aria-hidden
- ✅ StatusIndicatorSkeleton has animate-pulse class

### Manual Testing
- ✅ Visual appearance verified in browser
- ✅ Pill-shaped badge renders correctly
- ✅ Position in header correct (between project name and menu)
- ✅ Dark mode styling working

## Edge Cases

| Scenario | Expected Behavior | Verified |
|----------|-------------------|----------|
| No session selected | Show "Idle" status | ✅ |
| Session loading | Show loading skeleton | ✅ |
| API error | Maintain last known status or show "Idle" | ✅ |
| Rapid status changes | Status updates on next poll (no debounce needed) | ✅ |

## Dependencies

- None (all infrastructure already existed)

## Related Documents

- [Product Spec - Status Indicator](../product_spec.md#feature-status-indicator)
- [Architecture - Session Manager](../architecture.md)
- [Conversation View UI](./conversation-view-ui.md) (prior feature)

---

*Created: 2026-01-14*  
*Last Updated: 2026-01-14*
