'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  Lightbulb, 
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Lock,
  Zap,
  Info
} from 'lucide-react';
import styles from '../BrainGames.module.css';

const STAGES = [
  { 
    id: 1, 
    name: 'Junior', 
    size: 4, 
    blockRows: 2, 
    blockCols: 2, 
    xp: 100,
    puzzle: [
      [1, 0, 3, 0],
      [0, 0, 0, 2],
      [2, 0, 0, 0],
      [0, 4, 0, 1]
    ]
  },
  { 
    id: 2, 
    name: 'Apprentice', 
    size: 6, 
    blockRows: 2, 
    blockCols: 3, 
    xp: 200,
    puzzle: [
      [1, 0, 0, 0, 5, 6],
      [0, 6, 4, 1, 0, 2],
      [3, 0, 0, 4, 6, 0],
      [0, 4, 6, 0, 0, 3],
      [4, 0, 1, 6, 2, 0],
      [6, 5, 0, 0, 0, 4]
    ]
  },
  { 
    id: 3, 
    name: 'Scholar', 
    size: 9, 
    blockRows: 3, 
    blockCols: 3, 
    xp: 350,
    puzzle: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ]
  },
  { 
    id: 4, 
    name: 'Sage', 
    size: 9, 
    blockRows: 3, 
    blockCols: 3, 
    xp: 500,
    puzzle: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 3, 0, 8, 5],
      [0, 0, 1, 0, 2, 0, 0, 0, 0],
      [0, 0, 0, 5, 0, 7, 0, 0, 0],
      [0, 0, 4, 0, 0, 0, 1, 0, 0],
      [0, 9, 0, 0, 0, 0, 0, 0, 0],
      [5, 0, 0, 0, 0, 0, 0, 7, 3],
      [0, 0, 2, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 4, 0, 0, 0, 9]
    ]
  },
  { 
    id: 5, 
    name: 'Grandmaster', 
    size: 9, 
    blockRows: 3, 
    blockCols: 3, 
    xp: 750,
    puzzle: [
      [0, 0, 0, 6, 0, 0, 4, 0, 0],
      [7, 0, 0, 0, 0, 3, 6, 0, 0],
      [0, 0, 0, 0, 9, 1, 0, 8, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 5, 0, 1, 8, 0, 0, 0, 3],
      [0, 0, 0, 3, 0, 6, 0, 4, 5],
      [0, 4, 0, 2, 0, 0, 0, 6, 0],
      [9, 0, 3, 0, 0, 0, 0, 0, 0],
      [0, 2, 0, 0, 0, 0, 1, 0, 0]
    ]
  }
];

export default function Sudoku({ onWin }) {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [grid, setGrid] = useState([]);
  const [initialGrid, setInitialGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  const stage = STAGES.find(s => s.id === currentLevel);

  const initGame = useCallback((levelId = currentLevel) => {
    const s = STAGES.find(x => x.id === levelId);
    const base = JSON.parse(JSON.stringify(s.puzzle));
    
    setGrid(base);
    setInitialGrid(base);
    setTimer(0);
    setIsWon(false);
    setMistakes(0);
    setSelectedCell(null);
    setCurrentLevel(levelId);
  }, [currentLevel]);

  useEffect(() => {
    const saved = localStorage.getItem('sudoku_unlocked_level');
    if (saved) setUnlockedLevel(parseInt(saved));
    initGame(1);
  }, []);

  useEffect(() => {
    let interval;
    if (!isWon) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isWon]);

  const isValidMove = (board, row, col, num) => {
    // Row check
    for (let x = 0; x < stage.size; x++) {
      if (x !== col && board[row][x] === num) return false;
    }
    // Col check
    for (let x = 0; x < stage.size; x++) {
      if (x !== row && board[x][col] === num) return false;
    }
    // Block check
    const startRow = row - (row % stage.blockRows);
    const startCol = col - (col % stage.blockCols);
    for (let i = 0; i < stage.blockRows; i++) {
      for (let j = 0; j < stage.blockCols; j++) {
        const r = i + startRow;
        const c = j + startCol;
        if ((r !== row || c !== col) && board[r][c] === num) return false;
      }
    }
    return true;
  };

  const checkWin = (board) => {
    for (let i = 0; i < stage.size; i++) {
      for (let j = 0; j < stage.size; j++) {
        if (board[i][j] === 0 || !isValidMove(board, i, j, board[i][j])) return false;
      }
    }
    return true;
  };

  const handleCellClick = (r, c) => {
    if (initialGrid[r][c] !== 0 || isWon) return;
    setSelectedCell([r, c]);
  };

  const handleNumberInput = (num) => {
    if (!selectedCell || isWon) return;
    const [r, c] = selectedCell;
    const newGrid = JSON.parse(JSON.stringify(grid));
    newGrid[r][c] = num;
    setGrid(newGrid);

    if (num !== 0 && !isValidMove(newGrid, r, c, num)) {
      setMistakes(m => m + 1);
    }

    if (checkWin(newGrid)) {
      setIsWon(true);
      const nextLevel = currentLevel + 1;
      if (nextLevel > unlockedLevel && nextLevel <= 5) {
        setUnlockedLevel(nextLevel);
        localStorage.setItem('sudoku_unlocked_level', nextLevel.toString());
      }
      if (onWin) onWin(stage.xp - (mistakes * 10));
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getCellBorders = (r, c) => {
    const s = {};
    if ((c + 1) % stage.blockCols === 0 && c !== stage.size - 1) {
      s.borderRight = '2px solid #e2e8f0';
    }
    if ((r + 1) % stage.blockRows === 0 && r !== stage.size - 1) {
      s.borderBottom = '2px solid #e2e8f0';
    }
    return s;
  };

  return (
    <div className={styles.puzzleWrapper}>
      <header className={styles.gameHeader}>
        <div className={styles.stageNavigator}>
          {STAGES.map(s => {
            const isLocked = s.id > unlockedLevel;
            const isSolved = s.id < unlockedLevel;
            return (
              <button 
                key={s.id}
                className={`${styles.stageBtn} ${currentLevel === s.id ? styles.stageBtnActive : ''} ${isLocked ? styles.stageBtnLocked : ''} ${isSolved ? styles.stageBtnSolved : ''}`}
                onClick={() => !isLocked && initGame(s.id)}
                disabled={isLocked}
              >
                {isLocked ? <Lock size={14} className={styles.stageLockIcon} /> : (isSolved ? <CheckCircle size={16} /> : s.id)}
              </button>
            );
          })}
        </div>

        <div className={styles.gameStats}>
          <div className={styles.statChip}><Clock size={16} /> {formatTime(timer)}</div>
          <div className={`${styles.statChip} ${mistakes > 0 ? styles.statError : ''}`}>
            Mistakes: {mistakes}/3
          </div>
          <div className={styles.statChip}><Zap size={14} fill="#ff7a00" stroke="none" /> {stage.name}</div>
        </div>
      </header>

      <div 
        className={styles.sudokuGrid}
        style={{ 
          gridTemplateColumns: `repeat(${stage.size}, 1fr)`,
          maxWidth: stage.size <= 6 ? `${stage.size * 50}px` : '400px'
        }}
      >
        {grid.map((row, rIdx) => 
          row.map((val, cIdx) => (
            <div 
              key={`${rIdx}-${cIdx}`}
              className={`
                ${styles.cell} 
                ${initialGrid[rIdx][cIdx] !== 0 ? styles.cellInitial : ''}
                ${selectedCell?.[0] === rIdx && selectedCell?.[1] === cIdx ? styles.cellSelected : ''}
                ${grid[rIdx][cIdx] !== 0 && initialGrid[rIdx][cIdx] === 0 && !isValidMove(grid, rIdx, cIdx, grid[rIdx][cIdx]) ? styles.cellError : ''}
              `}
              style={getCellBorders(rIdx, cIdx)}
              onClick={() => handleCellClick(rIdx, cIdx)}
            >
              {val !== 0 ? val : ''}
            </div>
          ))
        )}
      </div>

      <div className={styles.numberPad} style={{ maxWidth: stage.size <= 6 ? `${stage.size * 55}px` : '400px' }}>
        {Array.from({ length: stage.size }, (_, i) => i + 1).map(num => (
          <button 
            key={num} 
            className={styles.numBtn}
            onClick={() => handleNumberInput(num)}
          >
            {num}
          </button>
        ))}
        <button 
          className={`${styles.numBtn} ${styles.eraseBtn}`}
          onClick={() => handleNumberInput(0)}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className={styles.instructions}>
        <p><Info size={14} /> <strong>Level {currentLevel}:</strong> Solve the {stage.size}x{stage.size} grid to unlock the {STAGES[currentLevel]?.name || 'next'} challenge!</p>
      </div>

      {isWon && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            <Trophy size={64} color="#f59e0b" />
            <h2>Fantastic Work!</h2>
            <p>You've solved the {stage.name} challenge in {formatTime(timer)}.</p>
            <div className={styles.winStats}>
              <span>XP Earned: {stage.xp - (mistakes * 10)}</span>
            </div>
            <div className={styles.winActions} style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '20px' }}>
              <button className={styles.restartBtn} style={{ flex: 1 }} onClick={() => initGame()}>Retry</button>
              {currentLevel < 5 && unlockedLevel > currentLevel && (
                <button className={styles.submitBtn} style={{ flex: 1 }} onClick={() => initGame(currentLevel + 1)}>
                   Next <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
