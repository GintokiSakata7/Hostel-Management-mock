import { X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  alignTopOnMobile?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth, alignTopOnMobile }: ModalProps) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detect virtual keyboard on mobile via visualViewport resize
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setViewportHeight(vv.height);
      // When software keyboard opens, visualViewport height shrinks by > 120px
      const keyboardActive = window.innerHeight - vv.height > 120;
      setIsKeyboardOpen(keyboardActive);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
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

  const shouldAlignTop = isMobile && (alignTopOnMobile || isKeyboardOpen);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: shouldAlignTop ? 'flex-start' : (isMobile ? 'flex-end' : 'center'),
        justifyContent: 'center',
        zIndex: 2500,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: shouldAlignTop
          ? 'max(14px, env(safe-area-inset-top)) 12px max(14px, env(safe-area-inset-bottom))'
          : (isMobile ? 0 : '1rem'),
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        className={shouldAlignTop ? 'mobile-top-modal' : (isMobile ? 'bottom-sheet' : 'glass-panel')}
        style={
          shouldAlignTop
            ? {
                padding: '16px 16px 20px',
                width: '100%',
                maxWidth: maxWidth || '520px',
                maxHeight: isKeyboardOpen ? `${Math.max(260, viewportHeight - 24)}px` : '85dvh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
                background: 'var(--modal-bg, #141721)',
                boxShadow: 'var(--modal-shadow, 0 20px 60px rgba(0,0,0,0.6))',
              }
            : isMobile
            ? {
                padding: '18px 16px 24px',
                width: '100%',
                maxHeight: '88dvh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y'
              }
            : {
                width: '100%',
                maxWidth: maxWidth || '540px',
                maxHeight: 'calc(100dvh - 3rem)',
                padding: '1.75rem',
                position: 'relative',
                borderRadius: '24px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--modal-shadow, 0 24px 64px rgba(0,0,0,0.6))',
                background: 'var(--modal-bg, #141721)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y'
              }
        }
        onClick={e => e.stopPropagation()}
      >
        {isMobile && !shouldAlignTop && <div className="bottom-sheet-handle" />}
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
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            flex: 1,
            minHeight: 0,
            paddingRight: '4px'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
