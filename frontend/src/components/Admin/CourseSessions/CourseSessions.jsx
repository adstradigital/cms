'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CourseSessions.module.css';

const API_BASE = 'http://127.0.0.1:8000/api';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SESSION_TYPES = ['lecture','lab','tutorial','revision','test','other'];
const SESSION_TYPE_LABELS = { lecture:'Lecture', lab:'Lab / Practical', tutorial:'Tutorial', revision:'Revision', test:'Class Test', other:'Other' };
const STATUSES = ['scheduled','ongoing','completed','cancelled'];
const STATUS_LABELS = { scheduled:'Scheduled', ongoing:'Ongoing', completed:'Completed', cancelled:'Cancelled' };

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function formatDateLong(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getSessionSectionLabel(session) {
  return session.section_name || session.class_name || 'Section';
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ name, size = 18 }) {
  const icons = {
    plus: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
    calendar: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
    check: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>),
    edit: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
    trash: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>),
    x: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
    clock: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
    book: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
    search: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
    refresh: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>),
    users: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
    layers: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
    alert: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>),
    spinner: (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>),
  };
  return icons[name] || null;
}

// ─── Blank Form ────────────────────────────────────────────────────────────────
const blankForm = () => ({
  academic_year: '',
  section: '',
  subject: '',
  teacher: '',
  session_type: 'lecture',
  title: '',
  date: '',
  start_time: '',
  end_time: '',
  notes: '',
  status: 'scheduled',
});

// ══════════════════════════════════════════════════════════════════════════════
export default function CourseSessions() {
  // ── Data ─────────────────────────────────────────────────────────────────
  const [sessions,     setSessions]     = useState([]);
  const [academicYears,setAcademicYears] = useState([]);
  const [classes,      setClasses]      = useState([]);
  const [sections,     setSections]     = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [teachers,     setTeachers]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [apiError,     setApiError]     = useState('');
  const [searchTerm,   setSearchTerm]   = useState('');

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate,    setFilterDate]    = useState('');

  // ── Wizard Modal ──────────────────────────────────────────────────────────
  const [showModal,    setShowModal]    = useState(false);
  const [editSession,  setEditSession]  = useState(null);   // null = create, obj = edit
  const [step,         setStep]         = useState(1);
  const [form,         setForm]         = useState(blankForm());
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState('');

  // Cascading selections state (wizard step 1)
  const [selectedClass, setSelectedClass] = useState('');
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSubjects,  setFilteredSubjects]  = useState([]);

  // ── Delete Modal ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(), ...opts });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus)  params.set('status',  filterStatus);
      if (filterSection) params.set('section', filterSection);
      if (filterSubject) params.set('subject', filterSubject);
      if (filterDate)    params.set('date',    filterDate);
      const data = await api(`/academics/course-sessions/?${params.toString()}`);
      setSessions(data || []);
    } catch { setApiError('Failed to load sessions.'); }
  }, [api, filterStatus, filterSection, filterSubject, filterDate]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api('/accounts/academic-years/').catch(() => []),
      api('/students/classes/').catch(() => []),
      api('/students/sections/').catch(() => []),
      api('/academics/subjects/').catch(() => []),
      api('/accounts/users/?role=teacher').catch(() => []),
    ]).then(([ays, cls, secs, subs, tchs]) => {
      setAcademicYears(ays || []);
      setClasses(cls || []);
      setSections(secs || []);
      setSubjects(subs || []);
      setTeachers(tchs || []);
    }).finally(() => setLoading(false));
  }, [api]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── Cascade: class → sections & subjects ──────────────────────────────────
  useEffect(() => {
    if (selectedClass) {
      setFilteredSections(sections.filter(s => String(s.school_class) === String(selectedClass)));
      setFilteredSubjects(subjects.filter(s => String(s.school_class) === String(selectedClass)));
    } else {
      setFilteredSections([]);
      setFilteredSubjects([]);
    }
  }, [selectedClass, sections, subjects]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:     sessions.length,
    scheduled: sessions.filter(s => s.status === 'scheduled').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    cancelled: sessions.filter(s => s.status === 'cancelled').length,
  };

  // ── Open create wizard ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditSession(null);
    setForm(blankForm());
    setSelectedClass('');
    setStep(1);
    setFormError('');
    setShowModal(true);
  };

  // ── Open edit (skip to step 3 for quick edits, or full wizard) ───────────
  const openEdit = (session) => {
    setEditSession(session);
    setSelectedClass(
      classes.find(c => c.name === session.class_name)?.id || ''
    );
    setForm({
      academic_year: session.academic_year,
      section:       session.section,
      subject:       session.subject,
      teacher:       session.teacher || '',
      session_type:  session.session_type,
      title:         session.title || '',
      date:          session.date,
      start_time:    session.start_time,
      end_time:      session.end_time,
      notes:         session.notes || '',
      status:        session.status,
    });
    setStep(1);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditSession(null); };

  // ── Wizard navigation ─────────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 1) {
      if (!form.academic_year) { setFormError('Please select an academic year.'); return false; }
      if (!form.section)       { setFormError('Please select a section.');       return false; }
    }
    if (step === 2) {
      if (!form.subject) { setFormError('Please select a subject.'); return false; }
    }
    if (step === 3) {
      if (!form.date)       { setFormError('Please pick a date.');       return false; }
      if (!form.start_time) { setFormError('Please set a start time.');  return false; }
      if (!form.end_time)   { setFormError('Please set an end time.');   return false; }
      if (form.start_time >= form.end_time) { setFormError('End time must be after start time.'); return false; }
    }
    setFormError('');
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };
  const prevStep = () => { setFormError(''); setStep(s => s - 1); };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateStep()) return;
    setSaving(true);
    setFormError('');
    try {
      const body = { ...form };
      if (!body.teacher) delete body.teacher;
      if (!body.title)   delete body.title;
      if (!body.notes)   delete body.notes;

      if (editSession) {
        await api(`/academics/course-sessions/${editSession.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await api('/academics/course-sessions/', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      closeModal();
      loadSessions();
    } catch (e) {
      setFormError('Failed to save session. Please check all fields.');
    } finally {
      setSaving(false);
    }
  };

  // ── Quick status change ───────────────────────────────────────────────────
  const changeStatus = async (session, newStatus) => {
    try {
      await api(`/academics/course-sessions/${session.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadSessions();
    } catch { setApiError('Failed to update status.'); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/academics/course-sessions/${deleteTarget.id}/`, { method: 'DELETE' });
      setDeleteTarget(null);
      loadSessions();
    } catch { setApiError('Failed to delete session.'); }
     finally { setDeleting(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const filteredSessions = sessions.filter(s => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(search) ||
      (s.subject_name || '').toLowerCase().includes(search) ||
      (s.class_name || '').toLowerCase().includes(search) ||
      (s.teacher_name || '').toLowerCase().includes(search)
    );
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const left = new Date(`${a.date}T${a.start_time || '00:00'}`).getTime();
    const right = new Date(`${b.date}T${b.start_time || '00:00'}`).getTime();
    return left - right;
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcomingSession =
    sortedSessions.find((session) => session.date >= todayKey && session.status !== 'cancelled') ||
    sortedSessions[0] ||
    null;

  const activeFilterCount = [filterStatus, filterSection, filterSubject, filterDate].filter(Boolean).length;
  const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.heroBackdrop} />
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <div className={styles.heroEyebrow}>Academic Operations</div>
            <h1 className={styles.heroTitle}>Course Sessions Command Deck</h1>
            <p className={styles.heroText}>
              Schedule, track, and adjust every teaching block from one fast-moving academic workspace.
            </p>

            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}><Icon name="search" size={18} /></span>
              <input
                type="text"
                className={styles.headerSearch}
                placeholder="Search by title, teacher, class, or subject"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.heroActions}>
              <button className={styles.btnSecondary} onClick={loadSessions}>
                <Icon name="refresh" size={16} /> Refresh Board
              </button>
              <button id="create-session-btn" className={styles.createBtn} onClick={openCreate}>
                <Icon name="plus" size={16} /> Create Session
              </button>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.spotlightCard}>
              <div className={styles.spotlightLabel}>Next Up</div>
              {upcomingSession ? (
                <>
                  <div className={styles.spotlightTitle}>{upcomingSession.title || upcomingSession.subject_name}</div>
                  <div className={styles.spotlightMeta}>
                    <span>{formatDateLong(upcomingSession.date)}</span>
                    <span>{formatTime(upcomingSession.start_time)} - {formatTime(upcomingSession.end_time)}</span>
                  </div>
                  <div className={styles.spotlightRow}>
                    <span className={styles.spotlightChip}>{upcomingSession.class_name}</span>
                    <span className={styles.spotlightChipMuted}>{getSessionSectionLabel(upcomingSession)}</span>
                    <span className={`${styles.statusBadge} ${styles[upcomingSession.status]}`}>
                      {STATUS_LABELS[upcomingSession.status]}
                    </span>
                  </div>
                  <div className={styles.spotlightFooter}>
                    <div>
                      <div className={styles.spotlightFooterLabel}>Assigned Teacher</div>
                      <div className={styles.spotlightFooterValue}>{upcomingSession.teacher_name || 'To be assigned'}</div>
                    </div>
                    <button className={styles.quickEditBtn} onClick={() => openEdit(upcomingSession)}>
                      <Icon name="edit" size={14} /> Open
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.spotlightEmpty}>
                  <Icon name="calendar" size={22} />
                  <span>No upcoming sessions yet.</span>
                </div>
              )}
            </div>

            <div className={styles.heroMiniStats}>
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>Completion</span>
                <strong>{completionRate}%</strong>
              </div>
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>Live Filters</span>
                <strong>{activeFilterCount}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.statsGrid}>
        {[
          { label: 'Total Sessions', value: stats.total, icon: 'layers', cls: 'purple', hint: 'All listed blocks' },
          { label: 'Scheduled', value: stats.scheduled, icon: 'calendar', cls: 'blue', hint: 'Ready to deliver' },
          { label: 'Completed', value: stats.completed, icon: 'check', cls: 'green', hint: 'Wrapped successfully' },
          { label: 'Cancelled', value: stats.cancelled, icon: 'x', cls: 'red', hint: 'Removed from plan' },
        ].map(s => (
          <div className={styles.statCard} key={s.label}>
            <div className={styles.statGlow} />
            <div className={`${styles.statIcon} ${styles[s.cls]}`}><Icon name={s.icon} size={20} /></div>
            <div className={styles.statContent}>
              <div className={styles.label}>{s.label}</div>
              <div className={styles.value}>{s.value}</div>
              <div className={styles.statHint}>{s.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {apiError && <div className={styles.errorBanner}><Icon name="alert" size={14} /> {apiError}</div>}

      {/* Filters */}
      <div className={styles.filtersBar}>
        <select id="filter-status" className={styles.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select id="filter-section" className={styles.filterSelect} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
          <option value="">All Sections</option>
          {sections.map(s => (
            <option key={s.id} value={s.id}>
              {s.school_class_name || s.school_class} — {s.name}
            </option>
          ))}
        </select>
        <select id="filter-subject" className={styles.filterSelect} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          id="filter-date"
          type="date"
          className={styles.filterInput}
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
        />
        {(filterStatus || filterSection || filterSubject || filterDate) && (
          <button className={styles.clearBtn} onClick={() => { setFilterStatus(''); setFilterSection(''); setFilterSubject(''); setFilterDate(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          Loading sessions…
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className={styles.emptyState}>
          <Icon name="calendar" size={48} />
          <h3>No sessions found</h3>
          <p>{searchTerm ? 'No results for current search.' : 'Create your first course session using the "Add New" button above.'}</p>
        </div>
      ) : (
        <div className={styles.sessionsList}>
          {filteredSessions.map(session => {
            const d = new Date(session.date);
            return (
              <div className={styles.sessionCard} key={session.id} id={`session-card-${session.id}`}>
                <div
                  className={styles.sessionColorBar}
                  style={{ background: session.subject_color || '#7c3aed' }}
                />
                <div className={styles.sessionDateBlock}>
                  <div className={styles.dayNum}>{d.getDate()}</div>
                  <div className={styles.monthAbbr}>{MONTHS[d.getMonth()]}</div>
                </div>
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionTitle}>
                    {session.title || session.subject_name}
                  </div>
                  <div className={styles.sessionMeta}>
                    <span>{session.class_name} &mdash; {session.section_name?.split('—')[1]?.trim()}</span>
                    <span className={styles.metaDot}>·</span>
                    <span><Icon name="clock" size={11} /> {formatTime(session.start_time)} – {formatTime(session.end_time)}</span>
                    {session.teacher_name && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span><Icon name="users" size={11} /> {session.teacher_name}</span>
                      </>
                    )}
                    <span className={styles.typeBadge}>
                      {SESSION_TYPE_LABELS[session.session_type] || session.session_type}
                    </span>
                  </div>
                </div>
                <div className={styles.sessionActions}>
                  <span className={`${styles.statusBadge} ${styles[session.status]}`}>
                    {STATUS_LABELS[session.status]}
                  </span>
                  <select
                    id={`status-select-${session.id}`}
                    className={styles.statusSelect}
                    value={session.status}
                    onChange={e => changeStatus(session, e.target.value)}
                    title="Change status"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <button
                    id={`edit-session-${session.id}`}
                    className={styles.iconBtn}
                    title="Edit"
                    onClick={() => openEdit(session)}
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    id={`delete-session-${session.id}`}
                    className={`${styles.iconBtn} ${styles.delete}`}
                    title="Delete"
                    onClick={() => setDeleteTarget(session)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create / Edit Wizard Modal ─────────── */}
      {showModal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modal} role="dialog" aria-modal="true">

            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2>{editSession ? 'Edit Session' : 'New Course Session'}</h2>
              <button className={styles.modalClose} onClick={closeModal}><Icon name="x" size={14} /></button>
            </div>

            {/* Stepper */}
            <div className={styles.stepper}>
              {['Class & Year', 'Subject & Teacher', 'Session Details'].map((label, idx) => {
                const num   = idx + 1;
                const done  = step > num;
                const active = step === num;
                return (
                  <React.Fragment key={label}>
                    {idx > 0 && <div className={`${styles.stepLine} ${done || active ? (done ? styles.done : '') : ''}`} />}
                    <div className={`${styles.stepItem} ${active ? styles.active : ''} ${done ? styles.done : ''}`}>
                      <div className={styles.stepCircle}>
                        {done ? <Icon name="check" size={14} /> : num}
                      </div>
                      <span className={styles.stepLabel}>{label}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Form Error */}
            {formError && (
              <div style={{ padding: '0 1.75rem 0.75rem' }}>
                <div className={styles.errorBanner}><Icon name="alert" size={14} /> {formError}</div>
              </div>
            )}

            {/* ── Step 1: Class & Year ── */}
            {step === 1 && (
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label htmlFor="form-ay">Academic Year *</label>
                  <select
                    id="form-ay"
                    className={styles.formControl}
                    value={form.academic_year}
                    onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name || `${new Date(ay.start_date).getFullYear()}–${new Date(ay.end_date).getFullYear()}`}
                        {ay.is_active ? ' (Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="form-class">Class *</label>
                  <select
                    id="form-class"
                    className={styles.formControl}
                    value={selectedClass}
                    onChange={e => {
                      setSelectedClass(e.target.value);
                      setForm(f => ({ ...f, section: '', subject: '' }));
                    }}
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="form-section">Section *</label>
                  <select
                    id="form-section"
                    className={styles.formControl}
                    value={form.section}
                    onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                    disabled={!selectedClass}
                  >
                    <option value="">{selectedClass ? 'Select Section' : 'Select a class first'}</option>
                    {filteredSections.map(s => (
                      <option key={s.id} value={s.id}>Section {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 2: Subject & Teacher ── */}
            {step === 2 && (
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label htmlFor="form-subject">Subject *</label>
                  <select
                    id="form-subject"
                    className={styles.formControl}
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  >
                    <option value="">Select Subject</option>
                    {(filteredSubjects.length > 0 ? filteredSubjects : subjects).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="form-teacher">Assign Teacher (optional)</label>
                  <select
                    id="form-teacher"
                    className={styles.formControl}
                    value={form.teacher}
                    onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}
                  >
                    <option value="">— No teacher assigned —</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="form-title">Session Title (optional)</label>
                  <input
                    id="form-title"
                    type="text"
                    className={styles.formControl}
                    placeholder="e.g. Introduction to Algebra"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Session Details ── */}
            {step === 3 && (
              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="form-date">Date *</label>
                    <input
                      id="form-date"
                      type="date"
                      className={styles.formControl}
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="form-type">Session Type *</label>
                    <select
                      id="form-type"
                      className={styles.formControl}
                      value={form.session_type}
                      onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}
                    >
                      {SESSION_TYPES.map(t => (
                        <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="form-start">Start Time *</label>
                    <input
                      id="form-start"
                      type="time"
                      className={styles.formControl}
                      value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="form-end">End Time *</label>
                    <input
                      id="form-end"
                      type="time"
                      className={styles.formControl}
                      value={form.end_time}
                      onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                {editSession && (
                  <div className={styles.formGroup}>
                    <label htmlFor="form-status">Status</label>
                    <select
                      id="form-status"
                      className={styles.formControl}
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="form-notes">Notes (optional)</label>
                  <textarea
                    id="form-notes"
                    className={styles.formControl}
                    rows={3}
                    placeholder="Any additional notes about this session…"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <div>
                {step > 1 && (
                  <button className={styles.btnSecondary} onClick={prevStep}>← Back</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={styles.btnSecondary} onClick={closeModal}>Cancel</button>
                {step < 3 ? (
                  <button id="wizard-next-btn" className={styles.btnPrimary} onClick={nextStep}>
                    Next →
                  </button>
                ) : (
                  <button
                    id="wizard-save-btn"
                    className={styles.btnPrimary}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : editSession ? 'Save Changes' : 'Create Session'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ──────────── */}
      {deleteTarget && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget && !deleting) setDeleteTarget(null); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 style={{ color: '#f87171' }}>Delete Session</h2>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)} disabled={deleting}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className={styles.deleteConfirm}>
              <p>
                Are you sure you want to delete the session{' '}
                <strong>&ldquo;{deleteTarget.title || deleteTarget.subject_name}&rdquo;</strong>{' '}
                on <strong>{deleteTarget.date}</strong>? This action cannot be undone.
              </p>
              <div className={styles.deleteBtns}>
                <button className={styles.btnSecondary} onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </button>
                <button id="confirm-delete-btn" className={styles.btnDanger} onClick={confirmDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
