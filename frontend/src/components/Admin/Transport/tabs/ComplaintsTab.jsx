'use client';

import { useMemo, useState } from 'react';
import { Plus, MessageSquareWarning, ArrowUpRight, CheckCircle, AlertTriangle } from 'lucide-react';

import transportApi from '@/api/transportApi';
import TransportModal from '../TransportModal';
import StatusBadge from '../StatusBadge';
import StatCard from '../StatCard';
import styles from '../transport.module.css';
import { Users, BusFront } from 'lucide-react';

export default function ComplaintsTab({ complaints, buses, routes, students, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    student: '', bus: '', route: '', subject: '', description: '', priority: 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [resolutionDrafts, setResolutionDrafts] = useState({});
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const studentOptions = useMemo(() => {
    const map = new Map();
    students.forEach((row) => {
      if (!map.has(row.student)) {
        map.set(row.student, { id: row.student, name: row.student_name || `Student #${row.student}` });
      }
    });
    return [...map.values()];
  }, [students]);

  const set = (k, v) => {
    setForm((p) => {
      let next = { ...p, [k]: v };
      if (k === 'student' && v) {
        const allocation = students.find((s) => String(s.student) === String(v));
        if (allocation) {
          next.bus = allocation.bus ? String(allocation.bus) : '';
          next.route = allocation.route ? String(allocation.route) : '';
        }
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = complaints;
    if (filterStatus) list = list.filter((c) => c.status === filterStatus);
    if (filterPriority) list = list.filter((c) => c.priority === filterPriority);
    return list;
  }, [complaints, filterStatus, filterPriority]);

  const stats = useMemo(() => ({
    open: complaints.filter((c) => c.status === 'open').length,
    inProgress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
    urgent: complaints.filter((c) => c.priority === 'urgent' && ['open', 'in_progress'].includes(c.status)).length,
  }), [complaints]);

  const submitComplaint = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await transportApi.createComplaint({
        ...form,
        student: form.student ? Number(form.student) : null,
        bus: form.bus ? Number(form.bus) : null,
        route: form.route ? Number(form.route) : null,
      });
      setShowModal(false);
      setForm({ student: '', bus: '', route: '', subject: '', description: '', priority: 'medium' });
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to raise complaint.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (complaint, nextStatus) => {
    try {
      await transportApi.updateComplaint(complaint.id, {
        status: nextStatus,
        resolution_note: resolutionDrafts[complaint.id] || complaint.resolution_note || '',
      });
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update.');
    }
  };

  return (
    <section className={styles.section}>
      {/* Summary */}
      <div className={styles.statsGrid}>
        <StatCard icon={MessageSquareWarning} label="Open" value={stats.open} accent="#ef4444" />
        <StatCard icon={ArrowUpRight} label="In Progress" value={stats.inProgress} accent="#f59e0b" />
        <StatCard icon={CheckCircle} label="Resolved" value={stats.resolved} accent="#22c55e" />
        <StatCard icon={AlertTriangle} label="Urgent Active" value={stats.urgent} accent="#dc2626" />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>
            <MessageSquareWarning size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Complaint Resolution Queue
          </h3>
          <button className={styles.primaryBtn} style={{ marginTop: 0 }} onClick={() => setShowModal(true)}>
            <Plus size={15} /> Raise Complaint
          </button>
        </div>

        <div className={styles.filterBar}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className={styles.filterSpacer} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
            {filtered.length} complaints
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Raised By</th>
                <th>Bus / Route</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Resolution Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.subject}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', marginTop: 2 }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ 
                        width: 28, height: 28, borderRadius: 'var(--radius-full)', 
                        background: 'var(--t-accent-light)', color: 'var(--t-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Users size={14} />
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        {c.student_name || c.raised_by_name || '—'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BusFront size={14} style={{ color: 'var(--t-muted)' }} />
                        <span style={{ fontSize: 'var(--text-sm)' }}>{c.bus_name || '—'}</span>
                      </div>
                      {c.route_name && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', marginLeft: 20 }}>
                          {c.route_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td><StatusBadge value={c.priority} /></td>
                  <td><StatusBadge value={c.status} /></td>
                  <td>
                    <input
                      className={styles.formInput}
                      style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
                      placeholder="Add resolution note..."
                      value={resolutionDrafts[c.id] ?? c.resolution_note ?? ''}
                      onChange={(e) => setResolutionDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
                    />
                  </td>
                  <td>
                    <div className={styles.inlineActions}>
                      {c.status === 'open' && (
                        <button className={styles.smallBtn} style={{ background: '#f59e0b' }} onClick={() => updateStatus(c, 'in_progress')} title="Mark In Progress">
                          <ArrowUpRight size={12} />
                        </button>
                      )}
                      {['open', 'in_progress'].includes(c.status) && (
                        <button className={styles.smallBtn} style={{ background: '#22c55e' }} onClick={() => updateStatus(c, 'resolved')} title="Resolve">
                          <CheckCircle size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className={styles.empty}>No complaints found.</p>}
        </div>
      </div>

      {/* Raise Complaint Modal */}
      <TransportModal open={showModal} title="Raise Transport Complaint" onClose={() => setShowModal(false)} width={560}>
        <form onSubmit={submitComplaint}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Student</label>
              <select className={styles.formSelect} value={form.student} onChange={(e) => set('student', e.target.value)}>
                <option value="">Select Student</option>
                {studentOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Priority</label>
              <select className={styles.formSelect} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bus</label>
              <select className={styles.formSelect} value={form.bus} onChange={(e) => set('bus', e.target.value)}>
                <option value="">Select Bus</option>
                {buses.map((b) => <option key={b.id} value={b.id}>{b.bus_number} - {b.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Route</label>
              <select className={styles.formSelect} value={form.route} onChange={(e) => set('route', e.target.value)}>
                <option value="">Select Route</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className={`${styles.formGroup} ${styles.full}`}>
              <label className={styles.formLabel}>Subject *</label>
              <select 
                className={styles.formSelect} 
                value={form.subject} 
                onChange={(e) => set('subject', e.target.value)} 
                required
              >
                <option value="">Select Subject Category</option>
                <option value="Safety-related complaints">Safety-related complaints</option>
                <option value="Staff behavior complaints">Staff behavior complaints</option>
                <option value="Student safety & discipline">Student safety & discipline</option>
                <option value="Bus condition complaints">Bus condition complaints</option>
                <option value="Timing & route issues">Timing & route issues</option>
                <option value="Rule violations">Rule violations</option>
                <option value="Communication problems">Communication problems</option>
                <option value="Fee-related complaints">Fee-related complaints</option>
              </select>
            </div>
            <div className={`${styles.formGroup} ${styles.full}`}>
              <label className={styles.formLabel}>Description *</label>
              <textarea className={styles.formTextarea} value={form.description} onChange={(e) => set('description', e.target.value)} required />
            </div>
          </div>
          <div className={styles.btnRow}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Complaint'}
            </button>
            <button type="button" className={styles.secondaryBtn} style={{ marginTop: 'var(--space-3)' }} onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </TransportModal>
    </section>
  );
}
