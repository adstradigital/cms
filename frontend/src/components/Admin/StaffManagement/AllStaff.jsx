'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, LayoutGrid, List, MoreVertical, Plus, RefreshCw, Search, Shield, UserRoundX, UserRoundCheck, KeyRound } from 'lucide-react';
import styles from './AllStaff.module.css';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { ToastStack, useToast } from '@/components/common/useToast';

function csvExport(rows, filename) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AllStaffView = () => {
  const router = useRouter();
  const [view, setView] = useState('table'); // table | grid
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | teacher | non_teacher
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive | on_leave
  const [roleIdFilter, setRoleIdFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  const [menuId, setMenuId] = useState(null);
  const [profile, setProfile] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState('personal'); // personal | professional | contact
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employee_id: '',
    designation: '',
    joining_date: '',
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

  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [confirmReset, setConfirmReset] = useState(null);
  const [resetResult, setResetResult] = useState(null);

  const { toasts, push, dismiss } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (roleIdFilter !== 'all') params.role_id = roleIdFilter;
      const [staffRes, rolesRes] = await Promise.all([
        adminApi.getStaff(params).catch(() => null),
        adminApi.getRolesV2().catch(() => null),
      ]);
      const staffList = Array.isArray(staffRes?.data)
        ? staffRes.data
        : Array.isArray(staffRes?.data?.results)
          ? staffRes.data.results
          : [];
      const roleList = Array.isArray(rolesRes?.data)
        ? rolesRes.data
        : Array.isArray(rolesRes?.data?.results)
          ? rolesRes.data.results
          : [];
      setStaff(staffList);
      setRoles(roleList);
      setSelectedIds([]);
    } catch {
      push('Could not load staff directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return staff.filter((s) => {
      const matches =
        !term ||
        [s.full_name, s.employee_id, s.email, s.phone].some((x) => String(x || '').toLowerCase().includes(term));
      const matchesRole =
        roleFilter === 'all' ? true :
        roleFilter === 'teacher' ? !!s.is_teaching_staff :
        roleFilter === 'non_teacher' ? !s.is_teaching_staff :
        true;
      const matchesStatus =
        statusFilter === 'all' ? true : s.status === statusFilter;
      const matchesRoleId =
        roleIdFilter === 'all' ? true : String(s.user_role_id || s.role_id || s.role || '') === String(roleIdFilter);
      return matches && matchesRole && matchesStatus && matchesRoleId;
    });
  }, [staff, search, roleFilter, statusFilter, roleIdFilter]);

  const toggleAll = () => {
    const ids = filtered.map((s) => s.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : ids);
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const exportSelected = () => {
    const list = staff.filter((s) => selectedIds.includes(s.id));
    const rows = [
      ['Employee ID', 'Name', 'Role', 'Designation', 'Phone', 'Email', 'Join Date', 'Status'],
      ...list.map((s) => [
        s.employee_id,
        s.full_name,
        s.role_name || '',
        s.designation,
        s.phone || '',
        s.email || '',
        s.joining_date || '',
        s.status,
      ]),
    ];
    csvExport(rows, 'staff-export.csv');
  };

  const exportAll = () => {
    const rows = [
      ['Employee ID', 'Name', 'Role', 'Designation', 'Phone', 'Email', 'Join Date', 'Status'],
      ...filtered.map((s) => [
        s.employee_id,
        s.full_name,
        s.role_name || '',
        s.designation,
        s.phone || '',
        s.email || '',
        s.joining_date || '',
        s.status,
      ]),
    ];
    csvExport(rows, 'staff-export.csv');
  };

  const openProfile = async (id) => {
    const res = await adminApi.getStaffDetail(id).catch(() => null);
    setProfile(res?.data || staff.find((x) => x.id === id) || null);
  };

  const assignRole = async (staffId, roleId) => {
    try {
      const res = await adminApi.updateStaff(staffId, { role: roleId ? Number(roleId) : null }).catch(() => null);
      if (res?.data) {
        setStaff((prev) => prev.map((x) => (x.id === staffId ? res.data : x)));
        setProfile((p) => (p?.id === staffId ? res.data : p));
      }
      push('Role updated', 'success');
    } catch {
      push('Could not update role', 'error');
    }
  };

  const setActive = async (staffRow, active) => {
    try {
      const res = await adminApi.updateStaff(staffRow.id, { is_active: active, status: active ? 'active' : 'inactive' }).catch(() => null);
      if (res?.data) setStaff((prev) => prev.map((x) => (x.id === staffRow.id ? res.data : x)));
      push(active ? 'Staff reactivated' : 'Staff deactivated', 'success');
    } catch {
      push('Could not update staff status', 'error');
    }
  };

  const resetCredentials = async (staffId) => {
    try {
      const res = await adminApi.resetStaffCredentials(staffId).catch(() => null);
      setResetResult(res?.data || null);
      push('Temporary password generated', 'success');
    } catch {
      push('Could not reset credentials', 'error');
    }
  };

  const openRolePermissions = (staffRow) => {
    const roleId = staffRow.user_role_id || staffRow.role_id || staffRow.role;
    if (roleId) {
      router.push(`/admins/staff/roles?tab=roles&roleId=${roleId}`);
      return;
    }
    router.push(`/admins/staff/roles?tab=users&userId=${staffRow.user_id || staffRow.id}&user=${encodeURIComponent(staffRow.full_name || '')}`);
  };

  const openUserOverrides = (staffRow) => {
    router.push(`/admins/staff/roles?tab=users&userId=${staffRow.user_id || staffRow.id}&user=${encodeURIComponent(staffRow.full_name || '')}`);
  };

  const createStaff = async () => {
    if (!addForm.first_name.trim() || !addForm.employee_id.trim() || !addForm.designation.trim() || !addForm.joining_date) return;
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
        // New detailed fields
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
      setStaff((prev) => [res.data, ...prev]);
      setAddOpen(false);
      setAddForm({
        first_name: '', last_name: '', email: '', phone: '', employee_id: '',
        designation: '', joining_date: '', is_teaching_staff: true, role: '',
        password: '', gender: 'other', dob: '', blood_group: '', qualification: '',
        experience_years: 0, address: '', emergency_contact_name: '', emergency_contact_phone: ''
      });
      push('Staff created', 'success');
    } catch {
      push('Could not create staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  const roleBadge = (s) => (
    <span className={styles.roleBadge}>
      <Shield size={12} /> {s.role_name || (s.is_teaching_staff ? 'Teacher' : 'Staff')}
    </span>
  );

  const statusBadge = (s) => (
    <span className={`${styles.statusBadge} ${s.status === 'active' ? styles.statusActive : s.status === 'on_leave' ? styles.statusLeave : styles.statusInactive}`}>
      {s.status}
    </span>
  );

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: 'var(--theme-text)' }}>All Staff</h2>
        <p style={{ marginTop: 6, color: 'var(--theme-text-secondary)', fontWeight: 800, fontSize: 13 }}>
          Directory, onboarding, role assignment, and account management.
        </p>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, email, employee ID" />
        </div>
        <select className={styles.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="teacher">Teachers</option>
          <option value="non_teacher">Non-teaching</option>
        </select>
        <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
        </select>
        <select className={styles.select} value={roleIdFilter} onChange={(e) => setRoleIdFilter(e.target.value)}>
          <option value="all">All Role Badges</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <div className={styles.viewToggle}>
          <button className={`${styles.iconBtn} ${view === 'table' ? styles.iconBtnActive : ''}`} onClick={() => setView('table')}><List size={16} /></button>
          <button className={`${styles.iconBtn} ${view === 'grid' ? styles.iconBtnActive : ''}`} onClick={() => setView('grid')}><LayoutGrid size={16} /></button>
        </div>
        <button className={styles.btn} onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
        <button className={styles.btn} onClick={exportAll} disabled={filtered.length === 0}><Download size={16} /> Export</button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setAddOpen(true)}><Plus size={16} /> Add Staff</button>
      </div>

      {selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <span><b>{selectedIds.length}</b> selected</span>
          <div className={styles.bulkActions}>
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={exportSelected}><Download size={14} /> Export Selected</button>
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => setSelectedIds([])}>Clear</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>Loading staff directory...</div>
      ) : view === 'grid' ? (
        <div className={styles.grid}>
          {filtered.map((s) => (
            <div key={s.id} className={styles.card} onClick={() => openProfile(s.id)}>
              <div className={styles.cardTop}>
                {statusBadge(s)}
                <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); setMenuId((p) => (p === s.id ? null : s.id)); }}>
                  <MoreVertical size={16} />
                </button>
                {menuId === s.id && (
                  <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
                    <button className={styles.menuItem} onClick={() => openProfile(s.id)}>View Profile</button>
                    <button className={styles.menuItem} onClick={() => openRolePermissions(s)}>Manage Role</button>
                    <button className={styles.menuItem} onClick={() => openUserOverrides(s)}>User Overrides</button>
                    <button className={styles.menuItem} onClick={() => setConfirmReset(s)}>Reset Credentials</button>
                    <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => setConfirmDeactivate(s)}>
                      {s.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.avatar}>{String(s.full_name || 'S').split(' ').map((n) => n[0]).join('')}</div>
              <div className={styles.cardName}>{s.full_name}</div>
              <div className={styles.cardMeta}>{s.designation} - {s.employee_id}</div>
              <div style={{ marginTop: 10 }}>{roleBadge(s)}</div>
              <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                <select
                  className={styles.inlineSelect}
                  value={String(s.user_role_id || s.role_id || s.role || '')}
                  onChange={(e) => assignRole(s.id, e.target.value)}
                >
                  <option value="">No role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.small}>{s.email || ''}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><input type="checkbox" checked={filtered.length > 0 && filtered.every((x) => selectedIds.includes(x.id))} onChange={toggleAll} /></th>
                <th>Staff</th>
                <th>Role</th>
                <th>Designation</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Join Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className={styles.emptyRow}>No staff match your filters.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} onClick={() => openProfile(s.id)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleOne(s.id)} />
                  </td>
                  <td>
                    <div className={styles.rowName}>
                      <div className={styles.avatarSm}>{String(s.full_name || 'S')[0]}</div>
                      <div>
                        <b>{s.full_name}</b>
                        <div className={styles.muted}>{s.employee_id}</div>
                      </div>
                    </div>
                  </td>
                  <td>{roleBadge(s)}</td>
                  <td>{s.designation}</td>
                  <td>{s.phone || '-'}</td>
                  <td>{s.email || '-'}</td>
                  <td>{s.joining_date || '-'}</td>
                  <td>{statusBadge(s)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.rowActions}>
                      <select className={styles.inlineSelect} value={String(s.user_role_id || s.role_id || s.role || '')} onChange={(e) => assignRole(s.id, e.target.value)}>
                        <option value="">No role</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button className={styles.iconBtn} title="Manage role permissions" onClick={() => openRolePermissions(s)}><Shield size={16} /></button>
                      <button className={styles.iconBtn} title="Reset credentials" onClick={() => { setConfirmReset(s); }}><KeyRound size={16} /></button>
                      <button className={styles.iconBtn} title={s.status === 'inactive' ? 'Reactivate' : 'Deactivate'} onClick={() => setConfirmDeactivate(s)}>
                        {s.status === 'inactive' ? <UserRoundCheck size={16} /> : <UserRoundX size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <div className={styles.modalOverlay} onClick={() => setAddOpen(false)}>
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
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <span className={styles.staffTypeChip}>
                  {addForm.is_teaching_staff ? 'Teacher Flow' : 'Staff Flow'}
                </span>
                <button className={styles.modalClose} onClick={() => setAddOpen(false)}>X</button>
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
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
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
                      {roles.map((r) => (
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
                <button className={styles.btn} onClick={() => setAddOpen(false)}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createStaff} disabled={loading}>
                  <Plus size={16} /> Complete Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {profile && (
        <div className={styles.modalOverlay} onClick={() => { setProfile(null); setResetResult(null); }}>
          <div className={styles.modalLg} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Staff Profile</h3>
              <button className={styles.modalClose} onClick={() => { setProfile(null); setResetResult(null); }}>X</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.profileTop}>
                <div className={styles.avatarLg}>{String(profile.full_name || 'S').split(' ').map((n) => n[0]).join('')}</div>
                <div style={{ flex: 1 }}>
                  <div className={styles.profileName}>{profile.full_name}</div>
                  <div className={styles.muted}>{profile.designation} - {profile.employee_id}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {roleBadge(profile)}
                    {statusBadge(profile)}
                  </div>
                </div>
              </div>

              <div className={styles.profileGrid}>
                <div className={styles.kpi}>
                  <span>Email</span>
                  <b>{profile.email || '-'}</b>
                </div>
                <div className={styles.kpi}>
                  <span>Phone</span>
                  <b>{profile.phone || '-'}</b>
                </div>
                <div className={styles.kpi}>
                  <span>Joining Date</span>
                  <b>{profile.joining_date || '-'}</b>
                </div>
              </div>

              <div className={styles.profileActions}>
                <select className={styles.select} value={String(profile.user_role_id || profile.role_id || profile.role || '')} onChange={(e) => assignRole(profile.id, e.target.value)}>
                  <option value="">No role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button className={styles.btn} onClick={() => openRolePermissions(profile)}><Shield size={16} /> Role Permissions</button>
                <button className={styles.btn} onClick={() => setConfirmReset(profile)}><KeyRound size={16} /> Reset Credentials</button>
                <button className={styles.btn} onClick={() => setConfirmDeactivate(profile)}>
                  {profile.status === 'inactive' ? <UserRoundCheck size={16} /> : <UserRoundX size={16} />}
                  {profile.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                </button>
              </div>

              {Array.isArray(profile.teacher_info?.allocated_subjects) && profile.teacher_info.allocated_subjects.length > 0 && (
                <div className={styles.resetBox}>
                  <b>Academic Allocations</b>
                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                    {profile.teacher_info.allocated_subjects.slice(0, 10).map((a, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{a.subject_name}</span>
                        <span style={{ color: 'var(--theme-text-secondary)', fontWeight: 800 }}>{a.class_name} - {a.section_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resetResult && (
                <div className={styles.resetBox}>
                  <b>Temporary Credentials</b>
                  <div className={styles.resetRow}><span>Username</span><code>{resetResult.username}</code></div>
                  <div className={styles.resetRow}><span>Password</span><code>{resetResult.temp_password}</code></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeactivate}
        title={confirmDeactivate?.status === 'inactive' ? 'Reactivate Staff' : 'Deactivate Staff'}
        message={confirmDeactivate?.status === 'inactive' ? 'This will reactivate the staff account.' : 'This will deactivate the staff account.'}
        confirmText={confirmDeactivate?.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
        onCancel={() => setConfirmDeactivate(null)}
        onConfirm={() => {
          const row = confirmDeactivate;
          setConfirmDeactivate(null);
          setActive(row, row.status === 'inactive');
        }}
      />

      <ConfirmDialog
        open={!!confirmReset}
        title="Reset Credentials"
        message="This generates a new temporary password for the staff user."
        confirmText="Generate"
        onCancel={() => setConfirmReset(null)}
        onConfirm={() => {
          const row = confirmReset;
          setConfirmReset(null);
          resetCredentials(row.id);
        }}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const AllStaff = () => (
  <ErrorBoundary>
    <AllStaffView />
  </ErrorBoundary>
);

export default AllStaff;
