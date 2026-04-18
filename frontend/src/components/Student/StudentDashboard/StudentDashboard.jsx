'use client';

import React, { useMemo } from 'react';
import styles from './StudentDashboard.module.css';
import useFetch from '@/hooks/useFetch';
import { 
  CheckCircle2, 
  FileSpreadsheet, 
  Calendar,
  ChevronLeft,
  Bell,
  TrendingUp,
  Award,
  Star,
  Zap,
  CreditCard,
  Target
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/students/students/dashboard-data/');

  const stats = useMemo(() => {
    if (!data) return null;
    const { attendance, exams, fees } = data;
    return {
      attendancePct: attendance?.percentage || 0,
      performancePct: exams?.percentage || 0,
      feeDue: fees?.due || 0,
      status: (exams?.percentage >= 80) ? 'Honor Roll' : (exams?.percentage >= 60) ? 'On Track' : 'Needs Review'
    };
  }, [data]);

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p>Gearing up your dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.emptyState}>
        <Zap size={48} color="#f87171" />
        <p style={{ color: 'red' }}>Sync failed: {error || 'No data available'}</p>
      </div>
    );
  }

  const { profile, attendance, fees, exams, chart_data } = data;

  return (
    <div className={styles.container}>
      {/* PREMIUM CONSOLE RIBBON */}
      <section className={styles.achievementRibbon}>
        <div className={styles.achievementMain}>
          {/* Attendance Gauge */}
          <div className={styles.gaugeCol}>
            <div className={styles.circularGauge}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.gaugeBg} cx="50" cy="50" r="45" />
                <circle 
                  className={styles.gaugeFill} 
                  style={{ strokeDashoffset: 283 - (283 * (stats?.attendancePct || 0)) / 100, stroke: '#10b981' }} 
                  cx="50" cy="50" r="45" 
                />
              </svg>
              <div className={styles.gaugeContent}>
                <span className={styles.gaugeValue}>{stats?.attendancePct}%</span>
                <span className={styles.gaugeLabel}>ATTENDANCE</span>
              </div>
            </div>
          </div>

          <div className={styles.verticalDivider} />

          {/* Academic Performance */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e293b' }}>
              <Target size={20} color="#facc15" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats?.performancePct?.toFixed(1)}%</span>
              <span className={styles.metricLabel}>Academic Avg. Score</span>
            </div>
          </div>

          {/* Financials */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e1b4b' }}>
              <CreditCard size={20} color="#818cf8" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>${stats?.feeDue}</span>
              <span className={styles.metricLabel}>Pending Fees</span>
            </div>
          </div>

          {/* Status */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e3a8a' }}>
              <Award size={20} color="#60a5fa" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats?.status}</span>
              <span className={styles.metricLabel}>Academic Standing</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.mainLayout}>
        <div className={styles.centerColumn}>
          {/* Charts Area */}
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Academic Performance Index</h3>
                <TrendingUp size={16} color="#64748b" />
              </div>
              
              <div className={styles.barChartContainer}>
                {chart_data?.map((item, index) => (
                  <div key={index} className={styles.barGroup}>
                    <div className={styles.barsWrapper}>
                      <div className={styles.barMain} style={{ height: `${item.student}%` }}>
                        <span className={styles.barValue}>{item.student}</span>
                      </div>
                      <div className={styles.barAvg} style={{ height: `${item.average}%` }} />
                    </div>
                    <span className={styles.barSubject}>{item.subject}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Attendance Velocity</h3>
              <div className={styles.pieContainer}>
                 {(() => {
                    const total = attendance?.present + attendance?.absent + attendance?.leave;
                    const pPct = (attendance?.present / total) * 100;
                    const lPct = (attendance?.leave / total) * 100;
                    return (
                      <div className={styles.pieViz} style={{ background: `conic-gradient(#10b981 0% ${pPct}%, #fbbf24 ${pPct}% ${pPct+lPct}%, #ef4444 ${pPct+lPct}% 100%)` }}>
                        <div className={styles.pieCore} />
                      </div>
                    );
                 })()}
                 <div className={styles.pieLegend}>
                    <div className={styles.legendItem}><div className={styles.dot} style={{ background: '#10b981' }} /> <span>Present</span></div>
                    <div className={styles.legendItem}><div className={styles.dot} style={{ background: '#fbbf24' }} /> <span>Leave</span></div>
                    <div className={styles.legendItem}><div className={styles.dot} style={{ background: '#ef4444' }} /> <span>Absent</span></div>
                 </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
             <div className={styles.actionCard} onClick={() => window.location.href='/student/assignments'}>
                <Calendar size={20} />
                <span>View Assignments</span>
             </div>
             <div className={styles.actionCard} onClick={() => window.location.href='/student/attendance'}>
                <CheckCircle2 size={20} />
                <span>Attendance Log</span>
             </div>
             <div className={styles.actionCard} onClick={() => window.location.href='/student/fees'}>
                <CreditCard size={20} />
                <span>Fee Payments</span>
             </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.profileCard}>
            <div className={styles.avatarArea}>
               <div className={styles.avatarGlow} />
               <div className={styles.avatarImg}>
                 {profile?.name?.charAt(0)}
               </div>
            </div>
            <h2 className={styles.studentName}>{profile?.name}</h2>
            <p className={styles.studentMeta}>Roll: {profile?.roll_number} • Class {profile?.class_name}</p>
            
            <div className={styles.profileDetails}>
               <div className={styles.detailItem}><span className={styles.label}>Adm. No</span><span>{profile?.admission_number}</span></div>
               <div className={styles.detailItem}><span className={styles.label}>Section</span><span>{profile?.section_name}</span></div>
               <div className={styles.detailItem}><span className={styles.label}>Contact</span><span>{profile?.contact}</span></div>
            </div>
          </div>

          <div className={styles.eventCard}>
             <div className={styles.eventIcon}><Star size={20} color="white" /></div>
             <div className={styles.eventInfo}>
                <h4>Annual Sports Day</h4>
                <p>Dec 12 • Stadium Complex</p>
             </div>
             <button className={styles.reminderBtn}><Bell size={14} /> Notify</button>
          </div>
        </div>
      </div>
    </div>
  );
}
