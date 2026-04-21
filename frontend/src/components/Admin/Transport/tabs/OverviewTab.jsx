'use client';

import {
  BusFront,
  Route,
  Users,
  CreditCard,
  MessageSquareWarning,
  MapPin,
  TrendingUp,
  Clock,
} from 'lucide-react';

import StatCard from '../StatCard';
import StatusBadge from '../StatusBadge';
import styles from '../transport.module.css';

export default function OverviewTab({ buses, routes, students, fees, complaints, locations, onTab }) {
  const activeBuses = buses.filter((b) => b.is_active && b.status === 'active').length;
  const activeRoutes = routes.filter((r) => r.is_active).length;
  const totalStudents = students.length;
  const pendingFees = fees.filter((f) => ['pending', 'partial', 'overdue'].includes(f.status)).length;
  const openComplaints = complaints.filter((c) => ['open', 'in_progress'].includes(c.status)).length;
  const totalCollected = fees.reduce((s, f) => s + Number(f.amount_paid || 0), 0);
  const totalDue = fees.reduce((s, f) => s + Number(f.amount_due || 0), 0);

  return (
    <section className={styles.section} style={{ gap: 'var(--space-6)' }}>
      <div className={styles.statsGrid}>
        <StatCard icon={BusFront} label="Active Fleet" value={activeBuses} help={`${buses.length} total buses`} accent="#1e293b" />
        <StatCard icon={Route} label="Active Routes" value={activeRoutes} help="Pickup & drop circuits" accent="#8b5cf6" />
        <StatCard icon={Users} label="Students Enrolled" value={totalStudents} help="Currently allocated" accent="#10b981" />
        <StatCard icon={CreditCard} label="Pending Fees" value={pendingFees} help={`₹${totalCollected.toLocaleString()} collected`} accent="#f59e0b" />
      </div>

      <div className={styles.dual}>
        {/* Fee Summary */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 10, color: '#10b981' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Fee Collection Summary</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', margin: 0 }}>Financial overview for current session</p>
              </div>
            </div>
            <button className={styles.ghostBtn} onClick={() => onTab('fees')} style={{ padding: '8px 12px', background: '#f8fafc', color: 'var(--t-accent)', fontWeight: 600 }}>View All</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0' }}>
              <p style={{ color: '#166534', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>Collected</p>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#166534', margin: 0 }}>₹{totalCollected.toLocaleString()}</p>
            </div>
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '1px solid #fecaca' }}>
              <p style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>Outstanding</p>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#991b1b', margin: 0 }}>₹{(totalDue - totalCollected).toLocaleString()}</p>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--t-muted)', marginBottom: 4 }}>
              <span>Collection Rate</span>
              <span>{totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0}%</span>
            </div>
            <div className={styles.capacityBar}>
              <div
                className={styles.capacityFill}
                style={{
                  width: `${totalDue > 0 ? Math.min((totalCollected / totalDue) * 100, 100) : 0}%`,
                  background: totalCollected / totalDue > 0.7 ? '#22c55e' : '#f59e0b',
                }}
              />
            </div>
          </div>
        </div>

        {/* Open Complaints */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ background: '#fff7ed', padding: 8, borderRadius: 10, color: '#f59e0b' }}>
                <MessageSquareWarning size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Open Complaints ({openComplaints})</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', margin: 0 }}>Recent issues requiring attention</p>
              </div>
            </div>
            <button className={styles.ghostBtn} onClick={() => onTab('complaints')} style={{ padding: '8px 12px', background: '#f8fafc', color: 'var(--t-accent)', fontWeight: 600 }}>View All</button>
          </div>
          <div className={styles.simpleList}>
            {complaints
              .filter((c) => ['open', 'in_progress'].includes(c.status))
              .slice(0, 5)
              .map((row) => (
                <div key={row.id} className={styles.simpleRow}>
                  <div>
                    <strong>{row.subject}</strong>
                    <p>{row.student_name || row.raised_by_name || 'User'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StatusBadge value={row.priority} />
                    <StatusBadge value={row.status} />
                  </div>
                </div>
              ))}
            {openComplaints === 0 && (
              <p className={styles.empty}>No open complaints — great!</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.dual}>
        {/* Recent Locations */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 10, color: '#1e293b' }}>
                <MapPin size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Latest Location Events</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', margin: 0 }}>Real-time fleet activity tracking</p>
              </div>
            </div>
            <button className={styles.ghostBtn} onClick={() => onTab('tracking')} style={{ padding: '8px 12px', background: '#f8fafc', color: 'var(--t-accent)', fontWeight: 600 }}>Track Buses</button>
          </div>
          <div className={styles.simpleList}>
            {locations.slice(0, 5).map((row) => (
              <div key={row.id} className={styles.simpleRow}>
                <div>
                  <strong>{row.bus_name || row.bus_number || 'Bus'}</strong>
                  <p>{row.route_name || 'No route linked'}</p>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
                  <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {row.recorded_at ? new Date(row.recorded_at).toLocaleString() : '-'}
                </span>
              </div>
            ))}
            {!locations.length && <p className={styles.empty}>No location events yet.</p>}
          </div>
        </div>

        {/* Route Occupancy */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ background: '#f5f3ff', padding: 8, borderRadius: 10, color: '#8b5cf6' }}>
                <Route size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Route Occupancy</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', margin: 0 }}>Passenger distribution across routes</p>
              </div>
            </div>
            <button className={styles.ghostBtn} onClick={() => onTab('routes')} style={{ padding: '8px 12px', background: '#f8fafc', color: 'var(--t-accent)', fontWeight: 600 }}>Manage</button>
          </div>
          <div className={styles.simpleList}>
            {routes.slice(0, 5).map((route) => {
              const enrolled = students.filter((s) => s.route_name === route.name).length;
              const cap = route.bus?.capacity || route.vehicle_capacity || 40;
              const pct = cap > 0 ? Math.round((enrolled / cap) * 100) : 0;
              return (
                <div key={route.id} className={styles.simpleRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{route.name}</strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
                      {enrolled}/{cap} seats ({pct}%)
                    </span>
                  </div>
                  <div className={styles.capacityBar}>
                    <div
                      className={styles.capacityFill}
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {!routes.length && <p className={styles.empty}>No routes configured.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
