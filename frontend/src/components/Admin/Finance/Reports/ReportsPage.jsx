'use client';
import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, TrendingUp, Download, Loader2 } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import FinanceTabs from '../shared/FinanceTabs';
import styles from '../shared/FinanceLayout.module.css';

const TABS = [
  { key: 'income', label: 'Income Statement', icon: <TrendingUp size={18} /> },
  { key: 'balance', label: 'Balance Sheet', icon: <BarChart3 size={18} /> },
  { key: 'tax', label: 'Tax Reports', icon: <FileText size={18} /> },
];

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

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading...</div>;

  return (
    <div className={styles.splitLayout}>
      <section className={styles.leftColumn}>
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
          <div className={styles.card} style={{ padding: 0 }}>
             <div className={styles.cardHeader} style={{ padding: 24 }}>
                <h3 className={styles.cardTitle}>Income Statement</h3>
             </div>
             
             <div style={{ padding: 24, paddingTop: 0 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                 <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--finance-text)' }}>Total Fee Income</span>
                 <span className={styles.fontMono} style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>₹{data.income.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                 <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--finance-text)' }}>Total Expenses</span>
                 <span className={styles.fontMono} style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>₹{data.expenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0 8px 0' }}>
                 <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--finance-text)' }}>Net Surplus / (Deficit)</span>
                 <span className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: data.net >= 0 ? '#16a34a' : '#dc2626' }}>₹{data.net.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
               </div>
             </div>
          </div>
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div className={styles.card} style={{ padding: 0 }}>
        <div className={styles.cardHeader} style={{ padding: 24 }}>
           <h3 className={styles.cardTitle}>Assets / Net Income</h3>
        </div>
        <div style={{ padding: 24, paddingTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--finance-text)' }}>Fee Collections</span>
            <span className={styles.fontMono} style={{ color: '#16a34a', fontWeight: 800 }}>₹{feeIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--finance-text)' }}>Donations Received</span>
            <span className={styles.fontMono} style={{ color: '#16a34a', fontWeight: 800 }}>₹{donationIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0 8px 0' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--finance-text)' }}>Total Assets</span>
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
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--finance-text)' }}>Total Expenses</span>
            <span className={styles.fontMono} style={{ color: '#dc2626', fontWeight: 800 }}>₹{totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0 8px 0' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--finance-text)' }}>Net Position</span>
            <span className={styles.fontMono} style={{ fontSize: 22, color: net >= 0 ? '#16a34a' : '#dc2626', fontWeight: 900 }}>₹{net.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>
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
  const VIEWS = { income: <IncomeStatement />, balance: <BalanceSheet />, tax: <TaxReports /> };

  return (
    <div className={styles.financeModule}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Financial Reports</h1>
        <p className={styles.pageSubtitle}>Income statements, balance sheets, and tax compliance summary</p>
      </div>
      
      <FinanceTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />
      
      <div>
        {VIEWS[tab]}
      </div>
    </div>
  );
}
