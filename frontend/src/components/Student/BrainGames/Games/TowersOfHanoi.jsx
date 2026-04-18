'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  ArrowLeft,
  ChevronRight,
  Info,
  Hash,
  Activity,
  Play,
  Lightbulb,
  Lock,
  CheckCircle,
  Cpu
} from 'lucide-react';
import styles from '../BrainGames.module.css';

const STAGES = [
  { id: 1, disks: 3, name: 'Freshman' },
  { id: 2, disks: 4, name: 'Scholar' },
  { id: 3, disks: 5, name: 'Logician' },
  { id: 4, disks: 6, name: 'Master' },
  { id: 5, disks: 7, name: 'Grandmaster' }
];

export default function TowersOfHanoi({ onWin }) {
  const [currentStage, setCurrentStage] = useState(1);
  const [unlockedStage, setUnlockedStage] = useState(1);
  const [pegs, setPegs] = useState([[], [], []]);
  const [selectedPeg, setSelectedPeg] = useState(null);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [message, setMessage] = useState('Select a disk to move');
  const [isSolving, setIsSolving] = useState(false);
  const [hint, setHint] = useState(null); // { from, to }

  // AI Solver Queue
  const solveQueue = useRef([]);
  const solveTimer = useRef(null);

  const initGame = useCallback((stageId = currentStage) => {
    const stage = STAGES.find(s => s.id === stageId);
    const count = stage.disks;
    const initialDisks = Array.from({ length: count }, (_, i) => count - i);
    
    setPegs([initialDisks, [], []]);
    setMoves(0);
    setIsWon(false);
    setSelectedPeg(null);
    setCurrentStage(stageId);
    setMessage(`Level ${stageId}: ${stage.name}`);
    setIsSolving(false);
    setHint(null);
    if (solveTimer.current) clearInterval(solveTimer.current);
    solveQueue.current = [];
  }, [currentStage]);

  // Load persistence from local storage (simplified for demo)
  useEffect(() => {
    const saved = localStorage.getItem('hanoi_unlocked_stage');
    if (saved) setUnlockedStage(parseInt(saved));
    initGame(1);
  }, []);

  const handlePegClick = (pegIdx) => {
    if (isWon || isSolving) return;

    if (selectedPeg === null) {
      if (pegs[pegIdx].length === 0) {
        setMessage('This peg is empty!');
        return;
      }
      setSelectedPeg(pegIdx);
      setMessage('Choose a destination peg');
      setHint(null);
    } else {
      if (selectedPeg === pegIdx) {
        setSelectedPeg(null);
        setMessage('Selection cancelled');
        return;
      }
      
      const sourcePeg = pegs[selectedPeg];
      const destPeg = pegs[pegIdx];
      const movingDisk = sourcePeg[sourcePeg.length - 1];
      const targetDisk = destPeg[destPeg.length - 1];

      if (destPeg.length > 0 && movingDisk > targetDisk) {
        setMessage('Invalid move! Larger disk cannot go on smaller one.');
        return;
      }

      executeMove(selectedPeg, pegIdx);
    }
  };

  const executeMove = (from, to) => {
    const diskCount = STAGES.find(s => s.id === currentStage).disks;
    let isGameOver = false;

    setPegs(prev => {
      const newPegs = JSON.parse(JSON.stringify(prev));
      const disk = newPegs[from].pop();
      newPegs[to].push(disk);
      
      if (to !== 0 && newPegs[to].length === diskCount) {
        isGameOver = true;
      }
      return newPegs;
    });

    setMoves(m => {
      const newMoves = m + 1;
      if (isGameOver) {
        handleWin(newMoves);
      }
      return newMoves;
    });

    setSelectedPeg(null);
    setHint(null);
  };

  const handleWin = (finalMoves) => {
    setIsWon(true);
    const nextStage = currentStage + 1;
    if (nextStage > unlockedStage && nextStage <= 5) {
      setUnlockedStage(nextStage);
      localStorage.setItem('hanoi_unlocked_stage', nextStage.toString());
    }
    if (onWin && !isSolving) onWin(finalMoves);
  };

  // --- AI SOLVER ---
  const getHanoiMoves = (n, from, to, aux, queue) => {
    if (n === 1) {
      queue.push({ from, to });
      return;
    }
    getHanoiMoves(n - 1, from, aux, to, queue);
    queue.push({ from, to });
    getHanoiMoves(n - 1, aux, to, from, queue);
  };

  const startAutoSolve = () => {
    initGame();
    setIsSolving(true);
    const queue = [];
    const diskCount = STAGES.find(s => s.id === currentStage).disks;
    getHanoiMoves(diskCount, 0, 2, 1, queue);
    
    let i = 0;
    solveTimer.current = setInterval(() => {
      if (i >= queue.length) {
        clearInterval(solveTimer.current);
        setIsSolving(false);
        return;
      }
      const move = queue[i];
      executeMove(move.from, move.to);
      i++;
    }, 600);
  };

  const provideHint = () => {
    // For manual hinting, we just show the first move of a full solve from current state
    // (In a real app, this would calculate from the current arbitrary state)
    setMessage('Hint: Focus on moving smaller disks to target peg.');
    setHint({ from: 0, to: 1 }); // Simplified hint for demo
  };

  const optimalMoves = (2 ** STAGES.find(s => s.id === currentStage).disks) - 1;

  return (
    <div className={styles.puzzleWrapper}>
      <header className={styles.gameHeader}>
        <div className={styles.stageNavigator}>
          {STAGES.map(s => {
            const isLocked = s.id > unlockedStage;
            const isSolved = s.id < unlockedStage;
            return (
              <button 
                key={s.id}
                className={`${styles.stageBtn} ${currentStage === s.id ? styles.stageBtnActive : ''} ${isLocked ? styles.stageBtnLocked : ''} ${isSolved ? styles.stageBtnSolved : ''}`}
                onClick={() => !isLocked && initGame(s.id)}
                disabled={isLocked}
              >
                {isLocked ? <Lock size={14} className={styles.stageLockIcon} /> : (isSolved ? <CheckCircle size={16} /> : s.id)}
              </button>
            );
          })}
        </div>

        <div className={styles.aiControls}>
          <button className={`${styles.aiBtn} ${isSolving ? styles.aiBtnSolving : ''}`} onClick={startAutoSolve} disabled={isSolving}>
            <Cpu size={18} /> {isSolving ? 'Solving...' : 'Auto-Solve'}
          </button>
          <button className={styles.aiBtn} onClick={provideHint} disabled={isSolving || isWon}>
            <Lightbulb size={18} /> Hint
          </button>
        </div>

        <div className={styles.gameStats}>
            <div className={styles.statChip}><Activity size={16} /> Moves: <strong>{moves}</strong></div>
            <div className={styles.statChip}><Hash size={16} /> Target: <strong>{optimalMoves}</strong></div>
            <button className={styles.resetBtn} onClick={() => initGame()}><RotateCcw size={16} /></button>
        </div>
        <div className={styles.gameMsg}>{message}</div>
      </header>

      <div className={styles.hanoiStage}>
        {pegs.map((peg, pIdx) => (
          <div 
            key={pIdx} 
            className={`${styles.hanoiPegWrapper} ${selectedPeg === pIdx ? styles.pegSelected : ''}`}
            onClick={() => handlePegClick(pIdx)}
          >
            <div className={styles.hanoiPeg} />
            <div className={styles.diskStack}>
              {peg.map((disk, dIdx) => {
                const isSelected = selectedPeg === pIdx && dIdx === peg.length - 1;
                return (
                  <div 
                    key={dIdx} 
                    className={`${styles.hanoiDisk} ${isSelected ? styles.diskFloating : ''}`}
                    style={{ 
                      width: `${40 + (disk * 12)}%`,
                      backgroundColor: `hsl(${disk * 45}, 70%, 55%)`,
                      bottom: `${dIdx * 30}px`,
                      zIndex: isSelected ? 10 : 1
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <div className={styles.hanoiBase} />
      </div>

      <div className={styles.instructions}>
        <p><Info size={14} /> <strong>Level {currentStage}:</strong> {STAGES.find(s => s.id === currentStage).name} Rank. Complete this to unlock the next Recursive Challenge.</p>
      </div>

      {isWon && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            <Trophy size={64} color="#ef4444" fill="#ef444420" />
            <h2>{currentStage === 5 ? 'Ultimate Mastery!' : 'Level Conquered!'}</h2>
            <p>You solved the {STAGES.find(s => s.id === currentStage).name} stage in {moves} moves.</p>
            <div className={styles.scoreCompare}>
              Target: {optimalMoves} | Accuracy: {Math.round((optimalMoves/moves)*100)}%
            </div>
            <div className={styles.winActions}>
              <button className={styles.restartBtn} onClick={() => initGame()}>Retry</button>
              {currentStage < 5 && unlockedStage > currentStage && (
                <button className={styles.submitBtn} onClick={() => initGame(currentStage + 1)}>
                   Next Stage <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
