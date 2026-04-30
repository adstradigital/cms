'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, RefreshCcw, Save, Search } from 'lucide-react';

import transportApi from '@/api/transportApi';
import styles from '../transport.module.css';

const toLocalISODate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const asList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const asTimeInput = (value) => {
  const raw = String(value || '');
  if (!raw) return '';
  if (raw.length >= 5) return raw.slice(0, 5);
  return raw;
};

export default function AttendanceTab({ students = [], routes = [], onRefresh }) {
  const [date, setDate] = useState(() => toLocalISODate(new Date()));
  const [routeId, setRouteId] = useState('');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!routeId && routes.length) setRouteId(String(routes[0].id));
  }, [routeId, routes]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = students || [];

    if (routeId) list = list.filter((s) => String(s.route) === String(routeId));

    if (q) {
      list = list.filter((s) => {
        const studentName = String(s.student_name || '').toLowerCase();
        const stopName = String(s.stop_name || '').toLowerCase();
        return studentName.includes(q) || stopName.includes(q);
      });
    }

    return [...list].sort((a, b) => String(a.student_name || '').localeCompare(String(b.student_name || '')));
  }, [students, routeId, search]);

  const logByStudent = useMemo(() => {
    const map = new Map();
    asList(logs).forEach((log) => {
      if (log?.student) map.set(Number(log.student), log);
    });
    return map;
  }, [logs]);

  const loadLogs = useCallback(async () => {
    if (!routeId || !date) {
      setLogs([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await transportApi.getStudentLogs({ date, route: routeId });
      setLogs(asList(res.data));
    } catch (err) {
      console.error('Failed to load transport logs', err);
      setError('Unable to load boarding/exiting logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [date, routeId]);

  useEffect(() => {
    setEdits({});
    loadLogs();
  }, [loadLogs]);

  const setEdit = (studentId, key, value) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [key]: value,
      },
    }));
  };

  const saveAll = async () => {
    if (!routeId || !date) return;

    const items = [];
    for (const allocation of filteredStudents) {
      const studentId = Number(allocation.student);
      const log = logByStudent.get(studentId);

      const originalBoard = asTimeInput(log?.boarding_time);
      const originalExit = asTimeInput(log?.exiting_time);

      const edit = edits[studentId] || {};
      const nextBoard = asTimeInput(edit.boarding_time ?? originalBoard);
      const nextExit = asTimeInput(edit.exiting_time ?? originalExit);

      const changed = nextBoard !== originalBoard || nextExit !== originalExit;
      if (!changed) continue;

      const shouldSend = !!log || !!nextBoard || !!nextExit;
      if (!shouldSend) continue;

      items.push({
        student: studentId,
        boarding_time: nextBoard || null,
        exiting_time: nextExit || null,
      });
    }

    if (!items.length) return;

    setSaving(true);
    setError('');
    try {
      await transportApi.bulkUpsertStudentLogs({
        date,
        route: Number(routeId),
        items,
      });
      setEdits({});
      await loadLogs();
    } catch (err) {
      console.error('Failed to save transport logs', err);
      setError(err?.response?.data?.error || 'Failed to save logs.');
    } finally {
      setSaving(false);
    }
  };

  const refreshAll = async () => {
    try {
      await onRefresh?.();
    } finally {
      await loadLogs();
    }
  };

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 10, color: '#1e293b' }}>
              <Clock3 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Transport Attendance</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', margin: 0 }}>
                Track boarding & exiting time per student for a date and route.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.secondaryBtn} style={{ marginTop: 0 }} onClick={refreshAll} disabled={loading || saving}>
              <RefreshCcw size={15} /> Refresh
            </button>
            <button className={styles.primaryBtn} style={{ marginTop: 0 }} onClick={saveAll} disabled={!hasEdits || saving || loading}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className={styles.filterBar}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <select value={routeId} onChange={(e) => setRouteId(e.target.value)} style={{ minWidth: 220 }}>
            {!routes.length && <option value="">No routes</option>}
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--t-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or stop..."
              aria-label="Search students"
              style={{ paddingLeft: 32, minWidth: 260 }}
            />
          </div>

          <div className={styles.filterSpacer} />

          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
            Showing {filteredStudents.length} students
          </span>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {loading && <div className={styles.loading}>Loading logs...</div>}

        {!loading && routeId && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Stop</th>
                  <th>Boarding Time</th>
                  <th>Exiting Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const studentId = Number(s.student);
                  const log = logByStudent.get(studentId);
                  const edit = edits[studentId] || {};
                  const boardingTime = asTimeInput(edit.boarding_time ?? log?.boarding_time);
                  const exitingTime = asTimeInput(edit.exiting_time ?? log?.exiting_time);

                  return (
                    <tr key={s.id || studentId}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <strong>{s.student_name || '—'}</strong>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>Student ID: {studentId}</span>
                        </div>
                      </td>
                      <td>{s.stop_name || '—'}</td>
                      <td>
                        <input
                          className={styles.formInput}
                          type="time"
                          value={boardingTime || ''}
                          onChange={(e) => setEdit(studentId, 'boarding_time', e.target.value)}
                          style={{ maxWidth: 140 }}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.formInput}
                          type="time"
                          value={exitingTime || ''}
                          onChange={(e) => setEdit(studentId, 'exiting_time', e.target.value)}
                          style={{ maxWidth: 140 }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredStudents.length && <p className={styles.empty}>No students assigned to this route.</p>}
          </div>
        )}

        {!routeId && !loading && <p className={styles.empty}>Select a route to view and mark logs.</p>}
      </div>
    </section>
  );
}
