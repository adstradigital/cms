'use client';

import React from 'react';
import { 
  BarChart, 
  PieChart, 
  TrendingUp, 
  Activity,
  ChevronRight,
  Monitor
} from 'lucide-react';
import styles from './HostelModule.module.css';

const HostelAnalytics = ({ data }) => {
  const { summary, room_type_breakdown, hostel_stats } = data || {};

  return (
    <div className={styles.analyticsContainer}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        
        {/* Hostel Performance Chart */}
        <div className={styles.tableContainer} style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart size={20} color="#64748b" />
            Hostel Occupancy Comparison
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {hostel_stats?.map(hostel => (
              <div key={hostel.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ fontWeight: '500' }}>{hostel.name}</span>
                  <span style={{ color: '#64748b' }}>{hostel.total_occ} / {hostel.total_cap} beds filled</span>
                </div>
                <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${(hostel.total_occ / hostel.total_cap * 100) || 0}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)',
                      borderRadius: '6px',
                      transition: 'width 1s ease-out'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Type Pie Chart Placeholder */}
        <div className={styles.tableContainer} style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PieChart size={20} color="#64748b" />
            Room Distribution
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {room_type_breakdown?.map(item => (
              <div key={item.room_type} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', flex: '1 1 100px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize', marginBottom: '4px' }}>{item.room_type}</p>
                <p style={{ fontSize: '18px', fontWeight: '700' }}>{item.count}</p>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '30px', padding: '16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <TrendingUp size={16} color="#2563eb" />
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>Optimization Insight</span>
            </div>
            <p style={{ fontSize: '12px', color: '#1e40af', marginTop: '6px', lineHeight: '1.5' }}>
                Single rooms are currently 92% occupied. Consider converting under-utilized dormitory space to premium singles.
            </p>
          </div>
        </div>

      </div>

      <div className={styles.tableContainer} style={{ marginTop: '30px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#64748b" />
            Quick Trends
          </h2>
          <button style={{ color: '#2563eb', background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            Detailed Reports <ChevronRight size={16} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div style={{ padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                <p style={{ fontSize: '12px', color: '#64748b' }}>Exit frequency peak</p>
                <p style={{ fontSize: '16px', fontWeight: '600' }}>Friday 4 PM - 6 PM</p>
            </div>
            <div style={{ padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                <p style={{ fontSize: '12px', color: '#64748b' }}>Visitor approval rate</p>
                <p style={{ fontSize: '16px', fontWeight: '600' }}>87.4%</p>
            </div>
            <div style={{ padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                <p style={{ fontSize: '12px', color: '#64748b' }}>Avg. resolution time</p>
                <p style={{ fontSize: '16px', fontWeight: '600' }}>2.4 Days</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HostelAnalytics;
