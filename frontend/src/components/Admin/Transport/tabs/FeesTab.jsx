'use client';

import { useMemo, useState } from 'react';
import { Plus, CreditCard, DollarSign, TrendingUp, AlertTriangle, Users, BusFront, Printer } from 'lucide-react';

import transportApi from '@/api/transportApi';
import TransportModal from '../TransportModal';
import StatusBadge from '../StatusBadge';
import StatCard from '../StatCard';
import styles from '../transport.module.css';

export default function FeesTab({ fees, routes, students, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ student: '', route: '', stop: '', period_label: '', amount_due: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [payDrafts, setPayDrafts] = useState({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRoute, setFilterRoute] = useState('');

  const set = (k, v) => {
    setForm((p) => {
      let next = { ...p, [k]: v };
      
      // Auto-populate Route and Stop when Student is selected
      if (k === 'student' && v) {
        const allocation = students.find(s => String(s.student) === String(v));
        if (allocation) {
          next.route = String(allocation.route || '');
          next.stop = String(allocation.stop || '');
        }
      }

      // Auto-set amount for specific route stops
      if ((k === 'stop' || k === 'student') && next.stop) {
        const selectedStop = stopOptions.find(o => String(o.id) === String(next.stop));
        if (selectedStop) {
          const stopName = selectedStop.label.toLowerCase();
          if (stopName.includes('quilandy')) next.amount_due = '1000';
          else if (stopName.includes('payyoli')) next.amount_due = '900';
          else if (stopName.includes('thikkodi')) next.amount_due = '800';
          else if (stopName.includes('puthiyangadi')) next.amount_due = '700';
          else if (stopName.includes('elathur')) next.amount_due = '600';
          else if (stopName.includes('westhill')) next.amount_due = '500';
        }
      }
      return next;
    });
  };

  // Unique student options
  const studentOptions = useMemo(() => {
    const map = new Map();
    students.forEach((row) => {
      if (!map.has(row.student)) {
        map.set(row.student, { id: row.student, name: row.student_name || `Student #${row.student}` });
      }
    });
    return [...map.values()];
  }, [students]);

  const stopOptions = useMemo(() => {
    const opts = [];
    routes.forEach((route) => {
      (route.stops || []).forEach((stop) => {
        opts.push({
          id: stop.id,
          label: route.name === 'Quilandy-Nadakkavu' 
            ? `${stop.stop_name} - Nadakkavu` 
            : `${route.name} — ${stop.stop_name}`,
          routeId: route.id,
        });
      });
    });
    return opts;
  }, [routes]);

  const filtered = useMemo(() => {
    let list = fees;
    if (filterStatus) list = list.filter((f) => f.status === filterStatus);
    if (filterRoute) list = list.filter((f) => String(f.route) === filterRoute);
    return list;
  }, [fees, filterStatus, filterRoute]);

  const stats = useMemo(() => {
    const totalDue = fees.reduce((s, f) => s + Number(f.amount_due || 0), 0);
    const totalPaid = fees.reduce((s, f) => s + Number(f.amount_paid || 0), 0);
    const overdue = fees.filter((f) => f.status === 'overdue').length;
    const pending = fees.filter((f) => ['pending', 'partial'].includes(f.status)).length;
    return { totalDue, totalPaid, overdue, pending, outstanding: totalDue - totalPaid };
  }, [fees]);

  const submitFee = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await transportApi.createFee({
        ...form,
        student: Number(form.student),
        route: form.route ? Number(form.route) : null,
        stop: form.stop ? Number(form.stop) : null,
        amount_due: Number(form.amount_due),
      });
      setShowModal(false);
      setForm({ student: '', route: '', stop: '', period_label: '', amount_due: '', due_date: '' });
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create fee record.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewReceipt = (fee) => {
    setReceiptData(fee);
    setShowReceipt(true);
  };

  const payFee = async (feeId) => {
    const draft = payDrafts[feeId] || {};
    if (!draft.amount || Number(draft.amount) <= 0) {
      alert('Enter a valid amount.');
      return;
    }
    try {
      await transportApi.payFee(feeId, {
        amount: Number(draft.amount),
        payment_method: draft.payment_method || 'online',
        transaction_id: draft.transaction_id || '',
      });
      setPayDrafts((p) => ({ ...p, [feeId]: { amount: '', payment_method: 'online', transaction_id: '' } }));
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Payment failed.');
    }
  };

  return (
    <section className={styles.section}>
      {/* Fee Summary Stats */}
      <div className={styles.statsGrid}>
        <StatCard icon={DollarSign} label="Total Due" value={`₹${stats.totalDue.toLocaleString()}`} accent="#0b6bcb" />
        <StatCard icon={TrendingUp} label="Collected" value={`₹${stats.totalPaid.toLocaleString()}`} accent="#22c55e" />
        <StatCard icon={CreditCard} label="Outstanding" value={`₹${stats.outstanding.toLocaleString()}`} accent="#f59e0b" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} help={`${stats.pending} pending`} accent="#ef4444" />
      </div>

      {/* Fee Table */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>
            <CreditCard size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Fee Records
          </h3>
          <button className={styles.primaryBtn} style={{ marginTop: 0 }} onClick={() => setShowModal(true)}>
            <Plus size={15} /> Create Fee
          </button>
        </div>

        <div className={styles.filterBar}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="waived">Waived</option>
          </select>
          <select value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)}>
            <option value="">All Routes</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <span className={styles.filterSpacer} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
            {filtered.length} records
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Period</th>
                <th>Route</th>
                <th>Due</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Quick Pay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fee) => {
                const balance = Number(fee.amount_due || 0) - Number(fee.amount_paid || 0);
                return (
                  <tr key={fee.id}>
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
                          <div style={{ fontWeight: 600 }}>{fee.student_name || fee.student}</div>
                          {fee.admission_number && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>{fee.admission_number}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.badge} style={{ background: 'var(--t-accent-light)', color: 'var(--t-accent)' }}>
                        {fee.period_label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BusFront size={14} style={{ color: 'var(--t-muted)' }} />
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>{fee.route_name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>₹{Number(fee.amount_due).toLocaleString()}</td>
                    <td style={{ color: 'var(--t-accent-2)', fontWeight: 500 }}>₹{Number(fee.amount_paid).toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: balance > 0 ? '#dc2626' : '#22c55e' }}>
                      ₹{balance.toLocaleString()}
                    </td>
                    <td><StatusBadge value={fee.status} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {balance > 0 && (
                          <div className={styles.inlinePay}>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amt"
                              value={payDrafts[fee.id]?.amount || ''}
                              onChange={(e) => setPayDrafts((p) => ({ ...p, [fee.id]: { ...p[fee.id], amount: e.target.value } }))}
                            />
                            <select
                              value={payDrafts[fee.id]?.payment_method || 'online'}
                              onChange={(e) => setPayDrafts((p) => ({ ...p, [fee.id]: { ...p[fee.id], payment_method: e.target.value } }))}
                            >
                              <option value="online">Online</option>
                              <option value="cash">Cash</option>
                              <option value="upi">UPI</option>
                              <option value="card">Card</option>
                              <option value="bank_transfer">Transfer</option>
                            </select>
                            <button type="button" className={styles.smallBtn} onClick={() => payFee(fee.id)}>Pay</button>
                          </div>
                        )}
                        {Number(fee.amount_paid) > 0 && (
                          <button 
                            className={styles.ghostBtn} 
                            style={{ color: 'var(--t-accent)', gap: 6, padding: '4px 8px', display: 'flex', alignItems: 'center' }} 
                            onClick={() => handleViewReceipt(fee)}
                          >
                            <Printer size={14} /> Receipt
                          </button>
                        )}
                        {Number(fee.amount_paid) === 0 && balance === 0 && (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <p className={styles.empty}>No fee records found.</p>}
        </div>
      </div>

      {/* Create Fee Modal */}
      <TransportModal open={showModal} title="Create Transport Fee" onClose={() => setShowModal(false)}>
        <form onSubmit={submitFee}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Student *</label>
              <select className={styles.formSelect} value={form.student} onChange={(e) => set('student', e.target.value)} required>
                <option value="">Select Student</option>
                {studentOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Route</label>
              <select className={styles.formSelect} value={form.route} onChange={(e) => set('route', e.target.value)}>
                <option value="">Select Route</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Stop (Sets Amount)</label>
              <select className={styles.formSelect} value={form.stop} onChange={(e) => set('stop', e.target.value)}>
                <option value="">Select Stop</option>
                {stopOptions
                  .filter(opt => !form.route || String(opt.routeId) === String(form.route))
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Period Label *</label>
              <select 
                className={styles.formSelect} 
                value={form.period_label} 
                onChange={(e) => set('period_label', e.target.value)} 
                required
              >
                <option value="">Select Period</option>
                {[
                  'Apr-2026', 'May-2026', 'Jun-2026', 'Jul-2026', 
                  'Aug-2026', 'Sep-2026', 'Oct-2026', 'Nov-2026', 
                  'Dec-2026', 'Jan-2027', 'Feb-2027', 'Mar-2027'
                ].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Amount *</label>
              <input className={styles.formInput} type="number" step="0.01" value={form.amount_due} onChange={(e) => set('amount_due', e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Due Date *</label>
              <input className={styles.formInput} type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} required />
            </div>
          </div>
          <div className={styles.btnRow}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              {saving ? 'Creating...' : 'Create Fee'}
            </button>
            <button type="button" className={styles.secondaryBtn} style={{ marginTop: 'var(--space-3)' }} onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </TransportModal>

      {/* Receipt Modal */}
      <TransportModal 
        open={showReceipt} 
        title="Fee Payment Receipt" 
        onClose={() => setShowReceipt(false)} 
        width={540}
      >
        {receiptData && (
          <div className={styles.receiptContent}>
            <div className={styles.receiptHeader}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--t-title)' }}>Transport Fee Receipt</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t-muted)' }}>{receiptData.period_label} Session</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</p>
                  <p style={{ fontWeight: 600 }}>{receiptData.student_name}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>ID: {receiptData.admission_number}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route</p>
                  <p style={{ fontWeight: 600 }}>{receiptData.route_name || '—'}</p>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed var(--t-line)', borderBottom: '1px dashed var(--t-line)', padding: 'var(--space-4) 0', marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span>Total Amount Due</span>
                <span style={{ fontWeight: 600 }}>₹{receiptData.amount_due}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                <span>Total Amount Paid</span>
                <span style={{ fontWeight: 600 }}>- ₹{receiptData.amount_paid}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--t-line)' }}>
                <span style={{ fontWeight: 600 }}>Balance Remaining</span>
                <span style={{ fontWeight: 700, color: Number(receiptData.balance) > 0 ? '#ef4444' : '#22c55e' }}>
                  ₹{receiptData.balance}
                </span>
              </div>
            </div>

            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Payment Installments</h4>
            <div style={{ background: 'var(--t-accent-light)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              {receiptData.payments?.length > 0 ? (
                <table style={{ width: '100%', fontSize: 'var(--text-xs)' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--t-muted)' }}>
                      <th style={{ padding: '4px 0' }}>Date</th>
                      <th>Method</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.payments.map((p, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--t-line)' }}>
                        <td style={{ padding: '8px 0' }}>{p.payment_date}</td>
                        <td>{p.payment_method.toUpperCase()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{p.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', textAlign: 'center' }}>No installment records found.</p>
              )}
            </div>

            <div className={styles.btnRow} style={{ marginTop: 'var(--space-6)' }}>
              <button className={styles.primaryBtn} onClick={() => window.print()} style={{ gap: 8 }}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className={styles.secondaryBtn} onClick={() => setShowReceipt(false)}>Close</button>
            </div>
          </div>
        )}
      </TransportModal>
    </section>
  );
}
