'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Send, 
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import styles from './TestPlayer.module.css';
import instance from '@/api/instance';

export default function TestPlayer({ testId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: { text_answer, selected_choice_ids } }
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    startTest();
  }, [testId]);

  const startTest = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch test detail with questions
      const testRes = await instance.get(`/exams/online-tests/${testId}/`);
      const test = testRes.data;
      setTestData(test);

      // Filter out divider-type questions for student view
      const actualQuestions = (test.test_questions || []).filter(q => q.question_type !== 'divider');
      setQuestions(actualQuestions);

      // 2. Start an attempt
      const attemptRes = await instance.post(`/exams/online-tests/${testId}/attempt/`);
      setAttemptId(attemptRes.data.id);

      // 3. Set timer
      setTimeLeft(test.duration_minutes * 60);

      setLoading(false);
    } catch (err) {
      console.error('Failed to start test:', err);
      // Extract specific backend error message if available
      const backendError = err.response?.data?.error || err.response?.data?.detail;
      const msg = backendError || 'Failed to start the test. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleFinish = useCallback(async () => {
    if (!attemptId) return;
    setIsSubmitting(true);
    try {
      // Build answers payload for the backend
      const answersPayload = Object.entries(answers).map(([questionId, answerData]) => {
        const payload = { question: parseInt(questionId) };
        if (answerData.text_answer) {
          payload.text_answer = answerData.text_answer;
        }
        if (answerData.selected_choice_ids && answerData.selected_choice_ids.length > 0) {
          payload.selected_choice_ids = answerData.selected_choice_ids;
        }
        return payload;
      });

      const res = await instance.post(`/exams/online-tests/attempts/${attemptId}/submit/`, {
        answers: answersPayload
      });

      setResult({
        score: res.data.auto_score || 0,
        total_marks: res.data.total_marks || testData?.total_marks || 0,
        status: res.data.status,
        message: res.data.status === 'published' 
          ? 'Your results are ready!' 
          : 'Your test has been submitted for grading.'
      });
    } catch (err) {
      console.error('Submit error:', err);
      setResult({
        score: 0,
        total_marks: testData?.total_marks || 0,
        status: 'submitted',
        message: 'Your test has been submitted successfully.'
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [attemptId, answers, testData]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || result || loading) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result, handleFinish, loading]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle MCQ single/true-false selection
  const handleSingleSelect = (questionId, choiceId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], selected_choice_ids: [choiceId] }
    }));
  };

  // Handle MCQ multi selection
  const handleMultiSelect = (questionId, choiceId) => {
    setAnswers(prev => {
      const current = prev[questionId]?.selected_choice_ids || [];
      const updated = current.includes(choiceId)
        ? current.filter(id => id !== choiceId)
        : [...current, choiceId];
      return { ...prev, [questionId]: { ...prev[questionId], selected_choice_ids: updated } };
    });
  };

  // Handle text-based answers (short, long, fill)
  const handleTextAnswer = (questionId, text) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], text_answer: text }
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.loader} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Loader2 size={36} className="animate-spin" style={{ color: '#6366f1' }} />
        <span>Preparing your test...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 40 }}>
        <AlertTriangle size={48} style={{ color: '#f59e0b' }} />
        <h3 style={{ margin: 0, color: '#1e293b' }}>Unable to Start Test</h3>
        <p style={{ color: '#64748b', textAlign: 'center', maxWidth: 400 }}>{error}</p>
        <button onClick={onBack} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  // Result screen
  if (result) {
    return (
      <div className={styles.resultContainer}>
        <div className={styles.resultCard}>
          <div className={styles.successIcon}>
            <CheckCircle size={64} />
          </div>
          <h2>Test Submitted Successfully!</h2>
          <p className={styles.resultMsg}>
            {result.status === 'published' 
              ? <>Your score for <strong>{testData?.title}</strong>:</>
              : <>Your answers for <strong>{testData?.title}</strong> have been submitted for grading.</>
            }
          </p>
          
          {result.status === 'published' && (
            <div className={styles.scoreBoard}>
              <div className={styles.scoreItem}>
                <span className={styles.scoreLabel}>Final Score</span>
                <span className={styles.scoreVal}>{result.score} / {result.total_marks}</span>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreLabel}>Percentage</span>
                <span className={styles.scoreVal}>
                  {result.total_marks > 0 ? Math.round((result.score / result.total_marks) * 100) : 0}%
                </span>
              </div>
            </div>
          )}

          {result.status !== 'published' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ color: '#92400e', margin: 0, fontSize: 14, fontWeight: 600 }}>
                ⏳ Your teacher will review and grade your responses. Results will be available once grading is complete.
              </p>
            </div>
          )}

          <button className={styles.doneBtn} onClick={onBack}>
            Return to Test List
          </button>
        </div>
      </div>
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p>This test has no questions.</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIdx === totalQuestions - 1;
  const answeredCount = Object.keys(answers).filter(qId => {
    const a = answers[qId];
    return (a.text_answer && a.text_answer.trim()) || (a.selected_choice_ids && a.selected_choice_ids.length > 0);
  }).length;

  return (
    <div className={styles.playerWrapper}>
      <header className={styles.testHeader || styles.quizHeader}>
        <button className={styles.exitBtn} onClick={onBack}>
          <ArrowLeft size={18} />
          Exit
        </button>
        <h2 className={styles.testTitle || styles.quizTitle}>{testData?.title}</h2>
        <div className={`${styles.timer} ${timeLeft < 300 ? styles.timerWarning : ''}`}>
          <Clock size={18} />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </header>

      <div className={styles.playerBody}>
        {/* Side Navigation */}
        <aside className={styles.sideNav}>
          <div className={styles.navHeader}>Navigation</div>
          <div className={styles.questionGrid}>
            {questions.map((q, idx) => {
              const a = answers[q.id];
              const isAnswered = a && ((a.text_answer && a.text_answer.trim()) || (a.selected_choice_ids && a.selected_choice_ids.length > 0));
              return (
                <button
                  key={idx}
                  className={`${styles.navBtn} ${currentQuestionIdx === idx ? styles.navActive : ''} ${isAnswered ? styles.navAnswered : ''}`}
                  onClick={() => setCurrentQuestionIdx(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}><span className={styles.legAnswered}></span> Answered</div>
            <div className={styles.legendItem}><span className={styles.legCurrent}></span> Current</div>
            <div className={styles.legendItem}><span className={styles.legPending}></span> Pending</div>
          </div>
        </aside>

        {/* Main Question Area */}
        <main className={styles.mainArea}>
          <div className={styles.questionCard}>
            <div className={styles.questionHead}>
              <span className={styles.qNum}>Question {currentQuestionIdx + 1} of {totalQuestions}</span>
              <span className={styles.qMarks}>{currentQuestion.marks} Marks</span>
            </div>
            
            <h3 className={styles.qText}>{currentQuestion.text}</h3>
            
            {/* MCQ Single / True-False */}
            {(currentQuestion.question_type === 'mcq_single' || currentQuestion.question_type === 'truefalse') && (
              <div className={styles.optionsList}>
                {(currentQuestion.choices || []).map((choice, idx) => (
                  <label 
                    key={choice.id} 
                    className={`${styles.optionItem} ${
                      answers[currentQuestion.id]?.selected_choice_ids?.includes(choice.id) ? styles.optionSelected : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQuestion.id}`}
                      checked={answers[currentQuestion.id]?.selected_choice_ids?.includes(choice.id) || false}
                      onChange={() => handleSingleSelect(currentQuestion.id, choice.id)}
                    />
                    <span className={styles.optionChar}>{String.fromCharCode(65 + idx)}</span>
                    <span className={styles.optionText}>{choice.text}</span>
                  </label>
                ))}
              </div>
            )}

            {/* MCQ Multi */}
            {currentQuestion.question_type === 'mcq_multi' && (
              <div className={styles.optionsList}>
                {(currentQuestion.choices || []).map((choice, idx) => (
                  <label 
                    key={choice.id} 
                    className={`${styles.optionItem} ${
                      answers[currentQuestion.id]?.selected_choice_ids?.includes(choice.id) ? styles.optionSelected : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={answers[currentQuestion.id]?.selected_choice_ids?.includes(choice.id) || false}
                      onChange={() => handleMultiSelect(currentQuestion.id, choice.id)}
                    />
                    <span className={styles.optionChar}>{String.fromCharCode(65 + idx)}</span>
                    <span className={styles.optionText}>{choice.text}</span>
                  </label>
                ))}
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Select all that apply</p>
              </div>
            )}

            {/* Short Answer */}
            {currentQuestion.question_type === 'short' && (
              <div style={{ marginTop: 16 }}>
                <input
                  type="text"
                  placeholder="Type your answer..."
                  value={answers[currentQuestion.id]?.text_answer || ''}
                  onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: 12,
                    border: '2px solid #e2e8f0', fontSize: 16, fontWeight: 600,
                    outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            )}

            {/* Long Description */}
            {currentQuestion.question_type === 'long' && (
              <div style={{ marginTop: 16 }}>
                <textarea
                  rows={6}
                  placeholder="Write your detailed answer..."
                  value={answers[currentQuestion.id]?.text_answer || ''}
                  onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: 12,
                    border: '2px solid #e2e8f0', fontSize: 15, fontWeight: 500,
                    outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            )}

            {/* Fill in Blank */}
            {currentQuestion.question_type === 'fill' && (
              <div style={{ marginTop: 16 }}>
                <input
                  type="text"
                  placeholder="Fill in the blank..."
                  value={answers[currentQuestion.id]?.text_answer || ''}
                  onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: 12,
                    border: '2px dashed #e2e8f0', fontSize: 16, fontWeight: 600,
                    outline: 'none', textAlign: 'center', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            )}
          </div>

          {/* Navigation Actions */}
          <div className={styles.actionRow}>
            <button 
              className={styles.pBtn}
              disabled={currentQuestionIdx === 0}
              onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            
            {isLastQuestion ? (
              <button 
                className={styles.submitBtn}
                onClick={() => setShowConfirmSubmit(true)}
              >
                Submit Test
                <Send size={18} />
              </button>
            ) : (
              <button 
                className={styles.nBtn}
                onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
              >
                Next
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.modalIcon}><AlertTriangle size={48} /></div>
            <h3>Finish Test?</h3>
            <p>You have answered <strong>{answeredCount}</strong> out of <strong>{totalQuestions}</strong> questions. Are you sure you want to submit?</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowConfirmSubmit(false)}>Continue Test</button>
              <button className={styles.confirmBtn} onClick={handleFinish} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
