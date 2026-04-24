'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Users, Search, AlertCircle, BusFront, Pencil } from 'lucide-react';

import transportApi from '@/api/transportApi';
import adminApi from '@/api/adminApi';
import TransportModal from '../TransportModal';
import StatusBadge from '../StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import styles from '../transport.module.css';

export default function StudentsTab({ students, routes, buses, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ student: '', stop: '', join_date: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Fetch students who opted for transport
  const fetchAvailableStudents = async () => {
    setLoadingStudents(true);
    try {
      const params = { paginate: 'false' };
      if (!showAll) params.transport_user = 'true';
      
      const res = await adminApi.getStudents(params);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      
      // Filter out students who are already assigned
      const assignedIds = new Set(students.map(s => s.student));
      const filteredList = list.filter(s => !assignedIds.has(s.id));
      
      setAvailableStudents(filteredList);
    } catch (err) {
      console.error('Failed to fetch available students', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchAvailableStudents();
    }
  }, [showModal, showAll]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Build stop options grouped by route
  const stopOptions = useMemo(() => {
    const opts = [];
    routes.forEach((route) => {
      (route.stops || []).forEach((stop) => {
        opts.push({
          id: stop.id,
          label: route.name === 'Quilandy-Nadakkavu' 
            ? `${stop.stop_name} - Nadakkavu` 
            : `${route.name} — ${stop.stop_name} (#${stop.stop_order})`,
          routeId: route.id,
          routeName: route.name,
        });
      });
    });
    return opts;
  }, [routes]);

  // Capacity info per route
  const capacityMap = useMemo(() => {
    const map = {};
    routes.forEach((route) => {
      const bus = buses.find((b) => b.id === route.bus);
      const capacity = bus?.capacity || route.vehicle_capacity || 40;
      const enrolled = students.filter((s) => s.route_name === route.name).length;
      map[route.name] = { capacity, enrolled, available: capacity - enrolled };
    });
    return map;
  }, [routes, buses, students]);

  const filtered = useMemo(() => {
    let list = students;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((s) =>
        (s.student_name || '').toLowerCase().includes(q) ||
        (s.stop_name || '').toLowerCase().includes(q) ||
        (s.route_name || '').toLowerCase().includes(q)
      );
    }
    if (filterRoute) {
      list = list.filter((s) => s.route_name === filterRoute);
    }
    return list;
  }, [students, searchTerm, filterRoute]);

  const handleEdit = (allocation) => {
    setEditingId(allocation.id);
    setForm({
      student: String(allocation.student),
      stop: String(allocation.stop),
      join_date: allocation.join_date || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ student: '', stop: '', join_date: '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        student: Number(form.student),
        stop: Number(form.stop),
        join_date: form.join_date,
        is_active: true,
      };

      if (editingId) {
        await transportApi.updateStudentTransport(editingId, payload);
      } else {
        await transportApi.assignStudentTransport(payload);
      }

      closeModal();
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    setDeleting(true);
    try {
      await transportApi.removeStudentTransport(deleteId);
      setDeleteId(null);
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to remove allocation.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className={styles.section}>
      {/* Capacity Overview */}
      {routes.length > 0 && (
        <div className={styles.panel}>
          <h3>
            <AlertCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Route Capacity Overview
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            {routes.map((route) => {
              const info = capacityMap[route.name] || { capacity: 40, enrolled: 0, available: 40 };
              const pct = info.capacity > 0 ? Math.round((info.enrolled / info.capacity) * 100) : 0;
              const isFull = info.available <= 0;
              return (
                <div key={route.id} style={{
                  border: `1px solid ${isFull ? '#fecaca' : 'var(--t-line)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  background: isFull ? '#fef2f2' : 'transparent',
                }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 4 }}>{route.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--t-muted)', marginBottom: 4 }}>
                    <span>{info.enrolled}/{info.capacity} seats</span>
                    <span style={{ color: isFull ? '#dc2626' : info.available <= 5 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
                      {isFull ? 'FULL' : `${info.available} left`}
                    </span>
                  </div>
                  <div className={styles.capacityBar}>
                    <div
                      className={styles.capacityFill}
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: isFull ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Allocations */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>
            <Users size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Student Allocations ({filtered.length})
          </h3>
          <button className={styles.primaryBtn} style={{ marginTop: 0 }} onClick={() => setShowModal(true)}>
            <Plus size={15} /> Assign Student
          </button>
        </div>

        <div className={styles.filterBar}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--t-muted)' }} />
            <input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
          <select value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)}>
            <option value="">All Routes</option>
            {routes.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Route</th>
                <th>Bus</th>
                <th>Stop</th>
                <th>Join Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: 'var(--radius-full)', 
                        background: 'var(--t-accent-light)', color: 'var(--t-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Users size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.student_name || `Student #${s.student}`}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>ID: {s.student_admission_number || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.route_name || '—'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BusFront size={14} style={{ color: 'var(--t-muted)' }} />
                      <span>{s.bus_name || '—'}</span>
                    </div>
                  </td>
                  <td>{s.stop_name || '—'}</td>
                  <td>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
                      {s.join_date || '—'}
                    </div>
                  </td>
                  <td>
                    <div className={styles.tableActions}>
                      <button 
                        className={styles.ghostBtn} 
                        onClick={() => handleEdit(s)} 
                        title="Edit Allocation" 
                        style={{ color: 'var(--t-accent)' }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        className={styles.ghostBtn} 
                        onClick={() => setDeleteId(s.id)} 
                        title="Remove Allocation" 
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className={styles.empty}>No student allocations found.</p>}
        </div>
      </div>

      {/* Assign Modal */}
      <TransportModal 
        open={showModal} 
        title={editingId ? "Edit Transport Allocation" : "Assign Student to Transport"} 
        onClose={closeModal} 
        width={480}
      >
        <form onSubmit={submit}>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.full}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className={styles.formLabel} style={{ marginBottom: 0 }}>Student *</label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--t-muted)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={showAll} 
                    onChange={(e) => setShowAll(e.target.checked)} 
                    style={{ marginRight: 6 }} 
                  />
                  Show all students
                </label>
              </div>
              <select 
                className={styles.formSelect} 
                value={form.student} 
                onChange={(e) => set('student', e.target.value)} 
                required
              >
                <option value="">{loadingStudents ? 'Loading students...' : showAll ? 'Select any student' : 'Select student (opted for transport)'}</option>
                {editingId && (
                  <option value={form.student}>
                    {students.find(s => s.id === editingId)?.student_name || `Selected Student`}
                  </option>
                )}
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.admission_number})
                  </option>
                ))}
              </select>
              {!showAll && availableStudents.length === 0 && !loadingStudents && (
                <p style={{ fontSize: 'var(--text-xs)', color: '#dc2626', marginTop: 4 }}>
                  No students have opted for transport. Try "Show all students".
                </p>
              )}
            </div>
            <div className={`${styles.formGroup} ${styles.full}`}>
              <label className={styles.formLabel}>Route & Stop *</label>
              <select className={styles.formSelect} value={form.stop} onChange={(e) => set('stop', e.target.value)} required>
                <option value="">Select stop</option>
                {stopOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                    {capacityMap[opt.routeName]?.available <= 0 ? ' (FULL)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${styles.formGroup} ${styles.full}`}>
              <label className={styles.formLabel}>Join Date *</label>
              <input className={styles.formInput} type="date" value={form.join_date} onChange={(e) => set('join_date', e.target.value)} required />
            </div>
          </div>
          <div className={styles.btnRow}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Assign Student'}
            </button>
            <button type="button" className={styles.secondaryBtn} style={{ marginTop: 'var(--space-3)' }} onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </TransportModal>

      <ConfirmDialog
        open={!!deleteId}
        title="Remove Student Allocation"
        message="This student will be removed from their transport route. They can be re-assigned later."
        confirmText="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </section>
  );
}
