'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import styles from './TestReview.module.css';
import instance from '@/api/instance';

export default function TestReview({ attemptId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReviewData();
  }, [attemptId]);

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      const res = await instance.get(`/exams/online-tests/attempts/${attemptId}/`);
      setAttempt(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch review:', err);
      setError('Unable to load review data.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loader}>
        <Loader2 size={48} className="animate-spin" />
        <p>Loading your results...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className={styles.loader}>
        <AlertCircle size={48} color="#ef4444" />
        <p>{error || 'Attempt not found'}</p>
        <button onClick={onBack} className={styles.exitBtn}>Go Back</button>
      </div>
    );
  }

  const questions = attempt.answers || [];
  const currentQ = questions[currentIdx];
  const totalMarks = attempt.total_marks || 0;
  const earnedMarks = attempt.final_score || 0;

  if (!currentQ) {
    return (
      <div className={styles.loader}>
        <AlertCircle size={48} color="#f59e0b" />
        <p>This attempt has no graded answers to review.</p>
        <button onClick={onBack} className={styles.exitBtn}>Go Back</button>
      </div>
    );
  }

  return (
    <div className={styles.reviewWrapper}>
      <header className={styles.reviewHeader}>
        <button className={styles.exitBtn} onClick={onBack}>
          <ArrowLeft size={18} />
          Exit Review
        </button>
        <div className={styles.testTitle}>{attempt.test_title || attempt.test_name}</div>
        <div style={{ width: 100 }}></div> {/* spacer */}
      </header>

      <div className={styles.summaryBar}>
        <div className={styles.scoreGroup}>
          <div className={styles.finalScore}>{earnedMarks} / {totalMarks}</div>
          <div>
            <div className={styles.scoreLabel}>Final Score</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0}% Proficiency
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div className={styles.scoreLabel}>Status</div>
            <div style={{ color: '#10b981', fontWeight: 700 }}>
              {attempt.status === 'published' ? 'Result Published' : 'Grading Complete'}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.reviewBody}>
        <aside className={styles.sideNav}>
          <div className={styles.navHeader}>Questions</div>
          <div className={styles.questionGrid}>
            {questions.map((ans, idx) => (
              <button
                key={ans.id}
                onClick={() => setCurrentIdx(idx)}
                className={`
                  ${styles.navBtn} 
                  ${currentIdx === idx ? styles.navActive : ''}
                  ${ans.is_correct === true ? styles.navCorrect : ans.is_correct === false ? styles.navIncorrect : ''}
                `}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </aside>

        <main className={styles.mainArea}>
          <div className={styles.questionCard}>
            <header className={styles.questionHead}>
              <span className={styles.qNum}>Question {currentIdx + 1} of {questions.length}</span>
              <div className={styles.qStatus} style={{ color: currentQ.is_correct ? '#10b981' : currentQ.is_correct === false ? '#ef4444' : '#64748b' }}>
                {currentQ.is_correct ? 'Correct' : currentQ.is_correct === false ? 'Incorrect' : 'Graded'}
                <span style={{ marginLeft: 8, color: '#64748b', fontSize: '0.9em' }}>
                  ({currentQ.manual_score || currentQ.auto_score || 0} / {currentQ.question_marks} Marks)
                </span>
              </div>
            </header>

            <h3 className={styles.qText}>{currentQ.question_text}</h3>

            {/* Answer Display */}
            {['mcq_single', 'mcq_multi', 'truefalse'].includes(currentQ.question_type) ? (
              <div className={styles.optionsList}>
                {(currentQ.question_choices || []).map((choice, cIdx) => {
                  const isSelected = currentQ.selected_choice_ids?.includes(choice.id);
                  const isCorrect = choice.is_correct;
                  
                  let itemClass = styles.optionItem;
                  if (isSelected) itemClass += ` ${styles.userSelected}`;
                  if (isCorrect) itemClass += ` ${styles.correctChoice}`;
                  else if (isSelected && !isCorrect) itemClass += ` ${styles.incorrectChoice}`;

                  return (
                    <div key={choice.id} className={itemClass}>
                      <span className={styles.optionChar}>{String.fromCharCode(65 + cIdx)}</span>
                      <span style={{ flex: 1 }}>{choice.text}</span>
                      {isCorrect && <CheckCircle2 size={18} color="#10b981" />}
                      {isSelected && !isCorrect && <XCircle size={18} color="#ef4444" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.reviewTextSection}>
                <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 13, color: '#64748b' }}>YOUR ANSWER:</div>
                <div className={styles.answerText}>
                  {currentQ.text_answer || <span style={{ opacity: 0.5 }}>No answer provided.</span>}
                </div>
              </div>
            )}

            {/* Teacher Feedback */}
            {currentQ.teacher_remark && (
              <div className={styles.feedbackBox}>
                <div className={styles.feedbackTitle}>
                  <MessageSquare size={14} style={{ marginRight: 6 }} />
                  Teacher's Feedback
                </div>
                <div className={styles.remarkText}>{currentQ.teacher_remark}</div>
              </div>
            )}
          </div>

          <div className={styles.actionRow}>
            <button 
              className={styles.pBtn}
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <button 
              className={styles.nBtn}
              disabled={currentIdx === questions.length - 1}
              onClick={() => setCurrentIdx(prev => prev + 1)}
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
