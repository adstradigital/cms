'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Clock3, MailWarning, Search, UserCheck, UserX } from 'lucide-react';
import styles from './AttendenceStdAd.module.css';

const API_BASE = 'http://127.0.0.1:8000/api';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
}

export default function AttendenceStdAd() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [threshold, setThreshold] = useState(75);
  const [section, setSection] = useState('');
  const [sections, setSections] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningSending, setWarningSending] = useState(false);

  const fetchSections = async () => {
    try {
      const res = await fetch(`${API_BASE}/students/sections/`, { headers: authHeaders() });
      if (!res.ok) return;
      setSections(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        threshold: String(threshold),
      });
      if (section) params.set('section', section);
      const res = await fetch(`${API_BASE}/attendance/admin/overview/?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load attendance overview');
      const data = await res.json();
      setOverview(data);
      if (!selectedStudentId && data.students?.length) {
        setSelectedStudentId(data.students[0].student_id);
      }
    } catch (e) {
      console.error(e);
      alert('Could not load attendance overview.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetail = async () => {
    if (!selectedStudentId) return;
    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        threshold: String(threshold),
      });
      const res = await fetch(`${API_BASE}/attendance/admin/student/${selectedStudentId}/?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load student detail');
      setStudentDetail(await res.json());
    } catch (e) {
      console.error(e);
      setStudentDetail(null);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, threshold, section]);

  useEffect(() => {
    fetchStudentDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, month, year, threshold]);

  const filteredStudents = useMemo(() => {
    const rows = overview?.students || [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter((row) =>
      `${row.student_name} ${row.admission_number || ''} ${row.class_name || ''} ${row.section_name || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [overview, search]);

  const sendWarning = async () => {
    if (!selectedStudentId) return;
    const fallback = `Your attendance is below ${threshold}%. Please improve attendance immediately.`;
    const message = warningMessage.trim() || fallback;
    try {
      setWarningSending(true);
      const percentage = studentDetail?.summary?.percentage ?? null;
      const res = await fetch(`${API_BASE}/attendance/admin/warnings/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: selectedStudentId,
          threshold,
          attendance_percentage: percentage,
          message,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send warning');
      }
      setWarningMessage('');
      await fetchStudentDetail();
      await fetchOverview();
      alert('Attendance warning sent.');
    } catch (e) {
      console.error(e);
      alert(`Warning failed: ${e.message}`);
    } finally {
      setWarningSending(false);
    }
  };

  const s = overview?.summary;

  return (
    <div className={styles.wrapper}>
      <div className={styles.topControls}>
        <div className={styles.controlGroup}>
          <label>Month</label>
          <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(Number(e.target.value || 1))} />
        </div>
        <div className={styles.controlGroup}>
          <label>Year</label>
          <input type="number" min="2020" value={year} onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))} />
        </div>
        <div className={styles.controlGroup}>
          <label>Low % Threshold</label>
          <input type="number" min="1" max="100" value={threshold} onChange={(e) => setThreshold(Number(e.target.value || 75))} />
        </div>
        <div className={styles.controlGroup}>
          <label>Section</label>
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>{sec.school_class_name || 'Class'} - {sec.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search student / admission / class"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.cards}>
        <SummaryCard icon={<Calendar size={18} />} title="Overall Attendance" value={`${s?.overall_percentage ?? 0}%`} />
        <SummaryCard icon={<UserCheck size={18} />} title="Present Today" value={s?.present_today ?? 0} />
        <SummaryCard icon={<UserX size={18} />} title="Absent Today" value={s?.absent_today ?? 0} />
        <SummaryCard icon={<AlertTriangle size={18} />} title="Low Attendance" value={s?.low_attendance_count ?? 0} danger />
      </div>

      <div className={styles.layout}>
        <div className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <h3>Student Attendance List</h3>
            <span>{loading ? 'Loading...' : `${filteredStudents.length} students`}</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Present/Total</th>
                  <th>%</th>
                  <th>Leaves</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((row) => (
                  <tr
                    key={row.student_id}
                    className={`${styles.row} ${selectedStudentId === row.student_id ? styles.rowActive : ''}`}
                    onClick={() => setSelectedStudentId(row.student_id)}
                  >
                    <td>
                      <div className={styles.studentBlock}>
                        <strong>{row.student_name}</strong>
                        <span>{row.admission_number || '-'}</span>
                      </div>
                    </td>
                    <td>{row.class_name || '-'} {row.section_name ? `(${row.section_name})` : ''}</td>
                    <td>{row.present}/{row.total}</td>
                    <td>
                      <span className={row.low_attendance ? styles.badgeDanger : styles.badgeOk}>
                        {row.percentage}%
                      </span>
                    </td>
                    <td>{row.pending_leave_requests}</td>
                    <td>{row.warnings_sent}</td>
                  </tr>
                ))}
                {!filteredStudents.length && (
                  <tr>
                    <td colSpan="6" className={styles.empty}>No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.detailPanel}>
          {!studentDetail ? (
            <div className={styles.empty}>Select a student to view details.</div>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <h3>{studentDetail.student?.name}</h3>
                <span>{studentDetail.student?.class_name || '-'} {studentDetail.student?.section_name || ''}</span>
              </div>

              <div className={styles.detailCards}>
                <MiniMetric icon={<CheckCircle2 size={14} />} label="Present" value={studentDetail.summary?.present ?? 0} />
                <MiniMetric icon={<UserX size={14} />} label="Absent" value={studentDetail.summary?.absent ?? 0} />
                <MiniMetric icon={<Clock3 size={14} />} label="Late" value={studentDetail.summary?.late ?? 0} />
                <MiniMetric icon={<MailWarning size={14} />} label="Attendance %" value={`${studentDetail.summary?.percentage ?? 0}%`} />
              </div>

              <div className={styles.contactBlock}>
                <h4>Student / Parent Contacts</h4>
                <p>Student: {studentDetail.student?.student_phone || '-'} | {studentDetail.student?.student_email || '-'}</p>
                <p>Parent: {studentDetail.student?.parent_phone || '-'} | {studentDetail.student?.parent_email || '-'}</p>
              </div>

              <div className={styles.warningBlock}>
                <h4>Send Attendance Warning (Admin/Class Teacher)</h4>
                <textarea
                  placeholder={`Default: below ${threshold}% warning`}
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                />
                <button onClick={sendWarning} disabled={warningSending}>
                  {warningSending ? 'Sending...' : 'Send Warning'}
                </button>
              </div>

              <div className={styles.section}>
                <h4>Leave Requests</h4>
                <ul>
                  {(studentDetail.leave_requests || []).slice(0, 8).map((l) => (
                    <li key={l.id}>
                      <span>{l.from_date} to {l.to_date}</span>
                      <strong className={l.status === 'pending' ? styles.pending : l.status === 'approved' ? styles.approved : styles.rejected}>
                        {l.status}
                      </strong>
                    </li>
                  ))}
                  {!studentDetail.leave_requests?.length && <li className={styles.emptyInline}>No leave requests</li>}
                </ul>
              </div>

              <div className={styles.section}>
                <h4>Attendance Warnings Sent</h4>
                <ul>
                  {(studentDetail.warnings || []).slice(0, 8).map((w) => (
                    <li key={w.id}>
                      <span>{new Date(w.created_at).toLocaleString()}</span>
                      <small>{w.message}</small>
                    </li>
                  ))}
                  {!studentDetail.warnings?.length && <li className={styles.emptyInline}>No warnings sent</li>}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, value, danger = false }) {
  return (
    <div className={styles.card}>
      <div className={`${styles.cardIcon} ${danger ? styles.cardDanger : ''}`}>{icon}</div>
      <div>
        <div className={styles.cardTitle}>{title}</div>
        <div className={styles.cardValue}>{value}</div>
      </div>
    </div>
  );
}

function MiniMetric({ icon, label, value }) {
  return (
    <div className={styles.miniMetric}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
