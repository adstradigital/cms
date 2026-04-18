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
  Shield,
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

  const [newAlloc, setNewAlloc] = useState({ subject: '', section: '', teacher: '', substitute_teacher: '', academic_year: '' });
  const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '', school_classes: forcedClassId ? [forcedClassId] : [], weekly_periods: 5 });
  const [selectedSectionStats, setSelectedSectionStats] = useState(0);
  const [showAllTeachers, setShowAllTeachers] = useState(false);
  const [isViewingAllocations, setIsViewingAllocations] = useState(false);
  const [subjectForAllocations, setSubjectForAllocations] = useState(null);

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

  const groupedSubjects = useMemo(() => {
    const groups = {};
    filteredSubjects.forEach(s => {
      if (!groups[s.name]) {
        groups[s.name] = {
          id: s.id,
          name: s.name,
          code: s.code,
          description: s.description,
          instances: [],
          total_sections: 0,
        };
      }
      groups[s.name].instances.push(s);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredSubjects]);

  const scopedSections = useMemo(() => {
    if (isSectionScoped) {
      return sections.filter((s) => Number(s.id) === sectionId);
    }
    if (!selectedClassId) return sections;
    return sections.filter((s) => String(s.school_class || s.school_class_id) === String(selectedClassId));
  }, [isSectionScoped, sectionId, sections, selectedClassId]);

  const filteredTeachers = useMemo(() => {
    if (showAllTeachers || !newAlloc.subject) return teachers;
    const selectedSubId = Number(newAlloc.subject);
    const qualified = teachers.filter(t => 
      Array.isArray(t.teaching_subject_ids) && t.teaching_subject_ids.includes(selectedSubId)
    );
    return qualified.length > 0 ? qualified : teachers;
  }, [teachers, newAlloc.subject, showAllTeachers]);

  const qualifiedCount = useMemo(() => {
    if (!newAlloc.subject) return 0;
    const selectedSubId = Number(newAlloc.subject);
    return teachers.filter(t => 
      Array.isArray(t.teaching_subject_ids) && t.teaching_subject_ids.includes(selectedSubId)
    ).length;
  }, [teachers, newAlloc.subject]);

  const openAllocationModal = (subjectId, allocation = null) => {
    if (allocation) {
      setEditingAllocation(allocation);
      setNewAlloc({
        subject: allocation.subject,
        section: allocation.section,
        teacher: allocation.teacher || '',
        substitute_teacher: allocation.substitute_teacher || '',
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
        teacher: '',
        substitute_teacher: '',
        academic_year: prev.academic_year || '',
      }));
      setSelectedSectionStats(isSectionScoped ? (scopedSectionObj?.student_count || 0) : 0);
    }
    setIsAssigning(true);
  };
  
  const openSubjectAllocations = (subject) => {
    setSubjectForAllocations(subject);
    setIsViewingAllocations(true);
  };

  const saveAllocation = async () => {
    if (!newAlloc.subject || (!isSectionScoped && !newAlloc.section) || !newAlloc.academic_year || !newAlloc.teacher) {
      alert('Please select class, academic year, and a primary teacher.');
      return;
    }
    const payload = {
      subject: Number(newAlloc.subject),
      section: Number(isSectionScoped ? sectionId : newAlloc.section),
      academic_year: Number(newAlloc.academic_year),
      teacher: Number(newAlloc.teacher),
      substitute_teacher: newAlloc.substitute_teacher ? Number(newAlloc.substitute_teacher) : null,
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
      {groupedSubjects.map((group) => {
        const allSubjectIds = group.instances.map(i => i.id);
        const groupAllocations = allocations.filter(a => allSubjectIds.includes(a.subject));
        
        // Calculate average progress across all instances
        let totalProgress = 0;
        group.instances.forEach(ins => {
          const insAllocs = groupAllocations.filter(a => a.subject === ins.id);
          if (insAllocs.length > 0) {
            totalProgress += insAllocs.reduce((acc, a) => acc + getAllocationProgress(a, ins.id), 0) / insAllocs.length;
          }
        });
        const averageProgress = group.instances.length > 0 ? Math.round(totalProgress / group.instances.length) : 0;

        return (
          <div key={group.name} className={styles.card} style={{ cursor: 'pointer', borderTop: '4px solid var(--color-primary)' }} onClick={() => openSubjectAllocations(group.instances[0])}>
            <div className={styles.cardHeader}>
              <div className={styles.subjectIcon} style={{ borderRadius: '12px', background: 'var(--color-primary-light)' }}>
                {group.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className={styles.cardInfo} style={{ flex: 1, marginLeft: 16 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 2 }}>{group.name}</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--theme-text-muted)', fontWeight: 700 }}>{group.code}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: '#f1f5f9',
                    color: '#475569',
                    borderRadius: 20,
                    padding: '1px 8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {group.instances.length} Grade{group.instances.length !== 1 ? 's' : ''}
                  </span>
                  {groupAllocations.length > 0 && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background: 'var(--color-primary)',
                      color: 'white',
                      borderRadius: 20,
                      padding: '1px 8px'
                    }}>
                      {groupAllocations.length} Section{groupAllocations.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); setIsAddingSubject(true); setNewSubject(prev => ({ ...prev, name: group.name, code: group.code })); }} title="Add to more classes"><Plus size={16} /></button>
              </div>
            </div>

            <div className={styles.teacherBox} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Active Classes ({group.instances.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.instances.map(ins => (
                    <div key={ins.id} style={{ 
                      fontSize: 10, 
                      fontWeight: 700, 
                      padding: '4px 8px', 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {ins.school_class_name || `Class ${ins.school_class}`}
                      {canDeleteSubject && (
                        <Trash2 
                          size={10} 
                          style={{ color: '#ef4444', cursor: 'pointer', marginLeft: 4 }} 
                          onClick={(e) => { e.stopPropagation(); handleDeleteSubject(ins.id); }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.progressSection} style={{ marginTop: 16 }}>
              <div className={styles.progressHeader}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Overall Curriculum Progress</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{averageProgress}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${averageProgress}%` }}></div>
              </div>
            </div>

            <div className={styles.lessonInfo} style={{ border: 'none', background: 'transparent', padding: 0 }}>
              <BarChart2 size={14} color="var(--color-warning)" />
              <span style={{ fontSize: 11 }}>Active across all grades</span>
            </div>

            <button
              className={`${styles.btn} ${styles.primary}`}
              style={{ width: '100%', justifyContent: 'center', marginTop: 12, borderRadius: '10px' }}
              onClick={(e) => {
                e.stopPropagation();
                openSubjectAllocations(group.instances[0]);
              }}
            >
              Manage Subject
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
            <th className={styles.th}>Mapped Grades</th>
            <th className={styles.th}>Total Sections</th>
            <th className={styles.th}>Progress</th>
            <th className={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {groupedSubjects.map((group) => {
            const allSubjectIds = group.instances.map(i => i.id);
            const groupAllocations = allocations.filter(a => allSubjectIds.includes(a.subject));
            
            // Average progress
            let totalP = 0;
            group.instances.forEach(ins => {
              const insAllocs = groupAllocations.filter(a => a.subject === ins.id);
              if (insAllocs.length > 0) {
                totalP += insAllocs.reduce((acc, a) => acc + getAllocationProgress(a, ins.id), 0) / insAllocs.length;
              }
            });
            const avgP = group.instances.length > 0 ? Math.round(totalP / group.instances.length) : 0;

            return (
              <tr key={group.name}>
                <td className={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className={styles.avatar} style={{ background: 'var(--color-primary-light)', color: 'white', fontWeight: 700, borderRadius: 8 }}>{group.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{group.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>{group.code}</div>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {group.instances.map(ins => (
                      <span key={ins.id} style={{ fontSize: 10, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        {ins.school_class_name || `Class ${ins.school_class}`}
                      </span>
                    ))}
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.badge} style={{ background: 'var(--color-primary)', color: 'white' }}>
                    {groupAllocations.length} Section{groupAllocations.length !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className={styles.progressBar} style={{ flex: 1, minWidth: 80 }}><div className={styles.progressFill} style={{ width: `${avgP}%` }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 12 }}>{avgP}%</span>
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className={styles.iconBtn} title="Manage" onClick={() => openSubjectAllocations(group.instances[0])}><BookOpen size={16} /></button>
                    <button className={styles.iconBtn} title="Add to Classes" onClick={() => { setIsAddingSubject(true); setNewSubject(p => ({ ...p, name: group.name, code: group.code })); }}><Plus size={16} /></button>
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
          <div className={styles.filters}>
            <button 
              className={`${styles.iconBtn} ${view === 'grid' ? styles.iconBtnActive : ''}`} 
              onClick={() => handleSetView('grid')}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={`${styles.iconBtn} ${view === 'list' ? styles.iconBtnActive : ''}`} 
              onClick={() => handleSetView('list')}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
          <button className={`${styles.btn} ${styles.primary}`} onClick={() => setIsAddingSubject(true)}>
            <Plus size={18} /> Add Subject
          </button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Section Teacher</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#64748b' }}>
                    <input 
                      type="checkbox" 
                      checked={showAllTeachers} 
                      onChange={(e) => setShowAllTeachers(e.target.checked)}
                    />
                    Show all staff
                  </label>
                </div>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8, marginTop: 0 }}>
                  One teacher per section. Different sections can have different teachers.
                </p>
                <select 
                  className={styles.select} 
                  style={{ width: '100%' }} 
                  value={newAlloc.teacher} 
                  onChange={(e) => setNewAlloc((prev) => ({ ...prev, teacher: e.target.value }))}
                >
                  <option value="">-- Select primary teacher --</option>
                  {filteredTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email} ({t.subject_specialty || 'General'})
                    </option>
                  ))}
                </select>
                {!showAllTeachers && qualifiedCount > 0 && (
                  <p style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
                    Showing {qualifiedCount} qualified teachers for this subject.
                  </p>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Substitute Teacher (Optional)</label>
                <select 
                  className={styles.select} 
                  style={{ width: '100%' }} 
                  value={newAlloc.substitute_teacher} 
                  onChange={(e) => setNewAlloc((prev) => ({ ...prev, substitute_teacher: e.target.value }))}
                >
                  <option value="">-- No substitute --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id} disabled={String(t.id) === String(newAlloc.teacher)}>
                      {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email}
                    </option>
                  ))}
                </select>
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
                <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Select Class(es)</label>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: -4, marginBottom: 8 }}>Assign this subject to multiple grades at once</p>
                {!isSectionScoped ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxHeight: 150, overflowY: 'auto', padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    {classes.map((c) => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={newSubject.school_classes.includes(String(c.id))}
                          onChange={(e) => {
                            const cid = String(c.id);
                            const current = [...newSubject.school_classes];
                            if (e.target.checked) {
                              if (!current.includes(cid)) current.push(cid);
                            } else {
                              const idx = current.indexOf(cid);
                              if (idx > -1) current.splice(idx, 1);
                            }
                            setNewSubject({ ...newSubject, school_classes: current });
                          }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
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
                    if (newSubject.school_classes.length === 0) {
                      alert('Please select at least one class for this subject.');
                      return;
                    }
                    try {
                      setLoading(true);
                      const promises = newSubject.school_classes.map(cid => {
                        const payload = {
                          name: newSubject.name,
                          code: newSubject.code,
                          description: newSubject.description,
                          school_class: Number(cid),
                          weekly_periods: Number(newSubject.weekly_periods || 5),
                        };
                        return adminApi.createSubject(payload);
                      });
                      
                      const results = await Promise.all(promises);
                      const newSubs = results.map(r => r.data);
                      setSubjects((prev) => [...newSubs, ...prev]);
                      setIsAddingSubject(false);
                      setNewSubject({ name: '', code: '', description: '', school_classes: forcedClassId ? [forcedClassId] : [], weekly_periods: 5 });
                    } catch (err) {
                      alert(err?.response?.data?.error || 'One or more subject creations failed. Check for duplicate codes.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Create Global Subject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isViewingAllocations && subjectForAllocations && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 24, width: 700, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--color-primary)' }}>{subjectForAllocations.name} Master Control</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-text-muted)' }}>Manage the qualified teacher pool and section assignments</p>
              </div>
              <button className={styles.iconBtn} onClick={() => setIsViewingAllocations(false)}><X size={24} /></button>
            </div>

            {/* TEACHER POOL SECTION */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: '6px', background: 'var(--color-primary-light)', borderRadius: 8, color: 'white' }}><Shield size={18} /></div>
                <h4 style={{ margin: 0, fontSize: 16 }}>Qualified Teacher Pool</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 20, background: '#f1f5f9', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
                {teachers.filter(t => Array.isArray(t.teaching_subject_ids) && t.teaching_subject_ids.includes(subjectForAllocations.id)).length === 0 ? (
                  <div style={{ textAlign: 'center', width: '100%', padding: '10px 0', color: '#64748b', fontSize: 13 }}>
                    No teachers have been linked to this subject yet. Go to Staff Directory to add them.
                  </div>
                ) : (
                  teachers.filter(t => Array.isArray(t.teaching_subject_ids) && t.teaching_subject_ids.includes(subjectForAllocations.id)).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', padding: '8px 12px', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                      <div className={styles.avatar} style={{ width: 32, height: 32, fontSize: 12, background: 'var(--color-primary)' }}>
                        {(t.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{t.full_name}</span>
                        <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>{t.specialization || 'Qualified'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ALLOCATIONS SECTION */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: '6px', background: '#6366f1', borderRadius: 8, color: 'white' }}><BookOpen size={18} /></div>
                <h4 style={{ margin: 0, fontSize: 16 }}>Section Assignments</h4>
              </div>
              <div className={styles.tableWrapper} style={{ background: '#f8fafc', borderRadius: 16, padding: 8 }}>
                <table className={styles.table} style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12 }}>Section</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Current Teacher</th>
                      <th style={{ textAlign: 'center', padding: 12 }}>Status</th>
                      <th style={{ textAlign: 'right', padding: 12 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSubjectAllocations(subjectForAllocations.id).length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--theme-text-muted)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <AlertTriangle size={32} color="#94a3b8" />
                            <span>No sections have been assigned to this subject yet.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      getSubjectAllocations(subjectForAllocations.id).map((alloc) => (
                        <tr key={alloc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: 12, fontWeight: 700 }}>{alloc.section_name}</td>
                          <td style={{ padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className={styles.avatar} style={{ width: 28, height: 28, fontSize: 11, background: alloc.teacher_name ? 'var(--color-primary)' : '#e2e8f0' }}>
                                {(alloc.teacher_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span style={{ fontSize: 14 }}>{alloc.teacher_name || 'Not Assigned'}</span>
                            </div>
                          </td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            {alloc.teacher_name ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: 12 }}>ACTIVE</span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '4px 8px', borderRadius: 12 }}>UNASSIGNED</span>
                            )}
                          </td>
                          <td style={{ padding: 12, textAlign: 'right' }}>
                            <button className={styles.iconBtn} onClick={() => { setIsViewingAllocations(false); openAllocationModal(subjectForAllocations.id, alloc); }}>
                              <Edit3 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className={styles.btn} onClick={() => setIsViewingAllocations(false)}>Close Overview</button>
              <button className={`${styles.btn} ${styles.primary}`} onClick={() => { setIsViewingAllocations(false); openAllocationModal(subjectForAllocations.id); }}>
                <Plus size={16} /> Add New Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectCenter;
