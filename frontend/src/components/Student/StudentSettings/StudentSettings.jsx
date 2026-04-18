'use client';

import React, { useState, useEffect } from 'react';
import styles from './StudentSettings.module.css';
import useFetch from '@/hooks/useFetch';
import instance from '@/api/instance';
import { 
  User, 
  Lock, 
  Settings, 
  Bell, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Monitor
} from 'lucide-react';

export default function StudentSettings() {
  const [activeTab, setActiveTab] = useState('account');
  const [message, setMessage] = useState({ type: '', text: '' });
  const { data: student, loading, refetch } = useFetch('/students/students/my-profile/');

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  if (loading || !student?.user) {
    return (
      <div className={styles.loader}>
        <Loader2 size={40} className="animate-spin" color="#4f46e5" />
        <p>Initializing your settings portal...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>System Settings</h1>
        <p>Manage your account, security, and dashboard preferences</p>
      </header>

      <div className={styles.mainLayout}>
        <aside className={styles.tabsSidebar}>
          <TabButton 
            id="account" 
            label="Account" 
            icon={<User size={18} />} 
            active={activeTab} 
            onClick={setActiveTab} 
          />
          <TabButton 
            id="security" 
            label="Security" 
            icon={<Lock size={18} />} 
            active={activeTab} 
            onClick={setActiveTab} 
          />
          <TabButton 
            id="preferences" 
            label="Display" 
            icon={<Monitor size={18} />} 
            active={activeTab} 
            onClick={setActiveTab} 
          />
          <TabButton 
            id="notifications" 
            label="Notifications" 
            icon={<Bell size={18} />} 
            active={activeTab} 
            onClick={setActiveTab} 
          />
        </aside>

        <main className={styles.contentArea}>
          {message.text && (
            <div className={`${styles.toast} ${message.type === 'success' ? styles.successToast : styles.errorToast}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          {activeTab === 'account' && (
            <AccountSettings student={student} onUpdate={refetch} onMessage={showMessage} />
          )}

          {activeTab === 'security' && (
            <SecuritySettings onMessage={showMessage} />
          )}

          {activeTab === 'preferences' && (
            <DisplaySettings onMessage={showMessage} />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings onMessage={showMessage} />
          )}
        </main>
      </div>
    </div>
  );
}

function AccountSettings({ student, onUpdate, onMessage }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone: student.user.phone || '',
    address: student.user.profile?.address || ''
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await instance.patch('/students/students/update-my-profile/', formData);
      onUpdate();
      onMessage('success', 'Profile information updated successfully.');
    } catch (err) {
      onMessage('error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3>Personal Information</h3>
      <p className={styles.cardSubtitle}>Manage your contact details and how the institution reaches you.</p>
      
      <form className={styles.formGrid} onSubmit={handleSave}>
        <div className={styles.inputGroup}>
          <label>Full Name</label>
          <input className={styles.input} value={student.user.first_name + ' ' + student.user.last_name} disabled />
        </div>
        <div className={styles.inputGroup}>
          <label>Student ID</label>
          <input className={styles.input} value={student.admission_number} disabled />
        </div>
        <div className={styles.inputGroup}>
          <label>Phone Number</label>
          <input 
            className={styles.input} 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Institutional Email</label>
          <input className={styles.input} value={student.user.email} disabled />
        </div>
        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
          <label>Residential Address</label>
          <textarea 
            className={`${styles.input} ${styles.textarea}`} 
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
          />
        </div>

        <div className={`${styles.cardActions} ${styles.fullWidth}`}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
            {saving ? 'Syncing...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SecuritySettings({ onMessage }) {
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      onMessage('error', 'New passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      await instance.post('/accounts/change-password/', {
        old_password: formData.old_password,
        new_password: formData.new_password
      });
      onMessage('success', 'Password changed successfully. Your session remains active.');
      setFormData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      onMessage('error', err.response?.data?.error || 'Failed to change password. Please verify your old password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3>Account Security</h3>
      <p className={styles.cardSubtitle}>Ensure your portal access is secure with a strong password.</p>
      
      <form className={styles.formGrid} onSubmit={handleSave}>
        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
          <label>Current Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPasswords ? 'text' : 'password'} 
              className={styles.input} 
              style={{ width: '100%' }}
              value={formData.old_password}
              onChange={(e) => setFormData({...formData, old_password: e.target.value})}
            />
            <button 
              type="button" 
              onClick={() => setShowPasswords(!showPasswords)}
              style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#94a3b8' }}
            >
              {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label>New Password</label>
          <input 
            type={showPasswords ? 'text' : 'password'} 
            className={styles.input} 
            value={formData.new_password}
            onChange={(e) => setFormData({...formData, new_password: e.target.value})}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Confirm New Password</label>
          <input 
            type={showPasswords ? 'text' : 'password'} 
            className={styles.input} 
            value={formData.confirm_password}
            onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
          />
        </div>

        <div className={`${styles.cardActions} ${styles.fullWidth}`}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
            {saving ? 'Updating Security...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DisplaySettings({ onMessage }) {
  const [bgEffects, setBgEffects] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('student_bg_effects');
    setBgEffects(saved !== 'disabled');
  }, []);

  const handleToggleBg = () => {
    const newVal = !bgEffects;
    setBgEffects(newVal);
    localStorage.setItem('student_bg_effects', newVal ? 'ready' : 'disabled');
    window.location.reload(); // Reload to apply/remove canvas effect properly
    onMessage('success', `Interactive background ${newVal ? 'enabled' : 'disabled'}.`);
  };

  return (
    <div className={styles.card}>
      <h3>Display Preferences</h3>
      <p className={styles.cardSubtitle}>Customize how the portal looks on your device.</p>
      
      <div className={styles.preferenceItem}>
        <div className={styles.prefInfo}>
          <h4>Floating Background Effects</h4>
          <p>Toggle the interactive light balls in the background. Disabling this may improve performance on older devices.</p>
        </div>
        <label className={styles.switch}>
          <input type="checkbox" checked={bgEffects} onChange={handleToggleBg} />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.preferenceItem}>
        <div className={styles.prefInfo}>
          <h4>Dark Appearance</h4>
          <p>Switch between light and dark console modes (System default is active).</p>
        </div>
        <label className={styles.switch}>
          <input type="checkbox" disabled />
          <span className={styles.slider}></span>
        </label>
      </div>
    </div>
  );
}

function NotificationSettings({ onMessage }) {
  return (
    <div className={styles.card}>
      <h3>Notification Center</h3>
      <p className={styles.cardSubtitle}>Stay informed about assignments, exams, and school announcements.</p>
      
      <div className={styles.preferenceItem}>
        <div className={styles.prefInfo}>
          <h4>In-App Notifications</h4>
          <p>Receive alerts directly in the dashboard header.</p>
        </div>
        <label className={styles.switch}>
          <input type="checkbox" defaultChecked />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.preferenceItem}>
        <div className={styles.prefInfo}>
          <h4>Email Announcements</h4>
          <p>Get important circulars sent to your registered email address.</p>
        </div>
        <label className={styles.switch}>
          <input type="checkbox" defaultChecked />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.preferenceItem}>
        <div className={styles.prefInfo}>
          <h4>SMS Alerts</h4>
          <p>Critical updates like attendance warnings or exam schedule changes.</p>
        </div>
        <label className={styles.switch}>
          <input type="checkbox" />
          <span className={styles.slider}></span>
        </label>
      </div>
    </div>
  );
}

function TabButton({ id, label, icon, active, onClick }) {
  return (
    <button 
      className={`${styles.tabBtn} ${active === id ? styles.activeTab : ''}`} 
      onClick={() => onClick(id)}
    >
      <div className={styles.iconBox}>{icon}</div>
      <span>{label}</span>
    </button>
  );
}
