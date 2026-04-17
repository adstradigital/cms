import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Palette,
  Save,
  Plus,
  Trash2,
  Calendar,
  Image as ImageIcon,
  UserCircle2,
  PhoneCall,
  HeartPulse,
  ShieldCheck,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import styles from './SchoolSettings.module.css';

import schoolApi from '@/api/schoolApi';
import authApi from '@/api/authApi';
import { useAuth } from '@/context/AuthContext';

const EMPTY_PROFILE = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  health_notes: '',
  allergies: '',
};

const EMPTY_PASSWORD = {
  old_password: '',
  new_password: '',
  confirm_password: '',
};

const SchoolSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [activeSchool, setActiveSchool] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD);
  const [notice, setNotice] = useState(null);
  const { user, fetchProfile } = useAuth();

  const syncProfileForm = (currentUser, details = {}) => {
    const profile = details || currentUser?.profile || {};
    setProfileForm({
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      address: profile.address || '',
      date_of_birth: profile.date_of_birth || '',
      gender: profile.gender || '',
      blood_group: profile.blood_group || '',
      emergency_contact_name: profile.emergency_contact_name || '',
      emergency_contact_phone: profile.emergency_contact_phone || '',
      health_notes: profile.health_notes || '',
      allergies: profile.allergies || '',
    });
  };

  const pushNotice = (type, message) => {
    setNotice({ type, message });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [schoolRes, yearsRes, profileRes] = await Promise.allSettled([
        schoolApi.getSchools(),
        schoolApi.getAcademicYears(),
        authApi.getProfileDetails(),
      ]);

      if (schoolRes.status === 'fulfilled' && schoolRes.value.data?.length > 0) {
        setActiveSchool(schoolRes.value.data[0]);
      } else {
        setActiveSchool(null);
      }

      if (yearsRes.status === 'fulfilled') {
        setAcademicYears(yearsRes.value.data || []);
      } else {
        setAcademicYears([]);
      }

      if (user) {
        const details = profileRes.status === 'fulfilled' ? profileRes.value.data : user.profile;
        syncProfileForm(user, details);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      pushNotice('error', 'Could not load all settings data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setActiveSchool((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSchool = async () => {
    if (!activeSchool) return;
    setSaving(true);
    try {
      await schoolApi.updateSchool(activeSchool.id, activeSchool);
      pushNotice('success', 'School settings saved successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      pushNotice('error', 'Could not save school settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkProfile = async () => {
    if (!activeSchool) return;
    setLinking(true);
    try {
      await authApi.updateProfile({ school: activeSchool.id });
      await fetchProfile();
      pushNotice('success', 'Your account is now linked to this school.');
    } catch (error) {
      console.error('Error linking profile:', error);
      pushNotice('error', 'Could not link your account to this school.');
    } finally {
      setLinking(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const { first_name, last_name, email, phone, ...detailsPayload } = profileForm;
      await Promise.all([
        authApi.updateProfile({ first_name, last_name, email, phone }),
        authApi.updateProfileDetails(detailsPayload),
      ]);
      await fetchProfile();
      pushNotice('success', 'Your profile details were updated successfully.');
    } catch (error) {
      console.error('Error saving profile:', error);
      pushNotice('error', 'Could not save your profile right now.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.old_password || !passwordForm.new_password) {
      pushNotice('error', 'Enter your current password and a new password.');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      pushNotice('error', 'New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await authApi.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm(EMPTY_PASSWORD);
      pushNotice('success', 'Password updated successfully.');
    } catch (error) {
      console.error('Error changing password:', error);
      pushNotice(
        'error',
        error?.response?.data?.old_password?.[0] ||
          error?.response?.data?.new_password?.[0] ||
          error?.response?.data?.error ||
          'Could not change your password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading settings...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage your profile, account security, school identity, and academic cycles.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.saveButtonAlt} onClick={handleSaveProfile} disabled={profileSaving}>
            <UserCircle2 size={18} />
            {profileSaving ? 'Saving Profile...' : 'Save Profile'}
          </button>
          <button className={styles.saveButton} onClick={handleSaveSchool} disabled={saving || !activeSchool}>
            <Save size={18} />
            {saving ? 'Saving School...' : 'Save School'}
          </button>
        </div>
      </header>

      {notice && (
        <div className={`${styles.notice} ${notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}`}>
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notice.message}</span>
        </div>
      )}

      <div className={styles.settingsGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <UserCircle2 size={20} className={styles.sectionIcon} />
              <h2>My Profile</h2>
            </div>
            <p className={styles.sectionDescription}>Keep your contact and emergency details up to date for daily operations.</p>

            <div className={styles.profileHero}>
              <div className={styles.profileAvatar}>
                {(user?.full_name || user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className={styles.profileSummary}>
                <h3>{user?.full_name || `${profileForm.first_name} ${profileForm.last_name}`.trim() || user?.username || 'Administrator'}</h3>
                <p>{user?.role_name || 'Administrator'}{user?.school_name ? ` at ${user.school_name}` : ''}</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>First Name</label>
                <input type="text" name="first_name" value={profileForm.first_name} onChange={handleProfileInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name</label>
                <input type="text" name="last_name" value={profileForm.last_name} onChange={handleProfileInputChange} />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <div className={styles.inputWithIcon}>
                  <Mail size={16} />
                  <input type="email" name="email" value={profileForm.email} onChange={handleProfileInputChange} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <div className={styles.inputWithIcon}>
                  <PhoneCall size={16} />
                  <input type="text" name="phone" value={profileForm.phone} onChange={handleProfileInputChange} />
                </div>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Date of Birth</label>
                <input type="date" name="date_of_birth" value={profileForm.date_of_birth} onChange={handleProfileInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Gender</label>
                <select name="gender" value={profileForm.gender} onChange={handleProfileInputChange}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Blood Group</label>
                <input type="text" name="blood_group" value={profileForm.blood_group} onChange={handleProfileInputChange} placeholder="e.g. O+" />
              </div>
              <div className={styles.formGroup}>
                <label>Emergency Contact Name</label>
                <input type="text" name="emergency_contact_name" value={profileForm.emergency_contact_name} onChange={handleProfileInputChange} />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Emergency Contact Phone</label>
              <div className={styles.inputWithIcon}>
                <ShieldCheck size={16} />
                <input type="text" name="emergency_contact_phone" value={profileForm.emergency_contact_phone} onChange={handleProfileInputChange} />
              </div>
            </div>

            <div className={styles.formGroupFull}>
              <label>Address</label>
              <div className={styles.inputWithIcon}>
                <MapPin size={16} />
                <textarea name="address" value={profileForm.address} onChange={handleProfileInputChange} rows={2} />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Health Notes</label>
                <div className={styles.inputWithIcon}>
                  <HeartPulse size={16} />
                  <textarea name="health_notes" value={profileForm.health_notes} onChange={handleProfileInputChange} rows={3} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Allergies</label>
                <textarea name="allergies" value={profileForm.allergies} onChange={handleProfileInputChange} rows={3} />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Building2 size={20} className={styles.sectionIcon} />
              <h2>School Profile</h2>
            </div>
            <p className={styles.sectionDescription}>Manage your institution identity and visual branding.</p>

            {!activeSchool ? (
              <div className={styles.emptyState}>
                <p>No school record has been created yet.</p>
              </div>
            ) : (
              <>
                <div className={styles.sectionActions}>
                  <button
                    className={styles.linkButton}
                    onClick={handleLinkProfile}
                    disabled={linking}
                    title="Link your user account to the current school"
                  >
                    {linking ? 'Updating...' : 'Link My Account to This School'}
                  </button>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>School Name</label>
                    <input
                      type="text"
                      name="name"
                      value={activeSchool.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Schoolastica High School"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Tagline</label>
                    <input
                      type="text"
                      name="tagline"
                      value={activeSchool.tagline}
                      onChange={handleInputChange}
                      placeholder="e.g. Success in every step"
                    />
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label>Address</label>
                  <div className={styles.inputWithIcon}>
                    <MapPin size={16} />
                    <textarea name="address" value={activeSchool.address} onChange={handleInputChange} rows={2} />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Phone Number</label>
                    <div className={styles.inputWithIcon}>
                      <Phone size={16} />
                      <input type="text" name="phone" value={activeSchool.phone} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email Address</label>
                    <div className={styles.inputWithIcon}>
                      <Mail size={16} />
                      <input type="email" name="email" value={activeSchool.email} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Website URL</label>
                  <div className={styles.inputWithIcon}>
                    <Globe size={16} />
                    <input type="url" name="website" value={activeSchool.website} onChange={handleInputChange} />
                  </div>
                </div>

                <div className={styles.innerSection}>
                  <div className={styles.sectionHeader}>
                    <Palette size={20} className={styles.sectionIcon} />
                    <h2>Branding & Theme</h2>
                  </div>

                  <div className={styles.brandingGrid}>
                    <div className={styles.logoUpload}>
                      <label>Institutional Logo</label>
                      <div className={styles.logoPreview}>
                        {activeSchool.logo ? (
                          <img src={activeSchool.logo} alt="Logo" />
                        ) : (
                          <div className={styles.logoPlaceholder}>
                            <ImageIcon size={32} />
                            <span>Upload Logo</span>
                          </div>
                        )}
                      </div>
                      <button className={styles.uploadBtn}>Change Logo</button>
                    </div>

                    <div className={styles.colorPickers}>
                      <div className={styles.colorGroup}>
                        <label>Primary Color</label>
                        <div className={styles.colorInputWrapper}>
                          <input type="color" name="primary_color" value={activeSchool.primary_color} onChange={handleInputChange} />
                          <code>{activeSchool.primary_color}</code>
                        </div>
                        <p className={styles.colorHelp}>Used for buttons, headers, and active states.</p>
                      </div>

                      <div className={styles.colorGroup}>
                        <label>Secondary Color</label>
                        <div className={styles.colorInputWrapper}>
                          <input type="color" name="secondary_color" value={activeSchool.secondary_color} onChange={handleInputChange} />
                          <code>{activeSchool.secondary_color}</code>
                        </div>
                        <p className={styles.colorHelp}>Used for accents and secondary UI elements.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <div className={styles.sideColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <LockKeyhole size={20} className={styles.sectionIcon} />
              <h2>Security</h2>
            </div>
            <p className={styles.sectionDescription}>Use a strong password to protect your admin access.</p>

            <div className={styles.formGroup}>
              <label>Current Password</label>
              <input type="password" name="old_password" value={passwordForm.old_password} onChange={handlePasswordInputChange} />
            </div>
            <div className={styles.formGroup}>
              <label>New Password</label>
              <input type="password" name="new_password" value={passwordForm.new_password} onChange={handlePasswordInputChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Confirm New Password</label>
              <input type="password" name="confirm_password" value={passwordForm.confirm_password} onChange={handlePasswordInputChange} />
            </div>

            <button className={styles.saveButtonFull} onClick={handlePasswordSave} disabled={passwordSaving}>
              <LockKeyhole size={18} />
              {passwordSaving ? 'Updating Password...' : 'Update Password'}
            </button>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeaderBetween}>
              <div className={styles.sectionHeader}>
                <Calendar size={20} className={styles.sectionIcon} />
                <h2>Academic Years</h2>
              </div>
              <button className={styles.addButton}>
                <Plus size={14} />
              </button>
            </div>
            <p className={styles.sectionDescription}>Review the cycles currently configured for this school.</p>

            <div className={styles.yearsList}>
              {academicYears.map((year) => (
                <div key={year.id} className={`${styles.yearCard} ${year.is_active ? styles.activeYear : ''}`}>
                  <div className={styles.yearInfo}>
                    <span className={styles.yearName}>{year.name}</span>
                    <span className={styles.yearDates}>{year.start_date} - {year.end_date}</span>
                  </div>
                  <div className={styles.yearActions}>
                    {year.is_active && <span className={styles.activeBadge}>Current</span>}
                    <button className={styles.deleteIcon}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {academicYears.length === 0 && (
                <div className={styles.emptyState}>
                  <p>No academic years have been added yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SchoolSettings;
