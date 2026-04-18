'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  BarChart2, 
  Download, 
  Loader2, 
  AlertCircle,
  BookOpen,
  PieChart,
  Trophy,
  FileText
} from 'lucide-react';
import styles from './StudentResults.module.css';
import useFetch from '@/hooks/useFetch';
import adminApi from '@/api/adminApi';

export default function StudentResults() {
  const { data: dashData, loading: dashLoading } = useFetch('/students/students/dashboard-data/');
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [reportCards, setReportCards] = useState([]);
  const [subjectResults, setSubjectResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const studentId = dashData?.profile?.id;

  // Initialize: Load available exams for the student's class
  useEffect(() => {
    const init = async () => {
      try {
        const examRes = await adminApi.getExams();
        const availableExams = examRes.data || [];
        setExams(availableExams);
        if (availableExams.length > 0) {
          setSelectedExamId(availableExams[0].id);
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

  const activeRC = useMemo(() => reportCards[0] || null, [reportCards]);

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
      {/* Header & Controls */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Academic Results</h1>
          <p>View your performance across all examinations</p>
        </div>
        <div className={styles.controls}>
          <select 
            className={styles.select} 
            value={selectedExamId} 
            onChange={e => setSelectedExamId(e.target.value)}
          >
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
            {exams.length === 0 && <option value="">No exams found</option>}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Percentage</div>
          <div className={`${styles.statValue} ${styles.highlight}`}>
            {activeRC ? `${activeRC.percentage}%` : 'N/A'}
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

      {/* Detailed Table */}
      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <FileText size={18} color="#4f46e5" /> Subject-wise Performance
          </h3>
          {activeRC?.is_published && (
            <button className={styles.downloadBtn} onClick={() => alert("Report Card PDF will open in a new tab.")}>
              <Download size={14} /> Download Report
            </button>
          )}
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
                    <td>{res.internal_marks ?? '-'}</td>
                    <td>{res.theory_marks ?? '-'}</td>
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
    </div>
  );
}
