'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, Award, TrendingUp, AlertCircle, Search, 
  Download, Plus, RefreshCw, Filter, User, BookOpen
} from 'lucide-react';
import styles from './PerformanceTab.module.css';
import adminApi from '@/api/adminApi';
import MarkEntryModal from '../Marks/MarkEntryModal';

const PerformanceTab = ({ section }) => {
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [reportCards, setReportCards] = useState([]);
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [initialStudentId, setInitialStudentId] = useState(null);

  const sectionClassId = section?.school_class || section?.school_class_id;

  // Load Initial Data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!sectionClassId || !section?.id) return;
      try {
        setLoading(true);
        const [exRes, subjRes, studRes] = await Promise.all([
          adminApi.getExams({ class: sectionClassId }).catch(() => ({ data: [] })),
          adminApi.getSubjects({ class: sectionClassId }).catch(() => ({ data: [] })),
          adminApi.getStudents({ section: section.id, is_active: 'true' }).catch(() => ({ data: [] }))
        ]);
        
        const examsList = Array.isArray(exRes.data) ? exRes.data : [];
        setExams(examsList);
        setSubjects(Array.isArray(subjRes.data) ? subjRes.data : []);
        setStudents(Array.isArray(studRes.data) ? studRes.data : []);
        
        if (examsList.length > 0) {
          setSelectedExamId(String(examsList[0].id));
        }
      } catch (err) {
        console.error('Failed to load performance initial data', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [sectionClassId, section?.id]);

  // Load Data on Exam Change
  const loadPerformanceData = async () => {
    if (!selectedExamId || !section?.id) return;
    try {
      setLoading(true);
      const [rcRes, resRes] = await Promise.all([
        adminApi.getReportCards({ exam: selectedExamId, section: section.id }).catch(() => ({ data: [] })),
        adminApi.getExamResults({ exam: selectedExamId, section: section.id }).catch(() => ({ data: [] }))
      ]);
      setReportCards(Array.isArray(rcRes.data) ? rcRes.data : []);
      setResults(Array.isArray(resRes.data) ? resRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
  }, [selectedExamId, section?.id]);

  // Metrics
  const metrics = useMemo(() => {
    if (reportCards.length === 0) return { avg: 0, passRate: 0, atRisk: 0, top: 0 };
    const count = reportCards.length;
    const totalPct = reportCards.reduce((acc, rc) => acc + parseFloat(rc.percentage || 0), 0);
    const passCount = reportCards.filter(rc => parseFloat(rc.percentage || 0) >= 35).length;
    const atRiskCount = reportCards.filter(rc => parseFloat(rc.percentage || 0) < 40).length;
    const topCount = reportCards.filter(rc => parseFloat(rc.percentage || 0) >= 85).length;
    return {
      avg: (totalPct / count).toFixed(1),
      passRate: ((passCount / count) * 100).toFixed(0),
      atRisk: atRiskCount,
      top: topCount
    };
  }, [reportCards]);

  // Subject Averages
  const subjectStats = useMemo(() => {
    if (results.length === 0 || subjects.length === 0) return [];
    return subjects.map(sub => {
      const subResults = results.filter(r => (r.exam_schedule?.subject?.id || r.exam_schedule?.subject) === sub.id);
      if (subResults.length === 0) return null;
      const total = subResults.reduce((acc, r) => acc + parseFloat(r.marks_obtained || 0), 0);
      const max = subResults.reduce((acc, r) => acc + (r.max_marks || 100), 0);
      return { id: sub.id, name: sub.name, avg: ((total / max) * 100).toFixed(1) };
    }).filter(Boolean);
  }, [results, subjects]);

  // Table Data
  const studentRows = useMemo(() => {
    return students.filter(s => {
      const fullName = `${s.user?.first_name} ${s.user?.last_name}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    }).map(s => {
      const rc = reportCards.find(r => r.student === s.id);
      const pct = parseFloat(rc?.percentage || 0);
      let status = 'On track';
      if (pct >= 85) status = 'Top performer';
      else if (pct < 40) status = 'At risk';
      return { id: s.id, name: `${s.user?.first_name} ${s.user?.last_name}`, pct: rc ? `${pct.toFixed(1)}%` : '-', rank: rc?.rank || '-', status };
    }).sort((a, b) => (a.rank === '-' ? 1 : b.rank === '-' ? -1 : a.rank - b.rank));
  }, [students, reportCards, searchTerm]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3>Performance Analytics</h3>
          {section && (
            <p className={styles.subtitle}>{section.class_name} — Section {section.name}</p>
          )}
        </div>
        <div className={styles.filters}>
          <select className={styles.select} value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
          <button className={styles.btn} onClick={() => loadPerformanceData()}><RefreshCw size={14} className={loading ? styles.spin : ''} /></button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setInitialStudentId(null); setShowMarkModal(true); }}>
            <Plus size={14} /> Add Individual Mark
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Class Average</span>
          <h2 className={styles.statValue}>{metrics.avg}%</h2>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Pass Rate</span>
          <h2 className={styles.statValue}>{metrics.passRate}%</h2>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>At Risk</span>
          <h2 className={`${styles.statValue} ${styles.valRisk}`}>{metrics.atRisk}</h2>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Top Performers</span>
          <h2 className={`${styles.statValue} ${styles.valTop}`}>{metrics.top}</h2>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Subject Averages</h4>
        </div>
        <div className={styles.subjectGrid}>
          {subjectStats.map((s, i) => (
            <div key={s.id} className={styles.subjectCard}>
              <div className={styles.subjectMeta}>
                <span className={styles.subjName}>{s.name}</span>
                <span className={styles.subjVal}>{s.avg}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${s.avg}%`, background: 'var(--color-primary)' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Student List</h4>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input className={styles.searchInput} placeholder="Search student..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Overall</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map((r, i) => (
                <tr key={r.id}>
                  <td>#{r.rank}</td>
                  <td>{r.name}</td>
                  <td>{r.pct}</td>
                  <td><span className={`${styles.badge} ${r.status === 'Top performer' ? styles.badgeTop : (r.status === 'At risk' ? styles.badgeRisk : styles.badgeTrack)}`}>{r.status}</span></td>
                  <td>
                    <button className={styles.btn} style={{ padding: '4px 8px' }} onClick={() => { setInitialStudentId(r.id); setShowMarkModal(true); }}>
                      Mark
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MarkEntryModal 
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        section={section}
        initialStudentId={initialStudentId}
        exams={exams}
        subjects={subjects}
        students={students}
        onSaved={loadPerformanceData}
      />
    </div>
  );
};

export default PerformanceTab;
