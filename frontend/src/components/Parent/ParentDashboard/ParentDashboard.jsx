'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BarChart3, CheckCircle, Edit3, CreditCard, CalendarDays,
  TrendingUp, ArrowUpRight, AlertCircle, Clock, Download
} from 'lucide-react';
import parentApi from '@/api/parentApi';
import styles from './ParentDashboard.module.css';

const ParentDashboard = ({ defaultTab }) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeView = defaultTab || searchParams.get('tab') || 'overview';

  const [stats, setStats] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [academicData, setAcademicData] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [homeworkData, setHomeworkData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGlobalData(); }, []);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      const [statsRes, childrenRes] = await Promise.all([
        parentApi.getStats().catch(() => ({ data: null })),
        parentApi.getChildren().catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      const list = childrenRes.data || [];
      setChildren(list);
      if (list.length > 0) {
        setSelectedChild(list[0]);
        fetchChildData(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async (childId) => {
    parentApi.getChildProgress(childId).then(r => setAcademicData(r.data)).catch(() => {});
    parentApi.getFees(childId).then(r => setFeeData(r.data)).catch(() => {});
    parentApi.getAttendance(childId).then(r => setAttendanceData(r.data)).catch(() => {});
    parentApi.getHomework(childId).then(r => setHomeworkData(r.data)).catch(() => {});
  };

  const handleChildChange = (child) => {
    setSelectedChild(child);
    setAcademicData(null); setFeeData(null); setAttendanceData(null); setHomeworkData(null);
    fetchChildData(child.id);
  };

  const getInitials = (name) => {
    if (!name) return 'TS';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const navigateTo = (tab) => router.push(`/parent?tab=${tab}`);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  // ── Demo / real data ──────────────────────────────────────────────
  const attendancePct = stats?.attendance_percentage ?? 0;
  const attSum = attendanceData?.summary ?? {};
  const presentDays = attSum.present ?? 0;
  const absentDays = attSum.absent ?? 0;
  const leaveDays = attSum.late ?? 0;

  const subjects = academicData?.results?.length
    ? academicData.results.map(r => ({ name: r.subject_name?.slice(0, 4).toUpperCase() ?? 'SUB', score: r.marks_obtained ?? 0 }))
    : [];

  const avgScore = subjects.length
    ? (subjects.reduce((a, s) => a + s.score, 0) / subjects.length).toFixed(1)
    : 0;

  const pendingFees = feeData?.summary?.total_pending ?? 0;
  const homeworkCount = homeworkData?.homework?.length ?? 0;

  // ── Donut chart for attendance ────────────────────────────────────
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (attendancePct / 100) * circ;

  const getBarColor = (score) => score >= 80 ? '#1a73e8' : '#f5a623';

  // ── Render Attendance Tab ─────────────────────────────────────────
  const getStatusConfig = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'present') return { label: 'Present', color: '#1e8e3e', bg: '#e6f4ea' };
    if (s === 'absent')  return { label: 'Absent',  color: '#d93025', bg: '#fce8e6' };
    if (s === 'late')    return { label: 'Late',    color: '#e37400', bg: '#fef7e0' };
    return { label: status, color: '#5f6368', bg: '#f1f3f4' };
  };

  const total = presentDays + absentDays + leaveDays;
  const displayPct = total > 0 ? Math.round((presentDays / total) * 100) : attendancePct;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Loading dashboard…</div>
      </div>
    );
  }

  // ── Overview ──────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Parent dashboard</h1>
        <p className={styles.pageSubtitle}>{dateStr} — Term 2</p>
      </div>

      {/* Child Selector */}
      <div className={styles.childSelector}>
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => handleChildChange(child)}
            className={`${styles.childPill} ${selectedChild?.id === child.id ? styles.childPillActive : ''}`}
          >
            <div className={`${styles.childAvatar} ${selectedChild?.id === child.id ? styles.childAvatarActive : ''}`}>
              {getInitials(child.full_name)}
            </div>
            <span>{child.full_name} · Grade {child.class_name || 'N/A'}</span>
          </button>
        ))}
        {children.length > 1 && (
          <button className={styles.switchBtn}>Switch child</button>
        )}
      </div>

      {/* KPI Strip */}
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#1e8e3e' }}>
          <div className={styles.kpiLabel}>Attendance</div>
          <div className={styles.kpiValue}>{attendancePct}%</div>
          <div className={styles.kpiSub} style={{ color: '#1e8e3e' }}>+2% vs last month</div>
        </div>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#1a73e8' }}>
          <div className={styles.kpiLabel}>Academic avg</div>
          <div className={styles.kpiValue}>{avgScore}</div>
          <div className={styles.kpiSub}>Out of 100</div>
        </div>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#e37400' }}>
          <div className={styles.kpiLabel}>Pending fees</div>
          <div className={styles.kpiValue}>₹{pendingFees.toLocaleString()}</div>
          <div className={styles.kpiSub} style={{ color: '#e37400' }}>Due May 5</div>
        </div>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#d93025' }}>
          <div className={styles.kpiLabel}>Homework due</div>
          <div className={styles.kpiValue}>{homeworkCount}</div>
          <div className={styles.kpiSub} style={{ color: '#d93025' }}>2 overdue</div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className={styles.mainGrid}>
        {/* Academic Performance Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Academic performance</span>
            <button className={styles.cardLink} onClick={() => navigateTo('academics')}>
              Full report <ArrowUpRight size={14} />
            </button>
          </div>
          <div className={styles.subjectList}>
            {subjects.map((s, i) => (
              <div key={i} className={styles.subjectRow}>
                <span className={styles.subjectName}>{s.name}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${s.score}%`, background: getBarColor(s.score) }}
                  />
                </div>
                <span className={styles.subjectScore} style={{ color: getBarColor(s.score) }}>
                  {s.score}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            <span className={styles.legendDot} style={{ background: '#1a73e8' }} /> Good (≥80)
            <span className={styles.legendDot} style={{ background: '#f5a623', marginLeft: '12px' }} /> Needs attention
          </div>
        </div>

        {/* Attendance Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Attendance this month</span>
            <button className={styles.cardLink} onClick={() => navigateTo('attendance')}>
              Details <ArrowUpRight size={14} />
            </button>
          </div>
          <div className={styles.donutWrapper}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#e8eaed" strokeWidth="12" />
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                stroke="#1e8e3e"
                strokeWidth="12"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className={styles.donutLabel}>
              <span className={styles.donutPct}>{attendancePct}%</span>
            </div>
          </div>
          <div className={styles.attStats}>
            <div className={styles.attStat}>
              <span className={styles.attCount} style={{ color: '#1e8e3e' }}>{presentDays}</span>
              <span className={styles.attLabel}>Present</span>
            </div>
            <div className={styles.attStat}>
              <span className={styles.attCount} style={{ color: '#d93025' }}>{absentDays}</span>
              <span className={styles.attLabel}>Absent</span>
            </div>
            <div className={styles.attStat}>
              <span className={styles.attCount} style={{ color: '#e37400' }}>{leaveDays}</span>
              <span className={styles.attLabel}>Leave</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Attendance Tab ────────────────────────────────────────────────
  const renderAttendance = () => {
    const logs = attendanceData?.logs || [];
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Attendance</h1>
          <p className={styles.pageSubtitle}>{dateStr} — Term 2</p>
        </div>
        <div className={styles.mainGrid}>
          <div className={styles.card} style={{ gridColumn: 'span 1' }}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Presence Records</span>
            </div>
            {logs.length === 0 ? (
              <div className={styles.emptyState}>No attendance records found for this period.</div>
            ) : (
              <div className={styles.logList}>
                {logs.map((log, i) => {
                  const cfg = getStatusConfig(log.status);
                  return (
                    <div key={i} className={styles.logRow}>
                      <div className={styles.logDate}>
                        <div className={styles.logMonth}>{new Date(log.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                        <div className={styles.logDay}>{new Date(log.date).getDate()}</div>
                      </div>
                      <div className={styles.logInfo}>
                        <div className={styles.logSubject}>{log.subject || 'Standard Session'}</div>
                        <div className={styles.logRemarks}>{log.remarks || 'No remarks'}</div>
                      </div>
                      <span className={styles.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Attendance this month</span>
            </div>
            <div className={styles.donutWrapper}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#e8eaed" strokeWidth="12" />
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e8e3e" strokeWidth="12"
                  strokeDasharray={circ} strokeDashoffset={circ - (displayPct / 100) * circ}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              <div className={styles.donutLabel}>
                <span className={styles.donutPct}>{displayPct}%</span>
              </div>
            </div>
            <div className={styles.attStats}>
              <div className={styles.attStat}>
                <span className={styles.attCount} style={{ color: '#1e8e3e' }}>{presentDays}</span>
                <span className={styles.attLabel}>Present</span>
              </div>
              <div className={styles.attStat}>
                <span className={styles.attCount} style={{ color: '#d93025' }}>{absentDays}</span>
                <span className={styles.attLabel}>Absent</span>
              </div>
              <div className={styles.attStat}>
                <span className={styles.attCount} style={{ color: '#e37400' }}>{leaveDays}</span>
                <span className={styles.attLabel}>Leave</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Academics Tab ─────────────────────────────────────────────────
  const renderAcademics = () => (
    <div className={styles.container}>
      <div className={styles.pageHeader} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className={styles.pageTitle}>Academic performance</h1>
          <p className={styles.pageSubtitle}>{dateStr} — Term 2</p>
        </div>
        <button className={styles.downloadBtn}>
          <Download size={16} /> Download Report Card
        </button>
      </div>
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#1a73e8' }}>
          <div className={styles.kpiLabel}>Term Average</div>
          <div className={styles.kpiValue}>{avgScore}</div>
          <div className={styles.kpiSub}>Out of 100</div>
        </div>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#1e8e3e' }}>
          <div className={styles.kpiLabel}>Subjects Passing</div>
          <div className={styles.kpiValue}>{subjects.filter(s => s.score >= 80).length}/{subjects.length}</div>
          <div className={styles.kpiSub} style={{ color: '#1e8e3e' }}>Above 80%</div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Subject breakdown</span>
        </div>
        <div className={styles.subjectList}>
          {subjects.map((s, i) => (
            <div key={i} className={styles.subjectRow}>
              <span className={styles.subjectName}>{s.name}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${s.score}%`, background: getBarColor(s.score) }} />
              </div>
              <span className={styles.subjectScore} style={{ color: getBarColor(s.score) }}>{s.score}</span>
            </div>
          ))}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendDot} style={{ background: '#1a73e8' }} /> Good (≥80)
          <span className={styles.legendDot} style={{ background: '#f5a623', marginLeft: '12px' }} /> Needs attention
        </div>
      </div>
    </div>
  );

  // ── Fees Tab ──────────────────────────────────────────────────────
  const renderFees = () => (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Payments</h1>
        <p className={styles.pageSubtitle}>{dateStr} — Term 2</p>
      </div>
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#e37400' }}>
          <div className={styles.kpiLabel}>Pending fees</div>
          <div className={styles.kpiValue}>₹{pendingFees.toLocaleString()}</div>
          <div className={styles.kpiSub} style={{ color: '#e37400' }}>Due May 5</div>
        </div>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#1e8e3e' }}>
          <div className={styles.kpiLabel}>Total paid</div>
          <div className={styles.kpiValue}>₹{(feeData?.summary?.total_paid ?? 12000).toLocaleString()}</div>
          <div className={styles.kpiSub} style={{ color: '#1e8e3e' }}>This term</div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Fee ledger</span>
          <button className={styles.payBtn}>Pay now</button>
        </div>
        <table className={styles.feeTable}>
          <thead>
            <tr className={styles.feeHead}>
              <th>Category</th><th>Amount</th><th>Due Date</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(feeData?.ledger || []).map((item, i) => (
              <tr key={i} className={styles.feeRow}>
                <td className={styles.feeCat}>{item.category}</td>
                <td>₹{Number(item.amount).toLocaleString()}</td>
                <td className={styles.feeDate}>{item.due_date}</td>
                <td>
                  <span className={styles.statusBadge}
                    style={item.status === 'paid'
                      ? { color: '#1e8e3e', background: '#e6f4ea' }
                      : { color: '#e37400', background: '#fef7e0' }}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Homework Tab ──────────────────────────────────────────────────
  const renderHomework = () => {
    const list = homeworkData?.homework || [];
    const completed = list.filter(h => h.has_submission).length;
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Assignments & Homework</h1>
          <p className={styles.pageSubtitle}>{dateStr} — Term 2</p>
        </div>
        <div className={styles.kpiStrip}>
          <div className={styles.kpiCard} style={{ borderLeftColor: '#1a73e8' }}>
            <div className={styles.kpiLabel}>Total Tasks</div>
            <div className={styles.kpiValue}>{list.length}</div>
            <div className={styles.kpiSub}>This month</div>
          </div>
          <div className={styles.kpiCard} style={{ borderLeftColor: '#e37400' }}>
            <div className={styles.kpiLabel}>Pending</div>
            <div className={styles.kpiValue}>{list.length - completed}</div>
            <div className={styles.kpiSub} style={{ color: '#e37400' }}>Requires attention</div>
          </div>
          <div className={styles.kpiCard} style={{ borderLeftColor: '#1e8e3e' }}>
            <div className={styles.kpiLabel}>Completed</div>
            <div className={styles.kpiValue}>{completed}</div>
            <div className={styles.kpiSub} style={{ color: '#1e8e3e' }}>Great job</div>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Recent Assignments</span>
          </div>
          {list.length === 0 ? (
            <div className={styles.emptyState}>No homework assigned currently.</div>
          ) : (
            <div className={styles.hwList}>
              {list.map(h => (
                <div key={h.id} className={styles.hwCard}>
                  <div className={styles.hwLeft}>
                    <div className={styles.hwSubjectBadge}>{h.subject?.slice(0, 3).toUpperCase() || 'GEN'}</div>
                    <div>
                      <div className={styles.hwTitle}>{h.title}</div>
                      <div className={styles.hwMeta}>
                        <span>Assigned by: {h.assigned_by}</span>
                        <span>Due: {new Date(h.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {h.has_submission ? (
                    <span className={`${styles.hwStatus} ${styles.hwDone}`}>Submitted</span>
                  ) : new Date(h.due_date) < new Date() ? (
                    <span className={`${styles.hwStatus} ${styles.hwMissing}`}>Overdue</span>
                  ) : (
                    <span className={`${styles.hwStatus} ${styles.hwDueSoon}`}>Pending</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── PTM Scheduler Tab (Mock Data) ─────────────────────────────────
  const renderPTM = () => {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Parent-Teacher Meetings</h1>
          <p className={styles.pageSubtitle}>Schedule meetings with ongoing teachers</p>
        </div>
        
        <div className={styles.ptmBanner}>
          <div className={styles.ptmBannerInfo}>
            <div className={styles.ptmBannerTitle}>Upcoming Confirmed Meeting</div>
            <div className={styles.ptmBannerTime}>Mrs. Davis (Mathematics) — Tuesday, {new Date().toLocaleDateString()}, 10:30 AM</div>
          </div>
          <button className={styles.ptmBannerAction}>Reschedule</button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Available Teachers</span>
          </div>
          <div className={styles.teacherGrid}>
            {[
               { name: 'Mr. A. Smith', sub: 'Science', av: 'AS' },
               { name: 'Ms. R. Patel', sub: 'English Lit.', av: 'RP' },
               { name: 'Mr. T. Harris', sub: 'History', av: 'TH' },
            ].map((t, i) => (
              <div key={i} className={styles.teacherCard}>
                <div className={styles.teacherAvatar}>{t.av}</div>
                <div>
                  <h3 className={styles.teacherName}>{t.name}</h3>
                  <p className={styles.teacherSubject}>{t.sub}</p>
                </div>
                <button className={styles.bookBtn}>Book Slot</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Transport Tab (Mock Data) ─────────────────────────────────────
  const renderTransport = () => {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Transport Tracking</h1>
          <p className={styles.pageSubtitle}>Live updates for today's commute</p>
        </div>

        <div className={styles.transportStatus}>
          <div className={styles.transportStatusIcon}>
            <CheckCircle size={20} />
          </div>
          <div className={styles.transportStatusText}>
            <div className={styles.transportStatusTitle}>Reached School Safely</div>
            <div className={styles.transportStatusDesc}>Last updated at 08:15 AM today</div>
          </div>
        </div>

        <div className={styles.busInfoGrid}>
          <div className={styles.busInfoCard}>
            <span className={styles.busInfoLabel}>Bus Number</span>
            <span className={styles.busInfoValue}>Route 4A - Yellow Express</span>
          </div>
          <div className={styles.busInfoCard}>
            <span className={styles.busInfoLabel}>Driver Contact</span>
            <span className={styles.busInfoValue}>John Doe (📞 +91 98765 43210)</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Today's Trip Timeline</span>
          </div>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={`${styles.timelineIcon} ${styles.timelineIconDone}`} />
              <div className={styles.timelineLine} />
              <div className={styles.timelineContent}>
                <span className={styles.timelineTime}>07:30 AM</span>
                <span className={styles.timelineDesc}>Picked up from Home Station</span>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={`${styles.timelineIcon} ${styles.timelineIconDone}`} />
              <div className={styles.timelineLine} />
              <div className={styles.timelineContent}>
                <span className={styles.timelineTime}>07:45 AM</span>
                <span className={styles.timelineDesc}>In Transit via Main Highway</span>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={`${styles.timelineIcon} ${styles.timelineIconActive}`} />
              <div className={styles.timelineLine} />
              <div className={styles.timelineContent}>
                <span className={styles.timelineTime}>08:15 AM</span>
                <span className={styles.timelineDesc}>Arrived at School Premises</span>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon} />
              <div className={styles.timelineLine} />
              <div className={styles.timelineContent}>
                <span className={styles.timelineTime}>03:20 PM</span>
                <span className={styles.timelineDesc}>Scheduled Departure (Return Trip)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Settings Tab (Mock Data) ──────────────────────────────────────
  const renderSettings = () => (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Account Settings</h1>
        <p className={styles.pageSubtitle}>Manage your parent portal preferences</p>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Profile Information</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: '#4b5563' }}>
            Update your contact information, password, and notification preferences securely.
          </p>
          <div style={{ padding: '16px', background: '#f3f4f6', borderRadius: '8px', fontSize: '13px', color: '#374151' }}>
            <em>UI coming soon. Settings module is currently in development.</em>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Support Tab (Mock Data) ───────────────────────────────────────
  const renderSupport = () => (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Help & Support</h1>
        <p className={styles.pageSubtitle}>Get assistance with the portal or contact the school</p>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Contact Administrator</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: '#4b5563' }}>
            If you are experiencing technical issues, please submit a support ticket below or call the IT helpdesk.
          </p>
          <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px', fontSize: '13px', color: '#1d4ed8' }}>
            <strong>IT Helpdesk:</strong> +91 800-123-4567<br/>
            <strong>Email:</strong> support@schoolcms.com
          </div>
        </div>
      </div>
    </div>
  );

  // ── Timetable & Holidays Tab ──────────────────────────────────────
  const renderTimetable = () => (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Timetable & Holidays</h1>
        <p className={styles.pageSubtitle}>View weekly class schedules and the academic calendar</p>
      </div>
      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Today's Schedule</span>
            <button className={styles.cardLink}>Full week <ArrowUpRight size={14} /></button>
          </div>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={`${styles.timelineIcon} ${styles.timelineIconActive}`} />
              <div className={styles.timelineLine} />
              <div className={styles.timelineContent}>
                <span className={styles.timelineTime}>08:00 AM - 08:45 AM</span>
                <span className={styles.timelineDesc} style={{ color: '#111827', fontWeight: 500 }}>Mathematics</span>
                <span className={styles.timelineDesc} style={{ fontSize: '11px' }}>Mrs. Davis · Room 102</span>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={`${styles.timelineIcon} ${styles.timelineIconActive}`} />
              <div className={styles.timelineLine} />
              <div className={styles.timelineContent}>
                <span className={styles.timelineTime}>08:50 AM - 09:35 AM</span>
                <span className={styles.timelineDesc} style={{ color: '#111827', fontWeight: 500 }}>Physics</span>
                <span className={styles.timelineDesc} style={{ fontSize: '11px' }}>Mr. Smith · Lab 4</span>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={`${styles.timelineIcon} ${styles.timelineIconDone}`} style={{ backgroundColor: '#f5a623', boxShadow: '0 0 0 4px white' }} />
              <div className={styles.timelineLine} />
              <div className={styles.timelineContent}>
                <span className={styles.timelineTime}>09:35 AM - 09:50 AM</span>
                <span className={styles.timelineDesc} style={{ color: '#f5a623', fontWeight: 600 }}>Morning Break</span>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon} />
              <div className={styles.timelineContent}>
                <span className={styles.timelineTime}>09:50 AM - 10:35 AM</span>
                <span className={styles.timelineDesc} style={{ color: '#111827', fontWeight: 500 }}>English Literature</span>
                <span className={styles.timelineDesc} style={{ fontSize: '11px' }}>Ms. Patel · Room 201</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Upcoming Holidays</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', gap: '16px' }}>
              <div style={{ background: '#fef7e0', color: '#e37400', padding: '8px 12px', borderRadius: '6px', textAlign: 'center', minWidth: '60px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>May</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>15</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Summer Break Begins</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>School closed for 6 weeks</div>
              </div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', gap: '16px' }}>
              <div style={{ background: '#e6f4ea', color: '#1e8e3e', padding: '8px 12px', borderRadius: '6px', textAlign: 'center', minWidth: '60px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Aug</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>15</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Independence Day</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Flag hoisting ceremony at 8:00 AM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Teacher Communication Tab ─────────────────────────────────────
  const renderCommunication = () => (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Teacher Communication</h1>
        <p className={styles.pageSubtitle}>Message teachers directly or schedule a PTM</p>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Direct Messages</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Select Teacher</label>
              <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px' }}>
                <option>Mrs. Davis (Mathematics)</option>
                <option>Mr. Smith (Physics)</option>
                <option>Ms. Patel (English Lit.)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Message</label>
              <textarea placeholder="Type your message here..." rows={5} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontSize: '13px', resize: 'none' }}></textarea>
            </div>
            <button className={styles.payBtn} style={{ background: '#1a73e8', color: 'white', border: 'none', alignSelf: 'flex-start' }}>Send Message</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.ptmBanner}>
            <div className={styles.ptmBannerInfo}>
              <div className={styles.ptmBannerTitle}>Upcoming Confirmed Meeting</div>
              <div className={styles.ptmBannerTime}>Mrs. Davis (Mathematics) — Tuesday, 10:30 AM</div>
            </div>
            <button className={styles.ptmBannerAction}>Reschedule</button>
          </div>

          <div className={styles.card} style={{ flex: 1 }}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Schedule New PTM</span>
            </div>
            <div className={styles.teacherGrid}>
              {[
                  { name: 'Mr. A. Smith', sub: 'Science', av: 'AS' },
                  { name: 'Ms. R. Patel', sub: 'English Lit.', av: 'RP' },
                  { name: 'Mr. T. Harris', sub: 'History', av: 'TH' },
              ].map((t, i) => (
                <div key={i} className={styles.teacherCard}>
                  <div className={styles.teacherAvatar}>{t.av}</div>
                  <div>
                    <h3 className={styles.teacherName}>{t.name}</h3>
                    <p className={styles.teacherSubject}>{t.sub}</p>
                  </div>
                  <button className={styles.bookBtn}>Book Slot</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Behavior & Conduct Tab ────────────────────────────────────────
  const renderConduct = () => (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Behavior & Conduct</h1>
        <p className={styles.pageSubtitle}>Track disciplinary records and student commendations</p>
      </div>

      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#1e8e3e' }}>
          <div className={styles.kpiLabel}>Commendations</div>
          <div className={styles.kpiValue}>4</div>
          <div className={styles.kpiSub} style={{ color: '#1e8e3e' }}>This Academic Year</div>
        </div>
        <div className={styles.kpiCard} style={{ borderLeftColor: '#d93025' }}>
          <div className={styles.kpiLabel}>Infractions</div>
          <div className={styles.kpiValue}>0</div>
          <div className={styles.kpiSub} style={{ color: '#1e8e3e' }}>Perfect Record</div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Conduct History</span>
        </div>
        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <div className={styles.timelineIcon} style={{ background: '#1e8e3e' }} />
            <div className={styles.timelineLine} />
            <div className={styles.timelineContent}>
              <span className={styles.timelineTime}>Mar 12, 2026</span>
              <span className={styles.timelineDesc} style={{ color: '#111827', fontWeight: 600 }}>Star of the Week</span>
              <span className={styles.timelineDesc} style={{ fontSize: '13px' }}>Awarded by Mrs. Davis for exceptional participation in Mathematics.</span>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <div className={styles.timelineIcon} style={{ background: '#f5a623' }} />
            <div className={styles.timelineLine} />
            <div className={styles.timelineContent}>
              <span className={styles.timelineTime}>Feb 05, 2026</span>
              <span className={styles.timelineDesc} style={{ color: '#111827', fontWeight: 600 }}>Uniform Notice</span>
              <span className={styles.timelineDesc} style={{ fontSize: '13px' }}>Reminded to wear proper sports uniform on physical education days.</span>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <div className={styles.timelineIcon} style={{ background: '#1e8e3e' }} />
            <div className={styles.timelineContent}>
              <span className={styles.timelineTime}>Nov 20, 2025</span>
              <span className={styles.timelineDesc} style={{ color: '#111827', fontWeight: 600 }}>Science Fair Winner</span>
              <span className={styles.timelineDesc} style={{ fontSize: '13px' }}>1st Place in the Middle School Science Fair Project.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Route ─────────────────────────────────────────────────────────
  if (activeView === 'attendance')    return renderAttendance();
  if (activeView === 'academics')     return renderAcademics();
  if (activeView === 'fees')          return renderFees();
  if (activeView === 'homework')      return renderHomework();
  if (activeView === 'ptm')           return renderPTM(); // Legacy link backup
  if (activeView === 'transport')     return renderTransport();
  if (activeView === 'settings')      return renderSettings();
  if (activeView === 'support')       return renderSupport();
  // New Module Routes:
  if (activeView === 'timetable')     return renderTimetable();
  if (activeView === 'communication') return renderCommunication();
  if (activeView === 'conduct')       return renderConduct();
  
  return renderOverview();
};

export default ParentDashboard;
