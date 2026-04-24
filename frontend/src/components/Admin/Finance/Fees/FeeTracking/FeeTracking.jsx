'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, AlertTriangle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  cls: styles.badgePending, icon: Clock },
  overdue:  { label: 'Overdue',  cls: styles.badgeDanger,  icon: AlertTriangle },
  paid:     { label: 'Paid',     cls: styles.badgePaid,    icon: CheckCircle },
  partial:  { label: 'Partial',  cls: styles.badgePending, icon: Clock },
  waived:   { label: 'Waived',   cls: styles.badgePaid,    icon: CheckCircle },
};

export default function FeeTracking() {
  const [payments, setPayments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { push } = useToast();

  useEffect(() => { fetchStatics(); }, []);
  useEffect(() => { fetchPayments(); }, [filterYear, filterClass, filterStatus]);

  const fetchStatics = async () => {
    try {
      const [yrRes, clsRes] = await Promise.all([adminApi.getAcademicYears(), adminApi.getClasses()]);
      setAcademicYears(yrRes.data || []); setClasses(clsRes.data || []);
    } catch {}
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterYear) params.academic_year = filterYear;
      if (filterClass) params.class = filterClass;
      if (filterStatus) params.status = filterStatus;
      const r = await adminApi.getFeePayments(params);
      setPayments(r.data || []);
    } catch { push('Failed to load tracking data.', 'error'); }
    finally { setLoading(false); }
  };

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return (p.student_name || '').toLowerCase().includes(q) || (p.admission_number || '').toLowerCase().includes(q);
  });

  const exportCSV = () => {
    const rows = filtered.map(p => `"${p.student_name}","${p.admission_number}","${p.category_name}",${p.amount_paid},${p.status},"${p.payment_date || ''}"`);
    const csv = 'Student,Admission No.,Fee Head,Amount Paid,Status,Date\n' + rows.join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `fee_tracking_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const totals = {
    total: filtered.reduce((s, p) => s + Number(p.amount_paid || 0), 0),
    paid: filtered.filter(p => p.status === 'paid').length,
    pending: filtered.filter(p => p.status === 'pending').length,
    overdue: filtered.filter(p => p.status === 'overdue').length,
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className={styles.card} style={{ padding: 20 }}>
          <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Total Collected</div>
          <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>₹{totals.total.toLocaleString('en-IN')}</div>
        </div>
        <div className={styles.card} style={{ padding: 20 }}>
          <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Paid</div>
          <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>{totals.paid}</div>
        </div>
        <div className={styles.card} style={{ padding: 20 }}>
          <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Pending</div>
          <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#d97706', marginTop: 4 }}>{totals.pending}</div>
        </div>
        <div className={styles.card} style={{ padding: 20 }}>
          <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Overdue</div>
          <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#dc2626', marginTop: 4 }}>{totals.overdue}</div>
        </div>
      </div>

      <div className={styles.card} style={{ padding: 0 }}>
        <div className={styles.cardHeader} style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div className={styles.inputWrapper} style={{ flex: 1, minWidth: 200 }}>
            <Search className={styles.inputIcon} size={16} />
            <input className={`${styles.input} ${styles.inputWithIcon}`} placeholder="Search student or admission no..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={styles.input} style={{ width: 140 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
          <select className={styles.input} style={{ width: 140 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={styles.input} style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <button className={styles.btnSecondary} onClick={exportCSV}><Download size={14} /> Export</button>
        </div>

        {loading ? (
          <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading tracking data...</div>
        ) : (
          <div className={styles.tableResponsive} style={{ margin: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr><th>Student / ID</th><th>Fee Head</th><th>Class</th><th className={styles.textRight}>Amount Paid</th><th className={styles.textRight}>Late Fine</th><th>Date</th><th className={styles.textCenter}>Status</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={7} className={styles.emptyState}>No matching records found.</td></tr> : filtered.map(p => {
                  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.textBold}>{p.student_name}</div>
                        <div className={styles.textSub}>{p.admission_number}</div>
                      </td>
                      <td>{p.category_name}</td>
                      <td style={{ color: 'var(--finance-text-muted)' }}>{p.class_name}</td>
                      <td className={`${styles.fontMono} ${styles.textRight}`} style={{ fontWeight: 800 }}>₹{Number(p.amount_paid).toLocaleString('en-IN')}</td>
                      <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: 'var(--finance-text-muted)' }}>₹{Number(p.late_fine || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--finance-text-muted)' }}>{p.payment_date || '—'}</td>
                      <td className={styles.textCenter}><span className={`${styles.badge} ${cfg.cls}`}>{cfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
