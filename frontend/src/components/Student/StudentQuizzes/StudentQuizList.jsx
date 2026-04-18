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
  History
} from 'lucide-react';
import styles from './StudentQuizList.module.css';
import QuizPlayer from './QuizPlayer';

export default function StudentQuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/exams/quizzes/');
      if (!response.ok) throw new Error('Failed to fetch quizzes');
      const data = await response.ok ? await response.json() : [];
      // Simulated data if API not fully ready
      const mockData = [
        {
          id: 1,
          name: "Mathematics Unit 2: Calculus",
          subject_name: "Mathematics",
          duration_minutes: 45,
          total_marks: 50,
          attempt_status: "not_started",
          questions_count: 20,
          difficulty: "Medium"
        },
        {
          id: 2,
          name: "Physics: Mechanics & Laws of Motion",
          subject_name: "Physics",
          duration_minutes: 30,
          total_marks: 30,
          attempt_status: "not_started",
          questions_count: 15,
          difficulty: "Hard"
        },
        {
          id: 3,
          name: "English Literature: Shakespeare",
          subject_name: "English",
          duration_minutes: 20,
          total_marks: 20,
          attempt_status: "graded",
          score: 18,
          questions_count: 10,
          difficulty: "Easy"
        }
      ];
      setQuizzes(data.length > 0 ? data : mockData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (activeQuiz) {
    return <QuizPlayer quizId={activeQuiz} onBack={() => { setActiveQuiz(null); fetchQuizzes(); }} />;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'graded':
        return <span className={`${styles.badge} ${styles.completed}`}>Completed</span>;
      case 'in_progress':
        return <span className={`${styles.badge} ${styles.ongoing}`}>In Progress</span>;
      default:
        return <span className={`${styles.badge} ${styles.available}`}>Available</span>;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <BrainCircuit size={32} className={styles.headerIcon} />
          <div>
            <h1>Quiz Center</h1>
            <p>Challenge yourself and track your academic progress.</p>
          </div>
        </div>
        
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statVal}>12</span>
            <span className={styles.statLabel}>Quizzes Done</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>88%</span>
            <span className={styles.statLabel}>Avg. Score</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>#4</span>
            <span className={styles.statLabel}>Class Rank</span>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.quizSection}>
          <div className={styles.sectionTitle}>
            <PlayCircle size={20} />
            <h2>Active & Upcoming Quizzes</h2>
          </div>
          
          <div className={styles.quizGrid}>
            {quizzes.filter(q => q.attempt_status !== 'graded').map(quiz => (
              <div key={quiz.id} className={styles.quizCard}>
                <div className={styles.quizCardHeader}>
                  <div className={styles.subjectTag}>{quiz.subject_name}</div>
                  {getStatusBadge(quiz.attempt_status)}
                </div>
                
                <h3 className={styles.quizName}>{quiz.name}</h3>
                
                <div className={styles.quizMeta}>
                  <div className={styles.metaItem}>
                    <Timer size={14} />
                    <span>{quiz.duration_minutes} mins</span>
                  </div>
                  <div className={styles.metaItem}>
                    <FileText size={14} />
                    <span>{quiz.questions_count || 10} Questions</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Trophy size={14} />
                    <span>{quiz.total_marks} Marks</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.difficulty}>
                    Difficulty: <span className={styles[quiz.difficulty?.toLowerCase()] || styles.medium}>{quiz.difficulty || 'Medium'}</span>
                  </div>
                  <button 
                    className={styles.startBtn}
                    onClick={() => setActiveQuiz(quiz.id)}
                  >
                    {quiz.attempt_status === 'in_progress' ? 'Resume' : 'Start Now'}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.quizSection}>
          <div className={styles.sectionTitle}>
            <History size={20} />
            <h2>Completed Attempts</h2>
          </div>
          
          <div className={styles.historyTableContainer}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Quiz Name</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Performance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.filter(q => q.attempt_status === 'graded').map(quiz => (
                  <tr key={quiz.id}>
                    <td>
                      <div className={styles.tableName}>
                        <CheckCircle2 size={16} className={styles.successIcon} />
                        {quiz.name}
                      </div>
                    </td>
                    <td>{quiz.subject_name}</td>
                    <td>14 Oct, 2023</td>
                    <td>
                      <span className={styles.scoreText}>
                        {quiz.score} / {quiz.total_marks}
                      </span>
                    </td>
                    <td>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${(quiz.score / quiz.total_marks) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      <button className={styles.reviewBtn}>Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
