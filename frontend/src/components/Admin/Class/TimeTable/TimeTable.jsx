'use client';

import React, { useState, useReducer, useEffect } from 'react';
import { 
  Calendar, Clock, Users, ArrowRight, Plus, 
  AlertTriangle, Zap, Share2, Check, X, 
  ChevronRight, MoreHorizontal, UserCheck, 
  Settings, Download, MessageSquare, Info,
  RefreshCw, MapPin
} from 'lucide-react';
import styles from './TimeTable.module.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PERIODS = [
  { label: 'Period 1', time: '08:30 - 09:15' },
  { label: 'Period 2', time: '09:15 - 10:00' },
  { label: 'Period 3', time: '10:00 - 10:45' },
  { label: 'BREAK', time: '10:45 - 11:00', isBreak: true },
  { label: 'Period 4', time: '11:00 - 11:45' },
  { label: 'Period 5', time: '11:45 - 12:30' },
  { label: 'LUNCH', time: '12:30 - 13:15', isBreak: true },
  { label: 'Period 6', time: '13:15 - 14:00' },
  { label: 'Period 7', time: '14:00 - 14:45' },
];

const CLASSES = ['Class 10 - Section A', 'Class 10 - Section B', 'Class 9 - Section A', 'Class 8 - Section C'];

const TEACHERS = [
  { id: 1, name: 'Dr. Anita Roy', subject: 'Biology' },
  { id: 2, name: 'Michael Chang', subject: 'Mathematics' },
  { id: 3, name: 'Sarah Jenkins', subject: 'English' },
  { id: 4, name: 'Robert Fox', subject: 'Physics' },
];

// Initial state for one class
const generateInitialSchedule = () => {
  const schedule = {};
  DAYS.forEach(day => {
    schedule[day] = PERIODS.map(p => p.isBreak ? { isBreak: true, label: p.label } : null);
  });
  
  // Seed some data
  schedule['Wednesday'][4] = { subject: 'Physical Trn.', teacher: 'Robert Fox', room: 'Ground A', isEvent: true };
  schedule['Thursday'][7] = { subject: 'English', teacher: 'Sarah Jenkins', room: 'Room 204' };
  schedule['Tuesday'][4] = { subject: 'Dr. Anita Roy', teacher: 'Dr. Anita Roy', room: 'Lab 1' };

  return schedule;
};

const initialState = {
  activeClass: CLASSES[1],
  viewMode: 'admin', // or 'teacher'
  schedule: generateInitialSchedule(),
  isAbsenceDetected: true,
  absentTeacher: 'Michael Chang',
  showOverrideModal: false,
  showAIModal: false,
  selectedOverridePeriods: [1],
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_CLASS':
      return { ...state, activeClass: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'TOGGLE_MODAL':
      return { ...state, [action.payload]: !state[action.payload] };
    case 'SET_OVERRIDE_PERIODS':
      return { ...state, selectedOverridePeriods: action.payload };
    case 'UPDATE_SCHEDULE':
      return { ...state, schedule: { ...state.schedule, ...action.payload } };
    case 'RESOLVE_ABSENCE':
      return { ...state, isAbsenceDetected: false };
    default:
      return state;
  }
};

const TimeTable = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAIStart = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      dispatch({ type: 'TOGGLE_MODAL', payload: 'showAIModal' });
    }, 2000);
  };

  const renderSlot = (day, periodIdx, period) => {
    const data = state.schedule[day][periodIdx];

    if (period.isBreak) {
      return (
        <td key={`${day}-${periodIdx}`} className={`${styles.slotCell} ${styles.breakCell}`}>
          <div className={styles.breakLabel}>{period.label}</div>
        </td>
      );
    }

    if (data) {
      return (
        <td key={`${day}-${periodIdx}`} className={styles.slotCell}>
          <div className={styles.periodCard} style={data.isEvent ? { borderLeft: '4px solid #f97316', background: '#fff7ed' } : {}}>
            <div>
              <div className={styles.subjectName}>{data.subject}</div>
              <div className={styles.teacherName}>{data.teacher}</div>
            </div>
            <div className={styles.roomTag}>
              <MapPin size={10} style={{ marginRight: 4 }} />
              {data.room || 'TBD'}
            </div>
            {data.isEvent && <Zap size={14} className={styles.eventIcon} style={{ position: 'absolute', top: 12, right: 12, color: '#f97316' }} />}
          </div>
        </td>
      );
    }

    return (
      <td key={`${day}-${periodIdx}`} className={styles.slotCell}>
        <div className={styles.emptySlot}>
          <Plus size={16} />
        </div>
      </td>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>Timetable Builder</h2>
          <p>Drag-and-drop periods to build weekly schedules per class.</p>
        </div>
        <div className={styles.actionRow}>
          <button className={`${styles.btn} ${styles.outline}`}>
            <Settings size={18} /> Settings
          </button>
          <button className={`${styles.btn} ${styles.success}`}>
            <Share2 size={18} /> Export PDF
          </button>
        </div>
      </div>

      {/* Staff Absence Alert */}
      {state.isAbsenceDetected && (
        <div className={styles.alertBanner}>
          <div className={styles.alertContent}>
            <div className={styles.alertIcon}><AlertTriangle size={24} /></div>
            <div className={styles.alertText}>
              <b>Staff Absence Detected</b>
              <span>{state.absentTeacher} is absent. 2 periods in {state.activeClass} need substitutes.</span>
            </div>
          </div>
          <button className={`${styles.btn} ${styles.danger}`} onClick={() => dispatch({ type: 'RESOLVE_ABSENCE' })}>
            <UserCheck size={14} /> Assign Substitute
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <select 
            className={styles.classSelect}
            value={state.activeClass}
            onChange={(e) => dispatch({ type: 'SET_CLASS', payload: e.target.value })}
          >
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <div className={styles.radioGroup}>
            <div 
              className={`${styles.radioBtn} ${state.viewMode === 'admin' ? styles.active : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'admin' })}
            >
              Master
            </div>
            <div 
              className={`${styles.radioBtn} ${state.viewMode === 'teacher' ? styles.active : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'teacher' })}
            >
              Today
            </div>
          </div>
        </div>

        <div className={styles.toolGroup}>
          <button className={`${styles.btn} ${styles.warning}`} onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: 'showOverrideModal' })}>
            <Zap size={14} /> Override
          </button>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: 'showAIModal' })}>
            <Zap size={14} /> AI Build
          </button>
          <button className={`${styles.btn} ${styles.primary}`}>
            Publish
          </button>
        </div>
      </div>

      {/* Grid Matrix */}
      <div className={styles.gridWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Day</th>
              {PERIODS.map((p, i) => (
                <th key={i} className={styles.th} style={p.isBreak ? { width: '60px' } : { width: '180px' }}>
                  {p.label}
                  <span className={styles.timeLabel}>{p.time}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day}>
                <td className={styles.dayCell}>{day}</td>
                {PERIODS.map((p, i) => renderSlot(day, i, p))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Urgent Override Modal */}
      {state.showOverrideModal && (
        <div className={styles.modalOverlay} onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: 'showOverrideModal' })}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}><Zap size={32} /></div>
              <div>
                <h3>Urgent Timetable Override</h3>
                <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>Instantly replace periods for today and notify users.</p>
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Audience</label>
                <select className={styles.input} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid var(--theme-border)' }}>
                  <option>Specific Class ({state.activeClass})</option>
                  <option>Whole School</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Periods to Override</label>
                <div className={styles.periodSelector}>
                  {[1,2,3,4,5,6,7].map(n => (
                    <div 
                      key={n} 
                      className={`${styles.periodPill} ${state.selectedOverridePeriods.includes(n) ? styles.active : ''}`}
                      onClick={() => {
                        const next = state.selectedOverridePeriods.includes(n) 
                          ? state.selectedOverridePeriods.filter(x => x !== n)
                          : [...state.selectedOverridePeriods, n];
                        dispatch({ type: 'SET_OVERRIDE_PERIODS', payload: next });
                      }}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Event Type / Reason</label>
                <input className={styles.input} placeholder="e.g., Surprise Assembly, Guest Lecture..." style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid var(--theme-border)' }} />
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '16px', display: 'flex', gap: 12 }}>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px' }} />
                <div>
                  <b style={{ display: 'block', fontSize: '0.9rem', color: '#92400e' }}>Send Push Notification</b>
                  <span style={{ fontSize: '0.8rem', color: '#b45309' }}>Instantly alerts affected teachers, parents, and students on their app.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button className={`${styles.btn} ${styles.outline}`} style={{ flex: 1 }} onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: 'showOverrideModal' })}>Cancel</button>
                <button className={`${styles.btn} ${styles.primary}`} style={{ flex: 1, background: '#f59e0b' }}>
                  <Share2 size={18} /> Broadcast Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {state.showAIModal && (
        <div className={styles.modalOverlay} onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: 'showAIModal' })}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${styles.ai}`}>
              <div className={styles.modalIcon}><Zap size={32} /></div>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <h3>AI Timetable Generator</h3>
                <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>Automatically resolve constraints & build schedules.</p>
              </div>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Target Scope</span>
                  <b style={{ color: '#1e293b' }}>{state.activeClass}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Subjects Mapped</span>
                  <b style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14}/> All Verified</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Teacher Constraints</span>
                  <b style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14}/> Synchronized</b>
                </div>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', margin: '0 10px' }}>
                The AI engine will assign teachers to periods while ensuring no double-booking and balancing workload per day.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className={`${styles.btn} ${styles.outline}`} style={{ flex: 1 }} onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: 'showAIModal' })}>Cancel</button>
                <button 
                  className={`${styles.btn} ${styles.primary}`} 
                  style={{ flex: 1, background: '#6366f1' }}
                  onClick={handleAIStart}
                  disabled={isGenerating}
                >
                  {isGenerating ? <><RefreshCw size={18} className={styles.spin} /> Processing...</> : <><Zap size={18} /> Generate Now</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTable;
