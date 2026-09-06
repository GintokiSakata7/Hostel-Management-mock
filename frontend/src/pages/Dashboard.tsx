import { Users, BedDouble, AlertCircle, IndianRupee, Activity, CheckCircle2, Home, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const Gauge = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const r = 36, circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 48 48)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color }}>{pct}%</div>
    </div>
  );
};

const MiniStatRow = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{label}</span>
    <span style={{ fontWeight: 700, color, fontSize: '0.95rem' }}>{value}</span>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, actsRes] = await Promise.all([
          fetch('http://localhost:3001/api/stats'),
          fetch('http://localhost:3001/api/activities'),
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
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: 'var(--text-muted)' }}>Loading Dashboard…</div>
      </div>
    );
  }

  const totalBeds = stats.occupiedBeds + stats.availableBeds;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title" style={{ margin: '0 0 6px 0' }}>Overview</h1>
        <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
          Welcome back, Admin · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Top stat cards */}
      <div className="responsive-grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { title: 'Total Students', value: stats.totalStudents, icon: Users, color: '99,102,241', sub: 'Active residents' },
          { title: 'Occupied Beds', value: `${stats.occupiedBeds}/${totalBeds}`, icon: BedDouble, color: '16,185,129', sub: `${stats.availableBeds} available` },
          { title: 'Active Complaints', value: stats.activeComplaints, icon: AlertCircle, color: '239,68,68', sub: stats.activeComplaints === 0 ? 'All clear!' : 'Needs attention' },
          { title: 'Monthly Collection', value: `₹${Number(stats.monthlyCollection).toLocaleString()}`, icon: IndianRupee, color: '249,115,22', sub: 'This month' },
        ].map(({ title, value, icon: Icon, color, sub }) => (
          <div key={title} className="glass-panel" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.07 }}>
              <Icon size={110} color={`rgb(${color})`} />
            </div>
            <div style={{ background: `rgba(${color},0.12)`, width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem', color: `rgb(${color})` }}>
              <Icon size={20} />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: `rgb(${color})`, lineHeight: 1 }}>{value}</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: 4 }}>{title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="responsive-grid-3">

        {/* Room Occupancy */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <Home size={17} color="var(--primary)" /> Room Occupancy
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Gauge value={stats.occupiedBeds} max={totalBeds} color="var(--primary)" />
            <div style={{ flex: 1 }}>
              <MiniStatRow label="Total Beds" value={totalBeds} color="var(--text-main)" />
              <MiniStatRow label="Occupied" value={stats.occupiedBeds} color="var(--primary)" />
              <MiniStatRow label="Available" value={stats.availableBeds} color="var(--success)" />
            </div>
          </div>
        </div>

        {/* Fee Collection */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <TrendingUp size={17} color="var(--success)" /> Fee Collection
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Gauge value={stats.totalStudents - stats.pendingFees} max={stats.totalStudents} color="var(--success)" />
            <div style={{ flex: 1 }}>
              <MiniStatRow label="Total Students" value={stats.totalStudents} color="var(--text-main)" />
              <MiniStatRow label="Paid" value={stats.totalStudents - stats.pendingFees} color="var(--success)" />
              <MiniStatRow label="Pending" value={stats.pendingFees} color="var(--warning)" />
              <MiniStatRow label="Collected" value={`₹${Number(stats.monthlyCollection).toLocaleString()}`} color="var(--primary)" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <Activity size={17} color="var(--accent)" /> Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activities.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>No recent activity.</div>
            ) : activities.map((act) => (
              <div key={act.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: act.type === 'complaint' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {act.type === 'complaint'
                    ? <AlertCircle size={15} color="var(--danger)" />
                    : <CheckCircle2 size={15} color="var(--success)" />
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{act.action}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{act.details}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: 3 }}>{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
