'use client';

import React from 'react';
import styles from './StudentAssignments.module.css';
import { 
  X, 
  MessageSquare, 
  Trophy, 
  Download,
  Calendar,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function FeedbackModal({ task, submission, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        
        <header className={styles.modalHeader}>
          <div className={styles.feedbackHeader}>
            <div className={styles.trophyBox}>
              <Trophy size={32} color="#fbbf24" />
            </div>
            <div>
              <h2>Evaluation Results</h2>
              <p>{task.title}</p>
            </div>
          </div>
        </header>

        <div className={styles.feedbackBody}>
          <div className={styles.gradeDisplay}>
            <div className={styles.gradeCircleLarge}>{submission.grade}</div>
            <div className={styles.gradeMeta}>
              <h3>Overall Grade</h3>
              <p>Work reviewed by {task.teacher?.full_name || 'Class Instructor'}</p>
            </div>
          </div>

          <div className={styles.remarksSection}>
            <div className={styles.sectionHead}>
              <MessageSquare size={18} />
              <span>Teacher's Feedback</span>
            </div>
            <div className={styles.remarksContent}>
              {submission.remarks || "Great job completing this assignment. Keep up the good work!"}
            </div>
          </div>

          <div className={styles.submissionSummary}>
            <div className={styles.summaryItem}>
              <Calendar size={14} />
              <span>Submitted: {new Date(submission.submitted_at).toLocaleDateString()}</span>
            </div>
            <div className={styles.summaryItem}>
              <CheckCircle size={14} color={submission.is_late ? "#ef4444" : "#10b981"} />
              <span>{submission.is_late ? "Submitted Late" : "Submitted On Time"}</span>
            </div>
          </div>

          {submission.submitted_file && (
            <div className={styles.yourWork}>
              <div className={styles.sectionHead}>
                <FileText size={18} />
                <span>Your Submission</span>
              </div>
              <a href={submission.submitted_file} target="_blank" rel="noopener noreferrer" className={styles.workLink}>
                <Download size={16} /> Download Submitted File
              </a>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.primaryBtn} onClick={onClose}>Understood</button>
        </div>
      </div>
    </div>
  );
}
