'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Download, AlertTriangle, Clock, CheckCircle, Loader2,
  X, ChevronRight, BarChart2, FileText, List, CreditCard,
  Calendar, Hash, TrendingUp, Receipt,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';
import ts from './FeeTracking.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: { label: 'Pending',  cls: styles.badgePending, color: '#d97706' },
  overdue: { label: 'Overdue',  cls: styles.badgeDanger,  color: '#dc2626' },
  paid:    { label: 'Paid',     cls: styles.badgePaid,    color: '#16a34a' },
  partial: { label: 'Partial',  cls: styles.badgePending, color: '#d97706' },
  waived:  { label: 'Waived',   cls: styles.badgePaid,    color: '#0891b2' },
};

const CHART_COLORS = ['#16a34a', '#ef4444', '#0891b2', '#f59e0b', '#7c3aed', '#db2777'];

const METHOD_LABELS = {
  cash: 'Cash', online: 'Online', cheque: 'Cheque',
  dd: 'Demand Draft', upi: 'UPI', neft: 'NEFT/RTGS',
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const pct = (paid, total) => (!total ? 0 : Math.min(100, Math.round((paid / total) * 100)));

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

const dominantStatus = (counts = {}) => {
  if ((counts.overdue || 0) > 0) return 'overdue';
  if ((counts.pending || 0) > 0) return 'pending';
  if ((counts.partial || 0) > 0) return 'partial';
  if ((counts.waived  || 0) > 0) return 'waived';
  return 'paid';
};

// ─── Student Detail Panel ─────────────────────────────────────────────────────

function StudentDetailPanel({ studentId, className: studentClass, onClose }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('breakdown');
  const { push }                  = useToast();

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setStatement(null);
    setTab('breakdown');
    adminApi.getStudentFeeStatement(studentId)
      .then(r => setStatement(r.data))
      .catch(() => push('Failed to load student fee statement.', 'error'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const totalConcession = useMemo(() => {
    if (!statement) return 0;
    return statement.payments.reduce((s, p) => s + Number(p.concession_amount || 0), 0);
  }, [statement]);

  const totalLateFine = useMemo(() => {
    if (!statement) return 0;
    return statement.payments.reduce((s, p) => s + Number(p.late_fine || 0), 0);
  }, [statement]);

  const payPct = statement
    ? pct(Number(statement.total_paid), Number(statement.total_fee))
    : 0;

  const pieData = useMemo(() => {
    if (!statement) return [];
    return [
      { name: 'Paid',        value: Number(statement.total_paid) },
      { name: 'Balance Due', value: Number(statement.total_due)  },
      ...(totalConcession > 0 ? [{ name: 'Concession', value: totalConcession }] : []),
    ].filter(d => d.value > 0);
  }, [statement, totalConcession]);

  const barData = useMemo(() => {
    if (!statement) return [];
    return statement.fee_dues.map(d => ({
      name:     d.category_name.length > 13 ? d.category_name.slice(0, 13) + '…' : d.category_name,
      fullName: d.category_name,
      Paid:     Number(d.amount_paid),
      Balance:  Number(d.balance_due),
    }));
  }, [statement]);

  const progressColor = payPct === 100 ? '#16a34a' : payPct >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className={ts.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={ts.panel}>

        {/* ── Header ── */}
        <div className={ts.panelHeader}>
          {statement ? (
            <div className={ts.studentInfo}>
              <div className={ts.avatar}>{getInitials(statement.student_name)}</div>
              <div>
                <div className={ts.studentName}>{statement.student_name}</div>
                <div className={ts.studentMeta}>
                  <Hash size={12} />
                  {statement.admission_number}
                  {studentClass && (
                    <><span className={ts.metaDot}>·</span>{studentClass}</>
                  )}
                  {statement.academic_year && (
                    <><span className={ts.metaDot}>·</span>{statement.academic_year}</>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={ts.studentInfo}>
              <Loader2 size={18} className={styles.spin} />
              <span style={{ color: '#45474c', fontWeight: 600 }}>Loading student...</span>
            </div>
          )}
          <button className={ts.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={18} className={styles.spin} /> Fetching fee statement…
          </div>
        ) : statement ? (
          <div className={ts.panelBody}>

            {/* ── Stat Cards ── */}
            <div className={ts.statGrid}>
              <div className={ts.statCard}>
                <div className={ts.statLabel}>Total Fee</div>
                <div className={ts.statValue}>{fmt(statement.total_fee)}</div>
                <div className={ts.statSub}>{statement.fee_dues.length} fee head{statement.fee_dues.length !== 1 ? 's' : ''}</div>
              </div>

              <div className={`${ts.statCard} ${ts.statGreen}`}>
                <div className={ts.statLabel}>Amount Paid</div>
                <div className={`${ts.statValue} ${ts.green}`}>{fmt(statement.total_paid)}</div>
                <div className={ts.statSub}>{payPct}% of total</div>
              </div>

              <div className={`${ts.statCard} ${ts.statRed}`}>
                <div className={ts.statLabel}>Balance Due</div>
                <div className={`${ts.statValue} ${ts.red}`}>{fmt(statement.total_due)}</div>
                <div className={ts.statSub}>{statement.total_due > 0 ? 'Outstanding' : 'Fully cleared'}</div>
              </div>

              <div className={`${ts.statCard} ${ts.statBlue}`}>
                <div className={ts.statLabel}>Concession</div>
                <div className={`${ts.statValue} ${ts.blue}`}>{fmt(totalConcession)}</div>
                <div className={ts.statSub}>{totalConcession > 0 ? 'Applied' : 'None applied'}</div>
              </div>

              {totalLateFine > 0 && (
                <div className={`${ts.statCard} ${ts.statOrange}`} style={{ gridColumn: '1 / -1' }}>
                  <div className={ts.statLabel}>Late Fine Charged</div>
                  <div className={`${ts.statValue} ${ts.orange}`}>{fmt(totalLateFine)}</div>
                </div>
              )}
            </div>

            {/* ── Progress Bar ── */}
            <div className={ts.progressSection}>
              <div className={ts.progressLabel}>
                <span>Payment Progress</span>
                <span className={ts.progressPct}>{payPct}% paid</span>
              </div>
              <div className={ts.progressTrack}>
                <div
                  className={ts.progressFill}
                  style={{ width: `${payPct}%`, backgroundColor: progressColor }}
                />
              </div>
            </div>

            {/* ── Inner Tabs ── */}
            <div className={ts.tabBar}>
              {[
                { id: 'breakdown', icon: List,     label: 'Fee Breakdown'    },
                { id: 'receipts',  icon: Receipt,  label: 'Payment Receipts' },
                { id: 'charts',    icon: BarChart2, label: 'Finance Charts'  },
              ].map(t => (
                <button
                  key={t.id}
                  className={`${ts.tabBtn} ${tab === t.id ? ts.tabActive : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Fee Breakdown ── */}
            {tab === 'breakdown' && (
              statement.fee_dues.length === 0 ? (
                <div className={styles.emptyState}>No fee structures defined for this student's class.</div>
              ) : (
                <div className={styles.tableResponsive} style={{ margin: 0 }}>
                  <table className={styles.table} style={{ minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th>Fee Head</th>
                        <th>Term</th>
                        <th className={styles.textRight}>Total</th>
                        <th className={styles.textRight}>Paid</th>
                        <th className={styles.textRight}>Balance</th>
                        <th>Due Date</th>
                        <th className={styles.textCenter}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.fee_dues.map((d, i) => {
                        const isPaid    = d.balance_due === 0 && d.amount_paid > 0;
                        const isPartial = d.balance_due > 0 && d.amount_paid > 0;
                        const badgeCls  = isPaid ? styles.badgePaid : styles.badgePending;
                        const badgeTxt  = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid';
                        return (
                          <tr key={i}>
                            <td>
                              <div className={styles.textBold}>{d.category_name}</div>
                              <div className={styles.textSub} style={{ textTransform: 'capitalize' }}>
                                {d.category_type}{!d.is_mandatory && ' · Optional'}
                              </div>
                            </td>
                            <td style={{ textTransform: 'capitalize', color: 'var(--finance-text-muted)', fontSize: 13 }}>
                              {(d.term || '').replace('_', ' ')}
                            </td>
                            <td className={`${styles.fontMono} ${styles.textRight}`}>{fmt(d.total_amount)}</td>
                            <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: '#16a34a', fontWeight: 700 }}>
                              {fmt(d.amount_paid)}
                            </td>
                            <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: d.balance_due > 0 ? '#dc2626' : 'inherit', fontWeight: d.balance_due > 0 ? 700 : 400 }}>
                              {fmt(d.balance_due)}
                            </td>
                            <td style={{ color: 'var(--finance-text-muted)', fontSize: 13 }}>{d.due_date || '—'}</td>
                            <td className={styles.textCenter}>
                              <span className={`${styles.badge} ${badgeCls}`}>{badgeTxt}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Tab: Payment Receipts ── */}
            {tab === 'receipts' && (
              statement.payments.length === 0 ? (
                <div className={styles.emptyState}>No payment receipts on record.</div>
              ) : (
                <div>
                  {statement.payments.map(p => {
                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                    return (
                      <div key={p.id} className={ts.receiptCard}>
                        <div className={ts.receiptLeft}>
                          <div className={ts.receiptNumber}>
                            {p.receipt_number || '—'}
                          </div>
                          <div className={ts.receiptMeta}>
                            <span className={ts.receiptMetaItem}>
                              <FileText size={12} /> {p.category_name}
                            </span>
                            <span className={ts.receiptMetaItem}>
                              <Calendar size={12} /> {p.payment_date || 'No date'}
                            </span>
                            <span className={ts.receiptMetaItem}>
                              <CreditCard size={12} /> {METHOD_LABELS[p.payment_method] || p.payment_method}
                            </span>
                            {p.transaction_id && (
                              <span className={ts.receiptMetaItem}>
                                <Hash size={12} /> {p.transaction_id}
                              </span>
                            )}
                            {p.collected_by_name && (
                              <span className={ts.receiptMetaItem} style={{ color: '#8590a6' }}>
                                by {p.collected_by_name}
                              </span>
                            )}
                          </div>
                          {p.remarks && (
                            <div style={{ fontSize: 12, color: '#8590a6', marginTop: 6, fontStyle: 'italic' }}>
                              {p.remarks}
                            </div>
                          )}
                        </div>
                        <div className={ts.receiptRight}>
                          <div className={ts.receiptAmount} style={{ color: '#16a34a' }}>{fmt(p.amount_paid)}</div>
                          {Number(p.late_fine) > 0 && (
                            <div className={ts.receiptFine}>+ {fmt(p.late_fine)} fine</div>
                          )}
                          {Number(p.concession_amount) > 0 && (
                            <div style={{ fontSize: 12, color: '#0891b2', marginTop: 2 }}>
                              − {fmt(p.concession_amount)} concession
                            </div>
                          )}
                          <div style={{ marginTop: 8 }}>
                            <span className={`${styles.badge} ${cfg.cls}`}>{cfg.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── Tab: Finance Charts ── */}
            {tab === 'charts' && (
              <div className={ts.chartsGrid}>

                {/* Donut — paid vs balance vs concession */}
                <div className={ts.chartCard}>
                  <div className={ts.chartTitle}>Fee Status Breakdown</div>
                  {pieData.length === 0 ? (
                    <div className={styles.emptyState} style={{ padding: '40px 0' }}>No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [fmt(v), name]} />
                        <Legend
                          iconType="circle"
                          iconSize={9}
                          wrapperStyle={{ fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Stacked bar — per fee head */}
                <div className={ts.chartCard}>
                  <div className={ts.chartTitle}>Fee Head Comparison</div>
                  {barData.length === 0 ? (
                    <div className={styles.emptyState} style={{ padding: '40px 0' }}>No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={barData} barSize={18} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                          width={52}
                        />
                        <Tooltip
                          formatter={(v, name) => [fmt(v), name]}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                        />
                        <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Paid"    stackId="a" fill="#16a34a" />
                        <Bar dataKey="Balance" stackId="a" fill="#fca5a5" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Monthly payment trend */}
                {statement.payments.length > 0 && (() => {
                  const byMonth = {};
                  statement.payments.forEach(p => {
                    if (p.payment_date && p.status === 'paid') {
                      const m = p.payment_date.slice(0, 7); // YYYY-MM
                      byMonth[m] = (byMonth[m] || 0) + Number(p.amount_paid);
                    }
                  });
                  const monthData = Object.entries(byMonth)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, v]) => ({
                      month: k.slice(5) + '/' + k.slice(2, 4),
                      Amount: v,
                    }));
                  if (monthData.length < 2) return null;
                  return (
                    <div className={`${ts.chartCard} ${ts.chartFullWidth}`}>
                      <div className={ts.chartTitle}>
                        <TrendingUp size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Monthly Payment Trend
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={monthData} barSize={22} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                            width={52}
                          />
                          <Tooltip formatter={v => [fmt(v), 'Paid']} />
                          <Bar dataKey="Amount" fill="#0891b2" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

              </div>
            )}

          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeeTracking() {
  const [payments,       setPayments]       = useState([]);
  const [academicYears,  setAcademicYears]  = useState([]);
  const [classes,        setClasses]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null); // { id, class_name }

  const [search,       setSearch]       = useState('');
  const [filterYear,   setFilterYear]   = useState('');
  const [filterClass,  setFilterClass]  = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { push } = useToast();

  useEffect(() => {
    Promise.all([adminApi.getAcademicYears(), adminApi.getClasses()])
      .then(([yr, cls]) => { setAcademicYears(yr.data || []); setClasses(cls.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchPayments(); }, [filterYear, filterClass]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterYear)  params.academic_year = filterYear;
      if (filterClass) params.class         = filterClass;
      const r = await adminApi.getFeePayments(params);
      setPayments(r.data || []);
    } catch { push('Failed to load fee tracking data.', 'error'); }
    finally { setLoading(false); }
  };

  // Group individual payment records by student
  const studentGroups = useMemo(() => {
    const map = new Map();
    payments.forEach(p => {
      const sid = p.student;
      if (!map.has(sid)) {
        map.set(sid, {
          student_id:        sid,
          student_name:      p.student_name      || '',
          admission_number:  p.admission_number  || '',
          class_name:        p.class_name        || '',
          total_paid:        0,
          last_payment_date: null,
          status_counts:     { paid: 0, pending: 0, overdue: 0, partial: 0, waived: 0 },
        });
      }
      const g = map.get(sid);
      if (p.status === 'paid') g.total_paid += Number(p.amount_paid || 0);
      g.status_counts[p.status] = (g.status_counts[p.status] || 0) + 1;
      if (p.payment_date && (!g.last_payment_date || p.payment_date > g.last_payment_date)) {
        g.last_payment_date = p.payment_date;
      }
    });
    return Array.from(map.values());
  }, [payments]);

  // Apply search + status filter after grouping
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return studentGroups.filter(g => {
      const matchSearch = !q
        || g.student_name.toLowerCase().includes(q)
        || g.admission_number.toLowerCase().includes(q);
      const status     = dominantStatus(g.status_counts);
      const matchStatus = !filterStatus || status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [studentGroups, search, filterStatus]);

  const totals = useMemo(() => ({
    collected: filtered.reduce((s, g) => s + g.total_paid, 0),
    students:  filtered.length,
    paid:      filtered.filter(g => dominantStatus(g.status_counts) === 'paid').length,
    pending:   filtered.filter(g => dominantStatus(g.status_counts) === 'pending').length,
    overdue:   filtered.filter(g => dominantStatus(g.status_counts) === 'overdue').length,
  }), [filtered]);

  const exportCSV = () => {
    const rows = filtered.map(g => {
      const s = dominantStatus(g.status_counts);
      return `"${g.student_name}","${g.admission_number}","${g.class_name}",${g.total_paid},"${s}","${g.last_payment_date || ''}"`;
    });
    const csv  = 'Student,Admission No.,Class,Total Paid,Status,Last Payment\n' + rows.join('\n');
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `fee_tracking_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div>
      {/* ── Summary Cards ── */}
      <div className={ts.summaryGrid}>
        <div className={`${styles.card} ${ts.summaryCard}`}>
          <div className={ts.summaryLabel}>Total Collected</div>
          <div className={`${styles.fontMono} ${ts.summaryValue}`} style={{ color: '#16a34a' }}>{fmt(totals.collected)}</div>
        </div>
        <div className={`${styles.card} ${ts.summaryCard}`}>
          <div className={ts.summaryLabel}>Students Tracked</div>
          <div className={`${styles.fontMono} ${ts.summaryValue}`}>{totals.students}</div>
        </div>
        <div className={`${styles.card} ${ts.summaryCard}`}>
          <div className={ts.summaryLabel}>Fully Paid</div>
          <div className={`${styles.fontMono} ${ts.summaryValue}`} style={{ color: '#16a34a' }}>{totals.paid}</div>
        </div>
        <div className={`${styles.card} ${ts.summaryCard}`}>
          <div className={ts.summaryLabel}>Pending</div>
          <div className={`${styles.fontMono} ${ts.summaryValue}`} style={{ color: '#d97706' }}>{totals.pending}</div>
        </div>
        <div className={`${styles.card} ${ts.summaryCard}`}>
          <div className={ts.summaryLabel}>Overdue</div>
          <div className={`${styles.fontMono} ${ts.summaryValue}`} style={{ color: '#dc2626' }}>{totals.overdue}</div>
        </div>
      </div>

      {/* ── Filters + Table ── */}
      <div className={styles.card} style={{ padding: 0 }}>
        <div className={styles.cardHeader} style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div className={styles.inputWrapper} style={{ flex: 1, minWidth: 200 }}>
            <Search className={styles.inputIcon} size={16} />
            <input
              className={`${styles.input} ${styles.inputWithIcon}`}
              placeholder="Search student name or admission no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className={styles.input} style={{ width: 145 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
          <select className={styles.input} style={{ width: 145 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={styles.input} style={{ width: 145 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <button className={styles.btnSecondary} onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={18} className={styles.spin} /> Loading tracking data…
          </div>
        ) : (
          <div className={styles.tableResponsive} style={{ margin: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th className={styles.textRight}>Total Paid</th>
                  <th className={styles.textCenter}>Paid</th>
                  <th className={styles.textCenter}>Pending</th>
                  <th className={styles.textCenter}>Overdue</th>
                  <th>Last Payment</th>
                  <th className={styles.textCenter}>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyState}>No matching records found.</td>
                  </tr>
                ) : filtered.map(g => {
                  const status = dominantStatus(g.status_counts);
                  const cfg    = STATUS_CONFIG[status];
                  return (
                    <tr
                      key={g.student_id}
                      className={ts.clickableRow}
                      onClick={() => setSelectedStudent({ id: g.student_id, class_name: g.class_name })}
                    >
                      <td>
                        <div className={ts.studentCell}>
                          <div className={ts.avatarSm}>{getInitials(g.student_name)}</div>
                          <div>
                            <div className={styles.textBold}>{g.student_name}</div>
                            <div className={styles.textSub}>{g.admission_number}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--finance-text-muted)' }}>{g.class_name}</td>
                      <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: '#16a34a', fontWeight: 800 }}>
                        {fmt(g.total_paid)}
                      </td>
                      <td className={`${styles.fontMono} ${styles.textCenter}`} style={{ color: '#16a34a', fontWeight: 700 }}>
                        {g.status_counts.paid || 0}
                      </td>
                      <td className={`${styles.fontMono} ${styles.textCenter}`} style={{ color: '#d97706', fontWeight: 700 }}>
                        {g.status_counts.pending || 0}
                      </td>
                      <td className={`${styles.fontMono} ${styles.textCenter}`} style={{ color: '#dc2626', fontWeight: 700 }}>
                        {g.status_counts.overdue || 0}
                      </td>
                      <td style={{ color: 'var(--finance-text-muted)', fontSize: 13 }}>
                        {g.last_payment_date || '—'}
                      </td>
                      <td className={styles.textCenter}>
                        <span className={`${styles.badge} ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td>
                        <button className={`${styles.iconBtn} ${ts.chevronBtn}`} tabIndex={-1}>
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Student Detail Slide-over ── */}
      {selectedStudent && (
        <StudentDetailPanel
          studentId={selectedStudent.id}
          className={selectedStudent.class_name}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
