/**
 * ServerlessSettingsSection - Settings UI for serverless/cloud execution
 *
 * Allows users to configure Modal cloud execution including:
 * - Enable/disable serverless mode
 * - Modal API token (encrypted)
 * - Claude API key for cloud (encrypted)
 * - Default repository URL
 * - Laptop URL for connectivity checks
 */

import { useState, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/cn';
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

function KeyIcon({ className }: { className?: string }) {
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
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
      />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
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

/**
 * Styled input component
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ error, className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(
        'w-full px-3 py-2.5',
        'bg-surface-elevated',
        'rounded-lg',
        'text-text-primary',
        'placeholder:text-text-muted',
        'border',
        error ? 'border-error' : 'border-text-primary/10',
        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
        'transition-colors duration-150',
        className
      )}
    />
  );
});
Input.displayName = 'Input';

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check if a string looks like a valid URL
 */
function isValidUrl(url: string): boolean {
  if (!url.trim()) return true; // Empty is OK
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if token looks valid (has some minimum length and characters)
 */
function isTokenConfigured(token?: string): boolean {
  return Boolean(token && token.length >= 10);
}

/**
 * Mask a token for display (show first 4 chars)
 */
function maskToken(token?: string): string {
  if (!token) return '';
  if (token.length <= 8) return '••••••••';
  return `${token.substring(0, 4)}••••••••`;
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

  // Local state for inputs
  const [modalToken, setModalToken] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [defaultRepoUrl, setDefaultRepoUrl] = useState('');
  const [laptopUrl, setLaptopUrl] = useState('');

  // Error states
  const [repoUrlError, setRepoUrlError] = useState<string | null>(null);
  const [laptopUrlError, setLaptopUrlError] = useState<string | null>(null);

  // Token visibility state
  const [showModalToken, setShowModalToken] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);

  // Sync from settings when they change
  useEffect(() => {
    if (serverlessSettings.defaultRepoUrl) {
      setDefaultRepoUrl(serverlessSettings.defaultRepoUrl);
    }
    if (serverlessSettings.laptopUrl) {
      setLaptopUrl(serverlessSettings.laptopUrl);
    }
    // Don't sync tokens - they come back masked from server
  }, [serverlessSettings.defaultRepoUrl, serverlessSettings.laptopUrl]);

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
    // If enabling, check if we have required tokens
    if (enabled) {
      const hasModalToken =
        isTokenConfigured(serverlessSettings.modalToken) || isTokenConfigured(modalToken);
      const hasClaudeKey =
        isTokenConfigured(serverlessSettings.claudeApiKey) || isTokenConfigured(claudeApiKey);

      if (!hasModalToken || !hasClaudeKey) {
        // Allow enabling but show warning in UI
        console.warn('Enabling serverless without all tokens configured');
      }
    }

    await updateServerlessSettings({ enabled });
  };

  // Handle Modal token change
  const handleModalTokenBlur = async () => {
    if (!modalToken.trim()) return;

    await updateServerlessSettings({ modalToken: modalToken.trim() });
    // Clear local state after save (server will have it encrypted)
    setModalToken('');
    setShowModalToken(false);
  };

  // Handle Claude API key change
  const handleClaudeKeyBlur = async () => {
    if (!claudeApiKey.trim()) return;

    await updateServerlessSettings({ claudeApiKey: claudeApiKey.trim() });
    // Clear local state after save
    setClaudeApiKey('');
    setShowClaudeKey(false);
  };

  // Handle repo URL change
  const handleRepoUrlBlur = async () => {
    const trimmed = defaultRepoUrl.trim();

    if (trimmed && !isValidUrl(trimmed)) {
      setRepoUrlError('Please enter a valid URL');
      return;
    }

    setRepoUrlError(null);
    await updateServerlessSettings({ defaultRepoUrl: trimmed || undefined });
  };

  // Handle laptop URL change
  const handleLaptopUrlBlur = async () => {
    const trimmed = laptopUrl.trim();

    if (trimmed && !isValidUrl(trimmed)) {
      setLaptopUrlError('Please enter a valid URL');
      return;
    }

    setLaptopUrlError(null);
    await updateServerlessSettings({ laptopUrl: trimmed || undefined });
  };

  // Derived state
  const isEnabled = serverlessSettings.enabled;
  const hasModalToken = isTokenConfigured(serverlessSettings.modalToken);
  const hasClaudeKey = isTokenConfigured(serverlessSettings.claudeApiKey);
  const isFullyConfigured = hasModalToken && hasClaudeKey;

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
        <h3 className="text-base font-medium text-text-primary">Serverless Execution</h3>
        {isEnabled && (
          <span
            className={cn(
              'ml-auto px-2 py-0.5 rounded-full text-xs font-medium',
              isFullyConfigured ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            )}
          >
            {isFullyConfigured ? 'Ready' : 'Setup Required'}
          </span>
        )}
      </div>

      <p className="text-xs text-text-muted mb-4">
        Run Claude in the cloud via Modal when your laptop is unavailable. Requires a Modal account
        and Claude API key.
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
              label="Enable serverless execution"
            />
          </div>

          {/* Configuration status when enabled */}
          {isEnabled && (
            <div
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg',
                isFullyConfigured ? 'bg-success/10' : 'bg-warning/10'
              )}
            >
              {isFullyConfigured ? (
                <CheckCircleIcon className="text-success flex-shrink-0 mt-0.5" />
              ) : (
                <ExclamationIcon className="text-warning flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                {isFullyConfigured ? (
                  <p className="text-success">Cloud execution is configured and ready.</p>
                ) : (
                  <div className="text-warning">
                    <p className="font-medium">Setup incomplete:</p>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside">
                      {!hasModalToken && <li>Modal API token required</li>}
                      {!hasClaudeKey && <li>Claude API key required</li>}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* API Credentials section - always visible for configuration */}
        <div className="rounded-lg border border-text-primary/10 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyIcon className="text-text-muted h-4 w-4" />
            <p className="text-sm font-medium text-text-primary">API Credentials</p>
          </div>

          {/* Modal API Token */}
          <div className="space-y-2">
            <label
              htmlFor="modal-token"
              className="flex items-center justify-between text-sm font-medium text-text-primary"
            >
              <span>Modal API Token</span>
              {hasModalToken && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3" />
                  Configured
                </span>
              )}
            </label>
            <div className="relative">
              <Input
                id="modal-token"
                type={showModalToken ? 'text' : 'password'}
                value={modalToken}
                onChange={(e) => setModalToken(e.target.value)}
                onBlur={handleModalTokenBlur}
                placeholder={
                  hasModalToken ? maskToken(serverlessSettings.modalToken) : 'Enter Modal token...'
                }
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowModalToken(!showModalToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label={showModalToken ? 'Hide token' : 'Show token'}
              >
                {showModalToken ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Get from{' '}
              <a
                href="https://modal.com/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                modal.com/settings
              </a>
            </p>
          </div>

          {/* Claude API Key */}
          <div className="space-y-2">
            <label
              htmlFor="claude-api-key"
              className="flex items-center justify-between text-sm font-medium text-text-primary"
            >
              <span>Claude API Key</span>
              {hasClaudeKey && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3" />
                  Configured
                </span>
              )}
            </label>
            <div className="relative">
              <Input
                id="claude-api-key"
                type={showClaudeKey ? 'text' : 'password'}
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                onBlur={handleClaudeKeyBlur}
                placeholder={
                  hasClaudeKey ? maskToken(serverlessSettings.claudeApiKey) : 'sk-ant-...'
                }
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowClaudeKey(!showClaudeKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label={showClaudeKey ? 'Hide key' : 'Show key'}
              >
                {showClaudeKey ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Get from{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
        </div>

        {/* Optional configuration */}
        <div className="rounded-lg border border-text-primary/10 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="text-text-muted h-4 w-4" />
            <p className="text-sm font-medium text-text-primary">Optional Configuration</p>
          </div>

          {/* Default Repository URL */}
          <div className="space-y-2">
            <label
              htmlFor="default-repo-url"
              className="block text-sm font-medium text-text-primary"
            >
              Default Repository URL
            </label>
            <Input
              id="default-repo-url"
              type="url"
              value={defaultRepoUrl}
              onChange={(e) => {
                setDefaultRepoUrl(e.target.value);
                setRepoUrlError(null);
              }}
              onBlur={handleRepoUrlBlur}
              placeholder="https://github.com/you/your-repo.git"
              error={repoUrlError ?? undefined}
            />
            {repoUrlError && <p className="text-xs text-error">{repoUrlError}</p>}
            <p className="text-xs text-text-muted">
              Git repo to clone for cloud execution. Can be overridden per-prompt.
            </p>
          </div>

          {/* Laptop URL */}
          <div className="space-y-2">
            <label htmlFor="laptop-url" className="block text-sm font-medium text-text-primary">
              Laptop API URL
            </label>
            <Input
              id="laptop-url"
              type="url"
              value={laptopUrl}
              onChange={(e) => {
                setLaptopUrl(e.target.value);
                setLaptopUrlError(null);
              }}
              onBlur={handleLaptopUrlBlur}
              placeholder="https://my-laptop.tailnet.ts.net:3456"
              error={laptopUrlError ?? undefined}
            />
            {laptopUrlError && <p className="text-xs text-error">{laptopUrlError}</p>}
            <p className="text-xs text-text-muted">
              Your laptop&apos;s Tailscale URL for connectivity detection.
            </p>
          </div>
        </div>

        {/* Info section */}
        <div className="text-xs text-text-muted space-y-1">
          <p>
            <strong>How it works:</strong> When your laptop is unavailable, prompts are sent to
            Modal cloud where Claude runs in a container with your repo.
          </p>
          <p>
            <strong>Costs:</strong> Pay-per-second compute (~$0.001/sec) + Anthropic API usage.
          </p>
        </div>
      </div>
    </section>
  );
}
