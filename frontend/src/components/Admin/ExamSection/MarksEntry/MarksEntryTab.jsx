"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Send, AlertCircle, Loader2, CheckCircle2, AlertTriangle, Download, FileSpreadsheet, XCircle } from 'lucide-react';
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
  const [lastSaved, setLastSaved] = useState(null);
  const [adminOverride, setAdminOverride] = useState(false);
  
  const autoSaveTimer = useRef(null);

  // Fetch initial filters (Exams & Sections)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [examRes, sectionRes] = await Promise.all([
          adminApi.getExams(),
          adminApi.getSections()
        ]);
        setExams(examRes.data || []);
        setSections(sectionRes.data || []);
      } catch (error) {
        console.error("Error fetching filters:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFilters();
  }, []);

  // Fetch allocated subjects dynamically based on selected section & teacher role
  useEffect(() => {
    if (!selection.section_id) {
      setSubjects([]);
      return;
    }
    const fetchAllocatedSubjects = async () => {
      try {
        const res = await adminApi.getAllocations({ section: selection.section_id });
        const allocations = res.data || [];
        
        // Extract unique subjects from the allocations
        const uniqueSubjects = [];
        const seen = new Set();
        for (const alloc of allocations) {
          if (!seen.has(alloc.subject)) {
            seen.add(alloc.subject);
            uniqueSubjects.push({
              id: alloc.subject,
              name: alloc.subject_name
            });
          }
        }
        setSubjects(uniqueSubjects);
        
        // If the previously selected subject is no longer available, clear it
        if (!seen.has(parseInt(selection.subject_id))) {
          setSelection(prev => ({ ...prev, subject_id: '' }));
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };
    fetchAllocatedSubjects();
  }, [selection.section_id]);

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
        const scheduleRes = await adminApi.getExamSchedules(selection.exam_id);
        const currentSchedule = scheduleRes.data?.find(s => s.subject === parseInt(selection.subject_id));
        setScheduleInfo(currentSchedule || null);

        const [studentRes, resultRes] = await Promise.all([
          adminApi.getStudents({ section: selection.section_id }),
          adminApi.getExamResults({ exam: selection.exam_id, section: selection.section_id })
        ]);

        const studentsDataRaw = studentRes.data || [];
        const resultsDataRaw = resultRes.data || [];
        
        const students = Array.isArray(studentsDataRaw) ? studentsDataRaw : (studentsDataRaw.results || []);
        const results = Array.isArray(resultsDataRaw) ? resultsDataRaw : (resultsDataRaw.results || []);

        const merged = students.map(student => {
          const result = results.find(r => r.student === student.id && r.subject_name === currentSchedule?.subject_name);
          return {
            id: student.id,
            roll: student.admission_number,
            name: `${student.user?.first_name} ${student.user?.last_name}`,
            theory_marks: result?.theory_marks ?? '',
            internal_marks: result?.internal_marks ?? '',
            is_absent: result?.is_absent || false,
            is_withheld: false, // mock
            remarks: result?.remarks || '',
            grade: result?.grade || '-',
            marks_obtained: result?.marks_obtained || 0,
            hasChanged: false,
            error: null,
            warning: null
          };
        });

        // Sort by roll number initially
        merged.sort((a, b) => (a.roll > b.roll ? 1 : -1));
        
        setStudentsData(merged);
      } catch (error) {
        console.error("Error fetching marks data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarksData();
  }, [selection]);

  // Keyboard navigation
  const handleKeyDown = (e, rowIndex, colIndex, field) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave(false);
      return;
    }

    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (e.key) {
      case 'ArrowUp':
        nextRow = Math.max(0, rowIndex - 1);
        break;
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        nextRow = Math.min(studentsData.length - 1, rowIndex + 1);
        break;
      case 'ArrowLeft':
        if (e.target.selectionStart === 0) {
          nextCol = Math.max(0, colIndex - 1);
        } else return;
        break;
      case 'ArrowRight':
        if (e.target.selectionEnd === e.target.value.length) {
          nextCol = Math.min(1, colIndex + 1);
        } else return;
        break;
      default:
        return;
    }

    if (nextRow !== rowIndex || nextCol !== colIndex) {
      const targetId = `input-${nextRow}-${nextCol}`;
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.focus();
        elem.select();
      }
    }
  };

  const calculateStudentStats = (s, schedule) => {
    if (s.is_absent) return { ...s, total: '-', percent: '-', grade: '-', passStatus: 'Absent', statusClass: styles.statusAbsent };
    if (s.is_withheld) return { ...s, total: '-', percent: '-', grade: '-', passStatus: 'Withheld', statusClass: styles.statusWithheld };

    const t = parseFloat(s.theory_marks);
    const i = parseFloat(s.internal_marks);
    
    const hasT = !isNaN(t);
    const hasI = !isNaN(i);
    
    if (!hasT && !hasI) return { ...s, total: '-', percent: '-', grade: '-', passStatus: 'Pending', statusClass: styles.statusPending };

    const total = (hasT ? t : 0) + (hasI ? i : 0);
    const maxT = schedule?.max_theory_marks || 0;
    const maxI = schedule?.max_internal_marks || 0;
    const maxTotal = maxT + maxI;
    
    let err = null;
    let warn = null;

    if (hasT && (t > maxT || t < 0)) err = `Theory marks (${t}) exceeds maximum (${maxT}) or is invalid.`;
    if (hasI && (i > maxI || i < 0)) err = `Internal marks (${i}) exceeds maximum (${maxI}) or is invalid.`;

    const percent = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : 0;
    const isPass = percent >= (schedule?.pass_marks || 40);
    
    if (!err && !isPass && (hasT || hasI)) warn = `${s.name} has failed. Pass mark is ${schedule?.pass_marks}%. Consider if grace marks apply.`;

    let grade = 'F';
    if (percent >= 90) grade = 'A+';
    else if (percent >= 80) grade = 'A';
    else if (percent >= 70) grade = 'B+';
    else if (percent >= 60) grade = 'B';
    else if (percent >= 50) grade = 'C';
    else if (percent >= 40) grade = 'D';

    return {
      ...s,
      total,
      percent: percent + '%',
      grade: isPass ? grade : 'F',
      passStatus: err ? 'Error' : (isPass ? 'Pass' : 'Fail'),
      statusClass: err ? styles.statusError : (isPass ? styles.statusPass : styles.statusFail),
      error: err,
      warning: warn
    };
  };

  const handleMarkChange = (studentId, field, value) => {
    setStudentsData(prev => {
      const newData = prev.map(s => {
        if (s.id !== studentId) return s;
        return { ...s, [field]: value, hasChanged: true };
      });
      return newData;
    });
  };

  const handleStatusChange = (studentId, status) => {
    setStudentsData(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      return { 
        ...s, 
        is_absent: status === 'Absent',
        is_withheld: status === 'Withheld',
        hasChanged: true 
      };
    }));
  };

  // Auto-save logic
  useEffect(() => {
    const hasUnsaved = studentsData.some(s => s.hasChanged);
    if (hasUnsaved) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        handleSave(false, true); // silent save
      }, 60000); // 60 seconds
    }
    return () => clearTimeout(autoSaveTimer.current);
  }, [studentsData]);

  const handleSave = async (isSubmit = false, silent = false) => {
    if (!scheduleInfo) return;

    const errors = studentsData.filter(s => calculateStudentStats(s, scheduleInfo).error);
    if (isSubmit && errors.length > 0) {
      alert("Please fix all errors before submitting.");
      return;
    }

    if (!silent) setSaving(true);
    try {
      const records = studentsData.filter(s => s.hasChanged).map(s => ({
        student_id: s.id,
        exam_schedule_id: scheduleInfo.id,
        theory_marks: s.theory_marks === '' ? null : s.theory_marks,
        internal_marks: s.internal_marks === '' ? null : s.internal_marks,
        is_absent: s.is_absent,
        remarks: s.remarks
      }));

      if (records.length === 0 && !silent) {
        if (isSubmit) alert("Marks submitted successfully!");
        setSaving(false);
        return;
      }

      if (records.length > 0) {
        await adminApi.bulkSaveExamResults(records);
        setLastSaved(new Date());
        setStudentsData(prev => prev.map(s => ({ ...s, hasChanged: false })));
      }
      
      if (!silent) {
        alert(isSubmit ? "Marks submitted successfully!" : "Progress saved as draft.");
      }
    } catch (error) {
      if (!silent) alert("Error saving marks.");
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Stats
  const processedData = studentsData.map(s => calculateStudentStats(s, scheduleInfo));
  const enteredCount = processedData.filter(s => s.theory_marks !== '' || s.internal_marks !== '' || s.is_absent).length;
  const pendingCount = studentsData.length - enteredCount;
  const pendingStudents = processedData.filter(s => s.theory_marks === '' && s.internal_marks === '' && !s.is_absent);
  const errors = processedData.filter(s => s.error);
  const warnings = processedData.filter(s => s.warning);

  const isExamPending = scheduleInfo?.date && new Date(scheduleInfo.date) > new Date();
  const entryLocked = isExamPending && !adminOverride;
  const hasTheory = scheduleInfo?.max_theory_marks > 0;
  const hasInternal = scheduleInfo?.max_internal_marks > 0;
  const inputColSpan = (hasTheory ? 1 : 0) + (hasInternal ? 1 : 0);

  return (
    <div className={styles.container}>
      {/* FILTER BAR */}
      <div className={styles.filtersWrapper}>
        <div className={styles.filters}>
          <select 
            className={styles.select} 
            value={selection.exam_id}
            onChange={e => setSelection({...selection, exam_id: e.target.value})}
          >
            <option value="">Select Exam</option>
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
        
        <div className={styles.quickActions}>
          <button className={styles.btnSecondary}><FileSpreadsheet size={16}/> Import Excel</button>
          <button className={styles.btnSecondary}><Download size={16}/> Print Blank Sheet</button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>
            <Loader2 className="animate-spin" size={32} />
            <p>Loading student records...</p>
          </div>
        ) : studentsData.length > 0 ? (
          <div className={styles.workspace}>
            
            {/* STATS BAR */}
            <div className={styles.statsBar}>
              <div className={styles.badgeGroup}>
                <span className={styles.statusBadgePrimary}>Status: Draft</span>
                <span className={styles.statsPill}>
                  Max Theory: {scheduleInfo?.max_theory_marks || '0'} | Max Internal: {scheduleInfo?.max_internal_marks || '0'} | Pass: {scheduleInfo?.pass_marks || '-'}%
                </span>
                <span className={styles.statsPill}>
                  Students: {studentsData.length} | Entered: {enteredCount} | Pending: {pendingCount}
                </span>
                {lastSaved && <span className={styles.lastSaved}>Last saved: {lastSaved.toLocaleTimeString()}</span>}
              </div>
            </div>

            {/* ALERTS */}
            {isExamPending && !adminOverride && (
              <div className={styles.alertWarning} style={{background: 'rgba(239, 68, 68, 0.1)', borderLeftColor: '#ef4444', color: '#fca5a5'}}>
                <AlertTriangle size={18} />
                <div style={{flex: 1}}>
                  <b>Marks entry is locked.</b> The scheduled exam date ({new Date(scheduleInfo.date).toLocaleDateString()}) has not yet passed.
                </div>
                <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer'}}>
                  <input type="checkbox" checked={adminOverride} onChange={e => setAdminOverride(e.target.checked)} />
                  Admin Override Lock
                </label>
              </div>
            )}
            {pendingCount > 0 && !entryLocked && (
              <div className={styles.alertWarning}>
                <AlertTriangle size={18} />
                <span>
                  <b>{pendingCount} students have no marks entered yet</b> — {pendingStudents.slice(0, 4).map(s=>s.name).join(', ')}{pendingCount > 4 ? ', ...' : ''}
                </span>
              </div>
            )}
            {errors.length > 0 && (
              <div className={styles.alertError}>
                <XCircle size={18} />
                <div>
                  {errors.map((e, idx) => (
                    <div key={idx}><b>{e.name}:</b> {e.error}</div>
                  ))}
                </div>
              </div>
            )}

            {/* GRID */}
            <div className={styles.gridWrapper}>
              <table className={styles.gridTable}>
                <thead>
                  <tr>
                    <th style={{width: '50px'}}>#</th>
                    <th style={{minWidth: '200px'}}>Student Name</th>
                    <th>Roll</th>
                    {hasTheory && <th style={{textAlign: 'center', width: '100px'}}>Theory /{scheduleInfo?.max_theory_marks}</th>}
                    {hasInternal && <th style={{textAlign: 'center', width: '100px'}}>Internal /{scheduleInfo?.max_internal_marks}</th>}
                    <th style={{textAlign: 'center'}}>Total /{(scheduleInfo?.max_theory_marks||0)+(scheduleInfo?.max_internal_marks||0)}</th>
                    <th style={{textAlign: 'center'}}>%</th>
                    <th style={{textAlign: 'center'}}>Grade</th>
                    <th style={{textAlign: 'center'}}>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.map((s, rowIndex) => (
                    <tr key={s.id} className={s.hasChanged ? styles.rowChanged : ''}>
                      <td className={styles.idxCell}>{rowIndex + 1}</td>
                      <td>
                        <div className={styles.studentCell}>
                          <span style={{fontWeight: 600, color: s.is_absent ? '#94a3b8' : 'var(--theme-text)'}}>{s.name}</span>
                        </div>
                      </td>
                      <td className={styles.rollCell}>{s.roll}</td>
                      
                      {/* Inputs */}
                      {(s.is_absent || s.is_withheld) ? (
                        inputColSpan > 0 && (
                          <td colSpan={inputColSpan} style={{textAlign: 'center'}}>
                            <span className={styles.overlayBadge}>{s.is_absent ? 'Absent' : 'Withheld'}</span>
                          </td>
                        )
                      ) : (
                        <>
                          {hasTheory && (
                            <td style={{textAlign: 'center'}}>
                              <input 
                                id={`input-${rowIndex}-0`}
                                type="number" 
                                value={s.theory_marks} 
                                onChange={e => handleMarkChange(s.id, 'theory_marks', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 0, 'theory_marks')}
                                className={`${styles.markInput} ${s.error && s.theory_marks ? styles.markInputError : ''}`} 
                                disabled={entryLocked}
                                placeholder="-"
                              />
                            </td>
                          )}
                          {hasInternal && (
                            <td style={{textAlign: 'center'}}>
                              <input 
                                id={`input-${rowIndex}-1`}
                                type="number" 
                                value={s.internal_marks} 
                                onChange={e => handleMarkChange(s.id, 'internal_marks', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 1, 'internal_marks')}
                                className={`${styles.markInput} ${s.error && s.internal_marks ? styles.markInputError : ''}`} 
                                disabled={entryLocked}
                                placeholder="-"
                              />
                            </td>
                          )}
                        </>
                      )}

                      <td style={{textAlign: 'center', fontWeight: 'bold', color: s.error ? '#ef4444' : 'inherit'}}>{s.total}</td>
                      <td style={{textAlign: 'center', color: s.percent !== '-' && parseFloat(s.percent) < (scheduleInfo?.pass_marks || 40) ? '#ef4444' : '#64748b'}}>{s.percent}</td>
                      <td style={{textAlign: 'center', fontWeight: 'bold', color: s.grade === 'F' ? '#ef4444' : '#10b981'}}>{s.grade}</td>
                      <td style={{textAlign: 'center'}}>
                        <select 
                          className={`${styles.statusDropdown} ${s.statusClass}`}
                          value={s.is_absent ? 'Absent' : s.is_withheld ? 'Withheld' : s.passStatus}
                          onChange={e => handleStatusChange(s.id, e.target.value)}
                          disabled={entryLocked}
                        >
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                          <option value="Pending">Pending</option>
                          <option value="Error">Error</option>
                          <option value="Absent">Absent</option>
                          <option value="Withheld">Withheld</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text"
                          value={s.remarks}
                          onChange={e => handleMarkChange(s.id, 'remarks', e.target.value)}
                          className={styles.remarksInput}
                          placeholder="—"
                          disabled={entryLocked}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {warnings.length > 0 && (
              <div className={styles.alertInfo}>
                {warnings.map((w, idx) => <div key={idx}>{w.warning}</div>)}
              </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className={styles.footerActions}>
              <div style={{display: 'flex', gap: '12px'}}>
                <button className={styles.btnOutline}>Cancel</button>
                <button className={styles.btnOutline} onClick={() => handleSave(false)}>Save Draft</button>
                <button className={styles.btnWarningOutline}>Add Grace Marks</button>
              </div>
              <div style={{display: 'flex', gap: '12px'}}>
                <button className={styles.btnOutline}>Export This Sheet</button>
                <button className={styles.btnPrimary} onClick={() => handleSave(true)} disabled={saving || errors.length > 0 || entryLocked}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>}
                  Submit for Review
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className={styles.emptyState}>
            <AlertCircle size={48} />
            <h3>Select filters to start marks entry</h3>
            <p>Choose an examination, section, and subject to load the student list.</p>
          </div>
        )}
      </div>
    </div>
  );
}
