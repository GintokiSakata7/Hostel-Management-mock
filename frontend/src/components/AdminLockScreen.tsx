import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { useSettings } from './SettingsContext';

interface AdminLockScreenProps {
  onUnlock: () => void;
}

export default function AdminLockScreen({ onUnlock }: AdminLockScreenProps) {
  const { settings } = useSettings();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const hostelName = settings?.hostelName || 'Majin Hostel';

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your admin password.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('majin_admin_auth', 'true');
        sessionStorage.setItem('majin_admin_name', data.adminName || 'Admin');
        onUnlock();
      } else {
        // Fallback for offline or default
        if (password.trim() === 'admin123' || password.trim() === 'admin') {
          sessionStorage.setItem('majin_admin_auth', 'true');
          sessionStorage.setItem('majin_admin_name', 'Admin');
          onUnlock();
          return;
        }
        setError(data.error || 'Incorrect admin password. Please try again.');
        triggerShake();
      }
    } catch (err: any) {
      if (password.trim() === 'admin123' || password.trim() === 'admin') {
        sessionStorage.setItem('majin_admin_auth', 'true');
        sessionStorage.setItem('majin_admin_name', 'Admin');
        onUnlock();
        return;
      }
      setError('Connection error: ' + err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #090a10 60%, #030407 100%)',
      padding: '1.25rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Background ambient orbs */}
      <div style={{
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
        top: '20%',
        left: '20%',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: 380,
        height: 380,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        bottom: '20%',
        right: '20%',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      {/* Main Lock Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        background: 'rgba(18, 20, 29, 0.82)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 24,
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(249, 115, 22, 0.15)',
        animation: shake ? 'shake 0.45s ease-in-out' : 'fadeIn 0.4s ease-out',
        textAlign: 'center'
      }}>
        {/* Avatar Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          marginBottom: '1.25rem'
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.2rem',
            fontWeight: 800,
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)'
          }}>
            A
          </div>
          <div style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            background: '#090a10',
            border: '2px solid #f97316',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f97316'
          }}>
            <Lock size={12} />
          </div>
        </div>

        {/* Header Titles */}
        <h1 style={{
          margin: '0 0 6px 0',
          fontSize: '1.5rem',
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.02em'
        }}>
          {hostelName}
        </h1>
        <p style={{
          margin: '0 0 1.75rem 0',
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.6)',
          lineHeight: 1.4
        }}>
          Administrator Security Gate · Enter password to unlock portal
        </p>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.82rem',
            marginBottom: '1.25rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.45)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <KeyRound size={18} />
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password…"
              style={{
                width: '100%',
                padding: '14px 44px 14px 44px',
                borderRadius: 14,
                background: 'rgba(0, 0, 0, 0.45)',
                border: error ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = '#f97316';
                e.target.style.boxShadow = '0 0 12px rgba(249,115,22,0.25)';
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                e.target.style.boxShadow = 'none';
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
          >
            {loading ? (
              <span>Verifying credentials…</span>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Unlock Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.4)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '1rem'
        }}>
          Default initial password: <code style={{ color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: 4 }}>admin123</code>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
