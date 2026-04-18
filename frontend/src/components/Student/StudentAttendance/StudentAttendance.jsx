'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ArrowRight,
  BarChart3,
  ClipboardList,
  Megaphone,
  History,
  Plus
} from 'lucide-react';
import LeaveRequestModal from './LeaveRequestModal';


export default function StudentAttendance() {
  return (
    <Suspense fallback={<div className={styles.loader}><Loader2 size={40} className="animate-spin" /></div>}>
      <StudentAttendanceContent />
    </Suspense>
  );
}

function StudentAttendanceContent() {
  const now = new Date();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Deep linking logic
  const activeTab = searchParams.get('view') || 'insights';
  const setTab = (tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', tab);
    router.push(`?${params.toString()}`);
  };

  // 1. Get Student ID from dashboard data
  const { data: dashboardData, loading: profileLoading } = useFetch('/students/students/dashboard-data/');
  const studentId = dashboardData?.profile?.id;

  // 2. Fetch Attendance Records
  const { data: attendance, loading: attLoading, refetch: refetchAtt } = useFetch(
    studentId ? `/attendance/?student=${studentId}&month=${selectedMonth}&year=${selectedYear}` : null
  );

  // 3. Fetch Leave Requests
  const { data: leaves, loading: leaveLoading, refetch: refetchLeaves } = useFetch(
    studentId ? `/attendance/leaves/?student=${studentId}` : null
  );

  const handleLeaveSuccess = () => {
    refetchLeaves();
    // Also refetch attendance since new leaves might affect current month calendar
    refetchAtt();
  };

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

  const isLoading = profileLoading || (activeTab === 'insights' && attLoading) || (activeTab === 'leaves' && leaveLoading);

  if (isLoading && !attendance && !leaves) {
    return (
      <div className={styles.loader}>
        <Loader2 size={40} className="animate-spin" color="#4f46e5" />
        <p>Syncing attendance ecosystem...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Attendance Analytics</h1>
          <p>Institutional presence tracking and leave management</p>
          
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'insights' ? styles.tabActive : ''}`}
              onClick={() => setTab('insights')}
            >
              Attendance Insights
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'leaves' ? styles.tabActive : ''}`}
              onClick={() => setTab('leaves')}
            >
              Leave Portal
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'calendar' ? styles.tabActive : ''}`}
              onClick={() => setTab('calendar')}
            >
              Academic Calendar
            </button>
          </div>
        </div>

        {activeTab === 'insights' && (
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
        )}
      </header>

      {/* PREMIUM ATTENDANCE RIBBON (Visible on Insights & Calendar) */}
      {activeTab !== 'leaves' && (
        <section className={styles.achievementRibbon}>
          <div className={styles.achievementMain}>
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

            <div className={styles.metricCol}>
              <div className={styles.metricIconBox} style={{ backgroundColor: '#064e3b' }}>
                <CheckCircle2 size={20} color="#34d399" />
              </div>
              <div className={styles.metricText}>
                <span className={styles.metricValue}>{stats.present + stats.late}</span>
                <span className={styles.metricLabel}>Total Days Present</span>
              </div>
            </div>

            <div className={styles.metricCol}>
              <div className={styles.metricIconBox} style={{ backgroundColor: '#451a03' }}>
                <Clock3 size={20} color="#fbbf24" />
              </div>
              <div className={styles.metricText}>
                <span className={styles.metricValue}>{stats.late}</span>
                <span className={styles.metricLabel}>Late Arrivals</span>
              </div>
            </div>

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
      )}

      <div className={styles.viewContainer}>
        {activeTab === 'insights' && (
          <div className={styles.calendarTabContent}>
            <div className={styles.mainLayout}>
              <div className={styles.calendarCard}>
                <div className={styles.calendarHeader}>
                  <h3>Monthly Presence Map</h3>
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
                <LeaveSummaryCard 
                  leaves={leaves} 
                  onAction={() => setTab('leaves')} 
                  onApply={() => setIsLeaveModalOpen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className={styles.leavePortal}>
            <div className={styles.leaveHistorySection}>
              <div className={styles.leaveFilterBar}>
                 <div className={styles.sectionHeader}>
                    <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800' }}>
                       <History size={24} color="#4f46e5" /> Leave Management History
                    </h2>
                 </div>
                 <button 
                  className={styles.submitBtn} 
                  onClick={() => setIsLeaveModalOpen(true)}
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '12px' }}
                >
                  <Plus size={16} /> New Application
                </button>
              </div>

              <div className={styles.leaveList} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                {leaves?.map(l => (
                  <div key={l.id} className={styles.leaveItem} style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div className={styles.leaveInfo}>
                      <span className={styles.leaveDate}>{new Date(l.from_date).toLocaleDateString()} — {new Date(l.to_date).toLocaleDateString()}</span>
                      <p className={styles.leaveReason} style={{ fontSize: '14px', marginTop: '4px' }}>{l.reason}</p>
                      <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                         <span>Requested on: {new Date(l.created_at).toLocaleDateString()}</span>
                         <span>Type: {l.leave_type || 'General'}</span>
                      </div>
                    </div>
                    <span className={`${styles.badge} ${styles[l.status]}`} style={{ padding: '6px 12px', fontSize: '11px' }}>
                      {l.status}
                    </span>
                  </div>
                ))}
                {(!leaves || leaves.length === 0) && (
                  <div className={styles.emptyLeaves}>
                    <Zap size={48} color="#e2e8f0" />
                    <p>No leave records found in the portal.</p>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.sidePanel}>
               <div className={styles.panelCard} style={{ background: '#0f172a', color: 'white' }}>
                  <div className={styles.panelHeader} style={{ color: 'white' }}>
                    <h3><Star size={18} color="#fbbf24" /> Apply for Absence</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Submit a new request for authorization. Ensure documents are attached if required.</p>
                  <button className={styles.requestBtn} style={{ background: '#4f46e5' }} onClick={() => setIsLeaveModalOpen(true)}>New Leave Application</button>
               </div>
               
               <div className={styles.panelCard}>
                  <div className={styles.panelHeader}>
                    <h3><Megaphone size={18} color="#10b981" /> Leave Policy</h3>
                  </div>
                  <ul style={{ padding: '0 16px', fontSize: '12px', color: '#475569', lineHeight: '2' }}>
                     <li>Sickness requires medical proof</li>
                     <li>Personal leave: 2 days advance notice</li>
                     <li>Max 3 project leave days allowed</li>
                  </ul>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className={styles.calendarHub}>
             <div className={styles.sectionHeader}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <Calendar size={24} color="#ec4899" /> Academic & Holiday Calendar
                </h2>
             </div>
             
             <div className={styles.emptyState} style={{ padding: '120px 0', textAlign: 'center' }}>
                <Zap size={64} color="#f1f5f9" />
                <h3 style={{ marginTop: '20px', color: '#475569' }}>Academic Schedule Coming Soon</h3>
                <p style={{ color: '#94a3b8' }}>Our upcoming holiday and exam schedule is being finalized by the administration.</p>
             </div>
          </div>
        )}
      </div>

      {isLeaveModalOpen && (
        <LeaveRequestModal 
          studentId={studentId}
          onClose={() => setIsLeaveModalOpen(false)}
          onSuccess={handleLeaveSuccess}
        />
      )}
    </div>
  );
}

function LeaveSummaryCard({ leaves, onAction, onApply }) {
  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <h3><FileText size={18} /> Recent Leave Activity</h3>
        <ArrowRight size={16} onClick={onAction} style={{ cursor: 'pointer' }} />
      </div>
      <div className={styles.leaveList}>
        {leaves?.slice(0, 3).map(l => (
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
            <p>No recent requests.</p>
          </div>
        )}
      </div>
      <button className={styles.requestBtn} onClick={onApply}>Request New Leave</button>
    </div>
  );
}


