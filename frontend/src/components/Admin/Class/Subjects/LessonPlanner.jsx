'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, BookOpen, Plus, Edit3, Edit2, Trash2, CheckCircle, Circle,
  Lock, Copy, CalendarDays, GripVertical
} from 'lucide-react';
import styles from './Subjects.module.css';
import adminApi from '@/api/adminApi';

const clone = (v) => JSON.parse(JSON.stringify(v));
const reorder = (arr, from, to) => {
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
};

const LessonPlanner = ({ subject, allocation, onClose }) => {
  const [units, setUnits] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [dragMeta, setDragMeta] = useState(null);
  const [month, setMonth] = useState(new Date());
  const [isLocked, setIsLocked] = useState(false);

  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isAddingChapter, setIsAddingChapter] = useState(null);
  const [isAddingTopic, setIsAddingTopic] = useState(null);
  const [isAddingPlan, setIsAddingPlan] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newPlanInfo, setNewPlanInfo] = useState({ description: '', planned_date: '' });
  const [editTitle, setEditTitle] = useState('');

  const fetchSyllabus = async () => {
    try {
      setLoading(true);
      const [unitsRes, plansRes] = await Promise.all([
        adminApi.getSyllabusUnits({ subject: subject.id }),
        adminApi.getLessonPlans(allocation ? { allocation: allocation.id } : { master: true }),
      ]);
      setUnits(Array.isArray(unitsRes.data) ? unitsRes.data : []);
      const map = {};
      (plansRes.data || []).forEach((p) => { map[p.topic] = p; });
      setPlans(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.id, allocation?.id]);

  const allTopics = useMemo(() => units.flatMap(u => (u.chapters || []).flatMap(c => c.topics || [])), [units]);
  const topicById = useMemo(() => {
    const m = {};
    allTopics.forEach((t) => { m[t.id] = t; });
    return m;
  }, [allTopics]);

  const progressPercent = useMemo(() => {
    const total = allTopics.length;
    if (!total) return 0;
    const done = allTopics.filter((t) => plans[t.id]?.status === 'completed').length;
    return Math.round((done / total) * 100);
  }, [allTopics, plans]);

  const plannedByDate = useMemo(() => {
    const m = {};
    Object.values(plans).forEach((p) => {
      if (!p.planned_date) return;
      if (!m[p.planned_date]) m[p.planned_date] = [];
      m[p.planned_date].push(topicById[p.topic]?.title || 'Topic');
    });
    return m;
  }, [plans, topicById]);

  const savePlan = async () => {
    if (isLocked) return;
    const tid = isAddingPlan;
    if (!tid) return;
    const prev = plans[tid];
    const optimistic = {
      ...(prev || {}),
      allocation: allocation?.id || null,
      topic: tid,
      status: prev?.status || 'pending',
      description: newPlanInfo.description,
      planned_date: newPlanInfo.planned_date || null,
    };
    setPlans((p) => ({ ...p, [tid]: optimistic }));
    setIsAddingPlan(null);
    try {
      const res = await adminApi.saveLessonPlan({ ...optimistic, title: 'Plan' });
      setPlans((p) => ({ ...p, [tid]: res.data }));
    } catch {
      setPlans((p) => ({ ...p, [tid]: prev }));
      alert('Failed to save plan');
    }
  };

  const toggleStatus = async (topicId) => {
    if (isLocked) return;
    if (!allocation) return;
    const old = plans[topicId];
    const nextStatus = old?.status === 'completed' ? 'pending' : 'completed';
    setPlans((p) => ({ ...p, [topicId]: { ...(old || {}), topic: topicId, allocation: allocation.id, status: nextStatus } }));
    try {
      const res = await adminApi.saveLessonPlan({
        allocation: allocation.id,
        topic: topicId,
        status: nextStatus,
        description: old?.description || '',
        planned_date: old?.planned_date || null,
        title: 'Plan',
      });
      setPlans((p) => ({ ...p, [topicId]: res.data }));
    } catch {
      setPlans((p) => ({ ...p, [topicId]: old }));
      alert('Failed to update status');
    }
  };

  const deleteNode = async (type, id) => {
    if (isLocked) return;
    if (!window.confirm(`Delete this ${type}?`)) return;
    const backupUnits = clone(units);
    const backupPlans = clone(plans);
    if (type === 'unit') setUnits((prev) => prev.filter((u) => u.id !== id));
    if (type === 'chapter') setUnits((prev) => prev.map((u) => ({ ...u, chapters: (u.chapters || []).filter((c) => c.id !== id) })));
    if (type === 'topic') {
      setUnits((prev) => prev.map((u) => ({ ...u, chapters: (u.chapters || []).map((c) => ({ ...c, topics: (c.topics || []).filter((t) => t.id !== id) })) })));
      setPlans((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
    try {
      if (type === 'unit') await adminApi.deleteSyllabusUnit(id);
      if (type === 'chapter') await adminApi.deleteSyllabusChapter(id);
      if (type === 'topic') await adminApi.deleteSyllabusTopic(id);
    } catch {
      setUnits(backupUnits);
      setPlans(backupPlans);
      alert('Delete failed, reverted');
    }
  };

  const saveEditTitle = async () => {
    if (isLocked) return;
    if (!editingItem || !editTitle.trim()) return;
    const { type, item } = editingItem;
    const backup = clone(units);
    if (type === 'unit') setUnits((prev) => prev.map((u) => (u.id === item.id ? { ...u, title: editTitle } : u)));
    if (type === 'chapter') setUnits((prev) => prev.map((u) => ({ ...u, chapters: (u.chapters || []).map((c) => (c.id === item.id ? { ...c, title: editTitle } : c)) })));
    if (type === 'topic') setUnits((prev) => prev.map((u) => ({ ...u, chapters: (u.chapters || []).map((c) => ({ ...c, topics: (c.topics || []).map((t) => (t.id === item.id ? { ...t, title: editTitle } : t)) })) })));
    setEditingItem(null);
    try {
      if (type === 'unit') await adminApi.updateSyllabusUnit(item.id, { title: editTitle });
      if (type === 'chapter') await adminApi.updateSyllabusChapter(item.id, { title: editTitle });
      if (type === 'topic') await adminApi.updateSyllabusTopic(item.id, { title: editTitle });
    } catch {
      setUnits(backup);
      alert('Update failed, reverted');
    }
  };

  const persistOrder = async (type, items) => {
    await Promise.all(items.map((it, i) => {
      if (type === 'unit') return adminApi.updateSyllabusUnit(it.id, { order: i + 1 });
      if (type === 'chapter') return adminApi.updateSyllabusChapter(it.id, { order: i + 1 });
      return adminApi.updateSyllabusTopic(it.id, { order: i + 1 });
    }));
  };

  const onDropReorder = async (type, target) => {
    if (isLocked) return;
    if (!dragMeta || dragMeta.type !== type) return;
    if (JSON.stringify(dragMeta.parent) !== JSON.stringify(target.parent)) return;
    if (dragMeta.index === target.index) return;
    const backup = clone(units);
    try {
      if (type === 'unit') {
        const ordered = reorder(units, dragMeta.index, target.index);
        setUnits(ordered);
        await persistOrder('unit', ordered);
      }
      if (type === 'chapter') {
        setUnits((prev) => prev.map((u) => {
          if (u.id !== target.parent.unitId) return u;
          const ordered = reorder(u.chapters || [], dragMeta.index, target.index);
          persistOrder('chapter', ordered).catch(() => setUnits(backup));
          return { ...u, chapters: ordered };
        }));
      }
      if (type === 'topic') {
        setUnits((prev) => prev.map((u) => ({
          ...u,
          chapters: (u.chapters || []).map((c) => {
            if (c.id !== target.parent.chapterId) return c;
            const ordered = reorder(c.topics || [], dragMeta.index, target.index);
            persistOrder('topic', ordered).catch(() => setUnits(backup));
            return { ...c, topics: ordered };
          }),
        })));
      }
    } catch {
      setUnits(backup);
    } finally {
      setDragMeta(null);
    }
  };

  const createUnit = async () => {
    if (isLocked) return;
    if (!newUnitTitle.trim()) return;
    const tempId = Date.now() * -1;
    setUnits((prev) => [...prev, { id: tempId, title: newUnitTitle, chapters: [], order: prev.length + 1 }]);
    setIsAddingUnit(false); setNewUnitTitle('');
    try {
      const res = await adminApi.createSyllabusUnit({ subject: subject.id, title: newUnitTitle, order: units.length + 1 });
      setUnits((prev) => prev.map((u) => (u.id === tempId ? { ...res.data, chapters: [] } : u)));
    } catch {
      setUnits((prev) => prev.filter((u) => u.id !== tempId));
    }
  };

  const createChapter = async () => {
    if (isLocked) return;
    if (!newChapterTitle.trim() || !isAddingChapter) return;
    const tempId = Date.now() * -1;
    setUnits((prev) => prev.map((u) => u.id === isAddingChapter ? { ...u, chapters: [...(u.chapters || []), { id: tempId, title: newChapterTitle, topics: [] }] } : u));
    const targetUnit = isAddingChapter;
    setIsAddingChapter(null); setNewChapterTitle('');
    try {
      const res = await adminApi.createSyllabusChapter({ unit: targetUnit, title: newChapterTitle });
      setUnits((prev) => prev.map((u) => u.id === targetUnit ? { ...u, chapters: (u.chapters || []).map((c) => c.id === tempId ? { ...res.data, topics: [] } : c) } : u));
    } catch {
      setUnits((prev) => prev.map((u) => u.id === targetUnit ? { ...u, chapters: (u.chapters || []).filter((c) => c.id !== tempId) } : u));
    }
  };

  const createTopic = async () => {
    if (isLocked) return;
    if (!newTopicTitle.trim() || !isAddingTopic) return;
    const chapterId = isAddingTopic;
    const tempId = Date.now() * -1;
    setUnits((prev) => prev.map((u) => ({ ...u, chapters: (u.chapters || []).map((c) => c.id === chapterId ? { ...c, topics: [...(c.topics || []), { id: tempId, title: newTopicTitle }] } : c) })));
    setIsAddingTopic(null); setNewTopicTitle('');
    try {
      const res = await adminApi.createSyllabusTopic({ chapter: chapterId, title: newTopicTitle });
      setUnits((prev) => prev.map((u) => ({ ...u, chapters: (u.chapters || []).map((c) => c.id === chapterId ? { ...c, topics: (c.topics || []).map((t) => t.id === tempId ? res.data : t) } : c) })));
    } catch {
      setUnits((prev) => prev.map((u) => ({ ...u, chapters: (u.chapters || []).map((c) => c.id === chapterId ? { ...c, topics: (c.topics || []).filter((t) => t.id !== tempId) } : c) })));
    }
  };

  const cloneMasterTemplate = async () => {
    if (!allocation) return;
    try {
      const masterRes = await adminApi.getLessonPlans({ master: true });
      const masterPlans = Array.isArray(masterRes.data) ? masterRes.data : [];
      const responses = await Promise.all(allTopics.map((t) => {
        const mp = masterPlans.find((p) => p.topic === t.id);
        return adminApi.saveLessonPlan({
          allocation: allocation.id,
          topic: t.id,
          title: 'Plan',
          status: mp?.status || 'pending',
          description: mp?.description || '',
          planned_date: mp?.planned_date || null,
        });
      }));
      const map = {};
      responses.forEach((r) => { map[r.data.topic] = r.data; });
      setPlans(map);
      alert('Template copied to this allocation');
    } catch {
      alert('Clone failed');
    }
  };

  const monthMeta = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const offset = (start.getDay() + 6) % 7;
    const rows = Math.ceil((offset + end.getDate()) / 7) * 7;
    return { end, offset, rows };
  }, [month]);

  if (loading) return <div className={styles.emptyState}>Loading syllabus...</div>;

  return (
    <div className={styles.plannerWrapper}>
      <button className={styles.backBtn} onClick={onClose}><ArrowLeft size={16} /> Back to Class List</button>

      <div className={styles.heroCard}>
        <div className={styles.heroInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <BookOpen size={18} color="var(--color-primary-light)" />
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>{allocation?.section_name || 'Global Template'}</span>
          </div>
          <h2>{subject.name}</h2>
          <p>Lesson Planning & Syllabus Management</p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.btn} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} onClick={cloneMasterTemplate} disabled={!allocation}><Copy size={16} /> Copy Master Template</button>
          <button className={styles.btn} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => setIsLocked((v) => !v)}><Lock size={16} /> {isLocked ? 'Unlock Syllabus' : 'Lock Syllabus'}</button>
          <div className={styles.completionBadge}><span>Completion</span><b>{progressPercent}%</b></div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--theme-border)', borderRadius: 16, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarDays size={16} /> Planning Calendar</b>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.iconBtn} onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>Prev</button>
            <button className={styles.iconBtn} onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>Next</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {Array.from({ length: monthMeta.rows }).map((_, idx) => {
            const dayNum = idx - monthMeta.offset + 1;
            const inMonth = dayNum > 0 && dayNum <= monthMeta.end.getDate();
            const dateStr = inMonth ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : '';
            const items = plannedByDate[dateStr] || [];
            return <div key={idx} style={{ minHeight: 56, border: '1px solid #e2e8f0', borderRadius: 8, padding: 6, opacity: inMonth ? 1 : 0.45 }}><div style={{ fontSize: 11 }}>{inMonth ? dayNum : ''}</div>{items.slice(0, 1).map((t, i) => <div key={i} style={{ fontSize: 10, marginTop: 4, background: '#eef2ff', borderRadius: 4, padding: '1px 4px' }}>{t}</div>)}{items.length > 1 && <div style={{ fontSize: 10, marginTop: 4 }}>+{items.length - 1}</div>}</div>;
          })}
        </div>
      </div>

      {units.map((unit, uIdx) => (
        <div key={unit.id} style={{ marginBottom: 30 }} draggable onDragStart={() => setDragMeta({ type: 'unit', index: uIdx, parent: {} })} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropReorder('unit', { index: uIdx, parent: {} })}>
          <div className={styles.unitTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GripVertical size={14} /> Unit {uIdx + 1}: {unit.title}</span>
            <div style={{ display: 'flex', gap: 8 }}><button className={styles.iconBtn} onClick={() => { setEditingItem({ type: 'unit', item: unit }); setEditTitle(unit.title); }}><Edit2 size={12} /></button><button className={styles.iconBtn} onClick={() => deleteNode('unit', unit.id)} style={{ color: '#ef4444' }}><Trash2 size={12} /></button></div>
          </div>

          {(unit.chapters || []).map((chapter, cIdx) => (
            <div key={chapter.id} className={styles.chapterCard} draggable onDragStart={() => setDragMeta({ type: 'chapter', index: cIdx, parent: { unitId: unit.id } })} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropReorder('chapter', { index: cIdx, parent: { unitId: unit.id } })}>
              <div className={styles.chapterHeader}><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><GripVertical size={12} /><b>Chapter {cIdx + 1}: {chapter.title}</b><button className={styles.iconBtn} style={{ opacity: 0.35, padding: 2 }} onClick={() => { setEditingItem({ type: 'chapter', item: chapter }); setEditTitle(chapter.title); }}><Edit2 size={10} /></button><button className={styles.iconBtn} style={{ opacity: 0.35, padding: 2, color: '#ef4444' }} onClick={() => deleteNode('chapter', chapter.id)}><Trash2 size={10} /></button></div><button className={styles.iconBtn} style={{ padding: 4 }} onClick={() => setIsAddingTopic(chapter.id)}><Plus size={14} /></button></div>
              <div className={styles.topicList}>
                {(chapter.topics || []).map((topic, tIdx) => {
                  const plan = plans[topic.id];
                  const done = plan?.status === 'completed';
                  return <div key={topic.id} className={`${styles.topicRow} ${done ? styles.topicCompleted : ''}`} draggable onDragStart={() => setDragMeta({ type: 'topic', index: tIdx, parent: { chapterId: chapter.id } })} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropReorder('topic', { index: tIdx, parent: { chapterId: chapter.id } })}>
                    <div className={styles.topicMain}><div className={styles.topicLabel}><GripVertical size={12} /><button onClick={() => toggleStatus(topic.id)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>{done ? <CheckCircle size={22} color="var(--color-success)" fill="#dcfce7" /> : <Circle size={22} color="#cbd5e1" />}</button><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><b>Topic {tIdx + 1}: {topic.title}</b><button className={styles.iconBtn} style={{ opacity: 0.3, padding: 2 }} onClick={() => { setEditingItem({ type: 'topic', item: topic }); setEditTitle(topic.title); }}><Edit2 size={10} /></button><button className={styles.iconBtn} style={{ opacity: 0.3, padding: 2, color: '#ef4444' }} onClick={() => deleteNode('topic', topic.id)}><Trash2 size={10} /></button></div></div><button className={`${styles.btn} ${styles.outline}`} style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { setNewPlanInfo({ description: plan?.description || '', planned_date: plan?.planned_date || '' }); setIsAddingPlan(topic.id); }}><Edit3 size={14} /> {(plan || !allocation) ? 'Planning' : 'Add Plan'}</button></div>
                    <div className={styles.noteBox}><span>{plan?.description || (allocation ? 'No delivery notes added.' : 'Assign to class to enable specific planning.')}</span></div>
                  </div>;
                })}
              </div>
            </div>
          ))}
          <button className={`${styles.btn} ${styles.outline}`} style={{ marginTop: 12, borderStyle: 'dotted', fontSize: 12, width: '100%', justifyContent: 'center' }} onClick={() => setIsAddingChapter(unit.id)}><Plus size={14} /> Add Chapter</button>
        </div>
      ))}

      {units.length === 0 && <div className={styles.emptyState}><h3>No Syllabus Found</h3><button className={`${styles.btn} ${styles.primary}`} onClick={() => setIsAddingUnit(true)}><Plus size={18} /> Create First Unit</button></div>}
      {units.length > 0 && <button className={`${styles.btn} ${styles.outline}`} style={{ width: '100%', borderStyle: 'dashed', justifyContent: 'center', marginTop: 24 }} onClick={() => setIsAddingUnit(true)}><Plus size={18} /> Add New Unit</button>}

      {isAddingUnit && <SimpleModal title="Add Unit" value={newUnitTitle} setValue={setNewUnitTitle} onCancel={() => setIsAddingUnit(false)} onSave={createUnit} />}
      {isAddingChapter && <SimpleModal title="Add Chapter" value={newChapterTitle} setValue={setNewChapterTitle} onCancel={() => setIsAddingChapter(null)} onSave={createChapter} />}
      {isAddingTopic && <SimpleModal title="Add Topic" value={newTopicTitle} setValue={setNewTopicTitle} onCancel={() => setIsAddingTopic(null)} onSave={createTopic} />}

      {isAddingPlan && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 24, width: 450 }}>
            <h3>Lesson Planning Details</h3>
            <input type="date" className={styles.searchInput} style={{ width: '100%', paddingLeft: 12, marginTop: 12 }} value={newPlanInfo.planned_date} onChange={(e) => setNewPlanInfo({ ...newPlanInfo, planned_date: e.target.value })} />
            <textarea className={styles.searchInput} style={{ width: '100%', paddingLeft: 12, marginTop: 12, minHeight: 100, paddingTop: 10 }} value={newPlanInfo.description} onChange={(e) => setNewPlanInfo({ ...newPlanInfo, description: e.target.value })} placeholder="Delivery notes..." />
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}><button className={styles.btn} onClick={() => setIsAddingPlan(null)} style={{ flex: 1 }}>Cancel</button><button className={`${styles.btn} ${styles.primary}`} style={{ flex: 1 }} onClick={savePlan}>Save Plan</button></div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 24, width: 400 }}>
            <h3 style={{ textTransform: 'capitalize' }}>Edit {editingItem.type}</h3>
            <input className={styles.searchInput} style={{ width: '100%', paddingLeft: 12, marginTop: 16 }} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}><button className={styles.btn} onClick={() => setEditingItem(null)} style={{ flex: 1 }}>Cancel</button><button className={`${styles.btn} ${styles.primary}`} style={{ flex: 1 }} onClick={saveEditTitle}>Save Changes</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const SimpleModal = ({ title, value, setValue, onCancel, onSave }) => (
  <div className={styles.modalOverlay} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: 'white', padding: 32, borderRadius: 24, width: 400 }}>
      <h3>{title}</h3>
      <input className={styles.searchInput} style={{ width: '100%', paddingLeft: 12, marginTop: 16 }} value={value} onChange={(e) => setValue(e.target.value)} />
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}><button className={styles.btn} onClick={onCancel} style={{ flex: 1 }}>Cancel</button><button className={`${styles.btn} ${styles.primary}`} style={{ flex: 1 }} onClick={onSave}>Save</button></div>
    </div>
  </div>
);

export default LessonPlanner;
