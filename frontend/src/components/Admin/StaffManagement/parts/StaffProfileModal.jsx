import React, { useState } from 'react';
import { Mail, Phone, Calendar, Power, Edit3, Save, Trash2, KeyRound } from 'lucide-react';
import styles from '../AllStaff.module.css';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';

export default function StaffProfileModal({ staff, assignableRoles, onClose, onUpdate, onDelete }) {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [resettingCreds, setResettingCreds] = useState(false);
  const [newCreds, setNewCreds] = useState(null);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    first_name: staff.first_name || '', last_name: staff.last_name || '', 
    email: staff.email || '', phone: staff.phone || '', 
    employee_id: staff.employee_id || '', designation: staff.designation || '', 
    role: staff.role || ''
  });

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const payload = { ...editForm, role: editForm.role ? Number(editForm.role) : null };
      const res = await adminApi.updateStaff(staff.id, payload);
      push('Staff profile updated securely', 'success');
      onUpdate(res.data);
      setIsEditing(false);
    } catch {
      push('Failed to update staff profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    try {
      setLoading(true);
      const res = await adminApi.updateStaffStatus(staff.id, { is_active: !staff.is_active });
      push(`Staff marked as ${res.data.is_active ? 'Active' : 'Inactive'}`, 'success');
      onUpdate(res.data);
    } catch {
      push('Failed to update status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCreds = async () => {
    try {
      setResettingCreds(true);
      const res = await adminApi.resetStaffCredentials(staff.id);
      setNewCreds(res.data);
      push('Credentials reset successfully', 'success');
    } catch {
      push('Failed to reset credentials', 'error');
    } finally {
      setResettingCreds(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Terminate ${staff.first_name}? This action is irreversible.`)) return;
    try {
      setLoading(true);
      await adminApi.deleteStaff(staff.id);
      push('Staff terminated', 'success');
      onDelete(staff.id);
    } catch {
      push('Failed to terminate staff', 'error');
      setLoading(false); // Only set false on catch, because on success it unmounts
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.profileTop} style={{ marginBottom: 0 }}>
            <div className={styles.avatarLg}>{staff.first_name?.[0] ?? '?'}</div>
            <div>
              <div className={styles.profileName}>{staff.first_name ?? ''} {staff.last_name ?? ''}</div>
              <div className={styles.muted} style={{ fontSize: 13, marginTop: 4 }}>
                {staff.designation} • {staff.employee_id}
              </div>
            </div>
          </div>
          <button className={styles.modalClose} onClick={onClose}>X</button>
        </div>

        <div className={styles.modalTabs}>
          <button className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`${styles.tabBtn} ${activeTab === 'security' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('security')}>Security & Access</button>
        </div>

        <div className={styles.modalBody}>
          {activeTab === 'overview' && (
            <>
              <div className={styles.profileActions}>
                {!isEditing ? (
                  <button className={styles.btn} onClick={() => setIsEditing(true)}>
                    <Edit3 size={14} /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleUpdate} disabled={loading}>
                      <Save size={14} /> Save Changes
                    </button>
                    <button className={styles.btn} onClick={() => setIsEditing(false)}>Cancel</button>
                  </>
                )}
                
                <button 
                  className={styles.btn} 
                  style={{ color: staff.is_active ? 'var(--color-danger)' : 'var(--color-success)', borderColor: staff.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}
                  onClick={toggleStatus}
                  disabled={loading}
                >
                  <Power size={14} /> {staff.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>

              <div style={{ marginTop: 20 }}>
                {isEditing ? (
                  <div className={styles.formGrid}>
                    <div>
                      <label>First Name</label>
                      <input value={editForm.first_name} onChange={(e) => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <label>Last Name</label>
                      <input value={editForm.last_name} onChange={(e) => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
                    </div>
                    <div>
                      <label>Phone</label>
                      <input value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label>Email</label>
                      <input value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label>Designation</label>
                      <input value={editForm.designation} onChange={(e) => setEditForm(p => ({ ...p, designation: e.target.value }))} />
                    </div>
                    <div>
                      <label>Assign Role</label>
                      <select value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                        <option value="">(None)</option>
                        {assignableRoles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className={styles.profileGrid}>
                    <div className={styles.kpi}><span>Email</span><b>{staff.email || '—'}</b></div>
                    <div className={styles.kpi}><span>Phone</span><b>{staff.phone || '—'}</b></div>
                    <div className={styles.kpi}><span>Role</span><b>{staff.role_name || 'Unassigned'}</b></div>
                    <div className={styles.kpi}><span>Joined</span><b>{staff.joining_date || '—'}</b></div>
                    <div className={styles.kpi}><span>Account Status</span>
                      <b style={{ color: staff.is_active ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {staff.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </b>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div style={{ marginTop: 10 }}>
              <h4 style={{ marginBottom: 10, color: 'var(--theme-text)' }}>Access Credentials</h4>
              <p className={styles.small} style={{ marginBottom: 20 }}>
                Resetting credentials will invalidate the user's current password. A new temporary password will be generated.
              </p>
              
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleResetCreds} disabled={resettingCreds}>
                <KeyRound size={16} /> Force Password Reset
              </button>

              {newCreds && (
                <div className={styles.resetBox}>
                  <div style={{ color: 'var(--color-success)', fontWeight: 900, marginBottom: 8 }}>✓ Credentials Generated</div>
                  <div className={styles.resetRow}><span>Username:</span> <code>{newCreds.username}</code></div>
                  <div className={styles.resetRow}><span>Temp Password:</span> <code>{newCreds.temp_password}</code></div>
                  <p style={{ fontSize: 11, color: 'var(--theme-text-secondary)', marginTop: 12 }}>
                    Please securely provide these to the staff member. They will be forced to change it upon login.
                  </p>
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid var(--theme-border)', margin: '30px 0' }} />
              
              <h4 style={{ color: 'var(--color-danger)', marginBottom: 10 }}>Danger Zone</h4>
              <p className={styles.small} style={{ marginBottom: 20 }}>
                Terminating a staff member permanently removes their account from the system. Reassign their roles prior to deletion.
              </p>
              <button 
                className={styles.btn} 
                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 size={16} /> Terminate Employee
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
