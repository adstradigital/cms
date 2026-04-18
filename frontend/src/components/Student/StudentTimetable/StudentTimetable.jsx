'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Loader2, 
  UserRound,
  Zap,
  Star,
  Trophy,
  Award
} from 'lucide-react';
import styles from './StudentTimetable.module.css';
import useFetch from '@/hooks/useFetch';
import instance from '@/api/instance';

const WEEK_DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_PERIODS = [
  { label: 'Period 1', time: '08:30 - 09:15', isBreak: false },
  { label: 'Period 2', time: '09:15 - 10:00', isBreak: false },
  { label: 'Period 3', time: '10:00 - 10:45', isBreak: false },
  { label: 'BREAK', time: '10:45 - 11:00', isBreak: true },
  { label: 'Period 4', time: '11:00 - 11:45', isBreak: false },
  { label: 'Period 5', time: '11:45 - 12:30', isBreak: false },
  { label: 'LUNCH', time: '12:30 - 13:15', isBreak: true },
  { label: 'Period 6', time: '13:15 - 14:00', isBreak: false },
];

const buildEmptySchedule = (days, periods) => {
  const schedule = {};
  days.forEach((day) => {
    schedule[day] = periods.map((period) => (period.isBreak ? { isBreak: true, label: period.label } : null));
  });
  return schedule;
};

export default function StudentTimetable() {
  const { data: dashboardData, loading: dashLoading, error: dashError } = useFetch('/students/students/dashboard-data/');
  
  const [schedules, setSchedules] = useState({});
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [periods, setPeriods] = useState(DEFAULT_PERIODS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeClassLabel = useMemo(() => {
    if (!dashboardData?.profile) return null;
    return `${dashboardData.profile.class_name} - ${dashboardData.profile.section_name}`;
  }, [dashboardData]);

  const loadTimetable = async () => {
    if (!activeClassLabel) return;
    try {
      setLoading(true);
      setError('');
      
      const [settingsRes, timetableRes] = await Promise.all([
        instance.get('/timetables/settings/').catch(() => null),
        instance.get('/timetables/', { params: { class_name: activeClassLabel } }).catch(() => null),
      ]);
      
      const serverDays = Array.isArray(settingsRes?.data?.working_days) ? settingsRes.data.working_days : DEFAULT_DAYS;
      const serverPeriods = Array.isArray(settingsRes?.data?.periods) ? settingsRes.data.periods : DEFAULT_PERIODS;
      
      setDays(serverDays);
      setPeriods(serverPeriods);
      
      const rawRecords = timetableRes?.data || [];
      const normalized = buildEmptySchedule(serverDays, serverPeriods);
      
      rawRecords.forEach(tt => {
        const dayName = WEEK_DAY_OPTIONS[tt.day_of_week - 1];
        if (normalized[dayName]) {
          tt.periods.forEach(p => {
            const idx = p.period_number - 1;
            if (normalized[dayName][idx] === undefined) return;
            
            let tName = p.teacher_name || '';
            if (!tName && p.teacher) {
               if (typeof p.teacher === 'object') {
                 tName = `${p.teacher.first_name || ''} ${p.teacher.last_name || ''}`.trim();
               }
            }

            normalized[dayName][idx] = {
              subject: p.subject_name || (p.subject?.name) || '',
              teacher: tName || 'Assigned Teacher',
              room: p.room || 'TBD',
              isEvent: p.period_type === 'event',
              subjectColor: p.subject?.color_code || '#4f46e5'
            };
          });
        }
      });
      setSchedules(normalized);
    } catch (e) {
      console.error(e);
      setError('Failed to load timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dashLoading && activeClassLabel) {
      loadTimetable();
    } else if (!dashLoading && dashError) {
      setError('Could not establish your class records.');
      setLoading(false);
    }
  }, [dashLoading, activeClassLabel, dashError]);

  const stats = useMemo(() => {
    const totalPeriods = days.length * periods.filter(p => !p.isBreak).length;
    let filledCount = 0;
    Object.values(schedules).forEach(day => {
       day.forEach(slot => { if (slot && !slot.isBreak) filledCount++; });
    });
    const pct = Math.round((filledCount / totalPeriods) * 100) || 0;
    return { pct, filledCount, totalPeriods };
  }, [schedules, days, periods]);

  if (loading || dashLoading) {
    return (
      <div className={styles.loader}>
        <Loader2 className="animate-spin" size={40} color="#4f46e5" />
        <p>Structuring your academic week...</p>
      </div>
    );
  }

  const todayStr = WEEK_DAY_OPTIONS[new Date().getDay() - 1] || 'Monday';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Weekly Schedule</h1>
          <p>Active Timetable: <strong>{activeClassLabel}</strong></p>
        </div>
      </header>

      {/* PREMIUM TIMETABLE RIBBON */}
      <section className={styles.achievementRibbon}>
        <div className={styles.achievementMain}>
          {/* Schedule Gauge */}
          <div className={styles.gaugeCol}>
            <div className={styles.circularGauge}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.gaugeBg} cx="50" cy="50" r="45" />
                <circle 
                  className={styles.gaugeFill} 
                  style={{ strokeDashoffset: 283 - (283 * stats.pct) / 100, stroke: '#818cf8' }} 
                  cx="50" cy="50" r="45" 
                />
              </svg>
              <div className={styles.gaugeContent}>
                <span className={styles.gaugeValue}>{stats.pct}%</span>
                <span className={styles.gaugeLabel}>SCHEDULED</span>
              </div>
            </div>
          </div>

          <div className={styles.verticalDivider} />

          {/* Core Metrics */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e1b4b' }}>
              <Clock size={20} color="#818cf8" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{periods.filter(p => !p.isBreak).length} Slots</span>
              <span className={styles.metricLabel}>Periods Per Day</span>
            </div>
          </div>

          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#064e3b' }}>
              <Award size={20} color="#34d399" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.filledCount} Sessions</span>
              <span className={styles.metricLabel}>Teaching Hours/Week</span>
            </div>
          </div>

          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e293b' }}>
              <Star size={20} color="#facc15" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{days.length} Days</span>
              <span className={styles.metricLabel}>Working Days</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.tableWrapper}>
        <div className={styles.scrollContainer}>
          <div
            className={styles.grid}
            style={{ gridTemplateColumns: `120px repeat(${periods.length}, minmax(180px, 1fr))` }}
          >
            {/* Header Row */}
            <div className={styles.cornerCell}>DAY \ PERIOD</div>
            {periods.map((p, idx) => (
              <div key={idx} className={`${styles.headerCell} ${p.isBreak ? styles.headerBreak : ''}`}>
                <span className={styles.periodName}>{p.label}</span>
                <span className={styles.periodTime}>{p.time}</span>
              </div>
            ))}

            {/* Grid Body */}
            {days.map((day) => {
              const isToday = day === todayStr;
              return (
                <React.Fragment key={day}>
                  <div className={`${styles.dayColumn} ${isToday ? styles.isToday : ''}`}>
                    {day}
                    {isToday && <span className={styles.todayPill}>TODAY</span>}
                  </div>
                  
                  {periods.map((period, pIdx) => {
                    const slot = schedules[day]?.[pIdx];
                    
                    if (period.isBreak || slot?.isBreak) {
                      return (
                        <div key={`${day}-${pIdx}`} className={styles.breakCell}>
                          <div className={styles.breakContent}>
                             <Zap size={10} />
                             <span>{slot?.label || period.label}</span>
                          </div>
                        </div>
                      );
                    }

                    if (!slot) {
                      return (
                        <div key={`${day}-${pIdx}`} className={styles.emptyCell}>
                           <div className={styles.emptyDot} />
                        </div>
                      );
                    }

                    return (
                      <div key={`${day}-${pIdx}`} className={styles.slotCell}>
                        <div 
                          className={`${styles.filledSlot} ${slot.isEvent ? styles.eventSlot : ''}`}
                          style={{ borderLeft: `4px solid ${slot.subjectColor}` }}
                        >
                          <h4 className={styles.subjectTitle}>{slot.subject}</h4>
                          <div className={styles.slotMeta}>
                            <UserRound size={12} />
                            <span>{slot.teacher}</span>
                          </div>
                          <div className={styles.slotMeta}>
                            <MapPin size={12} />
                            <span>Room {slot.room}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
