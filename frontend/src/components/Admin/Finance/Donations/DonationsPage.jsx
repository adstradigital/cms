'use client';
import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Heart, Pencil, Trash2, Download } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from '../shared/FinanceLayout.module.css';

const BLANK = { donor_name: '', donor_email: '', donor_phone: '', amount: '', purpose: '', payment_method: 'cash', transaction_id: '', donation_date: new Date().toISOString().split('T')[0], notes: '' };
const METHODS = ['cash', 'cheque', 'online', 'upi', 'neft'];

export default function DonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try { setDonations((await adminApi.getDonations()).data || []); }
    catch { push('Failed to load donations.', 'error'); }
    finally { setLoading(false); }
  };

  const openModal = (d = null) => {
    setForm(d ? { ...d } : BLANK);
    setModal(d || {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await adminApi.updateDonation(modal.id, form);
      else await adminApi.createDonation(form);
      push('Donation recorded successfully.', 'success'); fetchData(); setModal(null);
    } catch { push('Failed to save donation.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete donation record?')) return;
    try { await adminApi.deleteDonation(id); setDonations(p => p.filter(d => d.id !== id)); push('Deleted.', 'success'); }
    catch { push('Failed to delete.', 'error'); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const totalDonations = donations.reduce((s, d) => s + Number(d.amount), 0);

  const exportCSV = () => {
    const rows = donations.map(d => `"${d.donor_name}",${d.amount},"${d.purpose}","${d.payment_method}","${d.donation_date}"`);
    const csv = 'Donor,Amount,Purpose,Method,Date\n' + rows.join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'donations.csv'; a.click();
  };

  return (
    <div className={styles.financeModule}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Donations</h1>
        <p className={styles.pageSubtitle}>Track donor contributions and manage receipts</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#fef2f2', padding: 16, borderRadius: 12 }}><Heart size={24} color="#dc2626" /></div>
          <div>
            <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Total Received</div>
            <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>₹{totalDonations.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 12 }}><Heart size={24} color="#0284c7" /></div>
          <div>
            <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Total Donors</div>
            <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#091426' }}>{donations.length}</div>
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ padding: 0 }}>
        <div className={styles.cardHeader} style={{ padding: 24 }}>
          <div>
            <h3 className={styles.cardTitle}>Donation History</h3>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className={styles.btnSecondary} onClick={exportCSV}><Download size={14} /> Export CSV</button>
            <button className={styles.btnPrimary} onClick={() => openModal()}><Plus size={14} /> Record Donation</button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading donations...</div>
        ) : (
          <div className={styles.tableResponsive} style={{ margin: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr><th>Donor Information</th><th className={styles.textRight}>Amount</th><th>Purpose</th><th>Method</th><th>Date</th><th className={styles.textRight}>Actions</th></tr>
              </thead>
              <tbody>
                {donations.length === 0 ? <tr><td colSpan={6} className={styles.emptyState}>No donations recorded yet.</td></tr> : donations.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className={styles.textBold}>{d.donor_name}</div>
                      <div style={{ color: 'var(--finance-text-muted)', fontSize: 12 }}>{d.donor_email || d.donor_phone || '—'}</div>
                    </td>
                    <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: '#16a34a', fontWeight: 800 }}>₹{Number(d.amount).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{d.purpose || '—'}</td>
                    <td><span className={styles.badge} style={{ background: '#f1f5f9', color: '#475569' }}>{d.payment_method?.toUpperCase()}</span></td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{d.donation_date}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.iconBtn} onClick={() => openModal(d)}><Pencil size={14} /></button>
                        <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => del(d.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <div className={styles.overlay}>
          <div className={styles.modal} style={{ maxWidth: 640 }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{modal?.id ? 'Edit Donation' : 'Record Donation'}</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Donor Name *</label>
                  <input className={styles.input} value={form.donor_name} onChange={e => set('donor_name', e.target.value)} required placeholder="Full Name or Organization..." />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Amount (₹) *</label>
                  <input className={styles.input} type="number" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date *</label>
                  <input className={styles.input} type="date" value={form.donation_date} onChange={e => set('donation_date', e.target.value)} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input className={styles.input} type="email" value={form.donor_email} onChange={e => set('donor_email', e.target.value)} placeholder="donor@example.com" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone</label>
                  <input className={styles.input} type="tel" value={form.donor_phone} onChange={e => set('donor_phone', e.target.value)} placeholder="+91..." />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Payment Method</label>
                  <select className={`${styles.input} ${styles.select}`} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                    {METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Transaction ID</label>
                  <input className={styles.input} value={form.transaction_id} onChange={e => set('transaction_id', e.target.value)} placeholder="Ref / cheque no..." />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Purpose</label>
                  <input className={styles.input} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="e.g. Scholarship Fund, Building Fund" />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Notes</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving && <Loader2 size={14} className={styles.spin} />} Save Donation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
