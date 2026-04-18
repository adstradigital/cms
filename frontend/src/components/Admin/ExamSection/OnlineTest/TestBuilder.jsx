import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, GripVertical, CheckCircle, List, Type, Image, FileText, X } from 'lucide-react';
import styles from './OnlineTest.module.css';
import adminApi from '@/api/adminApi';

const Q_TYPES = [
  { id: 'mcq_single', label: 'Single Choice (MCQ)', icon: <CheckCircle size={16}/> },
  { id: 'mcq_multi', label: 'Multiple Choice', icon: <List size={16}/> },
  { id: 'short', label: 'Short Answer', icon: <Type size={16}/> },
  { id: 'long', label: 'Long Description', icon: <FileText size={16}/> },
  { id: 'truefalse', label: 'True / False', icon: <CheckCircle size={16}/> },
  { id: 'fill', label: 'Fill in Blank', icon: <Type size={16}/> },
  { id: 'upload', label: 'File Upload', icon: <Image size={16}/> },
  { id: 'divider', label: 'Section Divider', icon: <List size={16}/> },
];

export default function TestBuilder({ testId, onBack }) {
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQ, setEditingQ] = useState(null); // The question currently being added/edited

  useEffect(() => {
    fetchData();
  }, [testId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const testRes = await adminApi.getOnlineTest(testId);
      setTest(testRes.data);
      const qRes = await adminApi.getTestQuestions(testId);
      setQuestions(qRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = (typeId) => {
    setEditingQ({
      question_type: typeId,
      text: '',
      marks: typeId === 'divider' ? 0 : 1,
      negative_marks: 0,
      is_required: true,
      choices_data: typeId === 'mcq_single' || typeId === 'mcq_multi' ? [
        { text: 'Option A', is_correct: false },
        { text: 'Option B', is_correct: false }
      ] : typeId === 'truefalse' ? [
        { text: 'True', is_correct: true },
        { text: 'False', is_correct: false }
      ] : [],
      accepted_answers: []
    });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      if (editingQ.id) {
        await adminApi.updateTestQuestion(editingQ.id, editingQ);
      } else {
        await adminApi.createTestQuestion(testId, editingQ);
      }
      setEditingQ(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error saving question');
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this question?")) return;
    try {
      await adminApi.deleteTestQuestion(id);
      fetchData();
    } catch(e) { console.error(e); }
  };

  if (loading) return <div>Loading builder...</div>;

  return (
    <div className={styles.builderLayout}>
      {/* Sidebar Palette */}
      <div className={styles.builderSidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.actionBtn} style={{border: 'none'}} onClick={onBack}>← Back</button>
          <span>Add Block</span>
        </div>
        <div className={styles.questionTypeList}>
          {Q_TYPES.map(qt => (
            <div key={qt.id} className={styles.qTypeItem} onClick={() => handleAddQuestion(qt.id)}>
              {qt.icon} {qt.label}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className={styles.builderCanvas}>
        <div style={{borderBottom: '1px solid var(--theme-border)', paddingBottom: 16}}>
          <h2 style={{margin: '0 0 8px 0'}}>{test?.title}</h2>
          <div className={styles.testMeta}>
            <span>{test?.section_name}</span>
            <span>Mode: {test?.grading_mode}</span>
            <span>{test?.total_marks} Marks Total</span>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          {questions.map((q, idx) => (
            <div key={q.id} className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <GripVertical size={16} style={{opacity: 0.5, cursor: 'grab'}}/>
                  <strong>Q{idx + 1}.</strong> {q.question_type !== 'divider' && `(${q.marks} marks)`}
                </div>
                <div style={{display: 'flex', gap: 8}}>
                   <button className={styles.actionBtn} onClick={() => setEditingQ(q)}><Edit3 size={14}/></button>
                   <button className={styles.actionBtn} style={{color: '#EF4444'}} onClick={() => handleDelete(q.id)}><Trash2 size={14}/></button>
                </div>
              </div>
              <div style={{paddingLeft: 24, fontSize: '0.95rem'}} dangerouslySetInnerHTML={{__html: q.text}} />
              {q.choices?.length > 0 && (
                <div className={styles.choiceList}>
                  {q.choices.map(c => (
                    <div key={c.id} className={`${styles.choiceItem} ${c.is_correct ? styles.correctChoice : ''}`}>
                      {q.question_type === 'mcq_single' || q.question_type === 'truefalse' ? '○' : '□'} {c.text} {c.is_correct && '✓'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {questions.length === 0 && !editingQ && (
            <div style={{textAlign: 'center', padding: 40, opacity: 0.5}}>
              <p>Empty Canvas. Select a block from the left to add your first question.</p>
            </div>
          )}
        </div>
      </div>

      {/* Question Editor Modal */}
      {editingQ && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{maxWidth: 700}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h3 style={{margin: 0}}>{editingQ.id ? 'Edit' : 'Add'} {Q_TYPES.find(t => t.id === editingQ.question_type)?.label}</h3>
              <button className={styles.actionBtn} style={{border:'none', flex: 'none', padding: '4px'}} onClick={() => setEditingQ(null)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveQuestion}>
              <div className={styles.formGroup}>
                <label>Question Prompt (Markdown supported)</label>
                <textarea 
                  required
                  rows={4}
                  className={styles.formInput} 
                  value={editingQ.text}
                  onChange={e => setEditingQ({...editingQ, text: e.target.value})}
                  placeholder="Type your question here..."
                />
              </div>

              {editingQ.question_type !== 'divider' && (
                <div style={{display: 'flex', gap: 16}}>
                  <div className={styles.formGroup} style={{flex: 1}}>
                    <label>Marks</label>
                    <input type="number" step="0.5" required className={styles.formInput} value={editingQ.marks} onChange={e => setEditingQ({...editingQ, marks: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{flex: 1}}>
                    <label>Negative Marks (Penalty)</label>
                    <input type="number" step="0.25" className={styles.formInput} value={editingQ.negative_marks} onChange={e => setEditingQ({...editingQ, negative_marks: e.target.value})} />
                  </div>
                </div>
              )}

              {(editingQ.question_type === 'mcq_single' || editingQ.question_type === 'mcq_multi') && (
                <div className={styles.formGroup}>
                  <label>Options</label>
                  {(editingQ.choices_data || []).map((choice, i) => (
                    <div key={i} style={{display: 'flex', gap: 8, marginBottom: 8}}>
                      <input 
                        type={editingQ.question_type === 'mcq_single' ? 'radio' : 'checkbox'} 
                        checked={choice.is_correct}
                        onChange={(e) => {
                           const newChoices = [...editingQ.choices_data];
                           if(editingQ.question_type === 'mcq_single'){
                              newChoices.forEach(c => c.is_correct = false);
                           }
                           newChoices[i].is_correct = e.target.checked;
                           setEditingQ({...editingQ, choices_data: newChoices});
                        }}
                      />
                      <input 
                        required
                        type="text" 
                        className={styles.formInput} 
                        value={choice.text}
                        onChange={e => {
                          const newChoices = [...editingQ.choices_data];
                          newChoices[i].text = e.target.value;
                          setEditingQ({...editingQ, choices_data: newChoices});
                        }}
                      />
                      <button type="button" className={styles.actionBtn} onClick={() => {
                        const newC = [...editingQ.choices_data]; newC.splice(i, 1); setEditingQ({...editingQ, choices_data: newC});
                      }}><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" className={styles.actionBtn} onClick={() => setEditingQ({...editingQ, choices_data: [...editingQ.choices_data, {text:'', is_correct:false}]})}>
                    + Add Option
                  </button>
                </div>
              )}

              {editingQ.question_type === 'fill' && (
                <div className={styles.formGroup}>
                  <label>Accepted Answers (Comma separated)</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    value={(editingQ.accepted_answers || []).join(', ')}
                    onChange={e => setEditingQ({...editingQ, accepted_answers: e.target.value.split(',').map(s=>s.trim())})}
                    placeholder="e.g., gravity, gravitation"
                  />
                  <small style={{color: 'var(--theme-text-secondary)', marginTop: 4, display: 'block'}}>Use "___" in the prompt where the blank should be.</small>
                </div>
              )}

              <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 24}}>
                <button type="submit" className={styles.createButton}><Save size={16}/> Save Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
