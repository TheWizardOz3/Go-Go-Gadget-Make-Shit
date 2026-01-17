/**
 * SettingsModal - Full-screen modal for app settings
 *
 * Allows users to configure notifications with channel-based UI.
 * Currently supports iMessage; ready for ntfy, Slack, Telegram, Email.
 * Slides up from bottom with dark backdrop overlay.
 */

import { useEffect, useRef, useState, forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { useSettings, sendTestNotification } from '@/hooks/useSettings';
import type { IMessageChannelSettings, NotificationChannelSettings } from '@shared/types';

interface SettingsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Close icon (X)
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-6 w-6', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Bell icon for notifications section
 */
function BellIcon({ className }: { className?: string }) {
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
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

/**
 * Pencil icon for edits section
 */
function PencilIcon({ className }: { className?: string }) {
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
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

/**
 * Message bubble icon for iMessage
 */
function MessageIcon({ className }: { className?: string }) {
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
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

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
 * Styled input component with proper contrast
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
        // Background with better contrast
        'bg-surface-elevated',
        'rounded-lg',
        // Text colors - use CSS variable for proper light/dark mode
        'text-text-primary',
        'placeholder:text-text-muted',
        // Border
        'border',
        error ? 'border-error' : 'border-text-primary/10',
        // Focus state
        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
        'transition-colors duration-150',
        className
      )}
    />
  );
});
Input.displayName = 'Input';

/**
 * Validate phone number format
 * Basic validation - allows common formats
 */
function isValidPhoneNumber(phone: string): boolean {
  // Allow: +1234567890, 123-456-7890, (123) 456-7890, etc.
  const cleaned = phone.replace(/[\s\-().]/g, '');
  // Must start with + or digit, and be 10-15 digits total
  return /^\+?\d{10,15}$/.test(cleaned);
}

/**
 * SettingsModal component
 */
export function SettingsModal({ isOpen, onClose, className }: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const { settings, isLoading, updateSettings, isUpdating } = useSettings();

  // Local state for inputs (to allow editing before save)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [serverHostname, setServerHostname] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get iMessage settings from new channels structure (with fallback for legacy)
  const getIMessageSettings = (): IMessageChannelSettings => {
    if (settings?.channels?.imessage) {
      return settings.channels.imessage;
    }
    // Fallback to legacy format
    return {
      enabled: settings?.notificationsEnabled ?? false,
      phoneNumber: settings?.notificationPhoneNumber,
    };
  };

  const imessageSettings = getIMessageSettings();

  // Sync values from settings when modal opens or settings change
  useEffect(() => {
    // Get iMessage settings, handling legacy and new formats
    const imessageSettings = settings?.channels?.imessage;
    const phoneFromSettings = imessageSettings?.phoneNumber ?? settings?.notificationPhoneNumber;

    if (phoneFromSettings) {
      setPhoneNumber(phoneFromSettings);
    }
    if (settings?.serverHostname) {
      setServerHostname(settings.serverHostname);
    }
  }, [settings?.channels?.imessage, settings?.notificationPhoneNumber, settings?.serverHostname]);

  // Clear test result after 5 seconds
  useEffect(() => {
    if (testResult) {
      const timer = setTimeout(() => setTestResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [testResult]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhoneError(null);
      setTestResult(null);
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Helper to update channel settings
  const updateChannelSettings = async (
    channelId: keyof NotificationChannelSettings,
    channelSettings: Partial<IMessageChannelSettings>
  ) => {
    const currentChannels = settings?.channels ?? {};
    const currentChannelSettings = currentChannels[channelId] ?? { enabled: false };

    const updatedChannels: NotificationChannelSettings = {
      ...currentChannels,
      [channelId]: {
        ...currentChannelSettings,
        ...channelSettings,
      },
    };

    await updateSettings({ channels: updatedChannels });
  };

  // Handle iMessage toggle
  const handleToggleIMessage = async (enabled: boolean) => {
    // If enabling, check if phone number is valid
    if (enabled && !isValidPhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid phone number first');
      phoneInputRef.current?.focus();
      return;
    }

    try {
      await updateChannelSettings('imessage', { enabled });
    } catch {
      // Error handled by hook
    }
  };

  // Handle phone number change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    setPhoneError(null);
  };

  // Handle phone number blur (save)
  const handlePhoneBlur = async () => {
    if (!phoneNumber.trim()) {
      // Clear phone number
      await updateChannelSettings('imessage', { phoneNumber: undefined });
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }

    try {
      await updateChannelSettings('imessage', { phoneNumber });
    } catch {
      setPhoneError('Failed to save phone number');
    }
  };

  // Handle hostname change
  const handleHostnameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setServerHostname(e.target.value);
  };

  // Handle hostname blur (save)
  const handleHostnameBlur = async () => {
    const trimmed = serverHostname.trim();
    try {
      await updateSettings({ serverHostname: trimmed || undefined });
    } catch {
      // Silent fail - hostname is optional
    }
  };

  // Handle test notification
  const handleTestNotification = async () => {
    if (!isValidPhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid phone number first');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      // Save phone number and hostname first if changed
      if (phoneNumber !== imessageSettings.phoneNumber) {
        await updateChannelSettings('imessage', { phoneNumber });
      }
      if (serverHostname !== settings?.serverHostname) {
        await updateSettings({ serverHostname: serverHostname.trim() || undefined });
      }

      const result = await sendTestNotification('imessage', { enabled: true, phoneNumber });
      setTestResult({ success: result.sent, message: result.message });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test notification',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen) return null;

  const isIMessageEnabled = imessageSettings.enabled;
  const hasValidPhone = isValidPhoneNumber(phoneNumber);

  return (
    <div
      className={cn(
        // Backdrop
        'fixed inset-0 z-50',
        'bg-black/60 backdrop-blur-sm',
        // Animation
        'animate-fade-in',
        className
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      {/* Modal container */}
      <div
        ref={modalRef}
        className={cn(
          'absolute inset-x-0 bottom-0',
          'max-h-[85vh] min-h-[40vh]',
          'bg-surface rounded-t-2xl',
          'flex flex-col',
          // Animation - slide up
          'animate-slide-up',
          // Safe area for notched phones
          'safe-bottom'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-text-primary/10">
          {/* Drag handle indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-text-primary/20" />

          <h2 id="settings-modal-title" className="text-lg font-semibold text-text-primary">
            Settings
          </h2>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 -mr-2 rounded-lg',
              'text-text-muted hover:text-text-primary',
              'hover:bg-text-primary/5 active:bg-text-primary/10',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
            )}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Claude Code Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <PencilIcon className="text-text-muted" />
                  <h3 className="text-base font-medium text-text-primary">Claude Code</h3>
                </div>

                <div className="space-y-4">
                  {/* Allow Edits toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-text-primary">
                        Allow Edits Automatically
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Skip permission prompts for file edits and commands
                      </p>
                    </div>
                    <Toggle
                      enabled={settings?.allowEdits ?? false}
                      onChange={(enabled) => updateSettings({ allowEdits: enabled })}
                      disabled={isUpdating}
                      label="Allow edits automatically"
                    />
                  </div>

                  <p className="text-xs text-text-muted">
                    When enabled, Claude can create, edit, and delete files without asking. Disable
                    this if you want to review each action before it runs.
                  </p>
                </div>
              </section>

              {/* Notification Channels Section */}
              <section className="pt-4 border-t border-text-primary/10">
                <div className="flex items-center gap-2 mb-4">
                  <BellIcon className="text-text-muted" />
                  <h3 className="text-base font-medium text-text-primary">Notification Channels</h3>
                </div>

                <p className="text-xs text-text-muted mb-4">
                  Get notified when Claude finishes a task. Enable one or more channels below.
                </p>

                <div className="space-y-4">
                  {/* iMessage Channel */}
                  <div className="rounded-lg border border-text-primary/10 p-4 space-y-4">
                    {/* Channel header with toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <MessageIcon className="text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">iMessage</p>
                          <p className="text-xs text-text-muted">macOS Messages.app</p>
                        </div>
                      </div>
                      <Toggle
                        enabled={isIMessageEnabled}
                        onChange={handleToggleIMessage}
                        disabled={isUpdating}
                        label="Enable iMessage notifications"
                      />
                    </div>

                    {/* Phone number input */}
                    <div className="space-y-2">
                      <label
                        htmlFor="phone-number"
                        className="block text-sm font-medium text-text-primary"
                      >
                        Phone Number
                      </label>
                      <Input
                        ref={phoneInputRef}
                        id="phone-number"
                        type="tel"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        placeholder="+1234567890"
                        error={phoneError ?? undefined}
                        aria-describedby={phoneError ? 'phone-error' : undefined}
                      />
                      {phoneError && (
                        <p id="phone-error" className="text-xs text-error">
                          {phoneError}
                        </p>
                      )}
                      <p className="text-xs text-text-muted">
                        The phone number to receive iMessage notifications
                      </p>
                    </div>

                    {/* Test button */}
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      disabled={!hasValidPhone || isSendingTest}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg',
                        'text-sm font-medium',
                        'transition-colors duration-150',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        hasValidPhone && !isSendingTest
                          ? 'bg-accent text-white hover:bg-accent-hover active:bg-accent-hover'
                          : 'bg-text-primary/10 text-text-muted cursor-not-allowed'
                      )}
                    >
                      {isSendingTest ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        'Test iMessage'
                      )}
                    </button>

                    {/* Test result message */}
                    {testResult && (
                      <p
                        className={cn(
                          'text-xs text-center',
                          testResult.success ? 'text-success' : 'text-error'
                        )}
                      >
                        {testResult.message}
                      </p>
                    )}
                  </div>

                  {/* Placeholder for future channels */}
                  <div className="rounded-lg border border-text-primary/5 border-dashed p-4">
                    <p className="text-xs text-text-muted text-center">
                      More channels coming soon: ntfy, Slack, Telegram
                    </p>
                  </div>
                </div>
              </section>

              {/* Server Settings Section */}
              <section className="pt-4 border-t border-text-primary/10">
                <div className="flex items-center gap-2 mb-4">
                  <svg
                    className="h-5 w-5 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
                    />
                  </svg>
                  <h3 className="text-base font-medium text-text-primary">Server</h3>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="server-hostname"
                    className="block text-sm font-medium text-text-primary"
                  >
                    Tailscale Hostname
                  </label>
                  <Input
                    id="server-hostname"
                    type="text"
                    value={serverHostname}
                    onChange={handleHostnameChange}
                    onBlur={handleHostnameBlur}
                    placeholder="my-macbook.tailnet.ts.net"
                  />
                  <p className="text-xs text-text-muted">
                    Your Tailscale hostname for notification links. Run{' '}
                    <code className="px-1 py-0.5 rounded bg-text-primary/5 text-text-secondary font-mono text-xs">
                      tailscale status
                    </code>{' '}
                    to find it.
                  </p>
                </div>
              </section>

              {/* Info Section */}
              <section className="pt-4 border-t border-text-primary/10">
                <p className="text-xs text-text-muted text-center">
                  iMessage requires Messages.app to be set up on your Mac.
                </p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
