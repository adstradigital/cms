import React, { useState, useEffect } from 'react';
import styles from '../ExaminationsDashboard.module.css';
import api from '@/api/instance';
import { Save, AlertCircle } from 'lucide-react';

const GradingSheetTab = () => {
  const [exams, setExams] = useState([]);
  const [sections, setSections] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const [studentsData, setStudentsData] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);

  useEffect(() => {
    const initData = async () => {
      setLoadingConfig(true);
      try {
        const [exRes, secRes] = await Promise.all([
          api.get('/exams/exams/'),
          api.get('/students/sections/')
        ]);
        setExams(exRes.data);
        setSections(secRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConfig(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      api.get(`/exams/exams/${selectedExamId}/schedules/`).then(res => {
        setSchedules(res.data);
      }).catch(err => console.error(err));
    } else {
      setSchedules([]);
      setSelectedScheduleId('');
    }
  }, [selectedExamId]);

  const loadGradingSheet = async () => {
    if (!selectedExamId || !selectedScheduleId || !selectedSectionId) {
      alert("Please select Exam, Schedule (Subject), and Section to load the grading sheet.");
      return;
    }

    setLoadingSheet(true);
    try {
      // Fetch students for the section
      const stRes = await api.get(`/students/students/?section=${selectedSectionId}&is_active=true`);
      let loadedStudents = stRes.data.results ? stRes.data.results : stRes.data;

      // Fetch existing exam results for this schedule and section
      const resRes = await api.get(`/exams/results/?exam=${selectedExamId}&section=${selectedSectionId}`);
      let existingResults = resRes.data.results ? resRes.data.results : resRes.data;

      // Map to state
      const mapped = loadedStudents.map(student => {
        const existing = existingResults.find(r => r.student === student.id && r.exam_schedule === parseInt(selectedScheduleId));
        return {
          student_id: student.id,
          name: `${student.user.first_name} ${student.user.last_name}`,
          roll_number: student.roll_number,
          exam_schedule_id: parseInt(selectedScheduleId),
          marks_obtained: existing ? existing.marks_obtained : '',
          is_absent: existing ? existing.is_absent : false,
          remarks: existing ? existing.remarks : '',
        };
      });

      // Sort by roll number numerically or alphabetically
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      setStudentsData(mapped);

    } catch (err) {
      console.error(err);
      alert('Failed to load grading sheet data.');
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleInputChange = (studentId, field, value) => {
    setStudentsData(prev => 
      prev.map(st => st.student_id === studentId ? { ...st, [field]: value } : st)
    );
  };

  const handleSaveBulk = async () => {
    try {
      const payload = {
         records: studentsData.map(st => ({
            ...st,
            marks_obtained: st.is_absent || st.marks_obtained === '' ? null : parseFloat(st.marks_obtained),
         }))
      };
      
      const res = await api.post('/exams/results/bulk/', payload);
      alert(res.data.message || 'Results saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save batch results.');
    }
  };

  const activeSchedule = schedules.find(s => s.id === parseInt(selectedScheduleId));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Bulk Grading Sheet</h2>
      </div>

      <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }} className={styles.formGroup}>
          <label className={styles.formLabel}>1. Select Exam</label>
          <select className={styles.formSelect} value={selectedExamId} onChange={e => { setSelectedExamId(e.target.value); setSelectedScheduleId(''); setStudentsData([]); }}>
            <option value="">-- Choose Exam --</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} className={styles.formGroup}>
          <label className={styles.formLabel}>2. Select Subject (Schedule)</label>
          <select className={styles.formSelect} value={selectedScheduleId} onChange={e => { setSelectedScheduleId(e.target.value); setStudentsData([]); }} disabled={!selectedExamId}>
            <option value="">-- Choose Subject Schedule --</option>
            {schedules.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.date})</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} className={styles.formGroup}>
          <label className={styles.formLabel}>3. Target Section</label>
          <select className={styles.formSelect} value={selectedSectionId} onChange={e => { setSelectedSectionId(e.target.value); setStudentsData([]); }}>
            <option value="">-- Choose Section --</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.class_name} - {s.name}</option>)}
          </select>
        </div>
        <button className={styles.actionButton} onClick={loadGradingSheet} disabled={loadingSheet || !selectedExamId || !selectedScheduleId || !selectedSectionId}>
           {loadingSheet ? 'Loading...' : 'Load Sheet'}
        </button>
      </div>

      {studentsData.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', backgroundColor: '#e0f2fe', padding: '1rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#0369a1', fontWeight: '500' }}>
               <AlertCircle size={20} /> 
               <span>Entering marks for <strong>{activeSchedule?.subject_name}</strong>. Maximum allowable marks: <strong>{activeSchedule?.max_marks}</strong>.</span>
            </div>
            <button className={styles.actionButton} style={{ background: '#16a34a' }} onClick={handleSaveBulk}>
               <Save size={18} /> Save All Changes
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>System Roll</th>
                  <th style={{ width: '30%' }}>Student Name</th>
                  <th style={{ width: '15%' }}>Absent</th>
                  <th style={{ width: '20%' }}>Marks Obtained</th>
                  <th style={{ width: '25%' }}>Teacher Remarks</th>
                </tr>
              </thead>
              <tbody>
                {studentsData.map((st) => (
                  <tr key={st.student_id} style={{ backgroundColor: st.is_absent ? '#fff1f2' : 'transparent' }}>
                    <td style={{ color: '#64748b' }}>{st.roll_number || 'N/A'}</td>
                    <td style={{ fontWeight: '600', color: '#1e293b' }}>{st.name}</td>
                    <td>
                      <input 
                        type="checkbox" 
                        style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                        checked={st.is_absent}
                        onChange={(e) => {
                           handleInputChange(st.student_id, 'is_absent', e.target.checked);
                           if(e.target.checked) handleInputChange(st.student_id, 'marks_obtained', ''); 
                        }}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0"
                        max={activeSchedule?.max_marks || 100}
                        step="0.1"
                        className={styles.formInput} 
                        style={{ width: '100px', padding: '0.5rem' }}
                        value={st.marks_obtained}
                        disabled={st.is_absent}
                        onChange={(e) => handleInputChange(st.student_id, 'marks_obtained', e.target.value)}
                      />
                    </td>
                    <td>
                       <input 
                        type="text" 
                        className={styles.formInput} 
                        style={{ width: '100%', padding: '0.5rem' }}
                        placeholder="Optional remarks"
                        value={st.remarks}
                        onChange={(e) => handleInputChange(st.student_id, 'remarks', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingSheetTab;
