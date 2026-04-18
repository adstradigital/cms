'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Zap
} from 'lucide-react';
import styles from '../BrainGames.module.css';

export default function Game2048({ onWin }) {
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const initGame = useCallback(() => {
    let newGrid = Array(4).fill().map(() => Array(4).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
  }, []);

  const addRandomTile = (currentGrid) => {
    let options = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (currentGrid[i][j] === 0) options.push({ r: i, c: j });
      }
    }
    if (options.length > 0) {
      const spot = options[Math.floor(Math.random() * options.length)];
      currentGrid[spot.r][spot.c] = Math.random() > 0.1 ? 2 : 4;
    }
  };

  useEffect(() => {
    initGame();
  }, [initGame]);

  const slide = (row) => {
    let arr = row.filter(val => val);
    let missing = 4 - arr.length;
    let zeros = Array(missing).fill(0);
    return arr.concat(zeros);
  };

  const combine = (row) => {
    let newScore = 0;
    for (let i = 0; i < 3; i++) {
        if (row[i] !== 0 && row[i] === row[i + 1]) {
            row[i] = row[i] * 2;
            row[i + 1] = 0;
            newScore += row[i];
        }
    }
    return { row, newScore };
  };

  const move = (direction) => {
    if (gameOver) return;
    let newGrid = JSON.parse(JSON.stringify(grid));
    let moved = false;
    let addedScore = 0;

    const rotate = (matrix) => matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());

    // Orient grid so "Left" logic works for all directions
    if (direction === 'UP') newGrid = rotate(rotate(rotate(newGrid)));
    if (direction === 'RIGHT') newGrid = rotate(rotate(newGrid));
    if (direction === 'DOWN') newGrid = rotate(newGrid);

    for (let i = 0; i < 4; i++) {
        let oldRow = [...newGrid[i]];
        let row = slide(newGrid[i]);
        let res = combine(row);
        row = slide(res.row);
        addedScore += res.newScore;
        newGrid[i] = row;
        if (JSON.stringify(oldRow) !== JSON.stringify(row)) moved = true;
    }

    // Revert orientation
    if (direction === 'UP') newGrid = rotate(newGrid);
    if (direction === 'RIGHT') newGrid = rotate(rotate(newGrid));
    if (direction === 'DOWN') newGrid = rotate(rotate(rotate(newGrid)));

    if (moved) {
        addRandomTile(newGrid);
        setGrid(newGrid);
        const finalScore = score + addedScore;
        setScore(finalScore);
        
        // Win condition: 2048 tile reached
        if (newGrid.flat().includes(2048)) {
          if (onWin) onWin(finalScore);
        }

        if (checkGameOver(newGrid)) {
          if (onWin) onWin(finalScore); // Award points on game over too
          setGameOver(true);
        }
    }
  };

  const checkGameOver = (currentGrid) => {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (currentGrid[i][j] === 0) return false;
            if (i < 3 && currentGrid[i][j] === currentGrid[i+1][j]) return false;
            if (j < 3 && currentGrid[i][j] === currentGrid[i][j+1]) return false;
        }
    }
    return true;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') move('UP');
        if (e.key === 'ArrowDown' || e.key === 's') move('DOWN');
        if (e.key === 'ArrowLeft' || e.key === 'a') move('LEFT');
        if (e.key === 'ArrowRight' || e.key === 'd') move('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, gameOver]);

  return (
    <div className={styles.puzzleWrapper}>
      <header className={styles.gameHeader}>
        <div className={styles.gameStats}>
            <div className={styles.statChip}>Score: {score}</div>
            <div className={styles.statChip}>Best: {bestScore}</div>
            <button className={styles.resetBtn} onClick={initGame}><RotateCcw size={16} /></button>
        </div>
      </header>

      <div className={styles.game2048}>
        {grid.flat().map((val, idx) => (
          <div key={idx} className={`${styles.tile2048} ${val !== 0 ? styles['tile-' + val] : ''}`}>
            {val !== 0 ? val : ''}
          </div>
        ))}

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <div className={styles.gameOverCard}>
                <h2>Game Over!</h2>
                <p>You scored {score} points.</p>
                <button className={styles.restartBtn} onClick={initGame}>Try Again</button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.controlsLegend}>
        <p>Use <strong>Arrow Keys</strong> or <strong>WASD</strong> to move tiles.</p>
      </div>
    </div>
  );
}
