'use client';

import React, { useMemo, useState } from 'react';
import { Download, Eye, Loader2, RefreshCw, Search, X } from 'lucide-react';
import styles from './Fees.module.css';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';
import StudentFees from '@/components/Student/StudentFees/StudentFees';

const FeesView = ({ section }) => {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | due | clear
  const [activeStudentId, setActiveStudentId] = useState(null);
  const { toasts, push, dismiss } = useToast();

  const load = async () => {
    if (!section?.id) return;
    try {
      setLoading(true);
      const res = await adminApi.getFeeSectionOverview({ section: section.id }).catch(() => null);
      setOverview(res?.data || null);
    } catch {
      push('Could not load fees overview', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id]);

  const rows = useMemo(() => Array.isArray(overview?.students) ? overview.students : [], [overview]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matches = !term || [
        r.student_name,
        String(r.roll_number || ''),
        String(r.admission_number || ''),
      ].some((x) => String(x || '').toLowerCase().includes(term));
      const due = Number(r.total_due || 0) > 0;
      const matchesFilter =
        filter === 'due' ? due :
        filter === 'clear' ? !due :
        true;
      return matches && matchesFilter;
    });
  }, [rows, search, filter]);

  const openStatement = (studentId) => {
    setActiveStudentId(studentId);
  };

  const exportCsv = () => {
    const header = ['Roll', 'Name', 'Admission', 'Total Fee', 'Paid', 'Due', 'Last Payment'];
    const data = filtered.map((r) => ([
      r.roll_number || '',
      r.student_name || '',
      r.admission_number || '',
      r.total_fee || 0,
      r.total_paid || 0,
      r.total_due || 0,
      r.last_payment_date || '',
    ]));
    const rowsCsv = [header, ...data].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([rowsCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `section-${section?.name || 'fees'}-fees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Fees Overview</h2>
          <p className={styles.subtitle} style={{ marginTop: 6 }}>
            {section ? `${section.class_name || 'Class'} - Section ${section.name}` : 'Select a section'}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={load} disabled={!section?.id || loading}><RefreshCw size={16} /> Refresh</button>
          <button className={styles.btn} onClick={exportCsv} disabled={!section?.id || filtered.length === 0}><Download size={16} /> Export</button>
        </div>
      </div>

      {!section?.id ? (
        <div className={styles.empty}>Select a section from Dashboard first.</div>
      ) : (
        <>
          <div className={styles.filters}>
            <div className={styles.searchWrap}>
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, roll, admission..." />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className={styles.select}>
              <option value="all">All</option>
              <option value="due">Fee Due</option>
              <option value="clear">Fee Clear</option>
            </select>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.cardHeader}>
              <b>Students</b>
              {loading && <span className={styles.loading}><Loader2 size={16} className={styles.spin} /> Loading...</span>}
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Roll</th>
                    <th>Student</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Last Payment</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className={styles.emptyRow}>No students match your filters.</td></tr>
                  ) : filtered.map((r) => (
                    <tr key={r.student_id}>
                      <td className={styles.mono}>{r.roll_number || '-'}</td>
                      <td><b>{r.student_name}</b><div className={styles.subText}>{r.admission_number}</div></td>
                      <td>{Number(r.total_fee || 0).toFixed(2)}</td>
                      <td>{Number(r.total_paid || 0).toFixed(2)}</td>
                      <td className={Number(r.total_due || 0) > 0 ? styles.due : styles.clear}>{Number(r.total_due || 0).toFixed(2)}</td>
                      <td>{r.last_payment_date || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className={styles.btnSm} onClick={() => openStatement(r.student_id)}><Eye size={14} /> Statement</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeStudentId && (
        <div className={styles.modalOverlay} onClick={() => setActiveStudentId(null)}>
          <div className={styles.modal} style={{ width: '90%', maxWidth: '1000px', padding: 0, overflow: 'hidden', height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ padding: '16px 24px', borderBottom: '1px solid var(--theme-border)', background: 'var(--theme-surface)' }}>
              <h3 style={{ margin: 0 }}>Fee Statement</h3>
              <button className={styles.modalClose} onClick={() => setActiveStudentId(null)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody} style={{ padding: 0, flex: 1, overflowY: 'auto', background: 'var(--theme-bg)' }}>
              <StudentFees providedStudentId={activeStudentId} />
            </div>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const Fees = ({ section }) => (
  <ErrorBoundary>
    <FeesView section={section} />
  </ErrorBoundary>
);

export default Fees;

