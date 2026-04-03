'use client';

import React, { useMemo, useState } from 'react';
import { Briefcase, Clock, Edit3, Plus, Trash2, Eye } from 'lucide-react';
import styles from '../Class.module.css';
import adminApi from '@/api/adminApi';
import instance from '@/api/instance';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { ToastStack, useToast } from '@/components/common/useToast';

let assignmentsCache = {};

const AssignmentsView = ({ section }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignments, setAssignments] = useState(assignmentsCache[section?.id]?.assignments || []);
  const [subjects, setSubjects] = useState(assignmentsCache[section?.id]?.subjects || []);
  const [loading, setLoading] = useState(!assignmentsCache[section?.id]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submissionModal, setSubmissionModal] = useState({ open: false, assignment: null });
  const [submissions, setSubmissions] = useState([]);
  const [gradingDraft, setGradingDraft] = useState({});

  const { toasts, push, dismiss } = useToast();

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = section ? { section: section.id } : {};
      const response = await adminApi.getAssignments(params);
      const list = Array.isArray(response.data) ? response.data : [];
      setAssignments(list);
      assignmentsCache[section?.id || 'all'] = { ...(assignmentsCache[section?.id || 'all'] || {}), assignments: list };
    } catch {
      push('Failed to fetch assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const params = section ? { school_class: section.school_class } : {};
      const res = await adminApi.getSubjects(params);
      const list = Array.isArray(res.data) ? res.data : [];
      setSubjects(list);
      assignmentsCache[section?.id || 'all'] = { ...(assignmentsCache[section?.id || 'all'] || {}), subjects: list };
    } catch {
      push('Failed to load subjects', 'error');
    }
  };

  React.useEffect(() => {
    fetchAssignments();
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id]);

  const filtered = useMemo(() => assignments.filter((a) => (activeTab === 'all' ? true : a.is_project === (activeTab === 'projects'))), [assignments, activeTab]);

  const openCreate = () => {
    setModalMode('create');
    setEditingAssignment(null);
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setModalMode('edit');
    setEditingAssignment(item);
    setIsModalOpen(true);
  };

  const saveAssignment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.set('section', section.id);
    try {
      if (modalMode === 'edit' && editingAssignment) {
        await adminApi.updateAssignment(editingAssignment.id, formData);
        push('Assignment updated', 'success');
      } else {
        await adminApi.createAssignment(formData);
        push('Assignment created', 'success');
      }
      setIsModalOpen(false);
      fetchAssignments();
    } catch {
      push('Failed to save assignment', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const backup = assignments;
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    setDeleteTarget(null);
    try {
      await adminApi.deleteAssignment(id);
      push('Assignment deleted', 'success');
    } catch {
      setAssignments(backup);
      push('Failed to delete assignment', 'error');
    }
  };

  const openSubmissions = async (assignment) => {
    setSubmissionModal({ open: true, assignment });
    try {
      const res = await instance.get(`/academics/assignments/${assignment.id}/submissions/`).catch(() => null);
      let list = Array.isArray(res?.data) ? res.data : [];
      if (!list.length && section?.id) {
        const students = await adminApi.getStudents({ section: section.id }).catch(() => ({ data: [] }));
        list = (students.data || []).map((s) => ({
          id: `fallback-${s.id}`,
          student: s.id,
          student_name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || s.admission_number,
          submitted: false,
          marks: null,
          feedback: '',
        }));
      }
      setSubmissions(list);
      const draft = {};
      list.forEach((row) => {
        draft[row.id] = { marks: row.marks ?? '', feedback: row.feedback ?? '' };
      });
      setGradingDraft(draft);
    } catch {
      push('Could not load submissions', 'error');
    }
  };

  const saveGrades = async () => {
    if (!submissionModal.assignment) return;
    try {
      const payload = Object.entries(gradingDraft).map(([submissionId, val]) => ({ submission_id: submissionId, marks: val.marks, feedback: val.feedback }));
      await instance.post(`/academics/assignments/${submissionModal.assignment.id}/grade/`, { grades: payload }).catch(() => null);
      push('Grades saved', 'success');
      setSubmissionModal({ open: false, assignment: null });
    } catch {
      push('Failed to save grades', 'error');
    }
  };

  return (
    <div className={styles.assignmentsWrapper}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`} onClick={() => setActiveTab('all')}>All Work</button>
          <button className={`${styles.tab} ${activeTab === 'assignments' ? styles.tabActive : ''}`} onClick={() => setActiveTab('assignments')}>Assignments</button>
          <button className={`${styles.tab} ${activeTab === 'projects' ? styles.tabActive : ''}`} onClick={() => setActiveTab('projects')}>Projects</button>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}><Plus size={18} /> Create New</button>
      </div>

      <div className={styles.grid}>
        {loading ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 30 }}>Loading...</div> : null}
        {!loading && filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: 'var(--theme-surface)', borderRadius: 20, border: '1px dashed var(--theme-border)' }}>
            <Briefcase size={48} style={{ color: 'var(--theme-text-muted)', marginBottom: 16 }} strokeWidth={1} />
            <p style={{ color: 'var(--theme-text-secondary)' }}>No assignments found for this section.</p>
          </div>
        ) : filtered.map((item) => (
          <div key={item.id} className={styles.card} style={{ borderLeft: `4px solid ${item.is_project ? 'var(--color-warning)' : 'var(--color-secondary)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className={`${styles.badge} ${item.is_project ? styles.warning : styles.info}`} style={{ background: item.is_project ? 'var(--color-warning-light)' : 'var(--color-secondary-light)', color: 'white', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{item.is_project ? 'PROJECT' : 'ASSIGNMENT'}</span>
              <span style={{ fontSize: 12, color: 'var(--theme-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Due {new Date(item.due_date).toLocaleDateString()}</span>
            </div>
            <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>{item.title}</h3>
            <p className={styles.subtitle} style={{ marginBottom: 16, fontSize: 13 }}>{item.subject_name} • {item.section_name}</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: '6px 10px', borderRadius: 8 }} onClick={() => openSubmissions(item)}><Eye size={14} /> View Submissions</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--theme-text-secondary)' }}>
                <div className={styles.avatar} style={{ width: 24, height: 24, fontSize: 10, background: 'var(--color-primary-light)' }}>{(item.teacher_name || 'A').split(' ').map((n) => n[0]).join('')}</div>
                {item.teacher_name || 'Admin'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: 6, borderRadius: 8 }} onClick={() => openEdit(item)}><Edit3 size={14} /></button>
                <button className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: 6, borderRadius: 8, color: 'var(--color-danger)' }} onClick={() => setDeleteTarget(item)}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 500 }}>
            <div className={styles.modalHeader}>
              <h2>{modalMode === 'edit' ? 'Edit' : 'Create New'} {activeTab === 'projects' ? 'Project' : 'Assignment'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form className={styles.modalForm} onSubmit={saveAssignment}>
              <div className={styles.formGroup}><label>Title</label><input name="title" placeholder="e.g. Algebra Worksheet" defaultValue={editingAssignment?.title || ''} required /></div>
              <div className={styles.formGroup}><label>Subject</label><select name="subject" defaultValue={editingAssignment?.subject || ''} required><option value="">Select Subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className={styles.formGroup} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label>Due Date</label><input type="date" name="due_date" defaultValue={editingAssignment?.due_date?.slice(0, 10) || ''} required /></div>
                <div><label>Type</label><select name="is_project" defaultValue={String(editingAssignment?.is_project ?? (activeTab === 'projects'))}><option value="false">Assignment</option><option value="true">Project</option></select></div>
              </div>
              <div className={styles.formGroup}><label>Reference File (Optional)</label><input type="file" name="file" /></div>
              <div className={styles.formGroup}><label>Description/Instructions</label><textarea name="description" rows="4" defaultValue={editingAssignment?.description || ''}></textarea></div>
              <div className={styles.modalActions}><button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsModalOpen(false)}>Cancel</button><button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>{modalMode === 'edit' ? 'Save Changes' : 'Publish to Section'}</button></div>
            </form>
          </div>
        </div>
      )}

      {submissionModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 860 }}>
            <div className={styles.modalHeader}><h2>Submissions: {submissionModal.assignment?.title}</h2><button className={styles.closeBtn} onClick={() => setSubmissionModal({ open: false, assignment: null })}>×</button></div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className={styles.table}>
                <thead><tr><th className={styles.th}>Student</th><th className={styles.th}>Status</th><th className={styles.th}>Marks</th><th className={styles.th}>Feedback</th></tr></thead>
                <tbody>
                  {submissions.map((row) => (
                    <tr key={row.id}>
                      <td className={styles.td}>{row.student_name || row.student}</td>
                      <td className={styles.td}>{row.submitted ? 'Submitted' : 'Pending'}</td>
                      <td className={styles.td}><input style={{ width: 90, padding: 6 }} value={gradingDraft[row.id]?.marks ?? ''} onChange={(e) => setGradingDraft((p) => ({ ...p, [row.id]: { ...(p[row.id] || {}), marks: e.target.value } }))} /></td>
                      <td className={styles.td}><input style={{ width: '100%', padding: 6 }} value={gradingDraft[row.id]?.feedback ?? ''} onChange={(e) => setGradingDraft((p) => ({ ...p, [row.id]: { ...(p[row.id] || {}), feedback: e.target.value } }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.modalActions} style={{ marginTop: 16 }}><button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setSubmissionModal({ open: false, assignment: null })}>Close</button><button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveGrades}>Save Grades</button></div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assignment"
        message={`Delete "${deleteTarget?.title || ''}"? This action cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const Assignments = (props) => (
  <ErrorBoundary>
    <AssignmentsView {...props} />
  </ErrorBoundary>
);

export default Assignments;
