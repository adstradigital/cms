'use client';

import React, { useState, useEffect } from 'react';
import { Clock, UserX, CalendarHeart, ClipboardCheck, Search, Filter, CheckCircle2, XCircle } from 'lucide-react';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';
import styles from './StaffHR.module.css';

const StaffHRView = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, leaves, reports
  const [loading, setLoading] = useState(false);
  const { toasts, push, dismiss } = useToast();

  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [attRes, levRes] = await Promise.all([
        adminApi.getStaffAttendance(),
        adminApi.getStaffLeaves()
      ]);
      setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
      setLeaves(Array.isArray(levRes.data) ? levRes.data : []);
    } catch (e) {
      push('Failed to load HR data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLeaveStatus = async (id, status) => {
    try {
      setLoading(true);
      await adminApi.updateStaffLeave(id, { status });
      push(`Leave request ${status}`, 'success');
      loadData();
    } catch (e) {
      push('Failed to update leave', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const todaysAttendance = attendance.filter(a => a.date === today);
  const presentCount = todaysAttendance.filter(a => a.status === 'present').length;
  const lateCount = todaysAttendance.filter(a => a.is_late).length;
  const leaveCount = todaysAttendance.filter(a => a.status === 'on_leave').length;

  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const pastLeaves = leaves.filter(l => l.status !== 'pending');

  const filteredAttendance = todaysAttendance.filter(a => 
    a.staff_name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderOverview = () => (
    <div className={styles.tabPanel}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#dcfce7', color: '#166534' }}>
            <ClipboardCheck size={20} />
          </div>
          <div className={styles.statInfo}>
             <h3>{presentCount}</h3>
             <p>Present Today</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#fef9c3', color: '#854d0e' }}>
            <Clock size={20} />
          </div>
          <div className={styles.statInfo}>
             <h3>{lateCount}</h3>
             <p>Late Arrivals</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#e0e7ff', color: '#3730a3' }}>
            <CalendarHeart size={20} />
          </div>
          <div className={styles.statInfo}>
             <h3>{leaveCount}</h3>
             <p>On Leave</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#fee2e2', color: '#991b1b' }}>
            <UserX size={20} />
          </div>
          <div className={styles.statInfo}>
             <h3>0</h3>
             <p>Unaccounted</p>
          </div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3>Today's Attendance</h3>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input 
              placeholder="Search staff..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Status</th>
              <th>In Time</th>
              <th>Out Time</th>
              <th>Late</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.length === 0 && (
              <tr><td colSpan={5} className={styles.emptyCell}>No records for today yet.</td></tr>
            )}
            {filteredAttendance.map(a => (
              <tr key={a.id}>
                <td className={styles.strongText}>{a.staff_name}</td>
                <td>
                  <span className={`${styles.badge} ${styles['badge_' + a.status]}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </td>
                <td>{a.in_time ? a.in_time.substring(0,5) : '--'}</td>
                <td>{a.out_time ? a.out_time.substring(0,5) : '--'}</td>
                <td>{a.is_late ? <span className={styles.lateTag}>Late</span> : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLeaves = () => (
    <div className={styles.tabPanel}>
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3>Pending Leave Requests ({pendingLeaves.length})</h3>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingLeaves.length === 0 && (
              <tr><td colSpan={6} className={styles.emptyCell}>No pending requests.</td></tr>
            )}
            {pendingLeaves.map(l => (
               <tr key={l.id}>
                 <td className={styles.strongText}>{l.staff_name}</td>
                 <td style={{textTransform:'capitalize'}}>{l.leave_type}</td>
                 <td className={styles.monoText}>{l.from_date}</td>
                 <td className={styles.monoText}>{l.to_date}</td>
                 <td className={styles.smallText}>{l.reason}</td>
                 <td>
                   <div className={styles.actionRow}>
                     <button className={styles.approveBtn} onClick={() => handleLeaveStatus(l.id, 'approved')} disabled={loading}>
                       <CheckCircle2 size={16} /> Approve
                     </button>
                     <button className={styles.rejectBtn} onClick={() => handleLeaveStatus(l.id, 'rejected')} disabled={loading}>
                       <XCircle size={16} /> Reject
                     </button>
                   </div>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.tableCard} style={{marginTop: 20}}>
        <div className={styles.tableHeader}>
          <h3>Leave History</h3>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Reviewed By</th>
            </tr>
          </thead>
          <tbody>
            {pastLeaves.length === 0 && (
              <tr><td colSpan={5} className={styles.emptyCell}>No leave history.</td></tr>
            )}
            {pastLeaves.map(l => (
               <tr key={l.id}>
                 <td className={styles.strongText}>{l.staff_name}</td>
                 <td style={{textTransform:'capitalize'}}>{l.leave_type}</td>
                 <td className={styles.monoText}>{l.from_date} to {l.to_date}</td>
                 <td>
                   <span className={`${styles.badge} ${styles['badge_' + l.status]}`}>
                     {l.status}
                   </span>
                 </td>
                 <td>{l.reviewed_by_name || '--'}</td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.tabsStrip}>
          <button className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabActive : ''}`} onClick={() => setActiveTab('overview')}>
            Today's Overview
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'leaves' ? styles.tabActive : ''}`} onClick={() => setActiveTab('leaves')}>
             Leave Approvals
             {pendingLeaves.length > 0 && <span className={styles.ping}>{pendingLeaves.length}</span>}
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.tabActive : ''}`} onClick={() => setActiveTab('reports')}>
            Monthly Reports
          </button>
        </div>
      </div>

      <div className={styles.contentArea}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'leaves' && renderLeaves()}
        {activeTab === 'reports' && (
          <div className={styles.emptyState}>
             <h3>Monthly Work Tracking</h3>
             <p>Generate downloadable payroll-integrated attendance reports here.</p>
             <button className={styles.primaryBtn}>Download Current Month</button>
          </div>
        )}
      </div>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default function StaffHR() {
  return (
    <ErrorBoundary>
      <StaffHRView />
    </ErrorBoundary>
  );
}
