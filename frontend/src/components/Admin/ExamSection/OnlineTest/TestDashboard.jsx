import React, { useState } from 'react';
import { Plus, Edit3, Settings, Play, CheckCircle } from 'lucide-react';
import styles from './OnlineTest.module.css';

export default function TestDashboard({ tests, sections, subjects, onCreate, onSelect, onPublish }) {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    title: '', section: '', subject: '', grading_mode: 'mixed', duration_minutes: 60
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
    setShowCreate(false);
    setFormData({ title: '', section: '', subject: '', grading_mode: 'mixed', duration_minutes: 60 });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.header}>
        <h3>Assessment Dashboard</h3>
        <button className={styles.createButton} onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Create New Test
        </button>
      </div>

      <div className={styles.testGrid}>
        {tests.map(test => (
          <div key={test.id} className={styles.testCard} onClick={() => onSelect(test.id)}>
            <div className={styles.testHeader}>
              <h4 className={styles.testTitle}>{test.title}</h4>
              <div className={`${styles.badge} ${test.is_published ? styles.badgePublished : styles.badgeDraft}`}>
                {test.is_published ? 'Published' : 'Draft'}
              </div>
            </div>
            
            <div className={styles.testMeta}>
              <span>{test.section_name}</span> &bull; 
              <span>{test.subject_name}</span>
            </div>
            
            <div className={styles.testMeta}>
              <span className={styles.badgeAuto}>{test.grading_mode.toUpperCase()}</span>
              <span>{test.question_count} Qs</span> &bull; 
              <span>{test.total_marks} Marks</span>
            </div>

            <div className={styles.testActions}>
              <button 
                className={styles.actionBtn} 
                onClick={(e) => { e.stopPropagation(); onSelect(test.id); }}
              >
                <Edit3 size={14}/> Builder
              </button>
              <button 
                className={styles.actionBtn} 
                onClick={(e) => { e.stopPropagation(); onPublish(test.id); }}
              >
                <Play size={14}/> {test.is_published ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </div>
        ))}
        {tests.length === 0 && (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5, padding: '40px'}}>
             <CheckCircle size={48} style={{margin: '0 auto 16px'}}/>
             <p>No tests created yet. Click "Create New Test" to begin.</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 style={{marginTop: 0}}>Create New Assessment</h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Test Title</label>
                <input 
                  required
                  type="text" 
                  className={styles.formInput} 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Mid-Term Physics Evaluation"
                />
              </div>
              <div style={{display: 'flex', gap: 16}}>
                <div className={styles.formGroup} style={{flex: 1}}>
                  <label>Section</label>
                  <select required className={styles.formInput} value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})}>
                    <option value="">Select Section</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.class_name} - {s.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup} style={{flex: 1}}>
                  <label>Subject</label>
                  <select required className={styles.formInput} value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div style={{display: 'flex', gap: 16}}>
                <div className={styles.formGroup} style={{flex: 1}}>
                  <label>Grading Mode</label>
                  <select className={styles.formInput} value={formData.grading_mode} onChange={e => setFormData({...formData, grading_mode: e.target.value})}>
                    <option value="mixed">Mixed (Auto + Manual)</option>
                    <option value="auto">Auto-Graded Only (MCQs)</option>
                    <option value="manual">Manual Grading Only</option>
                  </select>
                </div>
                <div className={styles.formGroup} style={{flex: 1}}>
                  <label>Duration (Minutes)</label>
                  <input type="number" className={styles.formInput} value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: e.target.value})} />
                </div>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24}}>
                <button type="button" className={styles.actionBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className={styles.createButton}>Create Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
