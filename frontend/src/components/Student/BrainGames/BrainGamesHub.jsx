'use client';

import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Brain, 
  Trophy, 
  Zap, 
  Grid3X3, 
  Puzzle,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Eye,
  LayoutDashboard,
  BookOpen,
  Search,
  LayoutGrid
} from 'lucide-react';
import InteractiveBackground from '@/components/common/InteractiveBackground';
import styles from './BrainGames.module.css';
import useBrainStats from '@/hooks/useBrainStats';

// Games
import Sudoku from './Games/Sudoku';
import Game2048 from './Games/Game2048';
import SchulteTable from './Games/SchulteTable';
import TowersOfHanoi from './Games/TowersOfHanoi';
import WordScramble from './Games/WordScramble';
import Categorization from './Games/Categorization';

export default function BrainGamesHub() {
  const [activeGame, setActiveGame] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { totalXP, level, streak, highScores, addXP, updateHighScore, isLoading } = useBrainStats();

  const games = [
    {
      id: 'sudoku',
      name: 'Sudoku Daily',
      description: 'Fill the 9x9 grid so each row, column and 3x3 box contains all numbers 1-9.',
      icon: <Grid3X3 size={28} />,
      color: '#6366f1',
      difficulty: 'Expert',
      isDaily: true,
      xp: 250
    },
    {
      id: '2048',
      name: '2048 Challenge',
      description: 'Slide tiles and merge matching numbers to reach the legendary 2048 tile.',
      icon: <Zap size={28} />,
      color: '#ff7a00',
      difficulty: 'Speed',
      isDaily: false,
      xp: 150
    },
    {
      id: 'schulte',
      name: 'Schulte Table',
      description: 'Find numbers 1-25 using your peripheral vision. Great for reading speed.',
      icon: <Eye size={28} />,
      color: '#0ea5e9',
      difficulty: 'Medical',
      isDaily: false,
      xp: 100
    },
    {
      id: 'hanoi',
      name: 'Towers of Hanoi',
      description: 'Master recursive logic by moving the stack between energy pegs.',
      icon: <LayoutDashboard size={28} />,
      color: '#ef4444',
      difficulty: 'Logic',
      isDaily: false,
      xp: 300
    },
    {
      id: 'scramble',
      name: 'Word Scramble',
      description: 'Boost your academic vocabulary by unscrambling complex terms.',
      icon: <BookOpen size={28} />,
      color: '#8b5cf6',
      difficulty: 'Verbal',
      isDaily: false,
      xp: 120
    },
    {
      id: 'category',
      name: 'Academic Sorter',
      description: 'Test your reflexes and academic knowledge by sorting terms into subjects.',
      icon: <LayoutGrid size={28} />,
      color: '#8b5cf6',
      difficulty: 'Speed',
      isDaily: false,
      xp: 150
    }
  ];

  const filteredGames = games.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeGame === 'sudoku') {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => setActiveGame(null)}>
          <ArrowLeft size={18} /> Back to Hub
        </button>
        <Sudoku onWin={(s) => { addXP(250); updateHighScore('sudoku', s); }} />
      </div>
    );
  }

  if (activeGame === '2048') {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => setActiveGame(null)}>
          <ArrowLeft size={18} /> Back to Hub
        </button>
        <Game2048 onWin={(s) => { addXP(150); updateHighScore('game2048', s); }} />
      </div>
    );
  }

  if (activeGame === 'schulte') {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => setActiveGame(null)}>
          <ArrowLeft size={18} /> Back to Hub
        </button>
        <SchulteTable onWin={(s) => { addXP(100); updateHighScore('schulte', s, true); }} />
      </div>
    );
  }

  if (activeGame === 'hanoi') {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => setActiveGame(null)}>
          <ArrowLeft size={18} /> Back to Hub
        </button>
        <TowersOfHanoi onWin={(s) => { addXP(300); updateHighScore('hanoi', s, true); }} />
      </div>
    );
  }

  if (activeGame === 'scramble') {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => setActiveGame(null)}>
          <ArrowLeft size={18} /> Back to Hub
        </button>
        <WordScramble onWin={(pts) => { addXP(120); updateHighScore('scramble', pts); }} />
      </div>
    );
  }

  if (activeGame === 'category') {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => setActiveGame(null)}>
          <ArrowLeft size={18} /> Back to Hub
        </button>
        <Categorization onWin={(s) => { addXP(Math.floor(s/2)); updateHighScore('category', s); }} />
      </div>
    );
  }

  return (
    <>
      <InteractiveBackground />

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.titleWithSearch}>
              <h1>Brain Lounge</h1>
              <div className={styles.compactSearch}>
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search games..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <p>Sharpen your cognitive skills in our premium training environment.</p>
          </div>
          
          <div className={styles.statsRow}>
            <div className={styles.miniStat}>
              <div className={styles.statVal}>
                <Zap size={18} fill="#ff7a00" stroke="none" />
                {isLoading ? '...' : streak}
              </div>
              <span className={styles.statLabel}>Streak</span>
            </div>
            <div className={styles.miniStat}>
              <div className={styles.statVal}>
                <Trophy size={18} fill="#6366f1" stroke="none" />
                {isLoading ? '...' : totalXP.toLocaleString()}
              </div>
              <span className={styles.statLabel}>XP</span>
            </div>
          </div>
        </header>

        <section className={styles.featuredSection}>
          <div className={styles.dailyCard} onClick={() => setActiveGame('sudoku')}>
            <div className={styles.dailyContent}>
              <div className={styles.dailyIcon}><Grid3X3 size={64} strokeWidth={1} /></div>
              <div className={styles.dailyText}>
                <div className={styles.dailyTag}><Sparkles size={14} /> Puzzle of the Day</div>
                <h2>Grandmaster Sudoku</h2>
                <p>Solve today's uniquely generated logic grid to keep your streak alive and earn triple XP!</p>
              </div>
            </div>
            <button className={styles.beginBtn}>Begin Entry <ChevronRight size={24} /></button>
          </div>
        </section>

        <div className={styles.gameGrid}>
          {filteredGames.map(game => (
            <div key={game.id} className={styles.gameCard} onClick={() => setActiveGame(game.id)}>
              {game.isDaily && <div className={styles.badge}>Live</div>}
              <div className={styles.iconBox} style={{ color: game.color, backgroundColor: `${game.color}15` }}>
                {game.icon}
              </div>
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <div className={styles.playLink}>
                Play Now <ChevronRight size={20} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
