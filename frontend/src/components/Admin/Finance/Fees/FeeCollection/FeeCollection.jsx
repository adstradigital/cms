'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, Filter, Download, MoreVertical, CreditCard, Landmark, Banknote, ScrollText, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';

export default function FeeCollection() {
  const [payments, setPayments] = useState([]);
  const [structures, setStructures] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const [form, setForm] = useState({
    student: '', // Holds query
    studentObj: null, // Holds selected student
    fee_structure: '',
    amount_paid: '',
    payment_method: 'card',
    payment_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        adminApi.getFeePayments({ status: 'paid' }),
        adminApi.getFeeStructures(),
      ]);
      setPayments(pRes.data || []);
      setStructures(sRes.data || []);
    } catch { push('Failed to load data.', 'error'); }
    finally { setLoading(false); }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const searchStudents = async (query) => {
    setF('student', query);
    setF('studentObj', null); // clear selection while typing
    if (query.trim().length < 3) {
      setStudents([]); return;
    }
    try {
      const r = await adminApi.getStudents({ search: query });
      setStudents(r.data?.results || r.data || []);
    } catch { console.error('Silent search fail'); }
  };

  const selectStudent = (s) => {
    setF('studentObj', s);
    setF('student', `${s.first_name} ${s.last_name} (${s.admission_number})`);
    setStudents([]);
    // auto figure out dues
    adminApi.getStudentFeeStatement(s.id).then(r => {
      if (r.data?.payments) {
         const pending = r.data.payments.find(p => p.status === 'pending');
         if (pending) {
            setF('fee_structure', pending.fee_structure);
            setF('amount_paid', pending.total_due);
         }
      }
    }).catch();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentObj) return push('Please select a student from the dropdown.', 'error');
    if (!form.fee_structure || !form.amount_paid) return push('Fill all required fields.', 'error');
    setSaving(true);
    try {
      await adminApi.createFeePayment({
        student: form.studentObj.id,
        fee_structure: form.fee_structure,
        amount_paid: form.amount_paid,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        transaction_id: 'REF-' + Date.now().toString().slice(-6),
        remarks: 'Manual collection',
      });
      push('Payment recorded successfully!', 'success');
      setForm({ student: '', studentObj: null, fee_structure: '', amount_paid: '', payment_method: 'card', payment_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch { push('Failed to record payment.', 'error'); }
    finally { setSaving(false); }
  };

  const MethodButton = ({ value, icon: Icon, label }) => {
    const isSelected = form.payment_method === value;
    return (
      <label className={`${styles.methodBtn} ${isSelected ? styles.methodSelected : ''}`}>
        <input type="radio" value={value} className={styles.srOnly} checked={isSelected} onChange={() => setF('payment_method', value)} />
        <Icon size={20} style={{ color: 'var(--finance-text-muted)' }} />
        <span>{label}</span>
      </label>
    );
  };

  return (
    <div className={styles.splitLayout}>
      
      {/* LEFT COLUMN: Record Payment Form */}
      <section className={styles.leftColumn}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Record Payment</h3>
              <p className={styles.cardSubtitle}>Process incoming student fees.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Student Search */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Student</label>
              <div className={styles.inputWrapper}>
                <Search className={styles.inputIcon} size={18} />
                <input 
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  placeholder="Search by name or admission no..." 
                  value={form.student}
                  onChange={(e) => searchStudents(e.target.value)}
                  required
                />
                
                {/* Dropdown for search results */}
                {students.length > 0 && !form.studentObj && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #dfe3e8', borderRadius: 6, zIndex: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    {students.map(s => (
                      <div key={s.id} onClick={() => selectStudent(s)} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.backgroundColor='#f6faff'} onMouseOut={e => e.currentTarget.style.backgroundColor='#fff'}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--finance-text)' }}>{s.first_name} {s.last_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--finance-text-muted)' }}>{s.admission_number}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Fee Head</label>
              <div className={styles.inputWrapper}>
                <select className={`${styles.input} ${styles.select}`} value={form.fee_structure} onChange={e => setF('fee_structure', e.target.value)} required>
                  <option value="" disabled>Select fee type...</option>
                  {structures.map(s => <option key={s.id} value={s.id}>{s.category_name} - ₹{s.amount}</option>)}
                </select>
                <ChevronDown className={styles.selectArrow} size={18} />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Amount (₹)</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>₹</span>
                  <input className={`${styles.input} ${styles.inputWithIcon} ${styles.numberInput}`} type="number" step="0.01" min="0" placeholder="0.00" value={form.amount_paid} onChange={e => setF('amount_paid', e.target.value)} required />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Date</label>
                <div className={styles.inputWrapper}>
                  <input className={styles.input} type="date" value={form.payment_date} onChange={e => setF('payment_date', e.target.value)} required />
                </div>
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: 16 }}>
              <label className={styles.label}>Payment Method</label>
              <div className={styles.radioGrid}>
                <MethodButton value="card" icon={CreditCard} label="Card" />
                <MethodButton value="online" icon={Landmark} label="Online" />
                <MethodButton value="cash" icon={Banknote} label="Cash" />
                <MethodButton value="cheque" icon={ScrollText} label="Cheque" />
              </div>
            </div>

            <button className={styles.submitBtn} type="submit" disabled={saving || !form.studentObj}>
              {saving ? <Loader2 size={18} className={styles.spin} /> : <CheckCircle size={18} />}
              Confirm Collection
            </button>
          </form>
        </div>
      </section>

      {/* RIGHT COLUMN: Recent Receipts */}
      <section className={styles.rightColumn}>
        <div className={styles.card} style={{ padding: 0 }}>
          
          <div className={styles.cardHeader} style={{ padding: '16px 24px', margin: 0, backgroundColor: '#f6faff', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
            <h3 className={styles.cardTitle} style={{ fontSize: 18 }}>Recent Receipts</h3>
            <div className={styles.actions}>
              <button className={styles.btnSecondary}><Filter size={14} style={{ color: '#75777d' }} /> Filter</button>
              <button className={styles.btnSecondary}><Download size={14} style={{ color: '#75777d' }} /> Export</button>
            </div>
          </div>

          <div className={styles.tableResponsive} style={{ margin: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Receipt #</th>
                  <th>Student Info</th>
                  <th>Fee Head</th>
                  <th style={{ width: 120 }}>Date</th>
                  <th className={styles.textRight} style={{ width: 120 }}>Amount</th>
                  <th className={styles.textCenter} style={{ width: 100 }}>Status</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan={7} className={styles.loading}><Loader2 size={16} className={styles.spin}/> Loading payments...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} className={styles.emptyState}>No receipts generated yet.</td></tr>
                ) : payments.slice(0, 10).map((p) => (
                  <tr key={p.id}>
                    <td className={styles.fontMono} style={{ color: 'var(--finance-text-muted)' }}>{p.receipt_number}</td>
                    <td>
                      <span className={styles.textBold}>{p.student_name}</span>
                      <span className={styles.textSub}>{p.admission_number || 'N/A'}</span>
                    </td>
                    <td>{p.category_name}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{p.payment_date}</td>
                    <td className={`${styles.fontMono} ${styles.textRight}`}>
                      ₹{Number(p.amount_paid).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className={styles.textCenter}>
                      <span className={`${styles.badge} ${styles.badgePaid}`}>PAID</span>
                    </td>
                    <td className={styles.textRight}>
                      <button className={styles.iconBtn} style={{ border: 'none' }}><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>

    </div>
  );
}
