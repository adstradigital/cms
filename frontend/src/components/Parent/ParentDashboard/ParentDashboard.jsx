'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  User as UserIcon,
  Download,
  AlertCircle,
  Clock,
  ArrowRight,
  BookOpen,
  Calendar,
  Truck,
  CheckCircle,
  FileText,
  Search,
  Bell,
  Star,
  Activity,
  Zap,
  ChevronRight,
  Award,
  Circle,
  Wallet
} from 'lucide-react';
import parentApi from '@/api/parentApi';
import styles from './ParentDashboard.module.css';

const Shimmer = () => <div className={styles.shimmer} />;

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
  const [childLoading, setChildLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      const [statsRes, childrenRes] = await Promise.all([
        parentApi.getStats().catch(e => ({ data: null })),
        parentApi.getChildren().catch(e => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      const childrenList = childrenRes.data || [];
      setChildren(childrenList);
      if (childrenList.length > 0) {
        const firstChild = childrenList[0];
        setSelectedChild(firstChild);
        fetchChildSpecificData(firstChild.id);
      }
    } catch (err) {
      setError('System unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildSpecificData = async (childId) => {
    setChildLoading(true);
    try {
      parentApi.getChildProgress(childId).then(res => setAcademicData(res.data)).catch(() => {});
      parentApi.getFees(childId).then(res => setFeeData(res.data)).catch(() => {});
      parentApi.getAttendance(childId).then(res => setAttendanceData(res.data)).catch(() => {});
      parentApi.getHomework(childId).then(res => setHomeworkData(res.data)).catch(() => {});
    } finally {
      setChildLoading(false);
    }
  };

  const handleChildChange = (child) => {
    setSelectedChild(child);
    setAcademicData(null); setFeeData(null); setAttendanceData(null); setHomeworkData(null);
    fetchChildSpecificData(child.id);
  };

  const navigateTo = (tab) => router.push(`/parent?tab=${tab}`);

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 1) : 'T';

  const getThemeClass = (view) => {
    switch(view) {
      case 'academics': return styles.academicsTheme;
      case 'attendance': return styles.attendanceTheme;
      case 'homework': return styles.homeworkTheme;
      case 'fees': return styles.feesTheme;
      default: return styles.overviewTheme;
    }
  };

  // ─── VIEW RENDERERS ───────────────────────────────────────

  const renderOverview = () => {
    const attendancePct = stats?.attendance_percentage || 100;
    
    return (
      <div className={styles.fullWidthLayout}>
        {/* ─── Top Dark Hero Section ─── */}
        <div className={styles.darkHero} style={{ '--attendance-pct': `${attendancePct}%` }}>
          <div className={styles.gaugeContainer}>
            <div className={styles.circularGauge}>
              <div className={styles.gaugeText}>
                <span className={styles.gaugeValue}>{attendancePct}%</span>
                <span className={styles.gaugeLabel}>Attendance</span>
              </div>
            </div>
          </div>
          
          <div className={styles.heroStatsRow}>
             <div className={styles.heroStatItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Activity size={16} color="#eab308" />
                   </div>
                   <span className={styles.heroStatValue}>{academicData?.gpa_trends?.[0]?.percentage || '0.0'}%</span>
                </div>
                <span className={styles.heroStatLabel}>Academic Avg. Score</span>
             </div>

             <div className={styles.heroStatItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={16} color="#6366f1" />
                   </div>
                   <span className={styles.heroStatValue}>${feeData?.summary?.total_pending || 0}</span>
                </div>
                <span className={styles.heroStatLabel}>Pending Fees</span>
             </div>

             <div className={styles.heroStatItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(129, 140, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={16} color="#818cf8" />
                   </div>
                   <span className={styles.heroStatValue}>Needs Review</span>
                </div>
                <span className={styles.heroStatLabel}>Academic Standing</span>
             </div>
          </div>
        </div>

        {/* ─── Analytics Layer ─── */}
        <div className={styles.analyticsLayer}>
          {/* Academic Performance Index */}
          <div className={styles.analyticsCard}>
             <div className={styles.analyticsHeader}>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Academic Performance Index</h3>
                <TrendingUp size={16} color="#94a3b8" />
             </div>
             <div className={styles.scoreIndexList}>
                {(academicData?.results?.slice(0, 5) || []).map((res, i) => (
                  <div key={i} className={styles.scoreIndexItem}>
                     <span className={styles.scoreVal}>{res.marks_obtained}</span>
                     <div className={styles.scoreBar}>
                        <div className={styles.scoreFill} style={{ height: `${res.marks_obtained}%` }} />
                     </div>
                     <span className={styles.scoreSubject}>{res.subject_name.slice(0, 4).toUpperCase()}</span>
                  </div>
                ))}
                {(!academicData?.results || academicData.results.length === 0) && <p className={styles.emptyState}>No data</p>}
             </div>
          </div>

          {/* Attendance Velocity */}
          <div className={styles.analyticsCard}>
             <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px' }}>Attendance Velocity</h3>
             <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', height: '100%', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                   {/* Simulating the velocity curve/points */}
                   <div style={{ position: 'absolute', bottom: '40%', left: '20%', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }} />
                   <div style={{ position: 'absolute', bottom: '60%', left: '40%', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }} />
                   <div style={{ position: 'absolute', bottom: '50%', left: '60%', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }} />
                </div>
             </div>
             <div className={styles.legendList}>
                <div className={styles.legendItem}><span className={styles.statusDot} style={{ background: '#10b981' }}/> Present</div>
                <div className={styles.legendItem}><span className={styles.statusDot} style={{ background: '#f59e0b' }}/> Leave</div>
                <div className={styles.legendItem}><span className={styles.statusDot} style={{ background: '#ef4444' }}/> Absent</div>
             </div>
          </div>

          {/* Student Profile Context */}
          <div className={styles.studentContextCard}>
             <div className={styles.initialCircle}>
                {getInitials(selectedChild?.full_name)}
             </div>
             <div className={styles.studentContextInfo}>
                <h3>{selectedChild?.full_name || 'Test Student'}</h3>
                <p>Roll: 101 • Class Grade 10</p>
             </div>
             <div className={styles.contextDetails}>
                <div className={styles.detailRow}>
                   <span className={styles.detailLabel}>Adm. No</span>
                   <span className={styles.detailVal}>ADM-2026-001</span>
                </div>
                <div className={styles.detailRow}>
                   <span className={styles.detailLabel}>Section</span>
                   <span className={styles.detailVal}>A</span>
                </div>
                <div className={styles.detailRow}>
                   <span className={styles.detailLabel}>Contact</span>
                   <span className={styles.detailVal}>---</span>
                </div>
             </div>
          </div>
        </div>

        {/* ─── Bottom Actions Strip ─── */}
        <div className={styles.bottomActionStrip}>
           <div className={styles.miniActionCard} onClick={() => navigateTo('academics')}>
              <div className={styles.actionIconWrap}><Calendar size={20} /></div>
              <div>
                 <div style={{ fontWeight: '700', fontSize: '14px' }}>Timetable</div>
                 <div style={{ fontSize: '11px', color: '#94a3b8' }}>View schedule</div>
              </div>
           </div>
           <div className={styles.miniActionCard} onClick={() => navigateTo('attendance')}>
              <div className={styles.actionIconWrap}><CheckCircle size={20} /></div>
              <div>
                 <div style={{ fontWeight: '700', fontSize: '14px' }}>Attendance</div>
                 <div style={{ fontSize: '11px', color: '#94a3b8' }}>Review logs</div>
              </div>
           </div>
           <div className={styles.miniActionCard} onClick={() => navigateTo('fees')}>
              <div className={styles.actionIconWrap}><Wallet size={20} /></div>
              <div>
                 <div style={{ fontWeight: '700', fontSize: '14px' }}>Fees</div>
                 <div style={{ fontSize: '11px', color: '#94a3b8' }}>Billing history</div>
              </div>
           </div>
           
           <div className={styles.eventWidget}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={18} /></div>
                 <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>Annual Sports Day</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>Dec 12 • Stadium Complex</div>
                 </div>
              </div>
              <button className={styles.notifyBtn}><Bell size={14} /> Notify</button>
           </div>
        </div>
      </div>
    );
  };

  const renderAcademics = () => (
    <div className={styles.fullWidthLayout}>
      <div className={styles.academicsHero}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Performance Overview</h2>
            <p style={{ color: '#64748b' }}>Live tracking of {selectedChild?.full_name}'s academic journey</p>
          </div>
          <div style={{ textAlign: 'right' }}>
             <span style={{ fontSize: '12px', color: '#64748b' }}>Latest Average</span>
             <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#6366f1' }}>{academicData?.gpa_trends?.[0]?.percentage || 0}%</h3>
          </div>
        </div>
        <div style={{ height: '200px', display: 'flex', gap: '32px', alignItems: 'flex-end' }}>
           {academicData?.gpa_trends?.map((t, i) => (
             <div key={i} style={{ flex: 1, position: 'relative' }}>
                <div style={{ height: `${t.percentage}%`, background: 'rgba(99, 102, 241, 0.1)', border: '2px solid #6366f1', borderRadius: '12px' }} />
                <div style={{ marginTop: '12px', fontSize: '11px', fontWeight: '700', textAlign: 'center' }}>{t.exam_name}</div>
             </div>
           ))}
        </div>
      </div>
      
      <div className={styles.subjectGrid}>
         {academicData?.results?.map((res, i) => (
           <div key={i} className={styles.subjectCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                 <div style={{ width: '40px', height: '40px', background: '#eef2ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}><Star size={20}/></div>
                 <span style={{ fontSize: '20px', fontWeight: '800' }}>{res.marks_obtained}</span>
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{res.subject_name}</h4>
              <div className={styles.gradeBar}><div className={styles.gradeFill} style={{ width: `${res.marks_obtained}%` }} /></div>
              <p style={{ fontSize: '11px', color: '#64748b' }}>Term Average: 78% • Status: Excellent</p>
           </div>
         ))}
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className={styles.attendanceContent}>
      <div className={styles.timelineContainer}>
         <h2 style={{ marginBottom: '32px' }}>Presence Logs</h2>
         <div className={styles.timelineList}>
            {attendanceData?.logs?.map((log, i) => (
              <div key={i} className={styles.timelineItem}>
                 <div className={`${styles.timelineDot} ${styles[log.status]}`} />
                 <div className={styles.timelineInfo}>
                    <strong style={{ display: 'block', fontSize: '16px' }}>{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</strong>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{log.subject} • Logged at 08:30 AM</span>
                 </div>
                 <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <span className={styles.statusName} style={{ fontWeight: '700', textTransform: 'capitalize' }}>{log.status}</span>
                 </div>
              </div>
            ))}
         </div>
      </div>
      <div className={styles.sideSummary}>
         <div className={styles.card} style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ width: '120px', height: '120px', border: '12px solid #10b981', borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <span style={{ fontSize: '24px', fontWeight: '800' }}>{stats?.attendance_percentage}%</span>
            </div>
            <h4>Monthly Status</h4>
            <p style={{ fontSize: '13px', color: '#64748b' }}>{selectedChild?.full_name} has missed 2 days this month.</p>
         </div>
      </div>
    </div>
  );

  const renderHomework = () => (
    <div className={styles.fullWidthLayout}>
      <h2 style={{ marginBottom: '8px' }}>Homework Taskboard</h2>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>Manage upcoming assignments and project deadlines</p>
      
      <div className={styles.homeworkGrid}>
         {homeworkData?.homework?.map((h) => (
           <div key={h.id} className={styles.taskCard}>
              <div className={`${styles.taskTag} ${new Date(h.due_date) < new Date(Date.now() + 86400000) ? styles.tagUrgent : styles.tagNormal}`}>
                 {new Date(h.due_date) < new Date(Date.now() + 86400000) ? 'Due Soon' : 'Upcoming'}
              </div>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{h.title}</h4>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>{h.description || 'No description provided by teacher.'}</p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="#6366f1"/>
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>{h.subject}</span>
                 </div>
                 {h.has_submission ? <span className={styles.submittedBadge}>Submitted</span> : <button className={styles.viewMoreBtn}>Submit Work</button>}
              </div>
           </div>
         ))}
      </div>
    </div>
  );

  const renderFees = () => (
    <div className={styles.fullWidthLayout}>
      <div className={styles.feesHero}>
         <div>
            <div className={styles.balanceTitle}>Oustanding Balance</div>
            <div className={styles.balanceValue}>${feeData?.summary?.total_pending || 0}</div>
         </div>
         <button style={{ background: '#f59e0b', color: '#1e293b', border: 'none', padding: '16px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }}>
            PAY ALL DUES
         </button>
      </div>

      <div className={styles.card} style={{ padding: '0' }}>
         <table className={styles.ledgerTable}>
            <thead>
               <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: '20px' }}>Billing Category</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ padding: '20px', textAlign: 'right' }}>Action</th>
               </tr>
            </thead>
            <tbody>
               {feeData?.ledger?.map((item, i) => (
                 <tr key={i} className={styles.ledgerRow}>
                    <td style={{ padding: '20px' }}><strong>{item.category}</strong></td>
                    <td>${item.amount}</td>
                    <td>{item.due_date}</td>
                    <td><span className={`${styles.statusDot} ${styles[item.status]}`} style={{ marginRight: '8px' }}/> {item.status}</td>
                    <td style={{ padding: '20px', textAlign: 'right' }}>
                       <button className={styles.viewMoreBtn}>Pay Now</button>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );

  if (loading) return <div className={styles.container}><div className={styles.shimmer}/></div>;

  return (
    <div className={`${styles.container} ${getThemeClass(activeView)}`}>
      {/* ─── Shared Header ─────────────────────────────────────── */}
      <div className={styles.topHeader}>
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input type="text" placeholder="Search student records..." />
        </div>
        <div className={styles.topActions}>
          <button className={styles.iconBtn}><Bell size={20} /></button>
          <div className={styles.userProfile}>
            <div className={styles.userAvatar}>{getInitials(stats?.parent_name)}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{stats?.parent_name || 'Parent'}</span>
              <span className={styles.userRole}>Guardian Access</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.childHeader}>
        <div className={styles.childTabs}>
          {children.map((child) => (
            <button 
              key={child.id}
              className={`${styles.childTab} ${selectedChild?.id === child.id ? styles.activeChildTab : ''}`}
              onClick={() => handleChildChange(child)}
            >
              <UserIcon size={18} />
              {child.full_name}
            </button>
          ))}
        </div>
        <div className={styles.academicYear}>Session 2026-27</div>
      </div>

      {/* ─── Conditionally Rendered Module ─────────────────────── */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'academics' && renderAcademics()}
      {activeView === 'attendance' && renderAttendance()}
      {activeView === 'homework' && renderHomework()}
      {activeView === 'fees' && renderFees()}
    </div>
  );
};

export default ParentDashboard;
