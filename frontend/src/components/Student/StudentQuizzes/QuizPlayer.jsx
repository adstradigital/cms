'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Send, 
  AlertTriangle,
  CheckCircle,
  X,
  ArrowLeft
} from 'lucide-react';
import styles from './QuizPlayer.module.css';

export default function QuizPlayer({ quizId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`/api/exams/quizzes/${quizId}/`);
      if (!response.ok) throw new Error('Failed to load quiz');
      const data = await response.json();
      setQuizData(data.quiz);
      // Initialize timer (convert minutes to seconds)
      setTimeLeft(data.quiz.duration_minutes * 60);
      setLoading(false);
    } catch (err) {
      console.error(err);
      // Fallback for demo
      const mockQuiz = {
        name: "Mathematics Unit 2: Calculus",
        duration_minutes: 45,
        questions_details: [
          {
            id: 101,
            question_text: "What is the derivative of x^2?",
            question_type: "MCQ",
            options: ["x", "2x", "2x^2", "1/x"],
            marks: "2.00"
          },
          {
            id: 102,
            question_text: "The integral of sin(x) is -cos(x).",
            question_type: "True/False",
            options: ["True", "False"],
            marks: "1.00"
          },
          {
            id: 103,
            question_text: "Evaluate the limit as x approaches 0 of (sin x)/x.",
            question_type: "MCQ",
            options: ["0", "1", "Infinity", "Undefined"],
            marks: "2.00"
          }
        ]
      };
      setQuizData(mockQuiz);
      setTimeLeft(mockQuiz.duration_minutes * 60);
      setLoading(false);
    }
  };

  const handleFinish = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/exams/quizzes/${quizId}/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      // Mock result for demo
      const correctCount = Object.keys(answers).length; // Just a mock
      setResult({
        score: correctCount * 2,
        total_marks: quizData.questions_details.length * 2,
        message: "Demo submission complete!"
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [quizId, answers, quizData]);

  useEffect(() => {
    if (timeLeft <= 0 || result) return;
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
  }, [timeLeft, result, handleFinish]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (questionId, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  if (loading) return <div className={styles.loader}>Loading your quiz...</div>;

  if (result) {
    return (
      <div className={styles.resultContainer}>
        <div className={styles.resultCard}>
          <div className={styles.successIcon}>
            <CheckCircle size={64} />
          </div>
          <h2>Quiz Submitted Successfully!</h2>
          <p className={styles.resultMsg}>Great job finishing the <strong>{quizData.name}</strong>.</p>
          
          <div className={styles.scoreBoard}>
            <div className={styles.scoreItem}>
              <span className={styles.scoreLabel}>Final Score</span>
              <span className={styles.scoreVal}>{result.score} / {result.total_marks}</span>
            </div>
            <div className={styles.scoreItem}>
              <span className={styles.scoreLabel}>Percentage</span>
              <span className={styles.scoreVal}>{Math.round((result.score / result.total_marks) * 100)}%</span>
            </div>
          </div>

          <button className={styles.doneBtn} onClick={onBack}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.questions_details[currentQuestionIdx];
  const totalQuestions = quizData.questions_details.length;
  const isLastQuestion = currentQuestionIdx === totalQuestions - 1;

  return (
    <div className={styles.playerWrapper}>
      <header className={styles.quizHeader}>
        <button className={styles.exitBtn} onClick={onBack}>
          <ArrowLeft size={18} />
          Exit
        </button>
        <h2 className={styles.quizTitle}>{quizData.name}</h2>
        <div className={`${styles.timer} ${timeLeft < 300 ? styles.timerWarning : ''}`}>
          <Clock size={18} />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </header>

      <div className={styles.playerBody}>
        <aside className={styles.sideNav}>
          <div className={styles.navHeader}>Navigation</div>
          <div className={styles.questionGrid}>
            {quizData.questions_details.map((_, idx) => (
              <button
                key={idx}
                className={`${styles.navBtn} ${currentQuestionIdx === idx ? styles.navActive : ''} ${answers[quizData.questions_details[idx].id] ? styles.navAnswered : ''}`}
                onClick={() => setCurrentQuestionIdx(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}><span className={styles.legAnswered}></span> Answered</div>
            <div className={styles.legendItem}><span className={styles.legCurrent}></span> Current</div>
            <div className={styles.legendItem}><span className={styles.legPending}></span> Pending</div>
          </div>
        </aside>

        <main className={styles.mainArea}>
          <div className={styles.questionCard}>
            <div className={styles.questionHead}>
              <span className={styles.qNum}>Question {currentQuestionIdx + 1} of {totalQuestions}</span>
              <span className={styles.qMarks}>{currentQuestion.marks} Marks</span>
            </div>
            
            <h3 className={styles.qText}>{currentQuestion.question_text}</h3>
            
            <div className={styles.optionsList}>
              {currentQuestion.options.map((option, idx) => (
                <label 
                  key={idx} 
                  className={`${styles.optionItem} ${answers[currentQuestion.id] === option ? styles.optionSelected : ''}`}
                >
                  <input
                    type="radio"
                    name={`q-${currentQuestion.id}`}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={() => handleOptionSelect(currentQuestion.id, option)}
                  />
                  <span className={styles.optionChar}>{String.fromCharCode(65 + idx)}</span>
                  <span className={styles.optionText}>{option}</span>
                </label>
              ))}
            </div>
          </div>

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
                Submit Quiz
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

      {showConfirmSubmit && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.modalIcon}><AlertTriangle size={48} /></div>
            <h3>Finish Quiz?</h3>
            <p>You have answered {Object.keys(answers).length} out of {totalQuestions} questions. Are you sure you want to submit?</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowConfirmSubmit(false)}>Continue Quiz</button>
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
