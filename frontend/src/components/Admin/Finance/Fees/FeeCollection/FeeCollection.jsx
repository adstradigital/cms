'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, CheckCircle, Filter, Download, MoreVertical, CreditCard, Landmark, Banknote, ScrollText, ChevronDown, CheckSquare, Square, X } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';

export default function FeeCollection() {
  const [payments, setPayments] = useState([]);
  const [structures, setStructures] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeDues, setFeeDues] = useState([]);       // Per-structure dues from backend
  const [selectedFees, setSelectedFees] = useState([]); // Array of fee_structure IDs
  const [loadingDues, setLoadingDues] = useState(false);
  const { push } = useToast();

  const [form, setForm] = useState({
    student: '',
    studentObj: null,
    amount_paid: '',
    payment_method: 'cash',
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
    setF('studentObj', null);
    setFeeDues([]);
    setSelectedFees([]);
    setF('amount_paid', '');
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
    const studentName = s.full_name || (s.user ? `${s.user.first_name} ${s.user.last_name}` : 'Unknown Student');
    setF('student', `${studentName} (${s.admission_number})`.trim());
    setStudents([]);
    setFeeDues([]);
    setSelectedFees([]);
    setF('amount_paid', '');
    setLoadingDues(true);

    adminApi.getStudentFeeStatement(s.id).then(r => {
      let dues = (r.data?.fee_dues || []).filter(d => d.balance_due > 0);
      
      // Fallback: If no fee structures are configured for this student's class, 
      // show all global structures so the admin can still collect payments.
      if (dues.length === 0 && Number(r.data?.total_fee || 0) === 0) {
        dues = structures.map(st => ({
          fee_structure: st.id,
          category_name: st.category_name,
          category_type: st.category_type,
          total_amount: Number(st.amount),
          amount_paid: 0,
          balance_due: Number(st.amount),
          due_date: st.due_date || 'N/A'
        }));
      }

      setFeeDues(dues);
      // Auto-select all
      const allIds = dues.map(d => d.fee_structure);
      setSelectedFees(allIds);
      const total = dues.reduce((sum, d) => sum + d.balance_due, 0);
      setF('amount_paid', total > 0 ? total.toFixed(2) : '');
    }).catch(() => {
      push('Could not load student fee dues.', 'error');
    }).finally(() => setLoadingDues(false));
  };

  // Toggle individual fee checkbox
  const toggleFee = (feeStructureId) => {
    setSelectedFees(prev => {
      const next = prev.includes(feeStructureId)
        ? prev.filter(id => id !== feeStructureId)
        : [...prev, feeStructureId];
      // Recalculate amount
      const total = feeDues
        .filter(d => next.includes(d.fee_structure))
        .reduce((sum, d) => sum + d.balance_due, 0);
      setF('amount_paid', total > 0 ? total.toFixed(2) : '');
      return next;
    });
  };

  // Select all / deselect all
  const toggleAll = () => {
    if (selectedFees.length === feeDues.length) {
      setSelectedFees([]);
      setF('amount_paid', '');
    } else {
      const allIds = feeDues.map(d => d.fee_structure);
      setSelectedFees(allIds);
      const total = feeDues.reduce((sum, d) => sum + d.balance_due, 0);
      setF('amount_paid', total > 0 ? total.toFixed(2) : '');
    }
  };

  const selectedTotal = useMemo(() => {
    return feeDues
      .filter(d => selectedFees.includes(d.fee_structure))
      .reduce((sum, d) => sum + d.balance_due, 0);
  }, [feeDues, selectedFees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentObj) return push('Please select a student from the dropdown.', 'error');
    if (selectedFees.length === 0) return push('Please select at least one fee component.', 'error');
    if (!form.amount_paid || Number(form.amount_paid) <= 0) return push('Amount must be greater than zero.', 'error');

    setSaving(true);
    try {
      const txId = 'REF-' + Date.now().toString().slice(-6);
      const selectedDues = feeDues.filter(d => selectedFees.includes(d.fee_structure));
      let remainingToPay = Number(form.amount_paid);

      for (const due of selectedDues) {
        if (remainingToPay <= 0) break;

        const payForThis = Math.min(due.balance_due, remainingToPay);

        await adminApi.createFeePayment({
          student: form.studentObj.id,
          fee_structure: due.fee_structure,
          amount_paid: payForThis,
          payment_method: form.payment_method,
          payment_date: form.payment_date,
          transaction_id: txId,
          remarks: selectedDues.length > 1 ? 'Bulk collection' : 'Manual collection',
        });

        remainingToPay -= payForThis;
      }

      push(`Payment of ₹${Number(form.amount_paid).toLocaleString('en-IN')} recorded for ${selectedDues.length} fee component(s)!`, 'success');
      setForm({ student: '', studentObj: null, amount_paid: '', payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0] });
      setFeeDues([]);
      setSelectedFees([]);
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
        <div className={styles.card} style={{ height: 'auto' }}>
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
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--finance-text)' }}>{s.full_name || (s.user ? `${s.user.first_name} ${s.user.last_name}` : 'Unknown Student')}</div>
                        <div style={{ fontSize: 11, color: 'var(--finance-text-muted)' }}>{s.admission_number}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fee Components Checklist */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Fee Components</label>

              {!form.studentObj ? (
                <div style={{
                  padding: '24px 16px',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 13,
                }}>
                  Search and select a student to see their pending fees
                </div>
              ) : loadingDues ? (
                <div style={{
                  padding: '24px 16px',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Loader2 size={16} className={styles.spin} /> Loading student fees...
                </div>
              ) : feeDues.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  background: '#f0fdf4',
                  borderRadius: 10,
                  border: '1px solid #bbf7d0',
                  textAlign: 'center',
                  color: '#16a34a',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  ✓ All fees are fully paid for this student!
                </div>
              ) : (
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}>
                  {/* Select All Header */}
                  <div
                    onClick={toggleAll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: '#f1f5f9',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {selectedFees.length === feeDues.length
                      ? <CheckSquare size={18} style={{ color: '#2563eb' }} />
                      : <Square size={18} style={{ color: '#94a3b8' }} />
                    }
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                      {selectedFees.length === feeDues.length ? 'Deselect All' : 'Select All'} ({feeDues.length} fees)
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      Total: ₹{feeDues.reduce((s, d) => s + d.balance_due, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Individual Fee Rows */}
                  <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {feeDues.map((due, i) => {
                      const isChecked = selectedFees.includes(due.fee_structure);
                      return (
                        <div
                          key={due.fee_structure}
                          onClick={() => toggleFee(due.fee_structure)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 14px',
                            borderBottom: i < feeDues.length - 1 ? '1px solid #f1f5f9' : 'none',
                            cursor: 'pointer',
                            userSelect: 'none',
                            background: isChecked ? '#eff6ff' : '#fff',
                            transition: 'background 0.15s',
                          }}
                          onMouseOver={e => { if (!isChecked) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseOut={e => { if (!isChecked) e.currentTarget.style.background = '#fff'; }}
                        >
                          {isChecked
                            ? <CheckSquare size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
                            : <Square size={18} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                              {due.category_name}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                              {due.category_type} • Due: {due.due_date}
                              {due.amount_paid > 0 && (
                                <span style={{ color: '#16a34a', marginLeft: 6 }}>
                                  (₹{due.amount_paid.toLocaleString('en-IN')} already paid)
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: isChecked ? '#1e40af' : '#334155',
                            fontFamily: 'var(--font-mono, monospace)',
                            whiteSpace: 'nowrap',
                          }}>
                            ₹{due.balance_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Summary */}
                  {selectedFees.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#eef2ff',
                      borderTop: '1px solid #c7d2fe',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#4338ca' }}>
                        {selectedFees.length} of {feeDues.length} selected
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#1e3a8a', fontFamily: 'var(--font-mono, monospace)' }}>
                        Payable: ₹{selectedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
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

            <button className={styles.submitBtn} type="submit" disabled={saving || !form.studentObj || selectedFees.length === 0}>
              {saving ? <Loader2 size={18} className={styles.spin} /> : <CheckCircle size={18} />}
              {selectedFees.length > 1
                ? `Pay All ${selectedFees.length} Fees Together`
                : 'Confirm Collection'
              }
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
