import { X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 2500,
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        className={isMobile ? 'bottom-sheet' : 'glass-panel'}
        style={
          isMobile
            ? {
                padding: '20px 18px',
                width: '100%',
                maxHeight: '88vh',
                display: 'flex',
                flexDirection: 'column'
              }
            : {
                width: '100%',
                maxWidth: '540px',
                maxHeight: '90vh',
                padding: '1.75rem',
                position: 'relative',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                background: 'rgba(22, 26, 38, 0.94)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column'
              }
        }
        onClick={e => e.stopPropagation()}
      >
        {isMobile && <div className="bottom-sheet-handle" />}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexShrink: 0
          }}
        >
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 700 }}>{title}</h2>
          <button className="icon-btn-small" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
            paddingRight: '4px'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
