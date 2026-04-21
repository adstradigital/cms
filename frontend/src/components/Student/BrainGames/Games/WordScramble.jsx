'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  HelpCircle, 
  ChevronRight,
  Clock,
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';
import styles from '../BrainGames.module.css';

const DICTIONARY = {
  Science: ['photosynthesis', 'mitochondria', 'gravitation', 'evaporation', 'molecule', 'atmosphere', 'ecosystem', 'heredity', 'organism', 'nebula', 'chromosome', 'velocity', 'equilibrium', 'catalyst'],
  Math: ['geometry', 'calculus', 'equations', 'fraction', 'percentage', 'triangle', 'algorithm', 'symmetry', 'variable', 'matrix', 'probability', 'derivative', 'integration', 'polynomial'],
  General: ['innovation', 'knowledge', 'strategic', 'intelligence', 'perspective', 'education', 'language', 'curiosity', 'discovery', 'challenge', 'achievement', 'philosophy', 'adventure', 'resilience']
};

export default function WordScramble({ onWin }) {
  const [category, setCategory] = useState('General');
  const [word, setWord] = useState('');
  const [scrambled, setScrambled] = useState('');
  const [guess, setGuess] = useState('');
  const [timer, setTimer] = useState(60);
  const [score, setScore] = useState(0);
  const [hints, setHints] = useState(2);
  const [message, setMessage] = useState('Unscramble the word!');
  const [isGameOver, setIsGameOver] = useState(false);

  const scramble = (str) => {
    const arr = str.split('');
    let scrambledStr = str;
    
    // Keep shuffling until the word is actually scrambled (not equal to original)
    while (scrambledStr === str && str.length > 1) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      scrambledStr = arr.join('');
    }
    return scrambledStr;
  };

  const nextWord = useCallback((cat = category) => {
    const list = DICTIONARY[cat];
    const newWord = list[Math.floor(Math.random() * list.length)];
    setWord(newWord);
    setScrambled(scramble(newWord));
    setGuess('');
    setMessage(`Category: ${cat}`);
  }, [category]);

  useEffect(() => {
    nextWord();
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setIsGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [nextWord]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (guess.toLowerCase() === word.toLowerCase()) {
      const points = 100 + (timer * 2);
      setScore(s => s + points);
      setMessage('Correct! +100 Points');
      setTimeout(() => nextWord(), 1000);
      if (onWin) onWin(points);
    } else {
      setMessage('Not quite, try again!');
    }
  };

  const useHint = () => {
    if (hints > 0) {
      setGuess(word[0] + '...');
      setHints(h => h - 1);
      setMessage('First letter revealed!');
    }
  };

  if (isGameOver) {
    return (
      <div className={styles.winOverlay}>
        <div className={styles.winCard}>
          <Trophy size={64} color="#6366f1" />
          <h2>Blitz Over!</h2>
          <p>You scored {score} points.</p>
          <button className={styles.restartBtn} onClick={() => {
            setTimer(60);
            setScore(0);
            setHints(2);
            setIsGameOver(false);
            nextWord();
          }}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.puzzleWrapper}>
      <header className={styles.gameHeader}>
        <div className={styles.gameStats}>
            <div className={styles.statChip}><Clock size={16} /> {timer}s</div>
            <div className={styles.statChip}>Score: {score}</div>
            <div className={styles.statChip}>Hints: {hints}</div>
            <button className={styles.resetBtn} onClick={() => nextWord()}><RotateCcw size={16} /></button>
        </div>
        <div className={styles.gameMsg}>{message}</div>
      </header>

      <div className={styles.scrambleBox}>
        <div className={styles.wordDisplay}>
           {scrambled.toUpperCase().split('').map((char, i) => (
             <span key={i} className={styles.charBadge}>{char}</span>
           ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.scrambleForm}>
          <input 
            type="text" 
            placeholder="Type your answer..." 
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className={styles.scrambleInput}
            autoFocus
          />
          <div className={styles.actionRow}>
            <button type="button" className={styles.hintBtn} onClick={useHint} disabled={hints === 0}>
               <HelpCircle size={18} /> Hint
            </button>
            <button type="submit" className={styles.submitBtn}>
               Check <ChevronRight size={18} />
            </button>
          </div>
        </form>
      </div>

      <div className={styles.categoryPills}>
        {Object.keys(DICTIONARY).map(cat => (
          <button 
            key={cat} 
            className={`${styles.catPill} ${category === cat ? styles.catPillActive : ''}`}
            onClick={() => {
              setCategory(cat);
              nextWord(cat);
            }}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
