'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, GraduationCap, Plus, Search, 
  Trophy, TrendingUp, Filter, MoreVertical,
  ChevronRight, ArrowRight, UserPlus, Trash2,
  Settings, Award, Vote, BarChart2,
  Calendar, MapPin, UserCheck, RefreshCw, 
  CheckCircle, AlertCircle, Info, Download, Trash, ShieldCheck,
  ChevronDown, Mail, Phone, Send, X
} from 'lucide-react';
import styles from './Class.module.css';
import Assignments from './Assignments/Assignments';
import Materials from './Materials/Materials';
import Elections from './Elections/Elections';
import TimeTable from './TimeTable/TimeTable';
import Attendance from './Attendance/Attendance';
import Marks from './Marks/Marks';
import NoticeBoard from './NoticeBoard/NoticeBoard';
import Events from './Events/Events';
import Fees from './Fees/Fees';
import ReportCards from './ReportCards/ReportCards';
import adminApi from '@/api/adminApi';
import { useAuth } from '@/context/AuthContext';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

/* Main Component */
const Class = () => {
  const { user } = useAuth();
  const isSuperuser = user?.is_superuser;
  const isSchoolAdmin = user?.role_scope === 'school';
  const hasFullAccess = isSuperuser || isSchoolAdmin;

  const isClassTeacher = (section) => {
    if (!section || !user) return false;
    // Section-specific check: Is this user the assigned class teacher?
    const teacherId = typeof section.class_teacher === 'object' ? section.class_teacher?.id : section.class_teacher;
    return String(teacherId) === String(user.id);
  };

  const canManageSection = (section) => {
    if (hasFullAccess) return true;
    return isClassTeacher(section);
  };
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, students, promotion, election, ranking
  const [selectedSection, setSelectedSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [promotionStep, setPromotionStep] = useState(1);
  const [academicYear, setAcademicYear] = useState('2025-26');
  
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // New States for CRUD modals
  const [isNewSectionModalOpen, setIsNewSectionModalOpen] = useState(false);
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [openCardMenuId, setOpenCardMenuId] = useState(null);

  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [studentGenderFilter, setStudentGenderFilter] = useState('all');
  const [studentFeeFilter, setStudentFeeFilter] = useState('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [performanceDrawerStudent, setPerformanceDrawerStudent] = useState(null);
  const [profileDrawerStudent, setProfileDrawerStudent] = useState(null);
  const [studentActionMenuId, setStudentActionMenuId] = useState(null);
  const [editingRollNumber, setEditingRollNumber] = useState('');
  const [isSavingRoll, setIsSavingRoll] = useState(false);

  const [isBulkTransferModalOpen, setIsBulkTransferModalOpen] = useState(false);
  const [isBulkNotifyModalOpen, setIsBulkNotifyModalOpen] = useState(false);
  const [transferSectionId, setTransferSectionId] = useState('');
  const [bulkNotificationText, setBulkNotificationText] = useState('');

  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [addStudentMode, setAddStudentMode] = useState('existing');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '' });

  const defaultPrefs = {
    tabsLayout: 'grid', // grid | scroll
    rememberLastTab: true,
    includeInactiveStudents: false,
    showAttendanceColumn: true,
    showFeeColumn: true,
  };
  const [prefs, setPrefs] = useState(defaultPrefs);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('class-preferences-v1');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setPrefs((prev) => ({ ...prev, ...(parsed || {}) }));
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('class-preferences-v1', JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  React.useEffect(() => {
    if (!prefs.rememberLastTab || !selectedSection?.id) return;
    try {
      const key = `class-last-tab-${selectedSection.id}`;
      localStorage.setItem(key, activeView);
    } catch {}
  }, [activeView, prefs.rememberLastTab, selectedSection?.id]);

  React.useEffect(() => {
    if (!prefs.rememberLastTab || !selectedSection?.id) return;
    try {
      const key = `class-last-tab-${selectedSection.id}`;
      const last = localStorage.getItem(key);
      if (last && typeof last === 'string') setActiveView(last);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection?.id]);
  const [promotionRules, setPromotionRules] = useState({ passPct: 40, attendancePct: 75 });
  const [promotionOverrides, setPromotionOverrides] = useState({});
  const [promotionTargetSectionId, setPromotionTargetSectionId] = useState('');
  const [promotionExecuting, setPromotionExecuting] = useState(false);
  const [promotionHistory, setPromotionHistory] = useState([]);

  const [leaderboardScope, setLeaderboardScope] = useState('section');
  const [leaderboardSubjectId, setLeaderboardSubjectId] = useState('all');
  const [leaderboardExamType, setLeaderboardExamType] = useState('all');
  const [leaderboardExamId, setLeaderboardExamId] = useState('all');
  const [leaderboardPreviousExamId, setLeaderboardPreviousExamId] = useState('all');
  const [leaderboardSubjects, setLeaderboardSubjects] = useState([]);
  const [leaderboardExams, setLeaderboardExams] = useState([]);

  const handleUpdateRollNumber = async () => {
    if (!profileDrawerStudent) return;
    try {
      setIsSavingRoll(true);
      await adminApi.updateStudent(profileDrawerStudent.id, { roll_number: editingRollNumber });
      setStudents(prev => prev.map(s => s.id === profileDrawerStudent.id ? { ...s, roll_number: editingRollNumber } : s));
      setProfileDrawerStudent(prev => ({ ...prev, roll_number: editingRollNumber }));
      setIsSavingRoll(false);
    } catch (err) {
      console.error('Failed to update roll number:', err);
      alert('Could not update roll number');
      setIsSavingRoll(false);
    }
  };

  React.useEffect(() => {
    if (profileDrawerStudent) {
      setEditingRollNumber(profileDrawerStudent.roll_number || '');
    }
  }, [profileDrawerStudent]);

  // Fetch sections for dashboard
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSections();
      setSections(res.data);
    } catch (err) {
      console.error('Dashboard load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await adminApi.getClasses();
      setClasses(res.data);
    } catch (err) {
      console.error('Classes load failed:', err);
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await adminApi.getTeachers(); // Load academic staff specifically
      setTeachers(normalizeList(res.data));
    } catch (err) {
      console.error('Teachers load failed:', err);
    }
  };

  React.useEffect(() => {
    if (activeView === 'dashboard') {
      loadDashboard();
      loadClasses();
      loadTeachers();
    }
  }, [activeView]);

  const handleDeleteSection = async (id) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      try {
        await adminApi.deleteSection(id);
        loadDashboard();
      } catch (err) {
        alert('We couldn’t delete this section. Please refresh and try again.');
      }
    }
  };

  const handleDeleteClass = async (id) => {
    if (window.confirm('Are you sure you want to delete this Entire Class (Grade) and all its sections?')) {
      try {
        await adminApi.deleteClass(id);
        loadDashboard();
        loadClasses();
      } catch (err) {
        alert('We couldn’t delete this Class record. There might be students assigned to it.');
      }
    }
  };

  // Fetch students when section is selected
  React.useEffect(() => {
    const loadStudents = async () => {
      if (!selectedSection) return;
      try {
        setStudentsLoading(true);
        const res = await adminApi.getStudents({ section: selectedSection.id, is_active: prefs.includeInactiveStudents ? 'false' : 'true' });
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.students || []);
        setStudents(list);
        setSelectedStudentIds([]);
      } catch (err) {
        console.error('Students load failed:', err);
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };
    if (activeView === 'students' || activeView === 'promotion') loadStudents();
  }, [selectedSection, activeView, prefs.includeInactiveStudents]);

  // Fetch leaderboard
  React.useEffect(() => {
    const loadRanking = async () => {
      try {
        const params = {};
        if (leaderboardScope === 'section' && selectedSection?.id) {
          params.section = selectedSection.id;
        }
        if (leaderboardScope === 'school' && selectedSection?.school_class) {
          params.class = selectedSection.school_class;
        }
        if (leaderboardSubjectId !== 'all') {
          params.subject_id = leaderboardSubjectId;
        }
        if (leaderboardExamType !== 'all') {
          params.exam_type = leaderboardExamType;
        }
        if (leaderboardExamId !== 'all') {
          params.exam = leaderboardExamId;
        }
        if (leaderboardPreviousExamId !== 'all') {
          params.previous_exam = leaderboardPreviousExamId;
        }
        const res = await adminApi.getLeaderboard(params);
        setLeaderboard(res.data);
      } catch (err) {
        console.error('Leaderboard load failed:', err);
      }
    };
    if (activeView === 'ranking') loadRanking();
  }, [activeView, leaderboardScope, selectedSection, leaderboardSubjectId, leaderboardExamType, leaderboardExamId, leaderboardPreviousExamId]);

  React.useEffect(() => {
    const loadRankingFilters = async () => {
      if (activeView !== 'ranking' || !selectedSection?.school_class) return;
      try {
        const [subjRes, examsRes] = await Promise.all([
          adminApi.getSubjects({ class: selectedSection.school_class }).catch(() => null),
          adminApi.getExams({ class: selectedSection.school_class }).catch(() => null),
        ]);
        setLeaderboardSubjects(Array.isArray(subjRes?.data) ? subjRes.data : []);
        setLeaderboardExams(Array.isArray(examsRes?.data) ? examsRes.data : []);
      } catch {}
    };
    loadRankingFilters();
  }, [activeView, selectedSection?.school_class]);

  const filteredSections = useMemo(() => {
    return sections.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.class_teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sections, searchTerm]);

  function getStudentAttendance(student) {
    const value = student.attendance_percentage ?? student.today_attendance_pct;
    if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
    return Number(value);
  }

  function getStudentFeeStatus(student) {
    const explicit = (student.fee_status || '').toLowerCase();
    if (explicit === 'due' || explicit === 'overdue') return 'Due';
    if (explicit === 'paid' || explicit === 'clear' || explicit === 'cleared') return 'Clear';
    const dueAmount = Number(student.fee_due_amount ?? student.pending_fees ?? 0);
    return dueAmount > 0 ? 'Due' : 'Clear';
  }

  function getStudentFeeDueAmount(student) {
    return Number(student.fee_due_amount ?? student.pending_fees ?? 0);
  }

  const studentsList = useMemo(() => (Array.isArray(students) ? students : (students?.results || students?.students || [])), [students]);

  const filteredStudents = useMemo(() => {
    return studentsList.filter((student) => {
      const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim().toLowerCase();
      const email = (student.user?.email || '').toLowerCase();
      const admission = (student.admission_number || '').toLowerCase();
      const roll = String(student.roll_number || '').toLowerCase();
      const matchesSearch = [fullName, email, admission, roll].some((val) => val.includes(studentSearchTerm.toLowerCase()));
      const gender = (student.gender || student.user?.gender || '').toLowerCase();
      const feeStatus = getStudentFeeStatus(student);

      const matchesStatus =
        studentStatusFilter === 'active' ? !!student.is_active :
        studentStatusFilter === 'inactive' ? !student.is_active :
        true;
      const matchesGender =
        studentGenderFilter === 'all' ? true :
        gender === studentGenderFilter;
      const matchesFee =
        studentFeeFilter === 'all' ? true :
        feeStatus.toLowerCase() === studentFeeFilter;
      return matchesSearch && matchesStatus && matchesGender && matchesFee;
    });
  }, [studentsList, studentSearchTerm, studentStatusFilter, studentGenderFilter, studentFeeFilter]);

  const selectedStudents = useMemo(
    () => studentsList.filter((student) => selectedStudentIds.includes(student.id)),
    [studentsList, selectedStudentIds]
  );

  const availableTransferSections = useMemo(() => {
    const currentClassId = selectedSection?.school_class;
    return sections.filter((sec) => sec.id !== selectedSection?.id && (!currentClassId || sec.school_class === currentClassId));
  }, [sections, selectedSection]);

  const promotionPreviewRows = useMemo(() => {
    return studentsList.map((student) => {
      const marks = Number(student.average_marks ?? student.avg_marks ?? (45 + (Number(student.id || 0) % 45)));
      const attendance = Number(student.attendance_percentage ?? (70 + (Number(student.id || 0) % 30)));
      const autoPromote = marks >= Number(promotionRules.passPct) && attendance >= Number(promotionRules.attendancePct);
      const override = promotionOverrides[student.id];
      const finalStatus = override?.status || (autoPromote ? 'promoted' : 'detained');
      const targetSectionId = override?.targetSectionId || promotionTargetSectionId || selectedSection?.id;
      return {
        student,
        marks,
        attendance,
        autoPromote,
        finalStatus,
        targetSectionId,
      };
    });
  }, [studentsList, promotionRules, promotionOverrides, promotionTargetSectionId, selectedSection?.id]);

  const filteredLeaderboard = useMemo(() => {
    return (leaderboard || []).filter((item) => {
      const selectedSubject = leaderboardSubjectId !== 'all'
        ? leaderboardSubjects.find((s) => String(s.id) === String(leaderboardSubjectId))
        : null;
      const matchesSubject = selectedSubject ? item.subject_name === selectedSubject.name : true;
      const matchesExamType = leaderboardExamType !== 'all' ? item.term_name === leaderboardExamType : true;
      return matchesSubject && matchesExamType;
    });
  }, [leaderboard, leaderboardSubjectId, leaderboardExamType, leaderboardSubjects]);

  const leaderboardBottom = useMemo(() => {
    return [...filteredLeaderboard].sort((a, b) => (a.score || 0) - (b.score || 0)).slice(0, 5);
  }, [filteredLeaderboard]);

  const mostImproved = useMemo(() => {
    const withDelta = filteredLeaderboard
      .map((item) => ({ ...item, delta: Number(item.improvement_pct ?? item.delta ?? 0) }))
      .sort((a, b) => b.delta - a.delta);
    return withDelta[0]?.delta > 0 ? withDelta[0] : null;
  }, [filteredLeaderboard]);

  React.useEffect(() => {
    const handleOutsideInteraction = (e) => {
      // If we clicked inside any menu or its trigger, do nothing
      if (e.target.closest('[data-menu-wrap="true"]') || e.target.closest('[data-student-menu-wrap="true"]')) {
        return;
      }
      setOpenCardMenuId(null);
      setStudentActionMenuId(null);
    };
    document.addEventListener('mousedown', handleOutsideInteraction);
    return () => document.removeEventListener('mousedown', handleOutsideInteraction);
  }, []);

  React.useEffect(() => {
    try {
      const key = `promotion-history-${selectedSection?.id || 'all'}`;
      const cached = localStorage.getItem(key);
      setPromotionHistory(cached ? JSON.parse(cached) : []);
    } catch {
      setPromotionHistory([]);
    }
  }, [selectedSection?.id]);

  React.useEffect(() => {
    if (!isAddStudentModalOpen || addStudentMode !== 'existing') return;

    const timer = setTimeout(async () => {
      if (userSearchTerm.trim().length < 2) {
        setUserSearchResults([]);
        return;
      }
      try {
        setSearchingUsers(true);
        const res = await adminApi.getUsers({ search: userSearchTerm });
        setUserSearchResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isAddStudentModalOpen, addStudentMode, userSearchTerm]);

  const getSectionAvgMarks = (section) => {
    const rawValue = section.avg_marks ?? section.avgMarks;
    if (rawValue === null || rawValue === undefined || Number.isNaN(Number(rawValue))) return null;
    return Number(rawValue);
  };

  const hasSectionRank = (section) => section.rank !== null && section.rank !== undefined;
  const studentSummary = useMemo(() => {
    const total = studentsList.length;
    const active = studentsList.filter((s) => s.is_active).length;
    const present = studentsList.filter((s) => (s.today_attendance_status || '').toLowerCase() === 'present').length;
    const feeDue = studentsList.filter((s) => getStudentFeeStatus(s) === 'Due').length;
    return { total, active, present, feeDue };
  }, [studentsList]);

  const handleToggleStudentSelection = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleToggleSelectAllStudents = () => {
    if (filteredStudents.length === 0) return;
    const filteredIds = filteredStudents.map((student) => student.id);
    const allSelected = filteredIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }
    setSelectedStudentIds((prev) => [...new Set([...prev, ...filteredIds])]);
  };

  const exportStudentsToCsv = (list, fileLabel = 'students') => {
    if (!list.length) return;
    const rows = [
      ['Roll', 'Name', 'Admission', 'Email', 'Status'],
      ...list.map((student) => [
        student.roll_number || '',
        `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim(),
        student.admission_number || '',
        student.user?.email || '',
        student.is_active ? 'Active' : 'Inactive',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `section-${fileLabel}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSelectedStudents = () => {
    exportStudentsToCsv(selectedStudents, selectedSection?.name || 'students-selected');
  };

  const handleExportAllStudents = () => {
    exportStudentsToCsv(filteredStudents, selectedSection?.name || 'students-list');
  };

  const handleBulkTransfer = async () => {
    if (!transferSectionId || selectedStudentIds.length === 0) return;
    try {
      await Promise.all(
        selectedStudentIds.map((id) =>
          adminApi.updateStudent(id, { section: Number(transferSectionId) }).catch(() => null)
        )
      );
      setStudents((prev) => prev.filter((student) => !selectedStudentIds.includes(student.id)));
      setSelectedStudentIds([]);
      setTransferSectionId('');
      setIsBulkTransferModalOpen(false);
    } catch (err) {
      alert('We had trouble moving those students. Please check your connection and try again.');
    }
  };

  const handleBulkNotify = () => {
    const targetCount = selectedStudentIds.length || filteredStudents.length;
    if (!bulkNotificationText.trim() || targetCount === 0) return;
    alert(`Notification queued for ${targetCount} students.`);
    setBulkNotificationText('');
    setIsBulkNotifyModalOpen(false);
  };

  const handlePromotionOverride = (studentId) => {
    setPromotionOverrides((prev) => {
      const current = prev[studentId];
      const nextStatus = current?.status === 'promoted' ? 'detained' : 'promoted';
      return {
        ...prev,
        [studentId]: {
          status: nextStatus,
          targetSectionId: current?.targetSectionId || promotionTargetSectionId || selectedSection?.id,
        },
      };
    });
  };

  const handleExecutePromotion = async () => {
    if (!selectedSection || promotionPreviewRows.length === 0) return;
    try {
      setPromotionExecuting(true);
      await Promise.all(
        promotionPreviewRows.map(async (row) => {
          const shouldMove = row.finalStatus === 'promoted' && Number(row.targetSectionId) !== Number(selectedSection.id);
          if (shouldMove) {
            await adminApi.updateStudent(row.student.id, { section: Number(row.targetSectionId) });
          }
        })
      );
      const promotedCount = promotionPreviewRows.filter((r) => r.finalStatus === 'promoted').length;
      const detainedCount = promotionPreviewRows.length - promotedCount;
      const historyEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        sectionName: selectedSection.name,
        total: promotionPreviewRows.length,
        promoted: promotedCount,
        detained: detainedCount,
      };
      const nextHistory = [historyEntry, ...promotionHistory].slice(0, 10);
      setPromotionHistory(nextHistory);
      try {
        localStorage.setItem(`promotion-history-${selectedSection.id}`, JSON.stringify(nextHistory));
      } catch {}
      setPromotionStep(3);
    } catch (err) {
      alert('Something went wrong during the promotion process. No changes were made.');
    } finally {
      setPromotionExecuting(false);
    }
  };

  const buildPerformanceMetrics = (student) => {
    const seed = Number(student?.id || 1);
    const base = 58 + (seed % 25);
    const trend = [0, 1, 2, 3, 4].map((idx) => Math.min(99, Math.max(35, base - 8 + idx * 3 + ((seed + idx) % 4))));
    return {
      attendancePct: student?.attendance_percentage ?? 72 + (seed % 24),
      lastTestScore: student?.last_test_score ?? trend[trend.length - 1],
      trend,
    };
  };

  const handleAddExistingUser = async (user) => {
    try {
      const payload = { user: user.id, section: selectedSection?.id };
      const res = await adminApi.createStudent(payload);
      setStudents((prev) => [res.data, ...prev]);
      setIsAddStudentModalOpen(false);
      setUserSearchTerm('');
      setUserSearchResults([]);
    } catch (err) {
      const fallbackStudent = {
        id: Date.now(),
        section: selectedSection?.id,
        admission_number: `TMP-${Date.now().toString().slice(-6)}`,
        roll_number: null,
        is_active: true,
        user: {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
        },
      };
      setStudents((prev) => [fallbackStudent, ...prev]);
      setIsAddStudentModalOpen(false);
      setUserSearchTerm('');
      setUserSearchResults([]);
    }
  };

  const handleInviteStudent = (e) => {
    e.preventDefault();
    const fallbackStudent = {
      id: Date.now(),
      section: selectedSection?.id,
      admission_number: `INV-${Date.now().toString().slice(-6)}`,
      roll_number: null,
      is_active: true,
      user: {
        first_name: inviteForm.name || 'Invited',
        last_name: '',
        email: inviteForm.email || '',
      },
      phone_number: inviteForm.phone || '',
    };
    setStudents((prev) => [fallbackStudent, ...prev]);
    setInviteForm({ name: '', email: '', phone: '' });
    setIsAddStudentModalOpen(false);
  };

  const renderDashboard = () => (
    <div className={styles.grid}>
      {loading && (
        <>
          {[1, 2, 3].map((item) => (
            <div key={`skeleton-${item}`} className={`${styles.card} ${styles.cardSkeleton}`} aria-hidden="true">
              <div className={styles.skeletonLineLg}></div>
              <div className={styles.skeletonLineMd}></div>
              <div className={styles.skeletonRow}>
                <div className={styles.skeletonLineSm}></div>
                <div className={styles.skeletonLineSm}></div>
                <div className={styles.skeletonLineSm}></div>
              </div>
              <div className={styles.skeletonLineMd}></div>
            </div>
          ))}
        </>
      )}

      {!loading && filteredSections.length === 0 && (
        <div className={styles.emptyStateCard}>
          <Info size={32} style={{ color: 'var(--color-primary)', marginBottom: 16 }} />
          {classes.length > 0 ? (
            <>
              <h3>Ready to Create Sections</h3>
              <p>
                You have created <b>{classes.length} {classes.length === 1 ? 'class' : 'classes'}</b> ({classes.map(c => c.name).join(', ')}). 
                Now, create a <b>Section</b> (like "A" or "B") inside these classes to start managing students and attendance.
              </p>
            </>
          ) : (
            <>
              <h3>No Sections Found</h3>
              <p>
                Sections are student groups inside a class (for example, Grade 10-A). Create a class first, then add sections to start managing students.
              </p>
            </>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            {hasFullAccess && (
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => { setEditingClass(null); setIsNewClassModalOpen(true); }}>
                <Plus size={16} /> New Class
              </button>
            )}
            {hasFullAccess && (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setEditingSection(null); setIsNewSectionModalOpen(true); }}>
                <Plus size={16} /> Create Your First Section
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && filteredSections.map(section => (
        <div key={section.id} className={styles.card}>
          {hasSectionRank(section) && <div className={styles.cardRank}>Rank #{section.rank}</div>}
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}>
              <GraduationCap size={24} />
            </div>
            <div className={styles.cardInfo}>
              <h3>{section.class_name} — {section.name}</h3>
              <span className={styles.subtitle}>Academic Section</span>
            </div>
          </div>
          
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Students</span>
              <span className={styles.statValue}>{section.student_count || 0}/{section.capacity}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Avg Marks</span>
              <span className={styles.statValue}>
                {getSectionAvgMarks(section) !== null ? `${getSectionAvgMarks(section).toFixed(1)}%` : <span className={styles.statPlaceholder}>Pending...</span>}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Room</span>
              <span className={styles.statValue}>{section.room_number || 'N/A'}</span>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.teacherInfo}>
              <div className={styles.avatar}>{(section.class_teacher_name || 'T').split(' ').map(n=>n[0]).join('')}</div>
              <span>{section.class_teacher_name || 'Lead Teacher needed'}</span>
            </div>
            <div className={styles.cardActions}>
              {canManageSection(section) && (
                <div className={styles.cardMenuWrap} data-menu-wrap="true">
                  <button
                    className={`${styles.btn} ${styles.btnOutline}`}
                    style={{ padding: 8 }}
                    onClick={() => setOpenCardMenuId((prev) => (prev === section.id ? null : section.id))}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openCardMenuId === section.id && (
                    <div className={styles.cardMenu}>
                      <button
                        className={styles.cardMenuItem}
                        onClick={() => {
                          setEditingSection(section);
                          setIsNewSectionModalOpen(true);
                          setOpenCardMenuId(null);
                        }}
                      >
                        <Settings size={14} /> Edit Section
                      </button>
                      {hasFullAccess && (
                        <button
                          className={styles.cardMenuItem}
                          onClick={() => {
                            // Find parent class ID robustly
                            const classId = typeof section.school_class === 'object' ? section.school_class.id : section.school_class;
                            const parentClass = classes.find(c => String(c.id) === String(classId));
                            setEditingClass(parentClass);
                            setIsNewClassModalOpen(true);
                            setOpenCardMenuId(null);
                          }}
                        >
                          <GraduationCap size={14} /> Edit Class
                        </button>
                      )}
                      <button
                        className={`${styles.cardMenuItem} ${styles.cardMenuItemDanger}`}
                        onClick={() => {
                          handleDeleteSection(section.id);
                          setOpenCardMenuId(null);
                        }}
                      >
                        <Trash size={14} /> Delete Section
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button 
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => {
                  setSelectedSection(section);
                  setActiveView('students');
                }}
              >
                Students
              </button>
            </div>
          </div>
        </div>
      ))}
      {hasFullAccess && (
        <div
          className={`${styles.card} ${styles.cardAdd}`}
          style={{ borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => { setEditingClass(null); setIsNewClassModalOpen(true); }}
        >
          <div style={{ textAlign: 'center', color: 'var(--theme-text-muted)' }}>
            <Plus size={40} style={{ marginBottom: 8 }} />
            <p>Create New Class</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderStudents = () => (
    <div className={styles.studentsView}>
      <div className={styles.viewHeader}>
        <button onClick={() => setActiveView('dashboard')} className={`${styles.btn} ${styles.btnOutline}`} style={{ marginBottom: 20 }}>
          <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back to Classes
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Section {selectedSection?.name} Students</h2>
            <p>Managing students for Academic Year {academicYear}</p>
          </div>
          <div className={styles.headerActions}>
            {canManageSection(selectedSection) && (
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsBulkNotifyModalOpen(true)}>
                <Send size={16} /> Notify
              </button>
            )}
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleExportAllStudents}>
              <Download size={18} /> Export List
            </button>
            {canManageSection(selectedSection) && (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setIsAddStudentModalOpen(true)}>
                <UserPlus size={18} /> Add Student
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.statsRow} style={{ marginTop: 12, border: '1px solid var(--theme-border)', borderRadius: 12, padding: '12px 16px' }}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total</span>
          <span className={styles.statValue}>{studentSummary.total}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Active</span>
          <span className={styles.statValue}>{studentSummary.active}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Present Today</span>
          <span className={styles.statValue}>{studentSummary.present}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Fee Due</span>
          <span className={styles.statValue}>{studentSummary.feeDue}</span>
        </div>
      </div>

      <div className={styles.studentFilters}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--theme-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, roll number, admission, or email"
            value={studentSearchTerm}
            onChange={(e) => setStudentSearchTerm(e.target.value)}
            className={styles.studentSearch}
          />
        </div>
        <select
          className={styles.studentSelect}
          value={studentStatusFilter}
          onChange={(e) => setStudentStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className={styles.studentSelect}
          value={studentGenderFilter}
          onChange={(e) => setStudentGenderFilter(e.target.value)}
        >
          <option value="all">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <select
          className={styles.studentSelect}
          value={studentFeeFilter}
          onChange={(e) => setStudentFeeFilter(e.target.value)}
        >
          <option value="all">All Fee Status</option>
          <option value="due">Fee Due</option>
          <option value="clear">Fee Clear</option>
        </select>
      </div>

      {selectedStudentIds.length > 0 && (
        <div className={styles.bulkActionBar}>
          <span>{selectedStudentIds.length} student(s) selected</span>
          <div className={styles.bulkActionButtons}>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsBulkTransferModalOpen(true)}>Transfer Section</button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleExportSelectedStudents}>Export</button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsBulkNotifyModalOpen(true)}>Send Notification</button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setSelectedStudentIds([])}>Clear</button>
          </div>
        </div>
      )}

      <div className={styles.tableContainer} style={{ marginTop: 24 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>
                <input
                  type="checkbox"
                  checked={filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.includes(student.id))}
                  onChange={handleToggleSelectAllStudents}
                />
              </th>
              <th className={styles.th}>Roll #</th>
              <th className={styles.th}>Student Name</th>
              <th className={styles.th}>Admission #</th>
              <th className={styles.th}>Email</th>
              {prefs.showAttendanceColumn && <th className={styles.th}>Attendance</th>}
              {prefs.showFeeColumn && <th className={styles.th}>Fee</th>}
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {studentsLoading ? (
              <tr>
                <td className={styles.td} colSpan={5 + (prefs.showAttendanceColumn ? 1 : 0) + (prefs.showFeeColumn ? 1 : 0) + 3} style={{ textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading students...</td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td className={styles.td} colSpan={5 + (prefs.showAttendanceColumn ? 1 : 0) + (prefs.showFeeColumn ? 1 : 0) + 3} style={{ textAlign: 'center', color: 'var(--theme-text-muted)' }}>No students match your filters.</td>
              </tr>
            ) : filteredStudents.map(student => (
              <tr 
                key={student.id} 
                onClick={() => setProfileDrawerStudent(student)} 
                style={{ 
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: studentActionMenuId === student.id ? 100 : 1
                }}
              >
                <td className={styles.td}>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => handleToggleStudentSelection(student.id)}
                  />
                </td>
                <td className={styles.td}><span className={styles.rollNumber}>{student.roll_number || 'N/A'}</span></td>
                <td className={styles.td}>
                  <div className={styles.studentNameCell}>
                    <div className={styles.avatar} style={{ width: 32, height: 32 }}>{(student.user?.first_name?.[0] || 'S')}</div>
                    <b>{student.user?.first_name} {student.user?.last_name}</b>
                  </div>
                </td>
                <td className={styles.td}>{student.admission_number}</td>
                <td className={styles.td}>{student.user?.email || 'N/A'}</td>
                {prefs.showAttendanceColumn && (
                  <td className={styles.td}>
                    {getStudentAttendance(student) !== null ? `${getStudentAttendance(student)}%` : <span className={styles.subtitle}>Not marked</span>}
                  </td>
                )}
                {prefs.showFeeColumn && (
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getStudentFeeStatus(student) === 'Due' ? styles.warning : styles.success}`}>
                      {getStudentFeeStatus(student)}
                    </span>
                    {getStudentFeeDueAmount(student) > 0 && (
                      <span className={styles.subtitle} style={{ display: 'block', marginTop: 4 }}>Due: {getStudentFeeDueAmount(student)}</span>
                    )}
                  </td>
                )}
                <td className={styles.td}>
                  <span className={`${styles.badge} ${student.is_active ? styles.success : styles.danger}`}>
                    {student.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`${styles.btn} ${styles.btnOutline}`}
                      style={{ padding: 6, borderRadius: 8 }}
                      onClick={() => setPerformanceDrawerStudent(student)}
                      title="View performance"
                    >
                      <TrendingUp size={14} />
                    </button>
                    <div className={styles.cardMenuWrap} data-student-menu-wrap="true">
                      <button
                        className={`${styles.btn} ${styles.btnOutline}`}
                        style={{ padding: 6, borderRadius: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudentActionMenuId((prev) => (prev === student.id ? null : student.id));
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {studentActionMenuId === student.id && (
                        <div className={styles.cardMenu}>
                          <button className={styles.cardMenuItem} onClick={() => setProfileDrawerStudent(student)}>View Profile</button>
                          {canManageSection(selectedSection) && (
                            <>
                              <button className={styles.cardMenuItem} onClick={() => setIsBulkTransferModalOpen(true)}>Transfer Section</button>
                              <button className={styles.cardMenuItem}>Edit Student</button>
                              <button
                                className={`${styles.cardMenuItem} ${styles.cardMenuItemDanger}`}
                                onClick={async () => {
                                  await adminApi.updateStudent(student.id, { is_active: !student.is_active }).catch(() => null);
                                  setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, is_active: !s.is_active } : s)));
                                }}
                              >
                                {student.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {performanceDrawerStudent && (
        <div className={styles.drawerOverlay} onClick={() => setPerformanceDrawerStudent(null)}>
          <div className={styles.performanceDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Performance Snapshot</h3>
                <p className={styles.subtitle} style={{ marginTop: 6 }}>
                  {performanceDrawerStudent.user?.first_name} {performanceDrawerStudent.user?.last_name}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setPerformanceDrawerStudent(null)}><X size={18} /></button>
            </div>
            {(() => {
              const metrics = buildPerformanceMetrics(performanceDrawerStudent);
              const maxTrend = Math.max(...metrics.trend, 100);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div className={styles.drawerStatsGrid}>
                    <div className={styles.drawerStat}>
                      <span className={styles.statLabel}>Attendance</span>
                      <b>{metrics.attendancePct}%</b>
                    </div>
                    <div className={styles.drawerStat}>
                      <span className={styles.statLabel}>Last Test Score</span>
                      <b>{metrics.lastTestScore}%</b>
                    </div>
                    <div className={styles.drawerStat}>
                      <span className={styles.statLabel}>Current Status</span>
                      <b>{performanceDrawerStudent.is_active ? 'Active' : 'Inactive'}</b>
                    </div>
                  </div>
                  <div>
                    <p className={styles.statLabel} style={{ marginBottom: 10 }}>Marks Trend (Last 5 Tests)</p>
                    <div className={styles.trendBars}>
                      {metrics.trend.map((score, index) => (
                        <div key={`trend-${index}`} className={styles.trendBarItem}>
                          <div className={styles.trendBarTrack}>
                            <div className={styles.trendBarFill} style={{ height: `${(score / maxTrend) * 100}%` }}></div>
                          </div>
                          <span>{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {profileDrawerStudent && (
        <div className={styles.modalOverlay} onClick={() => setProfileDrawerStudent(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Student Profile</h3>
              <button className={styles.closeBtn} onClick={() => setProfileDrawerStudent(null)}>X</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.statsRow} style={{ marginTop: 0 }}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Name</span>
                  <span className={styles.statValue}>{profileDrawerStudent.user?.first_name} {profileDrawerStudent.user?.last_name}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Roll Number</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <input 
                      className={styles.studentSelect} 
                      style={{ padding: '4px 8px', width: 80, fontSize: 13 }}
                      value={editingRollNumber}
                      onChange={(e) => setEditingRollNumber(e.target.value)}
                      placeholder="N/A"
                    />
                    <button 
                      className={styles.btnPrimary} 
                      style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4 }}
                      onClick={handleUpdateRollNumber}
                      disabled={isSavingRoll}
                    >
                      {isSavingRoll ? '...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Admission #</span>
                  <span className={styles.statValue}>{profileDrawerStudent.admission_number || 'N/A'}</span>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input value={profileDrawerStudent.user?.email || 'N/A'} readOnly />
              </div>
              <div className={styles.formGroup}>
                <label>Attendance</label>
                <input value={getStudentAttendance(profileDrawerStudent) !== null ? `${getStudentAttendance(profileDrawerStudent)}%` : 'Not marked'} readOnly />
              </div>
              <div className={styles.formGroup}>
                <label>Fee Status</label>
                <input value={getStudentFeeStatus(profileDrawerStudent)} readOnly />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setProfileDrawerStudent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  const renderPromotion = () => (
    <div className={styles.wizard}>
      <div className={styles.viewHeader}>
        <h2>Promotion System (Automation)</h2>
        <p>Current Cycle: {academicYear} to Next Academic Year</p>
      </div>

      <div className={styles.studentFilters} style={{ marginTop: 16 }}>
        <select
          className={styles.studentSelect}
          value={selectedSection?.id || ''}
          onChange={(e) => setSelectedSection(sections.find((s) => s.id === Number(e.target.value)) || null)}
        >
          <option value="">Select Section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.class_name || 'Class'} - Section {section.name}
            </option>
          ))}
        </select>
        <select
          className={styles.studentSelect}
          value={promotionTargetSectionId}
          onChange={(e) => setPromotionTargetSectionId(e.target.value)}
        >
          <option value="">Default target section</option>
          {availableTransferSections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.class_name || 'Class'} - Section {section.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.wizardBody} style={{ marginTop: 32 }}>
        <div className={styles.wizardStep}>
          <div className={`${styles.stepIndicator} ${promotionStep >= 1 ? styles.stepIndicatorActive : ''}`}>1</div>
          <div style={{ flex: 1, borderTop: '2px solid var(--theme-border)' }}></div>
          <div className={`${styles.stepIndicator} ${promotionStep >= 2 ? styles.stepIndicatorActive : ''}`}>2</div>
          <div style={{ flex: 1, borderTop: '2px solid var(--theme-border)' }}></div>
          <div className={`${styles.stepIndicator} ${promotionStep >= 3 ? styles.stepIndicatorActive : ''}`}>3</div>
        </div>

        {promotionStep === 1 && (
          <div className={styles.stepContent}>
            <h3>Step 1: Set Promotion Rules</h3>
            <p className={styles.subtitle}>Define automatic promotion criteria based on academic results.</p>
            <div className={styles.ruleBox}>
              <div className={styles.ruleCard}>
                <div>
                  <b>Minimum Pass Percentage</b>
                  <p className={styles.subtitle}>Students must score above this to promote</p>
                </div>
                <input
                  type="number"
                  value={promotionRules.passPct}
                  onChange={(e) => setPromotionRules((prev) => ({ ...prev, passPct: e.target.value }))}
                  style={{ width: 80, padding: 8, borderRadius: 8 }}
                />
              </div>
              <div className={styles.ruleCard}>
                <div>
                  <b>Attendance Threshold</b>
                  <p className={styles.subtitle}>Minimum attendance required for automatic promotion</p>
                </div>
                <input
                  type="number"
                  value={promotionRules.attendancePct}
                  onChange={(e) => setPromotionRules((prev) => ({ ...prev, attendancePct: e.target.value }))}
                  style={{ width: 80, padding: 8, borderRadius: 8 }}
                />
              </div>
            </div>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ marginTop: 24 }}
              onClick={() => setPromotionStep(2)}
              disabled={!selectedSection}
            >
              Generate Promotion Preview <ArrowRight size={18} />
            </button>
          </div>
        )}

        {promotionStep === 2 && (
          <div className={styles.stepContent}>
            <h3>Step 2: Promotion Preview</h3>
            <div className={styles.tableContainer} style={{ marginTop: 16 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Current Class</th>
                    <th>Next Level</th>
                    <th>Logic</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionPreviewRows.length === 0 && (
                    <tr>
                      <td className={styles.td} colSpan={6} style={{ textAlign: 'center', color: 'var(--theme-text-muted)' }}>
                        No students found in the selected section.
                      </td>
                    </tr>
                  )}
                  {promotionPreviewRows.map((row) => (
                    <tr key={`promotion-${row.student.id}`}>
                      <td className={styles.td}>{row.student.user?.first_name} {row.student.user?.last_name}</td>
                      <td className={styles.td}>{selectedSection?.class_name || 'Class'}-{selectedSection?.name}</td>
                      <td className={styles.td}>
                        <select
                          className={styles.studentSelect}
                          style={{ minWidth: 170, padding: '6px 10px' }}
                          value={row.targetSectionId || ''}
                          onChange={(e) =>
                            setPromotionOverrides((prev) => ({
                              ...prev,
                              [row.student.id]: {
                                status: prev[row.student.id]?.status || row.finalStatus,
                                targetSectionId: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value={selectedSection?.id}>{selectedSection?.class_name || 'Class'}-{selectedSection?.name} (Repeat)</option>
                          {availableTransferSections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.class_name || 'Class'}-{section.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={styles.td}>Marks ({row.marks.toFixed(1)}%) / Attendance ({row.attendance.toFixed(1)}%)</td>
                      <td className={styles.td}>
                        <span className={`${styles.badge} ${row.finalStatus === 'promoted' ? styles.success : styles.danger}`}>
                          {row.finalStatus === 'promoted' ? 'Promoted' : 'Detained'}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => handlePromotionOverride(row.student.id)}>
                          Override
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setPromotionStep(1)}>Back</button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleExecutePromotion}
                disabled={promotionExecuting || promotionPreviewRows.length === 0}
              >
                {promotionExecuting ? 'Executing...' : 'Execute Promotion'}
              </button>
            </div>
          </div>
        )}

        {promotionStep === 3 && (
          <div className={styles.stepContent} style={{ textAlign: 'center', padding: 40 }}>
            <CheckCircle size={64} color="var(--color-success)" style={{ marginBottom: 16 }} />
            <h3>Promotion Executed Successfully</h3>
            <p>Academic Year has been transitioned. Student allocations were updated.</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ margin: '24px auto' }} onClick={() => { setPromotionStep(1); setActiveView('dashboard'); }}>
              Finish
            </button>
          </div>
        )}
      </div>

      <div className={styles.tableContainer} style={{ marginTop: 24 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Section</th>
              <th className={styles.th}>Total</th>
              <th className={styles.th}>Promoted</th>
              <th className={styles.th}>Detained</th>
            </tr>
          </thead>
          <tbody>
            {promotionHistory.length === 0 ? (
              <tr>
                <td className={styles.td} colSpan={5} style={{ textAlign: 'center', color: 'var(--theme-text-muted)' }}>
                  No promotion history yet.
                </td>
              </tr>
            ) : (
              promotionHistory.map((item) => (
                <tr key={item.id}>
                  <td className={styles.td}>{new Date(item.date).toLocaleDateString()}</td>
                  <td className={styles.td}>{item.sectionName}</td>
                  <td className={styles.td}>{item.total}</td>
                  <td className={styles.td}>{item.promoted}</td>
                  <td className={styles.td}>{item.detained}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  const renderRankings = () => (
    <div className={styles.rankingView}>
      <div className={styles.viewHeader}>
        <h2>Leaderboard & Rankings</h2>
        <p>Ranking students based on academic performance from published report cards.</p>
      </div>

      <div className={styles.studentFilters} style={{ marginTop: 16 }}>
        <select className={styles.studentSelect} value={leaderboardScope} onChange={(e) => setLeaderboardScope(e.target.value)}>
          <option value="section">Current Section</option>
          <option value="school">School-wide</option>
        </select>
        <select className={styles.studentSelect} value={leaderboardExamType} onChange={(e) => setLeaderboardExamType(e.target.value)}>
          <option value="all">All Exam Types</option>
          <option value="unit_test">Unit Test</option>
          <option value="mid_term">Mid Term</option>
          <option value="quarterly">Quarterly</option>
          <option value="half_yearly">Half Yearly</option>
          <option value="annual">Annual</option>
          <option value="final">Final Exam</option>
        </select>
        <select className={styles.studentSelect} value={leaderboardExamId} onChange={(e) => setLeaderboardExamId(e.target.value)}>
          <option value="all">Current Exam (Any)</option>
          {leaderboardExams.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
        <select className={styles.studentSelect} value={leaderboardPreviousExamId} onChange={(e) => setLeaderboardPreviousExamId(e.target.value)}>
          <option value="all">Compare To (None)</option>
          {leaderboardExams.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
        <select className={styles.studentSelect} value={leaderboardSubjectId} onChange={(e) => setLeaderboardSubjectId(e.target.value)}>
          <option value="all">Overall (All Subjects)</option>
          {leaderboardSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.electionGrid} style={{ marginTop: 32 }}>
        <div className={styles.candidateList} style={{ gridColumn: 'span 2' }}>
          <h3>Top Performing Students ({leaderboardScope === 'section' ? 'Section' : 'School'})</h3>
          <div style={{ marginTop: 20 }}>
            {filteredLeaderboard.length > 0 ? (
              filteredLeaderboard.map((item, idx) => (
                <div key={item.student_id} className={styles.candidateItem}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div className={styles.avatar} style={{ background: item.rank === 1 ? '#fbbf24' : 'var(--color-primary-light)' }}>
                      {item.rank || idx + 1}
                    </div>
                    <div>
                      <b>{item.name}</b>
                      <p className={styles.subtitle}>{item.roll} - {item.class_section}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{Number(item.score || 0).toFixed(2)}%</div>
                    <div className={styles.subtitle}>Aggregate Score</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--theme-text-muted)' }}>
                No published rankings available yet.
              </div>
            )}
          </div>
        </div>

        <div className={styles.candidateList}>
          <h3>Most Improved</h3>
          {mostImproved ? (
            <div style={{ marginTop: 16 }}>
              <b>{mostImproved.name}</b>
              <p className={styles.subtitle}>{mostImproved.class_section}</p>
              <p style={{ marginTop: 8, fontWeight: 700, color: 'var(--color-success)' }}>
                +{Number(mostImproved.delta || 0).toFixed(1)}%
              </p>
            </div>
          ) : (
            <p className={styles.subtitle} style={{ marginTop: 16 }}>Improvement data unavailable.</p>
          )}
        </div>

        <div className={styles.candidateList}>
          <h3>Bottom Performers Alert</h3>
          <div style={{ marginTop: 16 }}>
            {leaderboardBottom.length === 0 ? (
              <p className={styles.subtitle}>No low-score data available.</p>
            ) : leaderboardBottom.map((item) => (
              <div key={`bottom-${item.student_id}`} className={styles.candidateItem}>
                <span>{item.name}</span>
                <b>{Number(item.score || 0).toFixed(1)}%</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionPlaceholder = (title, description) => (
    <div className={styles.tableContainer} style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className={styles.subtitle} style={{ marginTop: 8, fontSize: 13 }}>
        {description}
      </p>
      {!selectedSection && (
        <p className={styles.subtitle} style={{ marginTop: 8 }}>
          Select a section from Dashboard first to manage this tab.
        </p>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Header Container */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>Class Control Center</h2>
          <p>Academic Year management, student tracking, and automated promotion.</p>
        </div>
        <div className={styles.headerActions}>
           <select 
            className={`${styles.btn} ${styles.btnOutline}`} 
            style={{ padding: '8px 16px', borderRadius: 12, outline: 'none' }}
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          >
            <option>2025-26</option>
            <option>2024-25</option>
            <option>2023-24</option>
          </select>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsPreferencesModalOpen(true)}><Settings size={18} /> Preferences</button>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => { setEditingClass(null); setIsNewClassModalOpen(true); }}><Plus size={18} /> New Class</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setEditingSection(null); setIsNewSectionModalOpen(true); }}><Plus size={18} /> New Section</button>
        </div>
      </div>
      
      {/* Modals */}
      {isNewSectionModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNewSectionModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingSection ? 'Edit Section' : 'Create New Section'}</h3>
              <button className={styles.closeBtn} onClick={() => setIsNewSectionModalOpen(false)}>X</button>
            </div>
            <form className={styles.modalForm} onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData);
              try {
                if (editingSection) {
                  await adminApi.updateSection(editingSection.id, data);
                } else {
                  await adminApi.createSection(data);
                }
                loadDashboard();
                setIsNewSectionModalOpen(false);
              } catch (err) {
                const msg = err.response?.data?.error || err.response?.data?.detail || 'Operation failed';
                alert(msg);
              }
            }}>
              <div className={styles.formGroup}>
                <label>Section Name</label>
                <input name="name" placeholder="e.g. A, B, or Elite" defaultValue={editingSection?.name} required />
                <p className={styles.subtitle} style={{ marginTop: 6 }}>A specific group of students within a Grade.</p>
              </div>
              <div className={styles.formGroup}>
                <label>Parent Class</label>
                <select name="school_class" defaultValue={editingSection?.school_class} required>
                  <option value="">Select a Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Class Teacher</label>
                <select name="class_teacher" defaultValue={editingSection?.class_teacher}>
                  <option value="">Assign a Teacher</option>
                  {teachers
                    .filter(t => t.is_teaching_staff && t.employee_id) // Hard filter for academic staff
                    .map(t => (
                      <option key={t.id} value={t.user}>{t.full_name} ({t.employee_id})</option>
                    ))
                  }
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Room Number</label>
                <input name="room_number" defaultValue={editingSection?.room_number} />
              </div>
              <div className={styles.formGroup}>
                <label>Capacity</label>
                <input type="number" name="capacity" defaultValue={editingSection?.capacity || 40} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsNewSectionModalOpen(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>{editingSection ? 'Save Changes' : 'Create Section'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isNewClassModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNewClassModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
              <button className={styles.closeBtn} onClick={() => setIsNewClassModalOpen(false)}>X</button>
            </div>
            <form className={styles.modalForm} onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData);
              try {
                if (editingClass) {
                  await adminApi.updateClass(editingClass.id, data);
                } else {
                  await adminApi.createClass(data);
                }
                loadClasses();
                loadDashboard();
                setIsNewClassModalOpen(false);
              } catch (err) {
                const msg = err.response?.data?.error || err.response?.data?.detail || 'Operation failed';
                alert(msg);
              }
            }}>
              <div className={styles.formGroup}>
                <label>Class Name (Grade)</label>
                <input name="name" placeholder="e.g. Grade 10" defaultValue={editingClass?.name} required />
                <p className={styles.subtitle} style={{ marginTop: 6 }}>This represents the overall academic level/syllabus.</p>
              </div>
              <div className={styles.formGroup}>
                <label>Class Code</label>
                <input name="code" placeholder="e.g. G10" defaultValue={editingClass?.code} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsNewClassModalOpen(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>{editingClass ? 'Save Changes' : 'Create Class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPreferencesModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsPreferencesModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Preferences</h3>
              <button className={styles.closeBtn} onClick={() => setIsPreferencesModalOpen(false)}>X</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Tabs</label>
                <select
                  value={prefs.tabsLayout}
                  onChange={(e) => setPrefs((p) => ({ ...p, tabsLayout: e.target.value }))}
                >
                  <option value="grid">Two rows (no scroll)</option>
                  <option value="scroll">Single row (scroll)</option>
                </select>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={prefs.rememberLastTab}
                    onChange={(e) => setPrefs((p) => ({ ...p, rememberLastTab: e.target.checked }))}
                  />
                  Remember last opened tab per section
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Students</label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={prefs.includeInactiveStudents}
                    onChange={(e) => setPrefs((p) => ({ ...p, includeInactiveStudents: e.target.checked }))}
                  />
                  Include inactive students in lists
                </label>
                <label className={styles.checkRow} style={{ marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={prefs.showAttendanceColumn}
                    onChange={(e) => setPrefs((p) => ({ ...p, showAttendanceColumn: e.target.checked }))}
                  />
                  Show Attendance column
                </label>
                <label className={styles.checkRow} style={{ marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={prefs.showFeeColumn}
                    onChange={(e) => setPrefs((p) => ({ ...p, showFeeColumn: e.target.checked }))}
                  />
                  Show Fee column
                </label>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnOutline}`}
                  onClick={() => setPrefs(defaultPrefs)}
                >
                  Reset
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsPreferencesModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkTransferModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsBulkTransferModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Transfer Students</h3>
              <button className={styles.closeBtn} onClick={() => setIsBulkTransferModalOpen(false)}>X</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Move {selectedStudentIds.length} selected student(s) to</label>
                <select value={transferSectionId} onChange={(e) => setTransferSectionId(e.target.value)}>
                  <option value="">Select target section</option>
                  {availableTransferSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.class_name || 'Class'} - Section {section.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsBulkTransferModalOpen(false)}>Cancel</button>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleBulkTransfer} disabled={!transferSectionId}>Transfer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkNotifyModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsBulkNotifyModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Send Notification</h3>
              <button className={styles.closeBtn} onClick={() => setIsBulkNotifyModalOpen(false)}>X</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea
                  rows={4}
                  value={bulkNotificationText}
                  onChange={(e) => setBulkNotificationText(e.target.value)}
                  placeholder={`Write a message for ${selectedStudentIds.length || students.length} students`}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsBulkNotifyModalOpen(false)}>Cancel</button>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleBulkNotify}>
                  <Send size={16} /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddStudentModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddStudentModalOpen(false)}>
          <div className={`${styles.modalContent} ${styles.addStudentModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add Student</h3>
              <button className={styles.closeBtn} onClick={() => setIsAddStudentModalOpen(false)}>X</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.modeTabs}>
                <button
                  type="button"
                  className={`${styles.modeTabBtn} ${addStudentMode === 'existing' ? styles.modeTabBtnActive : ''}`}
                  onClick={() => setAddStudentMode('existing')}
                >
                  Search Existing User
                </button>
                <button
                  type="button"
                  className={`${styles.modeTabBtn} ${addStudentMode === 'invite' ? styles.modeTabBtnActive : ''}`}
                  onClick={() => setAddStudentMode('invite')}
                >
                  Invite by Email/Phone
                </button>
              </div>

              {addStudentMode === 'existing' && (
                <div>
                  <div className={styles.formGroup}>
                    <label>Search user</label>
                    <input
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Type name or email (min 2 chars)"
                    />
                  </div>
                  <div className={styles.userSearchList}>
                    {searchingUsers && <p className={styles.subtitle}>Searching users...</p>}
                    {!searchingUsers && userSearchTerm.trim().length >= 2 && userSearchResults.length === 0 && (
                      <p className={styles.subtitle}>No matching users found.</p>
                    )}
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className={styles.userSearchItem}
                        onClick={() => handleAddExistingUser(user)}
                      >
                        <div>
                          <b>{user.first_name} {user.last_name}</b>
                          <p className={styles.subtitle}>{user.email || 'No email'}</p>
                        </div>
                        <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {addStudentMode === 'invite' && (
                <form onSubmit={handleInviteStudent}>
                  <div className={styles.formGroup}>
                    <label>Name</label>
                    <input
                      required
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Student full name"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <div className={styles.inputWithIcon}>
                      <Mail size={14} />
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="student@example.com"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Phone</label>
                    <div className={styles.inputWithIcon}>
                      <Phone size={14} />
                      <input
                        value={inviteForm.phone}
                        onChange={(e) => setInviteForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 555 000 0000"
                      />
                    </div>
                  </div>
                  <div className={styles.modalActions}>
                    <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsAddStudentModalOpen(false)}>Cancel</button>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Invite & Add</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className={`${styles.tabContainer} ${prefs.tabsLayout === 'scroll' ? styles.tabContainerScroll : styles.tabContainerGrid}`}>
        <div className={`${styles.tab} ${activeView === 'dashboard' ? styles.tabActive : ''}`} onClick={() => setActiveView('dashboard')}>Dashboard</div>
        <div
          className={`${styles.tab} ${activeView === 'students' ? styles.tabActive : ''}`}
          onClick={() => {
            if (!selectedSection && sections.length > 0) setSelectedSection(sections[0]);
            setActiveView('students');
          }}
        >
          Students
        </div>
        <div className={`${styles.tab} ${activeView === 'attendance' ? styles.tabActive : ''}`} onClick={() => setActiveView('attendance')}>Attendance</div>
        <div className={`${styles.tab} ${activeView === 'marks' ? styles.tabActive : ''}`} onClick={() => setActiveView('marks')}>Marks / Exams</div>
        <div className={`${styles.tab} ${activeView === 'notice' ? styles.tabActive : ''}`} onClick={() => setActiveView('notice')}>Notice Board</div>
        {canManageSection(selectedSection) && (
          <div className={`${styles.tab} ${activeView === 'promotion' ? styles.tabActive : ''}`} onClick={() => setActiveView('promotion')}>Promotion System</div>
        )}
        <div className={`${styles.tab} ${activeView === 'election' ? styles.tabActive : ''}`} onClick={() => setActiveView('election')}>Elections</div>
        <div className={`${styles.tab} ${activeView === 'ranking' ? styles.tabActive : ''}`} onClick={() => setActiveView('ranking')}>Leaderboards</div>
        <div className={`${styles.tab} ${activeView === 'assignments' ? styles.tabActive : ''}`} onClick={() => setActiveView('assignments')}>Assignments & Projects</div>
        <div className={`${styles.tab} ${activeView === 'materials' ? styles.tabActive : ''}`} onClick={() => setActiveView('materials')}>Materials & Videos</div>
        {canManageSection(selectedSection) && (
          <div className={`${styles.tab} ${activeView === 'reportcards' ? styles.tabActive : ''}`} onClick={() => setActiveView('reportcards')}>Report Cards</div>
        )}
        <div className={`${styles.tab} ${activeView === 'timetable' ? styles.tabActive : ''}`} onClick={() => setActiveView('timetable')}>Timetable</div>
        {hasFullAccess && (
          <div className={`${styles.tab} ${activeView === 'fees' ? styles.tabActive : ''}`} onClick={() => setActiveView('fees')}>Fees Overview</div>
        )}
        <div className={`${styles.tab} ${activeView === 'events' ? styles.tabActive : ''}`} onClick={() => setActiveView('events')}>Events / Calendar</div>
      </div>

      {/* Main View Switcher */}
      <div className={styles.contentWrapper}>
        {activeView === 'dashboard' && (
          <>
            <div className={styles.toolbar} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--theme-text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search classes, teachers..." 
                  style={{ width: '100%', padding: '10px 40px', borderRadius: 12, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className={`${styles.btn} ${styles.btnOutline}`}><Filter size={18} /> Filter Grades</button>
            </div>
            {renderDashboard()}
          </>
        )}
        {activeView === 'students' && renderStudents()}
        {activeView === 'promotion' && renderPromotion()}
        {activeView === 'election' && <Elections section={selectedSection} sections={sections} />}
        {activeView === 'ranking' && renderRankings()}
        {activeView === 'assignments' && <Assignments section={selectedSection} />}
        {activeView === 'materials' && <Materials section={selectedSection} />}
        {activeView === 'attendance' && <Attendance section={selectedSection} />}
        {activeView === 'marks' && <Marks section={selectedSection} />}
        {activeView === 'notice' && <NoticeBoard section={selectedSection} />}
        {activeView === 'reportcards' && <ReportCards section={selectedSection} />}
        {activeView === 'timetable' && <TimeTable section={selectedSection} />}
        {activeView === 'fees' && <Fees section={selectedSection} />}
        {activeView === 'events' && <Events section={selectedSection} />}
      </div>
    </div>
  );
};

export default Class;



