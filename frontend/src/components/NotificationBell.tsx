import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, Trash2, X, AlertTriangle, IndianRupee,
  MessageSquare, BedDouble, CheckCircle2, ChevronRight,
  Sparkles, Clock, RefreshCw, Layers
} from 'lucide-react';
import { useBuilding } from './BuildingContext';

export interface NotificationItem {
  id: string;
  type: 'fee_due_today' | 'student_due' | 'fee_overdue' | 'complaint' | 'occupancy' | 'payment_received';
  category: 'dues' | 'complaints' | 'rooms' | 'activity';
  priority: 'urgent' | 'high' | 'medium' | 'info' | 'low';
  title: string;
  message: string;
  link?: string;
  count?: number;
  timestamp: string;
  actionText?: string;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { selectedBuildingId } = useBuilding();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'dues' | 'complaints' | 'rooms'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('majin_read_notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('majin_dismissed_notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 60, right: 16 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update dropdown position when opened
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right)
      });
    }
  }, [open]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const url = selectedBuildingId && selectedBuildingId !== 'all'
        ? `/api/notifications?buildingId=${selectedBuildingId}`
        : '/api/notifications';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.notifications) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBuildingId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // 45s periodic refresh
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside or Escape to close (desktop)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        open &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Filtered list (exclude dismissed)
  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));
  const filteredNotifications = visibleNotifications.filter(n => {
    if (activeFilter === 'all') return true;
    return n.category === activeFilter;
  });

  const unreadCount = visibleNotifications.filter(n => !readIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    const newRead = new Set([...readIds, ...visibleNotifications.map(n => n.id)]);
    setReadIds(newRead);
    try {
      localStorage.setItem('majin_read_notifs', JSON.stringify(Array.from(newRead)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = () => {
    const newDismissed = new Set([...dismissedIds, ...visibleNotifications.map(n => n.id)]);
    const newRead = new Set([...readIds, ...visibleNotifications.map(n => n.id)]);
    setDismissedIds(newDismissed);
    setReadIds(newRead);
    try {
      localStorage.setItem('majin_dismissed_notifs', JSON.stringify(Array.from(newDismissed)));
      localStorage.setItem('majin_read_notifs', JSON.stringify(Array.from(newRead)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismissOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem('majin_dismissed_notifs', JSON.stringify(Array.from(newDismissed)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    // Mark as read
    const newRead = new Set(readIds);
    newRead.add(n.id);
    setReadIds(newRead);
    try {
      localStorage.setItem('majin_read_notifs', JSON.stringify(Array.from(newRead)));
    } catch (e) {
      console.error(e);
    }

    setOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  const renderIcon = (n: NotificationItem) => {
    switch (n.type) {
      case 'fee_due_today':
        return (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--danger)', flexShrink: 0
          }}>
            <AlertTriangle size={15} />
          </div>
        );
      case 'student_due':
      case 'fee_overdue':
        return (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(234,179,8,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--warning)', flexShrink: 0
          }}>
            <IndianRupee size={15} />
          </div>
        );
      case 'complaint':
        return (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(168,85,247,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#a855f7', flexShrink: 0
          }}>
            <MessageSquare size={15} />
          </div>
        );
      case 'occupancy':
        return (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(14,165,233,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0ea5e9', flexShrink: 0
          }}>
            <BedDouble size={15} />
          </div>
        );
      case 'payment_received':
        return (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--success)', flexShrink: 0
          }}>
            <CheckCircle2 size={15} />
          </div>
        );
      default:
        return (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'var(--surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', flexShrink: 0
          }}>
            <Bell size={15} />
          </div>
        );
    }
  };

  const notificationContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: isMobile ? '82vh' : 540 }}>
      {/* Top Header (Single-Row, Never Wraps) */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 999,
              background: 'rgba(249,115,22,0.14)',
              color: 'var(--primary)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {unreadCount} new
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={fetchNotifications}
            title="Refresh alerts"
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-dim)',
              borderRadius: 8,
              color: 'var(--text-muted)',
              width: 28,
              height: 28,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
          </button>

          {visibleNotifications.length > 0 && (
            <>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 8,
                    color: 'var(--text-main)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    height: 28,
                    padding: '0 9px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Check size={12} /> Read all
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAll}
                title="Clear all notifications"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 8,
                  color: 'var(--danger)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  height: 28,
                  padding: '0 9px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Trash2 size={12} /> Clear
              </button>
            </>
          )}

          {isMobile && (
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Ribbon */}
      <div style={{
        display: 'flex',
        padding: '8px 14px',
        gap: '6px',
        borderBottom: '1px solid var(--border-dim)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        flexShrink: 0
      }}>
        {[
          { id: 'all', label: 'All', count: visibleNotifications.length },
          { id: 'dues', label: 'Dues', count: visibleNotifications.filter(n => n.category === 'dues').length },
          { id: 'complaints', label: 'Complaints', count: visibleNotifications.filter(n => n.category === 'complaints').length },
          { id: 'rooms', label: 'Rooms', count: visibleNotifications.filter(n => n.category === 'rooms').length }
        ].map(tab => {
          const isSelected = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: isSelected ? 'rgba(249,115,22,0.35)' : 'transparent',
                background: isSelected ? 'rgba(249,115,22,0.12)' : 'transparent',
                color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.74rem',
                fontWeight: isSelected ? 700 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0 5px',
                  borderRadius: 999,
                  background: isSelected ? 'var(--primary)' : 'var(--surface-3)',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700,
                  lineHeight: 1.4
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications Scroll List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {loading && notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={22} className="spin-icon" style={{ opacity: 0.6, marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.82rem' }}>Loading notifications…</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(34,197,94,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--success)', marginBottom: 4
            }}>
              <Sparkles size={22} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-main)' }}>All Caught Up!</div>
            <div style={{ fontSize: '0.76rem', maxWidth: 260, lineHeight: 1.5, color: 'var(--text-muted)' }}>
              {activeFilter !== 'all'
                ? `No active notifications in ${activeFilter}.`
                : 'No unread alerts. You are up to date on dues, complaints, and rooms.'}
            </div>
            {dismissedIds.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDismissedIds(new Set());
                  localStorage.removeItem('majin_dismissed_notifs');
                }}
                style={{
                  marginTop: 8,
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 8,
                  color: 'var(--primary)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '5px 12px',
                  cursor: 'pointer'
                }}
              >
                Restore Cleared Notifications
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((item, idx) => {
            const isRead = readIds.has(item.id);
            const isLast = idx === filteredNotifications.length - 1;
            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  background: isRead ? 'transparent' : 'rgba(249,115,22,0.035)',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-dim)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseOut={e => e.currentTarget.style.background = isRead ? 'transparent' : 'rgba(249,115,22,0.035)'}
              >
                {/* Category Icon */}
                {renderIcon(item)}

                {/* Body Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: 2 }}>
                    <div style={{
                      fontWeight: isRead ? 600 : 700,
                      fontSize: '0.84rem',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      minWidth: 0
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                      {!isRead && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                      )}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.76rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.42,
                    marginBottom: item.actionText ? 6 : 0,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {item.message}
                  </div>

                  {/* Action Link & Dismiss */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {item.actionText ? (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        {item.actionText} <ChevronRight size={11} />
                      </span>
                    ) : <span />}

                    <button
                      type="button"
                      onClick={(e) => handleDismissOne(item.id, e)}
                      title="Dismiss notification"
                      aria-label="Dismiss notification"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: 4,
                        opacity: 0.55,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'opacity 0.15s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '1'}
                      onMouseOut={e => e.currentTarget.style.opacity = '0.55'}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Quick Action */}
      {visibleNotifications.length > 0 && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-dim)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-1)',
          fontSize: '0.73rem',
          color: 'var(--text-muted)',
          flexShrink: 0
        }}>
          <span>{visibleNotifications.length} alert{visibleNotifications.length !== 1 ? 's' : ''}</span>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/fees');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.73rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            Open Fees Portal <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-label="Notifications"
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative',
          background: open ? 'rgba(249,115,22,0.14)' : undefined,
          borderColor: open ? 'rgba(249,115,22,0.35)' : undefined,
          color: open ? 'var(--primary)' : undefined,
          transition: 'all 0.18s ease'
        }}
      >
        <Bell size={18} />

        {/* Crisp Unread Count Pill */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 700,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--modal-bg)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Portal Container for Desktop Flyout or Mobile Bottom Sheet */}
      {open && typeof document !== 'undefined' && createPortal(
        isMobile ? (
          /* Mobile Slide-Up Bottom Sheet with blur backdrop */
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
            onClick={() => setOpen(false)}
          >
            <div
              style={{
                width: '100%',
                maxHeight: '85vh',
                background: 'var(--modal-bg)',
                borderTop: '1px solid var(--border-light)',
                borderRadius: '24px 24px 0 0',
                boxShadow: 'var(--modal-shadow)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUpSheet 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Sheet Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-light)' }} />
              </div>

              {notificationContent}
            </div>
          </div>
        ) : (
          /* Desktop Dropdown Flyout via Portal */
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              right: dropdownPos.right,
              width: 416,
              maxWidth: 'calc(100vw - 24px)',
              background: 'var(--modal-bg)',
              border: '1px solid var(--border-light)',
              borderRadius: 16,
              boxShadow: 'var(--modal-shadow)',
              zIndex: 99999,
              overflow: 'hidden',
              animation: 'slideDownFade 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {notificationContent}
          </div>
        ),
        document.body
      )}
    </div>
  );
}
