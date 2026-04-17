"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BellRing, Download, Loader2 } from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './ExamTimetable.module.css';

export default function ExamTimetableTab() {
  const [view, setView] = useState('calendar');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getExamSchedules();
        setSchedules(res.data || []);
      } catch (error) {
        console.error("Error fetching timetable:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const cells = [];
    // Prefix padding
    for (let i = 0; i < firstDay; i++) {
        cells.push({ day: '', isEmpty: true, exams: [] });
    }
    // Days
    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayExams = schedules.filter(s => s.date === dateStr).map(s => ({
            title: `${s.class_name}: ${s.subject_name}`,
            color: s.exam_name?.includes('Mid') ? 'pillPurple' : 'pillBlue'
        }));
        cells.push({ day: d, isEmpty: false, exams: dayExams });
    }
    return cells;
  };

  const calendarCells = getDaysInMonth(currentMonth);

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className={styles.viewTabs}>
          <button className={`${styles.viewTab} ${view === 'calendar' ? styles.viewTabActive : ''}`} onClick={() => setView('calendar')}>Calendar View</button>
          <button className={`${styles.viewTab} ${view === 'class' ? styles.viewTabActive : ''}`} onClick={() => setView('class')}>Class-wise</button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.viewTab} style={{ background: 'var(--color-primary)', color: 'white' }}>
            <BellRing size={16} style={{marginRight: 6, display: 'inline'}}/>
            Email Schedule
          </button>
          <button className={styles.viewTab} style={{ border: '1px solid var(--theme-border)' }}>
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className={styles.calendarGrid}>
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={styles.viewTab} style={{padding: '4px'}} onClick={prevMonth}><ChevronLeft size={20}/></button>
            <button className={styles.viewTab} style={{padding: '4px'}} onClick={nextMonth}><ChevronRight size={20}/></button>
          </div>
        </div>

        {days.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}
        
        {loading ? (
             <div style={{ gridColumn: '1 / -1', padding: '100px', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} style={{margin: '0 auto'}}/>
             </div>
        ) : calendarCells.map((cell, idx) => (
          <div key={idx} className={`${styles.dayCell} ${cell.isEmpty ? styles.dayCellEmpty : ''}`}>
            {!cell.isEmpty && <span className={`${styles.dayNumber} ${cell.exams.length > 0 ? styles.dayNumberActive : ''}`}>{cell.day}</span>}
            {cell.exams.map((ex, i) => (
              <div key={i} className={`${styles.examPill} ${styles[ex.color]}`} title={ex.title}>
                 {ex.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
