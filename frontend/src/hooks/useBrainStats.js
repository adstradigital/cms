'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'brain_lounge_stats';

const initialState = {
  totalXP: 0,
  level: 1,
  streak: 0,
  lastPlayed: null,
  gamesSolved: 0,
  highScores: {
    sudoku: 0,
    game2048: 0,
    schulte: 999.99,
    hanoi: 999,
    scramble: 0
  }
};

export default function useBrainStats() {
  const [stats, setStats] = useState(initialState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setStats(JSON.parse(saved));
    }
    setIsLoading(false);
  }, []);

  const saveStats = useCallback((newStats) => {
    setStats(newStats);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
  }, []);

  const addXP = useCallback((amount) => {
    setStats(prev => {
      const newXP = prev.totalXP + amount;
      const newLevel = Math.floor(newXP / 1000) + 1;
      
      const newStats = {
        ...prev,
        totalXP: newXP,
        level: newLevel,
        gamesSolved: prev.gamesSolved + 1
      };

      // Check for streak
      const today = new Date().toDateString();
      if (prev.lastPlayed !== today) {
        newStats.lastPlayed = today;
        newStats.streak = prev.streak + 1;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  const updateHighScore = useCallback((gameId, score, isLowerBetter = false) => {
    setStats(prev => {
      const currentHigh = prev.highScores[gameId];
      const isNewHigh = isLowerBetter ? score < currentHigh : score > currentHigh;

      if (isNewHigh) {
        const newStats = {
          ...prev,
          highScores: {
            ...prev.highScores,
            [gameId]: score
          }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
        return newStats;
      }
      return prev;
    });
  }, []);

  return {
    ...stats,
    isLoading,
    addXP,
    updateHighScore
  };
}
