import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Shield, KeyRound, Settings, Lock, Eye, EyeOff, CheckCircle2,
  AlertCircle, X, ShieldCheck, ChevronRight, LogOut
} from 'lucide-react';
import { useToast } from './ToastContext';
import { useSettings } from './SettingsContext';

interface AdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLock: () => void;
}

export default function AdminSecurityModal({ isOpen, onClose, onLock }: AdminSecurityModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Admin password updated successfully! 🎉', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch (err: any) {
      setError('Error updating password: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const modalContent = (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      background: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      animation: 'modalBackdropIn 0.25s ease-out'
    }}>
      {/* Click outside to close */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      {/* Modal Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 480,
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid var(--border-light)',
        borderRadius: 24,
        padding: '1.75rem',
        boxShadow: 'var(--modal-shadow)',
        color: 'var(--text-main)',
        animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)',
              flexShrink: 0
            }}>
              A
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Administrator</span>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--success)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  fontWeight: 700
                }}>
                  Active Session
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {settings?.hostelName || 'Majin Hostel'} · Super Admin
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="icon-btn-small"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Navigation Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
          <button
            onClick={() => {
              navigate('/settings');
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'border-color 0.2s'
            }}
          >
            <Settings size={16} color="var(--primary)" />
            <span>Settings Panel</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onLock();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
          >
            <Lock size={16} />
            <span>Lock Portal</span>
          </button>
        </div>

        {/* Change Password Card Section */}
        <div style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--border-dim)',
          borderRadius: 18,
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <KeyRound size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Change Admin Password
            </h3>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              fontSize: '0.8rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Current Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password…"
                  className="custom-input"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  title={showCurrent ? "Hide password" : "Show password"}
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 2
                  }}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 4 chars)…"
                  className="custom-input"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  title={showNew ? "Hide password" : "Show password"}
                  aria-label={showNew ? "Hide password" : "Show password"}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 2
                  }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password…"
                  className="custom-input"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  title={showConfirm ? "Hide password" : "Show password"}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 2
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="primary-btn"
              style={{
                marginTop: '0.5rem',
                padding: '11px',
                borderRadius: 12,
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: updating ? 'not-allowed' : 'pointer',
                justifyContent: 'center'
              }}
            >
              {updating ? 'Updating password…' : (
                <>
                  <ShieldCheck size={16} />
                  <span>Update Admin Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
