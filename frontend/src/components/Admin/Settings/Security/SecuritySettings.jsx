import React, { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import authApi from '@/api/authApi';

const SecuritySettings = ({ styles }) => {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!passwordForm.old_password || !passwordForm.new_password) {
      setNotice({ type: 'error', message: 'Enter your current password and a new password.' });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setNotice({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      await authApi.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setNotice({ type: 'success', message: 'Password updated successfully.' });
    } catch (error) {
      setNotice({ 
        type: 'error', 
        message: error?.response?.data?.old_password?.[0] || 'Could not change your password.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Security</h2>
          <p className={styles.subtitle}>Manage your password and security preferences.</p>
        </div>
      </div>

      {notice && (
        <div className={`${styles.notice} ${notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}`}>
          {notice.message}
        </div>
      )}

      <section className={styles.section} style={{ maxWidth: '600px' }}>
        <div className={styles.sectionHeader}>
          <LockKeyhole size={18} />
          <h3>Update Password</h3>
        </div>
        
        <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className={styles.formGroup}>
            <label>Current Password</label>
            <input 
              type="password" 
              value={passwordForm.old_password} 
              onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} 
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>New Password</label>
            <input 
              type="password" 
              value={passwordForm.new_password} 
              onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} 
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Confirm New Password</label>
            <input 
              type="password" 
              value={passwordForm.confirm_password} 
              onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} 
              required
            />
          </div>
          
          <div style={{ marginTop: '0.5rem' }}>
            <button type="submit" className={styles.btnPrimary} disabled={loading} style={{ width: '100%' }}>
              <LockKeyhole size={16} /> {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default SecuritySettings;
