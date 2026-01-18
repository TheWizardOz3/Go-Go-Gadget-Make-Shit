/**
 * ServerlessSettingsSection - Settings UI for serverless/cloud execution
 *
 * Configuration comes from:
 * - Environment variables (VITE_MODAL_API_URL, VITE_LAPTOP_API_URL)
 * - Modal secrets (ANTHROPIC_API_KEY, GITHUB_TOKEN, GROQ_API_KEY)
 *
 * The user just needs to enable/disable the feature - no token entry needed.
 */

import { cn } from '@/lib/cn';
import { getCloudApiUrl } from '@/lib/api';
import type { ServerlessSettings, AppSettings } from '@shared/types';

// ============================================================
// Types
// ============================================================

interface ServerlessSettingsSectionProps {
  /** Current settings */
  settings: AppSettings | undefined;
  /** Whether settings are loading */
  isLoading?: boolean;
  /** Whether an update is in progress */
  isUpdating?: boolean;
  /** Callback to update serverless settings */
  onUpdateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings | undefined>;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// Icons
// ============================================================

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

// ============================================================
// Shared Components
// ============================================================

/**
 * Toggle switch component
 */
interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label: string;
}

function Toggle({ enabled, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        enabled ? 'bg-accent' : 'bg-text-primary/20',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0',
          'transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ============================================================
// Component
// ============================================================

export function ServerlessSettingsSection({
  settings,
  isLoading,
  isUpdating,
  onUpdateSettings,
  className,
}: ServerlessSettingsSectionProps) {
  // Get current serverless settings
  const serverlessSettings = settings?.serverless ?? {
    enabled: false,
  };

  // Check if Modal is configured via environment variable
  const modalApiUrl = getCloudApiUrl();
  const isModalConfigured = Boolean(modalApiUrl);

  // Helper to update serverless settings
  const updateServerlessSettings = async (updates: Partial<ServerlessSettings>) => {
    const newSettings: ServerlessSettings = {
      ...serverlessSettings,
      ...updates,
    };
    await onUpdateSettings({ serverless: newSettings });
  };

  // Handle enable/disable toggle
  const handleToggleEnabled = async (enabled: boolean) => {
    await updateServerlessSettings({ enabled });
  };

  // Derived state
  const isEnabled = serverlessSettings.enabled;

  if (isLoading) {
    return (
      <section className={cn('pt-4 border-t border-text-primary/10', className)}>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-text-primary/10" />
            <div className="w-32 h-5 rounded bg-text-primary/10" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-10 rounded-lg bg-text-primary/10" />
            <div className="w-full h-10 rounded-lg bg-text-primary/10" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('pt-4 border-t border-text-primary/10', className)}>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <CloudIcon className="text-text-muted" />
        <h3 className="text-base font-medium text-text-primary">Cloud Execution</h3>
        {isEnabled && isModalConfigured && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
            Ready
          </span>
        )}
        {isEnabled && !isModalConfigured && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
            Not Configured
          </span>
        )}
      </div>

      <p className="text-xs text-text-muted mb-4">
        When your laptop is offline, prompts can run on Modal cloud. API keys are configured in
        Modal secrets (ANTHROPIC_API_KEY, GROQ_API_KEY).
      </p>

      <div className="space-y-4">
        {/* Enable toggle */}
        <div className="rounded-lg border border-text-primary/10 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium text-text-primary">Enable Cloud Execution</p>
              <p className="text-xs text-text-muted mt-0.5">
                Allow prompts to run in Modal when laptop is offline
              </p>
            </div>
            <Toggle
              enabled={isEnabled}
              onChange={handleToggleEnabled}
              disabled={isUpdating}
              label="Enable cloud execution"
            />
          </div>

          {/* Configuration status when enabled */}
          {isEnabled && (
            <div
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg',
                isModalConfigured ? 'bg-success/10' : 'bg-warning/10'
              )}
            >
              {isModalConfigured ? (
                <CheckCircleIcon className="text-success flex-shrink-0 mt-0.5" />
              ) : (
                <ExclamationIcon className="text-warning flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                {isModalConfigured ? (
                  <div className="text-success">
                    <p className="font-medium">Cloud execution ready!</p>
                    <p className="text-text-muted mt-1">
                      Connected to: <code className="text-[10px]">{modalApiUrl}</code>
                    </p>
                  </div>
                ) : (
                  <div className="text-warning">
                    <p className="font-medium">Modal not configured</p>
                    <p className="text-text-muted mt-1">
                      Set <code className="text-[10px]">VITE_MODAL_API_URL</code> environment
                      variable in Vercel.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="text-xs text-text-muted space-y-2">
          <p>
            <strong>How it works:</strong> When your laptop is unavailable, prompts are sent to
            Modal cloud where Claude runs in a container with your repo.
          </p>
          <p>
            <strong>Required Modal Secrets:</strong>
          </p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>
              <code className="text-[10px]">ANTHROPIC_API_KEY</code> - For Claude Code
            </li>
            <li>
              <code className="text-[10px]">GROQ_API_KEY</code> - For voice transcription
            </li>
            <li>
              <code className="text-[10px]">GITHUB_TOKEN</code> - For private repos (optional)
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
