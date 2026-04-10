import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import styles from '../AllStaff.module.css';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';

export default function StaffOnboardingModal({ roles, assignableRoles, onClose, onSuccess }) {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [addTab, setAddTab] = useState('personal'); 
  const [addForm, setAddForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', employee_id: '',
    designation: '', joining_date: '', is_teaching_staff: true, role: '',
    password: '', gender: 'other', dob: '', blood_group: '', qualification: '',
    experience_years: 0, address: '', emergency_contact_name: '', emergency_contact_phone: ''
  });

  const createStaff = async () => {
    if (!addForm.first_name.trim() || !addForm.employee_id.trim() || !addForm.designation.trim() || !addForm.joining_date) {
      push('Please fill in all required fields.', 'error');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        first_name: addForm.first_name.trim(),
        last_name: addForm.last_name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        employee_id: addForm.employee_id.trim(),
        designation: addForm.designation.trim(),
        joining_date: addForm.joining_date,
        is_teaching_staff: !!addForm.is_teaching_staff,
        role: addForm.role ? Number(addForm.role) : undefined,
        password: addForm.password || 'TempPass123',
        gender: addForm.gender,
        dob: addForm.dob,
        blood_group: addForm.blood_group,
        qualification: addForm.qualification,
        experience_years: Number(addForm.experience_years),
        address: addForm.address,
        emergency_contact_name: addForm.emergency_contact_name,
        emergency_contact_phone: addForm.emergency_contact_phone,
      };
      const res = await adminApi.createStaff(payload);
      push('Staff member successfully onboarded', 'success');
      onSuccess(res.data);
    } catch {
      push('Could not create staff member. Check for duplicate ID or Email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalLg}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 style={{ margin: 0 }}>Detailed Staff Onboarding</h3>
          <div className={styles.modalHeaderActions}>
            <div className={styles.headerRoleWrap}>
              <span className={styles.headerHint}>Role</span>
              <select
                className={styles.headerRoleSelect}
                value={addForm.role}
                onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="">Select role</option>
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <span className={styles.staffTypeChip}>
              {addForm.is_teaching_staff ? 'Teacher Flow' : 'Staff Flow'}
            </span>
            <button className={styles.modalClose} onClick={onClose}>X</button>
          </div>
        </div>

        <div className={styles.modalTabs}>
          <button className={`${styles.tabBtn} ${addTab === 'personal' ? styles.tabBtnActive : ''}`} onClick={() => setAddTab('personal')}>Personal Details</button>
          <button className={`${styles.tabBtn} ${addTab === 'professional' ? styles.tabBtnActive : ''}`} onClick={() => setAddTab('professional')}>Professional Info</button>
          <button className={`${styles.tabBtn} ${addTab === 'contact' ? styles.tabBtnActive : ''}`} onClick={() => setAddTab('contact')}>Contact & Others</button>
        </div>

        <div className={styles.modalBody}>
          {addTab === 'personal' && (
            <div className={styles.formGrid}>
              <div>
                <label>First Name*</label>
                <input value={addForm.first_name} onChange={(e) => setAddForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="Required" />
              </div>
              <div>
                <label>Last Name</label>
                <input value={addForm.last_name} onChange={(e) => setAddForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
              <div>
                <label>Date of Birth</label>
                <input type="date" value={addForm.dob} onChange={(e) => setAddForm((p) => ({ ...p, dob: e.target.value }))} />
              </div>
              <div>
                <label>Gender</label>
                <select value={addForm.gender} onChange={(e) => setAddForm((p) => ({ ...p, gender: e.target.value }))}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label>Blood Group</label>
                <select value={addForm.blood_group} onChange={(e) => setAddForm((p) => ({ ...p, blood_group: e.target.value }))}>
                  <option value="">Select</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label>Teaching Staff?</label>
                <select value={String(addForm.is_teaching_staff)} onChange={(e) => setAddForm((p) => ({ ...p, is_teaching_staff: e.target.value === 'true' }))}>
                  <option value="true">Yes (Teacher)</option>
                  <option value="false">No (Staff)</option>
                </select>
              </div>
            </div>
          )}

          {addTab === 'professional' && (
            <div className={styles.formGrid}>
              <div>
                <label>Employee ID*</label>
                <input value={addForm.employee_id} onChange={(e) => setAddForm((p) => ({ ...p, employee_id: e.target.value }))} placeholder="Required (e.g. STF001)" />
              </div>
              <div>
                <label>Designation*</label>
                <input value={addForm.designation} onChange={(e) => setAddForm((p) => ({ ...p, designation: e.target.value }))} placeholder="Required (e.g. Senior Teacher)" />
              </div>
              <div>
                <label>Joining Date*</label>
                <input type="date" value={addForm.joining_date} onChange={(e) => setAddForm((p) => ({ ...p, joining_date: e.target.value }))} />
              </div>
              <div>
                <label>Role Badge</label>
                <select value={addForm.role} onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value="">(optional)</option>
                  {assignableRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Qualification</label>
                <input value={addForm.qualification} onChange={(e) => setAddForm((p) => ({ ...p, qualification: e.target.value }))} placeholder="e.g. M.Ed, PhD" />
              </div>
              <div>
                <label>Exp. Years</label>
                <input type="number" value={addForm.experience_years} onChange={(e) => setAddForm((p) => ({ ...p, experience_years: e.target.value }))} />
              </div>
            </div>
          )}

          {addTab === 'contact' && (
            <div className={styles.formGrid}>
              <div>
                <label>Email Address</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label>Phone Number</label>
                <input value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className={styles.fullRow}>
                <label>Permanent Address</label>
                <textarea value={addForm.address} onChange={(e) => setAddForm((p) => ({ ...p, address: e.target.value }))} className={styles.textarea} rows={3} />
              </div>
              <div>
                <label>Emergency Contact Name</label>
                <input value={addForm.emergency_contact_name} onChange={(e) => setAddForm((p) => ({ ...p, emergency_contact_name: e.target.value }))} />
              </div>
              <div>
                <label>Emergency Contact Phone</label>
                <input value={addForm.emergency_contact_phone} onChange={(e) => setAddForm((p) => ({ ...p, emergency_contact_phone: e.target.value }))} />
              </div>
              <div className={styles.fullRow} style={{ marginTop: 10, borderTop: '1px solid var(--theme-border)', paddingTop: 14 }}>
                <label>Temporary Password</label>
                <input value={addForm.password} onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))} placeholder="Defaults to TempPass123" />
                <p style={{ fontSize: 11, color: 'var(--theme-text-secondary)', marginTop: 4 }}>User will be asked to change this on first login.</p>
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <button className={styles.btn} onClick={onClose} disabled={loading}>Cancel</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createStaff} disabled={loading}>
              <Plus size={16} /> Complete Onboarding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
