'use client';

import React, { useState, useMemo } from 'react';
import styles from './StudentAttendance.module.css';
import useFetch from '@/hooks/useFetch';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  UserX, 
  Clock3, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Star,
  Zap,
  ArrowRight
} from 'lucide-react';

export default function StudentAttendance() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // 1. Get Student ID from dashboard data
  const { data: dashboardData, loading: profileLoading } = useFetch('/students/students/dashboard-data/');
  const studentId = dashboardData?.profile?.id;

  // 2. Fetch Attendance Records
  const { data: attendance, loading: attLoading } = useFetch(
    studentId ? `/attendance/?student=${studentId}&month=${selectedMonth}&year=${selectedYear}` : null
  );

  // 3. Fetch Leave Requests
  const { data: leaves, loading: leaveLoading } = useFetch(
    studentId ? `/attendance/leaves/?student=${studentId}` : null
  );

  // Calendar Logic
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 = Sunday
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null });
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const record = attendance?.find(r => r.date === dateStr);
      days.push({ day: i, record });
    }
    return days;
  }, [selectedMonth, selectedYear, attendance]);

  const stats = useMemo(() => {
    if (!attendance) return { present: 0, absent: 0, late: 0, leave: 0, percentage: 0 };
    const p = attendance.filter(r => r.status === 'present').length;
    const a = attendance.filter(r => r.status === 'absent').length;
    const lt = attendance.filter(r => r.status === 'late').length;
    const lv = attendance.filter(r => r.status === 'leave').length;
    const total = p + a + lt + lv;
    const percentage = total > 0 ? Math.round(((p + lt) / total) * 100) : 0;
    return { present: p, absent: a, late: lt, leave: lv, percentage };
  }, [attendance]);

  const isLoading = profileLoading || attLoading || leaveLoading;

  if (isLoading && !attendance) {
    return (
      <div className={styles.loader}>
        <Loader2 size={40} className="animate-spin" color="#4f46e5" />
        <p>Syncing attendance logs...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Attendance Analytics</h1>
          <p>Institutional presence tracking and leave management</p>
        </div>

        <div className={styles.controls}>
          <select 
            className={styles.select} 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('en', { month: 'long' })}
              </option>
            ))}
          </select>
          <select 
            className={styles.select} 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </header>

      {/* PREMIUM ATTENDANCE RIBBON */}
      <section className={styles.achievementRibbon}>
        <div className={styles.achievementMain}>
          {/* Attendance Gauge */}
          <div className={styles.gaugeCol}>
            <div className={styles.circularGauge}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.gaugeBg} cx="50" cy="50" r="45" />
                <circle 
                  className={styles.gaugeFill} 
                  style={{ strokeDashoffset: 283 - (283 * stats.percentage) / 100, stroke: '#10b981' }} 
                  cx="50" cy="50" r="45" 
                />
              </svg>
              <div className={styles.gaugeContent}>
                <span className={styles.gaugeValue}>{stats.percentage}%</span>
                <span className={styles.gaugeLabel}>PRESENCE</span>
              </div>
            </div>
          </div>

          <div className={styles.verticalDivider} />

          {/* Present */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#064e3b' }}>
              <CheckCircle2 size={20} color="#34d399" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.present + stats.late}</span>
              <span className={styles.metricLabel}>Total Days Present</span>
            </div>
          </div>

          {/* Late */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#451a03' }}>
              <Clock3 size={20} color="#fbbf24" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.late}</span>
              <span className={styles.metricLabel}>Late Arrivals</span>
            </div>
          </div>

          {/* Absent */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#450a0a' }}>
              <UserX size={20} color="#f87171" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.absent}</span>
              <span className={styles.metricLabel}>Days Absent</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.mainLayout}>
        <div className={styles.calendarCard}>
          <div className={styles.calendarHeader}>
            <h3>Monthly Calendar</h3>
            <div className={styles.legend}>
              <div className={styles.legendItem}><div className={`${styles.statusDot} ${styles.present}`} /> Present</div>
              <div className={styles.legendItem}><div className={`${styles.statusDot} ${styles.absent}`} /> Absent</div>
              <div className={styles.legendItem}><div className={`${styles.statusDot} ${styles.late}`} /> Late</div>
              <div className={styles.legendItem}><div className={`${styles.statusDot} ${styles.leave}`} /> Leave</div>
            </div>
          </div>
          <div className={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className={styles.dayName}>{d}</div>
            ))}
            {calendarDays.map((d, index) => (
              <div 
                key={index} 
                className={`${styles.dayCell} ${d.day ? styles.dayCellActive : ''} ${d.record ? styles[d.record.status] : ''}`}
              >
                {d.day}
                {d.record && <div className={styles.statusLabel}>{d.record.status.charAt(0).toUpperCase()}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <h3><FileText size={18} /> Leave Requests</h3>
              <ArrowRight size={16} />
            </div>
            <div className={styles.leaveList}>
              {leaves?.slice(0, 5).map(l => (
                <div key={l.id} className={styles.leaveItem}>
                  <div className={styles.leaveInfo}>
                    <span className={styles.leaveDate}>{new Date(l.from_date).toLocaleDateString()}</span>
                    <p className={styles.leaveReason}>{l.reason}</p>
                  </div>
                  <span className={`${styles.badge} ${styles[l.status]}`}>
                    {l.status}
                  </span>
                </div>
              ))}
              {(!leaves || leaves.length === 0) && (
                <div className={styles.emptyLeaves}>
                  <Zap size={24} color="#e2e8f0" />
                  <p>No recent leave records found.</p>
                </div>
              )}
            </div>
            <button className={styles.requestBtn}>Request New Leave</button>
          </div>
        </div>
      </div>
    </div>
  );
}
