'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, BusFront, UserRound, Users, ChevronDown, ChevronUp } from 'lucide-react';

import transportApi from '@/api/transportApi';
import adminApi from '@/api/adminApi';
import TransportModal from '../TransportModal';
import StatusBadge from '../StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import styles from '../transport.module.css';

const EMPTY_BUS = {
  name: '',
  bus_number: '',
  registration_number: '',
  capacity: 40,
  driver: '', // Linked User ID
  driver_name: '',
  driver_phone: '',
  attendant_name: '',
  attendant_phone: '',
  tracker_device_id: '',
  status: 'active',
};

// Small styled section toggle inside the form
function InlineSection({ icon: Icon, title, color, open, onToggle, children }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      border: `1px solid ${open ? color + '50' : '#e2e8f0'}`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: open ? color + '10' : '#f8fafc',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: color + '20', color, borderRadius: 8, padding: 6, display: 'flex' }}>
            <Icon size={16} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
      </button>
      {open && (
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#fff' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function BusesTab({ buses, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editBus, setEditBus] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_BUS });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showDriverSection, setShowDriverSection] = useState(false);
  const [showAttendantSection, setShowAttendantSection] = useState(false);
  const [users, setUsers] = useState([]);

  useState(() => {
    adminApi.getUsers().then(res => setUsers(res.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditBus(null);
    setForm({ ...EMPTY_BUS });
    setShowDriverSection(false);
    setShowAttendantSection(false);
    setShowModal(true);
  };

  const openEdit = (bus) => {
    setEditBus(bus);
    setForm({
      name: bus.name || '',
      bus_number: bus.bus_number || '',
      registration_number: bus.registration_number || '',
      capacity: bus.capacity || 40,
      driver: bus.driver || '',
      driver_name: bus.driver_name || '',
      driver_phone: bus.driver_phone || '',
      attendant_name: bus.attendant_name || '',
      attendant_phone: bus.attendant_phone || '',
      tracker_device_id: bus.tracker_device_id || '',
      status: bus.status || 'active',
    });
    setShowDriverSection(!!(bus.driver_name || bus.driver));
    setShowAttendantSection(!!(bus.attendant_name));
    setShowModal(true);
  };

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity || 40) };
      if (editBus) {
        await transportApi.updateBus(editBus.id, payload);
      } else {
        await transportApi.createBus(payload);
      }
      setShowModal(false);
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save bus.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await transportApi.deleteBus(deleteId);
      setDeleteId(null);
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete bus.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = filter === 'all' ? buses : buses.filter((b) => b.status === filter);

  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 10, color: '#1e293b' }}>
              <BusFront size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Fleet Management</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', margin: 0 }}>Manage buses, drivers & attendants</p>
            </div>
          </div>
          <button className={styles.primaryBtn} style={{ marginTop: 0 }} onClick={openCreate}>
            <Plus size={15} /> Add Bus
          </button>
        </div>

        <div className={styles.filterBar}>
          <select className={styles.formSelect} value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 140 }}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
            Showing {filtered.length} of {buses.length} buses
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Bus</th>
                <th>Registration</th>
                <th>Capacity</th>
                <th>Driver</th>
                <th>Attendant</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bus) => (
                <tr key={bus.id}>
                  <td>
                    <strong>{bus.bus_number}</strong>
                    <br />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>{bus.name}</span>
                  </td>
                  <td>{bus.registration_number || '—'}</td>
                  <td>{bus.capacity}</td>
                  <td>
                    {bus.driver_name ? (
                      <>
                        <span style={{ fontWeight: 500 }}>{bus.driver_name}</span>
                        {bus.driver_phone && (
                          <><br /><span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>{bus.driver_phone}</span></>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  <td>
                    {bus.attendant_name ? (
                      <>
                        <span style={{ fontWeight: 500 }}>{bus.attendant_name}</span>
                        {bus.attendant_phone && (
                          <><br /><span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>{bus.attendant_phone}</span></>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  <td><StatusBadge value={bus.status} /></td>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.ghostBtn} onClick={() => openEdit(bus)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className={styles.ghostBtn} onClick={() => setDeleteId(bus.id)} title="Deactivate" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className={styles.empty}>No buses found.</p>}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <TransportModal open={showModal} title={editBus ? 'Edit Bus' : 'Add New Bus'} onClose={() => setShowModal(false)} width={580}>
        <form onSubmit={submit}>
          {/* ── Bus Details ── */}
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 10 }}>
            Bus Details
          </p>
          <div className={styles.formGrid} style={{ marginBottom: 16 }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bus Name *</label>
              <input className={styles.formInput} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Blue Bird" required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bus Number *</label>
              <input className={styles.formInput} value={form.bus_number} onChange={(e) => set('bus_number', e.target.value)} placeholder="e.g. BN001" required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Registration Number</label>
              <input className={styles.formInput} value={form.registration_number} onChange={(e) => set('registration_number', e.target.value)} placeholder="e.g. TN01AB1234" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Capacity</label>
              <input className={styles.formInput} type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tracker Device ID</label>
              <input className={styles.formInput} value={form.tracker_device_id} onChange={(e) => set('tracker_device_id', e.target.value)} placeholder="GPS device ID" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select className={styles.formSelect} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* ── Driver Section ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
            <InlineSection
              icon={UserRound}
              title={showDriverSection && form.driver_name ? `Driver: ${form.driver_name}` : 'Add Driver'}
              color="#1e293b"
              open={showDriverSection}
              onToggle={() => setShowDriverSection((v) => !v)}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Link to Account (Optional)</label>
                <select 
                  className={styles.formSelect} 
                  value={form.driver} 
                  onChange={(e) => {
                    const userId = e.target.value;
                    set('driver', userId);
                    if (userId) {
                      const user = users.find(u => String(u.id) === String(userId));
                      if (user) {
                        set('driver_name', `${user.first_name} ${user.last_name}`);
                        set('driver_phone', user.phone || '');
                      }
                    }
                  }}
                >
                  <option value="">No linked account</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Driver Name *</label>
                <input
                  className={styles.formInput}
                  value={form.driver_name}
                  onChange={(e) => set('driver_name', e.target.value)}
                  placeholder="Full name of driver"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Driver Phone</label>
                <input
                  className={styles.formInput}
                  value={form.driver_phone}
                  onChange={(e) => set('driver_phone', e.target.value)}
                  placeholder="Contact number"
                />
              </div>
            </InlineSection>

            {/* ── Attendant Section ── */}
            <InlineSection
              icon={Users}
              title={showAttendantSection && form.attendant_name ? `Attendant: ${form.attendant_name}` : 'Add Attendant'}
              color="#10b981"
              open={showAttendantSection}
              onToggle={() => setShowAttendantSection((v) => !v)}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Attendant Name *</label>
                <input
                  className={styles.formInput}
                  value={form.attendant_name}
                  onChange={(e) => set('attendant_name', e.target.value)}
                  placeholder="Full name of attendant"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Attendant Phone</label>
                <input
                  className={styles.formInput}
                  value={form.attendant_phone}
                  onChange={(e) => set('attendant_phone', e.target.value)}
                  placeholder="Contact number"
                />
              </div>
            </InlineSection>
          </div>

          <div className={styles.btnRow}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              {saving ? 'Saving...' : editBus ? 'Save Changes' : 'Add Bus'}
            </button>
            <button type="button" className={styles.secondaryBtn} style={{ marginTop: 'var(--space-3)' }} onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </div>
        </form>
      </TransportModal>

      <ConfirmDialog
        open={!!deleteId}
        title="Deactivate Bus"
        message="This bus will be marked as inactive. Student allocations will not be affected."
        confirmText="Deactivate"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </section>
  );
}
