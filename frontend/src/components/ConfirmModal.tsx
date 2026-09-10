import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false,
}: ConfirmModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: '#ef4444',
          iconBg: 'rgba(239,68,68,0.15)',
          borderColor: 'rgba(239,68,68,0.3)',
          buttonBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          buttonShadow: '0 4px 16px rgba(239,68,68,0.35)',
        };
      case 'warning':
        return {
          iconColor: '#f97316',
          iconBg: 'rgba(249,115,22,0.15)',
          borderColor: 'rgba(249,115,22,0.3)',
          buttonBg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          buttonShadow: '0 4px 16px rgba(249,115,22,0.35)',
        };
      case 'info':
      default:
        return {
          iconColor: '#3b82f6',
          iconBg: 'rgba(59,130,246,0.15)',
          borderColor: 'rgba(59,130,246,0.3)',
          buttonBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          buttonShadow: '0 4px 16px rgba(59,130,246,0.35)',
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 3000,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className={isMobile ? 'bottom-sheet' : 'glass-heavy'}
        style={
          isMobile
            ? { width: '100%', padding: '1.5rem', borderRadius: '24px 24px 0 0' }
            : {
                width: '100%',
                maxWidth: '440px',
                padding: '1.75rem',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
                position: 'relative',
                animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile && <div className="bottom-sheet-handle" />}

        {/* Close Icon */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        {/* Alert Icon & Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              background: vStyles.iconBg,
              border: `1px solid ${vStyles.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: vStyles.iconColor,
              flexShrink: 0,
            }}
          >
            {variant === 'danger' ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>{title}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action Required</span>
          </div>
        </div>

        {/* Message Content */}
        <div
          style={{
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '14px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {message}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border-dim)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={loading}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              background: vStyles.buttonBg,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: vStyles.buttonShadow,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'Processing…' : <>✓ {confirmText}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
