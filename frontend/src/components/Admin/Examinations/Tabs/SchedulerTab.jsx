import React, { useState, useEffect } from 'react';
import styles from '../ExaminationsDashboard.module.css';
import api from '@/api/instance';
import { Plus, X, Trash2, BookOpen } from 'lucide-react';
import { ElegantDatePicker, ElegantTimePicker } from './CustomPickers';

const SchedulerTab = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    date: '',
    start_time: '',
    end_time: '',
    max_marks: 100,
    pass_marks: 35,
    venue: '',
  });

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [exRes, subRes] = await Promise.all([
          api.get('/exams/exams/'),
          api.get('/academics/subjects/')
        ]);
        setExams(exRes.data);
        setSubjects(subRes.data);
      } catch (err) {
        console.error('Failed to load base schedule data', err);
      }
    };
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadSchedules(selectedExamId);
    } else {
      setSchedules([]);
    }
  }, [selectedExamId]);

  const loadSchedules = async (examId) => {
    setLoading(true);
    try {
      const res = await api.get(`/exams/exams/${examId}/schedules/`);
      setSchedules(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/exams/exams/${selectedExamId}/schedules/`, formData);
      setShowForm(false);
      setFormData({
        subject: '', date: '', start_time: '', end_time: '', max_marks: 100, pass_marks: 35, venue: ''
      });
      loadSchedules(selectedExamId);
    } catch (err) {
      console.error('Error creating schedule:', err);
      alert('Failed to schedule subject. Ensure dates are valid and subject isn\'t already scheduled.');
    }
  };

  const handleDelete = async (scheduleId) => {
    // Note: To dynamically delete schedules properly we need its API. Assuming a generic endpoint if custom wasn't built fully, but let's try direct standard DRF generic if valid.
    alert('Deletion functionality on schedules requires the proper endpoint implementation. Removing from UI temporarily.');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Subject Scheduler</h2>
        <div style={{ width: '300px' }}>
          <select 
             className={styles.formSelect} 
             style={{ width: '100%' }}
             value={selectedExamId}
             onChange={(e) => setSelectedExamId(e.target.value)}
          >
             <option value="">-- Select Master Exam --</option>
             {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedExamId ? (
        <div className={styles.emptyState}>
          Please select an Exam from the dropdown above to view or add schedules.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
             <button className={styles.actionButton} onClick={() => setShowForm(!showForm)}>
               {showForm ? <X size={18} /> : <><Plus size={18} /> Schedule Subject</>}
             </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              
              {/* Form Header */}
              <div style={{ background: '#f8fafc', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px' }}>
                   <BookOpen size={16} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: '600' }}>New Exam Schedule Config</h3>
              </div>
              
              <div style={{ padding: '1.5rem' }}>
                
                {/* SECTION 1: Subject & Timings */}
                <h4 style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Academic Details & Timings</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Subject</label>
                    <select required name="subject" className={styles.formSelect} value={formData.subject} onChange={handleChange} style={{ background: '#f8fafc' }}>
                      <option value="">Select Subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Date</label>
                    <ElegantDatePicker 
                       value={formData.date} 
                       onChange={(val) => setFormData({ ...formData, date: val })} 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Venue / Room</label>
                    <input type="text" name="venue" className={styles.formInput} placeholder="e.g. Science Lab 2" value={formData.venue} onChange={handleChange} />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Start Time</label>
                    <ElegantTimePicker 
                       value={formData.start_time} 
                       onChange={(val) => setFormData({ ...formData, start_time: val })} 
                       placeholder="Select Start"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>End Time</label>
                    <ElegantTimePicker 
                       value={formData.end_time} 
                       onChange={(val) => setFormData({ ...formData, end_time: val })} 
                       placeholder="Select End"
                    />
                  </div>
                </div>

                {/* Divider */}
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 2rem 0' }} />

                {/* SECTION 2: Evaluation */}
                <h4 style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Evaluation Criteria</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '500px' }}>
                  <div className={styles.formGroup}>
                     <label className={styles.formLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Max Marks <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Out of)</span>
                     </label>
                     <div style={{ position: 'relative' }}>
                       <input required type="number" min="1" name="max_marks" className={styles.formInput} style={{ width: '100%', paddingRight: '40px', fontSize: '1.1rem', fontWeight: '500', color: '#0f172a' }} value={formData.max_marks} onChange={handleChange} />
                       <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontWeight: 'bold' }}>/</span>
                     </div>
                  </div>
                  <div className={styles.formGroup}>
                     <label className={styles.formLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Pass Marks <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Min)</span>
                     </label>
                     <input required type="number" min="1" name="pass_marks" className={styles.formInput} style={{ width: '100%', fontSize: '1.1rem', fontWeight: '500', color: '#0f172a', borderLeft: '4px solid #f59e0b' }} value={formData.pass_marks} onChange={handleChange} />
                  </div>
                </div>

              </div>
              
              {/* Form Footer */}
              <div style={{ background: '#f8fafc', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className={styles.actionButton} style={{ background: 'transparent', color: '#475569', border: '1px solid #cbd5e1' }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className={styles.actionButton}>Save Subject Schedule</button>
              </div>
            </form>
          )}

          {loading ? (
             <div className={styles.emptyState}>Loading schedules...</div>
          ) : schedules.length === 0 ? (
             <div className={styles.emptyState}>No subjects scheduled for this exam yet.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Timing</th>
                    <th>Venue</th>
                    <th>Marks (Max / Pass)</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(sch => (
                    <tr key={sch.id}>
                      <td style={{ fontWeight: '600', color: '#1e293b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen size={16} color="#3b82f6"/>{sch.subject_name}</span>
                      </td>
                      <td>{sch.date}</td>
                      <td>{sch.start_time} - {sch.end_time}</td>
                      <td>{sch.venue || 'N/A'}</td>
                      <td>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{sch.max_marks}</span> / <span style={{ color: '#64748b' }}>{sch.pass_marks}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SchedulerTab;
