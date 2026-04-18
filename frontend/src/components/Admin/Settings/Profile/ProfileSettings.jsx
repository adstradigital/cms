import React, { useState, useEffect } from 'react';
import { UserCircle2, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import authApi from '@/api/authApi';

const ProfileSettings = ({ styles }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', date_of_birth: '', emergency_contact_name: '', emergency_contact_phone: ''
  });
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.profile?.address || '',
        date_of_birth: user.profile?.date_of_birth || '',
        emergency_contact_name: user.profile?.emergency_contact_name || '',
        emergency_contact_phone: user.profile?.emergency_contact_phone || '',
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      await authApi.updateProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
        phone: profileForm.phone,
      });
      await authApi.updateProfileDetails({
        address: profileForm.address,
        date_of_birth: profileForm.date_of_birth,
        emergency_contact_name: profileForm.emergency_contact_name,
        emergency_contact_phone: profileForm.emergency_contact_phone,
      });
      setNotice({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setNotice({ type: 'error', message: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>My Profile</h2>
          <p className={styles.subtitle}>Manage your personal information and contact details.</p>
        </div>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={loading}>
          <Save size={16} /> {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {notice && (
        <div className={`${styles.notice} ${notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}`}>
          {notice.message}
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <UserCircle2 size={18} />
          <h3>Basic Information</h3>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>First Name</label>
            <input value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Last Name</label>
            <input value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Phone Number</label>
            <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <UserCircle2 size={18} />
          <h3>Additional Details</h3>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Date of Birth</label>
            <input type="date" value={profileForm.date_of_birth} onChange={e => setProfileForm({...profileForm, date_of_birth: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Address</label>
            <input value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Emergency Contact Name</label>
            <input value={profileForm.emergency_contact_name} onChange={e => setProfileForm({...profileForm, emergency_contact_name: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Emergency Contact Phone</label>
            <input value={profileForm.emergency_contact_phone} onChange={e => setProfileForm({...profileForm, emergency_contact_phone: e.target.value})} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProfileSettings;
