/**
 * Toast - Notification toast component with provider
 *
 * Displays brief notifications at the bottom of the screen.
 * Supports success, error, and info variants.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// ============================================================
// Types
// ============================================================

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  dismissToast: (id: string) => void;
}

// ============================================================
// Context
// ============================================================

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast functions
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================
// Provider
// ============================================================

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast provider - wrap your app with this to enable toasts
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration: number = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ============================================================
// Toast Container
// ============================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-20 z-[100]', // Above tab bar
        'flex flex-col items-center gap-2',
        'pointer-events-none',
        'px-4 safe-bottom'
      )}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

// ============================================================
// Toast Item
// ============================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  // Auto-dismiss after duration
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(onDismiss, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onDismiss]);

  const variantStyles = {
    success: 'bg-success text-white',
    error: 'bg-error text-white',
    info: 'bg-surface text-text-primary border border-text-primary/10',
  };

  const variantIcon = {
    success: <CheckIcon />,
    error: <XIcon />,
    info: <InfoIcon />,
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        'px-4 py-3 rounded-xl shadow-lg',
        'animate-slide-up',
        'pointer-events-auto',
        'max-w-sm w-full',
        variantStyles[toast.variant]
      )}
      role="alert"
    >
      <span className="flex-shrink-0">{variantIcon[toast.variant]}</span>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          'flex-shrink-0 p-1 rounded-full',
          'hover:bg-white/20 active:bg-white/30',
          'transition-colors duration-150',
          toast.variant === 'info' && 'hover:bg-text-primary/10 active:bg-text-primary/20'
        )}
        aria-label="Dismiss"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
