'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Download, RefreshCw, Plus, Search, Loader2, X,
  AlertCircle, BarChart2, Upload, CheckCircle
} from 'lucide-react';
import styles from './PerformanceAd.module.css';
import adminApi from '@/api/adminApi';
import MarkEntryModal from '../../Class/Marks/MarkEntryModal';
import PerfomaceStdDetail from './PerfomaceStdDetail/PerfomaceStdDetail';
import ReportCardCreate from './ReportCardCreate/ReportCardCreate';

const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PerformanceAd = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // ── filter state ────────────────────────────────────────────────────────────
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ── data state ───────────────────────────────────────────────────────────────
  const [perfSummary, setPerfSummary] = useState({ students: [], subjects: [] });
  const [reportCards, setReportCards] = useState([]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' });
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markInitialStudentId, setMarkInitialStudentId] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedStudentSummary, setSelectedStudentSummary] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  // ── initial load: sections ────────────────────────────────────────────────────
  useEffect(() => {
    adminApi.getSections().then(res => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setSections(list);
      if (list.length > 0) setSelectedSectionId(String(list[0].id));
    }).catch(() => {});
  }, []);

  // ── load exams when section changes ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedSectionId || sections.length === 0) return;
    const sec = sections.find(s => String(s.id) === selectedSectionId);
    if (!sec) return;
    const classId = sec.school_class || sec.school_class_id;
    adminApi.getExams({ class: classId }).then(res => {
      const list = Array.isArray(res.data) ? res.data : [];
      setExams(list);
      setSelectedExamId(list.length > 0 ? String(list[0].id) : '');
    }).catch(() => {});
  }, [selectedSectionId, sections]);

  // ── load performance data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!selectedExamId) return;
    setLoading(true);
    try {
      const params = { exam: selectedExamId };
      if (selectedSectionId) params.section = selectedSectionId;

      const [summaryRes, rcRes] = await Promise.all([
        adminApi.getPerformanceSummary(params),
        adminApi.getReportCards(params),
      ]);
      setPerfSummary(summaryRes.data || { students: [], subjects: [] });
      setReportCards(Array.isArray(rcRes.data) ? rcRes.data : []);
    } catch {
      showToast('Failed to load performance data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedExamId, selectedSectionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Re-calc ranks ──────────────────────────────────────────────────────────────
  const handleRecalcRanks = async () => {
    if (!selectedExamId || recalcLoading) return;
    setRecalcLoading(true);
    try {
      await adminApi.calculateExamStats(selectedExamId);
      await loadData();
      showToast('Ranks recalculated successfully');
    } catch {
      showToast('Failed to recalculate ranks', 'error');
    } finally {
      setRecalcLoading(false);
    }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    const el = document.getElementById('perf-content-area');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      const sec = sections.find(s => String(s.id) === selectedSectionId);
      pdf.save(`performance_${sec?.name || 'report'}_${Date.now()}.pdf`);
    } catch { showToast('PDF export failed', 'error'); }
  };

  // ── Bulk upload ───────────────────────────────────────────────────────────────
  const handleBulkUpload = async () => {
    if (!bulkFile) { showToast('Select a CSV/XLSX file first', 'error'); return; }
    if (!selectedExamId) { showToast('Select an exam first', 'error'); return; }
    setBulkBusy(true);
    const formData = new FormData();
    formData.append('file', bulkFile);
    formData.append('exam', selectedExamId);
    try {
      await adminApi.bulkSaveExamResults(formData);
      await loadData();
      setBulkFile(null);
      showToast('Bulk upload complete');
    } catch { showToast('Bulk upload failed — ensure exam schedules exist', 'error'); }
    finally { setBulkBusy(false); }
  };

  // ── Derived metrics ────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const stds = perfSummary.students.filter(s => s.overall_percentage !== null);
    if (!stds.length) return { avg: '0.0', passRate: 0, atRisk: 0, top: 0 };
    const avg = (stds.reduce((a, s) => a + (s.overall_percentage || 0), 0) / stds.length).toFixed(1);
    const pass = stds.filter(s => (s.overall_percentage || 0) >= 35).length;
    const atRisk = stds.filter(s => (s.overall_percentage || 0) < 40).length;
    const top = stds.filter(s => (s.overall_percentage || 0) >= 85).length;
    return { avg, passRate: Math.round((pass / stds.length) * 100), atRisk, top };
  }, [perfSummary]);

  // ── Subject averages ────────────────────────────────────────────────────────────
  const subjectAverages = useMemo(() => {
    const { students, subjects } = perfSummary;
    return subjects.map((sub, idx) => {
      const vals = students
        .map(s => s.subjects[String(sub.id)]?.percentage)
        .filter(v => v != null);
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
      return { ...sub, avg, color: STATUS_COLORS[idx % STATUS_COLORS.length] };
    }).filter(s => s.avg !== null);
  }, [perfSummary]);

  // ── Filtered student rows ───────────────────────────────────────────────────────
  const visibleStudents = useMemo(() => {
    let rows = perfSummary.students;
    if (searchTerm) rows = rows.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return rows;
  }, [perfSummary.students, searchTerm]);

  // ── Display columns: top 3 subjects by student count ───────────────────────────
  const tableSubjects = useMemo(() => perfSummary.subjects.slice(0, 3), [perfSummary.subjects]);

  // ── Student status ───────────────────────────────────────────────────────────────
  const getStatus = pct => {
    if (pct === null || pct === undefined) return 'No data';
    if (pct >= 85) return 'Top performer';
    if (pct < 40) return 'At risk';
    return 'On track';
  };

  // ── Students shaped for MarkEntryModal ────────────────────────────────────────
  const modalStudents = useMemo(() =>
    perfSummary.students.map(s => ({
      id: s.student_id,
      admission_number: s.admission_number || '',
      user: { first_name: s.name.split(' ')[0], last_name: s.name.split(' ').slice(1).join(' ') },
    })),
  [perfSummary.students]);

  const modalSubjects = useMemo(() =>
    perfSummary.subjects.map(s => ({ id: s.id, name: s.name })),
  [perfSummary.subjects]);

  const selectedSection = sections.find(s => String(s.id) === selectedSectionId);

  const tabClass = tab => `${styles.tabLink} ${activeTab === tab ? styles.tabLinkActive : ''}`;

  return (
    <div className={styles.container}>

      {/* Toast */}
      {toast.visible && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Performance</h1>
          <div className={styles.tabContainer}>
            <button className={tabClass('overview')} onClick={() => { setActiveTab('overview'); setShowBuilder(false); }}>Overview</button>
            <button className={tabClass('student_detail')} onClick={() => setActiveTab('student_detail')}>Student detail</button>
            <button className={tabClass('report_card')} onClick={() => { setActiveTab('report_card'); setShowBuilder(false); }}>Report card</button>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.ghostBtn}
            onClick={handleRecalcRanks}
            disabled={recalcLoading || !selectedExamId}
          >
            {recalcLoading ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} />}
            Re-calc ranks
          </button>
          <button className={styles.ghostBtn} onClick={handleExportPDF}>
            <Download size={14} /> Export PDF
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => { setMarkInitialStudentId(null); setShowMarkModal(true); }}
          >
            + Enter marks
          </button>
        </div>
      </div>

      {/* ── Filter Row ──────────────────────────────────────────────────────── */}
      <div className={styles.filterRow}>
        <div className={styles.filterItem}>
          <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)}>
            {sections.map(s => (
              <option key={s.id} value={String(s.id)}>
                {s.class_name || `Class ${s.school_class}`} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterItem}>
          <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
            <option value="">Select exam</option>
            {exams.map(e => (
              <option key={e.id} value={String(e.id)}>{e.name}{e.academic_year_name ? ` — ${e.academic_year_name}` : ''}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterItem}>
          <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {perfSummary.subjects.map(s => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className={`${styles.filterItem} ${styles.searchItem}`}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search students..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className={styles.content} id="perf-content-area">

        {loading && (
          <div className={styles.loadingBar}>
            <Loader2 size={16} className={styles.spin} /> Loading performance data…
          </div>
        )}

        {/* ══════════ OVERVIEW ══════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Stats grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>CLASS AVERAGE</span>
                <h2 className={styles.statValue}>{metrics.avg}%</h2>
                <span className={styles.statInfo}>{perfSummary.students.length} students</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>PASS RATE</span>
                <h2 className={styles.statValue}>{metrics.passRate}%</h2>
                <span className={styles.statInfo}>of students</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>AT RISK</span>
                <h2 className={`${styles.statValue} ${styles.valRisk}`}>{metrics.atRisk}</h2>
                <span className={styles.statInfo}>below 40% overall</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>TOP PERFORMERS</span>
                <h2 className={`${styles.statValue} ${styles.valTop}`}>{metrics.top}</h2>
                <span className={styles.statInfo}>above 85% overall</span>
              </div>
            </div>

            {/* Subject averages */}
            {subjectAverages.length > 0 && (
              <>
                <div className={styles.sectionDivider}><span>SUBJECT AVERAGES</span></div>
                <div className={styles.subjectList}>
                  {subjectAverages.map(s => (
                    <div key={s.id} className={styles.subjectItem}>
                      <div className={styles.subjMeta}>
                        <span className={styles.subjName}>{s.name}</span>
                        <span className={styles.subjVal}>{s.avg}%</span>
                      </div>
                      <div className={styles.subjBar}>
                        <div style={{ width: `${s.avg}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Student list */}
            <div className={styles.sectionDivider}><span>STUDENT LIST</span></div>
            <div className={styles.studentTable}>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Overall</th>
                    {tableSubjects.map(s => <th key={s.id}>{s.name}</th>)}
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.length === 0 && (
                    <tr><td colSpan={5 + tableSubjects.length} className={styles.emptyCell}>
                      {loading ? 'Loading…' : 'No data — enter marks or select an exam.'}
                    </td></tr>
                  )}
                  {visibleStudents.map((s, idx) => {
                    const pct = s.overall_percentage;
                    const status = getStatus(pct);
                    return (
                      <tr
                        key={s.student_id}
                        className={styles.clickableRow}
                        onClick={() => { setSelectedStudentSummary(s); setActiveTab('student_detail'); }}
                      >
                        <td>
                          <div className={styles.stdCell}>
                            <div
                              className={styles.stdAvatar}
                              style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }}
                            >
                              {s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className={styles.stdName}>{s.name}</div>
                              {s.rank && <div className={styles.stdRank}>Rank #{s.rank}</div>}
                            </div>
                          </div>
                        </td>
                        <td className={styles.bold}>
                          {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                        </td>
                        {tableSubjects.map(sub => {
                          const subData = s.subjects[String(sub.id)];
                          return (
                            <td key={sub.id} className={subData?.percentage < 40 ? styles.valRisk : ''}>
                              {subData?.is_absent ? 'Absent' : (subData?.percentage != null ? `${subData.percentage}%` : '—')}
                            </td>
                          );
                        })}
                        <td>
                          <span className={`${styles.badge} ${
                            status === 'Top performer' ? styles.badgeTop :
                            status === 'At risk' ? styles.badgeRisk : styles.badgeTrack
                          }`}>{status}</span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button
                            className={styles.miniBtn}
                            onClick={() => { setMarkInitialStudentId(s.student_id); setShowMarkModal(true); }}
                          >
                            + Marks
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══════════ STUDENT DETAIL ══════════ */}
        {activeTab === 'student_detail' && (
          <>
            {selectedStudentSummary ? (
              <PerfomaceStdDetail
                studentSummary={selectedStudentSummary}
                examId={selectedExamId}
                subjects={perfSummary.subjects}
                onBack={() => setActiveTab('overview')}
                onEnterMarks={(studentId) => {
                  setMarkInitialStudentId(studentId);
                  setShowMarkModal(true);
                }}
              />
            ) : (
              <div className={styles.emptyDetail}>
                <BarChart2 size={48} strokeWidth={1} className={styles.emptyIcon} />
                <p>Select a student from the Overview tab to view detailed performance.</p>
                <button className={styles.ghostBtn} onClick={() => setActiveTab('overview')}>
                  Go to Overview
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════ REPORT CARD ══════════ */}
        {activeTab === 'report_card' && !showBuilder && (
          <div className={styles.reportCardPanel}>
            <div className={styles.reportCardTopRow}>
              <div>
                <h3 className={styles.reportCardTitle}>Generated Report Cards</h3>
                <p className={styles.reportCardSub}>
                  {reportCards.length} report card{reportCards.length !== 1 ? 's' : ''} for selected exam/section
                </p>
              </div>
              <div className={styles.reportCardActions}>
                <button className={styles.ghostBtn} onClick={loadData}>
                  <RefreshCw size={14} /> Refresh
                </button>
                <button className={styles.primaryBtn} onClick={() => setShowBuilder(true)}>
                  <Plus size={16} /> Build Report Card
                </button>
              </div>
            </div>

            {/* Bulk upload row */}
            <div className={styles.bulkUploadRow}>
              <label className={styles.fileLabel}>
                <Upload size={14} />
                {bulkFile ? bulkFile.name : 'Choose CSV/XLSX'}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={e => setBulkFile(e.target.files?.[0] || null)}
                />
              </label>
              {bulkFile && (
                <button className={styles.ghostBtn} onClick={() => setBulkFile(null)}>
                  <X size={14} />
                </button>
              )}
              <button
                className={styles.actionBtn}
                onClick={handleBulkUpload}
                disabled={bulkBusy || !bulkFile}
              >
                {bulkBusy ? <Loader2 size={14} className={styles.spin} /> : <Upload size={14} />}
                {bulkBusy ? 'Uploading…' : 'Bulk Upload & Auto Generate'}
              </button>
            </div>

            {/* Report cards table */}
            <div className={styles.reportListWrap}>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Exam</th>
                    <th>Percent</th>
                    <th>Grade</th>
                    <th>Rank</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCards.length === 0 && (
                    <tr>
                      <td colSpan={6} className={styles.emptyCell}>
                        No report cards yet — use "Build Report Card" or recalculate ranks after entering marks.
                      </td>
                    </tr>
                  )}
                  {reportCards.map(rc => (
                    <tr key={rc.id}>
                      <td className={styles.bold}>{rc.student_name || `Student #${rc.student}`}</td>
                      <td>{rc.exam_name || '—'}</td>
                      <td>
                        <span className={parseFloat(rc.percentage) < 40 ? styles.valRisk : ''}>
                          {rc.percentage != null ? `${parseFloat(rc.percentage).toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td><span className={styles.gradeChip}>{rc.grade || '—'}</span></td>
                      <td>{rc.rank ? `#${rc.rank}` : '—'}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.ghostBtn}
                            onClick={() => {
                              const s = perfSummary.students.find(st => st.student_id === rc.student);
                              if (s) { setSelectedStudentSummary(s); setActiveTab('student_detail'); }
                            }}
                          >
                            View detail
                          </button>
                          {rc.pdf_file && (
                            <a className={styles.ghostBtn} href={rc.pdf_file} target="_blank" rel="noreferrer">
                              <Download size={13} /> PDF
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'report_card' && showBuilder && (
          <ReportCardCreate onBack={() => setShowBuilder(false)} />
        )}
      </div>

      {/* ── Marks Entry Modal ────────────────────────────────────────────────── */}
      <MarkEntryModal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        section={selectedSection}
        initialStudentId={markInitialStudentId}
        exams={exams}
        subjects={modalSubjects}
        students={modalStudents}
        onSaved={() => { loadData(); showToast('Marks saved successfully'); }}
      />
    </div>
  );
};

export default PerformanceAd;
