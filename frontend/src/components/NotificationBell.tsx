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

  // Click outside to close (desktop)
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
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(249,115,22,0.15))',
            border: '1px solid rgba(239,68,68,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ef4444', flexShrink: 0
          }}>
            <AlertTriangle size={18} />
          </div>
        );
      case 'student_due':
      case 'fee_overdue':
        return (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(234,179,8,0.15)',
            border: '1px solid rgba(234,179,8,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#eab308', flexShrink: 0
          }}>
            <IndianRupee size={17} />
          </div>
        );
      case 'complaint':
        return (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(168,85,247,0.15)',
            border: '1px solid rgba(168,85,247,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#c084fc', flexShrink: 0
          }}>
            <MessageSquare size={17} />
          </div>
        );
      case 'occupancy':
        return (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(6,182,212,0.15)',
            border: '1px solid rgba(6,182,212,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#22d3ee', flexShrink: 0
          }}>
            <BedDouble size={17} />
          </div>
        );
      case 'payment_received':
        return (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#22c55e', flexShrink: 0
          }}>
            <CheckCircle2 size={17} />
          </div>
        );
      default:
        return (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', flexShrink: 0
          }}>
            <Bell size={17} />
          </div>
        );
    }
  };

  const notificationContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: isMobile ? '82vh' : 560 }}>
      {/* Top Header */}
      <div style={{
        padding: '1rem 1.15rem 0.85rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(249,115,22,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)', border: '1px solid rgba(249,115,22,0.3)'
          }}>
            <Bell size={15} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              color: '#fff',
              boxShadow: '0 2px 6px rgba(239,68,68,0.4)'
            }}>
              {unreadCount} New
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {visibleNotifications.length > 0 && (
            <>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#fff'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Check size={12} /> Read All
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAll}
                title="Clear all notifications"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8,
                  color: '#ef4444',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Trash2 size={12} /> Clear All
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
        padding: '8px 12px',
        gap: '6px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        flexShrink: 0
      }}>
        {[
          { id: 'all', label: 'All', count: visibleNotifications.length },
          { id: 'dues', label: 'Dues & Fees', count: visibleNotifications.filter(n => n.category === 'dues').length },
          { id: 'complaints', label: 'Complaints', count: visibleNotifications.filter(n => n.category === 'complaints').length },
          { id: 'rooms', label: 'Rooms', count: visibleNotifications.filter(n => n.category === 'rooms').length }
        ].map(tab => {
          const isSelected = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                background: isSelected ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.02)',
                color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span style={{
                  fontSize: '0.62rem',
                  padding: '1px 5px',
                  borderRadius: 10,
                  background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                  color: isSelected ? '#000' : 'var(--text-muted)',
                  fontWeight: 800
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
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {loading && notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={22} className="spin" style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.8rem' }}>Loading notifications…</div>
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
              width: 52, height: 52, borderRadius: 16,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#22c55e', marginBottom: 4
            }}>
              <Sparkles size={24} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>All Caught Up!</div>
            <div style={{ fontSize: '0.74rem', maxWidth: 260, lineHeight: 1.5, color: 'var(--text-muted)' }}>
              {activeFilter !== 'all'
                ? `No active notifications in ${activeFilter}.`
                : 'No unread alerts. You are fully up to date on all fee dues, complaints, and room activities.'}
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
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
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
          filteredNotifications.map(item => {
            const isRead = readIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: isRead ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)',
                  border: isRead
                    ? '1px solid rgba(255,255,255,0.06)'
                    : item.priority === 'urgent'
                    ? '1px solid rgba(239,68,68,0.35)'
                    : '1px solid rgba(249,115,22,0.25)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseOut={e => e.currentTarget.style.background = isRead ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)'}
              >
                {/* Category Icon */}
                {renderIcon(item)}

                {/* Body Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: 2 }}>
                    <div style={{
                      fontWeight: isRead ? 700 : 800,
                      fontSize: '0.84rem',
                      color: isRead ? 'var(--text-main)' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.title}
                      {!isRead && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                      )}
                    </div>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    marginBottom: 6,
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
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        display: 'flex',
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
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: 4,
                        opacity: 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'opacity 0.15s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '1'}
                      onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
                    >
                      <X size={12} />
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
          padding: '8px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          flexShrink: 0
        }}>
          <span>{visibleNotifications.length} alerts active</span>
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
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            Fees Portal <ChevronRight size={11} />
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
          background: open ? 'rgba(249,115,22,0.2)' : undefined,
          color: open ? 'var(--primary)' : undefined,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <Bell size={18} />

        {/* Unread Glow & Count Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 17,
              height: 17,
              padding: '0 4px',
              borderRadius: 9,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              color: '#fff',
              fontSize: '0.62rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(239,68,68,0.7)',
              border: '1.5px solid #141821',
              animation: 'pulseBadge 2s infinite'
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
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
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
                background: '#13161f',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '24px 24px 0 0',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.8)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUpSheet 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Sheet Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
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
              width: 390,
              background: 'rgba(18, 22, 30, 0.96)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 20,
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              zIndex: 99999,
              overflow: 'hidden',
              animation: 'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
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
