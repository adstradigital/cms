'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

import transportApi from '@/api/transportApi';
import StatCard from '../StatCard';
import styles from '../transport.module.css';

const COLORS = ['#0b6bcb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const FEE_STATUS_COLORS = { paid: '#22c55e', partial: '#f59e0b', pending: '#94a3b8', overdue: '#ef4444', waived: '#8b5cf6' };
const COMPLAINT_STATUS_COLORS = { open: '#ef4444', in_progress: '#f59e0b', resolved: '#22c55e', closed: '#94a3b8' };

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    transportApi.getAnalytics()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading analytics...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return null;

  const occupancyData = (data.occupancy || []).map((r) => ({
    name: r.route,
    enrolled: r.enrolled,
    capacity: r.capacity,
    available: r.capacity - r.enrolled,
  }));

  const feeStatusData = Object.entries(data.fees?.by_status || {}).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: val,
    color: FEE_STATUS_COLORS[key] || '#94a3b8',
  }));

  const complaintStatusData = Object.entries(data.complaints?.by_status || {}).map(([key, val]) => ({
    name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: val,
    color: COMPLAINT_STATUS_COLORS[key] || '#94a3b8',
  }));

  const complaintPriorityData = Object.entries(data.complaints?.by_priority || {}).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: val,
  }));

  return (
    <section className={styles.section}>
      {/* Top Stats */}
      <div className={styles.statsGrid}>
        <StatCard icon={BarChart3} label="Fleet Size" value={data.fleet?.total || 0} help={`${data.fleet?.active || 0} active`} accent="#0b6bcb" />
        <StatCard icon={TrendingUp} label="Collection Rate" value={`${data.fees?.collection_rate || 0}%`} help={`₹${(data.fees?.total_collected || 0).toLocaleString()} collected`} accent="#22c55e" />
        <StatCard icon={AlertTriangle} label="Total Complaints" value={data.complaints?.total || 0} accent="#f59e0b" />
        <StatCard label="Students Enrolled" value={data.students?.total || 0} help={`${data.routes?.total || 0} active routes`} accent="#8b5cf6" />
      </div>

      {/* Charts Row 1 */}
      <div className={styles.dual}>
        {/* Route Occupancy Chart */}
        <div className={styles.panel}>
          <h3>
            <BarChart3 size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Route Occupancy
          </h3>
          {occupancyData.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: '#64748b' }} />
                  <YAxis fontSize={11} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="enrolled" name="Enrolled" fill="#0b6bcb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="available" name="Available" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={styles.empty}>No route data available.</p>
          )}
        </div>

        {/* Fee Status Pie */}
        <div className={styles.panel}>
          <h3>
            <TrendingUp size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Fee Collection Breakdown
          </h3>
          {feeStatusData.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {feeStatusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={styles.empty}>No fee data available.</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            <div style={{ textAlign: 'center', padding: 'var(--space-2)', background: '#f0fdf4', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: '#166534', fontWeight: 600 }}>Total Collected</p>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>₹{(data.fees?.total_collected || 0).toLocaleString()}</p>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--space-2)', background: '#fef2f2', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: '#991b1b', fontWeight: 600 }}>Outstanding</p>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>₹{(data.fees?.outstanding || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className={styles.dual}>
        {/* Complaint Status */}
        <div className={styles.panel}>
          <h3>
            <AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Complaint Status Distribution
          </h3>
          {complaintStatusData.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complaintStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {complaintStatusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={styles.empty}>No complaint data available.</p>
          )}
        </div>

        {/* Complaint Priority Bar */}
        <div className={styles.panel}>
          <h3>Complaints by Priority</h3>
          {complaintPriorityData.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintPriorityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" fontSize={11} tick={{ fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#64748b' }} width={70} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="value" name="Count" fill="#0b6bcb" radius={[0, 4, 4, 0]}>
                    {complaintPriorityData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={styles.empty}>No complaint data available.</p>
          )}
        </div>
      </div>
    </section>
  );
}
