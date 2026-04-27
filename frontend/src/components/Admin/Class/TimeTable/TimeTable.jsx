'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Download,
  MapPin,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  UserCheck,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import styles from './TimeTable.module.css';
import instance from '@/api/instance';
import adminApi from '@/api/adminApi';
import { useToast, ToastStack } from '@/components/common/useToast';

const WEEK_DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const DEFAULT_LOCALE = 'en-IN';
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'India (Asia/Kolkata)', locale: 'en-IN' },
  { value: 'Asia/Dubai', label: 'UAE (Asia/Dubai)', locale: 'en-AE' },
  { value: 'Europe/London', label: 'UK (Europe/London)', locale: 'en-GB' },
  { value: 'America/New_York', label: 'US East (America/New_York)', locale: 'en-US' },
  { value: 'America/Los_Angeles', label: 'US West (America/Los_Angeles)', locale: 'en-US' },
  { value: 'Australia/Sydney', label: 'Australia (Australia/Sydney)', locale: 'en-AU' },
];
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
  { label: 'Period 8', time: '14:45 - 15:30', isBreak: false },
  { label: 'Period 9', time: '15:30 - 16:15', isBreak: false },
  { label: 'Period 10', time: '16:15 - 17:00', isBreak: false },
];
// Mocks removed. Using dynamic states.

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

const getTodayDayName = (timeZone = DEFAULT_TIMEZONE, locale = DEFAULT_LOCALE) => {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone }).format(new Date());
  } catch {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  }
};
const parseRange = (range = '') => {
  const [start = '', end = ''] = String(range).split('-').map((s) => s.trim());
  return { start, end };
};
const to12Hour = (hhmm = '') => {
  const [hStr, mStr] = String(hhmm).split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
};
const formatRangeForDisplay = (range, format = '24h') => {
  const { start, end } = parseRange(range);
  if (!start || !end) return range || '';
  if (format === '12h') return `${to12Hour(start)} - ${to12Hour(end)}`;
  return `${start} - ${end}`;
};

const TimeTable = () => {
  const [sectionRecords, setSectionRecords] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectAllocations, setSubjectAllocations] = useState([]);
  const [subjectAllocationsLoading, setSubjectAllocationsLoading] = useState(false);
  
  const { push, toasts, dismiss } = useToast();
  
  const [activeClass, setActiveClass] = useState('');
  const [viewMode, setViewMode] = useState('admin');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const [days, setDays] = useState(DEFAULT_DAYS);
  const [periods, setPeriods] = useState(DEFAULT_PERIODS);
  const [schedulesByClass, setSchedulesByClass] = useState({});

  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [previewDraftId, setPreviewDraftId] = useState(null);
  const [hasTimetableData, setHasTimetableData] = useState(false);
  const [timeFormat, setTimeFormat] = useState('24h');
  const [timeZone, setTimeZone] = useState(DEFAULT_TIMEZONE);
  const [regionLocale, setRegionLocale] = useState(DEFAULT_LOCALE);

  const [slotModal, setSlotModal] = useState({ open: false, day: null, periodIdx: null });
  const [slotForm, setSlotForm] = useState({ subject: '', teacher: '', room: '', isEvent: false, customTitle: '' });
  const [dragSource, setDragSource] = useState(null);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedOverridePeriods, setSelectedOverridePeriods] = useState([]);
  const [overrideReason, setOverrideReason] = useState('');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [draftDays, setDraftDays] = useState(DEFAULT_DAYS);
  const [draftPeriods, setDraftPeriods] = useState(DEFAULT_PERIODS);
  const [classTeacherFirstPeriod, setClassTeacherFirstPeriod] = useState(true);
  const [allowSameSubjectTwiceDay, setAllowSameSubjectTwiceDay] = useState(false);
  const [maxConsecutivePeriodsTeacher, setMaxConsecutivePeriodsTeacher] = useState(4);
  const [minTeacherFreePeriodsPerDay, setMinTeacherFreePeriodsPerDay] = useState(1);
  const [maxTeacherLoadPerWeek, setMaxTeacherLoadPerWeek] = useState(30);
  const [maxTeacherPeriodsPerDay, setMaxTeacherPeriodsPerDay] = useState(6);
  const [enforceConsecutiveLabs, setEnforceConsecutiveLabs] = useState(true);
  const [avoidFixedPeriodPatterns, setAvoidFixedPeriodPatterns] = useState(true);
  const [preferredMorningSubjectIds, setPreferredMorningSubjectIds] = useState([]);
  const [aiStrategy, setAiStrategy] = useState('balanced');
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);

  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [absence, setAbsence] = useState({ loading: false, isDetected: false, absentTeacher: '', affectedPeriodIndexes: [] });
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSchoolWide, setIsSchoolWide] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ subjects: true, teachers: true });
  const [pendingSlotWarnings, setPendingSlotWarnings] = useState([]);

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSourceClass, setCloneSourceClass] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);

  const activeSchedule = useMemo(() => schedulesByClass[activeClass] || buildEmptySchedule(days, periods), [schedulesByClass, activeClass, days, periods]);
  const selectedTeacher = useMemo(() => {
    const teacher = teachers.find((t) => t.id === Number(selectedTeacherId));
    if (!teacher) return { id: null, name: 'Select Teacher' };
    const name = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
    return { ...teacher, name: name || teacher.full_name || teacher.name || 'Teacher' };
  }, [selectedTeacherId, teachers]);
  const activeSection = useMemo(
    () => sectionRecords.find((s) => `${s.class_name} - ${s.name}` === activeClass) || null,
    [sectionRecords, activeClass]
  );
  const teacherOptionsForSlot = useMemo(() => {
    if (slotForm.isEvent) return teachers;
    if (!slotForm.subject) return teachers;
    const selectedSubject = subjects.find((s) => s.name === slotForm.subject);
    const filteredAllocations = subjectAllocations.filter((a) => {
      if (selectedSubject?.id && Number(a.subject) === Number(selectedSubject.id)) return true;
      return a.subject_name === slotForm.subject;
    });
    const allowedTeacherIdsFromAllocations = new Set();
    filteredAllocations.forEach((a) => {
      if (a.teacher) allowedTeacherIdsFromAllocations.add(Number(a.teacher));
      if (a.substitute_teacher) allowedTeacherIdsFromAllocations.add(Number(a.substitute_teacher));
    });
    const allowedTeacherIdsFromProfile = new Set(
      teachers
        .filter((teacher) =>
          Array.isArray(teacher.teaching_subject_ids)
            ? teacher.teaching_subject_ids.map(Number).includes(Number(selectedSubject?.id))
            : false
        )
        .map((teacher) => Number(teacher.id))
    );
    const allowedTeacherIds = new Set([...allowedTeacherIdsFromAllocations, ...allowedTeacherIdsFromProfile]);
    if (allowedTeacherIds.size === 0) return [];
    return teachers.filter((t) => allowedTeacherIds.has(Number(t.id)));
  }, [slotForm.subject, teachers, subjects, subjectAllocations]);
  const todayDay = useMemo(() => {
    const today = getTodayDayName(timeZone, regionLocale);
    return days.includes(today) ? today : days[0];
  }, [days, timeZone, regionLocale]);

  const globalSchedules = useMemo(() => {
    const global = {};
    Object.entries(schedulesByClass).forEach(([sectionLabel, schedule]) => {
      Object.entries(schedule).forEach(([day, slots]) => {
        slots.forEach((slot, idx) => {
          if (!slot?.teacher) return;
          if (!global[slot.teacher]) global[slot.teacher] = {};
          if (!global[slot.teacher][day]) global[slot.teacher][day] = {};
          global[slot.teacher][day][idx] = sectionLabel;
        });
      });
    });
    return global;
  }, [schedulesByClass]);

  const globalRoomSchedules = useMemo(() => {
    const global = {};
    Object.entries(schedulesByClass).forEach(([sectionLabel, schedule]) => {
      Object.entries(schedule || {}).forEach(([day, slots]) => {
        (slots || []).forEach((slot, idx) => {
          const room = slot?.room;
          if (!room || room === 'TBD' || slot?.isBreak) return;
          if (!global[room]) global[room] = {};
          if (!global[room][day]) global[room][day] = {};
          global[room][day][idx] = sectionLabel;
        });
      });
    });
    return global;
  }, [schedulesByClass]);



  const workload = useMemo(() => {
    const counts = {};
    if (!activeSchedule) return counts;
    Object.values(activeSchedule).forEach(daySlots => {
      daySlots.forEach(slot => {
        if (slot && slot.teacher) {
          counts[slot.teacher] = (counts[slot.teacher] || 0) + 1;
        }
      });
    });
    return counts;
  }, [activeSchedule]);

  const subjectCompletion = useMemo(() => {
    const counts = {};
    Object.values(activeSchedule).forEach(daySlots => {
      daySlots.forEach(slot => {
        if (slot && slot.subject) {
          counts[slot.subject] = (counts[slot.subject] || 0) + 1;
        }
      });
    });
    return subjects.map(s => ({
      ...s,
      current: counts[s.name] || 0,
      target: Number(s.weekly_periods) || 0
    }));
  }, [activeSchedule, subjects]);

  const unmappedSubjects = useMemo(() => {
    return subjectCompletion.filter((subjectRow) => {
      const subjectObj = subjects.find((s) => Number(s.id) === Number(subjectRow.id));
      const hasAllocationTeacher = subjectAllocations.some((allocation) => {
        const sameSubject = Number(allocation.subject) === Number(subjectRow.id)
          || allocation.subject_name === subjectRow.name
          || (subjectObj && allocation.subject_name === subjectObj.name);
        const hasTeacher = Boolean(allocation.teacher || allocation.substitute_teacher);
        return sameSubject && hasTeacher;
      });
      if (hasAllocationTeacher) return false;
      const hasProfileTeacher = teachers.some((teacher) =>
        Array.isArray(teacher.teaching_subject_ids)
          ? teacher.teaching_subject_ids.map(Number).includes(Number(subjectRow.id))
          : false
      );
      return !hasProfileTeacher;
    });
  }, [subjectCompletion, subjectAllocations, subjects, teachers]);

  const getTeacherClash = useCallback((teacherName, day, periodIdx) => {
    if (!teacherName || !globalSchedules[teacherName]) return null;
    const busyInSection = globalSchedules[teacherName]?.[day]?.[periodIdx];
    if (busyInSection && busyInSection !== activeClass) return busyInSection;
    return null;
  }, [globalSchedules, activeClass]);

  const getRoomClash = useCallback((room, day, periodIdx) => {
    if (!room || room === 'TBD' || !globalRoomSchedules[room]) return null;
    const busyInSection = globalRoomSchedules[room]?.[day]?.[periodIdx];
    if (busyInSection && busyInSection !== activeClass) return busyInSection;
    return null;
  }, [globalRoomSchedules, activeClass]);

  const validateSlot = useCallback((form, day, pIdx) => {
    const warnings = [];
    if (!form.subject && !form.teacher) return warnings;

    // 1. Teacher Clash
    const clash = getTeacherClash(form.teacher, day, pIdx);
    if (clash) warnings.push({ type: 'error', msg: `Teacher busy in ${clash}` });

    // 2. Room Clash
    if (form.room && form.room !== 'TBD') {
      const roomClash = getRoomClash(form.room, day, pIdx);
      if (roomClash) warnings.push({ type: 'error', msg: `Room already booked in ${roomClash}` });
    }

    if (!form.isEvent) {
      // 3. Same subject same day
      if (!allowSameSubjectTwiceDay && form.subject) {
        const daySlots = activeSchedule[day] || [];
        const hasSameSub = daySlots.some((s, idx) => s && s.subject === form.subject && idx !== pIdx);
        if (hasSameSub) warnings.push({ type: 'warning', msg: `Subject already placed on ${day}` });
      }

      // 4. Subject over-quota
      const subData = subjects.find(s => s.name === form.subject);
      if (subData) {
        const currentCount = subjectCompletion.find(sc => sc.name === form.subject)?.current || 0;
        // If we are ADDING a new slot (was null before) and already at quota
        if (!activeSchedule[day][pIdx] && currentCount >= subData.weekly_periods) {
          warnings.push({ type: 'warning', msg: `Quota exceeded (${currentCount}/${subData.weekly_periods})` });
        }
      }
    }

    // 5. Class Teacher First Period Rule
    if (classTeacherFirstPeriod && pIdx === 0 && form.teacher) {
      if (activeSection?.class_teacher_name && form.teacher !== activeSection.class_teacher_name) {
        warnings.push({ type: 'warning', msg: `Period 1 should ideally be assigned to class teacher (${activeSection.class_teacher_name})` });
      }
    }

    return warnings;
  }, [getTeacherClash, getRoomClash, activeSchedule, subjects, subjectCompletion, classTeacherFirstPeriod, activeSection, allowSameSubjectTwiceDay]);

  const globalWorkload = useMemo(() => {
    const counts = {};
    Object.values(schedulesByClass).forEach(classSchedule => {
      Object.values(classSchedule).forEach(daySlots => {
        daySlots.forEach(slot => {
          if (slot && slot.teacher) {
            counts[slot.teacher] = (counts[slot.teacher] || 0) + 1;
          }
        });
      });
    });
    return counts;
  }, [schedulesByClass]);

  const conflictMap = useMemo(() => {
    const map = {}; // { [day]: { [pIdx]: conflictLabel } }
    if (!activeSchedule) return map;

    Object.entries(activeSchedule).forEach(([day, slots]) => {
      slots.forEach((slot, idx) => {
        if (!slot || !slot.teacher) return;
        const messages = [];

        const clash = getTeacherClash(slot.teacher, day, idx);
        if (clash) messages.push(`Teacher busy in ${clash}`);

        const roomClash = slot.room ? getRoomClash(slot.room, day, idx) : null;
        if (roomClash) messages.push(`Room ${slot.room} busy in ${roomClash}`);

        // Rule: Class Teacher First Period
        if (classTeacherFirstPeriod && idx === 0 && slot.teacher && activeSection?.class_teacher_name) {
          if (slot.teacher !== activeSection.class_teacher_name) {
            messages.push(`Period 1 rule: Assigned to ${slot.teacher} instead of class teacher ${activeSection.class_teacher_name}`);
          }
        }

        if (messages.length > 0) {
          if (!map[day]) map[day] = {};
          map[day][idx] = messages.join('\n');
        }
      });
    });
    return map;
  }, [activeSchedule, getTeacherClash, getRoomClash, classTeacherFirstPeriod, activeSection]);

  const flattenedConflicts = useMemo(() => {
    return Object.entries(conflictMap).flatMap(([day, dayConflicts]) =>
      Object.entries(dayConflicts || {}).map(([idx, msg]) => ({ day, idx: Number(idx), msg }))
    );
  }, [conflictMap]);

  const upsertActiveSchedule = (nextSchedule) => {
    setSchedulesByClass((prev) => ({ ...prev, [activeClass]: nextSchedule }));
    setDirty(true);
  };
  const displayRange = (range) => formatRangeForDisplay(range, timeFormat);
  const formatTimeStamp = useCallback((iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(regionLocale, {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return new Date(iso).toLocaleString();
    }
  }, [regionLocale, timeZone]);

  const fetchMetadata = async () => {
    try {
      const [sectionsRes, teachersRes, subjectsRes, allTimetablesRes] = await Promise.all([
        instance.get('/students/sections/'),
        instance.get('/staff/teachers/'),
        instance.get('/academics/subjects/'),
        instance.get('/timetables/'),
      ]);
      const sectionData = Array.isArray(sectionsRes.data) ? sectionsRes.data : [];
      const sectionList = sectionData.map(s => `${s.class_name} - ${s.name}`);
      setSectionRecords(sectionData);
      setSections(sectionList);
      setTeachers(teachersRes.data);
      setSubjects((Array.isArray(subjectsRes.data) ? subjectsRes.data : []).filter((s) => s?.is_active !== false));
      
      const serverDays = DEFAULT_DAYS; // We'll assume a standard for pre-fill
      const serverPeriods = DEFAULT_PERIODS;

      // Build Global Schedules for ALL classes
      const allSchedules = {};
      
      // Initialize empty schedules for all sections
      sectionList.forEach(name => {
        allSchedules[name] = buildEmptySchedule(serverDays, serverPeriods);
      });

      const allTT = allTimetablesRes.data || [];
      allTT.forEach(tt => {
        const dayName = WEEK_DAY_OPTIONS[tt.day_of_week - 1];
        const sectionLabel = `${tt.section?.school_class?.name} - ${tt.section?.name}`;
        
        if (allSchedules[sectionLabel] && allSchedules[sectionLabel][dayName]) {
          tt.periods.forEach(p => {
            const idx = p.period_number - 1;
            let tName = p.teacher_name || '';
            if (!tName && p.teacher) {
              if (typeof p.teacher === 'object') {
                tName = `${p.teacher.first_name} ${p.teacher.last_name}`.trim();
              } else {
                const found = teachersRes.data.find((t) => t.id === p.teacher);
                if (found) tName = `${found.first_name} ${found.last_name}`.trim();
              }
            }
            
            allSchedules[sectionLabel][dayName][idx] = {
              subject: p.period_type === 'custom' ? (p.custom_title || 'Special Event') : (p.subject_name || (p.subject?.name) || ''),
              teacher: tName,
              room: p.room || 'TBD',
              isEvent: p.period_type === 'custom',
              customTitle: p.custom_title || ''
            };


          });
        }
      });

      setSchedulesByClass(allSchedules);
      if (sectionList.length > 0) setActiveClass(sectionList[0]);
    } catch (e) {
      console.error("Failed to fetch metadata", e);
    }
  };





  const loadTimetable = async () => {
    if (!activeClass) return;
    try {
      setLoading(true);
      const [settingsRes, timetableRes] = await Promise.all([
        instance.get('/timetables/settings/').catch(() => null),
        instance.get('/timetables/', { params: { class_name: activeClass } }).catch(() => null),
      ]);
      const serverDays = Array.isArray(settingsRes?.data?.working_days) ? settingsRes.data.working_days : DEFAULT_DAYS;
      const serverPeriods = Array.isArray(settingsRes?.data?.periods) ? settingsRes.data.periods : DEFAULT_PERIODS;
      const serverTimeFormat = settingsRes?.data?.time_format;
      const serverTimeZone = settingsRes?.data?.time_zone;
      const serverPreferences = settingsRes?.data?.preferences && typeof settingsRes.data.preferences === 'object' ? settingsRes.data.preferences : null;
      setDays(serverDays);
      setPeriods(serverPeriods);
      setDraftDays(serverDays);
      setDraftPeriods(serverPeriods);
      if (serverTimeFormat === '12h' || serverTimeFormat === '24h') setTimeFormat(serverTimeFormat);
      if (serverTimeZone && typeof serverTimeZone === 'string') {
        setTimeZone(serverTimeZone);
        const region = TIMEZONE_OPTIONS.find((z) => z.value === serverTimeZone);
        if (region?.locale) setRegionLocale(region.locale);
      }
      if (serverPreferences) {
        if (typeof serverPreferences.class_teacher_first_period === 'boolean') {
          setClassTeacherFirstPeriod(serverPreferences.class_teacher_first_period);
        }
        if (typeof serverPreferences.allow_same_subject_twice_day === 'boolean') {
          setAllowSameSubjectTwiceDay(serverPreferences.allow_same_subject_twice_day);
        }
        if (Number.isFinite(Number(serverPreferences.max_consecutive_periods_teacher))) {
          setMaxConsecutivePeriodsTeacher(Math.max(0, Number(serverPreferences.max_consecutive_periods_teacher)));
        }
        if (Number.isFinite(Number(serverPreferences.min_teacher_free_periods_per_day))) {
          setMinTeacherFreePeriodsPerDay(Math.max(0, Number(serverPreferences.min_teacher_free_periods_per_day)));
        }
        if (Number.isFinite(Number(serverPreferences.max_teacher_load_per_week))) {
          setMaxTeacherLoadPerWeek(Math.max(0, Number(serverPreferences.max_teacher_load_per_week)));
        }
        if (Number.isFinite(Number(serverPreferences.max_teacher_periods_per_day))) {
          setMaxTeacherPeriodsPerDay(Math.max(0, Number(serverPreferences.max_teacher_periods_per_day)));
        }
        if (typeof serverPreferences.enforce_consecutive_labs === 'boolean') {
          setEnforceConsecutiveLabs(serverPreferences.enforce_consecutive_labs);
        }
        if (typeof serverPreferences.avoid_fixed_period_patterns === 'boolean') {
          setAvoidFixedPeriodPatterns(serverPreferences.avoid_fixed_period_patterns);
        }
        if (Array.isArray(serverPreferences.preferred_morning_subject_ids)) {
          setPreferredMorningSubjectIds(serverPreferences.preferred_morning_subject_ids.map(Number).filter(Number.isFinite));
        }
        if (typeof serverPreferences.ai_strategy === 'string') {
          setAiStrategy(serverPreferences.ai_strategy);
        }
      }
      
      const rawRecords = timetableRes?.data || [];
      setHasTimetableData(Array.isArray(rawRecords) && rawRecords.length > 0);
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
                tName = `${p.teacher.first_name} ${p.teacher.last_name}`.trim();
              } else {
                const found = teachers.find((t) => t.id === p.teacher);
                if (found) tName = `${found.first_name} ${found.last_name}`.trim();
              }
            }

            normalized[dayName][idx] = {
              subject: p.period_type === 'custom' ? (p.custom_title || 'Special Event') : (p.subject_name || (p.subject?.name) || ''),
              teacher: tName || 'No Teacher',
              room: p.room || 'TBD',
              isEvent: p.period_type === 'custom',
              customTitle: p.custom_title || ''
            };
          });
        }
      });

      setSchedulesByClass((prev) => ({ ...prev, [activeClass]: normalized }));
      setDirty(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('tt_time_settings_v1');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.time_format) setTimeFormat(parsed.time_format);
      if (parsed?.time_zone) setTimeZone(parsed.time_zone);
      if (parsed?.locale) setRegionLocale(parsed.locale);
      if (typeof parsed?.class_teacher_first_period === 'boolean') {
        setClassTeacherFirstPeriod(parsed.class_teacher_first_period);
      }
      if (typeof parsed?.allow_same_subject_twice_day === 'boolean') {
        setAllowSameSubjectTwiceDay(parsed.allow_same_subject_twice_day);
      }
      if (Number.isFinite(Number(parsed?.max_consecutive_periods_teacher))) {
        setMaxConsecutivePeriodsTeacher(Math.max(0, Number(parsed.max_consecutive_periods_teacher)));
      }
      if (Number.isFinite(Number(parsed?.min_teacher_free_periods_per_day))) {
        setMinTeacherFreePeriodsPerDay(Math.max(0, Number(parsed.min_teacher_free_periods_per_day)));
      }
      if (Number.isFinite(Number(parsed?.max_teacher_load_per_week))) {
        setMaxTeacherLoadPerWeek(Math.max(0, Number(parsed.max_teacher_load_per_week)));
      }
      if (Number.isFinite(Number(parsed?.max_teacher_periods_per_day))) {
        setMaxTeacherPeriodsPerDay(Math.max(0, Number(parsed.max_teacher_periods_per_day)));
      }
      if (typeof parsed?.enforce_consecutive_labs === 'boolean') {
        setEnforceConsecutiveLabs(parsed.enforce_consecutive_labs);
      }
      if (typeof parsed?.avoid_fixed_period_patterns === 'boolean') {
        setAvoidFixedPeriodPatterns(parsed.avoid_fixed_period_patterns);
      }
      if (Array.isArray(parsed?.preferred_morning_subject_ids)) {
        setPreferredMorningSubjectIds(parsed.preferred_morning_subject_ids.map(Number).filter(Number.isFinite));
      }
      if (typeof parsed?.ai_strategy === 'string') {
        setAiStrategy(parsed.ai_strategy);
      }
    } catch {
      // ignore malformed local settings
    }
  }, []);

  const checkAbsence = async () => {
    if (!activeClass || !hasTimetableData) {
      setAbsence({ loading: false, isDetected: false, absentTeacher: '', affectedPeriodIndexes: [] });
      return;
    }
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
    if (schedulesByClass[activeClass] && hasTimetableData && !loading) return;
    loadTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass]);

  useEffect(() => {
    const loadSubjectAllocations = async () => {
      if (!activeSection?.id) {
        setSubjectAllocations([]);
        return;
      }
      try {
        setSubjectAllocationsLoading(true);
        const res = await adminApi.getAllocations({ section: activeSection.id });
        setSubjectAllocations(Array.isArray(res.data) ? res.data : []);
      } catch {
        setSubjectAllocations([]);
      } finally {
        setSubjectAllocationsLoading(false);
      }
    };
    loadSubjectAllocations();
  }, [activeSection?.id]);

  useEffect(() => {
    if (subjectAllocationsLoading || !slotForm.subject || !slotForm.teacher) return;
    const selectedTeacherStillAllowed = teacherOptionsForSlot.some(
      (teacher) => `${teacher.first_name} ${teacher.last_name}` === slotForm.teacher
    );
    if (!selectedTeacherStillAllowed) {
      setSlotForm((prev) => ({ ...prev, teacher: '' }));
    }
  }, [slotForm.subject, slotForm.teacher, teacherOptionsForSlot, subjectAllocationsLoading]);

  useEffect(() => {
    if (!activeClass || !hasTimetableData || !activeSchedule?.[todayDay]) return;
    checkAbsence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass, todayDay, schedulesByClass, hasTimetableData]);

  const saveDraft = async ({ silent = false } = {}) => {
    try {
      if (!silent) setSaving(true);
      await instance.post('/timetables/draft/', { 
        class_name: activeClass, 
        periods, 
        schedule: activeSchedule 
      });
      setDirty(false);
      setLastSavedAt(new Date().toISOString());
      if (!silent) push('Draft saved successfully', 'success');
    } catch {
      if (!silent) push('Failed to save draft timetable.', 'error');
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const generateTimetable = async () => {
    try {
      if (!activeSection?.id) {
        push('Please select a valid section first.', 'error');
        return;
      }
      setSaving(true);
      const workingDayCodes = days
        .map((day) => WEEK_DAY_OPTIONS.indexOf(day) + 1)
        .filter((dayCode) => dayCode > 0);
      const breakPeriods = periods
        .map((period, idx) => (period.isBreak ? idx + 1 : null))
        .filter(Boolean);

      const schedulePayload = scheduleToManualOverridePayload();

      const res = await instance.post('/ai-brain/timetable/generate/', {
        section_id: activeSection.id,
        working_days: workingDayCodes,
        periods_per_day: periods.length,
        break_periods: breakPeriods,
        initial_draft: schedulePayload.draft,
        preferences: {
          class_teacher_first_period: classTeacherFirstPeriod,
          min_teacher_free_periods_per_day: minTeacherFreePeriodsPerDay,
          max_consecutive_periods_teacher: maxConsecutivePeriodsTeacher,
          max_teacher_load_per_week: maxTeacherLoadPerWeek,
          max_teacher_periods_per_day: maxTeacherPeriodsPerDay,
          enforce_consecutive_labs: enforceConsecutiveLabs,
          avoid_fixed_period_patterns: avoidFixedPeriodPatterns,
          allow_same_subject_twice_day: allowSameSubjectTwiceDay,
          preferred_morning_subject_ids: preferredMorningSubjectIds,
          ai_strategy: aiStrategy,
        },
        persist: false,
      });

      if (res?.data?.draft_id) {
        setPreviewDraftId(res.data.draft_id);
      }

      const backendDraft = Array.isArray(res?.data?.draft) ? res.data.draft : [];
      if (backendDraft.length) {
        const nextSchedule = buildEmptySchedule(days, periods);
        backendDraft.forEach((dayRow) => {
          const dayName = WEEK_DAY_OPTIONS[(dayRow.day_of_week || 1) - 1];
          if (!dayName || !nextSchedule[dayName]) return;
          (dayRow.periods || []).forEach((slot) => {
            const idx = (slot.period_number || 1) - 1;
            if (!nextSchedule[dayName][idx]) nextSchedule[dayName][idx] = null;
            if (slot.type === 'break') {
              nextSchedule[dayName][idx] = { isBreak: true, label: periods[idx]?.label || 'BREAK' };
            } else if (slot.type === 'class') {
              nextSchedule[dayName][idx] = {
                subject: slot.subject_name || '',
                teacher: slot.teacher_name || '',
                room: 'TBD',
                isEvent: false,
                aiMeta: {
                  score: typeof slot.score === 'number' ? slot.score : null,
                  reasons: Array.isArray(slot.reasons) ? slot.reasons : [],
                  source: slot.source || 'ai',
                },
              };
            } else if (slot.type === 'custom') {
              nextSchedule[dayName][idx] = {
                subject: slot.custom_title || 'Special Event',
                teacher: slot.teacher_name || '',
                room: 'TBD',
                isEvent: true,
                customTitle: slot.custom_title || '',
                aiMeta: {
                  score: typeof slot.score === 'number' ? slot.score : null,
                  reasons: Array.isArray(slot.reasons) ? slot.reasons : [],
                  source: slot.source || 'seed',
                },
              };
            } else {
              nextSchedule[dayName][idx] = null;
            }
          });
        });
        setSchedulesByClass((prev) => ({ ...prev, [activeClass]: nextSchedule }));
        setDirty(true);
      }

      const unplaced = res?.data?.meta?.unplaced?.length || 0;
      if (unplaced > 0) {
        push(`Preview generated with ${unplaced} unplaced subject slots. Review and publish.`, 'warning');
      } else {
        push('AI preview generated. Review and click Publish to apply.', 'success');
      }
    } catch (e) {
      const details = e?.response?.data;
      const errorMsg = details?.error || details?.detail || 'Generation failed';
      push(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const scheduleToManualOverridePayload = () => {
    const teacherByName = {};
    teachers.forEach((t) => {
      const label = `${t.first_name} ${t.last_name}`.trim();
      if (label) teacherByName[label] = t.id;
      if (t.full_name) teacherByName[t.full_name] = t.id;
      if (t.name) teacherByName[t.name] = t.id;
    });
    const subjectByName = {};
    subjects.forEach((s) => {
      if (s.name) subjectByName[s.name] = s.id;
    });

    const draft = days.map((day) => {
      const dayCode = WEEK_DAY_OPTIONS.indexOf(day) + 1;
      const row = activeSchedule?.[day] || [];
      const periodsPayload = row.map((slot, idx) => {
        const periodNumber = idx + 1;
        if (periods[idx]?.isBreak || slot?.isBreak) {
          return { period_number: periodNumber, type: 'break' };
        }
        if (!slot) {
          return { period_number: periodNumber, type: 'free' };
        }
        return {
          period_number: periodNumber,
          type: slot.isEvent ? 'event' : 'class',
          subject_id: slot.isEvent ? null : (subjectByName[slot.subject] || null),
          subject_name: slot.isEvent ? null : slot.subject,
          custom_title: slot.isEvent ? (slot.customTitle || slot.subject) : null,
          teacher_id: teacherByName[slot.teacher] || null,
          teacher_name: slot.teacher || '',
        };
      });
      return { day_of_week: dayCode, periods: periodsPayload };
    });

    return {
      draft,
      periods_per_day: periods.length,
      break_periods: periods.map((p, idx) => (p.isBreak ? idx + 1 : null)).filter(Boolean),
    };
  };

  const cloneSchedule = () => {
    if (!cloneSourceClass || cloneSourceClass === activeClass) return;
    const sourceData = schedulesByClass[cloneSourceClass];
    if (!sourceData) return;
    
    // Deep clone the structure
    const cloned = JSON.parse(JSON.stringify(sourceData));
    setSchedulesByClass(prev => ({ ...prev, [activeClass]: cloned }));
    setDirty(true);
    setShowCloneModal(false);
    push(`Structure copied from ${cloneSourceClass}`, 'success');
  };

  const publishTimetable = () => {
    setShowPublishModal(true);
  };

  const finalizePublish = async () => {
    try {
      setShowPublishModal(false);
      setSaving(true);
      if (!previewDraftId) {
        push('Generate AI preview first, then publish.', 'warning');
        return;
      }
      const manual_override_payload = scheduleToManualOverridePayload();
      await adminApi.applyAiTimetableDraft(previewDraftId, { manual_override_payload });
      push('Timetable published successfully.', 'success');
      setPreviewDraftId(null);
      setDirty(false);
      setLastSavedAt(new Date().toISOString());
      loadTimetable();
    } catch {
      push('Publish failed.', 'error');
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
    setSlotForm({ 
      subject: slot?.subject || '', 
      teacher: slot?.teacher || '', 
      room: slot?.room || '', 
      isEvent: !!slot?.isEvent,
      customTitle: slot?.customTitle || ''
    });
    setPendingSlotWarnings([]);
    setSlotModal({ open: true, day, periodIdx });
  };

  const saveSlot = (forceOverride = false) => {
    if (!slotModal.open || !slotModal.day) return;
    
    const warnings = validateSlot(slotForm, slotModal.day, slotModal.periodIdx);
    
    if (warnings.length > 0 && !forceOverride) {
      setPendingSlotWarnings(warnings);
      return;
    }

    if (!slotForm.teacher) {
      push('Please select a teacher.', 'error');
      return;
    }
    if (slotForm.isEvent) {
      if (!slotForm.customTitle) {
        push('Please enter an event title.', 'error');
        return;
      }
    } else {
      if (!slotForm.subject) {
        push('Please select a subject.', 'error');
        return;
      }
    }

    const nextSchedule = { ...activeSchedule };
    const daySlots = [...nextSchedule[slotModal.day]];
    daySlots[slotModal.periodIdx] = { 
      subject: slotForm.isEvent ? (slotForm.customTitle || 'Special Event') : slotForm.subject, 
      teacher: slotForm.teacher, 
      room: slotForm.room || 'TBD', 
      isEvent: slotForm.isEvent,
      customTitle: slotForm.isEvent ? slotForm.customTitle : ''
    };
    nextSchedule[slotModal.day] = daySlots;

    upsertActiveSchedule(nextSchedule);
    setSlotModal({ open: false, day: null, periodIdx: null });
    setPendingSlotWarnings([]);
    if (!forceOverride && warnings.length > 0) push('Slot saved with warnings.', 'warning');
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
    sections.forEach((cls) => {
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
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'tt_time_settings_v1',
        JSON.stringify({ 
          time_format: timeFormat, 
          time_zone: timeZone, 
          locale: regionLocale,
          class_teacher_first_period: classTeacherFirstPeriod,
          allow_same_subject_twice_day: allowSameSubjectTwiceDay,
          max_consecutive_periods_teacher: maxConsecutivePeriodsTeacher,
          min_teacher_free_periods_per_day: minTeacherFreePeriodsPerDay,
          max_teacher_load_per_week: maxTeacherLoadPerWeek,
          max_teacher_periods_per_day: maxTeacherPeriodsPerDay,
          enforce_consecutive_labs: enforceConsecutiveLabs,
          avoid_fixed_period_patterns: avoidFixedPeriodPatterns,
          preferred_morning_subject_ids: preferredMorningSubjectIds,
          ai_strategy: aiStrategy,
        })
      );
    }
    try {
      await instance.post('/timetables/settings/', {
        working_days: draftDays,
        periods: cleanedPeriods,
        time_format: timeFormat,
        time_zone: timeZone,
        locale: regionLocale,
        preferences: {
          class_teacher_first_period: classTeacherFirstPeriod,
          allow_same_subject_twice_day: allowSameSubjectTwiceDay,
          max_consecutive_periods_teacher: maxConsecutivePeriodsTeacher,
          min_teacher_free_periods_per_day: minTeacherFreePeriodsPerDay,
          max_teacher_load_per_week: maxTeacherLoadPerWeek,
          max_teacher_periods_per_day: maxTeacherPeriodsPerDay,
          enforce_consecutive_labs: enforceConsecutiveLabs,
          avoid_fixed_period_patterns: avoidFixedPeriodPatterns,
          preferred_morning_subject_ids: preferredMorningSubjectIds,
          ai_strategy: aiStrategy,
        },
      });
      push('Settings updated and saved globally.', 'success');
    } catch {
      push('Failed to save settings to server.', 'error');
    }
  };

  const handleResetToDefaults = () => {
    if (!window.confirm('Are you sure you want to reset all timetable settings (working days, periods, and time format) to their default values?')) return;
    
    setDraftDays([...DEFAULT_DAYS]);
    setDraftPeriods([...DEFAULT_PERIODS]);
    setTimeFormat('24h');
    setTimeZone(DEFAULT_TIMEZONE);
    setRegionLocale(DEFAULT_LOCALE);
    
    push('Settings reset to defaults in this modal. Click Save to apply.', 'info');
  };

  const assignSubstitute = async () => {
    const teacher = teachers.find((t) => t.id === Number(selectedSubTeacherId));
    if (!teacher || !absence.isDetected) return;
    const substituteName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || teacher.full_name || teacher.name || '';
    const todaySlots = [...(activeSchedule[todayDay] || [])];
    absence.affectedPeriodIndexes.forEach((idx) => {
      const slot = todaySlots[idx];
      if (!slot || slot.isBreak) return;
      todaySlots[idx] = { ...slot, substituteFor: absence.absentTeacher, teacher: substituteName };
    });
    upsertActiveSchedule({ ...activeSchedule, [todayDay]: todaySlots });
    setAbsence({ loading: false, isDetected: false, absentTeacher: '', affectedPeriodIndexes: [] });
    setShowSubstituteModal(false);
    try {
      await instance.post('/timetables/assign-substitute/', { class_name: activeClass, day: todayDay, teacher: substituteName, periods: absence.affectedPeriodIndexes });
    } catch {}
  };

  const handleExportPDF = () => {
    if (!activeClass) return push('Select a class first', 'warning');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const url = `${baseUrl}/timetables/export-pdf/?class_name=${encodeURIComponent(activeClass)}`;
    window.open(url, '_blank');
  };

  const availableSubstituteTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const teacherName = `${teacher.first_name} ${teacher.last_name}`;
      if (teacherName === absence.absentTeacher) return false;
      return absence.affectedPeriodIndexes.every((idx) => {
        const slot = activeSchedule?.[todayDay]?.[idx];
        return !slot || slot.teacher !== teacherName;
      });
    });
  }, [absence, activeSchedule, todayDay, teachers]);

  const teacherTodaySlots = useMemo(() => {
    const todaySlots = activeSchedule?.[todayDay] || [];
    return periods
      .map((period, idx) => ({ period, idx, slot: todaySlots[idx] }))
      .filter(({ period, slot }) => !period.isBreak && slot && slot.teacher === selectedTeacher.name);
  }, [activeSchedule, todayDay, periods, selectedTeacher]);

  const aiSuggestions = useMemo(() => {
    const suggestions = [];

    const conflictEntries = flattenedConflicts;
    if (conflictEntries.length > 0) {
      const first = conflictEntries[0];
      suggestions.push({
        type: 'error',
        title: `Resolve ${conflictEntries.length} conflict${conflictEntries.length === 1 ? '' : 's'}`,
        detail: `${first.day} P${first.idx + 1}: ${first.msg}`,
        jump: { day: first.day, idx: first.idx },
      });
    }

    const emptySlots = [];
    Object.entries(activeSchedule || {}).forEach(([day, daySlots]) => {
      (daySlots || []).forEach((slot, idx) => {
        if (periods[idx]?.isBreak) return;
        if (!slot) emptySlots.push({ day, idx });
      });
    });
    if (emptySlots.length > 0) {
      const first = emptySlots[0];
      suggestions.push({
        type: 'warning',
        title: `${emptySlots.length} empty slot${emptySlots.length === 1 ? '' : 's'} remaining`,
        detail: `Start filling from ${first.day} P${first.idx + 1}.`,
        jump: { day: first.day, idx: first.idx },
      });
    }

    const underfilled = subjectCompletion.filter((sc) => sc.target > 0 && sc.current < sc.target);
    if (underfilled.length > 0) {
      const top = underfilled.slice(0, 3).map((s) => `${s.name} (${s.current}/${s.target})`).join(', ');
      suggestions.push({
        type: 'info',
        title: 'Subjects below weekly quota',
        detail: top + (underfilled.length > 3 ? ` (+${underfilled.length - 3} more)` : ''),
      });
    }

    const subjectDays = {};
    Object.entries(activeSchedule || {}).forEach(([day, daySlots]) => {
      (daySlots || []).forEach((slot, idx) => {
        if (!slot || slot.isBreak || periods[idx]?.isBreak) return;
        if (!slot.subject) return;
        if (!subjectDays[slot.subject]) subjectDays[slot.subject] = new Set();
        subjectDays[slot.subject].add(day);
      });
    });
    const spreadWarnings = Object.entries(subjectDays)
      .map(([subject, daySet]) => {
        const row = subjectCompletion.find((s) => s.name === subject);
        const total = row?.target || row?.current || 0;
        const daysUsed = daySet.size;
        const idealDays = Math.min(days.length || 1, Math.max(2, Math.ceil(total / 2)));
        if (total >= 4 && daysUsed > 0 && daysUsed < idealDays) {
          return { subject, daysUsed, idealDays };
        }
        return null;
      })
      .filter(Boolean);
    if (spreadWarnings.length > 0) {
      const w = spreadWarnings[0];
      suggestions.push({
        type: 'warning',
        title: 'Improve subject spread',
        detail: `${w.subject} is concentrated in ${w.daysUsed} day(s). Aim for ~${w.idealDays} days.`,
      });
    }

    const overloaded = Object.entries(globalWorkload)
      .filter(([, count]) => count >= 30)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (overloaded.length > 0) {
      suggestions.push({
        type: 'warning',
        title: 'Teacher weekly load high',
        detail: overloaded.map(([name, count]) => `${name} (${count})`).join(', '),
      });
    }

    if (unmappedSubjects.length > 0) {
      suggestions.push({
        type: 'warning',
        title: 'Map teachers to subjects',
        detail: unmappedSubjects.slice(0, 4).map((s) => s.name).join(', ') + (unmappedSubjects.length > 4 ? ` (+${unmappedSubjects.length - 4} more)` : ''),
      });
    }

    const consecutive = Object.entries(globalSchedules).flatMap(([teacherName, byDay]) => {
      return Object.entries(byDay || {}).map(([day, byIdx]) => {
        const indices = Object.keys(byIdx || {})
          .map(Number)
          .filter((idx) => Number.isFinite(idx) && !periods[idx]?.isBreak)
          .sort((a, b) => a - b);
        let best = 0;
        let current = 0;
        let prev = null;
        indices.forEach((idx) => {
          if (prev === null || idx !== prev + 1) current = 1;
          else current += 1;
          if (current > best) best = current;
          prev = idx;
        });
        return { teacherName, day, best };
      });
    })
      .filter((row) => row.best >= 5)
      .sort((a, b) => b.best - a.best)
      .slice(0, 2);
    if (consecutive.length > 0) {
      const top = consecutive[0];
      suggestions.push({
        type: 'warning',
        title: 'Reduce consecutive periods',
        detail: `${top.teacherName} has ${top.best} consecutive periods on ${top.day}.`,
      });
    }

    return suggestions.slice(0, 6);
  }, [activeSchedule, periods, subjectCompletion, flattenedConflicts, globalWorkload, days.length, unmappedSubjects, globalSchedules]);

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

    const conflict = conflictMap[day]?.[periodIdx];
    const aiExplain = Array.isArray(data?.aiMeta?.reasons) && data.aiMeta.reasons.length > 0
      ? `AI: ${data.aiMeta.reasons.join(' • ')}`
      : '';
    const hoverTitle = [conflict, aiExplain].filter(Boolean).join('\n');

    if (data) {
      return (
        <td key={`${day}-${periodIdx}`} className={styles.slotCell} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropSlot(day, periodIdx)}>
          <div 
            className={`${styles.periodCard} ${conflict ? styles.hasClash : ''}`} 
            draggable 
            onDragStart={() => onDragStartSlot(day, periodIdx)} 
            onClick={() => openSlotModal(day, periodIdx)} 
            title={hoverTitle || ''}
            style={data.isEvent ? { borderLeft: '4px solid #f97316', background: '#fff7ed' } : {}}
          >
            <div>
              <div className={styles.subjectName}>
                {data.subject || 'Untitled'}
                {conflict && (
                  <AlertTriangle 
                    size={13} 
                    className={styles.clashIcon} 
                    title={conflict} 
                    style={{ cursor: 'help' }}
                  />
                )}
              </div>
              <div className={styles.teacherName}>{data.teacher || 'No Teacher'}</div>
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
          <h2>
            {activeSection ? `${activeSection.class_name} — Section ${activeSection.name} Timetable` : 'Timetable Builder'}
          </h2>
          <p>
            {activeSection 
              ? `Class Teacher: ${activeSection.class_teacher_name || 'Not assigned'} • Configure and optimize class schedule` 
              : 'Select a section from Dashboard to build a timetable'}
          </p>
        </div>
        <div className={styles.actionRow}>
          <button className={`${styles.btn} ${styles.outline}`} onClick={handleExportPDF} title="Download Timetable as PDF"><Download size={18} /> Export PDF</button>
          <button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowSettingsModal(true)}><Settings size={18} /> Settings</button>
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
          <select className={styles.classSelect} value={activeClass} onChange={(e) => setActiveClass(e.target.value)}>
            {sections.map((cls, idx) => <option key={`${cls}-${idx}`} value={cls}>{cls}</option>)}
          </select>
          <div className={styles.radioGroup}>
            <div className={`${styles.radioBtn} ${viewMode === 'admin' ? styles.active : ''}`} onClick={() => setViewMode('admin')}>Master</div>
            <div className={`${styles.radioBtn} ${viewMode === 'teacher' ? styles.active : ''}`} onClick={() => setViewMode('teacher')}>Today</div>
          </div>
          {viewMode === 'teacher' && (
            <select className={styles.classSelect} value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
              <option value="">Select Teacher</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.last_name}</option>)}
            </select>
          )}
        </div>
        <div className={styles.toolGroup}>
          <button className={`${styles.btn} ${styles.warning}`} onClick={generateTimetable} disabled={saving}>
            <Zap size={14} className={saving ? styles.spin : ''} /> {saving ? 'Generating...' : 'AI Generate'}
          </button>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title={isSidebarCollapsed ? 'Show Analysis' : 'Hide Analysis'}>
            {isSidebarCollapsed ? <Activity size={18} /> : <PanelRightClose size={18} />}
          </button>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={() => { if(confirm('Discard unsaved changes and reload original timetable?')) loadTimetable(); }} title="Discard draft and reset to last saved state"><RefreshCw size={14} /> Reload</button>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={() => saveDraft()} disabled={saving || loading}>{saving ? <><RefreshCw size={14} className={styles.spin} /> Saving...</> : <>Save Draft</>}</button>
          <button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowCloneModal(true)} title="Copy structure from another class"><Copy size={16} /> Copy</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={publishTimetable} disabled={saving || loading}><Share2 size={14} /> Publish</button>
        </div>
      </div>

      <div className={styles.metaRow}>
        <span><Clock size={14} /> {loading ? 'Loading timetable...' : dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <span>{lastSavedAt ? `Last saved: ${formatTimeStamp(lastSavedAt)}` : 'No draft saved yet'}</span>
      </div>

      <div className={styles.mainLayout}>
        {viewMode === 'admin' && (
          <div className={styles.gridWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ width: '80px' }}>Day</th>
                  {periods.map((period, idx) => <th key={idx} className={styles.th} style={period.isBreak ? { width: '64px' } : { width: '125px' }}>{period.label}<span className={styles.timeLabel}>{displayRange(period.time)}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {days.filter(d => WEEK_DAY_OPTIONS.includes(d)).map((day) => <tr key={day}><td className={styles.dayCell}>{day}</td>{periods.map((period, idx) => renderSlot(day, idx, period))}</tr>)}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'admin' && (
          <div className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.sidebarSection}>
              <h4 className={styles.sectionHeader} style={{ cursor: 'default' }}>
                <span>AI Suggestions</span>
                <Zap size={16} style={{ color: 'var(--color-primary)' }} />
              </h4>
              <div className={styles.suggestionsList}>
                {aiSuggestions.length === 0 ? (
                  <div className={styles.emptyText}>No suggestions right now.</div>
                ) : (
                  aiSuggestions.map((s, idx) => (
                    <button
                      key={`${s.title}-${idx}`}
                      type="button"
                      className={`${styles.suggestionItem} ${s.jump ? styles.suggestionClickable : ''} ${s.type === 'error' ? styles.suggestionError : s.type === 'warning' ? styles.suggestionWarn : styles.suggestionInfo}`}
                      onClick={() => {
                        if (s.jump) openSlotModal(s.jump.day, s.jump.idx);
                      }}
                      title={s.jump ? 'Click to open slot' : undefined}
                    >
                      <div className={styles.suggestionTitle}>{s.title}</div>
                      <div className={styles.suggestionDetail}>{s.detail}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <h4 onClick={() => setExpandedSections(prev => ({ ...prev, subjects: !prev.subjects }))} className={styles.sectionHeader}>
                <span>Subject Load Analysis</span>
                {expandedSections.subjects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </h4>
              {expandedSections.subjects && (
                <div className={styles.statsList}>
                  {subjectCompletion.map(sc => (
                    <div key={sc.id} className={styles.statItem}>
                      <div className={styles.statHead}>
                        <span>{sc.name}</span>
                        <span>{sc.current} / {sc.target}</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ 
                            width: `${sc.target > 0 ? Math.min(100, (sc.current / sc.target) * 100) : 0}%`,
                            background: sc.current > sc.target ? 'var(--color-danger)' : sc.current === sc.target ? 'var(--color-success)' : 'var(--color-primary)'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {unmappedSubjects.length > 0 && (
                    <div className={styles.conflictItem} style={{ marginTop: 8 }}>
                      <b>Missing Teacher Mapping:</b> {unmappedSubjects.map((s) => s.name).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.sidebarSection}>
              <h4 onClick={() => setExpandedSections(prev => ({ ...prev, teachers: !prev.teachers }))} className={styles.sectionHeader}>
                <span>Teacher Loading</span>
                <div className={styles.toggleRow} onClick={(e) => e.stopPropagation()}>
                  <label className={styles.toggleLabel}>School-wide</label>
                  <input type="checkbox" checked={isSchoolWide} onChange={(e) => setIsSchoolWide(e.target.checked)} />
                </div>
                {expandedSections.teachers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </h4>
              {expandedSections.teachers && (
                <div className={styles.statsList}>
                  {Object.entries(isSchoolWide ? globalWorkload : workload).map(([name, count]) => (
                    <div key={name} className={styles.teacherStat}>
                      <span>{name}</span>
                      <b style={{ color: count > 30 ? 'var(--color-danger)' : count > 20 ? 'var(--color-warning)' : 'var(--color-primary)' }}>
                        {count} periods
                      </b>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.sidebarSection}>
              <h4 className={styles.sectionHeader} style={{ cursor: 'default' }}>
                <span>Conflict Warnings</span>
                <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
              </h4>
              <div className={styles.conflictSummary}>
                {flattenedConflicts.length === 0 ? (
                  <div className={styles.emptyText}>No conflicts detected in current view.</div>
                ) : (
                  flattenedConflicts.map((c) => (
                    <div key={`${c.day}-${c.idx}`} className={styles.conflictItem}>
                      <b>{c.day} P{c.idx + 1}</b>: {c.msg}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'teacher' && (
        <div className={styles.teacherView}>
          <div className={styles.teacherViewHeader}>
            <h3>{selectedTeacher.name} - {todayDay}</h3>
            <p>Showing only this teacher&apos;s periods for today in {activeClass}.</p>
          </div>
          {teacherTodaySlots.length === 0 ? <div className={styles.teacherEmpty}>No periods assigned for today.</div> : (
            <div className={styles.teacherCards}>
              {teacherTodaySlots.map(({ period, idx, slot }) => (
                <div key={idx} className={styles.teacherCard}>
                  <div><b>{period.label}</b><span className={styles.timeLabel}>{displayRange(period.time)}</span></div>
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
            <div className={styles.modalHeader}><div className={styles.modalIcon}><Plus size={22} /></div><div><h3>Assign Period</h3><p style={{ opacity: 0.8, fontSize: '0.85rem' }}>{slotModal.day} - {periods[slotModal.periodIdx]?.label} ({displayRange(periods[slotModal.periodIdx]?.time)})</p></div></div>
            <div className={styles.modalBody}>
              {(pendingSlotWarnings.length > 0 || (slotForm.subject && validateSlot(slotForm, slotModal.day, slotModal.periodIdx).length > 0)) && (
                <div className={styles.clashAlert}>
                  <AlertTriangle size={18} />
                  <div className={styles.warningList}>
                    {(pendingSlotWarnings.length > 0 ? pendingSlotWarnings : validateSlot(slotForm, slotModal.day, slotModal.periodIdx)).map((w, i) => (
                      <div key={i} className={styles.warningItem}>
                        <b>{w.type === 'error' ? 'Conflict:' : 'Note:'}</b> {w.msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(activeSchedule?.[slotModal.day]?.[slotModal.periodIdx]?.aiMeta?.reasons) &&
                activeSchedule[slotModal.day][slotModal.periodIdx].aiMeta.reasons.length > 0 && (
                  <div className={styles.aiExplainBox}>
                    <div className={styles.aiExplainTitle}>AI explanation (last generate)</div>
                    <div className={styles.aiExplainList}>
                      {activeSchedule[slotModal.day][slotModal.periodIdx].aiMeta.reasons.slice(0, 6).map((r, i) => (
                        <div key={i} className={styles.aiExplainItem}>• {r}</div>
                      ))}
                    </div>
                  </div>
                )}
              
              {slotForm.isEvent ? (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Event Title (e.g. CCA, Assembly)</label>
                  <input 
                    type="text"
                    className={styles.input}
                    value={slotForm.customTitle}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, customTitle: e.target.value }))}
                    placeholder="Type event name..."
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Subject</label>
                  <select className={styles.input} value={slotForm.subject} onChange={(e) => setSlotForm((prev) => ({ ...prev, subject: e.target.value }))}>
                    <option value="">Select subject</option>
                    {subjectCompletion.map((sc) => (
                      <option key={sc.id} value={sc.name}>
                        {sc.name} ({sc.current}/{sc.target})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Teacher</label>
                <select className={styles.input} value={slotForm.teacher} onChange={(e) => setSlotForm((prev) => ({ ...prev, teacher: e.target.value }))}>
                  <option value="">Select teacher</option>
                  {teacherOptionsForSlot.map((teacher) => (
                    <option key={teacher.id} value={`${teacher.first_name} ${teacher.last_name}`}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
                </select>
                {slotForm.subject && !subjectAllocationsLoading && teacherOptionsForSlot.length === 0 && (
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#b45309' }}>
                    No teachers are assigned to this subject for this class section.
                  </div>
                )}
                
                {slotForm.teacher && (
                  <div className={styles.availabilityTimeline}>
                    <div className={styles.timelineLabel}>
                      {`${slotForm.teacher.split(' ')[0]}'s`} {slotModal.day} Schedule:
                    </div>
                    <div className={styles.timelineTrack}>
                      {periods.map((p, idx) => {
                        const busy = globalSchedules[slotForm.teacher]?.[slotModal.day]?.[idx];
                        return (
                          <div key={idx} className={`${styles.timelineSlot} ${idx === slotModal.periodIdx ? styles.current : ''} ${busy ? styles.busy : styles.free}`} title={p.label}>
                            {idx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className={styles.formGroup}><label className={styles.formLabel}>Room</label><input className={styles.input} value={slotForm.room} onChange={(e) => setSlotForm((prev) => ({ ...prev, room: e.target.value }))} placeholder="e.g. Room 204" /></div>
              <label className={styles.checkRow}><input type="checkbox" checked={slotForm.isEvent} onChange={(e) => setSlotForm((prev) => ({ ...prev, isEvent: e.target.checked }))} />Mark as special event period</label>
              <div className={styles.modalActions}>
                <button className={`${styles.btn} ${styles.outline}`} onClick={() => { setSlotModal({ open: false, day: null, periodIdx: null }); setPendingSlotWarnings([]); }}>Cancel</button>
                <button className={`${styles.btn} ${styles.warning}`} onClick={clearSlot}>Clear</button>
                {pendingSlotWarnings.length > 0 ? (
                  <button className={`${styles.btn} ${styles.warning}`} onClick={() => saveSlot(true)}>Save Anyway</button>
                ) : (
                  <button className={`${styles.btn} ${styles.primary}`} onClick={() => saveSlot(false)}><Check size={14} /> Save</button>
                )}
              </div>
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
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Time Settings</label>
                <div className={styles.timeSettingsRow}>
                  <select
                    className={styles.input}
                    value={timeZone}
                    onChange={(e) => {
                      const tz = e.target.value;
                      setTimeZone(tz);
                      const region = TIMEZONE_OPTIONS.find((x) => x.value === tz);
                      if (region?.locale) setRegionLocale(region.locale);
                    }}
                  >
                    {TIMEZONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select className={styles.input} value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)}>
                    <option value="24h">24-hour</option>
                    <option value="12h">12-hour</option>
                  </select>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className={styles.checkRow} style={{ fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={classTeacherFirstPeriod} 
                      onChange={(e) => setClassTeacherFirstPeriod(e.target.checked)} 
                    />
                    Assign Class Teacher to Period 1 (Attendance Rule)
                  </label>
                  <label className={styles.checkRow} style={{ fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={allowSameSubjectTwiceDay}
                      onChange={(e) => setAllowSameSubjectTwiceDay(e.target.checked)}
                    />
                    Allow same subject twice a day
                  </label>
                  <p style={{ margin: '4px 0 0 24px', fontSize: '0.8rem', opacity: 0.7 }}>
                    If enabled, Period 1 will prioritize the class teacher during generation and warnings.
                  </p>
                </div>
                <div className={styles.infoBox}>Display region: {timeZone} | Format: {timeFormat.toUpperCase()}</div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>AI Rules</label>
                <div className={styles.rulesGrid}>
                  <div className={styles.rulesRow}>
                    <label className={styles.smallLabel}>Strategy</label>
                    <select
                      className={styles.input}
                      value={aiStrategy}
                      onChange={(e) => {
                        const next = e.target.value;
                        setAiStrategy(next);
                        if (next === 'balanced') {
                          setMaxConsecutivePeriodsTeacher(4);
                          setMinTeacherFreePeriodsPerDay(1);
                          setMaxTeacherLoadPerWeek(30);
                          setMaxTeacherPeriodsPerDay(6);
                        } else if (next === 'teacher_friendly') {
                          setMaxConsecutivePeriodsTeacher(3);
                          setMinTeacherFreePeriodsPerDay(2);
                          setMaxTeacherLoadPerWeek(28);
                          setMaxTeacherPeriodsPerDay(5);
                        } else if (next === 'academic_focus') {
                          setMaxConsecutivePeriodsTeacher(4);
                          setMinTeacherFreePeriodsPerDay(1);
                          setMaxTeacherLoadPerWeek(32);
                          setMaxTeacherPeriodsPerDay(6);
                        } else if (next === 'fast') {
                          setMaxConsecutivePeriodsTeacher(5);
                          setMinTeacherFreePeriodsPerDay(0);
                          setMaxTeacherLoadPerWeek(40);
                          setMaxTeacherPeriodsPerDay(7);
                        }
                      }}
                    >
                      <option value="balanced">Balanced</option>
                      <option value="teacher_friendly">Teacher Friendly</option>
                      <option value="academic_focus">Academic Focus</option>
                      <option value="fast">Fast Generate</option>
                    </select>
                  </div>

                  <div className={styles.rulesRow}>
                    <label className={styles.smallLabel}>Max consecutive (teacher)</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={maxConsecutivePeriodsTeacher}
                      onChange={(e) => setMaxConsecutivePeriodsTeacher(Math.max(0, Number(e.target.value)))}
                    />
                  </div>

                  <div className={styles.rulesRow}>
                    <label className={styles.smallLabel}>Min free periods/day (teacher)</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={minTeacherFreePeriodsPerDay}
                      onChange={(e) => setMinTeacherFreePeriodsPerDay(Math.max(0, Number(e.target.value)))}
                    />
                  </div>

                  <div className={styles.rulesRow}>
                    <label className={styles.smallLabel}>Max periods/day (teacher)</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={maxTeacherPeriodsPerDay}
                      onChange={(e) => setMaxTeacherPeriodsPerDay(Math.max(0, Number(e.target.value)))}
                    />
                  </div>

                  <div className={styles.rulesRow}>
                    <label className={styles.smallLabel}>Max periods/week (teacher)</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={maxTeacherLoadPerWeek}
                      onChange={(e) => setMaxTeacherLoadPerWeek(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label className={styles.checkRow} style={{ fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={enforceConsecutiveLabs}
                      onChange={(e) => setEnforceConsecutiveLabs(e.target.checked)}
                    />
                    Enforce consecutive lab blocks (double periods)
                  </label>
                  <label className={styles.checkRow} style={{ fontWeight: 600, marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={avoidFixedPeriodPatterns}
                      onChange={(e) => setAvoidFixedPeriodPatterns(e.target.checked)}
                    />
                    Avoid fixed patterns (don&apos;t keep Period 2 same every day)
                  </label>
                </div>

                <button
                  type="button"
                  className={`${styles.btn} ${styles.outline}`}
                  onClick={() => setShowAdvancedRules((prev) => !prev)}
                  style={{ marginTop: 10 }}
                >
                  {showAdvancedRules ? 'Hide Advanced' : 'Show Advanced'}
                </button>

                {showAdvancedRules && (
                  <div className={styles.advancedRules}>
                    <div className={styles.smallHint}>
                      Preferred morning subjects (bonus in Period 1–3 during AI generate):
                    </div>
                    <div className={styles.subjectPickList}>
                      {subjects.length === 0 ? (
                        <div className={styles.emptyText}>Subjects not loaded yet.</div>
                      ) : (
                        subjects.map((s) => (
                          <label key={s.id} className={styles.checkRow}>
                            <input
                              type="checkbox"
                              checked={preferredMorningSubjectIds.includes(Number(s.id))}
                              onChange={(e) => {
                                const sid = Number(s.id);
                                if (!Number.isFinite(sid)) return;
                                setPreferredMorningSubjectIds((prev) =>
                                  e.target.checked ? Array.from(new Set([...prev, sid])) : prev.filter((x) => x !== sid)
                                );
                              }}
                            />
                            {s.name}
                          </label>
                        ))
                      )}
                    </div>
                    <div className={styles.smallHint} style={{ marginTop: 8 }}>
                      Tip: teacher unavailability rules are supported by the engine, UI configuration comes next.
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Working days</label>
                <div className={styles.daySelector}>
                  {WEEK_DAY_OPTIONS.map((day) => (
                    <label key={day} className={styles.checkRow}>
                      <input 
                        type="checkbox" 
                        checked={draftDays.includes(day)} 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDraftDays((prev) => [...prev, day]);
                          } else {
                            // Prevent empty working days if possible
                            if (draftDays.length > 1) {
                              setDraftDays((prev) => prev.filter((d) => d !== day));
                            } else {
                              push('At least one working day is required.', 'warning');
                            }
                          }
                        }} 
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Periods & breaks</label>
                <div className={styles.periodConfigList}>
                  {draftPeriods.map((period, idx) => (
                    <div key={idx} className={styles.periodConfigRow}>
                      <input className={styles.input} value={period.label} onChange={(e) => setDraftPeriods((prev) => prev.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))} placeholder="Label" />
                      <input className={styles.input} value={period.time} onChange={(e) => setDraftPeriods((prev) => prev.map((x, i) => i === idx ? { ...x, time: e.target.value } : x))} placeholder="Time range (HH:MM - HH:MM)" />
                      <div className={styles.periodTimePreview}>{displayRange(period.time)}</div>
                      <label className={styles.checkRow}><input type="checkbox" checked={!!period.isBreak} onChange={(e) => setDraftPeriods((prev) => prev.map((x, i) => i === idx ? { ...x, isBreak: e.target.checked } : x))} />Break</label>
                      <button className={`${styles.btn} ${styles.outline}`} onClick={() => setDraftPeriods((prev) => prev.filter((_, i) => i !== idx))}><X size={14} /></button>
                    </div>
                  ))}
                </div>
                <button className={`${styles.btn} ${styles.outline}`} onClick={() => setDraftPeriods((prev) => [...prev, { label: `Period ${prev.length + 1}`, time: '00:00 - 00:00', isBreak: false }])}><Plus size={14} /> Add Period</button>
              </div>
              <div className={styles.modalActions}>
                <button 
                  className={`${styles.btn} ${styles.outline}`} 
                  onClick={handleResetToDefaults}
                  style={{ marginRight: 'auto', color: '#ef4444', borderColor: '#fecaca' }}
                >
                  <RefreshCw size={14} /> Reset to Defaults
                </button>
                <button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowSettingsModal(false)}>Cancel</button>
                <button className={`${styles.btn} ${styles.primary}`} onClick={applySettings}><Check size={14} /> Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCloneModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCloneModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><div className={styles.modalIcon}><Copy size={24} /></div><div><h3>Copy Class Structure</h3><p style={{ opacity: 0.8, fontSize: '0.85rem' }}>Clone subjects and structure from another section.</p></div></div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Source Section</label>
                <select className={styles.input} value={cloneSourceClass} onChange={(e) => setCloneSourceClass(e.target.value)}>
                  <option value="">Select a section</option>
                  {sections.filter(s => s !== activeClass).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className={styles.infoBox}>⚠️ This will overwrite the current structure for <b>{activeClass}</b>.</div>
              <div className={styles.modalActions}><button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowCloneModal(false)}>Cancel</button><button className={`${styles.btn} ${styles.primary}`} onClick={cloneSchedule} disabled={!cloneSourceClass}>Copy Structure</button></div>
            </div>
          </div>
        </div>
      )}

      {showPublishModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPublishModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><div className={styles.modalIcon}><Share2 size={24} /></div><div><h3>Pre-Publish Summary</h3><p style={{ opacity: 0.8, fontSize: '0.85rem' }}>Review all warnings before going live.</p></div></div>
            <div className={styles.modalBody}>
              <div className={styles.publishSummary}>
                {/* 1. Hard Conflicts */}
                <div className={styles.summarySection}>
                  <div className={styles.summaryRow}>
                    {Object.values(conflictMap).some(day => day && Object.keys(day).length > 0) ? (
                      <XCircle size={18} color="var(--color-danger)" />
                    ) : (
                      <CheckCircle2 size={18} color="var(--color-success)" />
                    )}
                    <span>Hard Conflicts</span>
                  </div>
                  {Object.entries(conflictMap).map(([day, dayConflicts]) => 
                    Object.entries(dayConflicts).map(([idx, msg]) => (
                      <div key={`${day}-${idx}`} className={styles.summarySubItem}>✗ {day} P{Number(idx)+1}: {msg}</div>
                    ))
                  )}
                </div>

                {/* 2. Quotas */}
                <div className={styles.summarySection}>
                  <div className={styles.summaryRow}>
                    {subjectCompletion.some(sc => sc.current < sc.target) ? (
                      <AlertCircle size={18} color="var(--color-warning)" />
                    ) : (
                      <CheckCircle2 size={18} color="var(--color-success)" />
                    )}
                    <span>Subject Quotas</span>
                  </div>
                  {subjectCompletion.filter(sc => sc.current < sc.target).map(sc => (
                    <div key={sc.id} className={styles.summarySubItem}>⚠ {sc.name}: {sc.current}/{sc.target} periods filled</div>
                  ))}
                </div>

                {/* 3. Empty Slots */}
                <div className={styles.summarySection}>
                  <div className={styles.summaryRow}>
                    {Object.values(activeSchedule).some(day => day.some((s, i) => !s && !periods[i]?.isBreak)) ? (
                      <AlertCircle size={18} color="var(--color-warning)" />
                    ) : (
                      <CheckCircle2 size={18} color="var(--color-success)" />
                    )}
                    <span>Completion Status</span>
                  </div>
                  {Object.entries(activeSchedule).map(([day, daySlots]) => {
                    const emptyCount = daySlots.filter((s, i) => !s && !periods[i]?.isBreak).length;
                    return emptyCount > 0 ? <div key={day} className={styles.summarySubItem}>⚠ {day}: {emptyCount} empty slots</div> : null;
                  })}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button className={`${styles.btn} ${styles.outline}`} onClick={() => setShowPublishModal(false)}>Cancel</button>
                <button 
                  className={`${styles.btn} ${styles.primary}`} 
                  onClick={finalizePublish}
                  disabled={Object.values(conflictMap).some(day => day && Object.keys(day).length > 0)}
                >
                  Confirm & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default TimeTable;
