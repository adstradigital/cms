'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Save, Trash2, Search, Filter, Shield, User, Clock, CheckSquare, Square, ChevronDown } from 'lucide-react';
import adminApi from '@/api/adminApi';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';
import styles from './RolesPermissions.module.css';

// ----------------------------------------------------------------------
// Helper functions
// ----------------------------------------------------------------------
function groupPermissions(perms) {
  const groups = {};
  for (const p of perms) {
    const key = p.module || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
const RolesPermissionsView = () => {
  const [activeTab, setActiveTab] = useState('roles'); // 'roles', 'users', 'changelog'
  const [loading, setLoading] = useState(false);
  const { toasts, push, dismiss } = useToast();

  // Globals
  const [perms, setPerms] = useState([]);
  
  // Roles Tab State
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped', 'individual'
  const [dirtyPerms, setDirtyPerms] = useState(null); // Set<number>
  
  // Users Tab State
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // Full object for permissions view
  const [userSearch, setUserSearch] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userDirtyPerms, setUserDirtyPerms] = useState(null); // Set<number> individual overrides

  // Changelog Tab State
  const [changelog, setChangelog] = useState([]);

  // Modals
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', scope: 'school' });
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(null);

  // ----------------------------------------------------------------------
  // Data Loading
  // ----------------------------------------------------------------------
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [rRes, pRes] = await Promise.all([
        adminApi.getRolesV2(),
        adminApi.getPermissions()
      ]);
      const rList = Array.isArray(rRes.data) ? rRes.data : rRes.data?.results || [];
      const pList = Array.isArray(pRes.data) ? pRes.data : pRes.data?.results || [];
      
      setRoles(rList);
      setPerms(pList);
      
      if (!selectedRoleId && rList.length > 0) {
        setSelectedRoleId(rList[0].id);
      }
    } catch (e) {
      push('Could not load roles and permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadChangelog = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPermissionChangelog();
      setChangelog(Array.isArray(res.data) ? res.data : []);
    } catch {
      push('Could not load change log', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStaffUsers = async (search = '') => {
    try {
      const res = await adminApi.getPermStaffUsers({ search });
      setStaffUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      push('Could not search staff users', 'error');
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'changelog') loadChangelog();
    if (activeTab === 'users' && staffUsers.length === 0) loadStaffUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ----------------------------------------------------------------------
  // Roles Tab Logic
  // ----------------------------------------------------------------------
  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId) || null, [roles, selectedRoleId]);

  useEffect(() => {
    if (selectedRole) {
      setDirtyPerms(new Set((selectedRole.permissions || []).map((x) => Number(x))));
    } else {
      setDirtyPerms(null);
    }
  }, [selectedRole?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRolePerm = (permId) => {
    if (!selectedRole || !selectedRole.is_custom) return; // Prevent edit on read-only system roles
    setDirtyPerms((prev) => {
      const next = new Set(prev);
      const id = Number(permId);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModuleGroup = (modulePermIds, forceState = null) => {
    if (!selectedRole || !selectedRole.is_custom) return;
    setDirtyPerms((prev) => {
      const next = new Set(prev);
      let allChecked = true;
      for (const id of modulePermIds) {
        if (!next.has(id)) allChecked = false;
      }

      const shouldCheck = forceState !== null ? forceState : !allChecked;

      for (const id of modulePermIds) {
        if (shouldCheck) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const saveRole = async () => {
    if (!selectedRole || !selectedRole.is_custom) return;
    try {
      setLoading(true);
      const permissions = Array.from(dirtyPerms).sort((a, b) => a - b);
      const res = await adminApi.updateRoleV2(selectedRole.id, { permissions });
      setRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? res.data : r)));
      push('Role permissions saved successfully', 'success');
    } catch {
      push('Could not save role permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    const name = newRoleForm.name.trim();
    if (!name) return;
    try {
      setLoading(true);
      const payload = { name, scope: newRoleForm.scope, is_custom: true, permissions: [] };
      const res = await adminApi.createRoleV2(payload);
      setRoles((prev) => [...prev, res.data].sort((a, b) => Number(a.is_custom) - Number(b.is_custom) || a.name.localeCompare(b.name)));
      setCreateRoleOpen(false);
      setNewRoleForm({ name: '', scope: 'school' });
      setSelectedRoleId(res.data.id);
      push('Custom role created', 'success');
    } catch {
      push('Could not create role. Name must be unique.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (role) => {
    try {
      setLoading(true);
      await adminApi.deleteRoleV2(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      setSelectedRoleId((prev) => (prev === role.id ? roles[0]?.id : prev));
      push('Role deleted', 'success');
    } catch {
      push('Could not delete role', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered computed values for Roles view
  const filteredRoles = useMemo(() => {
    if (!roleSearch) return roles;
    return roles.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()));
  }, [roles, roleSearch]);

  const groupedFilteredPerms = useMemo(() => {
    let list = perms;
    if (permSearch) {
      const q = permSearch.toLowerCase();
      list = list.filter(p => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return groupPermissions(list);
  }, [perms, permSearch]);

  // ----------------------------------------------------------------------
  // Users Tab Logic
  // ----------------------------------------------------------------------
  const fetchUserPermissions = async (userId) => {
    try {
      setLoading(true);
      const res = await adminApi.getUserPermissions(userId);
      setSelectedUser(res.data);
      setUserDirtyPerms(new Set(res.data.individual_permissions || []));
      setUserDropdownOpen(false);
    } catch {
      push('Could not load user permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserPerm = (permId) => {
    setUserDirtyPerms((prev) => {
      const next = new Set(prev);
      const id = Number(permId);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveUserPerms = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const individual_permissions = Array.from(userDirtyPerms).sort((a, b) => a - b);
      const res = await adminApi.updateUserPermissions(selectedUser.user_id, { individual_permissions });
      setSelectedUser((prev) => ({ ...prev, individual_permissions: res.data.individual_permissions }));
      push('User overrides saved successfully', 'success');
    } catch {
      push('Could not save user overrides', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Render Helpers
  // ----------------------------------------------------------------------
  const renderRolesTab = () => (
    <div className={styles.splitLayout}>
      <div className={styles.leftPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input 
              placeholder="Search roles..." 
              value={roleSearch} 
              onChange={e => setRoleSearch(e.target.value)} 
            />
          </div>
          <button className={styles.iconBtn} onClick={() => setCreateRoleOpen(true)} title="New Role">
            <Plus size={16} />
          </button>
        </div>

        <div className={styles.roleList}>
          {filteredRoles.map(r => (
            <div 
              key={r.id} 
              className={`${styles.roleCard} ${r.id === selectedRoleId ? styles.roleCardActive : ''}`}
              onClick={() => setSelectedRoleId(r.id)}
            >
              <div className={styles.roleCardHeader}>
                <div className={styles.roleName}>{r.name}</div>
                {!r.is_custom && <div className={styles.systemBadge}>System</div>}
                {r.is_custom && <div className={styles.customBadge}>Custom</div>}
              </div>
              <div className={styles.roleMeta}>
                <span>{r.permissions?.length || 0} perms</span>
                <span>•</span>
                <span style={{textTransform:'capitalize'}}>{r.scope} scope</span>
              </div>
            </div>
          ))}
          {filteredRoles.length === 0 && <div className={styles.emptyState}>No roles found.</div>}
        </div>
      </div>

      <div className={styles.rightPanel}>
        {selectedRole ? (
          <>
            <div className={styles.rightHeader}>
              <div className={styles.roleInfo}>
                <h2>{selectedRole.name}</h2>
                <p>
                  {selectedRole.is_custom 
                    ? 'Custom role. You can modify permissions below.' 
                    : 'System pre-built role. Permissions are mapped automatically and locked.'}
                </p>
              </div>
              
              <div className={styles.actionRow}>
                <div className={styles.toggleGroup}>
                  <button 
                    className={`${styles.toggleBtn} ${viewMode === 'grouped' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setViewMode('grouped')}
                  >
                    Grouped
                  </button>
                  <button 
                    className={`${styles.toggleBtn} ${viewMode === 'individual' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setViewMode('individual')}
                  >
                    List
                  </button>
                </div>

                {selectedRole.is_custom && (
                  <>
                    <button className={styles.dangerBtn} onClick={() => setConfirmDeleteRole(selectedRole)}>
                      <Trash2 size={16} /> Delete
                    </button>
                    <button className={styles.primaryBtn} onClick={saveRole} disabled={loading}>
                      <Save size={16} /> Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={styles.permissionContainer}>
              <div className={styles.permSearchRow}>
                <div className={styles.searchBox}>
                  <Filter size={16} />
                  <input 
                    placeholder="Filter permissions..." 
                    value={permSearch} 
                    onChange={e => setPermSearch(e.target.value)} 
                  />
                </div>
              </div>

              {viewMode === 'grouped' ? (
                <div className={styles.groupsGrid}>
                  {groupedFilteredPerms.map(([moduleName, modulePerms]) => {
                    const moduleIds = modulePerms.map(p => Number(p.id));
                    const checkedCount = moduleIds.filter(id => dirtyPerms?.has(id)).length;
                    const isAll = checkedCount === moduleIds.length && moduleIds.length > 0;
                    const isSome = checkedCount > 0 && checkedCount < moduleIds.length;

                    return (
                      <div key={moduleName} className={styles.moduleCard}>
                        <div className={styles.moduleHeader}>
                          <div className={styles.moduleTitle}>{moduleName}</div>
                          {selectedRole.is_custom && (
                            <button 
                              className={styles.selectAllBtn}
                              onClick={() => toggleModuleGroup(moduleIds)}
                            >
                              {isAll ? <CheckSquare size={16} color="var(--color-primary)" /> : 
                               isSome ? <CheckSquare size={16} color="var(--color-primary)" style={{opacity: 0.5}} /> : 
                               <Square size={16} color="var(--theme-text-secondary)" />}
                              <span>{isAll ? 'Deselect All' : 'Select All'}</span>
                            </button>
                          )}
                        </div>
                        <div className={styles.modulePerms}>
                          {modulePerms.map(p => {
                            const checked = !!dirtyPerms?.has(Number(p.id));
                            return (
                              <label key={p.id} className={`${styles.permSwitch} ${!selectedRole.is_custom ? styles.disabled : ''}`}>
                                <input 
                                  type="checkbox" 
                                  checked={checked} 
                                  onChange={() => toggleRolePerm(p.id)}
                                  disabled={!selectedRole.is_custom}
                                />
                                <div className={styles.switchBody}>
                                  <div className={styles.permLabel}>{p.label}</div>
                                  <div className={styles.permDesc}>{p.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.flatList}>
                  {groupedFilteredPerms.flatMap(([_, ps]) => ps).map(p => {
                    const checked = !!dirtyPerms?.has(Number(p.id));
                    return (
                      <label key={p.id} className={`${styles.permFlatRow} ${!selectedRole.is_custom ? styles.disabled : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={checked} 
                          onChange={() => toggleRolePerm(p.id)}
                          disabled={!selectedRole.is_custom}
                        />
                        <div className={styles.flatBody}>
                          <div className={styles.permLabel}>{p.label}</div>
                          <div className={styles.permDesc}>{p.description}</div>
                        </div>
                        <div className={styles.flatModuleBadge}>{p.module}</div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.emptyStateContainer}>
            <Shield size={48} className={styles.emptyIcon} />
            <h3>Select a Role</h3>
            <p>Choose a role from the sidebar to view or edit its permissions.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className={styles.usersLayout}>
      <div className={styles.userSelectHeader}>
        <div className={styles.userPicker}>
          <label>Select Staff Member</label>
          <div className={styles.searchBox} onClick={() => setUserDropdownOpen(true)}>
            <Search size={16} />
            <input 
              placeholder="Search by name..." 
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                loadStaffUsers(e.target.value);
                setUserDropdownOpen(true);
              }}
            />
            {userDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader} onClick={(e) => { e.stopPropagation(); setUserDropdownOpen(false); }}>
                  <span>Results</span>
                  <ChevronDown size={14} />
                </div>
                {staffUsers.length === 0 ? <div className={styles.emptyItem}>No users found.</div> : null}
                {staffUsers.map(u => (
                  <div key={u.id} className={styles.dropdownItem} onClick={() => fetchUserPermissions(u.id)}>
                    <div className={styles.uName}>{u.full_name} <span className={styles.uUser}>({u.username})</span></div>
                    <div className={styles.uRole}>{u.role_name || 'No Role'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {selectedUser && (
          <div className={styles.userStatsRow}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Current Role</span>
              <span className={styles.statVal}>{selectedUser.role_name || 'None'}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Role Permissions</span>
              <span className={styles.statVal}>{selectedUser.role_permissions.length}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Individual Overrides</span>
              <span className={styles.statVal}>{userDirtyPerms?.size || 0}</span>
            </div>
            <button className={styles.primaryBtn} onClick={saveUserPerms} disabled={loading}>
              <Save size={16} /> Save Overrides
            </button>
          </div>
        )}
      </div>

      {selectedUser ? (
        <div className={styles.userPermsGrid}>
          {groupPermissions(perms).map(([moduleName, modulePerms]) => (
            <div key={moduleName} className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleTitle}>{moduleName}</div>
              </div>
              <div className={styles.modulePerms}>
                {modulePerms.map(p => {
                  const id = Number(p.id);
                  const inRole = selectedUser.role_permissions.includes(id);
                  const isOverride = !!userDirtyPerms?.has(id);
                  
                  return (
                    <label key={p.id} className={`${styles.permSwitch} ${inRole ? styles.disabledRow : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={inRole || isOverride} 
                        onChange={() => toggleUserPerm(p.id)}
                        disabled={inRole}
                      />
                      <div className={styles.switchBody}>
                        <div className={styles.permLabel}>
                          {p.label}
                          {inRole && <span className={styles.viaRoleBadge}>via Role</span>}
                          {isOverride && !inRole && <span className={styles.overrideBadge}>Override</span>}
                        </div>
                        <div className={styles.permDesc}>{p.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyStateContainer} style={{height: 400}}>
          <User size={48} className={styles.emptyIcon} />
          <h3>Individual Overrides</h3>
          <p>Search and select a staff member above to grant them specific access outside their role.</p>
        </div>
      )}
    </div>
  );

  const renderChangelogTab = () => (
    <div className={styles.changelogLayout}>
      <div className={styles.changelogHeader}>
        <h2>Permission Change Log</h2>
        <button className={styles.iconBtn} onClick={loadChangelog} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action By</th>
              <th>Action</th>
              <th>Permission</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {changelog.length === 0 && (
              <tr><td colSpan={5} className={styles.tc}>No logs found.</td></tr>
            )}
            {changelog.map(log => (
              <tr key={log.id}>
                <td className={styles.tdDate}>{formatDate(log.timestamp)}</td>
                <td className={styles.tdBold}>{log.changed_by_name}</td>
                <td>
                  <span className={`${styles.actionBadge} ${log.action === 'granted' ? styles.actionGranted : styles.actionRevoked}`}>
                    {log.action}
                  </span>
                </td>
                <td className={styles.tdBold}>{log.permission_label || 'Deleted Permission'}</td>
                <td>
                  {log.target_type === 'role' ? (
                    <span><Shield size={12} className={styles.inlineIcon} /> Role: {log.target_role_name}</span>
                  ) : (
                    <span><User size={12} className={styles.inlineIcon} /> User: {log.target_user_name}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Access & Permissions</h1>
          <p className={styles.subtitle}>Granular role-based access control and user overrides.</p>
        </div>
      </div>

      <div className={styles.tabsStrip}>
        <button className={`${styles.tabBtn} ${activeTab === 'roles' ? styles.tabActive : ''}`} onClick={() => setActiveTab('roles')}>
          <Shield size={16} /> Custom & System Roles
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabActive : ''}`} onClick={() => setActiveTab('users')}>
          <User size={16} /> Individual Overrides
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'changelog' ? styles.tabActive : ''}`} onClick={() => setActiveTab('changelog')}>
          <Clock size={16} /> Change Log
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'roles' && renderRolesTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'changelog' && renderChangelogTab()}
      </div>

      {createRoleOpen && (
        <div className={styles.modalOverlay} onClick={() => setCreateRoleOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create Custom Role</h3>
              <button className={styles.modalClose} onClick={() => setCreateRoleOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Role Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. Guidance Counselor" 
                  value={newRoleForm.name} 
                  onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value})} 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Default Scope <span>(what data they can see)</span></label>
                <select 
                  value={newRoleForm.scope}
                  onChange={e => setNewRoleForm({...newRoleForm, scope: e.target.value})}
                >
                  <option value="school">School-wide (All records)</option>
                  <option value="class">Own Class Only (Class Teachers)</option>
                  <option value="subject">Own Subjects Only (Subject T.)</option>
                  <option value="self">Self Only (Support Staff)</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={() => setCreateRoleOpen(false)}>Cancel</button>
              <button className={styles.primaryBtn} onClick={createRole} disabled={loading || !newRoleForm.name.trim()}>
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteRole}
        title="Delete Role"
        message={`Are you sure you want to delete ${confirmDeleteRole?.name}? Staff assigned this role will lose its permissions immediately.`}
        confirmText="Yes, Delete Role"
        onCancel={() => setConfirmDeleteRole(null)}
        onConfirm={() => {
          const r = confirmDeleteRole;
          setConfirmDeleteRole(null);
          if (r) deleteRole(r);
        }}
        loading={loading}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default function RolesPermissions() {
  return (
    <ErrorBoundary>
      <RolesPermissionsView />
    </ErrorBoundary>
  );
}
