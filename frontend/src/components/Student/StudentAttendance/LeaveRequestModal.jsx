'use client';

import React, { useState } from 'react';
import styles from './StudentAttendance.module.css';
import { X, Calendar, FileText, Send, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import instance from '@/api/instance';

export default function LeaveRequestModal({ studentId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    from_date: '',
    to_date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.from_date || !formData.to_date || !formData.reason) {
      setError('Please fill in all required fields.');
      return;
    }

    if (new Date(formData.to_date) < new Date(formData.from_date)) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await instance.post('/attendance/leaves/', {
        student: studentId,
        ...formData
      });
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit leave request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.modalOverlay}>
        <div className={`${styles.modalContent} ${styles.successModal}`} style={{ textAlign: 'center', padding: '40px' }}>
          <div className={styles.successIconWrapper}>
             <CheckCircle2 size={64} color="#10b981" className="animate-bounce" />
          </div>
          <h2 style={{ marginTop: '20px', fontSize: '24px', fontWeight: '800' }}>Application Submitted!</h2>
          <p style={{ color: '#64748b', marginTop: '10px' }}>Your leave request has been sent for review. You can track its status in the Leave Portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        
        <header className={styles.modalHeader}>
          <div className={styles.formHeader}>
            <div className={styles.formIcon}>
              <Calendar size={24} />
            </div>
            <div>
              <h2>Leave Application</h2>
              <p>Request authorization for upcoming absence</p>
            </div>
          </div>
        </header>

        <form className={styles.leaveForm} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.formError}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label><Calendar size={14} /> Start Date</label>
              <input 
                type="date" 
                value={formData.from_date}
                onChange={e => setFormData({...formData, from_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.inputGroup}>
              <label><Calendar size={14} /> End Date</label>
              <input 
                type="date" 
                value={formData.to_date}
                onChange={e => setFormData({...formData, to_date: e.target.value})}
                min={formData.from_date || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label><FileText size={14} /> Reason for Leave</label>
            <textarea 
              placeholder="Please provide a clear reason for your absence..."
              rows={4}
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
            />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Submitting...</>
              ) : (
                <><Send size={18} /> Submit Application</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
