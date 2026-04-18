'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  Lightbulb, 
  CheckCircle,
  Clock,
  ChevronLeft
} from 'lucide-react';
import styles from '../BrainGames.module.css';

// Deterministic random generator based on seed
const seededRandom = (seed) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export default function Sudoku({ onWin }) {
  const [grid, setGrid] = useState([]);
  const [initialGrid, setInitialGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [difficulty, setDifficulty] = useState('Medium');

  // Generate Sudoku for today
  const generateTodayPuzzle = useCallback(() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Simplistic puzzle for demo purposes
    // A real implementation would use a proper solver/generator
    const base = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];
    
    setGrid(JSON.parse(JSON.stringify(base)));
    setInitialGrid(JSON.parse(JSON.stringify(base)));
    setTimer(0);
    setIsWon(false);
    setMistakes(0);
  }, []);

  useEffect(() => {
    generateTodayPuzzle();
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [generateTodayPuzzle]);

  const handleCellClick = (r, c) => {
    if (initialGrid[r][c] !== 0) return;
    setSelectedCell([r, c]);
  };

  const handleNumberInput = (num) => {
    if (!selectedCell || isWon) return;
    const [r, c] = selectedCell;
    const newGrid = [...grid];
    newGrid[r][c] = num;
    setGrid(newGrid);

    // Basic validation check (just for mistakes count, not full solution check)
    // Real Sudoku would check row, col, and 3x3 box
    if (num !== 0 && !isValidMove(newGrid, r, c, num)) {
      setMistakes(m => m + 1);
    }

    if (checkWin(newGrid)) {
      setIsWon(true);
      if (onWin) onWin(mistakes);
    }
  };

  const isValidMove = (board, row, col, num) => {
    for (let x = 0; x <= 8; x++) if (x !== col && board[row][x] === num) return false;
    for (let x = 0; x <= 8; x++) if (x !== row && board[x][col] === num) return false;
    let startRow = row - row % 3, startCol = col - col % 3;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if ((i + startRow !== row || j + startCol !== col) && board[i + startRow][j + startCol] === num) return false;
    return true;
  };

  const checkWin = (board) => {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[i][j] === 0 || !isValidMove(board, i, j, board[i][j])) return false;
      }
    }
    return true;
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={styles.puzzleWrapper}>
      <header className={styles.gameHeader}>
        <div className={styles.gameStats}>
          <div className={styles.statChip}><Clock size={16} /> {formatTime(timer)}</div>
          <div className={`${styles.statChip} ${mistakes > 0 ? styles.statError : ''}`}>
            Mistakes: {mistakes}/3
          </div>
          <div className={styles.statChip}>Difficulty: {difficulty}</div>
        </div>
      </header>

      <div className={styles.sudokuGrid}>
        {grid.map((row, rIdx) => 
          row.map((val, cIdx) => (
            <div 
              key={`${rIdx}-${cIdx}`}
              className={`
                ${styles.cell} 
                ${initialGrid[rIdx][cIdx] !== 0 ? styles.cellInitial : ''}
                ${selectedCell?.[0] === rIdx && selectedCell?.[1] === cIdx ? styles.cellSelected : ''}
              `}
              onClick={() => handleCellClick(rIdx, cIdx)}
            >
              {val !== 0 ? val : ''}
            </div>
          ))
        )}
      </div>

      <div className={styles.numberPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
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

      {isWon && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            <Trophy size={64} color="#f59e0b" />
            <h2>Fantastic Work!</h2>
            <p>You've solved today's Sudoku in {formatTime(timer)}.</p>
            <div className={styles.winStats}>
              <span>Accuracy: {Math.round((81-mistakes)/81 * 100)}%</span>
            </div>
            <button className={styles.restartBtn} onClick={generateTodayPuzzle}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
