'use client';
import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, TrendingUp, Download, Loader2, Users, AlertCircle, Printer, FileSpreadsheet, File } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import FinanceTabs from '../shared/FinanceTabs';
import styles from '../shared/FinanceLayout.module.css';

const TABS = [
  { key: 'income', label: 'Income & Expense', icon: <TrendingUp size={18} /> },
  { key: 'balance', label: 'Balance Sheet', icon: <BarChart3 size={18} /> },
  { key: 'student_fees', label: 'Student Fees', icon: <Users size={18} /> },
  { key: 'defaulters', label: 'Outstanding (Defaulters)', icon: <AlertCircle size={18} /> },
  { key: 'tax', label: 'Tax Reports', icon: <FileText size={18} /> },
];

/* ─── Export Utilities ─── */
const exportToExcel = (title, headers, rows, filename) => {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th { background-color: #1e293b; color: white; font-weight: bold; padding: 12px; border: 1px solid #cbd5e1; text-align: left; }
        td { padding: 10px; border: 1px solid #cbd5e1; }
        .title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 20px; color: #0f172a; height: 40px; vertical-align: middle; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr><th colspan="${headers.length}" class="title">${title}</th></tr>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.xls';
  a.click();
  URL.revokeObjectURL(url);
};

const exportToWord = (title, contentHtml, filename) => {
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 26px; font-weight: bold; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 8px; }
        .date { text-align: right; font-size: 12px; color: #64748b; margin-bottom: 20px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; padding: 12px 10px; border-bottom: 2px solid #94a3b8; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .row-item { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; }
        .row-label { font-weight: bold; font-size: 16px; display: inline-block; width: 60%; }
        .row-value { font-weight: bold; font-size: 16px; display: inline-block; width: 35%; text-align: right; }
        .net-value { font-size: 20px; color: #16a34a; }
        .net-value.negative { color: #dc2626; }
        .footer { margin-top: 50px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 11px; text-align: center; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${title}</div>
        <div class="subtitle">Official Financial Report - Campus Management System</div>
      </div>
      <div class="date">Generated Date: ${new Date().toLocaleDateString()}</div>
      
      ${contentHtml}
      
      <div class="footer">
        <strong>CONFIDENTIAL DOCUMENT</strong><br>
        This is a system-generated report. Unauthorized distribution is prohibited.
      </div>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.doc';
  a.click();
  URL.revokeObjectURL(url);
};

/* ─── Common Components ─── */
const ExportGroup = ({ onPrint, onWord, onExcel }) => (
  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }} className="no-print">
    <button className={styles.btnSecondary} onClick={onPrint} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
      <Printer size={16} /> Print Report
    </button>
    {onExcel && (
      <button className={styles.btnSecondary} onClick={onExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
        <FileSpreadsheet size={16} color="#16a34a" /> Excel
      </button>
    )}
    {onWord && (
      <button className={styles.btnSecondary} onClick={onWord} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
        <File size={16} color="#2563eb" /> Word
      </button>
    )}
  </div>
);

const PrintTemplate = ({ title, children }) => (
  <div className="print-only">
    <div className="print-header">
      <div className="print-title">{title}</div>
      <div className="print-subtitle">Campus Management System - Financial Report</div>
      <div className="print-meta">Date: {new Date().toLocaleDateString()}</div>
    </div>
    <div className="print-body">
      {children}
    </div>
    <div className="print-footer">
      <div className="signature-box">
        <div className="signature-line"></div>
        <div>Authorized Signatory</div>
      </div>
      <div>Auto-generated by CMS</div>
    </div>
  </div>
);

// ─── Income Statement ─────────────────────────────────────────────────────────
function IncomeStatement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('');
  const [years, setYears] = useState([]);
  const { push } = useToast();

  useEffect(() => {
    adminApi.getAcademicYears().then(r => setYears(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [filterYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filterYear ? { academic_year: filterYear } : {};
      const [payments, expenses] = await Promise.all([
        adminApi.getFeePayments({ status: 'paid', ...params }),
        adminApi.getExpenseEntries({ status: 'paid', ...params }),
      ]);
      const income = (payments.data || []).reduce((s, p) => s + Number(p.amount_paid), 0);
      const totalExpenses = (expenses.data || []).reduce((s, e) => s + Number(e.amount), 0);
      setData({ income, expenses: totalExpenses, net: income - totalExpenses });
    } catch { push('Failed to load.', 'error'); }
    finally { setLoading(false); }
  };

  const handleExcel = () => {
    exportToExcel(
      'Income & Expense Statement',
      ['Category', 'Amount (INR)'],
      [
        ['Total Fee Income', data.income.toLocaleString('en-IN', {minimumFractionDigits: 2})],
        ['Total Expenses', data.expenses.toLocaleString('en-IN', {minimumFractionDigits: 2})],
        ['Net Surplus / (Deficit)', data.net.toLocaleString('en-IN', {minimumFractionDigits: 2})]
      ],
      'Income_Statement'
    );
  };

  const handleWord = () => {
    const html = `
      <div class="row-item">
        <span class="row-label">Total Fee Income</span>
        <span class="row-value">Rs. ${data.income.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
      </div>
      <div class="row-item">
        <span class="row-label">Total Expenses</span>
        <span class="row-value">Rs. ${data.expenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
      </div>
      <div class="row-item" style="margin-top: 30px; border-top: 2px solid #1e293b; padding-top: 20px;">
        <span class="row-label" style="font-size: 20px;">Net Surplus / (Deficit)</span>
        <span class="row-value net-value ${data.net < 0 ? 'negative' : ''}">
          Rs. ${data.net.toLocaleString('en-IN', {minimumFractionDigits: 2})}
        </span>
      </div>
    `;
    exportToWord(`Income & Expense Statement ${filterYear ? `(${years.find(y=>y.id==filterYear)?.name})` : ''}`, html, 'Income_Statement');
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading...</div>;

  const reportTitle = `Income & Expense Statement ${filterYear ? `(${years.find(y => y.id == filterYear)?.name})` : ''}`;

  return (
    <div className={styles.splitLayout}>
      <section className={`${styles.leftColumn} no-print`}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
             <div>
                <h3 className={styles.cardTitle}>Filter Statement</h3>
                <p className={styles.cardSubtitle}>Select period for analysis</p>
             </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Academic Year</label>
            <select className={`${styles.input} ${styles.select}`} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.rightColumn}>
        {data && (
          <>
            <ExportGroup onPrint={() => window.print()} onWord={handleWord} onExcel={handleExcel} />
            
            {/* Screen UI */}
            <div className={`${styles.card} no-print`} style={{ padding: 0 }}>
               <div className={styles.cardHeader} style={{ padding: 24 }}>
                  <h3 className={styles.cardTitle}>{reportTitle}</h3>
               </div>
               <div style={{ padding: 24, paddingTop: 0 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                   <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Total Fee Income</span>
                   <span className={styles.fontMono} style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>₹{data.income.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                   <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Total Expenses</span>
                   <span className={styles.fontMono} style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>₹{data.expenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0 8px 0' }}>
                   <span style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Net Surplus / (Deficit)</span>
                   <span className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: data.net >= 0 ? '#16a34a' : '#dc2626' }}>₹{data.net.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                 </div>
               </div>
            </div>

            {/* Print UI */}
            <PrintTemplate title={reportTitle}>
              <div className="print-table-wrapper">
                <table className="print-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', fontSize: '18px', padding: '15px' }}>Total Fee Income</td>
                      <td style={{ fontWeight: 'bold', fontSize: '18px', padding: '15px', textAlign: 'right', color: '#16a34a' }}>₹{data.income.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', fontSize: '18px', padding: '15px' }}>Total Expenses</td>
                      <td style={{ fontWeight: 'bold', fontSize: '18px', padding: '15px', textAlign: 'right', color: '#dc2626' }}>₹{data.expenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr style={{ borderTop: '3px solid #1e293b', background: '#f8fafc' }}>
                      <td style={{ fontWeight: 'bold', fontSize: '22px', padding: '20px' }}>Net Surplus / (Deficit)</td>
                      <td style={{ fontWeight: 'bold', fontSize: '24px', padding: '20px', textAlign: 'right', color: data.net >= 0 ? '#16a34a' : '#dc2626' }}>₹{data.net.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PrintTemplate>
          </>
        )}
      </section>
    </div>
  );
}

// ─── Balance Sheet ─────────────────────────────────────────────────────────────
function BalanceSheet() {
  const [donations, setDonations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    Promise.all([adminApi.getDonations(), adminApi.getFeePayments({ status: 'paid' }), adminApi.getExpenseEntries({ status: 'paid' })])
      .then(([d, p, e]) => { setDonations(d.data || []); setPayments(p.data || []); setExpenses(e.data || []); })
      .catch(() => push('Failed.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading...</div>;

  const feeIncome = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const donationIncome = donations.reduce((s, d) => s + Number(d.amount), 0);
  const totalIncome = feeIncome + donationIncome;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const net = totalIncome - totalExpenses;

  const handleExcel = () => {
    exportToExcel(
      'Balance Sheet',
      ['Category', 'Amount (INR)'],
      [
        ['Fee Collections', feeIncome],
        ['Donations Received', donationIncome],
        ['Total Assets', totalIncome],
        ['Total Expenses', totalExpenses],
        ['Net Position', net]
      ],
      'Balance_Sheet'
    );
  };

  const handleWord = () => {
    const html = `
      <div class="row-item"><span class="row-label">Fee Collections</span><span class="row-value">Rs. ${feeIncome.toLocaleString()}</span></div>
      <div class="row-item"><span class="row-label">Donations Received</span><span class="row-value">Rs. ${donationIncome.toLocaleString()}</span></div>
      <div class="row-item" style="background:#f8fafc; padding:15px; margin-top:20px;">
        <span class="row-label" style="font-size:18px;">Total Assets</span>
        <span class="row-value" style="font-size:18px; color:#16a34a;">Rs. ${totalIncome.toLocaleString()}</span>
      </div>
      
      <div class="row-item" style="margin-top:30px;"><span class="row-label">Total Expenses</span><span class="row-value" style="color:#dc2626;">Rs. ${totalExpenses.toLocaleString()}</span></div>
      <div class="row-item" style="background:#f8fafc; padding:15px; margin-top:20px; border-top:3px solid #1e293b;">
        <span class="row-label" style="font-size:22px;">Net Position</span>
        <span class="row-value" style="font-size:22px; color:${net >= 0 ? '#16a34a' : '#dc2626'};">Rs. ${net.toLocaleString()}</span>
      </div>
    `;
    exportToWord('Balance Sheet', html, 'Balance_Sheet');
  };

  return (
    <div>
      <ExportGroup onPrint={() => window.print()} onWord={handleWord} onExcel={handleExcel} />
      
      {/* Screen UI */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className={styles.card} style={{ padding: 0 }}>
          <div className={styles.cardHeader} style={{ padding: 24 }}>
             <h3 className={styles.cardTitle}>Assets</h3>
          </div>
          <div style={{ padding: 24, paddingTop: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Fee Collections</span>
              <span className={styles.fontMono} style={{ color: '#16a34a', fontWeight: 800 }}>₹{feeIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Donations Received</span>
              <span className={styles.fontMono} style={{ color: '#16a34a', fontWeight: 800 }}>₹{donationIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0 8px 0' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Total Assets</span>
              <span className={styles.fontMono} style={{ fontSize: 18, color: '#16a34a', fontWeight: 900 }}>₹{totalIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ padding: 0 }}>
          <div className={styles.cardHeader} style={{ padding: 24 }}>
             <h3 className={styles.cardTitle}>Liabilities / Expenses</h3>
          </div>
          <div style={{ padding: 24, paddingTop: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Total Expenses</span>
              <span className={styles.fontMono} style={{ color: '#dc2626', fontWeight: 800 }}>₹{totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0 8px 0', marginTop: 'auto' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Net Position</span>
              <span className={styles.fontMono} style={{ fontSize: 22, color: net >= 0 ? '#16a34a' : '#dc2626', fontWeight: 900 }}>₹{net.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Print UI */}
      <PrintTemplate title="Balance Sheet">
        <div className="print-table-wrapper" style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#0f172a' }}>Assets</h3>
          <table className="print-table">
            <tbody>
              <tr><td style={{ padding: '12px', fontWeight: 'bold' }}>Fee Collections</td><td style={{ padding: '12px', textAlign: 'right' }}>₹{feeIncome.toLocaleString()}</td></tr>
              <tr><td style={{ padding: '12px', fontWeight: 'bold' }}>Donations Received</td><td style={{ padding: '12px', textAlign: 'right' }}>₹{donationIncome.toLocaleString()}</td></tr>
              <tr style={{ background: '#f8fafc' }}><td style={{ padding: '15px', fontWeight: 'bold', fontSize: '18px' }}>Total Assets</td><td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px', color: '#16a34a' }}>₹{totalIncome.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="print-table-wrapper">
          <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#0f172a' }}>Liabilities & Equity</h3>
          <table className="print-table">
            <tbody>
              <tr><td style={{ padding: '12px', fontWeight: 'bold' }}>Total Expenses</td><td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>₹{totalExpenses.toLocaleString()}</td></tr>
              <tr style={{ background: '#f8fafc', borderTop: '3px solid #1e293b' }}><td style={{ padding: '15px', fontWeight: 'bold', fontSize: '20px' }}>Net Position</td><td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', fontSize: '22px', color: net >= 0 ? '#16a34a' : '#dc2626' }}>₹{net.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </PrintTemplate>
    </div>
  );
}

// ─── Student Fees Report ────────────────────────────────────────────────────────
function StudentFeesReport() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const { push } = useToast();

  useEffect(() => {
    adminApi.getClasses().then(r => setClasses(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = filterClass ? { class: filterClass } : {};
    adminApi.getFeePayments(params)
      .then(res => setPayments(res.data || []))
      .catch(() => push('Failed to load student fees.', 'error'))
      .finally(() => setLoading(false));
  }, [filterClass]);

  const reportTitle = `Student Fee Collections ${filterClass ? `(${classes.find(c=>c.id==filterClass)?.name})` : '(All Classes)'}`;

  const handleExcel = () => {
    const headers = ['Receipt No', 'Student', 'Class', 'Fee Head', 'Amount Paid', 'Status', 'Date'];
    const rows = payments.map(p => [
      p.receipt_number || '-', p.student_name, p.class_name || p.fee_structure_name,
      p.fee_structure_name, p.amount_paid, p.status.toUpperCase(), p.payment_date
    ]);
    exportToExcel(reportTitle, headers, rows, 'Student_Fee_Report');
  };

  const handleWord = () => {
    const rowsHtml = payments.map(p => `
      <tr>
        <td>${p.receipt_number || '-'}</td>
        <td><strong>${p.student_name}</strong></td>
        <td>${p.class_name || p.fee_structure_name}</td>
        <td>${p.fee_structure_name}</td>
        <td style="font-weight:bold;">Rs. ${p.amount_paid}</td>
        <td>${p.payment_date}</td>
      </tr>
    `).join('');
    const html = `
      <table>
        <thead>
          <tr><th>Receipt No</th><th>Student</th><th>Class</th><th>Fee Head</th><th>Amount</th><th>Date</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
    exportToWord(reportTitle, html, 'Student_Fee_Report');
  };

  return (
    <div className={styles.splitLayout}>
      <section className={`${styles.leftColumn} no-print`}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
             <div><h3 className={styles.cardTitle}>Filters</h3></div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Class</label>
            <select className={`${styles.input} ${styles.select}`} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </section>
      
      <section className={styles.rightColumn}>
        <ExportGroup onPrint={() => window.print()} onWord={handleWord} onExcel={handleExcel} />
        
        {/* Screen UI */}
        <div className={`${styles.card} no-print`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{reportTitle}</h3>
          </div>
          {loading ? <div className={styles.loading}><Loader2 size={18} className={styles.spin} /></div> : (
            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: 10 }}>Receipt No</th>
                    <th style={{ padding: 10 }}>Student</th>
                    <th style={{ padding: 10 }}>Class</th>
                    <th style={{ padding: 10 }}>Fee Head</th>
                    <th style={{ padding: 10 }}>Amount</th>
                    <th style={{ padding: 10 }}>Status</th>
                    <th style={{ padding: 10 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No fee records found.</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{p.receipt_number || '-'}</td>
                      <td style={{ padding: 10 }}>{p.student_name}</td>
                      <td style={{ padding: 10 }}>{p.class_name || p.fee_structure_name}</td>
                      <td style={{ padding: 10 }}>{p.fee_structure_name}</td>
                      <td style={{ padding: 10, fontWeight: 700 }}>₹{p.amount_paid}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: p.status === 'paid' ? '#dcfce7' : '#fee2e2',
                          color: p.status === 'paid' ? '#166534' : '#991b1b'
                        }}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: 10, color: '#64748b' }}>{p.payment_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Print UI */}
        <PrintTemplate title={reportTitle}>
          <table className="print-table">
            <thead>
              <tr>
                <th>Receipt No</th><th>Student</th><th>Class</th><th>Fee Head</th><th>Amount</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{p.receipt_number || '-'}</td>
                  <td style={{ fontWeight: 'bold' }}>{p.student_name}</td>
                  <td>{p.class_name || p.fee_structure_name}</td>
                  <td>{p.fee_structure_name}</td>
                  <td style={{ fontWeight: 'bold' }}>₹{p.amount_paid}</td>
                  <td>{p.payment_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintTemplate>
      </section>
    </div>
  );
}

// ─── Outstanding (Defaulters) Report ──────────────────────────────────────────
function OutstandingReport() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const { push } = useToast();

  useEffect(() => {
    adminApi.getClasses().then(r => setClasses(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = filterClass ? { class: filterClass } : {};
    adminApi.getFeeDefaulters(params)
      .then(res => setDefaulters(res.data || []))
      .catch(() => push('Failed to load outstanding fees.', 'error'))
      .finally(() => setLoading(false));
  }, [filterClass]);

  const totalOutstanding = defaulters.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0);
  const reportTitle = `Outstanding Fee Report ${filterClass ? `(${classes.find(c=>c.id==filterClass)?.name})` : ''}`;

  const handleExcel = () => {
    const headers = ['Student Name', 'Class', 'Fee Head', 'Due Amount', 'Status'];
    const rows = defaulters.map(d => [
      d.student_name, d.class_name || d.fee_structure_name, d.fee_structure_name,
      d.amount_paid, d.status.toUpperCase()
    ]);
    exportToExcel(reportTitle, headers, rows, 'Outstanding_Defaulters_Report');
  };

  const handleWord = () => {
    const rowsHtml = defaulters.map(d => `
      <tr>
        <td><strong>${d.student_name}</strong></td>
        <td>${d.class_name || d.fee_structure_name}</td>
        <td>${d.fee_structure_name}</td>
        <td style="color:#dc2626; font-weight:bold;">Rs. ${d.amount_paid}</td>
      </tr>
    `).join('');
    const html = `
      <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:15px; margin-bottom:20px;">
        <h3 style="margin:0; color:#991b1b;">Total Outstanding: Rs. ${totalOutstanding.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
      </div>
      <table>
        <thead>
          <tr><th>Student Name</th><th>Class</th><th>Fee Head</th><th>Due Amount</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
    exportToWord(reportTitle, html, 'Outstanding_Defaulters_Report');
  };

  return (
    <div className={styles.splitLayout}>
      <section className={`${styles.leftColumn} no-print`}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
             <div><h3 className={styles.cardTitle}>Filters</h3></div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Class</label>
            <select className={`${styles.input} ${styles.select}`} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </section>
      
      <section className={styles.rightColumn}>
        <ExportGroup onPrint={() => window.print()} onWord={handleWord} onExcel={handleExcel} />
        
        {/* Screen UI */}
        <div className={`${styles.card} no-print`}>
          <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className={styles.cardTitle}>{reportTitle}</h3>
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, fontWeight: 700 }}>
              Total: ₹{totalOutstanding.toLocaleString('en-IN', {minimumFractionDigits: 2})}
            </div>
          </div>
          {loading ? <div className={styles.loading}><Loader2 size={18} className={styles.spin} /></div> : (
            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: 10 }}>Student</th>
                    <th style={{ padding: 10 }}>Class</th>
                    <th style={{ padding: 10 }}>Fee Head</th>
                    <th style={{ padding: 10 }}>Due Amount</th>
                    <th style={{ padding: 10 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No outstanding dues found.</td></tr>
                  ) : defaulters.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{d.student_name}</td>
                      <td style={{ padding: 10 }}>{d.class_name || d.fee_structure_name}</td>
                      <td style={{ padding: 10 }}>{d.fee_structure_name}</td>
                      <td style={{ padding: 10, fontWeight: 700, color: '#dc2626' }}>₹{d.amount_paid}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Print UI */}
        <PrintTemplate title={reportTitle}>
          <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '15px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#991b1b', fontSize: '18px' }}>Total Outstanding: ₹{totalOutstanding.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h3>
          </div>
          <table className="print-table">
            <thead>
              <tr><th>Student Name</th><th>Class</th><th>Fee Head</th><th>Due Amount</th></tr>
            </thead>
            <tbody>
              {defaulters.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 'bold' }}>{d.student_name}</td>
                  <td>{d.class_name || d.fee_structure_name}</td>
                  <td>{d.fee_structure_name}</td>
                  <td style={{ color: '#dc2626', fontWeight: 'bold' }}>₹{d.amount_paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintTemplate>
      </section>
    </div>
  );
}

// ─── Tax Reports (Placeholder) ─────────────────────────────────────────────────
function TaxReports() {
  return (
    <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
      <FileText size={48} color="var(--finance-text-muted)" style={{ marginBottom: 16 }} />
      <h3 className={styles.cardTitle} style={{ fontSize: 20 }}>Tax Reports</h3>
      <p className={styles.cardSubtitle} style={{ marginTop: 8, maxWidth: 400, lineHeight: 1.5 }}>Generate Form-16, TDS reports, and professional tax filings.<br />Connect to your payroll data to generate compliant tax reports.</p>
      <button className={styles.btnSecondary} onClick={() => window.print()} style={{ marginTop: 24 }}>
        <Download size={15} /> Export Payroll Data
      </button>
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState('income');
  const VIEWS = { 
    income: <IncomeStatement />, 
    balance: <BalanceSheet />, 
    student_fees: <StudentFeesReport />,
    defaulters: <OutstandingReport />,
    tax: <TaxReports /> 
  };

  return (
    <div className={`${styles.financeModule} report-page-container`}>
      {/* GLOBAL PRINT STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        .print-only { display: none; }
        @media print {
          /* Hide EVERYTHING by default */
          body * {
            visibility: hidden;
          }
          /* Show ONLY our print template */
          .print-only, .print-only * {
            visibility: visible;
          }
          /* Position it perfectly at the top left of the page */
          .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block;
            background: white;
            padding: 20px 40px;
            box-sizing: border-box;
          }
          
          /* Print Typography & Layout */
          .print-header {
            text-align: center;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .print-title {
            font-size: 28px;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
          }
          .print-subtitle {
            font-size: 14px;
            color: #64748b;
            margin-top: 8px;
          }
          .print-meta {
            text-align: right;
            font-size: 12px;
            color: #64748b;
            margin-bottom: 20px;
            font-weight: bold;
          }
          
          /* Clean Print Tables */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1;
            padding: 12px;
            text-align: left;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            color: #0f172a;
            font-weight: bold;
            border-bottom: 2px solid #94a3b8;
          }
          
          /* Footer */
          .print-footer {
            margin-top: 60px;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 12px;
            color: #64748b;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            width: 200px;
            border-bottom: 1px solid #000;
            margin-bottom: 5px;
          }
        }
      `}} />

      <div className={`${styles.pageHeader} no-print`}>
        <h1 className={styles.pageTitle}>Financial Reports</h1>
        <p className={styles.pageSubtitle}>Comprehensive financial statements, fee reports, and defaulter tracking</p>
      </div>
      
      <div className="no-print">
        <FinanceTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />
      </div>
      
      <div>
        {VIEWS[tab]}
      </div>
    </div>
  );
}
