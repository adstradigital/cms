'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  Eye, 
  Zap, 
  Target,
  Clock,
  ArrowLeft
} from 'lucide-react';
import styles from '../BrainGames.module.css';

export default function SchulteTable({ onWin }) {
  const [grid, setGrid] = useState([]);
  const [nextNum, setNextNum] = useState(1);
  const [startTime, setStartTime] = useState(null);
  const [finalTime, setFinalTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [flash, setFlash] = useState(null); // { status: 'success' | 'error', id: number }
  
  const timerRef = useRef(null);

  const initGame = useCallback(() => {
    const nums = Array.from({ length: 25 }, (_, i) => i + 1);
    // Fisher-Yates shuffle
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setGrid(nums);
    setNextNum(1);
    setIsRunning(false);
    setStartTime(null);
    setFinalTime(null);
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    let interval;
    if (isRunning && !finalTime) {
      interval = setInterval(() => {
        setCurrentTime((performance.now() - startTime) / 1000);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime, finalTime]);

  const handleCellClick = (num) => {
    if (finalTime) return;

    if (!isRunning) {
      if (num === 1) {
        setIsRunning(true);
        setStartTime(performance.now());
        setNextNum(2);
        triggerFlash('success');
      } else {
        triggerFlash('error');
      }
      return;
    }

    if (num === nextNum) {
      if (num === 25) {
        const finish = performance.now();
        const duration = (finish - startTime) / 1000;
        setFinalTime(duration);
        setIsRunning(false);
        if (onWin) onWin(duration);
      } else {
        setNextNum(prev => prev + 1);
        triggerFlash('success');
      }
    } else {
      triggerFlash('error');
    }
  };

  const triggerFlash = (status) => {
    setFlash(status);
    setTimeout(() => setFlash(null), 200);
  };

  return (
    <div className={styles.puzzleWrapper}>
      <header className={styles.gameHeader}>
        <div className={styles.focusGuide}>
          <Eye size={18} />
          Keep your gaze on the center square
        </div>
        <div className={styles.gameStats}>
            <div className={`${styles.statChip} ${isRunning ? styles.statActive : ''}`}>
                <Clock size={16} /> {currentTime.toFixed(2)}s
            </div>
            <div className={styles.statChip}>
                <Target size={16} /> Find: <span className={styles.nextTarget}>{nextNum}</span>
            </div>
            <button className={styles.resetBtn} onClick={initGame}><RotateCcw size={16} /></button>
        </div>
      </header>

      <div className={`${styles.schulteGrid} ${flash ? styles['grid' + flash] : ''}`}>
        {grid.map((num, idx) => (
          <div 
            key={idx}
            className={`${styles.schulteCell} ${idx === 12 ? styles.centerCell : ''}`}
            onClick={() => handleCellClick(num)}
          >
            {num}
            {idx === 12 && <div className={styles.anchorPoint} />}
          </div>
        ))}
      </div>

      <div className={styles.instructions}>
        <p>1. Fix your eyes on the <strong>center dot</strong>.</p>
        <p>2. Use peripheral vision to find numbers <strong>1-25</strong>.</p>
        <p>3. Tap them in order as fast as you can.</p>
      </div>

      {finalTime && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            <Zap size={64} color="#f59e0b" fill="#f59e0b20" />
            <h2>Lightning Focus!</h2>
            <p>You completed the Schulte Table in</p>
            <div className={styles.finalTimeResult}>{finalTime.toFixed(3)}s</div>
            
            <div className={styles.performanceMetrics}>
                <div className={styles.metric}>
                    <span>Speed</span>
                    <strong>{(25 / finalTime).toFixed(2)} n/s</strong>
                </div>
                <div className={styles.metric}>
                    <span>Rating</span>
                    <strong className={finalTime < 20 ? styles.ratingElite : styles.ratingGood}>
                        {finalTime < 20 ? 'Elite' : finalTime < 35 ? 'Good' : 'Keep Training'}
                    </strong>
                </div>
            </div>

            <button className={styles.restartBtn} onClick={initGame}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
