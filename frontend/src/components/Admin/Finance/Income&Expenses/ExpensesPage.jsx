'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, X, Loader2, CheckCircle, XCircle, Clock,
  LayoutGrid, FileText, CheckSquare, BarChart2, ArrowUpRight, ArrowDownRight,
  Wallet, TrendingUp, TrendingDown, Download, Filter, RefreshCw, Scale,
  Receipt, Building2, Users, ChevronLeft, ChevronRight, AlertCircle,
  BookOpen, DollarSign, Activity, Calendar, CreditCard,
} from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from './ExpensesPage.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CY = new Date().getFullYear();
const YEAR_OPTS = Array.from({ length: 6 }, (_, i) => CY - i);

const SOURCE_META = {
  fees:    { label: 'Fee Collection', color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
  payroll: { label: 'Payroll',        color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  manual:  { label: 'Manual Entry',   color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
};

const STATUS_META = {
  pending:  { label: 'Pending',  color: '#92400e', bg: '#fef3c7' },
  approved: { label: 'Approved', color: '#065f46', bg: '#d1fae5' },
  rejected: { label: 'Rejected', color: '#991b1b', bg: '#fee2e2' },
  paid:     { label: 'Paid',     color: '#1e40af', bg: '#dbeafe' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (n) => {
  const v = Number(n || 0);
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`;
  if (v >= 100_000)   return `₹${(v / 100_000).toFixed(2)}L`;
  if (v >= 1_000)     return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${fmt(v)}`;
};

const exportCSV = (rows, filename) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Spinner({ text = 'Loading…' }) {
  return (
    <div className={styles.loading}>
      <Loader2 size={20} className={styles.spin} />
      <span>{text}</span>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className={styles.emptyState}>
      <AlertCircle size={28} opacity={0.35} />
      <span>{text}</span>
    </div>
  );
}

function SourceBadge({ source }) {
  const m = SOURCE_META[source] || SOURCE_META.manual;
  return (
    <span className={styles.sourceBadge} style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={styles.statusBadge} style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

function TypeBadge({ type }) {
  return type === 'income'
    ? <span className={styles.typeIncome}>INCOME</span>
    : <span className={styles.typeExpense}>EXPENSE</span>;
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, academicYears }) {
  const isDirty = filters.year !== String(CY) || filters.month !== '' || filters.academicYear !== '';
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <Calendar size={15} className={styles.filterIcon} />
        <select
          className={styles.filterSelect}
          value={filters.year}
          onChange={e => onChange({ ...filters, year: e.target.value })}
        >
          <option value="">All Years</option>
          {YEAR_OPTS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <select
          className={styles.filterSelect}
          value={filters.month}
          onChange={e => onChange({ ...filters, month: e.target.value })}
        >
          <option value="">All Months</option>
          {MONTHS.slice(1).map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {academicYears.length > 0 && (
        <div className={styles.filterGroup}>
          <BookOpen size={15} className={styles.filterIcon} />
          <select
            className={styles.filterSelect}
            value={filters.academicYear}
            onChange={e => onChange({ ...filters, academicYear: e.target.value })}
          >
            <option value="">All Academic Years</option>
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
      )}

      {isDirty && (
        <button
          className={styles.resetBtn}
          onClick={() => onChange({ year: String(CY), month: '', academicYear: '' })}
        >
          <RefreshCw size={13} /> Reset
        </button>
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, sub, isCount }) {
  const colorMap = {
    income:  { val: '#059669', bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.15)' },
    expense: { val: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.15)' },
    surplus: { val: '#2563eb', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.15)' },
    deficit: { val: '#ea580c', bg: 'rgba(234,88,12,0.1)', border: 'rgba(234,88,12,0.15)' },
    pending: { val: '#92400e', bg: 'rgba(146,64,14,0.1)', border: 'rgba(146,64,14,0.15)' },
  };
  const c = colorMap[color] || colorMap.surplus;
  return (
    <div className={styles.kpiCard} style={{ borderColor: c.border }}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <div className={styles.kpiIcon} style={{ background: c.bg, color: c.val }}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      <div className={styles.kpiValue} style={{ color: c.val }}>
        {isCount ? value : `₹${fmt(value)}`}
      </div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

function OverviewTab({ filters }) {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        year: filters.year || undefined,
        month: filters.month || undefined,
        academic_year: filters.academicYear || undefined,
      };
      const [bs, tx] = await Promise.all([
        adminApi.getExpenseBalanceSheet(params),
        adminApi.getTransactionHistory(params),
      ]);
      setData(bs.data);
      setRecent((tx.data.results || []).slice(0, 10));
    } catch {
      push('Failed to load overview data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner text="Loading overview…" />;
  if (!data) return null;

  const periodLabel = [
    filters.month ? MONTHS[Number(filters.month)] : null,
    filters.year || null,
  ].filter(Boolean).join(' ') || 'All Time';

  return (
    <div className={styles.tabContent}>
      <div className={styles.periodBadge}><Calendar size={13} /> Period: {periodLabel}</div>

      <div className={styles.kpiGrid}>
        <KpiCard label="Total Income"    value={data.total_income}  icon={TrendingUp}   color="income"
          sub={`Fees ₹${fmt(data.fees_income)} + Manual ₹${fmt(data.manual_income)}`} />
        <KpiCard label="Total Expenses"  value={data.total_expense} icon={TrendingDown}  color="expense"
          sub={`Payroll ₹${fmt(data.payroll_expense)} + Manual ₹${fmt(data.manual_expense)}`} />
        <KpiCard label="Net Balance"     value={Math.abs(data.balance)} icon={Scale}
          color={data.balance >= 0 ? 'surplus' : 'deficit'}
          sub={data.balance >= 0 ? '▲ Surplus' : '▼ Deficit'} />
        <KpiCard label="Pending Approvals" value={data.pending_count || 0} icon={Clock}
          color="pending" isCount sub="Manual entries awaiting review" />
      </div>

      <div className={styles.overviewGrid}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}><TrendingUp size={16} /> Income Sources</h3>
          </div>
          <div className={styles.sourceList}>
            <div className={styles.sourceRow}>
              <span className={styles.sourceDot} style={{ background: '#0891b2' }} />
              <span className={styles.sourceLabel}>Fee Collections</span>
              <span className={styles.sourceAmt} style={{ color: '#059669' }}>₹{fmt(data.fees_income)}</span>
            </div>
            <div className={styles.sourceRow}>
              <span className={styles.sourceDot} style={{ background: '#d97706' }} />
              <span className={styles.sourceLabel}>Manual Income Entries</span>
              <span className={styles.sourceAmt} style={{ color: '#059669' }}>₹{fmt(data.manual_income)}</span>
            </div>
            <div className={styles.sourceTotalRow}>
              <span>Total Income</span>
              <span style={{ color: '#059669', fontFamily: 'monospace' }}>₹{fmt(data.total_income)}</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}><TrendingDown size={16} /> Expenditure Sources</h3>
          </div>
          <div className={styles.sourceList}>
            <div className={styles.sourceRow}>
              <span className={styles.sourceDot} style={{ background: '#7c3aed' }} />
              <span className={styles.sourceLabel}>Staff Payroll</span>
              <span className={styles.sourceAmt} style={{ color: '#dc2626' }}>₹{fmt(data.payroll_expense)}</span>
            </div>
            <div className={styles.sourceRow}>
              <span className={styles.sourceDot} style={{ background: '#d97706' }} />
              <span className={styles.sourceLabel}>Manual Expense Entries</span>
              <span className={styles.sourceAmt} style={{ color: '#dc2626' }}>₹{fmt(data.manual_expense)}</span>
            </div>
            <div className={styles.sourceTotalRow}>
              <span>Total Expenses</span>
              <span style={{ color: '#dc2626', fontFamily: 'monospace' }}>₹{fmt(data.total_expense)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: 24 }}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}><Activity size={16} /> Recent Transactions</h3>
          <span className={styles.cardSub}>Latest 10 entries across all sources</span>
        </div>
        {recent.length === 0 ? (
          <Empty text="No transactions found for this period." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th className={styles.tRight}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(tx => (
                  <tr key={tx.id}>
                    <td className={styles.monoCell}>{tx.date}</td>
                    <td>
                      <div className={styles.txTitle}>{tx.title}</div>
                      {tx.description && <div className={styles.txDesc}>{tx.description}</div>}
                    </td>
                    <td>{tx.category}</td>
                    <td><SourceBadge source={tx.source} /></td>
                    <td><TypeBadge type={tx.type} /></td>
                    <td className={`${styles.tRight} ${styles.monoCell}`}
                      style={{ color: tx.type === 'income' ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      {tx.type === 'income' ? '+' : '-'}₹{fmt(tx.amount)}
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

// ─── Balance Sheet Tab ────────────────────────────────────────────────────────

function BalanceSheetTab({ filters }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        year: filters.year || undefined,
        month: filters.month || undefined,
        academic_year: filters.academicYear || undefined,
      };
      const r = await adminApi.getExpenseBalanceSheet(params);
      setData(r.data);
    } catch {
      push('Failed to load balance sheet.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ...( data.income_lines || []).map(l => ({ Type: 'INCOME',  Particulars: l.label, Amount: l.amount, Source: l.source })),
      ...(data.expense_lines || []).map(l => ({ Type: 'EXPENSE', Particulars: l.label, Amount: l.amount, Source: l.source })),
      { Type: 'TOTAL', Particulars: 'Total Income',  Amount: data.total_income,  Source: '' },
      { Type: 'TOTAL', Particulars: 'Total Expense', Amount: data.total_expense, Source: '' },
      { Type: 'NET',   Particulars: data.balance >= 0 ? 'Net Surplus' : 'Net Deficit', Amount: Math.abs(data.balance), Source: '' },
    ];
    const period = [filters.month ? MONTHS[filters.month] : '', filters.year].filter(Boolean).join('_') || 'AllTime';
    exportCSV(rows, `BalanceSheet_${period}.csv`);
  };

  if (loading) return <Spinner text="Calculating balance sheet…" />;
  if (!data) return null;

  const incomeLines  = data.income_lines  || [];
  const expenseLines = data.expense_lines || [];

  return (
    <div className={styles.tabContent}>
      <div className={styles.bsHeader}>
        <h2 className={styles.bsTitle}>Income & Expenditure Statement</h2>
        <button className={styles.exportBtn} onClick={handleExport}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className={styles.bsSummaryGrid}>
        <div className={`${styles.bsCard} ${styles.bsCardIncome}`}>
          <div className={styles.bsCardIcon}><TrendingUp size={22} /></div>
          <div>
            <div className={styles.bsCardLabel}>Total Income</div>
            <div className={styles.bsCardValue} style={{ color: '#059669' }}>₹{fmt(data.total_income)}</div>
            <div className={styles.bsCardBreak}>
              <span>Fees ₹{fmt(data.fees_income)}</span>
              <span>Manual ₹{fmt(data.manual_income)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.bsCard} ${styles.bsCardExpense}`}>
          <div className={styles.bsCardIcon}><TrendingDown size={22} /></div>
          <div>
            <div className={styles.bsCardLabel}>Total Expenses</div>
            <div className={styles.bsCardValue} style={{ color: '#dc2626' }}>₹{fmt(data.total_expense)}</div>
            <div className={styles.bsCardBreak}>
              <span>Payroll ₹{fmt(data.payroll_expense)}</span>
              <span>Manual ₹{fmt(data.manual_expense)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.bsCard} ${data.balance >= 0 ? styles.bsCardSurplus : styles.bsCardDeficit}`}>
          <div className={styles.bsCardIcon}><Scale size={22} /></div>
          <div>
            <div className={styles.bsCardLabel}>Net Balance</div>
            <div className={styles.bsCardValue}
              style={{ color: data.balance >= 0 ? '#1d4ed8' : '#dc2626' }}>
              {data.balance >= 0 ? '+' : '-'}₹{fmt(Math.abs(data.balance))}
            </div>
            <div className={styles.bsCardBreak}>
              <span className={styles.bsBalanceTag}
                style={{
                  color:      data.balance >= 0 ? '#065f46' : '#991b1b',
                  background: data.balance >= 0 ? '#d1fae5'  : '#fee2e2',
                }}>
                {data.balance >= 0 ? '▲ Surplus' : '▼ Deficit'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* T-Account Ledger */}
      <div className={styles.tAccount}>
        <div className={styles.tAccountIncome}>
          <div className={styles.tAccountHead}>
            <TrendingUp size={16} style={{ color: '#059669' }} /> Income
          </div>
          <div className={styles.tAccountBody}>
            {incomeLines.length === 0 ? (
              <div className={styles.tEmpty}>No income recorded.</div>
            ) : (
              incomeLines.map((line, i) => (
                <div key={i} className={styles.tRow}>
                  <div className={styles.tLabel}>
                    <span className={styles.tDot}
                      style={{ background: SOURCE_META[line.source]?.color || '#6b7280' }} />
                    <span>{line.label}</span>
                    <SourceBadge source={line.source} />
                  </div>
                  <div className={styles.tAmt} style={{ color: '#059669' }}>₹{fmt(line.amount)}</div>
                </div>
              ))
            )}
          </div>
          <div className={styles.tFoot}>
            <span>Total Income</span>
            <span style={{ color: '#059669' }}>₹{fmt(data.total_income)}</span>
          </div>
        </div>

        <div className={styles.tAccountExpense}>
          <div className={styles.tAccountHead}>
            <TrendingDown size={16} style={{ color: '#dc2626' }} /> Expenses
          </div>
          <div className={styles.tAccountBody}>
            {expenseLines.length === 0 ? (
              <div className={styles.tEmpty}>No expenses recorded.</div>
            ) : (
              expenseLines.map((line, i) => (
                <div key={i} className={styles.tRow}>
                  <div className={styles.tLabel}>
                    <span className={styles.tDot}
                      style={{ background: SOURCE_META[line.source]?.color || '#6b7280' }} />
                    <span>{line.label}</span>
                    <SourceBadge source={line.source} />
                  </div>
                  <div className={styles.tAmt} style={{ color: '#dc2626' }}>₹{fmt(line.amount)}</div>
                </div>
              ))
            )}
          </div>
          <div className={styles.tFoot}>
            <span>Total Expenses</span>
            <span style={{ color: '#dc2626' }}>₹{fmt(data.total_expense)}</span>
          </div>
        </div>
      </div>

      {/* Net balance bar */}
      <div className={`${styles.netBar} ${data.balance >= 0 ? styles.netBarSurplus : styles.netBarDeficit}`}>
        <span className={styles.netLabel}>
          <Scale size={18} />
          {data.balance >= 0 ? 'Net Surplus' : 'Net Deficit'} for Period
        </span>
        <span className={styles.netValue}>
          {data.balance >= 0 ? '+' : '-'}₹{fmt(Math.abs(data.balance))}
        </span>
      </div>
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

function TransactionsTab({ filters }) {
  const [all, setAll]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource]   = useState('');
  const [txType, setTxType]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setPage(1);
    try {
      const params = {
        year:          filters.year || undefined,
        month:         filters.month || undefined,
        academic_year: filters.academicYear || undefined,
        source:        source  || undefined,
        type:          txType  || undefined,
        status:        status  || undefined,
      };
      const r = await adminApi.getTransactionHistory(params);
      setAll(r.data.results || []);
    } catch {
      push('Failed to load transactions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, source, txType, status]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const paginated  = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = all.reduce((acc, tx) => {
    if (tx.type === 'income')  acc.income  += tx.amount;
    else                       acc.expense += tx.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const handleExport = () => {
    const rows = all.map(tx => ({
      Date:         tx.date,
      Title:        tx.title,
      Description:  tx.description,
      Category:     tx.category,
      Type:         tx.type,
      Source:       tx.source_label,
      Amount:       tx.amount,
      Status:       tx.status,
      SubmittedBy:  tx.submitted_by,
    }));
    const period = [filters.month ? MONTHS[filters.month] : '', filters.year].filter(Boolean).join('_') || 'AllTime';
    exportCSV(rows, `Transactions_${period}.csv`);
  };

  return (
    <div className={styles.tabContent}>
      {/* Sub-filters */}
      <div className={styles.txFilterBar}>
        <div className={styles.txFilterLeft}>
          <select className={styles.smallSelect} value={source} onChange={e => setSource(e.target.value)}>
            <option value="">All Sources</option>
            <option value="fees">Fee Collection</option>
            <option value="payroll">Payroll</option>
            <option value="manual">Manual Entry</option>
          </select>
          <select className={styles.smallSelect} value={txType} onChange={e => setTxType(e.target.value)}>
            <option value="">Income + Expense</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </select>
          <select className={styles.smallSelect} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className={styles.txFilterRight}>
          <span className={styles.txCount}>{all.length} records</span>
          <button className={styles.exportBtn} onClick={handleExport} disabled={!all.length}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {all.length > 0 && (
        <div className={styles.txSummary}>
          <div className={styles.txSummaryItem}>
            <span>Total Income</span>
            <strong style={{ color: '#059669' }}>+₹{fmt(totals.income)}</strong>
          </div>
          <div className={styles.txSummaryDivider} />
          <div className={styles.txSummaryItem}>
            <span>Total Expense</span>
            <strong style={{ color: '#dc2626' }}>-₹{fmt(totals.expense)}</strong>
          </div>
          <div className={styles.txSummaryDivider} />
          <div className={styles.txSummaryItem}>
            <span>Net</span>
            <strong style={{ color: totals.income - totals.expense >= 0 ? '#1d4ed8' : '#dc2626' }}>
              {totals.income - totals.expense >= 0 ? '+' : '-'}₹{fmt(Math.abs(totals.income - totals.expense))}
            </strong>
          </div>
        </div>
      )}

      {loading ? <Spinner text="Loading transactions…" /> : (
        <>
          {paginated.length === 0 ? (
            <Empty text="No transactions match your filters." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title / Description</th>
                    <th>Category</th>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className={styles.tRight}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(tx => (
                    <tr key={tx.id}>
                      <td className={styles.monoCell}>{tx.date}</td>
                      <td>
                        <div className={styles.txTitle}>{tx.title}</div>
                        {tx.description && <div className={styles.txDesc}>{tx.description}</div>}
                      </td>
                      <td className={styles.mutedCell}>{tx.category}</td>
                      <td><SourceBadge source={tx.source} /></td>
                      <td><TypeBadge type={tx.type} /></td>
                      <td><StatusBadge status={tx.status} /></td>
                      <td className={`${styles.tRight} ${styles.monoCell}`}
                        style={{ color: tx.type === 'income' ? '#059669' : '#dc2626', fontWeight: 700 }}>
                        {tx.type === 'income' ? '+' : '-'}₹{fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Approvals Tab ────────────────────────────────────────────────────────────

function ApprovalsTab() {
  const [pending,   setPending]   = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState('pending'); // pending | history
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [remarks,   setRemarks]   = useState('');
  const { push } = useToast();

  const loadPending = async () => {
    const r = await adminApi.getExpenseEntries({ status: 'pending' });
    setPending(r.data || []);
  };
  const loadHistory = async () => {
    const r = await adminApi.getExpenseEntries({ status: 'approved,rejected' });
    const combined = await Promise.all([
      adminApi.getExpenseEntries({ status: 'approved' }),
      adminApi.getExpenseEntries({ status: 'rejected' }),
    ]);
    setHistory([...(combined[0].data || []), ...(combined[1].data || [])]);
  };

  const load = async () => {
    setLoading(true);
    try { await Promise.all([loadPending(), loadHistory()]); }
    catch { push('Failed to load approvals.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    setProcessing(id);
    try {
      await adminApi.approveExpense(id, { action: 'approved', remarks: '' });
      push('Entry approved.', 'success');
      await load();
    } catch { push('Failed.', 'error'); }
    finally { setProcessing(null); }
  };

  const openReject = (entry) => { setRejectModal(entry); setRemarks(''); };
  const confirmReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      await adminApi.approveExpense(rejectModal.id, { action: 'rejected', remarks });
      push('Entry rejected.', 'success');
      setRejectModal(null);
      await load();
    } catch { push('Failed.', 'error'); }
    finally { setProcessing(null); }
  };

  if (loading) return <Spinner text="Loading approvals…" />;

  return (
    <div className={styles.tabContent}>
      <div className={styles.approvalViewToggle}>
        <button
          className={`${styles.viewToggleBtn} ${view === 'pending' ? styles.viewToggleActive : ''}`}
          onClick={() => setView('pending')}
        >
          <Clock size={14} /> Pending
          {pending.length > 0 && <span className={styles.pendingCount}>{pending.length}</span>}
        </button>
        <button
          className={`${styles.viewToggleBtn} ${view === 'history' ? styles.viewToggleActive : ''}`}
          onClick={() => setView('history')}
        >
          <CheckCircle size={14} /> History
        </button>
      </div>

      {view === 'pending' ? (
        pending.length === 0 ? (
          <div className={styles.allClearBox}>
            <CheckCircle size={40} color="#10b981" />
            <h3>All Clear!</h3>
            <p>No pending approvals. Every submission has been reviewed.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Submitted By</th>
                  <th className={styles.tRight}>Amount</th>
                  <th className={styles.tRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(e => (
                  <tr key={e.id}>
                    <td className={styles.monoCell}>{e.expense_date}</td>
                    <td className={styles.boldCell}>{e.title}</td>
                    <td>{e.category_name}</td>
                    <td><TypeBadge type={e.category_type || 'expense'} /></td>
                    <td className={styles.mutedCell}>{e.submitted_by_name || '—'}</td>
                    <td className={`${styles.tRight} ${styles.monoCell}`}
                      style={{ color: e.category_type === 'income' ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      ₹{fmt(e.amount)}
                    </td>
                    <td>
                      <div className={styles.actionRow}>
                        <button
                          className={styles.approveBtn}
                          disabled={processing === e.id}
                          onClick={() => approve(e.id)}
                        >
                          {processing === e.id ? <Loader2 size={13} className={styles.spin} /> : <CheckCircle size={13} />}
                          Approve
                        </button>
                        <button
                          className={styles.rejectBtn}
                          disabled={processing === e.id}
                          onClick={() => openReject(e)}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        history.length === 0 ? (
          <Empty text="No approval history yet." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Reviewed By</th>
                  <th>Remarks</th>
                  <th className={styles.tRight}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map(e => (
                  <tr key={e.id}>
                    <td className={styles.monoCell}>{e.expense_date}</td>
                    <td className={styles.boldCell}>{e.title}</td>
                    <td>{e.category_name}</td>
                    <td><TypeBadge type={e.category_type || 'expense'} /></td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className={styles.mutedCell}>{e.approval?.reviewed_by_name || '—'}</td>
                    <td className={styles.mutedCell}>{e.approval?.remarks || '—'}</td>
                    <td className={`${styles.tRight} ${styles.monoCell}`}
                      style={{ color: e.category_type === 'income' ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      ₹{fmt(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h3>Reject Entry</h3>
              <button className={styles.modalClose} onClick={() => setRejectModal(null)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.rejectTitle}>
                Rejecting: <strong>{rejectModal.title}</strong> — ₹{fmt(rejectModal.amount)}
              </p>
              <div className={styles.formGroup}>
                <label className={styles.fLabel}>Rejection Reason / Remarks</label>
                <textarea
                  className={styles.fTextarea}
                  rows={4}
                  placeholder="Provide a reason for rejection…"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.btnSecondary} onClick={() => setRejectModal(null)}>Cancel</button>
              <button className={styles.rejectBtn} onClick={confirmReject} disabled={processing === rejectModal.id}>
                {processing === rejectModal.id ? <Loader2 size={14} className={styles.spin} /> : <XCircle size={14} />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Entry Submission Tab ─────────────────────────────────────────────────────

function EntryTab({ filters }) {
  const [entries, setEntries] = useState([]);
  const [cats,    setCats]    = useState([]);
  const [years,   setYears]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({
    category: '', title: '', description: '', amount: '',
    expense_date: new Date().toISOString().split('T')[0], academic_year: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        year:          filters.year || undefined,
        month:         filters.month || undefined,
        academic_year: filters.academicYear || undefined,
      };
      const [e, c, y] = await Promise.all([
        adminApi.getExpenseEntries(params),
        adminApi.getExpenseCategories(),
        adminApi.getAcademicYears(),
      ]);
      setEntries(e.data || []);
      setCats(c.data || []);
      setYears(y.data || []);
    } catch { push('Failed to load entries.', 'error'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (ev) => {
    ev.preventDefault(); setSaving(true);
    try {
      await adminApi.createExpenseEntry(form);
      push('Entry submitted for approval.', 'success');
      setModal(false);
      setForm({ category: '', title: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], academic_year: '' });
      await load();
    } catch { push('Failed to submit.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await adminApi.deleteExpenseEntry(id);
      setEntries(p => p.filter(e => e.id !== id));
      push('Entry deleted.', 'success');
    } catch { push('Failed to delete.', 'error'); }
    finally { setDeleting(null); }
  };

  const selCat = cats.find(c => String(c.id) === String(form.category));

  if (loading) return <Spinner text="Loading entries…" />;

  return (
    <div className={styles.tabContent}>
      <div className={styles.entryHeader}>
        <div>
          <h3 className={styles.sectionTitle}>Manual Entries</h3>
          <p className={styles.sectionSub}>Submit income or expense entries for approval</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setModal(true)}>
          <Plus size={15} /> New Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <Empty text="No entries for this period. Click 'New Entry' to add one." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Type</th>
                <th>Submitted By</th>
                <th>Status</th>
                <th className={styles.tRight}>Amount</th>
                <th className={styles.tRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td className={styles.monoCell}>{e.expense_date}</td>
                  <td className={styles.boldCell}>{e.title}</td>
                  <td>{e.category_name}</td>
                  <td><TypeBadge type={e.category_type || 'expense'} /></td>
                  <td className={styles.mutedCell}>{e.submitted_by_name || '—'}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td className={`${styles.tRight} ${styles.monoCell}`}
                    style={{ color: e.category_type === 'income' ? '#059669' : '#dc2626', fontWeight: 700 }}>
                    {e.category_type === 'income' ? '+' : '-'}₹{fmt(e.amount)}
                  </td>
                  <td>
                    <div className={styles.actionRow}>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        disabled={deleting === e.id}
                        onClick={() => del(e.id)}
                      >
                        {deleting === e.id ? <Loader2 size={13} className={styles.spin} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className={styles.overlay}>
          <div className={styles.modal} style={{ maxWidth: 580 }}>
            <div className={styles.modalHead}>
              <h3>Submit New Entry</h3>
              <button className={styles.modalClose} onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.spanFull}`}>
                    <label className={styles.fLabel}>Title *</label>
                    <input className={styles.fInput} value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Office Supplies, Electricity Bill" required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.fLabel}>Category *</label>
                    <select className={styles.fInput} value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required>
                      <option value="">Select category…</option>
                      {cats.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.category_type})</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.fLabel}>Amount (₹) *</label>
                    <input className={styles.fInput} type="number" min="0.01" step="0.01"
                      value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00" required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.fLabel}>Transaction Date *</label>
                    <input className={styles.fInput} type="date" value={form.expense_date}
                      onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.fLabel}>Academic Year</label>
                    <select className={styles.fInput} value={form.academic_year}
                      onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))}>
                      <option value="">— Optional —</option>
                      {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                  <div className={`${styles.formGroup} ${styles.spanFull}`}>
                    <label className={styles.fLabel}>Description / Notes</label>
                    <textarea className={styles.fTextarea} rows={3} value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Any additional context or details…" />
                  </div>
                  {selCat && (
                    <div className={`${styles.formGroup} ${styles.spanFull}`}>
                      <div className={styles.entryTypeHint}
                        style={{
                          color:      selCat.category_type === 'income' ? '#065f46' : '#991b1b',
                          background: selCat.category_type === 'income' ? '#d1fae5'  : '#fee2e2',
                        }}>
                        {selCat.category_type === 'income'
                          ? <TrendingUp size={13} />
                          : <TrendingDown size={13} />}
                        This entry will be recorded as <strong>{selCat.category_type.toUpperCase()}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.modalFoot}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={styles.spin} />} Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({ name: '', description: '', category_type: 'expense', is_active: true });
  const [saving,  setSaving]  = useState(false);
  const { push } = useToast();

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { setCats((await adminApi.getExpenseCategories()).data || []); }
    catch { push('Failed.', 'error'); }
    finally { setLoading(false); }
  };

  const open = (cat = null) => {
    setForm(cat
      ? { name: cat.name, description: cat.description, category_type: cat.category_type || 'expense', is_active: cat.is_active }
      : { name: '', description: '', category_type: 'expense', is_active: true }
    );
    setModal(cat || {});
  };

  const save = async (ev) => {
    ev.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await adminApi.updateExpenseCategory(modal.id, form);
      else            await adminApi.createExpenseCategory(form);
      push('Category saved.', 'success'); setModal(null); load();
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await adminApi.deleteExpenseCategory(id);
      setCats(p => p.filter(c => c.id !== id));
      push('Category deleted.', 'success');
    } catch { push('Cannot delete — entries may reference this category.', 'error'); }
  };

  const income  = cats.filter(c => c.category_type === 'income');
  const expense = cats.filter(c => c.category_type === 'expense');

  if (loading) return <Spinner text="Loading categories…" />;

  const CatGroup = ({ title, items, color }) => (
    <div className={styles.catGroup}>
      <div className={styles.catGroupHead} style={{ color }}>
        {title} ({items.length})
      </div>
      {items.length === 0 ? (
        <div className={styles.catEmpty}>No {title.toLowerCase()} categories yet.</div>
      ) : (
        items.map(c => (
          <div key={c.id} className={styles.catRow}>
            <div>
              <div className={styles.catName}>{c.name}</div>
              {c.description && <div className={styles.catDesc}>{c.description}</div>}
            </div>
            <div className={styles.catRowRight}>
              <span className={c.is_active ? styles.catActive : styles.catInactive}>
                {c.is_active ? 'Active' : 'Inactive'}
              </span>
              <button className={styles.iconBtn} onClick={() => open(c)}><Pencil size={13} /></button>
              <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => del(c.id)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.entryHeader}>
        <div>
          <h3 className={styles.sectionTitle}>Transaction Categories</h3>
          <p className={styles.sectionSub}>Organise your income and expense types</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => open()}><Plus size={15} /> New Category</button>
      </div>

      <div className={styles.catGrid}>
        <CatGroup title="Income Categories"  items={income}  color="#059669" />
        <CatGroup title="Expense Categories" items={expense} color="#dc2626" />
      </div>

      {modal !== null && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h3>{modal?.id ? 'Edit Category' : 'New Category'}</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.fLabel}>Category Name *</label>
                  <input className={styles.fInput} value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className={styles.formGroup} style={{ marginTop: 16 }}>
                  <label className={styles.fLabel}>Type *</label>
                  <div className={styles.typeToggle}>
                    <button type="button"
                      className={`${styles.typeBtn} ${form.category_type === 'income' ? styles.typeBtnIncome : ''}`}
                      onClick={() => setForm(p => ({ ...p, category_type: 'income' }))}>
                      <TrendingUp size={14} /> Income
                    </button>
                    <button type="button"
                      className={`${styles.typeBtn} ${form.category_type === 'expense' ? styles.typeBtnExpense : ''}`}
                      onClick={() => setForm(p => ({ ...p, category_type: 'expense' }))}>
                      <TrendingDown size={14} /> Expense
                    </button>
                  </div>
                </div>
                <div className={styles.formGroup} style={{ marginTop: 16 }}>
                  <label className={styles.fLabel}>Description</label>
                  <textarea className={styles.fTextarea} rows={3} value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={form.is_active}
                    onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                  <span>Active (visible in entry forms)</span>
                </label>
              </div>
              <div className={styles.modalFoot}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={styles.spin} />} Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main: Financial Ledger ───────────────────────────────────────────────────

const TABS = [
  { key: 'overview',     label: 'Overview',      icon: BarChart2  },
  { key: 'balance',      label: 'Balance Sheet',  icon: Scale      },
  { key: 'transactions', label: 'Transactions',   icon: Receipt    },
  { key: 'entry',        label: 'Entry',          icon: FileText   },
  { key: 'approvals',    label: 'Approvals',      icon: CheckSquare },
  { key: 'categories',   label: 'Categories',     icon: LayoutGrid },
];

export default function FinancialLedger() {
  const [tab,           setTab]           = useState('overview');
  const [filters,       setFilters]       = useState({ year: String(CY), month: '', academicYear: '' });
  const [academicYears, setAcademicYears] = useState([]);
  const [pendingCount,  setPendingCount]  = useState(0);

  useEffect(() => {
    adminApi.getAcademicYears().then(r => setAcademicYears(r.data || [])).catch(() => {});
    adminApi.getExpenseEntries({ status: 'pending' }).then(r => setPendingCount((r.data || []).length)).catch(() => {});
  }, []);

  const filterNoUndefined = {
    year:          filters.year || undefined,
    month:         filters.month || undefined,
    academic_year: filters.academicYear || undefined,
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Financial Ledger</h1>
          <p className={styles.pageSubtitle}>Income, expenses &amp; balance sheet — all in one place</p>
        </div>
      </header>

      {/* Tab bar */}
      <nav className={styles.tabBar}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              <Icon size={15} />
              {t.label}
              {t.key === 'approvals' && pendingCount > 0 && (
                <span className={styles.tabBadge}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Filter bar (hidden for categories) */}
      {tab !== 'categories' && (
        <FilterBar filters={filters} onChange={setFilters} academicYears={academicYears} />
      )}

      {/* Tab content */}
      {tab === 'overview'     && <OverviewTab     filters={filterNoUndefined} />}
      {tab === 'balance'      && <BalanceSheetTab filters={filterNoUndefined} />}
      {tab === 'transactions' && <TransactionsTab filters={filterNoUndefined} />}
      {tab === 'entry'        && <EntryTab        filters={filterNoUndefined} />}
      {tab === 'approvals'    && <ApprovalsTab />}
      {tab === 'categories'   && <CategoriesTab />}
    </div>
  );
}
