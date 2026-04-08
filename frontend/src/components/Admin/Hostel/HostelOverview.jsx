'use client';

import React from 'react';
import { 
  Home, 
  Users, 
  AlertCircle, 
  UserPlus, 
  Loader2,
  TrendingUp,
  Activity
} from 'lucide-react';
import styles from './HostelModule.module.css';

const HostelOverview = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 className="animate-spin" size={48} color="#64748b" />
      </div>
    );
  }

  const { summary, alerts, attendance_today, fees } = analytics || {};

  return (
    <div className={styles.overviewContainer}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <Home size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Total Occupancy</h3>
            <p>{summary?.total_occupied} / {summary?.total_capacity}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#15803d' }}>
            <Activity size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Occupancy Rate</h3>
            <p>{summary?.occupancy_rate}%</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <AlertCircle size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Open Violations</h3>
            <p>{alerts?.open_violations}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef9c3', color: '#a16207' }}>
            <UserPlus size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Pending Visitors</h3>
            <p>{alerts?.pending_visitors}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Attendance Summary */}
        <div className={styles.tableContainer} style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#64748b" />
            Attendance Today
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#64748b' }}>Present</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#166534' }}>{attendance_today?.present}</p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#64748b' }}>Absent</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#991b1b' }}>{attendance_today?.absent}</p>
            </div>
          </div>
        </div>

        {/* Fee Collection Summary */}
        <div className={styles.tableContainer} style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color="#64748b" />
            Fee Collection
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Collected this period</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>₹{fees?.total_collected.toLocaleString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className={styles.badgeSuccess}>{fees?.collection_rate}% Collected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostelOverview;
