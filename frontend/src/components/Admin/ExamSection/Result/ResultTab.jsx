"use client";
import React, { useState, useEffect } from 'react';
import { Award, Users, BarChart2, Download, Loader2, AlertCircle } from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './Result.module.css';

export default function ResultTab() {
  const [exams, setExams] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [reportCards, setReportCards] = useState([]);
  const [selectedStudentRC, setSelectedStudentRC] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [examRes, sectionRes] = await Promise.all([
          adminApi.getExams(),
          adminApi.getSections()
        ]);
        setExams(examRes.data || []);
        setSections(sectionRes.data || []);
      } catch (error) {
        console.error("Error fetching result filters:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    if (!selectedExam || !selectedSection) {
      setReportCards([]);
      setSelectedStudentRC(null);
      return;
    }

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getReportCards({ exam: selectedExam, section: selectedSection });
        const list = res.data || [];
        setReportCards(list.sort((a, b) => (a.rank || 999) - (b.rank || 999)));
        if (list.length > 0) setSelectedStudentRC(list[0]);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, [selectedExam, selectedSection]);

  useEffect(() => {
    if (!selectedStudentRC) {
      setStudentResults([]);
      return;
    }

    const fetchStudentResults = async () => {
      try {
        const res = await adminApi.getExamResults({ 
          exam: selectedExam, 
          student: selectedStudentRC.student 
        });
        setStudentResults(res.data || []);
      } catch (error) {
        console.error("Error fetching student results:", error);
      }
    };
    fetchStudentResults();
  }, [selectedStudentRC, selectedExam]);

  const handleRecalculate = async () => {
    if (!selectedExam) return;
    setRecalculating(true);
    try {
      await adminApi.calculateExamStats(selectedExam);
      const res = await adminApi.getReportCards({ exam: selectedExam, section: selectedSection });
      setReportCards(res.data || []);
    } catch (error) {
      alert("Error calculating stats: " + (error.response?.data?.error || error.message));
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topFilters}>
        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className={styles.select}>
          <option value="">Select Examination</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className={styles.select}>
          <option value="">Select Section</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.class_name} - {s.name}</option>)}
        </select>
        <button 
          className={styles.btnSecondary} 
          onClick={handleRecalculate}
          disabled={recalculating || !selectedExam}
        >
          {recalculating ? <Loader2 size={16} className="animate-spin" /> : 'Recalculate Rankings'}
        </button>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.leftPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <Users size={18}/> Leaderboard
            </h3>
          </div>
          <div className={styles.listBody}>
            {loading ? (
              <div style={{padding: '40px', textAlign: 'center'}}><Loader2 className="animate-spin" size={24} style={{margin:'0 auto'}}/></div>
            ) : reportCards.length > 0 ? reportCards.map((rc) => (
              <div 
                key={rc.id} 
                className={`${styles.studentCard} ${selectedStudentRC?.id === rc.id ? styles.scActive : ''}`}
                onClick={() => setSelectedStudentRC(rc)}
              >
                <div className={styles.scInfo}>
                  <div className={styles.avatar}>{rc.student_name?.charAt(0)}</div>
                  <div>
                    <div className={styles.name}>{rc.student_name}</div>
                    <div className={styles.roll}>{rc.percentage}% • {rc.grade}</div>
                  </div>
                </div>
                <div className={`${styles.rank} ${rc.rank === 1 ? styles.rank1 : ''}`}>Rank {rc.rank || '-'}</div>
              </div>
            )) : (
              <div style={{padding: '40px', textAlign: 'center', opacity: 0.5}}>No results found.</div>
            )}
          </div>
        </div>

        <div className={styles.rightPanel}>
          {selectedStudentRC ? (
            <>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>
                  <Award size={18}/> {selectedStudentRC.student_name} - {selectedStudentRC.exam_name} result
                </h3>
              </div>

              <div className={styles.detailBody}>
                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <div className={styles.sbLabel}>Percentage</div>
                    <div className={styles.sbValue}>{selectedStudentRC.percentage}%</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.sbLabel}>Total Marks</div>
                    <div className={styles.sbValue}>{selectedStudentRC.total_marks}</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.sbLabel}>Grade</div>
                    <div className={styles.sbValue} style={{color: '#34D399'}}>{selectedStudentRC.grade}</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.sbLabel}>Rank</div>
                    <div className={styles.sbValue}>#{selectedStudentRC.rank || '-'}</div>
                  </div>
                </div>

                <table className={styles.subTable}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Obtained</th>
                      <th>Grade</th>
                      <th style={{textAlign: 'center'}}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.map(res => (
                      <tr key={res.id}>
                        <td style={{fontWeight: 600}}>{res.subject_name}</td>
                        <td>{res.is_absent ? 'ABS' : res.marks_obtained}</td>
                        <td><span className={`${styles.badge} ${res.grade?.includes('A')?styles.badgeA:styles.badgeB}`}>{res.grade}</span></td>
                        <td style={{textAlign: 'center'}}>{res.is_absent ? '❌' : '✅'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ padding: '100px', textAlign: 'center', opacity: 0.5 }}>
              <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
              <h3>Select a student</h3>
              <p>Choose a student from the leaderboard to view detailed results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
