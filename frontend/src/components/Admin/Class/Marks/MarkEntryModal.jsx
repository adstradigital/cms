'use client';

import React, { useState, useEffect } from 'react';
import { X, User, BookOpen, BarChart2, Save, Loader2 } from 'lucide-react';
import styles from './MarkEntryModal.module.css';
import adminApi from '@/api/adminApi';

const MarkEntryModal = ({ isOpen, onClose, section, initialStudentId, exams, subjects, students, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    subjectId: '',
    examId: '',
    marks: '',
    isAbsent: false,
    remarks: ''
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        studentId: initialStudentId || '',
        subjectId: subjects[0]?.id || '',
        examId: exams[0]?.id || '',
        marks: '',
        isAbsent: false,
        remarks: ''
      });
    }
  }, [isOpen, initialStudentId, exams, subjects]);

  const handleSave = async () => {
    if (!form.studentId || !form.subjectId || !form.examId || (form.marks === '' && !form.isAbsent)) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      // We need to find the schedule for the combo of exam + subject
      // In this system, we fetch schedules per exam
      const schedRes = await adminApi.getExamSchedules(form.examId);
      const schedule = schedRes.data.find(s => (s.subject?.id || s.subject) === Number(form.subjectId));
      
      if (!schedule) {
        alert('No exam schedule found for this subject in the selected exam. Create one in the Marks tab first.');
        setLoading(false);
        return;
      }

      const payload = [{
        student_id: Number(form.studentId),
        exam_schedule_id: schedule.id,
        marks_obtained: form.isAbsent ? null : Number(form.marks),
        is_absent: form.isAbsent,
        remarks: form.remarks
      }];

      await adminApi.bulkSaveExamResults(payload);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save mark. Check if schedule exists.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Individual Mark Entry</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        <div className={styles.body}>
          <div className={styles.formGroup}>
            <label><User size={14} /> Student</label>
            <select 
              className={styles.select}
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            >
              <option value="">Select Student</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.user?.first_name} {s.user?.last_name} ({s.admission_number})</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Exam / Term</label>
            <select 
              className={styles.select}
              value={form.examId}
              onChange={(e) => setForm({ ...form, examId: e.target.value })}
            >
              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label><BookOpen size={14} /> Subject</label>
            <select 
              className={styles.select}
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            >
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label><BarChart2 size={14} /> Marks Obtained</label>
            <input 
              type="number" 
              className={styles.input} 
              placeholder="Enter marks"
              value={form.marks}
              onChange={(e) => setForm({ ...form, marks: e.target.value })}
              disabled={form.isAbsent}
            />
          </div>

          <label className={styles.checkRow}>
            <input 
              type="checkbox" 
              checked={form.isAbsent}
              onChange={(e) => setForm({ ...form, isAbsent: e.target.checked })}
            />
            Student was Absent
          </label>

          <div className={styles.formGroup}>
            <label>Remarks / Notes</label>
            <textarea 
              className={styles.input} 
              rows={3} 
              placeholder="Optional remarks..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
            {loading ? 'Saving...' : 'Save Mark'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkEntryModal;
