'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, LayoutGrid, List, ExternalLink, Shield } from 'lucide-react';
import styles from './Staff.module.css';
import adminApi from '@/api/adminApi';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const TeacherList = () => {
  const router = useRouter();
  const [view, setView] = useState('grid');
  const [teachers, setTeachers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Staff Onboarding State
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState('personal'); // personal | professional | contact
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    designation: 'Teacher',
    joining_date: new Date().toISOString().split('T')[0],
    is_teaching_staff: true,
    role: '',
    password: '',
    // Detailed fields
    gender: 'other',
    dob: '',
    blood_group: '',
    qualification: '',
    experience_years: 0,
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const [teachersRes, rolesRes] = await Promise.all([
        adminApi.getTeachers(),
        adminApi.getRolesV2().catch(() => null),
      ]);
      setTeachers(normalizeList(teachersRes.data));
      setRoles(normalizeList(rolesRes?.data));
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
      setTeachers([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter((t) =>
      String(t.full_name || '').toLowerCase().includes(term) ||
      String(t.employee_id || '').toLowerCase().includes(term) ||
      String(t.email || '').toLowerCase().includes(term)
    );
  }, [teachers, searchQuery]);
 
  const displayRoles = useMemo(() => {
    return roles.filter(r => r.name !== 'Class Teacher');
  }, [roles]);

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!addForm.first_name.trim() || !addForm.joining_date) {
      alert('Please fill in all required fields (First Name, Joining Date)');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...addForm,
        first_name: addForm.first_name.trim(),
        last_name: addForm.last_name.trim(),
        experience_years: Number(addForm.experience_years),
        password: addForm.password || 'TempPass123',
      };

      await adminApi.createStaff(payload);
      await fetchTeachers();
      setAddOpen(false);
      setAddForm({
        first_name: '', last_name: '', email: '', phone: '',
        designation: 'Teacher', joining_date: new Date().toISOString().split('T')[0],
        is_teaching_staff: true, role: '', password: '', gender: 'other', dob: '',
        blood_group: '', qualification: '', experience_years: 0, address: '',
        emergency_contact_name: '', emergency_contact_phone: ''
      });
    } catch (err) {
      console.error('Failed to create teacher:', err);
      alert(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const assignTeacherRole = async (teacherId, roleId) => {
    try {
      const res = await adminApi.updateStaff(teacherId, { role: roleId ? Number(roleId) : null });
      setTeachers((prev) => prev.map((teacher) => (teacher.id === teacherId ? { ...teacher, ...res.data } : teacher)));
    } catch (err) {
      console.error('Failed to update teacher role:', err);
      alert('Could not update teacher role');
    }
  };

  const openRolePermissions = (teacher) => {
    const userId = teacher.user_id || teacher.id;
    const params = teacher.user_role_id || teacher.role_id || teacher.role
      ? `tab=roles&roleId=${teacher.user_role_id || teacher.role_id || teacher.role}`
      : `tab=users&userId=${userId}&user=${encodeURIComponent(teacher.full_name || '')}`;
    router.push(`/admins/staff/roles?${params}`);
  };

  const openUserOverrides = (teacher) => {
    router.push(`/admins/staff/roles?tab=users&userId=${teacher.user_id || teacher.id}&user=${encodeURIComponent(teacher.full_name || '')}`);
  };

  const renderGridView = () => (
    <div className={styles.grid}>
      {filteredTeachers.map((teacher) => (
        <div key={teacher.id} className={styles.card}>
          <div className={`${styles.statusBadge} ${teacher.status === 'active' ? styles.active : ''}`}>
            {teacher.status}
          </div>

          <div className={styles.cardHeader}>
            <div className={styles.avatar}>
              {String(teacher.full_name || 'T').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className={styles.teacherInfo}>
              <h3>{teacher.full_name}</h3>
              <span>{teacher.designation} - {teacher.employee_id}</span>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Joined</span>
              <div className={styles.statValue}>
                {teacher.joining_date || '-'}
              </div>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Email</span>
              <div className={styles.statValue} style={{ fontSize: 11, wordBreak: 'break-all' }}>
                {teacher.email || '-'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span className={styles.statLabel}>Role</span>
            <div className={styles.roleRow}>
              <div className={styles.tagContainer}>
                <span className={styles.tag}>{teacher.role_name || 'Teacher'}</span>
              </div>
              <select
                className={styles.roleSelect}
                value={String(teacher.user_role_id || teacher.role_id || teacher.role || '')}
                onChange={(e) => assignTeacherRole(teacher.id, e.target.value)}
              >
                <option value="">No role</option>
                {displayRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button className={styles.btn} type="button" onClick={() => openUserOverrides(teacher)}>
              <ExternalLink size={14} /> Special Access
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={() => openRolePermissions(teacher)}>
              <Shield size={14} /> Permissions
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Teacher</th>
            <th className={styles.th}>Employee ID</th>
            <th className={styles.th}>Joining Date</th>
            <th className={styles.th}>Role</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredTeachers.map((teacher) => (
            <tr key={teacher.id}>
              <td className={styles.td}>
                <div className={styles.teacherRow}>
                  <div className={styles.avatarSmall}>{String(teacher.full_name || 'T')[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{teacher.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>{teacher.designation}</div>
                  </div>
                </div>
              </td>
              <td className={styles.td}>{teacher.employee_id}</td>
              <td className={styles.td}>{teacher.joining_date || '-'}</td>
              <td className={styles.td}>
                <select
                  className={styles.roleSelect}
                  value={String(teacher.user_role_id || teacher.role_id || teacher.role || '')}
                  onChange={(e) => assignTeacherRole(teacher.id, e.target.value)}
                >
                  <option value="">No role</option>
                  {displayRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </td>
              <td className={styles.td}>
                <span className={`${styles.statusBadge} ${teacher.status === 'active' ? styles.active : ''}`} style={{ position: 'static' }}>
                  {teacher.status}
                </span>
              </td>
              <td className={styles.td}>
                <div className={styles.inlineActions}>
                  <button className={styles.btn} style={{ width: 'auto', padding: '6px 12px' }} type="button" onClick={() => openRolePermissions(teacher)}>
                    <Shield size={14} /> Role
                  </button>
                  <button className={styles.btn} style={{ width: 'auto', padding: '6px 12px' }} type="button" onClick={() => openUserOverrides(teacher)}>
                    <ExternalLink size={14} /> Special Access
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={styles.container} style={{ padding: 0 }}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>Staff Directory</h2>
          <p>Manage all your teachers and academic personnel here.</p>
        </div>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          style={{ width: 'auto', padding: '10px 24px', flex: '0 0 auto' }}
          type="button"
          onClick={() => {
            setAddTab('personal');
            setAddOpen(true);
          }}
        >
          <Plus size={18} /> Register New Staff
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, ID, email..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('grid')}
            type="button"
            aria-label="Grid view"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('list')}
            type="button"
            aria-label="List view"
          >
            <List size={18} />
          </button>
        </div>

        <button className={styles.btn} style={{ width: 'auto', flex: '0 0 auto' }} type="button" onClick={fetchTeachers}>
          <Filter size={18} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading teachers...</div>
      ) : (
        view === 'grid' ? renderGridView() : renderListView()
      )}

      {/* STAFF REGISTRATION MODAL */}
      {addOpen && (
        <div className={styles.modalOverlay} onClick={() => setAddOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Register New Staff Member</h3>
              <button className={styles.modalClose} onClick={() => setAddOpen(false)}>×</button>
            </div>

            <div className={styles.modalTabs}>
              <button className={`${styles.tabBtn} ${addTab === 'personal' ? styles.tabBtnActive : ''}`} onClick={() => setAddTab('personal')}>Personal Details</button>
              <button className={`${styles.tabBtn} ${addTab === 'professional' ? styles.tabBtnActive : ''}`} onClick={() => setAddTab('professional')}>Professional Info</button>
              <button className={`${styles.tabBtn} ${addTab === 'contact' ? styles.tabBtnActive : ''}`} onClick={() => setAddTab('contact')}>Contact & Others</button>
            </div>

            <div className={styles.modalBody}>
              {addTab === 'personal' && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>First Name*</label>
                    <input value={addForm.first_name} onChange={(e) => setAddForm(p => ({ ...p, first_name: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Last Name</label>
                    <input value={addForm.last_name} onChange={(e) => setAddForm(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Date of Birth</label>
                    <input type="date" value={addForm.dob} onChange={(e) => setAddForm(p => ({ ...p, dob: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Gender</label>
                    <select value={addForm.gender} onChange={(e) => setAddForm(p => ({ ...p, gender: e.target.value }))}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Blood Group</label>
                    <select value={addForm.blood_group} onChange={(e) => setAddForm(p => ({ ...p, blood_group: e.target.value }))}>
                      <option value="">Select</option>
                      <option value="A+">A+</option> <option value="A-">A-</option>
                      <option value="B+">B+</option> <option value="B-">B-</option>
                      <option value="O+">O+</option> <option value="O-">O-</option>
                      <option value="AB+">AB+</option> <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              )}

              {addTab === 'professional' && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Designation*</label>
                    <input value={addForm.designation} onChange={(e) => setAddForm(p => ({ ...p, designation: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Joining Date*</label>
                    <input type="date" value={addForm.joining_date} onChange={(e) => setAddForm(p => ({ ...p, joining_date: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Qualification</label>
                    <input value={addForm.qualification} onChange={(e) => setAddForm(p => ({ ...p, qualification: e.target.value }))} placeholder="M.Ed, PhD..." />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Role Badge</label>
                    <select value={addForm.role} onChange={(e) => setAddForm(p => ({ ...p, role: e.target.value }))}>
                      <option value="">Select role</option>
                      {displayRoles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Total Experience (Years)</label>
                    <input type="number" value={addForm.experience_years} onChange={(e) => setAddForm(p => ({ ...p, experience_years: e.target.value }))} />
                  </div>
                </div>
              )}

              {addTab === 'contact' && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Email Address</label>
                    <input type="email" value={addForm.email} onChange={(e) => setAddForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Phone Number</label>
                    <input value={addForm.phone} onChange={(e) => setAddForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.fullRow}`}>
                    <label>Permanent Address</label>
                    <textarea rows={3} value={addForm.address} onChange={(e) => setAddForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup} style={{ borderTop: '1px solid var(--theme-border)', paddingTop: '1.25rem' }}>
                    <label>Temporary Password</label>
                    <input value={addForm.password} onChange={(e) => setAddForm(p => ({ ...p, password: e.target.value }))} placeholder="Defaults to TempPass123" />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setAddOpen(false)}>Cancel</button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleCreateTeacher}
                disabled={loading}
              >
                Add Staff Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherList;
