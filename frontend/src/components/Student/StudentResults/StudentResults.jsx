'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Award, 
  BarChart2, 
  Download, 
  Loader2, 
  AlertCircle,
  BookOpen,
  PieChart,
  Trophy,
  FileText,
  History,
  CheckCircle2,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import styles from './StudentResults.module.css';
import useFetch from '@/hooks/useFetch';
import adminApi from '@/api/adminApi';
import studentApi from '@/api/studentApi';
import TestReview from '../StudentTests/TestReview';

export default function StudentResults() {
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') === 'online' ? 'online' : 'academic';
  
  const { data: dashData, loading: dashLoading } = useFetch('/students/students/dashboard-data/');
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [filterMode, setFilterMode] = useState(initialView); // 'all', 'academic', 'online'
  const [reportCards, setReportCards] = useState([]);
  const [subjectResults, setSubjectResults] = useState([]);
  const [testAttempts, setTestAttempts] = useState([]);
  const [activeReview, setActiveReview] = useState(null);
  const [gradingScale, setGradingScale] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [performanceTrend, setPerformanceTrend] = useState(null); // { delta, direction }

  // Sync filterMode if URL changes
  useEffect(() => {
    const view = searchParams.get('view');
    if (view && (view === 'academic' || view === 'online')) {
      setFilterMode(view);
    }
  }, [searchParams]);

  const academicRef = useRef(null);
  const onlineRef = useRef(null);

  const studentId = dashData?.profile?.id;

  // Initialize: Load available exams for the student's class
  useEffect(() => {
    const init = async () => {
      try {
        const examRes = await adminApi.getExams();
        // Filter out online exams to satisfy "not online tests" in this section
        const availableExams = (examRes.data || []).filter(ex => !ex.is_online);
        setExams(availableExams);
        
        if (availableExams.length > 0) {
          const firstExam = availableExams[0];
          setSelectedExamId(firstExam.id);
          // Set grading scale from exam type if available
          if (firstExam.exam_type_details?.grading_scale_details) {
            setGradingScale(firstExam.exam_type_details.grading_scale_details);
          }
        }
      } catch (err) {
        console.error("Failed to load initial exam filters", err);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  // Fetch results whenever exam or student context changes
  useEffect(() => {
    if (!selectedExamId || !studentId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [rcRes, resultRes] = await Promise.all([
          adminApi.getReportCards({ student: studentId, exam: selectedExamId }),
          adminApi.getExamResults({ student: studentId, exam: selectedExamId })
        ]);

        // Only show published report cards
        setReportCards(rcRes.data?.filter(rc => rc.is_published) || []);
        setSubjectResults(resultRes.data || []);
      } catch (err) {
        console.error("Failed to fetch results", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedExamId, studentId]);

  // Fetch online test attempts separately
  useEffect(() => {
    if (!studentId) return;

    const fetchTests = async () => {
      setTestLoading(true);
      try {
        const res = await studentApi.getMyTestAttempts();
        // Filter for finished and results-published attempts
        const finished = (res.data || []).filter(a => 
          a.status === 'published' || a.status === 'graded' || a.status === 'submitted'
        );
        setTestAttempts(finished);
      } catch (err) {
        console.error("Failed to fetch test attempts", err);
      } finally {
        setTestLoading(false);
      }
    };

    fetchTests();
  }, [studentId]);

  // Calculate performance trend
  useEffect(() => {
    if (!selectedExamId || !exams.length || !reportCards.length) return;

    const currentIdx = exams.findIndex(ex => ex.id === parseInt(selectedExamId));
    if (currentIdx < exams.length - 1) {
      const prevExam = exams[currentIdx + 1]; // Assuming sorted descending, previous is next in list
      
      const fetchPrevData = async () => {
        try {
          const res = await adminApi.getReportCards({ student: studentId, exam: prevExam.id });
          const prevRC = res.data?.find(rc => rc.is_published);
          const currentRC = reportCards[0];

          if (prevRC && currentRC) {
            const delta = parseFloat(currentRC.percentage) - parseFloat(prevRC.percentage);
            setPerformanceTrend({
              delta: Math.abs(delta).toFixed(1),
              direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable'
            });
          } else {
            setPerformanceTrend(null);
          }
        } catch (err) {
          console.error("Trend calculation failed", err);
        }
      };
      fetchPrevData();
    } else {
      setPerformanceTrend(null);
    }
  }, [selectedExamId, exams, reportCards, studentId]);

  const handleDownload = () => {
    window.print();
  };

  const activeRC = useMemo(() => reportCards[0] || null, [reportCards]);

  if (activeReview) {
    return (
      <div className={styles.reviewWrapper}>
        <TestReview 
          attemptId={activeReview} 
          onBack={() => setActiveReview(null)} 
        />
      </div>
    );
  }

  if (dashLoading || initialLoading) {
    return (
      <div className={styles.spinner}>
        <Loader2 className="animate-spin" size={40} />
        <p>Analyzing your academic performance...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header & Filter Dropdown */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Results Center</h1>
          <p className={styles.subtitle}>View and monitor your academic progress</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewSwitcher}>
            <Filter size={16} color="#6366f1" />
            <select 
              className={styles.viewSelect}
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="all">Show All Results</option>
              <option value="academic">Academic Exams only</option>
              <option value="online">Online Quizzes only</option>
            </select>
          </div>
          <button className={styles.downloadBtn} onClick={handleDownload}>
            <FileText size={18} />
            Download Summary
          </button>
        </div>
      </header>

      {/* 1. Academic Results Section */}
      {(filterMode === 'all' || filterMode === 'academic') && (
        <div ref={academicRef} className={styles.sectionContainer}>
          {/* Summary Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Percentage</div>
              <div className={`${styles.statValue} ${styles.highlight}`}>
                {activeRC ? `${activeRC.percentage}%` : 'N/A'}
                {performanceTrend && (
                  <span className={`${styles.trendBadge} ${styles[performanceTrend.direction]}`}>
                    {performanceTrend.direction === 'up' ? '↑' : performanceTrend.direction === 'down' ? '↓' : '•'}
                    {performanceTrend.delta}%
                  </span>
                )}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Marks</div>
              <div className={styles.statValue}>
                {activeRC ? activeRC.total_marks : 'N/A'}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Grade</div>
              <div className={`${styles.statValue} ${styles.grade}`}>
                {activeRC ? activeRC.grade : 'N/A'}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Section Rank</div>
              <div className={styles.statValue}>
                {activeRC?.rank ? `#${activeRC.rank}` : 'N/A'}
              </div>
            </div>
          </div>

          <div className={styles.mainCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <Award size={18} color="#4f46e5" /> Academic Performance
              </h3>
              <div className={styles.filterGroup}>
                <BookOpen size={16} color="#64748b" />
                <select 
                  className={styles.select} 
                  value={selectedExamId} 
                  onChange={e => {
                    const id = e.target.value;
                    setSelectedExamId(id);
                    const selected = exams.find(ex => ex.id === parseInt(id));
                    if (selected?.exam_type_details?.grading_scale_details) {
                      setGradingScale(selected.exam_type_details.grading_scale_details);
                    }
                  }}
                >
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                  {exams.length === 0 && <option value="">No exams found</option>}
                </select>
              </div>
            </div>
            
            <div className={styles.tableContainer}>
              {loading ? (
                <div className={styles.spinner}>
                  <Loader2 className="animate-spin" size={24} />
                  <p>Fetching detailed marks...</p>
                </div>
              ) : subjectResults.length > 0 ? (
                <table className={styles.resultsTable}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Internal</th>
                      <th>Theory</th>
                      <th>Total Obtained</th>
                      <th>Status</th>
                      <th>Evaluator</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectResults.map(res => (
                      <tr key={res.id}>
                        <td>
                          <div className={styles.subjectCell}>
                            <span className={styles.subjectName}>{res.subject_name}</span>
                            <span className={styles.subjectCode}>{res.subject_code || 'SUB-101'}</span>
                          </div>
                        </td>
                        <td>{res.internal_marks ?? '-'} / {res.max_internal_marks || 20}</td>
                        <td>{res.theory_marks ?? '-'} / {res.max_theory_marks || 80}</td>
                        <td>
                          <span className={styles.subjectName}>
                            {res.is_absent ? (
                              <span className={styles.absent}>ABSENT</span>
                            ) : (
                              res.marks_obtained
                            )}
                          </span>
                        </td>
                        <td>
                          {!res.is_absent && (
                            <span className={`${styles.badge} ${res.grade?.includes('A') || res.grade?.includes('B') ? styles.badgeA : styles.badgeF}`}>
                              {res.grade || 'NA'}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={styles.evaluator}>{res.entered_by_name || 'Subject Teacher'}</span>
                        </td>
                        <td className={styles.remarks}>{res.remarks || "No comments"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>
                  <AlertCircle size={40} color="#cbd5e1" />
                  <div className={styles.emptyTitle}>No Detailed Marks Found</div>
                  <p className={styles.emptyText}>
                    The detailed marksheets for this examination have not been released or uploaded yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Grading Legend Section */}
          {gradingScale && gradingScale.configuration_json && (
            <div className={styles.legendWrapper}>
              <div className={styles.legendHeader}>
                <PieChart size={18} />
                <h3>Grading System ({gradingScale.name})</h3>
              </div>
              <div className={styles.legendGrid}>
                {(Array.isArray(gradingScale.configuration_json) ? gradingScale.configuration_json : []).map((config, idx) => (
                  <div key={idx} className={styles.legendItem}>
                    <span className={styles.legendGrade}>{config.grade}</span>
                    <span className={styles.legendRange}>{config.min}% - {config.max}%</span>
                    <span className={styles.legendDesc}>
                      {config.grade?.startsWith('A') ? 'Outstanding' : config.grade?.startsWith('B') ? 'Very Good' : 'Satisfactory'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Online Quizzes Section */}
      {(filterMode === 'all' || filterMode === 'online') && (
        <section ref={onlineRef} className={styles.historySection} style={{ marginTop: filterMode === 'all' ? 48 : 0 }}>
          <div className={styles.sectionTitle}>
            <History size={20} color="#6366f1" />
            <h2>Online Test Results History</h2>
          </div>

          <div className={styles.historyTableContainer}>
            {testLoading ? (
              <div className={styles.spinner}>
                <Loader2 className="animate-spin" size={24} />
                <p>Analyzing test patterns...</p>
              </div>
            ) : testAttempts.length > 0 ? (
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Subject</th>
                    <th>Submitted On</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {testAttempts.map(attempt => (
                    <tr key={attempt.id}>
                      <td>
                        <div className={styles.tableName}>
                          <CheckCircle2 size={16} className={styles.successIcon} />
                          {attempt.test_title || attempt.test_name || "Online Quiz"}
                        </div>
                      </td>
                      <td>{attempt.subject_name || 'General'}</td>
                      <td>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : '-'}</td>
                      <td>
                        {attempt.status === 'published' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span className={styles.scoreText}>{attempt.final_score} / {attempt.total_marks}</span>
                            <div className={styles.progressBar}>
                              <div 
                                className={styles.progressFill} 
                                style={{ width: attempt.total_marks > 0 ? `${(attempt.final_score / attempt.total_marks) * 100}%` : '0%' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Pending Grading</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${attempt.status === 'published' ? styles.available : styles.ongoing}`}>
                          {attempt.status === 'published' ? 'Result Published' : 'To be Graded'}
                        </span>
                      </td>
                      <td>
                        {attempt.status === 'published' ? (
                          <button className={styles.reviewBtn} onClick={() => setActiveReview(attempt.id)}>
                            Review Result
                            <ArrowUpRight size={13} style={{ marginLeft: 4 }} />
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>Check back soon</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>
                <BarChart2 size={40} color="#cbd5e1" />
                <div className={styles.emptyTitle}>No Online Test Records</div>
                <p className={styles.emptyText}>
                  You haven't completed any online tests or quizzes yet.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
