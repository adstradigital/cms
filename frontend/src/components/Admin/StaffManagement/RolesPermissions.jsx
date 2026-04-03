'use client';

import React from 'react';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import adminApi from '@/api/adminApi';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';
import styles from './RolesPermissions.module.css';

function groupPermissions(perms) {
  const groups = {};
  for (const p of perms) {
    const [module] = String(p.codename || 'other').split('.', 1);
    const key = module || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => [k, v.sort((a, b) => String(a.codename).localeCompare(String(b.codename)))]);
}

const RolesPermissionsView = () => {
  const [loading, setLoading] = React.useState(false);
  const [roles, setRoles] = React.useState([]);
  const [perms, setPerms] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  const [dirtyPerms, setDirtyPerms] = React.useState(null); // Set<number> | null
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const { toasts, push, dismiss } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const [rRes, pRes] = await Promise.all([adminApi.getRolesV2(), adminApi.getPermissions()]);
      const rList = Array.isArray(rRes.data) ? rRes.data : Array.isArray(rRes.data?.results) ? rRes.data.results : [];
      const pList = Array.isArray(pRes.data) ? pRes.data : Array.isArray(pRes.data?.results) ? pRes.data.results : [];
      setRoles(rList);
      setPerms(pList);
      if (!selectedId && rList.length) setSelectedId(rList[0].id);
    } catch {
      push('Could not load roles/permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedId) || null;

  React.useEffect(() => {
    if (selectedRole) {
      setDirtyPerms(new Set((selectedRole.permissions || []).map((x) => Number(x))));
    } else {
      setDirtyPerms(null);
    }
  }, [selectedRole?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePerm = (permId) => {
    setDirtyPerms((prev) => {
      const next = new Set(prev || []);
      const id = Number(permId);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!selectedRole) return;
    try {
      setLoading(true);
      const permissions = Array.from(dirtyPerms || []).sort((a, b) => a - b);
      const res = await adminApi.updateRoleV2(selectedRole.id, { permissions });
      setRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? res.data : r)));
      push('Role saved', 'success');
    } catch {
      push('Could not save role', 'error');
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      setLoading(true);
      const res = await adminApi.createRoleV2({ name, is_custom: true, permissions: [] });
      setRoles((prev) => [...prev, res.data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      setCreateOpen(false);
      setNewName('');
      setSelectedId(res.data.id);
      push('Role created', 'success');
    } catch {
      push('Could not create role (name must be unique)', 'error');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (role) => {
    try {
      setLoading(true);
      await adminApi.deleteRoleV2(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      setSelectedId((prev) => (prev === role.id ? null : prev));
      push('Role deleted', 'success');
    } catch {
      push('Could not delete role', 'error');
    } finally {
      setLoading(false);
    }
  };

  const groups = React.useMemo(() => groupPermissions(perms), [perms]);

  return (
    <div className={styles.wrap}>
      <div style={{ gridColumn: '1 / -1' }}>
        <h2 style={{ margin: 0, color: 'var(--theme-text)' }}>Roles & Permissions</h2>
        <p style={{ marginTop: 6, color: 'var(--theme-text-secondary)', fontWeight: 800, fontSize: 13 }}>
          Create roles and toggle granular module permissions.
        </p>
      </div>
      <div className={styles.left}>
        <div className={styles.leftTop}>
          <button className={styles.btn} onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New Role
          </button>
          <button className={styles.btn} onClick={load} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div className={styles.roleList}>
          {roles.length === 0 ? (
            <div className={styles.empty}>No roles yet.</div>
          ) : (
            roles.map((r) => (
              <button
                key={r.id}
                className={`${styles.roleItem} ${r.id === selectedId ? styles.roleItemActive : ''}`}
                onClick={() => setSelectedId(r.id)}
              >
                <div className={styles.roleName}>{r.name}</div>
                <div className={styles.roleMeta}>{r.is_custom ? 'Custom' : 'System'} - {Array.isArray(r.permissions) ? r.permissions.length : 0} perms</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.rightTop}>
          <div style={{ minWidth: 0 }}>
            <div className={styles.title}>{selectedRole ? selectedRole.name : 'Select a role'}</div>
            <div className={styles.sub}>
              {selectedRole ? 'Toggle permissions and click Save.' : 'Choose a role from the list.'}
            </div>
          </div>
          <div className={styles.rightActions}>
            {selectedRole && (
              <>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={loading}>
                  <Save size={16} /> Save
                </button>
                <button className={styles.btnDanger} onClick={() => setConfirmDelete(selectedRole)} disabled={loading}>
                  <Trash2 size={16} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {!selectedRole ? (
          <div className={styles.panelEmpty}>Select a role to edit permissions.</div>
        ) : perms.length === 0 ? (
          <div className={styles.panelEmpty}>
            No permissions found in DB. Seed permissions first (backend) or create them via admin.
          </div>
        ) : (
          <div className={styles.permGrid}>
            {groups.map(([module, items]) => (
              <div key={module} className={styles.permGroup}>
                <div className={styles.groupTitle}>{module}</div>
                {items.map((p) => {
                  const id = Number(p.id);
                  const checked = !!dirtyPerms?.has(id);
                  return (
                    <label key={p.id} className={styles.permRow}>
                      <input type="checkbox" checked={checked} onChange={() => togglePerm(p.id)} />
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.permLabel}>{p.label}</div>
                        <div className={styles.permCode}>{p.codename}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <div className={styles.modalOverlay} onClick={() => setCreateOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <b>Create Role</b>
              <button className={styles.modalClose} onClick={() => setCreateOpen(false)}>X</button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.fieldLabel}>Role name</label>
              <input className={styles.input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Lab Assistant" />
              <div className={styles.modalActions}>
                <button className={styles.btn} onClick={() => setCreateOpen(false)}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={create} disabled={loading || !newName.trim()}>
                  <Plus size={16} /> Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Role"
        message="This will permanently delete the role. Staff using this role will lose the assignment."
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const role = confirmDelete;
          setConfirmDelete(null);
          if (role) remove(role);
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
