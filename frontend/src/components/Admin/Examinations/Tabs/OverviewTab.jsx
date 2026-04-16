import React from 'react';
import styles from '../ExaminationsDashboard.module.css';

const OverviewTab = () => {
  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '1rem' }}>Welcome to the Examinations Module</h2>
      <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '2rem' }}>
        This module allows you to define standardized assessments, map them to specific academic schedules, securely log student outcomes, and electronically generate report cards.
      </p>
      
      <div className={styles.grid2}>
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>1. Master Exams</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Create distinct exam entities such as "Term 1 Finals" and assign them to specific classes and date windows.</p>
        </div>
        
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>2. Scheduler</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Break down an exam into Subject schedules. Define exact dates, durations, and passing criteria for each subject.</p>
        </div>
        
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>3. Bulk Grading</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Use the high-speed data entry matrix to log subjective and objective scores directly into the system database.</p>
        </div>
        
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>4. Report Cards</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Process all scores into distinct statistical curves, outputting formal grades, percentages, and class ranks automatically.</p>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
