# Feature: Quick Templates

> **Status**: ✅ Complete  
> **Started**: 2026-01-14  
> **Completed**: 2026-01-14  
> **Feature Doc Version**: 1.0

---

## Overview

One-tap prompt templates displayed as horizontally scrollable chips above the input field. Allows users to quickly send common prompts without typing on mobile. Templates are loaded from a per-project YAML file with fallback to built-in defaults that match the standard vibe-coding workflow.

## User Story

> As a developer using my phone, I want to send common prompts with a single tap, so I don't have to type repetitive commands while away from my desk.

## Requirements (from Product Spec)

- [x] Load templates from `.claude/templates.yaml` in project root
- [x] Display templates as tappable buttons/chips above the input
- [x] Tap to insert template text into input (user can review/edit before sending)
- [ ] Support template variables: `{{branch}}`, `{{file}}` (deferred to V1)
- [x] Fallback to default templates if no project-specific file exists
- [x] Horizontally scrollable if many templates

## Design Specification

### Visual Design

**Component Layout**: Horizontal scroll area positioned between conversation messages and the prompt input.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            Conversation Messages                 │
│                                                  │
├──────────────────────────────────────────────────┤
│  ◄ [📋 Plan Milestone] [📝 Plan Feature] [...] ► │  ← Template chips (scrollable)
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  ┌────┐ │
│  │ Type a message...                  │  │ ➤  │ │
│  └────────────────────────────────────┘  └────┘ │
└──────────────────────────────────────────────────┘
```

**Template Chip Styling**:
- Background: `--color-surface-elevated` (light gray in dark mode)
- Border: 1px `--color-border`
- Border radius: 8px (pill-like)
- Padding: 8px 12px
- Font: Body (14px)
- Icon + Label: `[📋 Plan Milestone]`
- Touch target: Minimum 44px height for accessibility
- Gap between chips: 8px

**Container Styling**:
- Background: `--color-background` (subtle contrast from conversation)
- Border bottom: 1px `--color-border` (separates from input)
- Padding: 8px 16px
- Horizontal scroll with hidden scrollbar
- Fade gradient on edges when scrollable (optional, nice-to-have)

### States

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Chips visible and tappable | Tap inserts text into input |
| Loading | Skeleton chips (3-4 rectangles) | While fetching from API |
| Error | Hidden (fall back silently) | Use defaults on any error |
| No Templates | Hidden entirely | Don't show empty container |
| Tapped | Brief press state (darker) | Haptic feedback on tap |
| Disabled | Grayed out chips | When Claude is working |

### Accessibility

- Each chip is a `<button>` with proper `aria-label`
- Container has `role="toolbar"` and `aria-label="Quick prompts"`
- Focus management for keyboard navigation (arrow keys)
- Chips are reachable via Tab key

## Acceptance Criteria

- [ ] Given a project has `.claude/templates.yaml`, when I open the app, then I see the templates as chips
- [ ] Given I tap a template, when it's selected, then the template text appears in my input field
- [ ] Given no `templates.yaml` exists, when I open the app, then I see default templates (Plan Milestone, Plan Feature, etc.)
- [ ] Given many templates exist, when viewing on phone, then I can horizontally scroll to see all templates
- [ ] Given Claude is working, when viewing templates, then chips are disabled and grayed out
- [ ] Given I tap a template with text already in input, when selected, then existing text is replaced

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                                    │
│  ┌──────────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  TemplateChips   │──►│  useTemplates   │──►│  api.get()       │  │
│  │  (Component)     │   │  (Hook)         │   │  /projects/:path/│  │
│  └──────────────────┘   └─────────────────┘   │  templates       │  │
│          │                                     └────────┬─────────┘  │
│          ▼                                              │            │
│  ┌──────────────────┐                                   │            │
│  │  PromptInput     │ ◄── onTemplateSelect(prompt)      │            │
│  │  (existing)      │                                   │            │
│  └──────────────────┘                                   │            │
└─────────────────────────────────────────────────────────│────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend (Express)                                                   │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  projects.ts    │──►│ templateService │──►│  yaml.parse()    │  │
│  │  GET /templates │   │ .getTemplates() │   │  fs.readFile()   │  │
│  └─────────────────┘   └─────────────────┘   └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### New Files to Create

| File | Purpose |
|------|---------|
| `server/src/services/templateService.ts` | Load templates from YAML or return defaults |
| `client/src/hooks/useTemplates.ts` | Fetch and cache templates for current project |
| `client/src/components/conversation/TemplateChips.tsx` | Horizontally scrollable template buttons |

### Files to Modify

| File | Changes |
|------|---------|
| `server/src/api/projects.ts` | Implement GET `/:encodedPath/templates` endpoint |
| `client/src/components/conversation/ConversationView.tsx` | Add TemplateChips above PromptInput |
| `client/src/components/conversation/PromptInput.tsx` | Add `setValue` prop for external control |

### Backend: templateService.ts

```typescript
// server/src/services/templateService.ts
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { Template } from '@shared/types';
import { decodePath } from '../lib/pathEncoder.js';
import { logger } from '../lib/logger.js';

/** 
 * Default templates matching the vibe-coding-prompts workflow.
 * These reference the standard files in vibe-coding-prompts/ directory.
 */
const DEFAULT_TEMPLATES: Template[] = [
  {
    label: 'Plan Milestone',
    icon: '📋',
    prompt: `# Plan Milestone

Review the **[MILESTONE NAME]** milestone:

1. Read \`docs/project_status.md\` and \`docs/product_spec.md\` and \`docs/architecture.md\`
2. Review any relevant feature docs and plan the milestone out and list all features in priority/dependency order based on any sequencing constraints around what must be built first (don't over-engineer this, don't break it into phases or anything just list the ordering of the features to build because there will be standalone planning processes for each individual feature. The goal right now is just to identify work order.)
3. Create a recommended build order
4. Update the \`docs/project_status.md\`doc with the build order sequencing details (again, keep this update lightweight and keep it context-light as each feature will be planned, built, and handled individually). Do not update any other files.

Start with step 1.`,
  },
  {
    label: 'Plan Feature',
    icon: '📝',
    prompt: `# Plan Feature

Plan the next feature, the **[FEATURE NAME]** feature:

1. Read \`docs/project_status.md\` and \`docs/product_spec.md\` and \`docs/architecture.md\` and any relevant feature docs
2. Break into atomic implementation tasks (~30-60 min each). Don't include unit and integration tests in this list, those should be a sparate test plan which is handled as a final action outside of the task list. Feel free to include a test plan in the feature doc though.
3. Create a feature doc in \`docs/Features/[feature-name].md\` outlining the feature and the implementation tasks.
4. Update \`docs/project_status.md\` to mark this feature as in-progress (keep this update context-light). Do not update any other files.

Start with step 1.`,
  },
  {
    label: 'Build Task',
    icon: '🔨',
    prompt: `# Build Task

Implement the next task, task **[TASK NUMBER]** for the feature **[FEATURE NAME]**: **[TASK DESCRIPTION]**

1. Read \`docs/Features/[feature-name].md\` for the feature you're working on, and any other relevant feature docs
2. Implement the next incomplete task in the feature. Follow existing patterns in the codebase and keep changes minimal and focused.
3. Run linting after implementation. Don't worry about unit tests for now, those will come as part of a bigger testing step for the overall feature later.
4. Confirm when complete.  If there are tasks remaining, call the /build-task slash command. If this was the final task in the feature, or if blockers arise, confirm when complete using explicit confirmation like "Task **[TASK NUMBER OUT OF TOTAL TASKS IN FEATURE NUMBER]** complete. Ready for next task, or do you want to test this first?".

Start with step 1.`,
  },
  {
    label: 'Test',
    icon: '🧪',
    prompt: `# Test

Test the feature **[FEATURE/COMPONENT]** we just built:

1. Read \`docs/Features/[feature-name].md\`
2. Identify what tests should exist for the overall feature (unit, integration, e2e)
3. Run existing tests to verify nothing broke
4. Write new tests for the new functionality
5. Use browser tools to manually verify UI if applicable (avoid actions which will invoke APIs that cost money like LLMs or scrapers, ask before doing so if you absolutely need to test those)
6. Report results (do not commit to git or update any docs. Use explicit confirmation like "Testing complete with 0 errors. Ready to finalize?").

Start with step 1.`,
  },
  {
    label: 'Finalize',
    icon: '✅',
    prompt: `# Finalize Feature

Finalize the feature **[FEATURE NAME]** we just built:

1. Run \`pnpm lint\` and \`pnpm type-check\` - fix any errors
2. Review all implementation work from the various tasks built for the feature, and update \`docs/Features/[feature-name].md\` with any relevant detail for documentation.
3. Update \`docs/changelog.md\` with what was added/changed
4. Update \`docs/project_status.md\` to mark feature complete (move the completed feature to the bottom of the document and remove any no-longer-needed detail about the specific sequencing of this feature build, to try and keep this project_status doc compact)
5. Add any architectural decisions to \`docs/decision_log.md\`
6. Prepare a conventional commit message and propose a version tag using the naming convention "vX.Y.Z" where X is the milestone number (starting at 0 for MVP), Y is the feature number from the milestone plan, and Z is used for iterations like major bug fixes or incremental unplanned features.

Start with step 1.`,
  },
  {
    label: 'Fix/Update',
    icon: '🔧',
    prompt: `# Fix or Update Task

Implement an update or fix for the issue **[ISSUE]** related to the feature **[FEATURE NAME]**: **[TASK DESCRIPTION]**

1. Read any relevant \`docs/Features/[feature-name].md\` docs for background on the features architecture.
2. Do any debugging necessary, checking the logs if needed to identify what's going on.
3. Plan a fix which accounts for the overall project plan and architecture by breaking the update into atomic implementation tasks (~30-60 min each).
4. Implement the update. Follow existing patterns in the codebase and keep changes minimal and focused.
5. Run linting after implementation.
6. Identify if any new tests should exist or existing tests should be updated (unit, integration, e2e).
7. Run tests
8. When all tests pass, update any relevant \`docs/Features/[feature-name].md\` docs.
9. Confirm when complete and report on results, and prepare a commit message.

Start with step 1.`,
  },
];

/** Path to templates file within a project */
const TEMPLATES_FILENAME = '.claude/templates.yaml';

interface TemplatesFileSchema {
  templates: Array<{
    label: string;
    icon?: string;
    prompt: string;
  }>;
}

/**
 * Get templates for a project
 * Falls back to defaults if no project-specific file exists
 */
export async function getTemplates(encodedPath: string): Promise<Template[]> {
  const projectPath = decodePath(encodedPath);
  const templatesPath = join(projectPath, TEMPLATES_FILENAME);
  
  try {
    const content = await readFile(templatesPath, 'utf-8');
    const parsed = parseYaml(content) as TemplatesFileSchema;
    
    if (!parsed?.templates || !Array.isArray(parsed.templates)) {
      logger.warn('Invalid templates.yaml structure, using defaults', { projectPath });
      return DEFAULT_TEMPLATES;
    }
    
    // Validate and transform templates
    const templates: Template[] = parsed.templates
      .filter((t) => t.label && t.prompt) // Must have label and prompt
      .map((t) => ({
        label: t.label,
        icon: t.icon || '📌', // Default icon
        prompt: t.prompt,
      }));
    
    // Return defaults if no valid templates found
    return templates.length > 0 ? templates : DEFAULT_TEMPLATES;
  } catch (err) {
    // File doesn't exist or can't be read - use defaults
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn('Failed to read templates.yaml, using defaults', { 
        projectPath, 
        error: err instanceof Error ? err.message : 'Unknown' 
      });
    }
    return DEFAULT_TEMPLATES;
  }
}
```

### Backend: projects.ts (update)

```typescript
// Update GET /:encodedPath/templates handler
router.get('/:encodedPath/templates', async (req, res) => {
  try {
    const { encodedPath } = req.params;
    
    // First check if project exists
    const project = await getProject(encodedPath);
    if (!project) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Project not found'));
      return;
    }
    
    const templates = await getTemplates(encodedPath);
    res.json(success(templates));
  } catch (err) {
    logger.error('Failed to get templates', {
      encodedPath: req.params.encodedPath,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get templates'));
  }
});
```

### Frontend: useTemplates Hook

```typescript
// client/src/hooks/useTemplates.ts
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { Template } from '@shared/types';

interface UseTemplatesResult {
  templates: Template[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch templates for the current project
 * Uses SWR for caching and automatic revalidation
 */
export function useTemplates(encodedPath: string | null): UseTemplatesResult {
  const { data, error, isLoading } = useSWR<Template[]>(
    encodedPath ? `/projects/${encodedPath}/templates` : null,
    (path) => api.get<Template[]>(path),
    {
      revalidateOnFocus: false, // Templates don't change often
      dedupingInterval: 60000,   // Cache for 1 minute
    }
  );

  return {
    templates: data,
    isLoading,
    error: error ?? null,
  };
}
```

### Frontend: TemplateChips Component

Key features:
- Horizontal scroll with hidden scrollbar
- Chips as buttons with icon + label
- Disabled state when Claude is working
- Touch-friendly sizing (44px height minimum)
- Loading skeleton state

```tsx
// client/src/components/conversation/TemplateChips.tsx
interface TemplateChipsProps {
  templates: Template[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TemplateChips({ templates, onSelect, disabled, className }: TemplateChipsProps) {
  // Horizontal scrollable container with chips
  // Each chip calls onSelect(template.prompt) when tapped
}
```

### Integration with ConversationView

The ConversationView will be updated to:
1. Fetch templates using `useTemplates` hook
2. Pass a `setInputValue` callback to PromptInput
3. Render TemplateChips between messages and input

```tsx
// ConversationView changes
const { templates } = useTemplates(encodedPath);
const [inputValue, setInputValue] = useState('');

return (
  <div className="flex flex-col">
    {/* Messages */}
    <div className="flex-1 overflow-auto">...</div>
    
    {/* Templates (only show if loaded and not empty) */}
    {templates && templates.length > 0 && (
      <TemplateChips
        templates={templates}
        onSelect={(prompt) => setInputValue(prompt)}
        disabled={status === 'working'}
      />
    )}
    
    {/* Input */}
    <PromptInput
      value={inputValue}
      onChange={setInputValue}
      onSend={handleSend}
      ...
    />
  </div>
);
```

### PromptInput Modifications

The PromptInput component needs to support external value control:

```tsx
// Add props for controlled mode
interface PromptInputProps {
  // ... existing props
  /** External value (controlled mode) */
  externalValue?: string;
  /** Callback when value changes (controlled mode) */
  onValueChange?: (value: string) => void;
}
```

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| No project selected | Don't fetch, hide templates |
| Templates loading | Show skeleton chips |
| API error | Silent fallback to defaults |
| Empty templates array | Hide container entirely |
| Very long prompt | Text inserted into input (may expand) |
| Tap while sending | Disabled, no action |
| Many templates (10+) | Horizontal scroll enabled |
| Network offline | Show cached templates or defaults |

### Template File Format

Projects can override the defaults by creating `.claude/templates.yaml`:

```yaml
# .claude/templates.yaml
templates:
  - label: "Plan Milestone"
    icon: "📋"
    prompt: |
      # Plan Milestone

      Review the **[MILESTONE NAME]** milestone:

      1. Read `docs/project_status.md` and `docs/product_spec.md` and `docs/architecture.md`
      2. Review any relevant feature docs and plan the milestone out...
      
  - label: "Plan Feature"
    icon: "📝"
    prompt: |
      # Plan Feature

      Plan the next feature, the **[FEATURE NAME]** feature:
      ...
```

## Default Templates (Vibe-Coding Workflow)

The default templates match the standard `vibe-coding-prompts/` workflow files:

| Template | Icon | Source File |
|----------|------|-------------|
| Plan Milestone | 📋 | `vibe-coding-prompts/1-plan-milestone.md` |
| Plan Feature | 📝 | `vibe-coding-prompts/2-plan-feature.md` |
| Build Task | 🔨 | `vibe-coding-prompts/3-build-task.md` |
| Test | 🧪 | `vibe-coding-prompts/4-test.md` |
| Finalize | ✅ | `vibe-coding-prompts/5-finalize.md` |
| Fix/Update | 🔧 | `vibe-coding-prompts/6-update_or_fix.md` |

**Note:** The "Plan New Project" and "Push to Github" commands are intentionally excluded from templates as they involve operations better done from a terminal (cloning repos, git push).

## Implementation Tasks

| # | Task | Estimate | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Create `templateService.ts` with `getTemplates()` | 30 min | ✅ | YAML parsing, default fallback with vibe-coding prompts |
| 2 | Implement GET `/projects/:encodedPath/templates` endpoint | 20 min | ✅ | Wire up to service |
| 3 | Create `useTemplates` hook | 20 min | ✅ | SWR caching |
| 4 | Create `TemplateChips` component | 45 min | ✅ | Horizontal scroll, styling |
| 5 | Create `TemplateChipsSkeleton` for loading state | 15 min | ✅ | Included in TemplateChips.tsx |
| 6 | Modify `PromptInput` for external value control | 20 min | ✅ | Controlled/uncontrolled hybrid |
| 7 | Integrate TemplateChips into ConversationView | 30 min | ✅ | Wire up state management |
| 8 | Add haptic feedback on template tap | 10 min | ✅ | Included in TemplateChips (30ms vibration) |

**Total Estimated Time**: ~3 hours

## Test Plan

### Unit Tests
- `templateService.test.ts`: Mock file system, test YAML parsing, default fallback
- `useTemplates.test.ts`: Mock API, verify caching behavior
- `TemplateChips.test.tsx`: Disabled states, click handling, accessibility

### Integration Tests
- GET `/projects/:encodedPath/templates`: Valid project returns templates
- GET with missing file: Returns defaults
- GET with invalid YAML: Returns defaults

### Manual Testing
- [ ] Verify horizontal scroll on mobile
- [ ] Test with no templates.yaml (defaults shown)
- [ ] Test with project-specific templates.yaml
- [ ] Verify disabled state when Claude is working
- [ ] Test template insertion into input
- [ ] Test editing inserted template before sending
- [ ] Test on various screen widths

## Out of Scope (for this feature)

- Template variables (`{{branch}}`, `{{file}}`) - deferred to v1
- Reordering templates
- Adding/editing templates from UI
- Template categories/groups
- Favorite/pinned templates
- Template history/analytics
- "Plan New Project" template (requires git clone)
- "Push to Github" template (requires git operations)

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Text Input & Send | Feature | ✅ Complete |
| Project Switcher | Feature | ✅ Complete |
| `yaml` package | npm | ✅ Already installed |
| SWR | npm | ✅ Already installed |

## Related Documents

- [Product Spec - Quick-Select Templates](../product_spec.md#feature-quick-select-templates)
- [Architecture - Template Types](../architecture.md#43-data-models)
- [Text Input & Send](./text-input-send.md)
- `vibe-coding-prompts/1-plan-milestone.md`
- `vibe-coding-prompts/2-plan-feature.md`
- `vibe-coding-prompts/3-build-task.md`
- `vibe-coding-prompts/4-test.md`
- `vibe-coding-prompts/5-finalize.md`
- `vibe-coding-prompts/6-update_or_fix.md`

---

*Created: 2026-01-14*  
*Last Updated: 2026-01-14*

