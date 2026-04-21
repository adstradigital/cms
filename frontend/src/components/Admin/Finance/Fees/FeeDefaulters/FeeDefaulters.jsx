'use client';
import React, { useState, useEffect } from 'react';
import { Download, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';

export default function FeeDefaulters() {
  const [defaulters, setDefaulters] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const { push } = useToast();

  useEffect(() => {
    Promise.all([adminApi.getAcademicYears(), adminApi.getClasses()])
      .then(([yr, cl]) => { setAcademicYears(yr.data || []); setClasses(cl.data || []); });
  }, []);

  useEffect(() => { fetchDefaulters(); }, [filterYear, filterClass]);

  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterYear) params.academic_year = filterYear;
      if (filterClass) params.class = filterClass;
      const r = await adminApi.getFeeDefaulters(params);
      setDefaulters(r.data || []);
    } catch { push('Failed to load defaulters.', 'error'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const rows = defaulters.map(d => `"${d.student_name}","${d.admission_number}","${d.category_name}",${d.total_due || d.fee_structure_amount || ''},${d.status},"${d.due_date || ''}"`);
    const csv = 'Student,Admission No.,Fee Head,Amount Due,Status,Due Date\n' + rows.join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `fee_defaulters_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const overdue = defaulters.filter(d => d.status === 'overdue');
  const pending = defaulters.filter(d => d.status === 'pending');

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Overdue Students</div>
            <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#dc2626' }}>{overdue.length}</div>
          </div>
        </div>
        <div className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Pending Students</div>
            <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#d97706' }}>{pending.length}</div>
          </div>
        </div>
        <div className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Total Records</div>
            <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#091426' }}>{defaulters.length}</div>
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ padding: 0 }}>
        <div className={styles.cardHeader} style={{ padding: 24 }}>
          <div><h3 className={styles.cardTitle}>Defaulters List</h3><p className={styles.cardSubtitle}>Students with unpaid fees</p></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <select className={styles.input} style={{ width: 140 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">All Years</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <select className={styles.input} style={{ width: 140 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className={styles.btnSecondary} onClick={exportCSV}><Download size={14} /> Export</button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading defaulters...</div>
        ) : (
          <div className={styles.tableResponsive} style={{ margin: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr><th>Student</th><th>Admission No.</th><th>Fee Head</th><th className={styles.textRight}>Amount Due</th><th className={styles.textCenter}>Status</th></tr>
              </thead>
              <tbody>
                {defaulters.length === 0 ? <tr><td colSpan={5} className={styles.emptyState}>No defaulters found.</td></tr> : defaulters.map(d => (
                  <tr key={d.id}>
                    <td className={styles.textBold}>{d.student_name}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{d.admission_number}</td>
                    <td>{d.category_name}</td>
                    <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: '#dc2626', fontWeight: 800 }}>₹{Number(d.total_due || d.fee_structure || 0).toLocaleString('en-IN')}</td>
                    <td className={styles.textCenter}>
                      <span className={`${styles.badge} ${d.status === 'overdue' ? styles.badgeDanger : styles.badgePending}`} style={{ padding: '4px 12px', fontSize: 11, borderRadius: 12, fontWeight: 800 }}>
                        {d.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
