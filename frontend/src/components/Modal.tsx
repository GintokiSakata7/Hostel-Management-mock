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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: 2500,
      animation: 'fadeIn 0.2s ease'
    }} onClick={onClose}>
      <div className={isMobile ? 'bottom-sheet' : 'glass-panel'} style={isMobile ? { padding: '24px', width: '100%' } : {
        width: '100%',
        maxWidth: '500px',
        padding: '2rem',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        background: 'rgba(30, 33, 48, 0.85)'
      }} onClick={e => e.stopPropagation()}>
        {isMobile && <div className="bottom-sheet-handle" />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          <button className="icon-btn-small" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
