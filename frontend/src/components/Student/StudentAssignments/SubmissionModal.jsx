'use client';

import React, { useState, useEffect } from 'react';
import styles from './StudentAssignments.module.css';
import { 
  X, 
  Upload, 
  FileText, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  Paperclip,
  Save
} from 'lucide-react';
import api from '@/api/instance';

export default function SubmissionModal({ task, studentId, existingSubmission, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState(existingSubmission?.remarks || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size exceeds 10MB limit.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (isDraft = false) => {
    if (!file && !existingSubmission?.submitted_file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('homework', task.id);
      formData.append('student', studentId);
      if (file) formData.append('submitted_file', file);
      formData.append('remarks', remarks);
      formData.append('status', isDraft ? 'draft' : 'submitted');

      let response;
      if (existingSubmission) {
        // Update existing draft
        response = await api.patch(`/academics/homework/submissions/${existingSubmission.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Create new submission/draft
        response = await api.post(`/academics/homework/${task.id}/submissions/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (response.data) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.error || 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.modalOverlay}>
        <div className={`${styles.modalContent} ${styles.modalSuccess}`}>
          <CheckCircle2 size={64} color="#10b981" className="animate-bounce" />
          <h2>Request Processed!</h2>
          <p>Your work has been synchronized.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        
        <header className={styles.modalHeader}>
          <h2>{existingSubmission?.status === 'draft' ? 'Update Draft' : 'Submit Work'}: {task.title}</h2>
          <p>{task.subject?.name} Assignment</p>
        </header>

        <div className={styles.form}>
          <div className={styles.uploadArea} onClick={() => document.getElementById('fileInput').click()}>
            <input 
              id="fileInput"
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {file ? (
              <div className={styles.fileSelected}>
                <Paperclip size={24} color="#4f46e5" />
                <div className={styles.fileInfo}>
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            ) : existingSubmission?.submitted_file ? (
              <div className={styles.fileSelected}>
                <FileText size={24} color="#10b981" />
                <div className={styles.fileInfo}>
                  <strong>Existing Draft Uploaded</strong>
                  <span>Click to replace file</span>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} color="#94a3b8" />
                <p>Click to upload or drag and drop</p>
                <span>PDF, DOCX, JPG or PNG (max. 10MB)</span>
              </>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label>Additional Remarks (Optional)</label>
            <textarea 
              placeholder="Add a note for your teacher..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.modalFooter}>
            <button 
              type="button" 
              className={styles.secondaryBtn} 
              onClick={() => handleSubmit(true)}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
              Save as Draft
            </button>
            <button 
              type="button" 
              className={styles.primaryBtn} 
              onClick={() => handleSubmit(false)}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} 
              Turn In Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
