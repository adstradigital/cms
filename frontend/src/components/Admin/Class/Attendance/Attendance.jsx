'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Loader2, RefreshCw, Save, Send, Users, X } from 'lucide-react';
import styles from './Attendance.module.css';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

const STATUS_ORDER = ['present', 'absent', 'late', 'leave'];

function statusLabel(status) {
  if (status === 'present') return 'Present';
  if (status === 'absent') return 'Absent';
  if (status === 'late') return 'Late';
  if (status === 'leave') return 'Leave';
  return 'Unmarked';
}

const WarningModal = ({ student, threshold, onClose, onSent }) => {
  const [message, setMessage] = useState(
    `Warning: Attendance for ${student.student_name} has dropped to ${Number(student.percentage || 0).toFixed(1)}%, which is below the required threshold of ${threshold}%. Please ensure regular attendance to avoid further action.`
  );
  const [sending, setSending] = useState(false);
  const { push } = useToast();

  const handleSend = async () => {
    try {
      setSending(true);
      await adminApi.sendAttendanceWarning({
        student: student.student_id,
        message,
        threshold,
        attendance_percentage: student.percentage,
      });
      push('Warning sent successfully', 'success');
      onSent();
    } catch (err) {
      push('Failed to send warning', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle className={styles.warningIcon} size={20} />
            <h3 style={{ margin: 0 }}>Attendance Warning</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSubtitle}>Sending warning to <b>{student.student_name}</b> and their parents.</p>
          <div className={styles.formGroup}>
            <label>Warning Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className={styles.textarea}
            />
          </div>
          <div className={styles.modalStats}>
            <div>Percentage: <b>{Number(student.percentage || 0).toFixed(1)}%</b></div>
            <div>Threshold: <b>{threshold}%</b></div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={onClose} disabled={sending}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
            Send Warning
          </button>
        </div>
      </div>
    </div>
  );
};

const AttendanceView = ({ section }) => {
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [threshold, setThreshold] = useState(75);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState(null);
  const [dayRecords, setDayRecords] = useState([]);
  const [monthRecords, setMonthRecords] = useState([]);
  
  const [selectedWarningStudent, setSelectedWarningStudent] = useState(null);

  const { toasts, push, dismiss } = useToast();

  const students = useMemo(() => overview?.students || [], [overview]);

  const dayStatusByStudentId = useMemo(() => {
    const map = new Map();
    for (const rec of dayRecords) {
      const sid = rec.student?.id || rec.student_id || rec.student;
      map.set(sid, rec.status);
    }
    return map;
  }, [dayRecords]);

  const draftStatuses = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      map.set(s.student_id, dayStatusByStudentId.get(s.student_id) || '');
    }
    return map;
  }, [students, dayStatusByStudentId]);

  const [editedStatuses, setEditedStatuses] = useState(() => ({}));

  const effectiveStatus = (studentId) => editedStatuses[studentId] ?? draftStatuses.get(studentId) ?? '';

  const daySummary = useMemo(() => {
    const rows = students.map((s) => editedStatuses[s.student_id] ?? draftStatuses.get(s.student_id) ?? '');
    const total = rows.length;
    const present = rows.filter((x) => x === 'present').length;
    const absent = rows.filter((x) => x === 'absent').length;
    const late = rows.filter((x) => x === 'late').length;
    const leave = rows.filter((x) => x === 'leave').length;
    const unmarked = total - present - absent - late - leave;
    return { total, present, absent, late, leave, unmarked };
  }, [students, editedStatuses, draftStatuses]);

  const monthByDay = useMemo(() => {
    const map = new Map();
    for (const rec of monthRecords) {
      const dayKey = rec.date;
      const sid = rec.student?.id || rec.student_id || rec.student;
      if (!map.has(dayKey)) map.set(dayKey, new Map());
      map.get(dayKey).set(sid, rec.status);
    }
    return map;
  }, [monthRecords]);

  const monthDays = useMemo(() => {
    const y = Number(year);
    const m = Number(month);
    if (!y || !m) return [];
    const daysInMonth = new Date(y, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, idx) => String(idx + 1).padStart(2, '0'));
  }, [month, year]);

  const load = async () => {
    if (!section?.id) return;
    try {
      setLoading(true);
      const [ov, day, monthRes] = await Promise.all([
        adminApi.getAttendanceOverview({ section: section.id, month, year, threshold }).catch(() => null),
        adminApi.getAttendance({ section: section.id, date }).catch(() => null),
        adminApi.getAttendance({ section: section.id, month, year }).catch(() => null),
      ]);
      setOverview(ov?.data || null);
      setDayRecords(Array.isArray(day?.data) ? day.data : []);
      setMonthRecords(Array.isArray(monthRes?.data) ? monthRes.data : []);
      setEditedStatuses({});
    } catch (err) {
      push('Attendance could not be loaded', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id, month, year, threshold]);

  React.useEffect(() => {
    if (!section?.id) return;
    (async () => {
      try {
        setLoading(true);
        const day = await adminApi.getAttendance({ section: section.id, date }).catch(() => null);
        setDayRecords(Array.isArray(day?.data) ? day.data : []);
        setEditedStatuses({});
      } catch {
        push('Could not load day attendance', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id, date]);

  const setAll = (status) => {
    const next = {};
    for (const s of students) next[s.student_id] = status;
    setEditedStatuses(next);
  };

  const save = async () => {
    if (!section?.id || students.length === 0) return;
    try {
      setSaving(true);
      const records = students.map((s) => ({
        student_id: s.student_id,
        status: effectiveStatus(s.student_id) || 'present',
        remarks: '',
      }));
      await adminApi.bulkMarkAttendance({ section: section.id, date, records });
      push('Attendance saved', 'success');
      await load();
    } catch {
      push('Attendance could not be saved', 'error');
    } finally {
      setSaving(false);
    }
  };

  const monthCalendar = (
    <div className={styles.calendarCard}>
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={18} />
          <b>Monthly Calendar</b>
        </div>
      </div>
      <div className={styles.calendarGrid}>
        {monthDays.map((d) => {
          const key = `${year}-${String(month).padStart(2, '0')}-${d}`;
          const statuses = monthByDay.get(key);
          const marked = statuses ? statuses.size : 0;
          const total = students.length || 0;
          const ratio = total ? Math.round((marked / total) * 100) : 0;
          const isSelected = key === date;
          return (
            <button
              key={key}
              className={`${styles.calendarDay} ${isSelected ? styles.calendarDayActive : ''}`}
              onClick={() => setDate(key)}
              title={total ? `${marked}/${total} marked` : 'No students'}
            >
              <span className={styles.calendarDayNum}>{Number(d)}</span>
              <span className={styles.calendarDayMeta}>{ratio}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>
            {section ? `${section.class_name} — Section ${section.name} Attendance` : 'Attendance'}
          </h2>
          <p className={styles.subtitle} style={{ marginTop: 6 }}>
            {section 
              ? `Class Teacher: ${section.class_teacher_name || 'Not assigned'} • Manage daily attendance records` 
              : 'Select a section from Dashboard first'}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={load} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving || loading || !section?.id}>
            {saving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
            Save Attendance
          </button>
        </div>
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.controlGroup}>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className={styles.controlGroup}>
          <label>Month</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, idx) => String(idx + 1)).map((m) => (
              <option key={m} value={m}>{new Date(2025, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div className={styles.controlGroup}>
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            {Array.from({ length: 4 }, (_, idx) => String(new Date().getFullYear() - idx)).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className={styles.controlGroup}>
          <label>Warning Threshold (%)</label>
          <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value || 0))} />
        </div>
      </div>

      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}><Users size={16} /> Total: <b>{daySummary.total}</b></div>
        <div className={`${styles.summaryItem} ${styles.textSuccess}`}>Present: <b>{daySummary.present}</b></div>
        <div className={`${styles.summaryItem} ${styles.textDanger}`}>Absent: <b>{daySummary.absent}</b></div>
        <div className={`${styles.summaryItem} ${styles.textWarning}`}>Late: <b>{daySummary.late}</b></div>
        <div className={`${styles.summaryItem} ${styles.textInfo}`}>Leave: <b>{daySummary.leave}</b></div>
        <div className={styles.summaryItem}>Unmarked: <b>{daySummary.unmarked}</b></div>
      </div>

      <div className={styles.twoCol}>
        {monthCalendar}

        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={18} />
              <b>Mark Attendance</b>
            </div>
            <div className={styles.bulkBtns}>
              <button className={styles.btnSm} onClick={() => setAll('present')} disabled={!section?.id}>Mark All Present</button>
              <button className={styles.btnSm} onClick={() => setAll('')} disabled={!section?.id}>Reset All</button>
            </div>
          </div>

          {!section?.id ? (
            <div className={styles.empty}>Select a section from Dashboard first.</div>
          ) : loading ? (
            <div className={styles.empty}><Loader2 size={18} className={styles.spin} /> Loading students...</div>
          ) : students.length === 0 ? (
            <div className={styles.empty}>No active students found in this section.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Roll</th>
                    <th>Student Name</th>
                    <th>Select Status</th>
                    <th>Monthly %</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const st = effectiveStatus(s.student_id);
                    const isLow = s.low_attendance || (s.percentage < threshold);
                    return (
                      <tr key={s.student_id}>
                        <td className={styles.mono}>{s.roll_number || '-'}</td>
                        <td>
                          <div className={styles.studentCell}>
                            <div className={styles.studentName}>
                              {s.student_name}
                              {isLow && <AlertTriangle size={14} className={styles.warningIcon} title="Below Threshold" />}
                            </div>
                            <div className={styles.subText}>{s.admission_number || ''}</div>
                          </div>
                        </td>
                        <td>
                          <select
                            className={`${styles.statusSelect} ${st ? styles[`select-${st}`] : ''}`}
                            value={st}
                            onChange={(e) => setEditedStatuses(prev => ({ ...prev, [s.student_id]: e.target.value }))}
                          >
                            <option value="">Unmarked</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="leave">Leave</option>
                          </select>
                        </td>
                        <td>
                          <span className={isLow ? styles.low : styles.ok}>
                            {Number(s.percentage || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <button
                            className={`${styles.btnSm} ${isLow ? styles.btnWarn : ''}`}
                            title="Send Warning Pop-up"
                            onClick={() => setSelectedWarningStudent(s)}
                          >
                            <AlertTriangle size={14} /> Warning
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedWarningStudent && (
        <WarningModal
          student={selectedWarningStudent}
          threshold={threshold}
          onClose={() => setSelectedWarningStudent(null)}
          onSent={() => {
            setSelectedWarningStudent(null);
            load();
          }}
        />
      )}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const Attendance = ({ section }) => (
  <ErrorBoundary>
    <AttendanceView section={section} />
  </ErrorBoundary>
);

export default Attendance;
