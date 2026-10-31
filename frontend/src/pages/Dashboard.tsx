import {
  Users, BedDouble, AlertCircle, IndianRupee, Activity, CheckCircle2,
  Home, TrendingUp, ArrowUpRight, Calendar, ShieldCheck, ChevronRight,
  Zap, Building2, AlertTriangle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuilding } from '../components/BuildingContext';

const Gauge = ({ value, max, color, size = 96 }: { value: number; max: number; color: string; size?: number }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const strokeWidth = size < 90 ? 7 : 9;
  const r = (size / 2) - strokeWidth;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size < 90 ? '0.95rem' : '1.1rem', color }}>
        {pct}%
      </div>
    </div>
  );
};

const MiniStatRow = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</span>
    <span style={{ fontWeight: 700, color, fontSize: '0.88rem' }}>{value}</span>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedBuildingId, activeBuildingName } = useBuilding();
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState<'all' | 'occupancy' | 'finance' | 'activity'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'fee' | 'complaint'>('all');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [statsRes, actsRes] = await Promise.all([
          fetch(`/api/stats?buildingId=${selectedBuildingId}`),
          fetch(`/api/activities?buildingId=${selectedBuildingId}`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (actsRes.ok) setActivities(await actsRes.json());
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedBuildingId]);

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 300, flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: 44, height: 44, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>Loading Dashboard Overview…</div>
      </div>
    );
  }

  const totalBeds = stats.occupiedBeds + stats.availableBeds;
  const occupancyPct = totalBeds > 0 ? Math.round((stats.occupiedBeds / totalBeds) * 100) : 0;
  const feePaidCount = stats.totalStudents - stats.pendingFees;
  const feeRecoveryPct = stats.totalStudents > 0 ? Math.round((feePaidCount / stats.totalStudents) * 100) : 0;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  const filteredActivities = activities.filter(a => {
    if (activityFilter === 'all') return true;
    return a.type === activityFilter;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1.15rem' : '1.5rem' }}>
      
      {/* ─── 1. Header Greeting & Context ──────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>
              {greeting}, Admin
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 20,
              background: 'rgba(249,115,22,0.14)',
              color: 'var(--primary)',
              border: '1px solid rgba(249,115,22,0.3)'
            }}>
              <Zap size={11} /> Live
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={13} style={{ opacity: 0.7 }} />
              {new Date().toLocaleDateString('en-IN', { weekday: isMobile ? 'short' : 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-main)', fontWeight: 600 }}>
              <Building2 size={13} color="var(--primary)" />
              {activeBuildingName}
            </span>
          </p>
        </div>

        {/* Quick building switcher badge or status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-dim)',
          padding: '6px 12px',
          borderRadius: 12,
          fontSize: '0.78rem'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Occupancy Rate:</span>
          <strong style={{ color: 'var(--primary)' }}>{occupancyPct}%</strong>
        </div>
      </div>

      {/* ─── 2. Mobile Quick Action Hub (1-Tap Shortcuts) ──────────── */}
      {isMobile && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            Quick Actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {[
              { label: 'Rooms', sub: 'Beds & Floors', path: '/rooms', icon: BedDouble, color: 'var(--primary)', bg: 'rgba(249,115,22,0.12)' },
              { label: 'Fees', sub: 'Collect Dues', path: '/fees', icon: IndianRupee, color: 'var(--success)', bg: 'rgba(34,197,94,0.12)' },
              { label: 'Students', sub: 'Roster', path: '/students', icon: Users, color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
              { label: 'Complaints', sub: 'Support', path: '/complaints', icon: AlertCircle, color: stats.activeComplaints > 0 ? 'var(--danger)' : 'var(--text-muted)', bg: stats.activeComplaints > 0 ? 'rgba(239,68,68,0.14)' : 'rgba(255,255,255,0.04)' },
            ].map(({ label, path, icon: Icon, color, bg }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 12,
                  padding: '10px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: 64
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                  <Icon size={16} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.1 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── 3. Operational Attention & Alerts Banner ──────────────── */}
      {(stats.activeComplaints > 0 || stats.pendingFees > 0) ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(249,115,22,0.08))',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 14,
          padding: isMobile ? '12px 14px' : '14px 18px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: stats.activeComplaints > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {stats.activeComplaints > 0 ? <AlertTriangle size={18} color="var(--danger)" /> : <IndianRupee size={18} color="var(--warning)" />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                Operational Attention Required
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {stats.activeComplaints > 0 && `${stats.activeComplaints} active maintenance complaint${stats.activeComplaints > 1 ? 's' : ''}`}
                {stats.activeComplaints > 0 && stats.pendingFees > 0 && ' · '}
                {stats.pendingFees > 0 && `${stats.pendingFees} resident${stats.pendingFees > 1 ? 's' : ''} have unpaid fees this month`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {stats.pendingFees > 0 && (
              <button
                onClick={() => navigate('/fees')}
                className="primary-btn"
                style={{ fontSize: '0.75rem', padding: '6px 12px', minHeight: 32, flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                Collect Fees <ChevronRight size={13} />
              </button>
            )}
            {stats.activeComplaints > 0 && (
              <button
                onClick={() => navigate('/complaints')}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--danger)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: 32,
                  flex: isMobile ? 1 : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4
                }}>
                Complaints <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <ShieldCheck size={18} color="var(--success)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--success)' }}>Optimal Status:</strong> Zero unresolved complaints and full fee compliance across all residents.
          </div>
        </div>
      )}

      {/* ─── 4. Top Stat Cards (2x2 Grid on Mobile, Clickable) ──────── */}
      <div className="responsive-grid-4">
        {[
          {
            title: 'Total Students',
            value: stats.totalStudents,
            icon: Users,
            color: '99,102,241',
            sub: 'Active residents',
            link: '/students',
            badge: `${stats.totalStudents} Active`
          },
          {
            title: 'Occupied Beds',
            value: `${stats.occupiedBeds}/${totalBeds}`,
            icon: BedDouble,
            color: '16,185,129',
            sub: `${stats.availableBeds} vacant beds`,
            link: '/rooms',
            badge: `${occupancyPct}% full`
          },
          {
            title: 'Monthly Collection',
            value: `₹${Number(stats.monthlyCollection).toLocaleString('en-IN')}`,
            icon: IndianRupee,
            color: '249,115,22',
            sub: `${feePaidCount} paid · ${stats.pendingFees} pending`,
            link: '/fees',
            badge: `${feeRecoveryPct}% collected`
          },
          {
            title: 'Active Complaints',
            value: stats.activeComplaints,
            icon: AlertCircle,
            color: stats.activeComplaints > 0 ? '239,68,68' : '34,197,94',
            sub: stats.activeComplaints === 0 ? 'All resolved' : 'Requires attention',
            link: '/complaints',
            badge: stats.activeComplaints === 0 ? 'All Clear' : 'Attention'
          },
        ].map(({ title, value, icon: Icon, color, sub, link, badge }) => (
          <div
            key={title}
            onClick={() => navigate(link)}
            className="glass-panel"
            style={{
              padding: isMobile ? '12px 14px' : '1.25rem',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = `rgba(${color},0.5)`}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-dim)'}
          >
            {/* Background Decorative Icon */}
            <div style={{ position: 'absolute', top: -12, right: -12, opacity: 0.05, pointerEvents: 'none' }}>
              <Icon size={isMobile ? 80 : 110} color={`rgb(${color})`} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.5rem' : '0.875rem' }}>
                <div style={{
                  background: `rgba(${color},0.12)`,
                  width: isMobile ? 32 : 40,
                  height: isMobile ? 32 : 40,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: `rgb(${color})`
                }}>
                  <Icon size={isMobile ? 16 : 19} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600 }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: `rgba(${color},0.1)`,
                    color: `rgb(${color})`,
                    fontSize: '0.65rem'
                  }}>
                    {badge}
                  </span>
                  <ArrowUpRight size={13} style={{ opacity: 0.5 }} />
                </div>
              </div>

              <div style={{
                fontSize: isMobile ? '1.45rem' : '1.85rem',
                fontWeight: 800,
                color: `rgb(${color})`,
                lineHeight: 1.1,
                letterSpacing: -0.5
              }}>
                {value}
              </div>
            </div>

            <div style={{ marginTop: '0.4rem' }}>
              <div style={{ fontWeight: 700, fontSize: isMobile ? '0.78rem' : '0.85rem', color: '#fff' }}>{title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 5. Mobile Tab Switcher for Deep Dive Insights ──────────── */}
      {isMobile && (
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 10,
          padding: 3,
          border: '1px solid var(--border-dim)'
        }}>
          {[
            { id: 'all', label: 'All Insights' },
            { id: 'occupancy', label: '🛏️ Occupancy' },
            { id: 'finance', label: '💳 Fees' },
            { id: 'activity', label: '⚡ Activity' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 8,
                border: 'none',
                background: mobileTab === tab.id ? 'var(--primary)' : 'transparent',
                color: mobileTab === tab.id ? '#fff' : 'var(--text-muted)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── 6. Insights & Analytics Grid ───────────────────────────── */}
      <div className="responsive-grid-3">

        {/* Room Occupancy Card */}
        {(!isMobile || mobileTab === 'all' || mobileTab === 'occupancy') && (
          <div className="glass-panel" style={{ padding: isMobile ? '1.15rem' : '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem' }}>
                  <Home size={16} color="var(--primary)" /> Room Occupancy
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                  {stats.availableBeds} Vacant
                </span>
              </div>

              {/* Linear Visual Progress Bar */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>{stats.occupiedBeds} Occupied</span>
                  <span>{occupancyPct}% Capacity</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${occupancyPct}%`, background: 'var(--primary)', borderRadius: 10, transition: 'width 0.5s ease' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.25rem' }}>
                <Gauge value={stats.occupiedBeds} max={totalBeds} color="var(--primary)" size={isMobile ? 78 : 92} />
                <div style={{ flex: 1 }}>
                  <MiniStatRow label="Total Capacity" value={`${totalBeds} Beds`} color="var(--text-main)" />
                  <MiniStatRow label="Occupied" value={stats.occupiedBeds} color="var(--primary)" />
                  <MiniStatRow label="Available" value={stats.availableBeds} color="var(--success)" />
                  <MiniStatRow label="Total Rooms" value={stats.totalRooms || '—'} color="var(--text-muted)" />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => navigate('/rooms')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: 0
                }}>
                Explore Virtual Workspace <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Fee Collection Card */}
        {(!isMobile || mobileTab === 'all' || mobileTab === 'finance') && (
          <div className="glass-panel" style={{ padding: isMobile ? '1.15rem' : '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem' }}>
                  <TrendingUp size={16} color="var(--success)" /> Fee Recovery
                </h3>
                <span style={{ fontSize: '0.72rem', color: stats.pendingFees > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>
                  {stats.pendingFees > 0 ? `${stats.pendingFees} Dues` : '100% Paid'}
                </span>
              </div>

              {/* Linear Visual Progress Bar */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>{feePaidCount} Paid</span>
                  <span>{feeRecoveryPct}% Collected</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${feeRecoveryPct}%`, background: 'var(--success)', borderRadius: 10, transition: 'width 0.5s ease' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.25rem' }}>
                <Gauge value={feePaidCount} max={stats.totalStudents} color="var(--success)" size={isMobile ? 78 : 92} />
                <div style={{ flex: 1 }}>
                  <MiniStatRow label="Total Students" value={stats.totalStudents} color="var(--text-main)" />
                  <MiniStatRow label="Paid" value={feePaidCount} color="var(--success)" />
                  <MiniStatRow label="Pending" value={stats.pendingFees} color="var(--warning)" />
                  <MiniStatRow label="Collected" value={`₹${Number(stats.monthlyCollection).toLocaleString('en-IN')}`} color="var(--primary)" />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => navigate('/fees')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--success)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: 0
                }}>
                Open Fee Management <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity Card */}
        {(!isMobile || mobileTab === 'all' || mobileTab === 'activity') && (
          <div className="glass-panel" style={{ padding: isMobile ? '1.15rem' : '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem' }}>
                  <Activity size={16} color="var(--accent)" /> Live Activity
                </h3>
                {/* Filter chips */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['all', 'fee', 'complaint'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setActivityFilter(f)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: activityFilter === f ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.04)',
                        color: activityFilter === f ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {f === 'all' ? 'All' : f === 'fee' ? 'Fees' : 'Complaints'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {filteredActivities.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0' }}>
                    No recent activity records found.
                  </div>
                ) : (
                  filteredActivities.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => navigate(act.type === 'complaint' ? '/complaints' : '/fees')}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '6px 8px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    >
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: act.type === 'complaint' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {act.type === 'complaint' ? (
                          <AlertCircle size={14} color="var(--danger)" />
                        ) : (
                          <CheckCircle2 size={14} color="var(--success)" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {act.action}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {act.details}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                        {act.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => navigate('/finance')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: 0
                }}>
                View Financial Ledger <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
