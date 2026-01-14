/**
 * Template Service
 *
 * Loads prompt templates from project-specific YAML files or returns defaults.
 * Default templates match the vibe-coding-prompts workflow.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { decodePath } from '../lib/pathEncoder.js';
import { logger } from '../lib/logger.js';

// ============================================================
// Types
// ============================================================

/**
 * Prompt template
 * Matches the Template type in shared/types/index.ts
 */
export interface Template {
  /** Display label */
  label: string;
  /** Icon identifier or emoji */
  icon: string;
  /** The prompt text to send */
  prompt: string;
}

// ============================================================
// Default Templates (Vibe-Coding Workflow)
// ============================================================

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

// ============================================================
// Constants
// ============================================================

/** Path to templates file within a project */
const TEMPLATES_FILENAME = '.claude/templates.yaml';

/** Schema for templates.yaml file */
interface TemplatesFileSchema {
  templates: Array<{
    label: string;
    icon?: string;
    prompt: string;
  }>;
}

// ============================================================
// Public API
// ============================================================

/**
 * Get templates for a project
 *
 * Attempts to load templates from the project's .claude/templates.yaml file.
 * Falls back to default vibe-coding-prompts templates if file doesn't exist
 * or is invalid.
 *
 * @param encodedPath - Claude's encoded project path (e.g., "-Users-derek-myproject")
 * @returns Array of templates (either project-specific or defaults)
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

    if (templates.length === 0) {
      logger.warn('No valid templates in templates.yaml, using defaults', { projectPath });
      return DEFAULT_TEMPLATES;
    }

    logger.info('Loaded project-specific templates', {
      projectPath,
      count: templates.length,
    });

    return templates;
  } catch (err) {
    // File doesn't exist - use defaults (this is expected and not an error)
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.debug('No templates.yaml found, using defaults', { projectPath });
      return DEFAULT_TEMPLATES;
    }

    // Other errors (permissions, invalid YAML, etc.)
    logger.warn('Failed to read templates.yaml, using defaults', {
      projectPath,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return DEFAULT_TEMPLATES;
  }
}

/**
 * Get the default templates
 *
 * Returns the built-in vibe-coding-prompts templates without attempting
 * to load from a project directory.
 *
 * @returns Array of default templates
 */
export function getDefaultTemplates(): Template[] {
  return DEFAULT_TEMPLATES;
}
