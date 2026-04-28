'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Loader2, Pencil, Trash2, Download, Search,
  Heart, TrendingUp, Users, Calendar,
} from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import shared from '../shared/FinanceLayout.module.css';
import s from './DonationsPage.module.css';

const BLANK = {
  donor_name: '', donor_email: '', donor_phone: '',
  amount: '', purpose: '',
  payment_method: 'cash', transaction_id: '',
  donation_date: new Date().toISOString().split('T')[0],
  academic_year: '', receipt_number: '', notes: '',
};

const METHOD_COLORS = {
  cash:   { bg: '#d1fae5', color: '#065f46' },
  cheque: { bg: '#dbeafe', color: '#1e40af' },
  online: { bg: '#ede9fe', color: '#5b21b6' },
  upi:    { bg: '#fce7f3', color: '#9d174d' },
  neft:   { bg: '#fff7ed', color: '#c2410c' },
};

const AVATAR_COLORS = ['#4f46e5','#0891b2','#16a34a','#d97706','#dc2626','#7c3aed','#db2777','#059669'];

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name[0] || '?').toUpperCase();
};

const getAvatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function DonationsPage() {
  const [donations, setDonations] = useState([]);
  const [years, setYears]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(BLANK);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const { push } = useToast();

  useEffect(() => {
    Promise.all([adminApi.getDonations(), adminApi.getAcademicYears()])
      .then(([d, y]) => { setDonations(d.data || []); setYears(y.data || []); })
      .catch(() => push('Failed to load data.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const openModal = (d = null) => {
    setForm(d ? { ...BLANK, ...d, academic_year: d.academic_year || '' } : BLANK);
    setModal(d || {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await adminApi.updateDonation(modal.id, form);
      else await adminApi.createDonation(form);
      push(modal?.id ? 'Donation updated.' : 'Donation recorded.', 'success');
      const r = await adminApi.getDonations(); setDonations(r.data || []);
      setModal(null);
    } catch { push('Failed to save donation.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this donation record?')) return;
    try {
      await adminApi.deleteDonation(id);
      setDonations(p => p.filter(d => d.id !== id));
      push('Donation deleted.', 'success');
    } catch { push('Failed to delete.', 'error'); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalRaised = useMemo(() => donations.reduce((s, d) => s + Number(d.amount || 0), 0), [donations]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return donations
      .filter(d => {
        const [y, m] = (d.donation_date || '').split('-');
        return parseInt(y) === now.getFullYear() && parseInt(m) === now.getMonth() + 1;
      })
      .reduce((s, d) => s + Number(d.amount || 0), 0);
  }, [donations]);

  const avgDonation = donations.length > 0 ? Math.round(totalRaised / donations.length) : 0;

  // ── By method ─────────────────────────────────────────────────────────────
  const byMethod = useMemo(() => {
    const map = {};
    donations.forEach(d => {
      const m = d.payment_method || 'cash';
      map[m] = (map[m] || 0) + Number(d.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [donations]);

  const maxMethodAmt = byMethod.length > 0 ? byMethod[0][1] : 1;

  // ── Top donors ─────────────────────────────────────────────────────────────
  const topDonors = useMemo(() => {
    const map = {};
    donations.forEach(d => {
      const name = d.donor_name;
      if (!map[name]) map[name] = { name, total: 0, count: 0 };
      map[name].total += Number(d.amount || 0);
      map[name].count++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [donations]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...donations];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.donor_name?.toLowerCase().includes(q) ||
        d.purpose?.toLowerCase().includes(q) ||
        d.donor_email?.toLowerCase().includes(q)
      );
    }
    if (filterMethod) list = list.filter(d => d.payment_method === filterMethod);
    return list;
  }, [donations, search, filterMethod]);

  const exportCSV = () => {
    const rows = filtered.map(d =>
      `"${d.donor_name}","${d.donor_email || ''}","${d.donor_phone || ''}",${d.amount},"${d.purpose || ''}","${d.payment_method}","${d.transaction_id || ''}","${d.donation_date}","${d.receipt_number || ''}"`
    );
    const csv = 'Donor,Email,Phone,Amount,Purpose,Method,Transaction ID,Date,Receipt\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'donations.csv'; a.click();
  };

  const lakh = totalRaised >= 100000 ? `₹${(totalRaised / 100000).toFixed(2)}L` : fmt(totalRaised);

  return (
    <div className={shared.financeModule}>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>Donations</h1>
        <p className={shared.pageSubtitle}>Track donor contributions, manage receipts and analyse giving patterns</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiAccent} style={{ background: '#16a34a' }} />
          <div className={s.kpiIcon} style={{ background: '#d1fae5', color: '#16a34a' }}><Heart size={18} /></div>
          <div className={s.kpiLabel}>Total Raised</div>
          <div className={s.kpiValue} style={{ color: '#16a34a' }}>{lakh}</div>
          <div className={s.kpiSub}>Across all donations</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiAccent} style={{ background: '#2563eb' }} />
          <div className={s.kpiIcon} style={{ background: '#dbeafe', color: '#2563eb' }}><Users size={18} /></div>
          <div className={s.kpiLabel}>Total Donations</div>
          <div className={s.kpiValue}>{donations.length}</div>
          <div className={s.kpiSub}>Records on file</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiAccent} style={{ background: '#7c3aed' }} />
          <div className={s.kpiIcon} style={{ background: '#ede9fe', color: '#7c3aed' }}><Calendar size={18} /></div>
          <div className={s.kpiLabel}>This Month</div>
          <div className={s.kpiValue} style={{ color: '#7c3aed' }}>{fmt(thisMonth)}</div>
          <div className={s.kpiSub}>Current month receipts</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiAccent} style={{ background: '#d97706' }} />
          <div className={s.kpiIcon} style={{ background: '#fef3c7', color: '#d97706' }}><TrendingUp size={18} /></div>
          <div className={s.kpiLabel}>Average Donation</div>
          <div className={s.kpiValue} style={{ color: '#d97706' }}>{fmt(avgDonation)}</div>
          <div className={s.kpiSub}>Per record</div>
        </div>
      </div>

      {/* ── Summary panels ── */}
      {donations.length > 0 && (
        <div className={s.summaryGrid}>
          {/* By method */}
          <div className={shared.card}>
            <div className={shared.cardHeader} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 16 }}>
              <h3 className={shared.cardTitle} style={{ fontSize: 15 }}>By Payment Method</h3>
            </div>
            <div className={s.methodList}>
              {byMethod.map(([method, total]) => {
                const mc = METHOD_COLORS[method] || { bg: '#f1f5f9', color: '#475569' };
                return (
                  <div key={method} className={s.methodRow}>
                    <span
                      className={shared.badge}
                      style={{ background: mc.bg, color: mc.color, minWidth: 60, justifyContent: 'center' }}
                    >
                      {method.toUpperCase()}
                    </span>
                    <div className={s.methodBarTrack}>
                      <div
                        className={s.methodBarFill}
                        style={{ width: `${(total / maxMethodAmt) * 100}%`, background: mc.color }}
                      />
                    </div>
                    <span className={s.methodAmt}>{fmt(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top donors */}
          <div className={shared.card}>
            <div className={shared.cardHeader} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 16 }}>
              <h3 className={shared.cardTitle} style={{ fontSize: 15 }}>Top Donors</h3>
            </div>
            <div className={s.donorList}>
              {topDonors.map((d, idx) => {
                const ac = getAvatarColor(d.name);
                return (
                  <div key={d.name} className={s.donorRow}>
                    <span className={s.donorRank}>#{idx + 1}</span>
                    <div className={s.donorAvatar} style={{ background: ac + '22', color: ac }}>
                      {getInitials(d.name)}
                    </div>
                    <div className={s.donorInfo}>
                      <div className={s.donorName}>{d.name}</div>
                      <div className={s.donorCount}>{d.count} donation{d.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div className={s.donorTotal}>{fmt(d.total)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Records table ── */}
      <div className={shared.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div className={shared.cardHeader} style={{ padding: '16px 20px', margin: 0 }}>
          <h3 className={shared.cardTitle} style={{ fontSize: 15 }}>
            Donation Records
            {filtered.length !== donations.length && (
              <span className={shared.badge} style={{ marginLeft: 8, fontFamily: 'monospace' }}>
                {filtered.length} / {donations.length}
              </span>
            )}
          </h3>
          <div className={s.toolbar}>
            <div className={s.searchWrap}>
              <Search size={14} className={s.searchIcon} />
              <input
                className={`${shared.input} ${s.searchInput}`}
                placeholder="Search donor or purpose…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className={shared.input}
              style={{ width: 'auto', minWidth: 130 }}
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
            >
              <option value="">All Methods</option>
              {['cash', 'cheque', 'online', 'upi', 'neft'].map(m => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>
            <button className={shared.btnSecondary} onClick={exportCSV}><Download size={14} /> Export</button>
            <button className={shared.btnPrimary} onClick={() => openModal()}><Plus size={14} /> Record</button>
          </div>
        </div>

        {loading ? (
          <div className={shared.loading}><Loader2 size={18} className={shared.spin} /> Loading donations…</div>
        ) : (
          <div
            className={shared.tableResponsive}
            style={{ margin: 0, border: 'none', borderTop: '1px solid var(--finance-border)', borderRadius: 0 }}
          >
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Donor</th>
                  <th className={shared.textRight}>Amount</th>
                  <th>Purpose</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Receipt</th>
                  <th className={shared.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={s.emptyPanel} style={{ padding: '48px 20px' }}>
                        <div className={s.emptyCircle}><Heart size={24} /></div>
                        <div className={s.emptyH}>
                          {search || filterMethod ? 'No donations match your filters' : 'No donations recorded yet'}
                        </div>
                        <div className={s.emptyP}>
                          {search || filterMethod
                            ? 'Try adjusting your search or clearing the filter.'
                            : 'Record your first donation to start tracking contributions.'}
                        </div>
                        {!search && !filterMethod && (
                          <button className={shared.btnPrimary} onClick={() => openModal()}>
                            <Plus size={14} /> Record Donation
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(d => {
                  const mc = METHOD_COLORS[d.payment_method] || { bg: '#f1f5f9', color: '#475569' };
                  const ac = getAvatarColor(d.donor_name);
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className={s.tableAvatar} style={{ background: ac + '22', color: ac }}>
                            {getInitials(d.donor_name)}
                          </div>
                          <div>
                            <div className={shared.textBold}>{d.donor_name}</div>
                            <div className={shared.textSub}>{d.donor_email || d.donor_phone || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`${shared.fontMono} ${shared.textRight}`} style={{ color: '#16a34a', fontWeight: 800 }}>
                        {fmt(d.amount)}
                      </td>
                      <td>
                        {d.purpose
                          ? <span className={s.purposeTag}>{d.purpose}</span>
                          : <span style={{ color: 'var(--finance-text-muted)' }}>—</span>
                        }
                      </td>
                      <td>
                        <span className={shared.badge} style={{ background: mc.bg, color: mc.color }}>
                          {(d.payment_method || '').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: 'var(--finance-text-muted)', fontFamily: 'monospace', fontSize: 13 }}>
                        {d.donation_date}
                      </td>
                      <td style={{ color: 'var(--finance-text-muted)', fontSize: 13 }}>
                        {d.receipt_number || '—'}
                      </td>
                      <td>
                        <div className={shared.actions}>
                          <button className={shared.iconBtn} onClick={() => openModal(d)}><Pencil size={13} /></button>
                          <button className={`${shared.iconBtn} ${shared.iconBtnDanger}`} onClick={() => del(d.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal !== null && (
        <div className={shared.overlay}>
          <div className={shared.modal} style={{ maxWidth: 620 }}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>{modal?.id ? 'Edit Donation' : 'Record Donation'}</h3>
              <button className={shared.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={shared.modalBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className={shared.formGroup} style={{ gridColumn: '1/-1', marginBottom: 0 }}>
                    <label className={shared.label}>Donor Name *</label>
                    <input
                      className={shared.input}
                      value={form.donor_name}
                      onChange={e => set('donor_name', e.target.value)}
                      required
                      placeholder="Full name or organization…"
                    />
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Amount (₹) *</label>
                    <input className={shared.input} type="number" min="0" step="1" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0" />
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Date *</label>
                    <input className={shared.input} type="date" value={form.donation_date} onChange={e => set('donation_date', e.target.value)} required />
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Email</label>
                    <input className={shared.input} type="email" value={form.donor_email} onChange={e => set('donor_email', e.target.value)} placeholder="donor@example.com" />
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Phone</label>
                    <input className={shared.input} type="tel" value={form.donor_phone} onChange={e => set('donor_phone', e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Payment Method</label>
                    <select className={shared.input} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                      {['cash', 'cheque', 'online', 'upi', 'neft'].map(m => (
                        <option key={m} value={m}>{m.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Transaction / Cheque No.</label>
                    <input className={shared.input} value={form.transaction_id} onChange={e => set('transaction_id', e.target.value)} placeholder="Reference number…" />
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Receipt Number</label>
                    <input className={shared.input} value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)} placeholder="e.g. REC-2024-001" />
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Academic Year</label>
                    <select className={shared.input} value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
                      <option value="">Select year…</option>
                      {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                  <div className={shared.formGroup} style={{ gridColumn: '1/-1', marginBottom: 0 }}>
                    <label className={shared.label}>Purpose</label>
                    <input
                      className={shared.input}
                      value={form.purpose}
                      onChange={e => set('purpose', e.target.value)}
                      placeholder="e.g. Scholarship Fund, Library, Building Construction…"
                    />
                  </div>
                  <div className={shared.formGroup} style={{ gridColumn: '1/-1', marginBottom: 0 }}>
                    <label className={shared.label}>Notes</label>
                    <textarea className={`${shared.input} ${shared.textarea}`} value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
                  </div>
                </div>
              </div>
              <div className={shared.modalFooter}>
                <button type="button" className={shared.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={shared.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={shared.spin} />}
                  {modal?.id ? 'Save Changes' : 'Record Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
