'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  BookOpen,
  Edit3,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import styles from './Subjects.module.css';
import adminApi from '@/api/adminApi';
import LessonPlanner from './LessonPlanner';
import { useAuth } from '@/context/AuthContext';

const SubjectCenter = ({ section = null }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isClassTeacher = user?.role === 'teacher' && section?.class_teacher === user?.id;
  const canDeleteSubject = isAdmin || isClassTeacher;

  const sectionId = section?.id ? Number(section.id) : null;
  const forcedClassId = section?.school_class ? String(section.school_class) : '';
  const isSectionScoped = Boolean(sectionId);
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('subjectViewMode') || 'grid';
    }
    return 'grid';
  });

  const handleSetView = (newView) => {
    setView(newView);
    localStorage.setItem('subjectViewMode', newView);
  };
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(forcedClassId);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);

  const [newAlloc, setNewAlloc] = useState({ subject: '', section: '', teachers: [], academic_year: '' });
  const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '', school_class: forcedClassId, weekly_periods: 5 });
  const [selectedSectionStats, setSelectedSectionStats] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const effectiveClassId = forcedClassId || selectedClassId;
      const subjectParams = effectiveClassId ? { school_class: effectiveClassId } : undefined;
      const allocationParams = isSectionScoped ? { section: sectionId } : undefined;
      const [subsRes, allocRes, plansRes, sectionsRes, teachersRes, yearsRes] = await Promise.all([
        adminApi.getSubjects(subjectParams),
        adminApi.getAllocations(allocationParams),
        adminApi.getLessonPlans(),
        adminApi.getSections(),
        adminApi.getUsers({ portal: 'admin' }),
        adminApi.getAcademicYears().catch(() => ({ data: [] })),
      ]);
      setSubjects(Array.isArray(subsRes.data) ? subsRes.data : []);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
      setLessonPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      const sectionRows = Array.isArray(sectionsRes.data) ? sectionsRes.data : [];
      setSections(sectionRows);
      const classMap = new Map();
      sectionRows.forEach((s) => {
        const cid = s.school_class || s.school_class_id;
        if (!cid) return;
        if (!classMap.has(cid)) {
          classMap.set(cid, { id: cid, name: s.class_name || `Class ${cid}` });
        }
      });
      const classList = Array.from(classMap.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
      if (forcedClassId && section?.class_name && !classList.find((c) => String(c.id) === String(forcedClassId))) {
        classList.push({ id: Number(forcedClassId), name: section.class_name });
      }
      setClasses(classList);
      setTeachers(Array.isArray(teachersRes.data) ? teachersRes.data : []);
      const years = Array.isArray(yearsRes.data) ? yearsRes.data : [];
      setAcademicYears(years);
      if (!newAlloc.academic_year && years.length > 0) {
        const activeYear = years.find((y) => y.is_active) || years[0];
        setNewAlloc((prev) => ({ ...prev, academic_year: activeYear.id }));
      }
    } catch (err) {
      console.error('Failed to fetch subjects data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, forcedClassId, sectionId]);

  useEffect(() => {
    if (!forcedClassId) return;
    setSelectedClassId(forcedClassId);
    setNewSubject((prev) => ({ ...prev, school_class: forcedClassId }));
    if (isSectionScoped) {
      setNewAlloc((prev) => ({ ...prev, section: sectionId }));
    }
  }, [forcedClassId, isSectionScoped, sectionId]);

  const subjectTopicMap = useMemo(() => {
    const map = {};
    subjects.forEach((subject) => {
      map[subject.id] = new Set(
        (subject.units || []).flatMap((unit) => (unit.chapters || []).flatMap((ch) => (ch.topics || []).map((t) => t.id)))
      );
    });
    return map;
  }, [subjects]);

  const topicTitleMap = useMemo(() => {
    const map = {};
    subjects.forEach((subject) => {
      (subject.units || []).forEach((unit) => {
        (unit.chapters || []).forEach((chapter) => {
          (chapter.topics || []).forEach((topic) => {
            map[topic.id] = topic.title;
          });
        });
      });
    });
    return map;
  }, [subjects]);

  const plansByAllocation = useMemo(() => {
    const grouped = {};
    lessonPlans.forEach((plan) => {
      const key = plan.allocation ?? 'master';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(plan);
    });
    return grouped;
  }, [lessonPlans]);

  const getSubjectAllocations = (subjectId) => allocations.filter((a) => a.subject === subjectId);

  const getAllocationProgress = (allocation, subjectId) => {
    if (allocation?.progress !== undefined && allocation?.progress !== null) return Number(allocation.progress) || 0;
    const topicIds = subjectTopicMap[subjectId] || new Set();
    const totalTopics = topicIds.size;
    if (totalTopics === 0) return 0;
    const allocPlans = plansByAllocation[allocation.id] || [];
    const completed = allocPlans.filter((plan) => topicIds.has(plan.topic) && plan.status === 'completed').length;
    return Math.round((completed / totalTopics) * 100);
  };

  const getCurrentTopicForAllocation = (allocation) => {
    const allocPlans = (plansByAllocation[allocation.id] || []).filter((plan) => plan.status === 'in_progress');
    if (allocPlans.length === 0) return 'No in-progress lesson';
    const sorted = [...allocPlans].sort((a, b) => {
      if (a.planned_date && b.planned_date) return String(b.planned_date).localeCompare(String(a.planned_date));
      if (a.planned_date) return -1;
      if (b.planned_date) return 1;
      return Number(b.id) - Number(a.id);
    });
    return topicTitleMap[sorted[0].topic] || 'In-progress topic';
  };

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q));
  }, [subjects, query]);

  const scopedSections = useMemo(() => {
    if (isSectionScoped) {
      return sections.filter((s) => Number(s.id) === sectionId);
    }
    if (!selectedClassId) return sections;
    return sections.filter((s) => String(s.school_class || s.school_class_id) === String(selectedClassId));
  }, [isSectionScoped, sectionId, sections, selectedClassId]);

  const openAllocationModal = (subjectId, allocation = null) => {
    if (allocation) {
      setEditingAllocation(allocation);
      setNewAlloc({
        subject: allocation.subject,
        section: allocation.section,
        teachers: allocation.teachers || [],
        academic_year: allocation.academic_year || '',
      });
      const sectionObj = sections.find((s) => s.id === allocation.section);
      setSelectedSectionStats(sectionObj?.student_count || 0);
    } else {
      setEditingAllocation(null);
      const scopedSectionObj = sections.find((s) => Number(s.id) === sectionId);
      setNewAlloc((prev) => ({
        ...prev,
        subject: subjectId,
        section: isSectionScoped ? sectionId : '',
        teachers: [],
        academic_year: prev.academic_year || '',
      }));
      setSelectedSectionStats(isSectionScoped ? (scopedSectionObj?.student_count || 0) : 0);
    }
    setIsAssigning(true);
  };

  const saveAllocation = async () => {
    if (!newAlloc.subject || (!isSectionScoped && !newAlloc.section) || !newAlloc.academic_year || newAlloc.teachers.length === 0) {
      alert('Please select class, academic year, and at least one teacher.');
      return;
    }
    const payload = {
      subject: Number(newAlloc.subject),
      section: Number(isSectionScoped ? sectionId : newAlloc.section),
      academic_year: Number(newAlloc.academic_year),
      teachers: newAlloc.teachers.map(Number),
    };
    try {
      if (editingAllocation) {
        const res = await adminApi.updateAllocation(editingAllocation.id, payload);
        setAllocations((prev) => prev.map((a) => (a.id === editingAllocation.id ? res.data : a)));
      } else {
        const res = await adminApi.createAllocation(payload);
        setAllocations((prev) => [res.data, ...prev]);
      }
      setIsAssigning(false);
      setEditingAllocation(null);
    } catch (err) {
      alert('Assignment failed.');
    }
  };

  const deleteAllocation = async (id) => {
    if (!window.confirm('Delete this allocation?')) return;
    const backup = allocations;
    setAllocations((prev) => prev.filter((a) => a.id !== id));
    try {
      await adminApi.deleteAllocation(id);
    } catch (err) {
      setAllocations(backup);
      alert('Failed to delete allocation.');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('WARNING: Deleting a subject will permanently remove all associated lesson plans, units, and chapters. Are you sure you want to proceed?')) return;
    
    try {
      await adminApi.deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      // Also cleanup allocations related to this subject
      setAllocations(prev => prev.filter(a => a.subject !== id));
    } catch (err) {
      alert('Failed to delete subject: ' + (err.response?.data?.error || err.message));
    }
  };

  const renderGridView = () => (
    <div className={styles.gridView}>
      {filteredSubjects.map((subject) => {
        const subjectAllocations = getSubjectAllocations(subject.id);
        const topAllocation = subjectAllocations[0];
        const progress = topAllocation ? getAllocationProgress(topAllocation, subject.id) : 0;
        const currentTopic = topAllocation ? getCurrentTopicForAllocation(topAllocation) : 'No in-progress lesson';

        return (
          <div key={subject.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.subjectIcon}>{subject.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</div>
              <div className={styles.cardInfo} style={{ flex: 1, marginLeft: 16 }}>
                <h3>{subject.name}</h3>
                <span>{subject.code}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className={styles.iconBtn} onClick={() => openAllocationModal(subject.id)} title="Assign to Class"><Plus size={16} /></button>
                {canDeleteSubject && (
                  <button 
                    className={styles.iconBtn} 
                    onClick={() => handleDeleteSubject(subject.id)} 
                    style={{ color: '#ef4444' }}
                    title="Delete Subject Master"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.teacherBox}>
              <div className={styles.avatar}>{(topAllocation?.teacher_names || 'A').split(',')[0].trim().split(' ').map((n) => n[0]).join('')}</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, color: 'var(--theme-text-muted)', fontWeight: 600 }}>Assigned Teacher(s)</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{topAllocation?.teacher_names || 'Not Assigned'}</span>
              </div>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span>Syllabus Progress</span>
                <span style={{ color: 'var(--color-primary)' }}>{progress}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>
                {topAllocation ? `${subjectAllocations.length} Classes Assigned` : 'No classes assigned yet'}
              </span>
            </div>

            <div className={styles.lessonInfo}>
              <BarChart2 size={14} color="var(--color-warning)" />
              <span>Currently Teaching: <b>{currentTopic}</b></span>
            </div>

            <button
              className={`${styles.btn} ${styles.outline}`}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={() => {
                setSelectedSubject(subject);
                setSelectedAllocation(topAllocation || null);
              }}
            >
              <BookOpen size={16} /> Lesson Plan
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className={styles.tableWrapper} style={{ background: 'white' }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Subject Name</th>
            <th className={styles.th}>Allocations</th>
            <th className={styles.th}>Overall Progress</th>
            <th className={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredSubjects.map((subject) => {
            const subjectAllocations = getSubjectAllocations(subject.id);
            const totalProgress = subjectAllocations.length > 0
              ? Math.round(subjectAllocations.reduce((acc, curr) => acc + getAllocationProgress(curr, subject.id), 0) / subjectAllocations.length)
              : 0;
            return (
              <tr key={subject.id}>
                <td className={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className={styles.avatar} style={{ background: 'var(--color-primary-light)', color: 'white', fontWeight: 700 }}>{subject.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{subject.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>{subject.code}</div>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {subjectAllocations.length > 0 ? subjectAllocations.map((a) => (
                      <span key={a.id} className={styles.badge} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--theme-border)', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {a.section_name} • {a.teacher_names}
                        <button className={styles.iconBtn} style={{ padding: 4 }} onClick={() => openAllocationModal(subject.id, a)}><Edit3 size={11} /></button>
                        <button className={styles.iconBtn} style={{ padding: 4, color: '#ef4444' }} onClick={() => deleteAllocation(a.id)}><Trash2 size={11} /></button>
                      </span>
                    )) : <span style={{ color: 'var(--theme-text-muted)', fontSize: 12 }}>Not Assigned</span>}
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className={styles.progressBar} style={{ flex: 1, minWidth: 100 }}><div className={styles.progressFill} style={{ width: `${totalProgress}%` }} /></div>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{totalProgress}%</span>
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className={styles.iconBtn} title="Lesson Plan" onClick={() => { setSelectedSubject(subject); setSelectedAllocation(subjectAllocations[0] || null); }}><BookOpen size={16} /></button>
                    <button className={styles.iconBtn} title="Assign to Class" onClick={() => openAllocationModal(subject.id)}><Plus size={16} /></button>
                    {canDeleteSubject && (
                      <button 
                        className={styles.iconBtn} 
                        style={{ color: '#ef4444' }} 
                        title="Delete Subject Master" 
                        onClick={() => handleDeleteSubject(subject.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>Subject & Syllabus Center</h2>
          <p>
            {isSectionScoped
              ? `Manage curriculum for ${section?.class_name || 'Class'} - ${section?.name || 'Section'}.`
              : 'Manage curriculum, lesson plans, and teacher allocations.'}
          </p>
        </div>
        <div className={styles.actionRow}>
          <div className={styles.filters} style={{ marginRight: 12 }}>
            <button className={styles.iconBtn} onClick={() => handleSetView('grid')} style={{ background: view === 'grid' ? 'var(--color-primary)' : 'white', color: view === 'grid' ? 'white' : 'inherit' }}><LayoutGrid size={18} /></button>
            <button className={styles.iconBtn} onClick={() => handleSetView('list')} style={{ background: view === 'list' ? 'var(--color-primary)' : 'white', color: view === 'list' ? 'white' : 'inherit' }}><List size={18} /></button>
          </div>
          <button className={`${styles.btn} ${styles.primary}`} onClick={() => setIsAddingSubject(true)}><Plus size={18} /> Add Subject</button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input type="text" placeholder="Search subjects..." className={styles.searchInput} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className={styles.filters}>
          {!isSectionScoped ? (
            <select
              className={styles.select}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <div className={styles.select} style={{ minWidth: 260, display: 'flex', alignItems: 'center' }}>
              {section?.class_name || 'Class'} - {section?.name || 'Section'}
            </div>
          )}
          <button className={`${styles.btn} ${styles.outline}`}><Filter size={18} /> Filters</button>
        </div>
      </div>

      {loading ? <div className={styles.emptyState}>Loading...</div> : view === 'grid' ? renderGridView() : renderListView()}

      {selectedSubject && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => { setSelectedSubject(null); setSelectedAllocation(null); }}>
          <div style={{ width: '80%', height: '100%', background: '#f8fafc', overflowY: 'auto', boxShadow: '-10px 0 50px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <LessonPlanner subject={selectedSubject} allocation={selectedAllocation} onClose={() => { setSelectedSubject(null); setSelectedAllocation(null); fetchData(); }} />
          </div>
        </div>
      )}

      {isAssigning && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 28, borderRadius: 24, width: 520, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>{editingAllocation ? 'Edit Allocation' : 'Assign to Class'}</h3>
              <button className={styles.iconBtn} onClick={() => setIsAssigning(false)} style={{ border: 'none' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Select Class</label>
                {!isSectionScoped ? (
                  <select className={styles.select} style={{ width: '100%' }} value={newAlloc.section} onChange={(e) => { const sid = Number(e.target.value); setNewAlloc((prev) => ({ ...prev, section: sid })); const sectionObj = sections.find((s) => s.id === sid); setSelectedSectionStats(sectionObj?.student_count || 0); }}>
                    <option value="">-- Choose a class --</option>
                    {scopedSections.map((s) => <option key={s.id} value={s.id}>{s.class_name} - {s.name}</option>)}
                  </select>
                ) : (
                  <input className={styles.searchInput} readOnly style={{ width: '100%', paddingLeft: 12 }} value={`${section?.class_name || ''} - ${section?.name || ''}`} />
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Academic Year</label>
                <select className={styles.select} style={{ width: '100%' }} value={newAlloc.academic_year} onChange={(e) => setNewAlloc((prev) => ({ ...prev, academic_year: Number(e.target.value) }))}>
                  <option value="">-- Select year --</option>
                  {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name || y.label || `Year ${y.id}`}{y.is_active ? ' (Active)' : ''}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Teacher(s)</label>
                <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 10, maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {teachers.map((t) => {
                    const checked = newAlloc.teachers.includes(t.id);
                    const fullName = t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || `User ${t.id}`;
                    return (
                      <label key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setNewAlloc((prev) => ({
                              ...prev,
                              teachers: e.target.checked ? [...prev.teachers, t.id] : prev.teachers.filter((id) => id !== t.id),
                            }));
                          }}
                        />
                        <span style={{ display: 'flex', flexDirection: 'column' }}>
                          <b>{fullName}</b>
                          <small style={{ color: '#64748b' }}>{t.subject_specialty || t.specialty || 'General'}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Enrolled Students</label>
                <input readOnly className={styles.searchInput} style={{ width: '100%', paddingLeft: 16, background: '#f8fafc' }} value={selectedSectionStats} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingAllocation && (
                  <button className={styles.btn} style={{ color: '#ef4444', border: '1px solid #ef4444' }} onClick={() => { deleteAllocation(editingAllocation.id); setIsAssigning(false); }}>
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                <button className={styles.btn} onClick={() => setIsAssigning(false)} style={{ background: 'none' }}>Cancel</button>
                <button className={`${styles.btn} ${styles.purple}`} style={{ padding: '10px 24px' }} onClick={saveAllocation}>
                  {editingAllocation ? 'Save Changes' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddingSubject && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 24, width: 450 }}>
            <h3>Create New Subject Master</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Subject Name</label>
                <input className={styles.searchInput} style={{ width: '100%', paddingLeft: 12, marginTop: 4 }} placeholder="e.g. Advanced Mathematics" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Subject Code</label>
                <input className={styles.searchInput} style={{ width: '100%', paddingLeft: 12, marginTop: 4 }} placeholder="e.g. MATH-401" value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Description (Optional)</label>
                <textarea className={styles.searchInput} style={{ width: '100%', paddingLeft: 12, marginTop: 4, minHeight: 80, paddingTop: 10 }} placeholder="General syllabus overview..." value={newSubject.description} onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Class</label>
                {!isSectionScoped ? (
                  <select
                    className={styles.select}
                    style={{ width: '100%', marginTop: 4 }}
                    value={newSubject.school_class}
                    onChange={(e) => setNewSubject({ ...newSubject, school_class: e.target.value })}
                  >
                    <option value="">-- Select class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input className={styles.searchInput} readOnly style={{ width: '100%', paddingLeft: 12, marginTop: 4 }} value={section?.class_name || ''} />
                )}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Weekly Periods</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={styles.searchInput}
                  style={{ width: '100%', paddingLeft: 12, marginTop: 4 }}
                  value={newSubject.weekly_periods}
                  onChange={(e) => setNewSubject({ ...newSubject, weekly_periods: Number(e.target.value || 1) })}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button className={styles.btn} onClick={() => setIsAddingSubject(false)} style={{ flex: 1 }}>Cancel</button>
                <button
                  className={`${styles.btn} ${styles.primary}`}
                  style={{ flex: 1 }}
                  onClick={async () => {
                    if (!newSubject.school_class) {
                      alert('Please select class for this subject.');
                      return;
                    }
                    try {
                      const payload = {
                        ...newSubject,
                        school_class: Number(newSubject.school_class),
                        weekly_periods: Number(newSubject.weekly_periods || 5),
                      };
                      const res = await adminApi.createSubject(payload);
                      setSubjects((prev) => [res.data, ...prev]);
                      setIsAddingSubject(false);
                      setNewSubject({ name: '', code: '', description: '', school_class: forcedClassId || '', weekly_periods: 5 });
                    } catch (err) {
                      alert(err?.response?.data?.error || 'Creation failed. Check class and subject code.');
                    }
                  }}
                >
                  Create Master
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectCenter;
