'use client';

import React, { useState, useMemo } from 'react';
import styles from './StudentProfile.module.css';
import useFetch from '@/hooks/useFetch';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Award, 
  ShieldCheck, 
  FileText, 
  Users, 
  Edit3, 
  Camera, 
  CheckCircle2, 
  X,
  Loader2,
  Lock
} from 'lucide-react';
import instance from '@/api/instance';

export default function StudentProfile() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Use the dedicated my-profile endpoint (no admin permission needed)
  const { data: student, loading, refetch } = useFetch('/students/students/my-profile/');

  const [formData, setFormData] = useState({
    phone: '',
    address: ''
  });

  const completeness = useMemo(() => {
    if (!student?.user) return 0;
    const profile = student.user.profile;
    const fields = [
      student.user.phone,
      profile?.address,
      profile?.date_of_birth,
      profile?.gender,
      profile?.father_name,
      profile?.blood_group
    ];
    const filled = fields.filter(f => f && f !== 'N/A' && f !== '').length;
    return Math.round((filled / fields.length) * 100);
  }, [student]);

  const handleEditClick = () => {
    if (!student?.user) return;
    setFormData({
      phone: student.user.phone || '',
      address: student.user.profile?.address || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await instance.patch('/students/students/update-my-profile/', {
        phone: formData.phone,
        address: formData.address
      });
      refetch();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !student?.user) {
    return (
      <div className={styles.loader}>
        <Loader2 size={40} className="animate-spin" color="#4f46e5" />
        <p>Syncing your student record...</p>
      </div>
    );
  }

  const { user } = student;
  const profile = user?.profile;

  return (
    <div className={styles.container}>
      {/* PROFILE HEADER RIBBON */}
      <section className={styles.achievementRibbon}>
        <div className={styles.achievementMain}>
          <div className={styles.profileHero}>
            <div className={styles.avatarWrapper}>
              {profile?.photo ? (
                <img src={profile.photo} alt={user.first_name} className={styles.avatarImage} />
              ) : (
                <div className={styles.avatarPlaceholder}>{user.first_name?.charAt(0)}</div>
              )}
              <div className={styles.editPhotoBtn}>
                <Camera size={14} />
              </div>
            </div>
            <div className={styles.heroInfo}>
              <h1>{user.first_name} {user.last_name}</h1>
              <div className={styles.heroMeta}>
                <span className={styles.statusBadge}>ACTIVE STUDENT</span>
                <span className={styles.rollText}>Adm: {student.admission_number} • Roll: {student.roll_number}</span>
              </div>
            </div>
          </div>

          <div className={styles.verticalDivider} />

          {/* Completeness Gauge */}
          <div className={styles.gaugeCol}>
            <div className={styles.circularGauge}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.gaugeBg} cx="50" cy="50" r="45" />
                <circle 
                  className={styles.gaugeFill} 
                  style={{ strokeDashoffset: 283 - (283 * completeness) / 100, stroke: '#10b981' }} 
                  cx="50" cy="50" r="45" 
                />
              </svg>
              <div className={styles.gaugeContent}>
                <span className={styles.gaugeValue}>{completeness}%</span>
                <span className={styles.gaugeLabel}>COMPLETE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.mainLayout}>
        {/* SIDEBAR TABS */}
        <div className={styles.tabsSidebar}>
          <TabButton id="overview" label="Overview" icon={<ShieldCheck size={18} />} active={activeTab} onClick={setActiveTab} />
          <TabButton id="personal" label="Personal Details" icon={<User size={18} />} active={activeTab} onClick={setActiveTab} />
          <TabButton id="family" label="Family & Guardian" icon={<Users size={18} />} active={activeTab} onClick={setActiveTab} />
          <TabButton id="academic" label="Academic Records" icon={<Award size={18} />} active={activeTab} onClick={setActiveTab} />
        </div>

        {/* CONTENT AREA */}
        <div className={styles.contentArea}>
          {activeTab === 'overview' && (
            <InfoCard title="Essential Records" onEdit={handleEditClick}>
              <div className={styles.detailsGrid}>
                <DetailItem label="Full Name" value={`${user.first_name} ${user.last_name}`} />
                <DetailItem label="Class & Section" value={student.section_name || 'N/A'} />
                <DetailItem label="Contact Email" value={user.email || 'N/A'} />
                <DetailItem label="Phone Number" value={user.phone || 'N/A'} />
                <DetailItem label="Permanent Address" value={profile?.address || 'N/A'} />
                <DetailItem label="Admission Date" value={student.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'N/A'} />
              </div>
            </InfoCard>
          )}

          {activeTab === 'personal' && (
            <InfoCard title="Detailed Information">
              <div className={styles.detailsGrid}>
                <DetailItem label="Date of Birth" value={profile?.date_of_birth || 'N/A'} />
                <DetailItem label="Gender" value={profile?.gender?.toUpperCase() || 'N/A'} />
                <DetailItem label="Blood Group" value={profile?.blood_group || 'N/A'} />
                <DetailItem label="Aadhaar Number" value={profile?.aadhaar_number || 'N/A'} />
                <DetailItem label="Emergency Contact" value={profile?.emergency_contact_name || 'N/A'} />
                <DetailItem label="Emergency Phone" value={profile?.emergency_contact_phone || 'N/A'} />
              </div>
            </InfoCard>
          )}

          {activeTab === 'family' && (
            <InfoCard title="Parental Records">
              <div className={styles.detailsGrid}>
                <DetailItem label="Father's Name" value={profile?.father_name || 'N/A'} />
                <DetailItem label="Father's Occupation" value={profile?.father_occupation || 'N/A'} />
                <DetailItem label="Mother's Name" value={profile?.mother_name || 'N/A'} />
                <DetailItem label="Mother's Occupation" value={profile?.mother_occupation || 'N/A'} />
                <DetailItem label="Parent Phone" value={profile?.parent_phone || 'N/A'} />
                <DetailItem label="Parent Email" value={profile?.parent_email || 'N/A'} />
              </div>
            </InfoCard>
          )}

          {activeTab === 'academic' && (
            <InfoCard title="Academic Profile">
              <div className={styles.detailsGrid}>
                <DetailItem label="Admission Number" value={student.admission_number} isLocked />
                <DetailItem label="Roll Number" value={student.roll_number} isLocked />
                <DetailItem label="Grade / Class" value={student.class_name || 'N/A'} isLocked />
                <DetailItem label="Current Section" value={student.section_name?.split('—')[1]?.trim() || 'N/A'} isLocked />
                <DetailItem label="Hostel Resident" value={student.hostel_resident ? 'Yes' : 'No'} isLocked />
                <DetailItem label="Transport User" value={student.transport_user ? 'Yes' : 'No'} isLocked />
              </div>
            </InfoCard>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Update Contact Information</h3>
              <X size={20} cursor="pointer" onClick={() => setIsEditModalOpen(false)} />
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
              <label>Permanent Address</label>
              <textarea 
                className={styles.input} 
                style={{ height: '100px', resize: 'none' }}
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
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

function InfoCard({ title, children, onEdit }) {
  return (
    <div className={styles.infoCard}>
      <div className={styles.cardHeader}>
        <h3>{title}</h3>
        {onEdit && (
          <button className={styles.editBtn} onClick={onEdit}>
            <Edit3 size={14} /> Edit Info
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function DetailItem({ label, value, isLocked }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.label}>
        {label} {isLocked && <Lock size={10} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />}
      </span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
