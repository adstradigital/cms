import React, { useState, useEffect } from 'react';
import styles from '../ExaminationsDashboard.module.css';
import api from '@/api/instance';
import { Plus, X, Pencil, Trash2, ShieldCheck, Clock } from 'lucide-react';

const ExamManagementTab = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    exam_type: 'unit_test',
    school_class: '',
    academic_year: '',
    start_date: '',
    end_date: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exRes, clRes, ayRes] = await Promise.all([
        api.get('/exams/exams/'),
        api.get('/students/classes/'),
        api.get('/accounts/academic-years/')
      ]);
      setExams(exRes.data);
      setClasses(clRes.data);
      setAcademicYears(ayRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exams/exams/', formData);
      setShowForm(false);
      setFormData({
        name: '', exam_type: 'unit_test', school_class: '', academic_year: '', start_date: '', end_date: ''
      });
      fetchData();
    } catch (err) {
      console.error('Error creating exam:', err);
      alert('Failed to create examination.');
    }
  };

  const handlePublish = async (id) => {
    try {
       await api.post(`/exams/exams/${id}/publish/`);
       fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to publish exam');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam? This will cascade to schedules and results.')) return;
    try {
      await api.delete(`/exams/exams/${id}/`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete. Ensure there are no dependent results.');
    }
  };

  if (loading) return <div className={styles.emptyState}>Loading Exams...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Exam Definitions</h2>
        <button className={styles.actionButton} onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={18} /> : <><Plus size={18} /> New Exam</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div className={styles.grid2} style={{ marginBottom: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Exam Name</label>
              <input required name="name" className={styles.formInput} placeholder="e.g. Term 1 Finals" value={formData.name} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Exam Type</label>
              <select required name="exam_type" className={styles.formSelect} value={formData.exam_type} onChange={handleChange}>
                <option value="unit_test">Unit Test</option>
                <option value="mid_term">Mid Term</option>
                <option value="final">Final Exam</option>
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half Yearly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Target Grade / Class</label>
              <select required name="school_class" className={styles.formSelect} value={formData.school_class} onChange={handleChange}>
                <option value="">Select Class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Academic Year</label>
              <select required name="academic_year" className={styles.formSelect} value={formData.academic_year} onChange={handleChange}>
                <option value="">Select Year...</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Start Date</label>
              <input required type="date" name="start_date" className={styles.formInput} value={formData.start_date} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>End Date</label>
              <input required type="date" name="end_date" className={styles.formInput} value={formData.end_date} onChange={handleChange} />
            </div>
          </div>
          <button type="submit" className={styles.actionButton}>Save Examination</button>
        </form>
      )}

      {exams.length === 0 ? (
        <div className={styles.emptyState}>
          No exams scheduled. Click "New Exam" to begin.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Target Class</th>
                <th>Type</th>
                <th>Window</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => (
                <tr key={exam.id}>
                  <td style={{ fontWeight: '600' }}>{exam.name}</td>
                  <td>{exam.class_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{exam.exam_type.replace('_', ' ')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                       <Clock size={14} /> {exam.start_date} to {exam.end_date}
                    </div>
                  </td>
                  <td>
                    {exam.is_published ? 
                      <span style={{ color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14}/> Published</span> : 
                      <span style={{ color: '#d97706', fontWeight: '600' }}>Draft</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!exam.is_published && (
                        <button 
                          style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }}
                          title="Publish Results"
                          onClick={() => handlePublish(exam.id)}
                        >
                           Publish
                        </button>
                      )}
                      <button 
                        style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                        title="Delete Exam"
                        onClick={() => handleDelete(exam.id)}
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExamManagementTab;
