import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  confirmAction: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: 'Confirm Action',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'warning',
    onConfirm: () => {},
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const confirmAction = useCallback((options: ConfirmOptions) => {
    setConfirmModalState({
      isOpen: true,
      title: options.title || 'Confirm Action',
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'warning',
      onConfirm: options.onConfirm,
    });
  }, []);

  const closeConfirmModal = () => {
    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast, confirmAction }}>
      {children}

      {/* Global Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={closeConfirmModal}
        onConfirm={() => {
          confirmModalState.onConfirm();
          closeConfirmModal();
        }}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        cancelText={confirmModalState.cancelText}
        variant={confirmModalState.variant}
      />

      {/* Premium Toast Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '380px',
          width: 'calc(100vw - 48px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          const accentColor = isSuccess ? '#22c55e' : isError ? '#ef4444' : '#3b82f6';
          const bgGlow = isSuccess ? 'rgba(34, 197, 94, 0.12)' : isError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)';

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                position: 'relative',
                background: 'rgba(15, 18, 28, 0.95)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${accentColor}35`,
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: `0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px ${bgGlow}`,
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '10px',
                  background: bgGlow,
                  border: `1px solid ${accentColor}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: accentColor,
                }}
              >
                {isSuccess ? <CheckCircle2 size={18} /> : isError ? <AlertCircle size={18} /> : <Info size={18} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: accentColor }}>
                  {isSuccess ? 'Success' : isError ? 'Error' : 'Notification'}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 500, marginTop: 2, wordBreak: 'break-word' }}>
                  {toast.message}
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)')}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
