'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Zap, 
  Trophy, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Timer,
  LayoutGrid
} from 'lucide-react';
import styles from './Categorization.module.css';

const GAME_DATA = [
  { term: 'Mitochondria', category: 'Biology', alternate: 'Physics' },
  { term: 'Quantum Entanglement', category: 'Physics', alternate: 'Biology' },
  { term: 'Photosynthesis', category: 'Biology', alternate: 'Chemistry' },
  { term: 'Isotope', category: 'Chemistry', alternate: 'Biology' },
  { term: 'Prime Number', category: 'Math', alternate: 'Literature' },
  { term: 'Metaphor', category: 'Literature', alternate: 'Math' },
  { term: 'Renaissance', category: 'History', alternate: 'Geography' },
  { term: 'Plate Tectonics', category: 'Geography', alternate: 'History' },
  { term: 'Thermodynamics', category: 'Physics', alternate: 'Math' },
  { term: 'Fibonacci Sequence', category: 'Math', alternate: 'Physics' },
  { term: 'Iambic Pentameter', category: 'Literature', alternate: 'History' },
  { term: 'Industrial Revolution', category: 'History', alternate: 'Literature' },
  { term: 'Mitosis', category: 'Biology', alternate: 'Geography' },
  { term: 'Himalayas', category: 'Geography', alternate: 'Biology' },
  { term: 'Benzene Ring', category: 'Chemistry', alternate: 'Math' },
  { term: 'Differential Equations', category: 'Math', alternate: 'Chemistry' },
  { term: 'Black Hole', category: 'Physics', alternate: 'Geography' },
  { term: 'Glaciation', category: 'Geography', alternate: 'History' },
  { term: 'French Revolution', category: 'History', alternate: 'Literature' },
  { term: 'Stoichiometry', category: 'Chemistry', alternate: 'Biology' },
];

export default function Categorization({ onWin }) {
  const [gameState, setGameState] = useState('idle'); // idle, playing, won, lost
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [activeItem, setActiveItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'correct', 'wrong'
  const timerRef = useRef(null);

  const startNewRound = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * GAME_DATA.length);
    const item = GAME_DATA[randomIndex];
    
    // Shuffle categories so they aren't always in the same place
    const categories = [item.category, item.alternate].sort(() => Math.random() - 0.5);
    
    setActiveItem({
      ...item,
      options: categories
    });
    setFeedback(null);
  }, []);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(30);
    setCurrentRound(0);
    startNewRound();
  };

  const handleChoice = (choice) => {
    if (gameState !== 'playing' || feedback) return;

    if (choice === activeItem.category) {
      setScore(s => s + 10);
      setFeedback('correct');
      setTimeout(() => {
        startNewRound();
      }, 500);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        startNewRound();
      }, 800);
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('ended');
      if (onWin) onWin(score);
    }

    return () => clearInterval(timerRef.current);
  }, [gameState, timeLeft, score, onWin]);

  if (gameState === 'idle') {
    return (
      <div className={styles.gameView}>
        <div className={styles.introCard}>
          <div className={styles.gameIcon}>
            <LayoutGrid size={64} color="#8b5cf6" />
          </div>
          <h2>Academic Sorter</h2>
          <p>Categorize the terms as fast as you can before time runs out!</p>
          <div className={styles.statsPreview}>
            <div className={styles.previewItem}>
              <Timer size={20} />
              <span>30 Seconds</span>
            </div>
            <div className={styles.previewItem}>
              <Zap size={20} />
              <span>+10 XP / Correct</span>
            </div>
          </div>
          <button className={styles.startBtn} onClick={startGame}>
            Initialize Sorter
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'ended') {
    return (
      <div className={styles.gameView}>
        <div className={styles.resultCard}>
          <Trophy size={64} color="#f59e0b" className={styles.trophyAnim} />
          <h2>Training Complete</h2>
          <div className={styles.finalScore}>
            <span className={styles.scoreLabel}>Final Score</span>
            <span className={styles.scoreValue}>{score}</span>
          </div>
          <div className={styles.xpGain}>
            <Zap size={18} fill="#ff7a00" stroke="none" />
            <span>Earned {Math.floor(score / 2)} Experience Points</span>
          </div>
          <button className={styles.retryBtn} onClick={startGame}>
            <RotateCcw size={18} /> Restart Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gameView}>
      <header className={styles.gameHeader}>
        <div className={styles.timer}>
          <Timer size={20} className={timeLeft <= 5 ? styles.urgent : ''} />
          <span className={timeLeft <= 5 ? styles.urgentText : ''}>{timeLeft}s</span>
        </div>
        <div className={styles.scoreBoard}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.value}>{score}</span>
        </div>
      </header>

      <div className={styles.mainArea}>
        {activeItem && (
          <div className={`${styles.termCard} ${feedback === 'correct' ? styles.correctTerm : ''} ${feedback === 'wrong' ? styles.wrongTerm : ''}`}>
            {feedback === 'correct' && <CheckCircle2 className={styles.statusIcon} color="#22c55e" size={48} />}
            {feedback === 'wrong' && <AlertCircle className={styles.statusIcon} color="#ef4444" size={48} />}
            <h1 className={styles.termText}>{activeItem.term}</h1>
          </div>
        )}

        <div className={styles.optionsGrid}>
          {activeItem?.options.map((option, idx) => (
            <button 
              key={idx} 
              className={`${styles.optionBtn} ${feedback && option === activeItem.category ? styles.isCorrect : ''} ${feedback === 'wrong' && option !== activeItem.category ? styles.isWrong : ''}`}
              onClick={() => handleChoice(option)}
              disabled={!!feedback}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      
      <div className={styles.controlsPlaceholder}>
        <p>Choose the correct academic department for the term above.</p>
      </div>
    </div>
  );
}
