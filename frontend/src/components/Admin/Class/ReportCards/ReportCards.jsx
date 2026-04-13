'use client';

import React, { useMemo, useState } from 'react';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import styles from './ReportCards.module.css';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { ToastStack, useToast } from '@/components/common/useToast';

const ReportCardsView = ({ section }) => {
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [rows, setRows] = useState([]);
  const [confirmCalcOpen, setConfirmCalcOpen] = useState(false);
  const { toasts, push, dismiss } = useToast();

  const classId = section?.school_class || section?.school_class_id;

  const loadExams = async () => {
    if (!classId) return;
    const res = await adminApi.getExams({ class: classId }).catch(() => null);
    const list = Array.isArray(res?.data) ? res.data : [];
    setExams(list);
    if (!examId && list.length) setExamId(String(list[0].id));
  };

  const loadReportCards = async () => {
    if (!section?.id || !examId) return;
    const res = await adminApi.getReportCards({ section: section.id, exam: examId }).catch(() => null);
    setRows(Array.isArray(res?.data) ? res.data : []);
  };

  const load = async () => {
    try {
      setLoading(true);
      await loadExams();
      await loadReportCards();
    } catch {
      push('Could not load report cards', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id, classId]);

  React.useEffect(() => {
    loadReportCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const selectedExam = useMemo(() => exams.find((e) => String(e.id) === String(examId)), [exams, examId]);

  const calculate = async () => {
    if (!examId) return;
    try {
      setLoading(true);
      await adminApi.calculateExamStats(examId);
      push('Stats calculated for exam', 'success');
      await loadReportCards();
    } catch {
      push('Could not calculate stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const autoGenerateReportCards = async () => {
    if (!section?.id || !examId) return;
    try {
      setLoading(true);
      const res = await adminApi.generateAiReportCardsForSection({
        section_id: section.id,
        exam_id: Number(examId),
        persist: true,
      });
      const generated = res?.data?.generated_count || 0;
      const skipped = res?.data?.skipped_count || 0;
      push(`Auto-generated ${generated} report cards${skipped ? `, skipped ${skipped}` : ''}.`, 'success');
      await loadReportCards();
    } catch (e) {
      push(e?.response?.data?.error || 'Could not auto-generate report cards', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Report Cards</h2>
          <p className={styles.subtitle} style={{ marginTop: 6 }}>
            {section ? `${section.class_name || 'Class'} - Section ${section.name}` : 'Select a section'}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={load} disabled={!section?.id || loading}><RefreshCw size={16} /> Refresh</button>
          <button className={styles.btn} onClick={autoGenerateReportCards} disabled={!section?.id || !examId || loading}>Auto Generate</button>
          <button className={styles.btn} onClick={() => setConfirmCalcOpen(true)} disabled={!examId || loading}><BarChart3 size={16} /> Calculate Stats</button>
        </div>
      </div>

      {!section?.id ? (
        <div className={styles.empty}>Select a section from Dashboard first.</div>
      ) : (
        <>
          <div className={styles.filters}>
            <select className={styles.select} value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">Select exam</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            {selectedExam && <span className={styles.badge}>{selectedExam.is_published ? 'Exam Published' : 'Exam Draft'}</span>}
            {loading && <span className={styles.loading}><Loader2 size={16} className={styles.spin} /> Loading...</span>}
          </div>

          <div className={styles.tableCard}>
            <div className={styles.cardHeader}>
              <b>Report Cards</b>
              <span className={styles.subtle}>{rows.length} students</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Total</th>
                    <th>%</th>
                    <th>Grade</th>
                    <th>Rank</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className={styles.emptyRow}>No report cards yet for this exam. Enter marks, then calculate stats.</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.student_name || r.student}</b></td>
                      <td>{r.total_marks ?? '-'}</td>
                      <td>{r.percentage ?? '-'}</td>
                      <td>{r.grade || '-'}</td>
                      <td>{r.rank || '-'}</td>
                      <td><span className={styles.badge}>{r.is_published ? 'Published' : 'Draft'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmCalcOpen}
        title="Calculate Exam Stats"
        message="This computes totals, percentage, grade, and rank for the selected exam."
        confirmText="Calculate"
        onCancel={() => setConfirmCalcOpen(false)}
        onConfirm={() => { setConfirmCalcOpen(false); calculate(); }}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const ReportCards = ({ section }) => (
  <ErrorBoundary>
    <ReportCardsView section={section} />
  </ErrorBoundary>
);

export default ReportCards;

