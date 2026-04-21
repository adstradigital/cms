'use client';
import React, { useState, useEffect } from 'react';
import { Search, Printer, Download, Loader2, Receipt } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';

export default function FeeReceipts() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [printData, setPrintData] = useState(null);
  const { push } = useToast();

  useEffect(() => {
    adminApi.getFeePayments({ status: 'paid' })
      .then(r => setPayments(r.data || []))
      .catch(() => push('Failed to load receipts.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return (p.student_name || '').toLowerCase().includes(q) ||
      (p.receipt_number || '').toLowerCase().includes(q) ||
      (p.admission_number || '').toLowerCase().includes(q);
  });

  const handlePrint = (payment) => {
    setPrintData(payment);
    setTimeout(() => window.print(), 300);
  };

  return (
    <div>
      <div className={styles.card} style={{ padding: 0 }}>
        <div className={styles.cardHeader} style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div className={styles.inputWrapper} style={{ flex: 1, minWidth: 200 }}>
            <Search className={styles.inputIcon} size={16} />
            <input className={`${styles.input} ${styles.inputWithIcon}`} placeholder="Search by student, receipt no, admission no..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className={styles.btnSecondary}><Download size={14} /> Export All</button>
        </div>

        {loading ? (
          <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading receipts...</div>
        ) : (
          <div className={styles.tableResponsive} style={{ margin: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Student</th>
                  <th>Fee Head</th>
                  <th className={styles.textRight}>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Collected By</th>
                  <th className={styles.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className={styles.emptyState}>No receipts found.</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td className={styles.fontMono} style={{ color: 'var(--finance-text-muted)', fontWeight: 700 }}>{p.receipt_number}</td>
                    <td>
                      <div className={styles.textBold}>{p.student_name}</div>
                      <div className={styles.textSub}>{p.admission_number}</div>
                    </td>
                    <td>{p.category_name}</td>
                    <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: '#16a34a', fontWeight: 800 }}>₹{Number(p.amount_paid).toLocaleString('en-IN')}</td>
                    <td><span className={styles.badge} style={{ background: '#f1f5f9', color: '#475569' }}>{p.payment_method?.toUpperCase()}</span></td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{p.payment_date}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{p.collected_by_name || '—'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.btnSecondary} style={{ color: '#091426' }} onClick={() => handlePrint(p)}>
                          <Printer size={14} /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Internal style for Payslip Print Modal */}
      <style dangerouslySetInnerHTML={{__html: `
        .receiptModal { background: #fff; width: 100%; max-width: 600px; display: flex; flex-direction: column; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); padding: 32px; }
        .rHeader { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
        .rSchool { font-size: 20px; font-weight: 900; color: #091426; text-transform: uppercase; letter-spacing: 0.5px; }
        .rTitle { font-size: 14px; font-weight: 700; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px; }
        .rNo { font-family: monospace; font-size: 16px; font-weight: 800; margin-top: 12px; color: #091426; background: #f1f5f9; padding: 4px 12px; display: inline-block; border-radius: 4px; }
        .rRow { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .rRow span:first-child { color: #64748b; font-weight: 600; }
        .rRow span:last-child { color: #091426; font-weight: 700; text-align: right; }
        .rFooter { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        @media print { .receiptModal { position: static; box-shadow: none; border: none; padding: 0; } @page { margin: 2cm; } }
      `}} />

      {/* Printable Receipt Overlay */}
      {printData && (
        <div className={styles.overlay} id="print-area">
          <div className="receiptModal">
            <div className="rHeader">
              <div className="rSchool">Campus Management System</div>
              <div className="rTitle">Fee Payment Receipt</div>
              <div className="rNo">{printData.receipt_number}</div>
            </div>
            <div>
              <div className="rRow"><span>Student Name</span><span>{printData.student_name}</span></div>
              <div className="rRow"><span>Admission No.</span><span>{printData.admission_number}</span></div>
              <div className="rRow"><span>Fee Head</span><span>{printData.category_name}</span></div>
              <div className="rRow"><span>Amount Paid</span><span style={{ fontSize: 18, color: '#16a34a' }}>₹{Number(printData.amount_paid).toLocaleString('en-IN')}</span></div>
              <div className="rRow"><span>Payment Method</span><span>{printData.payment_method?.toUpperCase()}</span></div>
              {printData.transaction_id && <div className="rRow"><span>Transaction ID</span><span>{printData.transaction_id}</span></div>}
              <div className="rRow"><span>Date of Payment</span><span>{printData.payment_date}</span></div>
              <div className="rRow"><span>Collected By</span><span>{printData.collected_by_name || 'System'}</span></div>
            </div>
            <div className="rFooter">Thank you. This is a computer-generated receipt.</div>
          </div>
        </div>
      )}
    </div>
  );
}
