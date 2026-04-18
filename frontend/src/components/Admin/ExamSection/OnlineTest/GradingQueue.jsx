import React, { useState, useEffect } from 'react';
import { CheckSquare, Check, X, AlertCircle } from 'lucide-react';
import styles from './OnlineTest.module.css';
import adminApi from '@/api/adminApi';

export default function GradingQueue({ testId, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, [testId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getTestSubmissions(testId);
      // Filter out 'in_progress' so we only grade submitted ones
      setSubmissions(res.data.filter(s => s.status !== 'in_progress'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id) => {
    try {
      const res = await adminApi.getTestAttempt(id);
      setSelectedSub(res.data);
    } catch (e) { console.error(e); }
  };

  const handleGrade = async (answerId, manual_score, is_correct, remark) => {
    try {
      await adminApi.gradeTestAnswer(answerId, { manual_score, is_correct, teacher_remark: remark });
      // Refresh selected submission
      handleSelect(selectedSub.id);
    } catch (e) {
      console.error(e);
      alert('Error saving grade');
    }
  };

  const handlePublishResult = async () => {
    if(!window.confirm("Publish final result to student?")) return;
    try {
      await adminApi.publishTestResult(selectedSub.id);
      fetchSubmissions();
      setSelectedSub(null);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div>Loading queue...</div>;

  return (
    <div className={styles.gradingLayout}>
      <div className={styles.submissionList}>
        <div style={{padding: 16, borderBottom: '1px solid var(--theme-border)', display: 'flex', justifyContent: 'space-between'}}>
           <strong>Submissions</strong>
           <button className={styles.actionBtn} style={{border:'none', padding: 0}} onClick={onBack}>← Back</button>
        </div>
        {submissions.map(sub => (
          <div 
            key={sub.id} 
            className={`${styles.submissionItem} ${selectedSub?.id === sub.id ? styles.submissionActive : ''}`}
            onClick={() => handleSelect(sub.id)}
          >
            <div style={{fontWeight: 500}}>{sub.student_name}</div>
            <div style={{fontSize: '0.75rem', color: 'var(--theme-text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: 4}}>
              <span>{sub.status.toUpperCase()}</span>
              <span>Score: {sub.final_score}</span>
            </div>
          </div>
        ))}
        {submissions.length === 0 && (
          <div style={{padding: 24, textAlign: 'center', opacity: 0.5}}>No submissions to grade.</div>
        )}
      </div>

      <div className={styles.gradeWorkspace}>
        {!selectedSub ? (
          <div style={{textAlign: 'center', opacity: 0.5, marginTop: '20vh'}}>
             <CheckSquare size={48} style={{margin: '0 auto 16px'}}/>
             <h3>Select a Submission</h3>
             <p>Review and grade descriptive answers.</p>
          </div>
        ) : (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--theme-border)'}}>
               <div>
                  <h2 style={{margin: '0 0 8px 0'}}>{selectedSub.student_name}</h2>
                  <div className={styles.testMeta}>
                    <span>Attempt {selectedSub.attempt_number}</span>
                    <span>Status: {selectedSub.status}</span>
                    <strong style={{color: 'var(--color-primary)'}}>Total Score: {selectedSub.final_score} / {selectedSub.total_marks}</strong>
                  </div>
               </div>
               {selectedSub.status !== 'published' && (
                 <button className={styles.createButton} onClick={handlePublishResult}>Publish Final Result</button>
               )}
            </div>

            {selectedSub.answers.map((ans, idx) => {
              const needsManual = ['short', 'long', 'upload'].includes(ans.question_type);
              return (
                <div key={ans.id} className={styles.answerBox}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                    <strong style={{fontSize: '1rem'}}>Q{idx + 1}. {ans.question_text}</strong>
                    <span className={styles.badge} style={{background: 'rgba(255,255,255,0.1)'}}>Max: {ans.question_marks}</span>
                  </div>
                  
                  {ans.question_type === 'upload' ? (
                     ans.file_answer ? <a href={ans.file_answer} target="_blank" rel="noreferrer" style={{color: 'var(--color-primary)'}}>View Uploaded File</a> : <p style={{opacity: 0.5}}>No file uploaded</p>
                  ) : (
                     <div className={styles.answerText}>{ans.text_answer || <span style={{opacity: 0.5}}>No text answer provided.</span>}</div>
                  )}

                  {!needsManual ? (
                     <div style={{marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: ans.is_correct ? '#10B981' : '#EF4444'}}>
                       {ans.is_correct ? <Check size={16}/> : <X size={16}/>}
                       Auto-scored: {ans.auto_score}
                     </div>
                  ) : (
                     <div style={{marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8}}>
                        <div>
                          <label style={{display: 'block', fontSize: '0.75rem', marginBottom: 4, color: 'var(--theme-text-secondary)'}}>Award Marks</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            max={ans.question_marks}
                            className={styles.scoreInput}
                            defaultValue={ans.manual_score || ''}
                            onBlur={(e) => handleGrade(ans.id, e.target.value, e.target.value > 0, ans.teacher_remark)}
                          />
                        </div>
                        <div style={{flex: 1}}>
                          <label style={{display: 'block', fontSize: '0.75rem', marginBottom: 4, color: 'var(--theme-text-secondary)'}}>Teacher Remark (Optional)</label>
                          <input 
                            type="text" 
                            className={styles.formInput} 
                            style={{padding: '8px'}}
                            defaultValue={ans.teacher_remark || ''}
                            onBlur={(e) => handleGrade(ans.id, ans.manual_score, ans.is_correct, e.target.value)}
                            placeholder="Add feedback..."
                          />
                        </div>
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
