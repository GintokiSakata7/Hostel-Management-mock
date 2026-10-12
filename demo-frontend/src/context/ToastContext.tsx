import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, MessageSquare } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'whatsapp';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  subMessage?: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, subMessage?: string) => void;
  success: (msg: string, sub?: string) => void;
  error: (msg: string, sub?: string) => void;
  info: (msg: string, sub?: string) => void;
  whatsapp: (msg: string, sub?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string, subMessage?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message, subMessage }]);
    setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);

  const success = useCallback((msg: string, sub?: string) => toast('success', msg, sub), [toast]);
  const error = useCallback((msg: string, sub?: string) => toast('error', msg, sub), [toast]);
  const info = useCallback((msg: string, sub?: string) => toast('info', msg, sub), [toast]);
  const whatsapp = useCallback((msg: string, sub?: string) => toast('whatsapp', msg, sub), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, whatsapp }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-card toast-${t.type} animate-slide-in-right`}>
            <div className="toast-icon">
              {t.type === 'success' && <CheckCircle2 size={18} color="#22c55e" />}
              {t.type === 'error' && <AlertCircle size={18} color="#ef4444" />}
              {t.type === 'info' && <Info size={18} color="#3b82f6" />}
              {t.type === 'whatsapp' && <MessageSquare size={18} color="#25D366" />}
            </div>
            <div className="toast-body">
              <div className="toast-title">{t.message}</div>
              {t.subMessage && <div className="toast-sub">{t.subMessage}</div>}
            </div>
            <button className="toast-close-btn" onClick={() => removeToast(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
