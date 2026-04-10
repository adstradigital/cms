'use client';

import React, { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, FilePlus2, Loader2, Plus, Save, Share2 } from 'lucide-react';
import styles from './Marks.module.css';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { ToastStack, useToast } from '@/components/common/useToast';

const MarksView = ({ section }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exams, setExams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [results, setResults] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  const [examModalOpen, setExamModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [confirmStatsOpen, setConfirmStatsOpen] = useState(false);

  const [newExam, setNewExam] = useState({ name: '', exam_type: 'unit_test', academic_year: '', start_date: '', end_date: '' });
  const [newSchedule, setNewSchedule] = useState({ subject: '', date: '', start_time: '09:00', end_time: '10:00', max_marks: 100, pass_marks: 35, venue: '' });

  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const { toasts, push, dismiss } = useToast();

  const sectionClassId = section?.school_class || section?.school_class_id;

  const students = useMemo(() => {
    return (section?.students || []).length ? section.students : [];
  }, [section]);

  const resultsByStudentId = useMemo(() => {
    const map = new Map();
    for (const r of results) {
      map.set(r.student?.id || r.student_id, r);
    }
    return map;
  }, [results]);

  const [draft, setDraft] = useState({});

  const load = React.useCallback(async () => {
    if (!sectionClassId) return;
    try {
      setLoading(true);
      const [exRes, subjRes] = await Promise.all([
        adminApi.getExams({ class: sectionClassId }).catch(() => null),
        adminApi.getSubjects({ class: sectionClassId }).catch(() => null),
      ]);
      setExams(Array.isArray(exRes?.data) ? exRes.data : []);
      setSubjects(Array.isArray(subjRes?.data) ? subjRes.data : []);
      const yearsRes = await adminApi.getAcademicYears().catch(() => null);
      setAcademicYears(Array.isArray(yearsRes?.data) ? yearsRes.data : []);
    } catch {
      push('Could not load exams', 'error');
    } finally {
      setLoading(false);
    }
  }, [push, sectionClassId]);

  const loadSchedules = React.useCallback(async (examId) => {
    if (!examId) return;
    try {
      setLoading(true);
      const res = await adminApi.getExamSchedules(examId).catch(() => null);
      setSchedules(Array.isArray(res?.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResults = React.useCallback(async ({ examId, scheduleId }) => {
    if (!examId || !scheduleId || !section?.id) return;
    try {
      setLoading(true);
      const res = await adminApi.getExamResults({ exam: examId, section: section.id }).catch(() => null);
      const all = Array.isArray(res?.data) ? res.data : [];
      const filtered = all.filter((r) => Number(r.exam_schedule?.id || r.exam_schedule_id) === Number(scheduleId));
      setResults(filtered);
      setDraft({});
    } catch {
      push('Could not load marks', 'error');
    } finally {
      setLoading(false);
    }
  }, [push, section?.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!selectedExamId) return;
    loadSchedules(selectedExamId);
    setSelectedScheduleId('');
    setResults([]);
  }, [loadSchedules, selectedExamId]);

  React.useEffect(() => {
    if (!selectedExamId || !selectedScheduleId) return;
    loadResults({ examId: selectedExamId, scheduleId: selectedScheduleId });
  }, [loadResults, selectedExamId, selectedScheduleId]);

  const selectedExam = exams.find((e) => String(e.id) === String(selectedExamId));
  const selectedSchedule = schedules.find((s) => String(s.id) === String(selectedScheduleId));

  const loadSectionStudents = React.useCallback(async () => {
    if (!section?.id) return [];
    const res = await adminApi.getStudents({ section: section.id, is_active: 'true' }).catch(() => null);
    return Array.isArray(res?.data) ? res.data : [];
  }, [section?.id]);

  const [sectionStudents, setSectionStudents] = useState([]);
  React.useEffect(() => {
    if (!section?.id) return;
    (async () => {
      const data = await loadSectionStudents();
      setSectionStudents(data);
    })();
  }, [loadSectionStudents, section?.id]);

  const tableStudents = useMemo(() => sectionStudents, [sectionStudents]);

  const setDraftRow = (studentId, next) => {
    setDraft((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), ...next } }));
  };

  const effectiveMarks = (studentId) => {
    const d = draft[studentId];
    if (d && (d.is_absent || d.marks_obtained !== undefined)) return d;
    const existing = resultsByStudentId.get(studentId);
    return {
      marks_obtained: existing?.marks_obtained ?? '',
      is_absent: existing?.is_absent ?? false,
      remarks: existing?.remarks ?? '',
    };
  };

  const save = async () => {
    if (!selectedScheduleId || !selectedExamId) return;
    try {
      setSaving(true);
      const records = tableStudents.map((st) => {
        const row = effectiveMarks(st.id);
        return {
          student_id: st.id,
          exam_schedule_id: Number(selectedScheduleId),
          marks_obtained: row.is_absent ? null : row.marks_obtained === '' ? null : Number(row.marks_obtained),
          is_absent: !!row.is_absent,
          remarks: row.remarks || '',
        };
      });
      await adminApi.bulkSaveExamResults(records);
      push('Marks saved', 'success');
      await loadResults({ examId: selectedExamId, scheduleId: selectedScheduleId });
    } catch {
      push('Marks could not be saved', 'error');
    } finally {
      setSaving(false);
    }
  };

  const createExam = async () => {
    if (!newExam.name.trim() || !sectionClassId || !newExam.academic_year || !newExam.start_date || !newExam.end_date) return;
    try {
      setSaving(true);
      const payload = {
        name: newExam.name.trim(),
        exam_type: newExam.exam_type,
        school_class: sectionClassId,
        academic_year: Number(newExam.academic_year),
        start_date: newExam.start_date,
        end_date: newExam.end_date,
      };
      const res = await adminApi.createExam(payload);
      setExams((prev) => [res.data, ...prev]);
      setSelectedExamId(String(res.data.id));
      setExamModalOpen(false);
      setNewExam({ name: '', exam_type: 'unit_test', academic_year: '', start_date: '', end_date: '' });
      push('Exam created', 'success');
    } catch {
      push('Could not create exam', 'error');
    } finally {
      setSaving(false);
    }
  };

  const createSchedule = async () => {
    if (!selectedExamId || !newSchedule.subject || !newSchedule.date || !newSchedule.start_time || !newSchedule.end_time) return;
    try {
      setSaving(true);
      const payload = {
        subject: Number(newSchedule.subject),
        date: newSchedule.date,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        max_marks: Number(newSchedule.max_marks || 0),
        pass_marks: Number(newSchedule.pass_marks || 0),
        venue: newSchedule.venue || '',
      };
      const res = await adminApi.createExamSchedule(selectedExamId, payload);
      setSchedules((prev) => [...prev, res.data]);
      setScheduleModalOpen(false);
      setNewSchedule({ subject: '', date: '', start_time: '09:00', end_time: '10:00', max_marks: 100, pass_marks: 35, venue: '' });
      push('Subject schedule added', 'success');
    } catch {
      push('Could not add schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!selectedExamId) return;
    try {
      setSaving(true);
      await adminApi.publishExam(selectedExamId);
      push('Exam published', 'success');
      await load();
    } catch {
      push('Could not publish exam', 'error');
    } finally {
      setSaving(false);
    }
  };

  const calculateStats = async () => {
    if (!selectedExamId) return;
    try {
      setSaving(true);
      await adminApi.calculateExamStats(selectedExamId);
      push('Report cards calculated', 'success');
    } catch {
      push('Could not calculate stats', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>
            {section ? `${section.class_name} — Section ${section.name} Marks / Exams` : 'Marks / Exams'}
          </h2>
          <p className={styles.subtitle} style={{ marginTop: 6 }}>
            {section 
              ? `Class Teacher: ${section.class_teacher_name || 'Not assigned'} • Manage examinations and performance` 
              : 'Select a section from Dashboard first'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btn} onClick={() => setExamModalOpen(true)} disabled={!sectionClassId}>
            <Plus size={16} /> New Exam
          </button>
          <button className={styles.btn} onClick={() => setScheduleModalOpen(true)} disabled={!selectedExamId}>
            <FilePlus2 size={16} /> Add Subject
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving || !selectedScheduleId}>
            {saving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
            Save Marks
          </button>
          <button className={styles.btn} onClick={() => setConfirmStatsOpen(true)} disabled={!selectedExamId}>
            <BarChart3 size={16} /> Calculate
          </button>
          <button className={styles.btn} onClick={() => setConfirmPublishOpen(true)} disabled={!selectedExamId}>
            <Share2 size={16} /> Publish
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <select className={styles.select} value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
          <option value="">Select exam</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>{e.name || `Exam ${e.id}`}</option>
          ))}
        </select>
        <select className={styles.select} value={selectedScheduleId} onChange={(e) => setSelectedScheduleId(e.target.value)} disabled={!selectedExamId}>
          <option value="">Select subject schedule</option>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>{s.subject_name || s.subject?.name || `Subject ${s.subject}`}</option>
          ))}
        </select>
        <div className={styles.meta}>
          {selectedExam && <span className={styles.badge}>{selectedExam.is_published ? 'Published' : 'Draft'}</span>}
          {selectedSchedule && <span className={styles.badge}>Max: {selectedSchedule.max_marks}</span>}
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} />
            <b>Marks Entry</b>
          </div>
          {loading && (
            <div className={styles.loading}><Loader2 size={16} className={styles.spin} /> Loading...</div>
          )}
        </div>

        {!section?.id ? (
          <div className={styles.empty}>Select a section from Dashboard first.</div>
        ) : !selectedScheduleId ? (
          <div className={styles.empty}>Select an exam and subject to start entering marks.</div>
        ) : tableStudents.length === 0 ? (
          <div className={styles.empty}>No students found in this section.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  <th style={{ width: 140 }}>Marks</th>
                  <th style={{ width: 120 }}>Absent</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {tableStudents.map((st) => {
                  const row = effectiveMarks(st.id);
                  return (
                    <tr key={st.id}>
                      <td className={styles.mono}>{st.roll_number || '-'}</td>
                      <td><b>{st.user?.first_name} {st.user?.last_name}</b></td>
                      <td>
                        <input
                          className={styles.input}
                          type="number"
                          value={row.marks_obtained ?? ''}
                          disabled={!!row.is_absent}
                          onChange={(e) => setDraftRow(st.id, { marks_obtained: e.target.value })}
                        />
                      </td>
                      <td>
                        <label className={styles.checkRow}>
                          <input
                            type="checkbox"
                            checked={!!row.is_absent}
                            onChange={(e) => setDraftRow(st.id, { is_absent: e.target.checked })}
                          />
                          Absent
                        </label>
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          value={row.remarks ?? ''}
                          onChange={(e) => setDraftRow(st.id, { remarks: e.target.value })}
                          placeholder="Optional note"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {examModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setExamModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Create Exam</h3>
              <button className={styles.modalClose} onClick={() => setExamModalOpen(false)}>X</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label>Name</label>
                <input className={styles.input} value={newExam.name} onChange={(e) => setNewExam((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Unit Test 1" />
              </div>
              <div className={styles.formRow}>
                <label>Type</label>
                <select className={styles.select} value={newExam.exam_type} onChange={(e) => setNewExam((p) => ({ ...p, exam_type: e.target.value }))}>
                  <option value="unit_test">Unit Test</option>
                  <option value="mid_term">Mid Term</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="annual">Annual</option>
                  <option value="final">Final Exam</option>
                </select>
              </div>
              <div className={styles.formRow}>
                <label>Academic Year</label>
                <select className={styles.select} value={newExam.academic_year} onChange={(e) => setNewExam((p) => ({ ...p, academic_year: e.target.value }))}>
                  <option value="">Select academic year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <label>Start Date</label>
                <input className={styles.input} type="date" value={newExam.start_date} onChange={(e) => setNewExam((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>End Date</label>
                <input className={styles.input} type="date" value={newExam.end_date} onChange={(e) => setNewExam((p) => ({ ...p, end_date: e.target.value }))} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btn} onClick={() => setExamModalOpen(false)}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createExam} disabled={saving || !newExam.name.trim() || !newExam.academic_year || !newExam.start_date || !newExam.end_date}>
                  {saving ? <Loader2 size={16} className={styles.spin} /> : <Plus size={16} />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scheduleModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setScheduleModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Add Subject Schedule</h3>
              <button className={styles.modalClose} onClick={() => setScheduleModalOpen(false)}>X</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label>Subject</label>
                <select className={styles.select} value={newSchedule.subject} onChange={(e) => setNewSchedule((p) => ({ ...p, subject: e.target.value }))}>
                  <option value="">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <label>Date</label>
                <input className={styles.input} type="date" value={newSchedule.date} onChange={(e) => setNewSchedule((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>Start Time</label>
                <input className={styles.input} type="time" value={newSchedule.start_time} onChange={(e) => setNewSchedule((p) => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>End Time</label>
                <input className={styles.input} type="time" value={newSchedule.end_time} onChange={(e) => setNewSchedule((p) => ({ ...p, end_time: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>Max Marks</label>
                <input className={styles.input} type="number" value={newSchedule.max_marks} onChange={(e) => setNewSchedule((p) => ({ ...p, max_marks: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>Pass Marks</label>
                <input className={styles.input} type="number" value={newSchedule.pass_marks} onChange={(e) => setNewSchedule((p) => ({ ...p, pass_marks: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>Venue</label>
                <input className={styles.input} value={newSchedule.venue} onChange={(e) => setNewSchedule((p) => ({ ...p, venue: e.target.value }))} placeholder="Optional" />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btn} onClick={() => setScheduleModalOpen(false)}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createSchedule} disabled={saving || !newSchedule.subject || !newSchedule.date || !newSchedule.start_time || !newSchedule.end_time}>
                  {saving ? <Loader2 size={16} className={styles.spin} /> : <FilePlus2 size={16} />}
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmPublishOpen}
        title="Publish Exam"
        message="Publishing makes results visible to students/parents (via report cards)."
        confirmText="Publish"
        onCancel={() => setConfirmPublishOpen(false)}
        onConfirm={() => { setConfirmPublishOpen(false); publish(); }}
      />

      <ConfirmDialog
        open={confirmStatsOpen}
        title="Calculate Report Cards"
        message="This calculates totals, percentage, grade, and rank for this exam."
        confirmText="Calculate"
        onCancel={() => setConfirmStatsOpen(false)}
        onConfirm={() => { setConfirmStatsOpen(false); calculateStats(); }}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const Marks = ({ section }) => (
  <ErrorBoundary>
    <MarksView section={section} />
  </ErrorBoundary>
);

export default Marks;
