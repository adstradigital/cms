'use client';

import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Timer, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  PlayCircle,
  AlertCircle,
  Trophy,
  Loader2,
  Clock,
  User,
  Lock
} from 'lucide-react';
import styles from './StudentTestList.module.css';
import TestPlayer from './TestPlayer';
import TestReview from './TestReview';
import instance from '@/api/instance';
import studentApi from '@/api/studentApi';

export default function StudentTestList() {
  const [tests, setTests] = useState([]);
  const [myAttempts, setMyAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTest, setActiveTest] = useState(null);
  const [activeReview, setActiveReview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [testsRes, attemptsRes] = await Promise.all([
        instance.get('/exams/online-tests/'),
        studentApi.getMyTestAttempts()
      ]);

      const allTests = testsRes.data || [];
      const published = allTests.filter(t => t.is_published);
      setTests(published);
      
      setMyAttempts(attemptsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Unable to load test data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Dashboard Stats calculation
  const completedAttempts = myAttempts.filter(a => a.status === 'published' || a.status === 'submitted');
  const avgScore = completedAttempts.length > 0 
    ? Math.round(completedAttempts.reduce((acc, a) => acc + (a.total_marks > 0 ? (a.final_score / a.total_marks) * 100 : 0), 0) / completedAttempts.length)
    : 0;

  if (activeReview) {
    return <TestReview attemptId={activeReview} onBack={() => { setActiveReview(null); fetchData(); }} />;
  }

  if (activeTest) {
    return <TestPlayer testId={activeTest} onBack={() => { setActiveTest(null); fetchData(); }} />;
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
          <Loader2 size={36} className="animate-spin" style={{ color: '#6366f1' }} />
          <p style={{ color: '#64748b', fontWeight: 600 }}>Loading your test dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <BrainCircuit size={32} className={styles.headerIcon} />
          <div>
            <h1>Online Test</h1>
            <p>Take tests assigned by your teachers and track your progress.</p>
          </div>
        </div>
        
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statVal}>{tests.length}</span>
            <span className={styles.statLabel}>Available</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>{completedAttempts.length}</span>
            <span className={styles.statLabel}>Tests Done</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>{avgScore}%</span>
            <span className={styles.statLabel}>Avg. Score</span>
          </div>
        </div>
      </header>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <AlertCircle size={18} style={{ color: '#ef4444' }} />
          <span style={{ color: '#dc2626', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div className={styles.content}>
        {/* Active & Upcoming Tests */}
        <section className={styles.testSection || styles.quizSection}>
          <div className={styles.sectionTitle}>
            <PlayCircle size={20} />
            <h2>Active & Upcoming Tests</h2>
          </div>
          
          <div className={styles.testGrid || styles.quizGrid}>
            {tests.filter(test => {
              const attemptsNum = myAttempts.filter(a => a.test === test.id).length;
              const hasSubmitted = myAttempts.some(a => a.test === test.id && (a.status === 'submitted' || a.status === 'published'));
              return test.max_attempts ? attemptsNum < test.max_attempts && !hasSubmitted : !hasSubmitted;
            }).length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', opacity: 0.6 }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 16px', display: 'block', color: '#94a3b8' }} />
                <p style={{ fontWeight: 600, color: '#64748b' }}>No more tests to take.</p>
                <p style={{ fontSize: 14, color: '#94a3b8' }}>Check the completed attempts below for your results.</p>
              </div>
            )}

            {tests.map(test => {
              const myTestAttempts = myAttempts.filter(a => a.test === test.id);
              const inProgress = myTestAttempts.find(a => a.status === 'in_progress');
              const isFinished = myTestAttempts.some(a => a.status === 'submitted' || a.status === 'published');
              const attemptsCount = myTestAttempts.length;
              
              // Frontend validation for better UX
              const now = new Date();
              const isStarted = !test.start_at || now >= new Date(test.start_at);
              const isEnded = test.end_at && now > new Date(test.end_at);
              const reachedMax = test.max_attempts && attemptsCount >= test.max_attempts && !inProgress;

              // If fully finished and no more attempts allowed, don't show in Active section
              if (isFinished && (!test.max_attempts || attemptsCount >= test.max_attempts)) return null;

              return (
                <div key={test.id} className={styles.testCard || styles.quizCard}>
                  <div className={styles.testCardHeader || styles.quizCardHeader}>
                    <div className={styles.subjectTag}>{test.subject_name}</div>
                    <span className={`
                      ${styles.badge} 
                      ${inProgress ? styles.ongoing : isEnded ? styles.completed : !isStarted ? styles.available : styles.available}
                    `}>
                      {inProgress ? 'In Progress' : isEnded ? 'Closed' : !isStarted ? 'Upcoming' : 'Ready'}
                    </span>
                  </div>
                  
                  <h3 className={styles.testName || styles.quizName}>{test.title}</h3>
                  {test.description && (
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>{test.description}</p>
                  )}
                  
                  <div className={styles.testMeta || styles.quizMeta}>
                    <div className={styles.metaItem}>
                      <Timer size={14} />
                      <span>{test.duration_minutes} mins</span>
                    </div>
                    <div className={styles.metaItem}>
                      <FileText size={14} />
                      <span>{test.question_count} Questions</span>
                    </div>
                    <div className={styles.metaItem}>
                      <Trophy size={14} />
                      <span>Max Attempt: {test.max_attempts || '∞'}</span>
                    </div>
                  </div>

                  {(!isStarted && test.start_at) && (
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                      <Clock size={14} />
                      Starts: {new Date(test.start_at).toLocaleString()}
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <div className={styles.difficulty}>
                      <User size={13} />
                      <span style={{ fontSize: 12 }}>{test.created_by_name || 'Teacher'}</span>
                    </div>
                    <button 
                      className={styles.startBtn}
                      disabled={!isStarted || isEnded || reachedMax}
                      style={{ opacity: (!isStarted || isEnded || reachedMax) ? 0.5 : 1 }}
                      onClick={() => setActiveTest(test.id)}
                    >
                      {inProgress ? 'Resume' : reachedMax ? 'Max Attempts' : isEnded ? 'Closed' : !isStarted ? 'Locked' : 'Start Now'}
                      {(!isStarted || reachedMax || isEnded) ? <Lock size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
