'use client';

import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Loader2, RefreshCw, Save, Users } from 'lucide-react';
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

function statusClass(status) {
  if (status === 'present') return styles.badgePresent;
  if (status === 'absent') return styles.badgeAbsent;
  if (status === 'late') return styles.badgeLate;
  if (status === 'leave') return styles.badgeLeave;
  return styles.badgeUnmarked;
}

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

  const { toasts, push, dismiss } = useToast();

  const students = useMemo(() => overview?.students || [], [overview]);

  const dayStatusByStudentId = useMemo(() => {
    const map = new Map();
    for (const rec of dayRecords) {
      map.set(rec.student?.id || rec.student_id, rec.status);
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
      const sid = rec.student?.id || rec.student_id;
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

  const cycleStatus = (studentId) => {
    const current = effectiveStatus(studentId);
    const idx = Math.max(STATUS_ORDER.indexOf(current), -1);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setEditedStatuses((prev) => ({ ...prev, [studentId]: next }));
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
          <h2 style={{ margin: 0 }}>Attendance</h2>
          <p className={styles.subtitle} style={{ marginTop: 6 }}>
            {section ? `${section.class_name || 'Class'} - Section ${section.name}` : 'Select a section'}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={load} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving || loading || !section?.id}>
            {saving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
            Save
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
              <option key={m} value={m}>{m}</option>
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
          <label>Warning Threshold</label>
          <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value || 0))} />
        </div>
      </div>

      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}><Users size={16} /> Total: <b>{daySummary.total}</b></div>
        <div className={styles.summaryItem}>Present: <b>{daySummary.present}</b></div>
        <div className={styles.summaryItem}>Absent: <b>{daySummary.absent}</b></div>
        <div className={styles.summaryItem}>Late: <b>{daySummary.late}</b></div>
        <div className={styles.summaryItem}>Leave: <b>{daySummary.leave}</b></div>
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
              <button className={styles.btnSm} onClick={() => setAll('present')} disabled={!section?.id}>All Present</button>
              <button className={styles.btnSm} onClick={() => setAll('absent')} disabled={!section?.id}>All Absent</button>
              <button className={styles.btnSm} onClick={() => setAll('late')} disabled={!section?.id}>All Late</button>
              <button className={styles.btnSm} onClick={() => setAll('leave')} disabled={!section?.id}>All Leave</button>
            </div>
          </div>

          {!section?.id ? (
            <div className={styles.empty}>Select a section from Dashboard first.</div>
          ) : loading ? (
            <div className={styles.empty}><Loader2 size={18} className={styles.spin} /> Loading...</div>
          ) : students.length === 0 ? (
            <div className={styles.empty}>No active students found in this section.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Roll</th>
                    <th>Student</th>
                    <th>Today</th>
                    <th>Month %</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const st = effectiveStatus(s.student_id);
                    return (
                      <tr key={s.student_id}>
                        <td className={styles.mono}>{s.roll_number || '-'}</td>
                        <td>
                          <b>{s.student_name}</b>
                          <div className={styles.subText}>{s.admission_number || ''}</div>
                        </td>
                        <td>
                          <button className={`${styles.badge} ${statusClass(st)}`} onClick={() => cycleStatus(s.student_id)}>
                            {statusLabel(st)}
                          </button>
                        </td>
                        <td>
                          <span className={s.low_attendance ? styles.low : styles.ok}>
                            {Number(s.percentage || 0).toFixed(1)}%
                          </span>
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
