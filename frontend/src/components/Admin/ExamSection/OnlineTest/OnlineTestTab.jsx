"use client";
import React, { useState, useEffect } from 'react';
import { 
  Laptop, Edit3, Eye, CheckSquare, List, 
  Type, Image, HelpCircle, FileText, CheckCircle, Loader2, AlertCircle, Plus
} from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './OnlineTest.module.css';

export default function OnlineTestTab() {
  const [mode, setMode] = useState('queue'); // builder | attempt | queue
  const [onlineExams, setOnlineExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState('');

  useEffect(() => {
    const fetchOnlineExams = async () => {
      try {
        const res = await adminApi.getExams({ is_online: true });
        setOnlineExams(res.data || []);
        if (res.data?.length > 0) setSelectedExam(res.data[0].id);
      } catch (error) {
        console.error("Error fetching online exams:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOnlineExams();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.subTabs}>
          <button className={`${styles.subTab} ${mode === 'builder' ? styles.subTabActive : ''}`} onClick={() => setMode('builder')}>
            <Edit3 size={16}/> Question Config
          </button>
          <button className={`${styles.subTab} ${mode === 'queue' ? styles.subTabActive : ''}`} onClick={() => setMode('queue')}>
            <CheckSquare size={16}/> Grading Queue
          </button>
        </div>
        
        <select 
          className={styles.examSelect} 
          value={selectedExam} 
          onChange={e => setSelectedExam(e.target.value)}
        >
          <option value="">Select Online Exam</option>
          {onlineExams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
      </div>

      <div className={styles.viewArea}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center', width: '100%' }}>
            <Loader2 className="animate-spin" size={32} style={{margin: '0 auto'}}/>
            <p style={{marginTop: 16, opacity: 0.5}}>Loading assessment data...</p>
          </div>
        ) : !selectedExam ? (
          <div style={{ padding: '80px', textAlign: 'center', width: '100%', opacity: 0.5 }}>
            <AlertCircle size={48} style={{margin: '0 auto 16px'}}/>
            <h3>No Online Exam Selected</h3>
            <p>Select an exam to manage questions or grade submissions.</p>
          </div>
        ) : (
          <>
            {mode === 'builder' && (
              <div className={styles.builderLayout}>
                <div className={styles.palette}>
                  <h4 style={{margin: '0 0 12px 0', fontSize: '0.875rem', color: 'var(--theme-text-secondary)'}}>Question Bank</h4>
                  <div className={styles.paletteItem}><List size={16}/> Import from Bank</div>
                  <div className={styles.paletteItem}><Plus size={16}/> Create Random Set</div>
                </div>
                <div className={styles.canvas}>
                  <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '20vh' }}>
                    <Edit3 size={48} style={{marginBottom: 16}}/>
                    <h2>Ready to Configure</h2>
                    <p>Select questions from the bank to assign to this online test.</p>
                  </div>
                </div>
              </div>
            )}

            {mode === 'queue' && (
              <div className={styles.gradingGrid}>
                <div className={styles.queueList}>
                  <h4 style={{margin: '0 0 16px 0', fontSize: '1rem'}}>Awaiting Manual Grading</h4>
                  <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', opacity: 0.5 }}>
                     <CheckCircle size={32} style={{margin: '0 auto 12px'}}/>
                     <p style={{fontSize: '0.875rem'}}>All objective questions auto-graded.<br/>No descriptive answers pending.</p>
                  </div>
                </div>

                <div className={styles.gradeWorkspace}>
                   <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '15vh' }}>
                      <Laptop size={64} style={{marginBottom: 16}}/>
                      <h3>Assessment Control Console</h3>
                      <p>Select a student submission to begin manual overriding or review.</p>
                   </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
