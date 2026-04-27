'use client';

import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/api/adminApi';
import styles from './AtRiskDashboard.module.css';

const REASON_LABELS = {
  low_attendance: 'Low Attendance',
  low_marks: 'Low Marks',
};

export default function AtRiskDashboard({ sectionId, examId, schoolId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [filter, setFilter] = useState('unresolved'); // 'unresolved' | 'resolved' | 'all'
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (sectionId) params.section_id = sectionId;
      if (schoolId) params.school_id = schoolId;
      if (examId) params.exam_id = examId;
      if (filter !== 'all') params.resolved = filter === 'resolved';

      const res = await adminApi.getAtRiskRecords(params);
      setRecords(res.data.records || []);
    } catch {
      showToast('Failed to load at-risk records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [sectionId, schoolId, examId, filter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSweep = async () => {
    if (!schoolId || !examId) {
      showToast('School and exam context required to run sweep.', 'error');
      return;
    }
    setSweeping(true);
    try {
      const res = await adminApi.runSchoolAtRiskSweep({ school_id: schoolId, exam_id: examId });
      showToast(`Sweep complete — ${res.data.total_flagged} student(s) flagged across ${res.data.sections_swept} section(s).`);
      fetchRecords();
    } catch {
      showToast('Sweep failed.', 'error');
    } finally {
      setSweeping(false);
    }
  };

  const handleResolve = async (recordId) => {
    setResolving(recordId);
    try {
      await adminApi.resolveAtRiskRecord(recordId);
      showToast('Record marked as resolved.');
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, resolved: true } : r));
    } catch {
      showToast('Failed to resolve record.', 'error');
    } finally {
      setResolving(null);
    }
  };

  const stats = {
    total: records.length,
    attendance: records.filter(r => r.reasons?.includes('low_attendance')).length,
    marks: records.filter(r => r.reasons?.includes('low_marks')).length,
    both: records.filter(r => r.reasons?.length >= 2).length,
  };

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>
      )}

      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>At-Risk Students</h2>
          <p className={styles.subtitle}>Students flagged for low attendance or performance</p>
        </div>
        <button
          className={styles.sweepBtn}
          onClick={handleSweep}
          disabled={sweeping}
        >
          {sweeping ? 'Running…' : 'Run School Sweep'}
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{stats.total}</span>
          <span className={styles.statLabel}>Total Flagged</span>
        </div>
        <div className={`${styles.statCard} ${styles.statAttendance}`}>
          <span className={styles.statNum}>{stats.attendance}</span>
          <span className={styles.statLabel}>Low Attendance</span>
        </div>
        <div className={`${styles.statCard} ${styles.statMarks}`}>
          <span className={styles.statNum}>{stats.marks}</span>
          <span className={styles.statLabel}>Low Marks</span>
        </div>
        <div className={`${styles.statCard} ${styles.statBoth}`}>
          <span className={styles.statNum}>{stats.both}</span>
          <span className={styles.statLabel}>Both Risks</span>
        </div>
      </div>

      <div className={styles.filterRow}>
        {['unresolved', 'resolved', 'all'].map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : records.length === 0 ? (
        <div className={styles.empty}>No {filter === 'all' ? '' : filter} records found.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Section</th>
                <th>Attendance</th>
                <th>Marks</th>
                <th>Risks</th>
                <th>Flagged On</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id} className={record.resolved ? styles.resolvedRow : ''}>
                  <td className={styles.studentName}>{record.student_name}</td>
                  <td>{record.section || '—'}</td>
                  <td>
                    <span className={
                      record.attendance_pct < 60 ? styles.danger :
                      record.attendance_pct < 75 ? styles.warning : styles.ok
                    }>
                      {record.attendance_pct?.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    {record.marks_pct != null ? (
                      <span className={record.marks_pct < 40 ? styles.danger : styles.ok}>
                        {record.marks_pct?.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div className={styles.chips}>
                      {record.reasons?.map(r => (
                        <span key={r} className={`${styles.chip} ${styles[r.replace('_', '')]}`}>
                          {REASON_LABELS[r] || r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={styles.muted}>{record.flagged_on}</td>
                  <td>
                    {record.resolved ? (
                      <span className={styles.resolvedBadge}>Resolved</span>
                    ) : (
                      <span className={styles.openBadge}>Open</span>
                    )}
                  </td>
                  <td>
                    {!record.resolved && (
                      <button
                        className={styles.resolveBtn}
                        onClick={() => handleResolve(record.id)}
                        disabled={resolving === record.id}
                      >
                        {resolving === record.id ? '…' : 'Resolve'}
                      </button>
                    )}
                    {record.resolved && (
                      <span className={styles.muted}>{record.resolved_by || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
