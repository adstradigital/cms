'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  MapPin,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import styles from './TimeTable.module.css';
import instance from '@/api/instance';

const WEEK_DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
  { label: 'Period 7', time: '14:00 - 14:45', isBreak: false },
];
const CLASSES = ['Class 10 - Section A', 'Class 10 - Section B', 'Class 9 - Section A', 'Class 8 - Section C'];
const TEACHERS = [
  { id: 1, name: 'Dr. Anita Roy', subject: 'Biology' },
  { id: 2, name: 'Michael Chang', subject: 'Mathematics' },
  { id: 3, name: 'Sarah Jenkins', subject: 'English' },
  { id: 4, name: 'Robert Fox', subject: 'Physics' },
  { id: 5, name: 'Priya Menon', subject: 'Chemistry' },
  { id: 6, name: 'Arjun Nair', subject: 'History' },
];
const SUBJECTS = ['Mathematics', 'English', 'Physics', 'Biology', 'Chemistry', 'History', 'Computer Science', 'Physical Training'];

const buildEmptySchedule = (days, periods) => {
  const schedule = {};
  days.forEach((day) => {
    schedule[day] = periods.map((period) => (period.isBreak ? { isBreak: true, label: period.label } : null));
  });
  return schedule;
};

const normalizeSchedule = (rawSchedule, days, periods) => {
  const schedule = buildEmptySchedule(days, periods);
  if (!rawSchedule || typeof rawSchedule !== 'object') return schedule;
  days.forEach((day) => {
    periods.forEach((period, idx) => {
      if (period.isBreak) {
        schedule[day][idx] = { isBreak: true, label: period.label };
        return;
      }
      const slot = rawSchedule?.[day]?.[idx] ?? null;
      schedule[day][idx] = slot && !slot.isBreak ? slot : null;
    });
  });
  return schedule;
};

const getTodayDayName = () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

const TimeTable = () => {
  const [activeClass, setActiveClass] = useState(CLASSES[0]);
  const [viewMode, setViewMode] = useState('admin');
  const [selectedTeacherId, setSelectedTeacherId] = useState(TEACHERS[0].id);

  const [days, setDays] = useState(DEFAULT_DAYS);
  const [periods, setPeriods] = useState(DEFAULT_PERIODS);
  const [schedulesByClass, setSchedulesByClass] = useState(() => {
    const seed = {};
    CLASSES.forEach((cls) => {
      seed[cls] = buildEmptySchedule(DEFAULT_DAYS, DEFAULT_PERIODS);
    });
    return seed;
  });

  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [slotModal, setSlotModal] = useState({ open: false, day: null, periodIdx: null });
  const [slotForm, setSlotForm] = useState({ subject: '', teacher: '', room: '', isEvent: false });
  const [dragSource, setDragSource] = useState(null);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedOverridePeriods, setSelectedOverridePeriods] = useState([]);
  const [overrideReason, setOverrideReason] = useState('');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [draftDays, setDraftDays] = useState(DEFAULT_DAYS);
  const [draftPeriods, setDraftPeriods] = useState(DEFAULT_PERIODS);

  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [absence, setAbsence] = useState({ loading: false, isDetected: false, absentTeacher: '', affectedPeriodIndexes: [] });
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState(TEACHERS[0].id);

  const activeSchedule = useMemo(() => schedulesByClass[activeClass] || buildEmptySchedule(days, periods), [schedulesByClass, activeClass, days, periods]);
  const selectedTeacher = useMemo(() => TEACHERS.find((t) => t.id === Number(selectedTeacherId)) || TEACHERS[0], [selectedTeacherId]);
  const todayDay = useMemo(() => {
    const today = getTodayDayName();
    return days.includes(today) ? today : days[0];
  }, [days]);

  const upsertActiveSchedule = (nextSchedule) => {
    setSchedulesByClass((prev) => ({ ...prev, [activeClass]: nextSchedule }));
    setDirty(true);
  };

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const [settingsRes, timetableRes] = await Promise.all([
        instance.get('/timetables/settings/').catch(() => null),
        instance.get('/timetables/', { params: { class_name: activeClass } }).catch(() => null),
      ]);
      const serverDays = Array.isArray(settingsRes?.data?.days) && settingsRes.data.days.length > 0 ? settingsRes.data.days : DEFAULT_DAYS;
      const serverPeriods = Array.isArray(settingsRes?.data?.periods) && settingsRes.data.periods.length > 0 ? settingsRes.data.periods : DEFAULT_PERIODS;
      setDays(serverDays);
      setPeriods(serverPeriods);
      setDraftDays(serverDays);
      setDraftPeriods(serverPeriods);
      setSchedulesByClass((prev) => ({ ...prev, [activeClass]: normalizeSchedule(timetableRes?.data?.schedule, serverDays, serverPeriods) }));
      setDirty(false);
    } finally {
      setLoading(false);
    }
  };

  const checkAbsence = async () => {
    try {
      setAbsence((prev) => ({ ...prev, loading: true }));
      const res = await instance.get('/timetables/absence-status/', { params: { class_name: activeClass, day: todayDay } });
      setAbsence({
        loading: false,
        isDetected: !!res.data?.is_absence_detected,
        absentTeacher: res.data?.absent_teacher || '',
        affectedPeriodIndexes: Array.isArray(res.data?.affected_period_indexes) ? res.data.affected_period_indexes : [],
      });
    } catch {
      setAbsence({ loading: false, isDetected: false, absentTeacher: '', affectedPeriodIndexes: [] });
    }
  };

  useEffect(() => {
    loadTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass]);

  useEffect(() => {
    if (!activeSchedule?.[todayDay]) return;
    checkAbsence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass, todayDay, schedulesByClass]);

  const saveDraft = async ({ silent = false } = {}) => {
    try {
      if (!silent) setSaving(true);
      await instance.post('/timetables/draft/', { class_name: activeClass, days, periods, schedule: activeSchedule });
      setDirty(false);
      setLastSavedAt(new Date().toISOString());
    } catch {
      if (!silent) alert('Failed to save draft timetable.');
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const publishTimetable = async () => {
    try {
      setSaving(true);
      await instance.post('/timetables/publish/', { class_name: activeClass, days, periods, schedule: activeSchedule });
      setDirty(false);
      setLastSavedAt(new Date().toISOString());
      alert('Timetable published successfully.');
    } catch {
      alert('Publish failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!dirty) return;
    const timer = setInterval(() => saveDraft({ silent: true }), 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, activeClass, days, periods, activeSchedule]);

  const openSlotModal = (day, periodIdx) => {
    const slot = activeSchedule?.[day]?.[periodIdx];
    setSlotForm({ subject: slot?.subject || '', teacher: slot?.teacher || '', room: slot?.room || '', isEvent: !!slot?.isEvent });
    setSlotModal({ open: true, day, periodIdx });
  };

  const saveSlot = () => {
    if (!slotModal.open || !slotModal.day) return;
    if (!slotForm.subject || !slotForm.teacher) {
      alert('Please select both subject and teacher.');
      return;
    }
    const nextSchedule = { ...activeSchedule };
    const daySlots = [...nextSchedule[slotModal.day]];
    daySlots[slotModal.periodIdx] = { subject: slotForm.subject, teacher: slotForm.teacher, room: slotForm.room || 'TBD', isEvent: slotForm.isEvent };
    nextSchedule[slotModal.day] = daySlots;
    upsertActiveSchedule(nextSchedule);
    setSlotModal({ open: false, day: null, periodIdx: null });
  };

  const clearSlot = () => {
    if (!slotModal.open || !slotModal.day) return;
    const nextSchedule = { ...activeSchedule };
    const daySlots = [...nextSchedule[slotModal.day]];
    daySlots[slotModal.periodIdx] = null;
    nextSchedule[slotModal.day] = daySlots;
    upsertActiveSchedule(nextSchedule);
    setSlotModal({ open: false, day: null, periodIdx: null });
  };

  const onDragStartSlot = (day, periodIdx) => {
    if (!activeSchedule?.[day]?.[periodIdx]) return;
    setDragSource({ day, periodIdx });
  };

  const onDropSlot = (targetDay, targetIdx) => {
    if (!dragSource) return;
    const { day: sourceDay, periodIdx: sourceIdx } = dragSource;
    if (sourceDay === targetDay && sourceIdx === targetIdx) {
      setDragSource(null);
      return;
    }
    if (periods[sourceIdx]?.isBreak || periods[targetIdx]?.isBreak) {
      setDragSource(null);
      return;
    }
    const nextSchedule = { ...activeSchedule };
    const sourceRow = [...nextSchedule[sourceDay]];
    const targetRow = sourceDay === targetDay ? sourceRow : [...nextSchedule[targetDay]];
    const sourceValue = sourceRow[sourceIdx];
    sourceRow[sourceIdx] = targetRow[targetIdx];
    targetRow[targetIdx] = sourceValue;
    nextSchedule[sourceDay] = sourceRow;
    nextSchedule[targetDay] = targetRow;
    upsertActiveSchedule(nextSchedule);
    setDragSource(null);
  };

  const applySettings = async () => {
    if (draftDays.length === 0) return alert('Select at least one working day.');
    const cleanedPeriods = draftPeriods.filter((p) => p.label.trim() && p.time.trim());
    if (cleanedPeriods.length === 0) return alert('Add at least one period.');

    const nextSchedules = {};
    CLASSES.forEach((cls) => {
      const oldSchedule = schedulesByClass[cls] || {};
      const rebuilt = buildEmptySchedule(draftDays, cleanedPeriods);
      draftDays.forEach((day) => {
        cleanedPeriods.forEach((period, idx) => {
          if (period.isBreak) {
            rebuilt[day][idx] = { isBreak: true, label: period.label };
            return;
          }
          rebuilt[day][idx] = oldSchedule?.[day]?.[idx] && !oldSchedule?.[day]?.[idx]?.isBreak ? oldSchedule[day][idx] : null;
        });
      });
      nextSchedules[cls] = rebuilt;
    });

    setDays(draftDays);
    setPeriods(cleanedPeriods);
    setSchedulesByClass(nextSchedules);
    setShowSettingsModal(false);
    setDirty(true);
    try {
      await instance.post('/timetables/settings/', { days: draftDays, periods: cleanedPeriods });
    } catch {}
  };

  const assignSubstitute = async () => {
    const teacher = TEACHERS.find((t) => t.id === Number(selectedSubTeacherId));
    if (!teacher || !absence.isDetected) return;
    const todaySlots = [...(activeSchedule[todayDay] || [])];
    absence.affectedPeriodIndexes.forEach((idx) => {
      const slot = todaySlots[idx];
      if (!slot || slot.isBreak) return;
      todaySlots[idx] = { ...slot, substituteFor: absence.absentTeacher, teacher: teacher.name };
    });
    upsertActiveSchedule({ ...activeSchedule, [todayDay]: todaySlots });
    setAbsence({ loading: false, isDetected: false, absentTeacher: '', affectedPeriodIndexes: [] });
    setShowSubstituteModal(false);
    try {
      await instance.post('/timetables/assign-substitute/', { class_name: activeClass, day: todayDay, teacher: teacher.name, periods: absence.affectedPeriodIndexes });
    } catch {}
  };

  const availableSubstituteTeachers = useMemo(() => {
    return TEACHERS.filter((teacher) => {
      if (teacher.name === absence.absentTeacher) return false;
      return absence.affectedPeriodIndexes.every((idx) => {
        const slot = activeSchedule?.[todayDay]?.[idx];
        return !slot || slot.teacher !== teacher.name;
      });
    });
  }, [absence, activeSchedule, todayDay]);

  const teacherTodaySlots = useMemo(() => {
    const todaySlots = activeSchedule?.[todayDay] || [];
    return periods.map((period, idx) => ({ period, idx, slot: todaySlots[idx] })).filter(({ period, slot }) => !period.isBreak && slot && slot.teacher === selectedTeacher.name);
  }, [activeSchedule, todayDay, periods, selectedTeacher]);

  const applyOverride = () => {
    if (!overrideReason.trim() || selectedOverridePeriods.length === 0) return alert('Select periods and enter reason/event.');
    const todaySlots = [...(activeSchedule[todayDay] || [])];
    selectedOverridePeriods.forEach((periodNo) => {
      const idx = periodNo - 1;
      if (periods[idx]?.isBreak) return;
      todaySlots[idx] = { subject: overrideReason, teacher: 'School Administration', room: 'Main Hall', isEvent: true };
    });
    upsertActiveSchedule({ ...activeSchedule, [todayDay]: todaySlots });
    setShowOverrideModal(false);
    setSelectedOverridePeriods([]);
    setOverrideReason('');
  };

  const renderSlot = (day, periodIdx, period) => {
    const data = activeSchedule?.[day]?.[periodIdx];
    if (period.isBreak) {
      return <td key={`${day}-${periodIdx}`} className={`${styles.slotCell} ${styles.breakCell}`}><div className={styles.breakLabel}>{period.label}</div></td>;
    }
    if (data) {
      return (
        <td key={`${day}-${periodIdx}`} className={styles.slotCell} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropSlot(day, periodIdx)}>
          <div className={styles.periodCard} draggable onDragStart={() => onDragStartSlot(day, periodIdx)} onClick={() => openSlotModal(day, periodIdx)} style={data.isEvent ? { borderLeft: '4px solid #f97316', background: '#fff7ed' } : {}}>
            <div>
              <div className={styles.subjectName}>{data.subject}</div>
              <div className={styles.teacherName}>{data.teacher}</div>
            </div>
            <div className={styles.roomTag}><MapPin size={10} style={{ marginRight: 4 }} />{data.room || 'TBD'}</div>
            {data.substituteFor && <div className={styles.subTag}>Sub for {data.substituteFor}</div>}
          </div>
        </td>
      );
    }
    return <td key={`${day}-${periodIdx}`} className={styles.slotCell} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropSlot(day, periodIdx)}><div className={styles.emptySlot} onClick={() => openSlotModal(day, periodIdx)}><Plus size={16} /></div></td>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>Timetable Builder</h2>
          <p>Click empty slots to assign. Drag filled slots to swap periods across the week.</p>
        </div>
        <div className={styles.actionRow}>
          <button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowSettingsModal(true)}><Settings size={18} /> Settings</button>
          <button className={`${styles.btn} ${styles.success}`}><Download size={18} /> Export PDF</button>
        </div>
      </div>

      {absence.isDetected && (
        <div className={styles.alertBanner}>
          <div className={styles.alertContent}>
            <div className={styles.alertIcon}><AlertTriangle size={24} /></div>
            <div className={styles.alertText}>
              <b>Staff Absence Detected</b>
              <span>{absence.absentTeacher} is absent. {absence.affectedPeriodIndexes.length} period(s) in {activeClass} need substitutes.</span>
            </div>
          </div>
          <button className={`${styles.btn} ${styles.danger}`} onClick={() => setShowSubstituteModal(true)}><UserCheck size={14} /> Assign Substitute</button>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <select className={styles.classSelect} value={activeClass} onChange={(e) => setActiveClass(e.target.value)}>{CLASSES.map((cls) => <option key={cls} value={cls}>{cls}</option>)}</select>
          <div className={styles.radioGroup}>
            <div className={`${styles.radioBtn} ${viewMode === 'admin' ? styles.active : ''}`} onClick={() => setViewMode('admin')}>Master</div>
            <div className={`${styles.radioBtn} ${viewMode === 'teacher' ? styles.active : ''}`} onClick={() => setViewMode('teacher')}>Today</div>
          </div>
          {viewMode === 'teacher' && (
            <select className={styles.classSelect} value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(Number(e.target.value))}>
              {TEACHERS.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
          )}
        </div>
        <div className={styles.toolGroup}>
          <button className={`${styles.btn} ${styles.warning}`} onClick={() => setShowOverrideModal(true)}><Zap size={14} /> Override</button>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={() => saveDraft()} disabled={saving || loading}>{saving ? <><RefreshCw size={14} className={styles.spin} /> Saving...</> : <>Save Draft</>}</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={publishTimetable} disabled={saving || loading}><Share2 size={14} /> Publish</button>
        </div>
      </div>

      <div className={styles.metaRow}>
        <span><Clock size={14} /> {loading ? 'Loading timetable...' : dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <span>{lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleTimeString()}` : 'No draft saved yet'}</span>
      </div>

      {viewMode === 'admin' && (
        <div className={styles.gridWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Day</th>
                {periods.map((period, idx) => <th key={idx} className={styles.th} style={period.isBreak ? { width: '64px' } : { width: '180px' }}>{period.label}<span className={styles.timeLabel}>{period.time}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => <tr key={day}><td className={styles.dayCell}>{day}</td>{periods.map((period, idx) => renderSlot(day, idx, period))}</tr>)}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'teacher' && (
        <div className={styles.teacherView}>
          <div className={styles.teacherViewHeader}>
            <h3>{selectedTeacher.name} - {todayDay}</h3>
            <p>Showing only this teacher's periods for today in {activeClass}.</p>
          </div>
          {teacherTodaySlots.length === 0 ? <div className={styles.teacherEmpty}>No periods assigned for today.</div> : (
            <div className={styles.teacherCards}>
              {teacherTodaySlots.map(({ period, idx, slot }) => (
                <div key={idx} className={styles.teacherCard}>
                  <div><b>{period.label}</b><span className={styles.timeLabel}>{period.time}</span></div>
                  <div><div className={styles.subjectName}>{slot.subject}</div><div className={styles.roomTag}><MapPin size={10} /> {slot.room || 'TBD'}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {slotModal.open && (
        <div className={styles.modalOverlay} onClick={() => setSlotModal({ open: false, day: null, periodIdx: null })}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><div className={styles.modalIcon}><Plus size={22} /></div><div><h3>Assign Period</h3><p style={{ opacity: 0.8, fontSize: '0.85rem' }}>{slotModal.day} - {periods[slotModal.periodIdx]?.label}</p></div></div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Subject</label><select className={styles.input} value={slotForm.subject} onChange={(e) => setSlotForm((prev) => ({ ...prev, subject: e.target.value }))}><option value="">Select subject</option>{SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}</select></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Teacher</label><select className={styles.input} value={slotForm.teacher} onChange={(e) => setSlotForm((prev) => ({ ...prev, teacher: e.target.value }))}><option value="">Select teacher</option>{TEACHERS.map((teacher) => <option key={teacher.id}>{teacher.name}</option>)}</select></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Room</label><input className={styles.input} value={slotForm.room} onChange={(e) => setSlotForm((prev) => ({ ...prev, room: e.target.value }))} placeholder="e.g. Room 204" /></div>
              <label className={styles.checkRow}><input type="checkbox" checked={slotForm.isEvent} onChange={(e) => setSlotForm((prev) => ({ ...prev, isEvent: e.target.checked }))} />Mark as special event period</label>
              <div className={styles.modalActions}><button className={`${styles.btn} ${styles.outline}`} onClick={() => setSlotModal({ open: false, day: null, periodIdx: null })}>Cancel</button><button className={`${styles.btn} ${styles.warning}`} onClick={clearSlot}>Clear</button><button className={`${styles.btn} ${styles.primary}`} onClick={saveSlot}><Check size={14} /> Save</button></div>
            </div>
          </div>
        </div>
      )}

      {showOverrideModal && (
        <div className={styles.modalOverlay} onClick={() => setShowOverrideModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><div className={styles.modalIcon}><Zap size={24} /></div><div><h3>Urgent Timetable Override</h3><p style={{ opacity: 0.8, fontSize: '0.85rem' }}>Apply to {todayDay} and save in draft.</p></div></div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Select periods</label><div className={styles.periodSelector}>{periods.filter((p) => !p.isBreak).map((_, idx) => { const n = idx + 1; return <div key={n} className={`${styles.periodPill} ${selectedOverridePeriods.includes(n) ? styles.active : ''}`} onClick={() => setSelectedOverridePeriods((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n])}>{n}</div>; })}</div></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Event / reason</label><input className={styles.input} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. Guest Lecture" /></div>
              <div className={styles.modalActions}><button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowOverrideModal(false)}>Cancel</button><button className={`${styles.btn} ${styles.primary}`} onClick={applyOverride}><Share2 size={14} /> Apply</button></div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><div className={styles.modalIcon}><Settings size={24} /></div><div><h3>Timetable Configuration</h3><p style={{ opacity: 0.8, fontSize: '0.85rem' }}>Configure working days, periods and break slots.</p></div></div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Working days</label><div className={styles.daySelector}>{WEEK_DAY_OPTIONS.map((day) => <label key={day} className={styles.checkRow}><input type="checkbox" checked={draftDays.includes(day)} onChange={(e) => setDraftDays((prev) => e.target.checked ? [...prev, day] : prev.filter((d) => d !== day))} />{day}</label>)}</div></div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Periods & breaks</label>
                <div className={styles.periodConfigList}>
                  {draftPeriods.map((period, idx) => (
                    <div key={`${period.label}-${idx}`} className={styles.periodConfigRow}>
                      <input className={styles.input} value={period.label} onChange={(e) => setDraftPeriods((prev) => prev.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))} placeholder="Label" />
                      <input className={styles.input} value={period.time} onChange={(e) => setDraftPeriods((prev) => prev.map((x, i) => i === idx ? { ...x, time: e.target.value } : x))} placeholder="Time range" />
                      <label className={styles.checkRow}><input type="checkbox" checked={!!period.isBreak} onChange={(e) => setDraftPeriods((prev) => prev.map((x, i) => i === idx ? { ...x, isBreak: e.target.checked } : x))} />Break</label>
                      <button className={`${styles.btn} ${styles.outline}`} onClick={() => setDraftPeriods((prev) => prev.filter((_, i) => i !== idx))}><X size={14} /></button>
                    </div>
                  ))}
                </div>
                <button className={`${styles.btn} ${styles.outline}`} onClick={() => setDraftPeriods((prev) => [...prev, { label: `Period ${prev.length + 1}`, time: '00:00 - 00:00', isBreak: false }])}><Plus size={14} /> Add Period</button>
              </div>
              <div className={styles.modalActions}><button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowSettingsModal(false)}>Cancel</button><button className={`${styles.btn} ${styles.primary}`} onClick={applySettings}><Check size={14} /> Save Settings</button></div>
            </div>
          </div>
        </div>
      )}

      {showSubstituteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSubstituteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><div className={styles.modalIcon}><UserCheck size={24} /></div><div><h3>Assign Substitute</h3><p style={{ opacity: 0.8, fontSize: '0.85rem' }}>{absence.absentTeacher} is absent for selected periods.</p></div></div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Affected periods today ({todayDay})</label><div className={styles.infoBox}>{absence.affectedPeriodIndexes.map((idx) => periods[idx]?.label || `#${idx + 1}`).join(', ') || 'None'}</div></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Available teachers</label><select className={styles.input} value={selectedSubTeacherId} onChange={(e) => setSelectedSubTeacherId(Number(e.target.value))}>{availableSubstituteTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} ({teacher.subject})</option>)}</select></div>
              <div className={styles.modalActions}><button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowSubstituteModal(false)}>Cancel</button><button className={`${styles.btn} ${styles.primary}`} onClick={assignSubstitute}>Assign</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTable;
