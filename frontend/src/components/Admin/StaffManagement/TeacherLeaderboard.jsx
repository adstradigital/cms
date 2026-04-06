'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Award, UserCheck, CheckCircle, Search } from 'lucide-react';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';
import styles from './TeacherLeaderboard.module.css';

const ProgressBar = ({ value, color }) => (
  <div className={styles.progressTrack}>
    <div className={styles.progressFill} style={{ width: `${Math.min(value, 100)}%`, background: color }} />
  </div>
);

const TeacherLeaderboardView = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toasts, push, dismiss } = useToast();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await adminApi.getTeacherLeaderboard();
        setLeaderboard(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        push('Failed to load leaderboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [push]);

  const filtered = leaderboard.filter(l => l.teacher_name?.toLowerCase().includes(search.toLowerCase()));

  const topThree = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className={styles.container}>
      <div className={styles.headerControls}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input 
            placeholder="Find a teacher..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <select className={styles.termSelect}>
             <option>Current Term</option>
             <option>Term 1 (2025)</option>
          </select>
        </div>
      </div>

      <div className={styles.topThreeContainer}>
        {topThree.map((l, idx) => {
          const medalColors = ['#f59e0b', '#94a3b8', '#b45309']; // Gold, Silver, Bronze
          return (
            <div key={l.id} className={styles.podiumCard} style={{ transform: idx === 0 ? 'scale(1.05)' : 'none', zIndex: idx === 0 ? 10 : 1 }}>
               <div className={styles.medalCircle} style={{ background: medalColors[idx] }}>
                  {idx + 1}
               </div>
               <h3>{l.teacher_name}</h3>
               <p className={styles.scoreText}>Composite Score: <strong>{l.composite_score}</strong></p>
               <div className={styles.podiumMetrics}>
                 <div className={styles.mtRow}><span>Pass Rate</span> <strong>{l.pass_rate}%</strong></div>
                 <div className={styles.mtRow}><span>Avg Marks</span> <strong>{l.avg_marks}/100</strong></div>
               </div>
            </div>
          );
        })}
      </div>

      <div className={styles.listContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 60 }}>Rank</th>
              <th>Teacher</th>
              <th style={{ width: 140 }}>Pass Rate</th>
              <th style={{ width: 140 }}>Avg Marks</th>
              <th style={{ width: 140 }}>Assignments</th>
              <th style={{ width: 180 }}>Trend & Score</th>
            </tr>
          </thead>
          <tbody>
            {rest.map(l => (
              <tr key={l.id}>
                <td className={styles.rankCell}>#{l.rank}</td>
                <td className={styles.strongText}>{l.teacher_name}</td>
                <td>
                  <div className={styles.barMetric}>
                    <span>{l.pass_rate}%</span>
                    <ProgressBar value={l.pass_rate} color="#10b981" />
                  </div>
                </td>
                <td>
                  <div className={styles.barMetric}>
                    <span>{l.avg_marks}</span>
                    <ProgressBar value={l.avg_marks} color="#3b82f6" />
                  </div>
                </td>
                <td>
                   <div className={styles.barMetric}>
                    <span>{l.assignment_completion_rate}%</span>
                    <ProgressBar value={l.assignment_completion_rate} color="#8b5cf6" />
                  </div>
                </td>
                <td className={styles.scoreCell}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                     {parseFloat(l.trend_score) > 0 ? (
                       <TrendingUp size={14} color="#10b981" />
                     ) : (
                       <TrendingUp size={14} color="#ef4444" style={{ transform: 'scaleY(-1)' }} />
                     )}
                     <span style={{ fontSize: 11 }}>{l.trend_score}%</span>
                     <div className={styles.compScore}>{l.composite_score}</div>
                  </div>
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={6} style={{ textAlign:'center', padding:40 }}>Loading snapshot...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:40 }}>No leaderboard data found.</td></tr>}
          </tbody>
        </table>
      </div>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default function TeacherLeaderboard() {
  return (
    <ErrorBoundary>
      <TeacherLeaderboardView />
    </ErrorBoundary>
  );
}
