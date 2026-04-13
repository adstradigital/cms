import React, { useState, useEffect } from 'react';
import styles from '../ExaminationsDashboard.module.css';
import api from '@/api/instance';
import { Calculator, Award, ArrowUpCircle } from 'lucide-react';

const ReportCardsTab = () => {
  const [exams, setExams] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  
  const [reports, setReports] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const [exRes, secRes] = await Promise.all([
          api.get('/exams/exams/'),
          api.get('/students/sections/')
        ]);
        setExams(exRes.data);
        setSections(secRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBase();
  }, []);

  const loadReportCards = async () => {
    if (!selectedExamId || !selectedSectionId) return;
    setLoading(true);
    try {
      const res = await api.get(`/exams/report-cards/?exam=${selectedExamId}&section=${selectedSectionId}`);
      let records = res.data.results ? res.data.results : res.data;
      // Ensure we sort beautifully by rank (highest first)
      records.sort((a, b) => (a.rank || 999) - (b.rank || 999));
      setReports(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportCards();
  }, [selectedExamId, selectedSectionId]);

  const handleCalculateStats = async () => {
    if (!selectedExamId) {
      alert('Please select an Exam to calculate statistics for.');
      return;
    }
    setCalculating(true);
    try {
      const res = await api.post(`/exams/exams/${selectedExamId}/calculate-stats/`);
      alert(res.data.message || 'Stats successfully generated');
      loadReportCards();
    } catch (err) {
      console.error(err);
      alert('Failed to calculate stats. ' + (err.response?.data?.error || ''));
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div>
           <h2 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Report Cards & Analytics</h2>
           <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Compile grading sheets and rank students automatically.</p>
        </div>
        <button 
          className={styles.actionButton} 
          style={{ background: calculating ? '#94a3b8' : '#6366f1' }}
          onClick={handleCalculateStats}
          disabled={calculating || !selectedExamId}
        >
          {calculating ? 'Calculating...' : <><Calculator size={18} /> Re-Calculate Class Stats</>}
        </button>
      </div>

      <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }} className={styles.formGroup}>
          <label className={styles.formLabel}>Target Exam</label>
          <select className={styles.formSelect} value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
            <option value="">-- Choose Exam --</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} className={styles.formGroup}>
          <label className={styles.formLabel}>Target Section</label>
          <select className={styles.formSelect} value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)}>
            <option value="">-- Choose Section --</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.class_name} - {s.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>Gathering report cards...</div>
      ) : reports.length === 0 ? (
        <div className={styles.emptyState}>No compiled report cards found. Try generating stats first, or check filtering.</div>
      ) : (
        <div className={styles.grid3}>
          {reports.map((report, idx) => (
            <div key={report.id} style={{
               background: '#fff',
               border: '1px solid #e2e8f0',
               borderRadius: '12px',
               padding: '1.5rem',
               boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
               position: 'relative',
               overflow: 'hidden'
            }}>
               {report.rank === 1 && (
                 <div style={{ position: 'absolute', top: 0, right: 0, background: '#fef08a', color: '#a16207', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderBottomLeftRadius: '8px' }}>
                   Top Scholar
                 </div>
               )}
               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                     {report.student_name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>{report.student_name}</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{report.exam_name}</p>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                     <p style={{ margin: 0, color: '#64748b', fontSize: '0.75rem', fontWeight: '600' }}>PERCENTAGE</p>
                     <p style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 'bold' }}>{parseFloat(report.percentage).toFixed(2)}%</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                     <p style={{ margin: 0, color: '#64748b', fontSize: '0.75rem', fontWeight: '600' }}>CLASS RANK</p>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0f172a', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {report.rank ? `#${report.rank}` : 'N/A'} {report.rank <= 3 && <Award size={16} color="#d97706" />}
                     </div>
                  </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Overall Grade</span>
                    <h4 style={{ margin: 0, color: report.grade === 'F' ? '#ef4444' : '#10b981', fontSize: '1.5rem', fontWeight: '800' }}>
                       {report.grade || 'U'}
                    </h4>
                  </div>
                  {/* Ideally download PDF button goes here if pdf_file exists */}
                  <span style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>View Details</span>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportCardsTab;
