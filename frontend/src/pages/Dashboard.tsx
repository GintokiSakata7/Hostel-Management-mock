import { Users, BedDouble, AlertCircle, FileText, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: string }) => (
  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, transform: 'scale(2)' }}>
      <Icon size={100} color={`rgb(${color})`} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ background: `rgba(${color}, 0.1)`, padding: '12px', borderRadius: '12px', color: `rgb(${color})` }}>
        <Icon size={24} />
      </div>
      {trend && <span style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600 }}>{trend}</span>}
    </div>
    <div>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{value}</h3>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{title}</p>
    </div>
  </div>
);

const chartData = [
  { name: 'Jan', students: 120 }, { name: 'Feb', students: 132 },
  { name: 'Mar', students: 145 }, { name: 'Apr', students: 160 },
  { name: 'May', students: 180 }, { name: 'Jun', students: 195 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const statsRes = await fetch('http://localhost:3001/api/stats');
        const actsRes = await fetch('http://localhost:3001/api/activities');
        if (statsRes.ok && actsRes.ok) {
          setStats(await statsRes.json());
          setActivities(await actsRes.json());
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading || !stats) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading Dashboard...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ margin: '0 0 8px 0' }}>Overview</h1>
        <p className="text-muted" style={{ margin: 0 }}>Welcome back, Admin. Here is what's happening today.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard title="Total Students" value={stats.totalStudents} icon={Users} color="99, 102, 241" trend="+12 this month" />
        <StatCard title="Occupied Beds" value={`${stats.occupiedBeds}/${stats.totalRooms * 4}`} icon={BedDouble} color="16, 185, 129" />
        <StatCard title="Active Complaints" value={stats.activeComplaints} icon={AlertCircle} color="239, 68, 68" />
        <StatCard title="Pending Fees" value={`$${stats.pendingFees.toLocaleString()}`} icon={FileText} color="245, 158, 11" trend="-5% from last week" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>Occupancy Trends</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(15, 17, 26, 0.9)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Area type="monotone" dataKey="students" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--primary)" />
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {activities.map((act) => (
              <div key={act.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: act.type === 'complaint' ? 'var(--danger)' : act.type === 'fee' ? 'var(--success)' : 'var(--primary)', marginTop: '6px', boxShadow: `0 0 10px var(--${act.type === 'complaint' ? 'danger' : act.type === 'fee' ? 'success' : 'primary'})` }}></div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>{act.action}</h4>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>{act.details}</p>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', display: 'block', marginTop: '4px' }}>{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
