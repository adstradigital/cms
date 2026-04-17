"use client";
import React, { useState, useEffect } from 'react';
import { Save, Send, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './MarksEntry.module.css';

export default function MarksEntryTab() {
  const [exams, setExams] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState({
    exam_id: '',
    section_id: '',
    subject_id: ''
  });

  const [studentsData, setStudentsData] = useState([]);
  const [scheduleInfo, setScheduleInfo] = useState(null);

  // Fetch initial filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [examRes, sectionRes, subjectRes] = await Promise.all([
          adminApi.getExams(),
          adminApi.getSections(),
          adminApi.getSubjects()
        ]);
        setExams(examRes.data || []);
        setSections(sectionRes.data || []);
        setSubjects(subjectRes.data || []);
      } catch (error) {
        console.error("Error fetching filters:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFilters();
  }, []);

  // Fetch student marks when selection changes
  useEffect(() => {
    if (!selection.exam_id || !selection.section_id || !selection.subject_id) {
      setStudentsData([]);
      setScheduleInfo(null);
      return;
    }

    const fetchMarksData = async () => {
      setLoading(true);
      try {
        // 1. Get schedule info for max marks
        const scheduleRes = await adminApi.getExamSchedules(selection.exam_id);
        const currentSchedule = scheduleRes.data?.find(s => s.subject === parseInt(selection.subject_id));
        setScheduleInfo(currentSchedule || null);

        // 2. Get students and results
        const [studentRes, resultRes] = await Promise.all([
          adminApi.getStudents({ section: selection.section_id }),
          adminApi.getExamResults({ exam: selection.exam_id, section: selection.section_id })
        ]);

        const students = studentRes.data || [];
        const results = resultRes.data || [];

        // 3. Merge data
        const merged = students.map(student => {
          const result = results.find(r => r.student === student.id && r.subject_name === currentSchedule?.subject_name);
          return {
            id: student.id,
            roll: student.admission_number,
            name: `${student.user?.first_name} ${student.user?.last_name}`,
            theory_marks: result?.theory_marks || '',
            internal_marks: result?.internal_marks || '',
            is_absent: result?.is_absent || false,
            remarks: result?.remarks || '',
            grade: result?.grade || '-',
            marks_obtained: result?.marks_obtained || 0,
            hasChanged: false
          };
        });

        setStudentsData(merged);
      } catch (error) {
        console.error("Error fetching marks data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarksData();
  }, [selection]);

  const handleMarkChange = (studentId, field, value) => {
    setStudentsData(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      
      const next = { ...s, [field]: value, hasChanged: true };
      
      // Basic auto-total calculation for UI
      if (field === 'theory_marks' || field === 'internal_marks') {
        const t = parseFloat(field === 'theory_marks' ? value : s.theory_marks) || 0;
        const i = parseFloat(field === 'internal_marks' ? value : s.internal_marks) || 0;
        next.marks_obtained = t + i;
      }

      // Check max marks validation
      if (scheduleInfo) {
        if (field === 'theory_marks' && parseFloat(value) > scheduleInfo.max_theory_marks) next.error = true;
        else if (field === 'internal_marks' && parseFloat(value) > scheduleInfo.max_internal_marks) next.error = true;
        else next.error = false;
      }
      
      return next;
    }));
  };

  const handleSave = async (isSubmit = false) => {
    if (!scheduleInfo) {
      alert("No exam schedule found for this subject. Please schedule the exam first.");
      return;
    }

    setSaving(true);
    try {
      const records = studentsData.filter(s => s.hasChanged).map(s => ({
        student_id: s.id,
        exam_schedule_id: scheduleInfo.id,
        theory_marks: s.theory_marks === '' ? null : s.theory_marks,
        internal_marks: s.internal_marks === '' ? null : s.internal_marks,
        is_absent: s.is_absent,
        remarks: s.remarks
      }));

      if (records.length === 0) {
        alert("No changes to save.");
        setSaving(false);
        return;
      }

      await adminApi.bulkSaveExamResults(records);
      
      // If submitting, maybe do something else, but for now just refresh
      alert(isSubmit ? "Marks submitted successfully!" : "Progress saved as draft.");
      
      // Refresh to get grades from server
      const resultRes = await adminApi.getExamResults({ exam: selection.exam_id, section: selection.section_id });
      fetchResults(resultRes.data);
    } catch (error) {
      alert("Error saving marks: " + (error.response?.data?.error || "Check your max marks and try again."));
    } finally {
      setSaving(false);
    }
  };

  const fetchResults = (freshResults) => {
    setStudentsData(prev => prev.map(student => {
      const result = freshResults.find(r => r.student === student.id && r.subject_name === scheduleInfo?.subject_name);
      if (!result) return { ...student, hasChanged: false };
      return {
        ...student,
        theory_marks: result.theory_marks || '',
        internal_marks: result.internal_marks || '',
        marks_obtained: result.marks_obtained,
        grade: result.grade,
        is_absent: result.is_absent,
        remarks: result.remarks,
        hasChanged: false
      };
    }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <select 
          className={styles.select} 
          value={selection.exam_id}
          onChange={e => setSelection({...selection, exam_id: e.target.value})}
        >
          <option value="">Select Examination</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select 
          className={styles.select}
          value={selection.section_id}
          onChange={e => setSelection({...selection, section_id: e.target.value})}
        >
          <option value="">Select Class & Section</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.class_name} - {s.name}</option>)}
        </select>
        <select 
          className={styles.select}
          value={selection.subject_id}
          onChange={e => setSelection({...selection, subject_id: e.target.value})}
        >
          <option value="">Select Subject</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '16px', opacity: 0.5 }}>Loading student records...</p>
          </div>
        ) : studentsData.length > 0 ? (
          <>
            <div className={styles.toolbar}>
              <div>
                <div className={styles.tTitle}>
                  {subjects.find(s => s.id == selection.subject_id)?.name} Marks Entry
                </div>
                {scheduleInfo ? (
                  <div className={styles.tSub}>
                    Theory Max: {scheduleInfo.max_theory_marks} | 
                    Internal Max: {scheduleInfo.max_internal_marks} | 
                    Passing: {scheduleInfo.pass_marks}%
                  </div>
                ) : (
                  <div className={styles.tSub} style={{ color: '#EF4444' }}>
                    Exam not scheduled for this subject yet.
                  </div>
                )}
              </div>
              <div style={{display: 'flex', gap: '12px'}}>
                <button 
                  className={`${styles.btnSm} ${styles.btnDraft}`}
                  onClick={() => handleSave(false)}
                  disabled={saving || !scheduleInfo}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} 
                  Save Draft
                </button>
                <button 
                  className={`${styles.btnSm} ${styles.btnPrimary}`}
                  onClick={() => handleSave(true)}
                  disabled={saving || !scheduleInfo}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>}
                  Submit Marks
                </button>
              </div>
            </div>

            <table className={styles.gridTable}>
              <thead>
                <tr>
                  <th style={{width: '80px'}}>Adm No</th>
                  <th>Student Name</th>
                  <th style={{textAlign: 'center'}}>Theory ({scheduleInfo?.max_theory_marks})</th>
                  <th style={{textAlign: 'center'}}>Internal ({scheduleInfo?.max_internal_marks})</th>
                  <th style={{textAlign: 'center'}}>Total</th>
                  <th style={{textAlign: 'center'}}>Grade</th>
                  <th style={{textAlign: 'center'}}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {studentsData.map(s => (
                  <tr key={s.id}>
                    <td style={{fontFamily: 'monospace', color: 'var(--theme-text-secondary)'}}>{s.roll}</td>
                    <td>
                      <div className={styles.studentCell}>
                        <div className={styles.avatar}>{s.name.charAt(0)}</div>
                        <span style={{fontWeight: 500}}>{s.name}</span>
                        {s.hasChanged && <div style={{width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)'}} title="Unsaved changes"></div>}
                      </div>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <div style={{position: 'relative', display: 'inline-block'}}>
                        <input 
                          type="number" 
                          value={s.theory_marks} 
                          onChange={e => handleMarkChange(s.id, 'theory_marks', e.target.value)}
                          className={`${styles.markInput} ${s.error ? styles.markInputError : ''}`} 
                          disabled={s.is_absent || !scheduleInfo}
                        />
                      </div>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <input 
                        type="number" 
                        value={s.internal_marks} 
                        onChange={e => handleMarkChange(s.id, 'internal_marks', e.target.value)}
                        className={styles.markInput} 
                        disabled={s.is_absent || !scheduleInfo}
                      />
                    </td>
                    <td style={{textAlign: 'center', fontWeight: 'bold'}}>
                      {s.is_absent ? (
                        <span style={{ color: '#EF4444' }}>ABSENT</span>
                      ) : (
                        s.marks_obtained || '-'
                      )}
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <span className={`${styles.badge} ${s.grade.includes('A')?styles.gradeA:s.grade==='F'?styles.gradeF:styles.gradeB}`}>
                        {s.grade}
                      </span>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <select 
                        className={styles.statusSelect} 
                        value={s.is_absent ? 'Absent' : 'Present'}
                        onChange={e => handleMarkChange(s.id, 'is_absent', e.target.value === 'Absent')}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
            <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
            <h3>Select filters to start marks entry</h3>
            <p>Choose an examination, section, and subject to load the student list.</p>
          </div>
        )}
      </div>
    </div>
  );
}
