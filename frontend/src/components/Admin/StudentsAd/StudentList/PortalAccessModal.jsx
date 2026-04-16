import React, { useState, useEffect, useCallback } from 'react';
import {
  X, KeyRound, Copy, Check, ShieldCheck, ShieldOff,
  RefreshCw, Lock, AlertTriangle, Clock, User, Mail, Phone
} from 'lucide-react';
import styles from './PortalAccessModal.module.css';
import instance from '@/api/instance';

const PortalAccessModal = ({ studentId, onClose }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [copied, setCopied] = useState({});
  const [showCustomPw, setShowCustomPw] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const fetchInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await instance.get(`/students/students/${studentId}/portal-info/`);
      setInfo(res.data);
    } catch (err) {
      console.error('Error fetching portal info:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) fetchInfo();
  }, [studentId, fetchInfo]);

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    }
  };

  const handleResetPassword = async (newPassword = '') => {
    try {
      setActionLoading(true);
      setResetResult(null);
      const payload = newPassword ? { new_password: newPassword } : {};
      const res = await instance.post(`/students/students/${studentId}/reset-password/`, payload);
      setResetResult(res.data);
      setShowCustomPw(false);
      setCustomPassword('');
    } catch (err) {
      console.error('Error resetting password:', err);
      alert('Failed to reset password. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAccess = async () => {
    if (!info) return;
    const action = info.is_active ? 'deactivate' : 'activate';
    const confirmed = confirm(
      `Are you sure you want to ${action} portal access for ${info.full_name}?\n\n` +
      (info.is_active
        ? 'The student will NOT be able to log into the Student Portal.'
        : 'The student will be able to log into the Student Portal.')
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await instance.post(`/students/students/${studentId}/toggle-access/`);
      setInfo((prev) => ({ ...prev, is_active: res.data.is_active }));
    } catch (err) {
      console.error('Error toggling access:', err);
      alert('Failed to toggle access. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUsername = async (newUname) => {
    try {
      setActionLoading(true);
      const res = await instance.post(`/students/students/${studentId}/update-username/`, { new_username: newUname });
      setInfo(prev => ({ ...prev, username: res.data.username }));
      setIsEditingUsername(false);
    } catch (err) {
      console.error('Error updating username:', err);
      if (err.response && err.response.data && err.response.data.error) {
         alert(err.response.data.error);
      } else {
         alert('Failed to update username. It might already exist.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const photoPath = null; // We don't have photo in portal-info
  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
  const displayAvatar = DEFAULT_AVATAR;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerTitle}>
              <div className={styles.headerIcon}>
                <KeyRound size={18} />
              </div>
              Portal Access Control
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          {info && (
            <div className={styles.studentMeta}>
              <img src={displayAvatar} alt="" className={styles.studentAvatar} />
              <div className={styles.studentInfo}>
                <span className={styles.studentName}>{info.full_name}</span>
                <span className={styles.studentAdm}>{info.admission_number}</span>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <span className={styles.loadingText}>Loading portal info...</span>
            </div>
          ) : info ? (
            <>
              {/* Credentials Card */}
              <div className={styles.credCard}>
                <div className={styles.credCardTitle}>Login Credentials</div>
                <div className={styles.credRow}>
                  <span className={styles.credLabel}>Username</span>
                  <span className={styles.credValue}>
                    {isEditingUsername ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className={styles.usernameInput}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newUsername.trim()) handleUpdateUsername(newUsername);
                            if (e.key === 'Escape') setIsEditingUsername(false);
                          }}
                        />
                        <button 
                          onClick={() => handleUpdateUsername(newUsername)}
                          className={styles.saveUsernameBtn}
                          disabled={actionLoading || !newUsername.trim()}
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setIsEditingUsername(false)}
                          className={styles.cancelUsernameBtn}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ marginRight: '4px' }}>{info.username}</span>
                        <button
                           style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                           onClick={() => { setIsEditingUsername(true); setNewUsername(info.username); }}
                        >
                           Edit
                        </button>
                        <button
                          className={`${styles.copyBtn} ${copied.username ? styles.copiedBtn : ''}`}
                          onClick={() => handleCopy(info.username, 'username')}
                          title="Copy username"
                          style={{ marginLeft: 'auto' }}
                        >
                          {copied.username ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </>
                    )}
                  </span>
                </div>
                <div className={styles.credRow}>
                  <span className={styles.credLabel}>Portal</span>
                  <span className={styles.credValue} style={{ fontFamily: 'var(--font-sans)' }}>
                    Student Portal
                  </span>
                </div>
                <div className={styles.credRow}>
                  <span className={styles.credLabel}>Status</span>
                  <span className={`${styles.statusBadge} ${info.is_active ? styles.statusActive : styles.statusDisabled}`}>
                    {info.is_active ? '● Active' : '● Disabled'}
                  </span>
                </div>
                <div className={styles.credRow}>
                  <span className={styles.credLabel}>Role</span>
                  <span className={styles.credValue} style={{ fontFamily: 'var(--font-sans)' }}>
                    {info.role_name || 'Student'}
                  </span>
                </div>
              </div>

              {/* Password Reset Result */}
              {resetResult && (
                <div className={styles.resetResult}>
                  <div className={styles.resetResultTitle}>
                    <ShieldCheck size={16} /> Password Reset Successful
                  </div>
                  <div className={styles.resetCredentials}>
                    <div className={styles.resetCredRow}>
                      <span className={styles.resetCredLabel}>Username</span>
                      <span className={styles.resetCredValue}>
                        {resetResult.username}
                        <button
                          className={`${styles.copyBtn} ${copied.newUser ? styles.copiedBtn : ''}`}
                          onClick={() => handleCopy(resetResult.username, 'newUser')}
                        >
                          {copied.newUser ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </span>
                    </div>
                    <div className={styles.resetCredRow}>
                      <span className={styles.resetCredLabel}>New Password</span>
                      <span className={styles.resetCredValue}>
                        {resetResult.new_password}
                        <button
                          className={`${styles.copyBtn} ${copied.newPw ? styles.copiedBtn : ''}`}
                          onClick={() => handleCopy(resetResult.new_password, 'newPw')}
                        >
                          {copied.newPw ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </span>
                    </div>
                  </div>
                  <div className={styles.resetWarning}>
                    <AlertTriangle size={12} />
                    This password is shown only once. Copy and share it securely.
                  </div>
                </div>
              )}

              {/* Custom Password Input */}
              {showCustomPw && (
                <div className={styles.customPwSection}>
                  <div className={styles.customPwTitle}>Set Custom Password</div>
                  <div className={styles.customPwInputWrap}>
                    <input
                      type="text"
                      className={styles.customPwInput}
                      placeholder="Enter new password (min 6 chars)"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      autoFocus
                    />
                    <button
                      className={styles.customPwSubmit}
                      disabled={customPassword.length < 6 || actionLoading}
                      onClick={() => handleResetPassword(customPassword)}
                    >
                      {actionLoading ? 'Setting...' : 'Set'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Cards */}
              <div className={styles.actionsGrid}>
                <button
                  className={styles.actionCard}
                  onClick={() => handleResetPassword()}
                  disabled={actionLoading}
                >
                  <div className={`${styles.actionIconBox} ${styles.actionIconReset}`}>
                    <RefreshCw size={18} />
                  </div>
                  <span className={styles.actionLabel}>Auto Reset</span>
                  <span className={styles.actionDesc}>Generate a random secure password</span>
                </button>

                <button
                  className={styles.actionCard}
                  onClick={() => setShowCustomPw(!showCustomPw)}
                  disabled={actionLoading}
                >
                  <div className={`${styles.actionIconBox} ${styles.actionIconCustomPw}`}>
                    <Lock size={18} />
                  </div>
                  <span className={styles.actionLabel}>Custom Password</span>
                  <span className={styles.actionDesc}>Set a specific password manually</span>
                </button>

                <button
                  className={styles.actionCard}
                  onClick={handleToggleAccess}
                  disabled={actionLoading}
                >
                  <div className={`${styles.actionIconBox} ${info.is_active ? styles.actionIconDeactivate : styles.actionIconActivate}`}>
                    {info.is_active ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
                  </div>
                  <span className={styles.actionLabel}>
                    {info.is_active ? 'Deactivate' : 'Activate'}
                  </span>
                  <span className={styles.actionDesc}>
                    {info.is_active ? 'Block student portal login' : 'Allow student portal login'}
                  </span>
                </button>

                <button
                  className={styles.actionCard}
                  onClick={() => {
                    const allInfo = `Student: ${info.full_name}\nAdmission: ${info.admission_number}\nUsername: ${info.username}\nPortal: Student Portal\nLogin URL: /login/student`;
                    handleCopy(allInfo, 'allInfo');
                  }}
                >
                  <div className={`${styles.actionIconBox} ${styles.actionIconReset}`} style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>
                    <Copy size={18} />
                  </div>
                  <span className={styles.actionLabel}>
                    {copied.allInfo ? 'Copied!' : 'Copy Info'}
                  </span>
                  <span className={styles.actionDesc}>Copy all login details to clipboard</span>
                </button>
              </div>

              {/* Meta Info */}
              <div className={styles.credCard}>
                <div className={styles.credCardTitle}>Account Details</div>
                {info.email && (
                  <div className={styles.infoRow}>
                    <Mail size={14} /> {info.email}
                  </div>
                )}
                {info.phone && (
                  <div className={styles.infoRow}>
                    <Phone size={14} /> {info.phone}
                  </div>
                )}
                <div className={styles.infoRow}>
                  <Clock size={14} /> Joined: {formatDate(info.date_joined)}
                </div>
                <div className={styles.infoRow}>
                  <User size={14} /> Last Login: {formatDate(info.last_login)}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.loadingState}>
              <AlertTriangle size={24} color="#ef4444" />
              <span className={styles.loadingText}>Failed to load portal info.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortalAccessModal;
