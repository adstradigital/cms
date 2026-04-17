"use client";
import React, { useState, useEffect } from 'react';
import { Database, FileText, CheckCircle, Search, Plus, Loader2, X, ArrowUp, ArrowDown, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './QuestionPaper.module.css';

export default function QuestionPaperTab() {
  const [questions, setQuestions] = useState([]);
  const [papers, setPapers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({ count: 0, next: null, previous: null });
  
  // Builder State
  const [isBuildingPaper, setIsBuildingPaper] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [builderFormData, setBuilderFormData] = useState({
    schoolName: 'BLAZE INTERNATIONAL SCHOOL',
    name: '',
    subject: '',
    date: '',
    instructions: 'Attempt all questions. Marks are indicated against each question.',
    duration_minutes: 60,
    total_marks: '',
  });

  const [manualEntry, setManualEntry] = useState({
    text: '',
    marks: 5,
    type: 'Descriptive'
  });

  const [formData, setFormData] = useState({
    subject: '',
    question_text: '',
    question_type: 'Descriptive',
    marks: 5,
    difficulty: 'Medium',
    bloom_level: 'Apply',
    options: {}
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, pRes, sRes, cRes] = await Promise.all([
        adminApi.getQuestionBank({ 
          search: searchTerm, 
          subject: selectedSubject,
          page: currentPage 
        }),
        adminApi.getQuestionPapers(),
        adminApi.getSubjects(),
        adminApi.getClasses() // Fetch classes
      ]);
      
      if (qRes.data.results) {
        setQuestions(qRes.data.results);
        setPaginationInfo({
          count: qRes.data.count,
          next: qRes.data.next,
          previous: qRes.data.previous
        });
      } else {
        setQuestions(qRes.data || []);
      }
      
      setPapers(pRes.data || []);
      setSubjects(sRes.data || []);
      setClasses(cRes.data || []); 
    } catch (error) {
      console.error("Error fetching question data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSubject, selectedClass]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedSubject, currentPage]); // We don't fetch differently by selectedClass, we filter locally.

  const filteredSubjects = selectedClass
    ? subjects.filter(s => s.school_class === parseInt(selectedClass))
    : Array.from(new Map(subjects.map(s => [s.name, s])).values());

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createQuestion(formData);
      setIsModalOpen(false);
      fetchData();
      setFormData({ ...formData, question_text: '' });
    } catch (error) {
      alert("Error adding question: " + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleQuestion = (q) => {
    // If it's a manual entry without a db id, we use temporary id for matching
    const qid = q.id || q.tempId;
    if (selectedQuestions.some(sq => (sq.id || sq.tempId) === qid)) {
      setSelectedQuestions(selectedQuestions.filter(sq => (sq.id || sq.tempId) !== qid));
    } else {
      setSelectedQuestions([...selectedQuestions, q]);
    }
  };

  const handleUpdateMarks = (tempIdOrId, newMarks) => {
    setSelectedQuestions(prev => prev.map(q => {
      const qid = q.id || q.tempId;
      if (qid === tempIdOrId) {
        return { ...q, marks: newMarks };
      }
      return q;
    }));
  };

  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...selectedQuestions];
    if (direction === 'up' && index > 0) {
      const temp = newQuestions[index];
      newQuestions[index] = newQuestions[index - 1];
      newQuestions[index - 1] = temp;
    } else if (direction === 'down' && index < newQuestions.length - 1) {
      const temp = newQuestions[index];
      newQuestions[index] = newQuestions[index + 1];
      newQuestions[index + 1] = temp;
    }
    setSelectedQuestions(newQuestions);
  };

  const handleAddManualQuestion = () => {
    if(!manualEntry.text) return;
    const newQ = {
      tempId: `manual_${Date.now()}`,
      isManualEntry: true,
      text: manualEntry.text,
      marks: manualEntry.marks,
      type: manualEntry.type,
      question_text: manualEntry.text,
    };
    setSelectedQuestions([...selectedQuestions, newQ]);
    setManualEntry({ text: '', marks: 5, type: 'Descriptive' });
  };

  const handleSavePaper = async () => {
    if (!builderFormData.name || !builderFormData.subject || selectedQuestions.length === 0) {
      alert("Please fill Subject, Exam Title and insert at least one question.");
      return;
    }
    const totalMarks = selectedQuestions.reduce((sum, q) => sum + parseFloat(q.marks), 0);
    
    // Extract manual questions
    const manualQuestions = selectedQuestions.filter(q => q.isManualEntry);
    let finalIds = selectedQuestions.filter(q => !q.isManualEntry).map(q => q.id);

    try {
      // Auto-save manual questions to bank
      for (let mq of manualQuestions) {
         const qData = {
           subject: builderFormData.subject,
           question_text: mq.text,
           marks: mq.marks,
           question_type: mq.type,
           difficulty: 'Medium',
           bloom_level: 'Apply'
         };
         const res = await adminApi.createQuestion(qData);
         finalIds.push(res.data.id);
      }

      const payload = {
        ...builderFormData,
        questions: finalIds,
        total_marks: totalMarks
      };

      await adminApi.createQuestionPaper(payload);
      setIsBuildingPaper(false);
      setSelectedQuestions([]);
      setBuilderFormData({ 
        schoolName: 'BLAZE INTERNATIONAL SCHOOL', 
        name: '', 
        subject: '', 
        date: '', 
        instructions: 'Attempt all questions. Marks are indicated against each question.', 
        duration_minutes: 60,
        total_marks: ''
      });
      fetchData();
    } catch (error) {
      alert("Error saving paper: " + (error.response?.data?.error || error.message));
    }
  };

  if (isBuildingPaper) {
    const calculatedTotalMarks = selectedQuestions.reduce((sum, q) => sum + parseFloat(q.marks), 0);
    const displayMarks = builderFormData.total_marks || calculatedTotalMarks;
    const selectedSubjObj = filteredSubjects.find(s => s.id === parseInt(builderFormData.subject));

    const formatDuration = (mins) => {
      const m = parseInt(mins) || 0;
      if (m === 0) return "0 Mins";
      const h = Math.floor(m / 60);
      const rm = m % 60;
      const hStr = h > 0 ? `${h} ${h === 1 ? 'Hr' : 'Hrs'}` : '';
      const mStr = rm > 0 ? `${rm} Mins` : '';
      return [hStr, mStr].filter(Boolean).join(' ');
    };
    
    return (
      <div className={styles.wordBuilderContainer}>
        {/* Word Toolbar */}
        <div className={styles.wordToolbar}>
          <div className={styles.toolbarGroup}>
            <button className={styles.btnWordSecondary} onClick={() => setIsBuildingPaper(false)}>Close</button>
            <div style={{height: '24px', width: '1px', background: '#cbd5e1', margin: '0 8px'}}></div>
            <select className={styles.toolbarSelect} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
               <option value="">Select Class...</option>
               {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={styles.toolbarSelect} value={builderFormData.subject} onChange={e => setBuilderFormData({...builderFormData, subject: e.target.value})}>
               <option value="">Select Subject...</option>
               {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.class_name ? `(${s.class_name})` : ''}</option>)}
            </select>
            <input 
              className={styles.toolbarInput} 
              type="text" 
              placeholder="Exam Title" 
              value={builderFormData.name} 
              onChange={e => setBuilderFormData({...builderFormData, name: e.target.value})}
            />
            <input 
              className={styles.toolbarInput} 
              type="date" 
              title="Date of Exam"
              value={builderFormData.date} 
              onChange={e => setBuilderFormData({...builderFormData, date: e.target.value})}
            />
            <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 500}}>
              Duration:
              <input 
                className={styles.toolbarInput} 
                style={{width: '60px'}}
                type="number" 
                placeholder="Mins" 
                value={builderFormData.duration_minutes} 
                onChange={e => setBuilderFormData({...builderFormData, duration_minutes: e.target.value})}
              />
              <span style={{color: '#64748b', fontSize: '0.7rem'}}>({formatDuration(builderFormData.duration_minutes)})</span>
            </div>
          </div>
          <div className={styles.toolbarGroup}>
            <div style={{fontSize: '0.875rem', fontWeight: 600, color: '#475569'}}>Total Marks: {displayMarks}</div>
            <button className={styles.btnWordSecondary} onClick={() => {
              if (builderFormData.subject) setSelectedSubject(builderFormData.subject);
              setIsBankModalOpen(true);
            }}>
              <Database size={16} style={{marginRight: '6px'}}/> Pick from Bank
            </button>
            <button className={styles.btnWordPrimary} onClick={handleSavePaper}>Save Document</button>
          </div>
        </div>

        {/* Word Canvas */}
        <div className={styles.wordWorkspace}>
          <div className={styles.a4Paper}>
            <div className={styles.a4Header}>
              
              <h1 className={styles.schoolName}>
                 <input 
                   className={styles.inlineHeaderInput} 
                   value={builderFormData.schoolName} 
                   onChange={e => setBuilderFormData({...builderFormData, schoolName: e.target.value})}
                   placeholder="SCHOOL NAME"
                 />
              </h1>
              <h2 className={styles.examTitle}>
                 <input 
                   className={styles.inlineHeaderInput} 
                   value={builderFormData.name} 
                   onChange={e => setBuilderFormData({...builderFormData, name: e.target.value})}
                   placeholder="EXAMINATION TITLE"
                 />
              </h2>

              <div style={{display: 'flex', justifyContent: 'space-between', margin: '20px 0 15px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1', fontSize: '13px', fontStyle: 'italic', opacity: 0.8}}>
                <div>Candidate Name: _____________________</div>
                <div>Roll No: ____________</div>
                <div>Section: ______</div>
              </div>

              <div className={styles.metaGrid}>
                 <div className={styles.metaItem}><span>Subject:</span> <b>{selectedSubjObj?.name || ''}</b></div>
                 <div className={styles.metaItem}><span>Class:</span> <b>{classes.find(c=>c.id===parseInt(selectedClass))?.name || ''}</b></div>
                 <div className={styles.metaItem}><span>Date:</span> <b>{builderFormData.date || ''}</b></div>
              </div>
              <div className={styles.metaGridSecondary}>
                 <div className={styles.metaItem}>
                    <span>Duration:</span> 
                    <b style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <input 
                        className={styles.inlineMetaInput} 
                        type="number" 
                        value={builderFormData.duration_minutes} 
                        onChange={e => setBuilderFormData({...builderFormData, duration_minutes: e.target.value})} 
                      />
                      <span style={{fontSize: '0.9em', fontWeight: 600}}>
                        {parseInt(builderFormData.duration_minutes) % 60 === 0 ? (parseInt(builderFormData.duration_minutes) / 60 === 1 ? 'Hr' : 'Hrs') : (parseInt(builderFormData.duration_minutes) < 60 ? 'Mins' : 'Mins')}
                      </span>
                      <span style={{fontSize: '0.75rem', fontWeight: 400, color: '#64748b', marginLeft: '5px'}}>
                        ({formatDuration(builderFormData.duration_minutes)})
                      </span>
                    </b>
                 </div>
                 <div className={styles.metaItem}>
                    <span>Max Marks:</span> 
                    <b>
                      <input 
                        className={styles.inlineMetaInput} 
                        type="number" 
                        value={displayMarks}
                        placeholder={calculatedTotalMarks}
                        onChange={e => setBuilderFormData({...builderFormData, total_marks: e.target.value})} 
                      />
                    </b>
                 </div>
              </div>
              <div style={{marginTop: '15px', borderTop: '1px solid #cbd5e1', paddingTop: '10px'}}>
                <div className={styles.editorToolbar}>
                  <button onClick={() => document.execCommand('bold', false, null)} title="Bold"><Bold size={14}/></button>
                  <button onClick={() => document.execCommand('italic', false, null)} title="Italic"><Italic size={14}/></button>
                  <button onClick={() => document.execCommand('underline', false, null)} title="Underline"><Underline size={14}/></button>
                  <div className={styles.divider}></div>
                  <button onClick={() => document.execCommand('insertUnorderedList', false, null)} title="Bullet List"><List size={14}/></button>
                  <button onClick={() => document.execCommand('insertOrderedList', false, null)} title="Numbered List"><ListOrdered size={14}/></button>
                  <div className={styles.divider}></div>
                  <button onClick={() => document.execCommand('justifyLeft', false, null)} title="Align Left"><AlignLeft size={14}/></button>
                  <button onClick={() => document.execCommand('justifyCenter', false, null)} title="Align Center"><AlignCenter size={14}/></button>
                  <button onClick={() => document.execCommand('justifyRight', false, null)} title="Align Right"><AlignRight size={14}/></button>
                </div>
                <div 
                  contentEditable
                  suppressContentEditableWarning={true}
                  className={styles.richTextEditor}
                  onBlur={(e) => setBuilderFormData({...builderFormData, instructions: e.target.innerHTML})}
                  dangerouslySetInnerHTML={{__html: builderFormData.instructions}}
                />
              </div>
            </div>

            <div className={styles.a4Content}>
               {selectedQuestions.length === 0 ? (
                 <div style={{opacity: 0.4, textAlign: 'center', padding: '40px 0'}}>Empty Document. Add questions below or from the bank.</div>
               ) : (
                 selectedQuestions.map((sq, i) => (
                   <div key={sq.id || sq.tempId} className={styles.questionRow}>
                     <div className={styles.qNumber}>Q{i+1}.</div>
                     <div className={styles.qTextBlock}>{sq.question_text || sq.text}</div>
                     <div className={styles.qMarksBlock}>
                       [<input 
                          type="number" 
                          className={styles.inlineMarksInput} 
                          value={sq.marks} 
                          onChange={(e) => handleUpdateMarks(sq.tempId || sq.id, e.target.value)} 
                        />]
                     </div>
                     <div className={styles.questionActions}>
                       <button className={styles.btnRemove} style={{color: '#64748b'}} onClick={() => handleMoveQuestion(i, 'up')} title="Move Up"><ArrowUp size={16}/></button>
                       <button className={styles.btnRemove} style={{color: '#64748b'}} onClick={() => handleMoveQuestion(i, 'down')} title="Move Down"><ArrowDown size={16}/></button>
                       <button className={styles.btnRemove} onClick={() => handleToggleQuestion(sq)} title="Remove"><X size={16}/></button>
                     </div>
                   </div>
                 ))
               )}
            </div>

            {/* Manual Entry Inline Block */}
            <div className={styles.manualEntryBox}>
              <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
                <textarea 
                  className={styles.toolbarInput} 
                  style={{flex: 1, resize: 'vertical', minHeight: '60px'}} 
                  placeholder="Type a new question to add directly to paper..."
                  value={manualEntry.text}
                  onChange={e => setManualEntry({...manualEntry, text: e.target.value})}
                />
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '120px'}}>
                  <input 
                    className={styles.toolbarInput} 
                    type="number" 
                    placeholder="Marks" 
                    value={manualEntry.marks}
                    onChange={e => setManualEntry({...manualEntry, marks: e.target.value})}
                  />
                  <select 
                    className={styles.toolbarSelect} 
                    style={{minWidth: '100%'}}
                    value={manualEntry.type}
                    onChange={e => setManualEntry({...manualEntry, type: e.target.value})}
                  >
                    <option>Descriptive</option>
                    <option>MCQ</option>
                  </select>
                </div>
                <button className={styles.btnWordPrimary} style={{height: '40px'}} onClick={handleAddManualQuestion}>Insert</button>
              </div>
              <div style={{fontSize: '0.75rem', color: '#64748b', marginTop: '8px'}}>* Questions typed here will automatically be saved to the Question Bank upon saving the document.</div>
            </div>
          </div>
        </div>

        {/* Bank Picker Modal inside Builder */}
        {isBankModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal} style={{maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column'}}>
              <div className={styles.modalHeader}>
                <h3>Pick from Question Bank</h3>
                <button onClick={() => setIsBankModalOpen(false)}><X size={20}/></button>
              </div>
              
              <div className={styles.modalBody} style={{flex: 1, overflow: 'hidden', padding: 0}}>
                <div className={styles.panelHeader} style={{borderBottom: 'none', background: '#f8fafc', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div className={styles.searchWrapper} style={{width: '100%', marginBottom: 0}}>
                    <Search size={16} className={styles.searchIcon} />
                    <input 
                      type="text" 
                      placeholder="Search question bank..." 
                      className={styles.searchBox} 
                      style={{marginBottom: 0, background: 'white'}}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div style={{display: 'flex', gap: '8px'}}>
                    <select 
                      className={styles.filterSelect}
                      style={{background: 'white', flex: 1}}
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    
                    <select 
                      className={styles.filterSelect}
                      style={{background: 'white', flex: 1}}
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
                    >
                      <option value="">All Subjects</option>
                      {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.class_name ? `(${s.class_name})` : ''}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.panelBody} style={{paddingTop: 0}}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {loading ? (
                      <div style={{width: '100%', textAlign: 'center', padding: '20px'}}><Loader2 className="animate-spin" size={24} style={{margin:'0 auto'}}/></div>
                    ) : questions.length > 0 ? questions.map(q => {
                      const isSelected = selectedQuestions.some(sq => (sq.id || sq.tempId) === q.id);
                      return (
                        <div 
                          key={q.id} 
                          className={`${styles.qBankItem}`}
                          style={{borderColor: isSelected ? 'var(--color-primary)' : 'var(--theme-border)', flexDirection: 'row', alignItems: 'center'}}
                          onClick={() => handleToggleQuestion(q)}
                        >
                          <input type="checkbox" className={styles.checkbox} checked={isSelected} readOnly />
                          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                            <div className={styles.qText}>{q.question_text || q.text}</div>
                            <div style={{fontSize: '0.75rem', color: 'var(--theme-text-secondary)', marginTop: '4px'}}>Marks: {q.marks} | Type: {q.question_type}</div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{width: '100%', textAlign: 'center', opacity: 0.5, fontSize: '0.875rem', padding: '20px'}}>No questions found.</div>
                    )}
                  </div>
                </div>
              </div>

               {/* Bank Pagination Footer */}
              {paginationInfo.count > 0 && (
                <div className={styles.panelFooter}>
                  <div className={styles.pagination} style={{margin: 0, paddingTop: 0, border: 'none'}}>
                    <button 
                      className={styles.pageBtn} 
                      disabled={!paginationInfo.previous}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Prev
                    </button>
                    <div className={styles.pageInfo}>
                      Page {currentPage} of {Math.ceil(paginationInfo.count / 10)}
                    </div>
                    <button 
                      className={styles.pageBtn} 
                      disabled={!paginationInfo.next}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Question Bank */}
      <div className={styles.leftPanel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>
            <Database size={18}/> Question Bank
          </h3>
          <button className={styles.btnIcon} onClick={() => setIsModalOpen(true)} title="Add to Bank">
            <Plus size={18}/>
          </button>
        </div>
        
        <div className={styles.panelBody}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search questions..." 
              className={styles.searchBox} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{display: 'flex', gap: '12px', marginBottom: '16px'}}>
            <select 
              className={styles.filterSelect}
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              style={{flex: 1}}
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select 
              className={styles.filterSelect}
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              style={{flex: 1}}
            >
              <option value="">All Subjects</option>
              {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.class_name ? `(${s.class_name})` : ''}</option>)}
            </select>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {loading ? (
              <div style={{padding: '20px', textAlign: 'center'}}><Loader2 className="animate-spin" size={24} style={{margin:'0 auto'}}/></div>
            ) : questions.length > 0 ? questions.map(q => (
              <div key={q.id} className={styles.qBankItem}>
                <div className={styles.qText}>{q.question_text || q.text}</div>
                <div className={styles.qMeta}>
                  <div style={{display: 'flex', gap: '6px'}}>
                    <span className={`${styles.badge} ${String(q.difficulty || '').toLowerCase()==='hard' ? styles.badgeHard : ''}`}>{q.difficulty || 'Medium'}</span>
                    <span className={`${styles.badge} ${styles.badgeApply}`}>{q.bloom_level || 'Apply'}</span>
                  </div>
                  <span style={{fontWeight: 600}}>{q.marks} Marks</span>
                </div>
              </div>
            )) : (
              <div style={{textAlign: 'center', opacity: 0.5, fontSize: '0.875rem', padding: '20px'}}>No questions found.</div>
            )}
          </div>
        </div>

        {/* PERSISTENT FOOTER FOR PAGINATION */}
        {paginationInfo.count > 0 && (
          <div className={styles.panelFooter}>
            <div className={styles.pagination}>
              <button 
                className={styles.pageBtn} 
                disabled={!paginationInfo.previous}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Prev
              </button>
              <div className={styles.pageInfo}>
                Page {currentPage} of {Math.ceil(paginationInfo.count / 10)}
              </div>
              <button 
                className={styles.pageBtn} 
                disabled={!paginationInfo.next}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Paper Canvas */}
      <div className={styles.rightPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <FileText size={18} />
            Question Papers
          </div>
        </div>
        
        <div className={styles.panelBody} style={{background: 'var(--theme-bg)'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px'}}>
            {papers.map(p => (
              <div key={p.id} className={styles.paperCard}>
                <div className={styles.pTitle}>{p.name}</div>
                <div className={styles.pSub}>{p.subject_name} | {p.total_marks} Marks</div>
                <div className={styles.pActions}>
                  <button className={styles.btnSm}>Preview</button>
                  <button className={styles.btnSm} style={{background: 'var(--color-primary)', color: '#fff'}}>Edit</button>
                </div>
              </div>
            ))}
            
            <div className={styles.addPaperPlaceholder} onClick={() => setIsBuildingPaper(true)}>
               <div className={styles.addIcon}><Plus size={32}/></div>
               <span>Create New Question Paper</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Question to Bank</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateQuestion} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Subject</label>
                <select 
                  required 
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Question Text</label>
                <textarea 
                  required 
                  value={formData.question_text}
                  onChange={e => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Enter the question here..."
                  rows={3}
                  className={styles.textarea}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Type</label>
                  <select value={formData.question_type} onChange={e => setFormData({ ...formData, question_type: e.target.value })}>
                    <option>Descriptive</option>
                    <option>MCQ</option>
                    <option>True/False</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Marks</label>
                  <input type="number" value={formData.marks} onChange={e => setFormData({ ...formData, marks: e.target.value })} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnSecondary}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
