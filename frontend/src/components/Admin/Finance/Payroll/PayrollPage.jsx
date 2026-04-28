'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Play, Building2, Minus, TrendingUp, Plus, Pencil,
  Trash2, X, Loader2, FileText, BrainCircuit, Sparkles, Users,
  IndianRupee, TrendingDown, BarChart2, CheckCircle2, Printer,
  ChevronDown, ChevronUp, RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import FinanceTabs from '../shared/FinanceTabs';
import fStyles from '../shared/FinanceLayout.module.css';
import pStyles from './PayrollPage.module.css';

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const CHART_COLORS = ['#091426','#00a676','#f59e0b','#6366f1','#ef4444','#0ea5e9'];
const INC_TYPES = [
  { value: 'merit', label: 'Merit / Performance' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'annual', label: 'Annual Revision' },
  { value: 'adjustment', label: 'Salary Adjustment' },
];

const NAV = [
  { key: 'overview',    label: 'Overview',          icon: <LayoutDashboard size={16}/> },
  { key: 'runs',        label: 'Payroll Runs',       icon: <Play size={16}/> },
  { key: 'structures',  label: 'Salary Structures',  icon: <Building2 size={16}/> },
  { key: 'deductions',  label: 'Deductions',         icon: <Minus size={16}/> },
  { key: 'increments',  label: 'Increments',         icon: <TrendingUp size={16}/> },
];

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtK = (n) => {
  const v = Number(n || 0);
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, iconClass, value, label, sub }) {
  return (
    <div className={pStyles.statCard}>
      <div className={`${pStyles.statIconWrap} ${pStyles[iconClass]}`}>{icon}</div>
      <div className={pStyles.statBody}>
        <div className={pStyles.statValue}>{value}</div>
        <div className={pStyles.statLabel}>{label}</div>
        {sub && <div className={`${pStyles.statChange} ${pStyles.statChangeNeutral}`}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip for charts ────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={pStyles.chartTooltip}>
      <div className={pStyles.chartTooltipTitle}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} className={pStyles.chartTooltipRow}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    adminApi.getPayrollAnalytics()
      .then(r => setData(r.data))
      .catch(() => push('Failed to load analytics.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={fStyles.loading}><Loader2 size={18} className={fStyles.spin}/> Loading analytics…</div>;
  if (!data) return <div className={fStyles.emptyState}>No data available.</div>;

  const { summary, monthly_data = [], deduction_totals = {}, designation_stats = [], recent_increments = [] } = data;
  const latestRun = summary?.latest_run;
  const pieData = [
    { name: 'PF', value: deduction_totals.pf || 0 },
    { name: 'ESI', value: deduction_totals.esi || 0 },
    { name: 'TDS', value: deduction_totals.tds || 0 },
    { name: 'Other', value: deduction_totals.other || 0 },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* Stat Cards */}
      <div className={pStyles.statGrid}>
        <StatCard
          icon={<Users size={20}/>} iconClass="statIconPrimary"
          value={summary?.total_active_staff || 0}
          label="Active Staff on Payroll"
          sub={`${summary?.processed_runs || 0} runs processed`}
        />
        <StatCard
          icon={<IndianRupee size={20}/>} iconClass="statIconSuccess"
          value={latestRun ? fmtK(latestRun.total_net) : '—'}
          label="Last Month Net Payout"
          sub={latestRun ? `${MONTHS_FULL[latestRun.month]} ${latestRun.year}` : 'No runs yet'}
        />
        <StatCard
          icon={<TrendingDown size={20}/>} iconClass="statIconWarning"
          value={latestRun ? fmtK(latestRun.total_deductions) : '—'}
          label="Last Month Deductions"
          sub="PF + ESI + TDS + Other"
        />
        <StatCard
          icon={<BarChart2 size={20}/>} iconClass="statIconInfo"
          value={
            latestRun && latestRun.staff_count
              ? fmtK(latestRun.total_net / latestRun.staff_count)
              : '—'
          }
          label="Avg Net Salary"
          sub={`${designation_stats.length} salary grades`}
        />
      </div>

      {/* Charts Row */}
      <div className={pStyles.chartsGrid}>
        {/* Monthly Trend */}
        <div className={pStyles.chartCard}>
          <div className={pStyles.chartTitle}>Monthly Payroll Trend</div>
          <div className={pStyles.chartSubtitle}>Gross vs Net payout — last {monthly_data.length} months</div>
          {monthly_data.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly_data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#091426" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#091426" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a676" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00a676" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false}/>
                <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Area type="monotone" dataKey="gross" name="Gross" stroke="#091426" strokeWidth={2} fill="url(#grossGrad)"/>
                <Area type="monotone" dataKey="net"   name="Net"   stroke="#00a676" strokeWidth={2} fill="url(#netGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={fStyles.emptyState} style={{ padding: 40 }}>Process at least one payroll run to see trends.</div>
          )}
        </div>

        {/* Deduction Pie */}
        <div className={pStyles.chartCard}>
          <div className={pStyles.chartTitle}>Deduction Breakdown</div>
          <div className={pStyles.chartSubtitle}>Last processed run composition</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={11}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v) => [`₹${fmt(v)}`, '']}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={fStyles.emptyState} style={{ padding: 40 }}>No deduction data yet.</div>
          )}
        </div>
      </div>

      {/* Designation Salary Bar Chart */}
      {designation_stats.length > 0 && (
        <div className={pStyles.chartCard} style={{ marginBottom: 24 }}>
          <div className={pStyles.chartTitle}>Salary by Designation</div>
          <div className={pStyles.chartSubtitle}>Gross salary comparison across active structures</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={designation_stats} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="designation" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}/>
              <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60}/>
              <Tooltip formatter={(v, n) => [`₹${fmt(v)}`, n]}/>
              <Bar dataKey="basic" name="Basic" fill="#091426" radius={[4,4,0,0]}/>
              <Bar dataKey="gross" name="Gross" fill="#00a676" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Increments */}
      {recent_increments.length > 0 && (
        <div className={fStyles.card}>
          <div className={fStyles.cardHeader}>
            <div>
              <h3 className={fStyles.cardTitle}>Recent Increments</h3>
              <p className={fStyles.cardSubtitle}>Latest salary revisions with AI Brain reasoning</p>
            </div>
            <span className={pStyles.aiBadge}><BrainCircuit size={10}/> AI Powered</span>
          </div>
          <div className={pStyles.recentList}>
            {recent_increments.map(inc => (
              <div key={inc.id} className={pStyles.recentItem}>
                <div className={pStyles.recentItemLeft}>
                  <div className={pStyles.recentItemName}>{inc.staff_name}</div>
                  <div className={pStyles.recentItemSub}>
                    {inc.designation} · {inc.increment_type_display} · {inc.effective_from}
                  </div>
                  {inc.ai_reason && (
                    <div style={{ fontSize: 12, color: '#5b21b6', marginTop: 4, lineHeight: 1.5 }}>
                      <BrainCircuit size={10} style={{ display: 'inline', marginRight: 3 }}/>
                      {inc.ai_reason.slice(0, 140)}{inc.ai_reason.length > 140 ? '…' : ''}
                    </div>
                  )}
                </div>
                <div className={pStyles.recentItemAmt}>+₹{fmt(inc.increment_amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payroll Runs Tab ─────────────────────────────────────────────────────────
function PayrollRunsTab() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRunModal, setNewRunModal] = useState(false);
  const [payslipModal, setPayslipModal] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), academic_year: '', working_days: 26 });
  const [years, setYears] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [insightLoading, setInsightLoading] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({ incentive_amount: 0, increment_amount: 0 });
  const [expandedAi, setExpandedAi] = useState({});
  const { push } = useToast();

  const loadRuns = useCallback(async () => {
    try {
      const [r, y] = await Promise.all([adminApi.getPayrollRuns(), adminApi.getAcademicYears()]);
      setRuns(r.data || []);
      setYears(y.data || []);
    } catch { push('Failed to load.', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const createRun = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await adminApi.createPayrollRun(form);
      push('Payroll run created.', 'success');
      loadRuns(); setNewRunModal(false);
    } catch (err) { push(err?.response?.data?.error || 'Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const processRun = async (run) => {
    if (!confirm(`Process payroll for ${MONTHS_FULL[run.month]} ${run.year}? Salaries will be auto-calculated.`)) return;
    setProcessing(run.id);
    try {
      await adminApi.processPayrollRun(run.id, { working_days: 26 });
      push('Payroll processed! AI insights generated.', 'success');
      loadRuns();
    } catch (err) { push(err?.response?.data?.error || 'Failed.', 'error'); }
    finally { setProcessing(null); }
  };

  const openPayslips = async (runId) => {
    try {
      const r = await adminApi.getPayrollRun(runId);
      setRunDetail(r.data);
      setPayslipModal(runId);
    } catch { push('Failed to load payslips.', 'error'); }
  };

  const generateInsights = async (runId) => {
    setInsightLoading(runId);
    try {
      await adminApi.generatePayrollInsights(runId);
      push('AI insights regenerated!', 'success');
      if (payslipModal === runId) {
        const r = await adminApi.getPayrollRun(runId);
        setRunDetail(r.data);
      }
    } catch { push('Failed to generate insights.', 'error'); }
    finally { setInsightLoading(null); }
  };

  const saveEntry = async (entryId) => {
    try {
      await adminApi.updatePayrollEntry(entryId, editForm);
      push('Entry updated. AI insights refreshed.', 'success');
      const r = await adminApi.getPayrollRun(payslipModal);
      setRunDetail(r.data);
      setEditEntry(null);
    } catch { push('Failed to update.', 'error'); }
  };

  const markPaid = async (runId) => {
    try {
      await adminApi.updatePayrollEntry ? null : null; // placeholder
      await adminApi.getPayrollRun(runId).then(r =>
        Promise.all(r.data.entries.map(e => adminApi.updatePayrollEntry(e.id, { is_paid: true, payment_date: new Date().toISOString().split('T')[0] })))
      );
      push('All payslips marked as paid.', 'success');
      loadRuns();
      const r = await adminApi.getPayrollRun(runId);
      setRunDetail(r.data);
    } catch { push('Failed.', 'error'); }
  };

  const statusCls = (s) => {
    if (s === 'processed') return fStyles.badgePaid;
    if (s === 'paid') return fStyles.badgePaid;
    if (s === 'draft') return fStyles.badgePending;
    return '';
  };

  if (loading) return <div className={fStyles.loading}><Loader2 size={18} className={fStyles.spin}/> Loading…</div>;

  return (
    <div>
      <div className={fStyles.card}>
        <div className={fStyles.cardHeader}>
          <div>
            <h3 className={fStyles.cardTitle}>Payroll Runs</h3>
            <p className={fStyles.cardSubtitle}>Generate and process monthly salaries for all active staff</p>
          </div>
          <button className={fStyles.btnPrimary} onClick={() => setNewRunModal(true)}><Plus size={15}/> New Run</button>
        </div>

        <div className={fStyles.tableResponsive}>
          <table className={fStyles.table}>
            <thead>
              <tr>
                <th>Period</th>
                <th>Academic Year</th>
                <th className={fStyles.textRight}>Staff</th>
                <th className={fStyles.textRight}>Gross</th>
                <th className={fStyles.textRight}>Net Payout</th>
                <th>Status</th>
                <th>Processed By</th>
                <th className={fStyles.textRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0
                ? <tr><td colSpan={8} className={fStyles.emptyState}>No payroll runs yet. Create one to start.</td></tr>
                : runs.map(r => (
                  <tr key={r.id}>
                    <td className={fStyles.textBold}>{MONTHS_FULL[r.month]} {r.year}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{r.academic_year_name || '—'}</td>
                    <td className={fStyles.textRight}>{r.staff_count}</td>
                    <td className={`${fStyles.fontMono} ${fStyles.textRight}`}>₹{fmt(r.total_gross)}</td>
                    <td className={`${fStyles.fontMono} ${fStyles.textRight} ${fStyles.textBold}`}>₹{fmt(r.total_net)}</td>
                    <td><span className={`${fStyles.badge} ${statusCls(r.status)}`}>{r.status.toUpperCase()}</span></td>
                    <td style={{ color: 'var(--finance-text-muted)', fontSize: 13 }}>{r.processed_by_name || '—'}</td>
                    <td>
                      <div className={fStyles.actions}>
                        {r.status === 'draft' && (
                          <button className={fStyles.btnPrimary} onClick={() => processRun(r)} disabled={processing === r.id}>
                            {processing === r.id ? <Loader2 size={13} className={fStyles.spin}/> : <Play size={13}/>} Process
                          </button>
                        )}
                        {r.status !== 'draft' && (
                          <button className={fStyles.btnSecondary}
                            onClick={() => generateInsights(r.id)} disabled={insightLoading === r.id}
                            title="Regenerate AI insights">
                            {insightLoading === r.id ? <Loader2 size={13} className={fStyles.spin}/> : <BrainCircuit size={13}/>}
                          </button>
                        )}
                        <button className={`${fStyles.btnSecondary}`}
                          style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}
                          onClick={() => openPayslips(r.id)}>
                          <FileText size={13}/> Payslips
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Run Modal */}
      {newRunModal && (
        <div className={fStyles.overlay}>
          <div className={fStyles.modal}>
            <div className={fStyles.modalHeader}>
              <h3 className={fStyles.modalTitle}>Create Payroll Run</h3>
              <button className={fStyles.modalClose} onClick={() => setNewRunModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={createRun}>
              <div className={fStyles.modalBody}>
                <div className={fStyles.formRow}>
                  <div className={fStyles.formGroup}>
                    <label className={fStyles.label}>Month</label>
                    <select className={fStyles.input} value={form.month} onChange={e => setForm(p => ({...p, month: +e.target.value}))}>
                      {MONTHS.slice(1).map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div className={fStyles.formGroup}>
                    <label className={fStyles.label}>Year</label>
                    <input className={fStyles.input} type="number" value={form.year} onChange={e => setForm(p => ({...p, year: +e.target.value}))}/>
                  </div>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Academic Year</label>
                  <select className={fStyles.input} value={form.academic_year} onChange={e => setForm(p => ({...p, academic_year: e.target.value}))}>
                    <option value="">Select (optional)…</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Working Days</label>
                  <input className={fStyles.input} type="number" min="1" max="31" value={form.working_days} onChange={e => setForm(p => ({...p, working_days: +e.target.value}))}/>
                </div>
              </div>
              <div className={fStyles.modalFooter}>
                <button type="button" className={fStyles.btnSecondary} onClick={() => setNewRunModal(false)}>Cancel</button>
                <button type="submit" className={fStyles.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={fStyles.spin}/>} Create Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {payslipModal && runDetail && (
        <PayslipModal
          runDetail={runDetail}
          onClose={() => { setPayslipModal(null); setRunDetail(null); }}
          onGenerateInsights={() => generateInsights(payslipModal)}
          insightLoading={insightLoading === payslipModal}
          editEntry={editEntry}
          editForm={editForm}
          setEditEntry={setEditEntry}
          setEditForm={setEditForm}
          onSaveEntry={saveEntry}
          expandedAi={expandedAi}
          setExpandedAi={setExpandedAi}
        />
      )}
    </div>
  );
}

// ─── Payslip Modal Component ──────────────────────────────────────────────────
function PayslipModal({ runDetail, onClose, onGenerateInsights, insightLoading,
  editEntry, editForm, setEditEntry, setEditForm, onSaveEntry, expandedAi, setExpandedAi }) {

  const entries = runDetail?.entries || [];
  const period = `${MONTHS_FULL[runDetail?.month]} ${runDetail?.year}`;
  const totalNet = entries.reduce((s, e) => s + Number(e.net_salary), 0);
  const totalDeductions = entries.reduce((s, e) => s + Number(e.total_deductions), 0);

  const toggleAi = (id) => setExpandedAi(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className={fStyles.overlay}>
      <div className={pStyles.payslipModal}>
        {/* Modal Header */}
        <div className={fStyles.modalHeader}>
          <div>
            <h3 className={fStyles.modalTitle}>Payslips — {period}</h3>
            <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 13, color: 'var(--finance-text-muted)' }}>
              <span>{entries.length} employee(s)</span>
              <span>Net Total: <strong style={{ color: '#065f46' }}>₹{fmt(totalNet)}</strong></span>
              <span>Deductions: <strong style={{ color: '#dc2626' }}>₹{fmt(totalDeductions)}</strong></span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={fStyles.btnSecondary} onClick={onGenerateInsights} disabled={insightLoading} title="Regenerate AI insights">
              {insightLoading ? <Loader2 size={14} className={fStyles.spin}/> : <BrainCircuit size={14}/>}
              {' '}AI Insights
            </button>
            <button className={fStyles.btnSecondary} onClick={() => window.print()}>
              <Printer size={14}/> Print All
            </button>
            <button className={fStyles.modalClose} onClick={onClose}><X size={18}/></button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className={fStyles.emptyState}>
            <AlertCircle size={32} style={{ marginBottom: 12, color: '#8590a6' }}/>
            <div>No payslip entries. Process the payroll run first.</div>
          </div>
        ) : (
          <div className={pStyles.payslipList}>
            {entries.map(entry => (
              <div key={entry.id} className={pStyles.payslipCard}>
                {/* Payslip Header */}
                <div className={pStyles.payslipHead}>
                  <div>
                    <div className={pStyles.payslipSchoolName}>Payslip</div>
                    <div className={pStyles.payslipPeriod}>{period} · Pay Period</div>
                  </div>
                  <div className={pStyles.payslipNetBig}>
                    <div className={pStyles.payslipNetLabel}>Net Pay</div>
                    <div className={pStyles.payslipNetValue}>₹{fmt(entry.net_salary)}</div>
                  </div>
                </div>

                {/* Employee Info */}
                <div className={pStyles.payslipInfo}>
                  <div className={pStyles.payslipInfoItem}>
                    <div className={pStyles.payslipInfoLabel}>Employee</div>
                    <div className={pStyles.payslipInfoValue}>{entry.staff_name}</div>
                  </div>
                  <div className={pStyles.payslipInfoItem}>
                    <div className={pStyles.payslipInfoLabel}>Employee ID</div>
                    <div className={pStyles.payslipInfoValue}>{entry.employee_id}</div>
                  </div>
                  <div className={pStyles.payslipInfoItem}>
                    <div className={pStyles.payslipInfoLabel}>Designation</div>
                    <div className={pStyles.payslipInfoValue}>{entry.designation}</div>
                  </div>
                </div>

                {/* Attendance Info */}
                <div className={pStyles.payslipAttRow}>
                  <div className={pStyles.payslipAttItem}>
                    <span className={pStyles.payslipAttKey}>Working Days:</span>
                    <span>{entry.working_days}</span>
                  </div>
                  <div className={pStyles.payslipAttItem}>
                    <span className={pStyles.payslipAttKey}>Paid Days:</span>
                    <span>{entry.paid_days}</span>
                  </div>
                  <div className={pStyles.payslipAttItem}>
                    <span className={pStyles.payslipAttKey}>Attendance:</span>
                    <span style={{ color: Number(entry.attendance_pct) >= 95 ? '#065f46' : Number(entry.attendance_pct) >= 75 ? '#92400e' : '#dc2626', fontWeight: 700 }}>
                      {Number(entry.attendance_pct).toFixed(0)}%
                    </span>
                  </div>
                  <div className={pStyles.payslipAttItem}>
                    <span className={pStyles.payslipAttKey}>Status:</span>
                    <span style={{ color: entry.is_paid ? '#065f46' : '#8590a6', fontWeight: 600 }}>
                      {entry.is_paid ? '✓ Paid' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Earnings & Deductions */}
                <div className={pStyles.payslipBreakdown}>
                  <div className={pStyles.payslipCol}>
                    <div className={pStyles.payslipColTitle}>Earnings</div>
                    <div className={pStyles.payslipRow}>
                      <span className={pStyles.payslipRowLabel}>Basic Salary</span>
                      <span className={pStyles.payslipRowValue}>₹{fmt(entry.basic_salary)}</span>
                    </div>
                    <div className={pStyles.payslipRow}>
                      <span className={pStyles.payslipRowLabel}>HRA</span>
                      <span className={pStyles.payslipRowValue}>₹{fmt(entry.hra)}</span>
                    </div>
                    <div className={pStyles.payslipRow}>
                      <span className={pStyles.payslipRowLabel}>DA</span>
                      <span className={pStyles.payslipRowValue}>₹{fmt(entry.da)}</span>
                    </div>
                    <div className={pStyles.payslipRow}>
                      <span className={pStyles.payslipRowLabel}>Transport Allow.</span>
                      <span className={pStyles.payslipRowValue}>₹{fmt(entry.ta)}</span>
                    </div>
                    <div className={pStyles.payslipRow}>
                      <span className={pStyles.payslipRowLabel}>Other Allow.</span>
                      <span className={pStyles.payslipRowValue}>₹{fmt(entry.other_allowances)}</span>
                    </div>
                    {Number(entry.increment_amount) > 0 && (
                      <div className={pStyles.payslipRow}>
                        <span className={pStyles.payslipRowLabel} style={{ color: '#065f46' }}>▲ Increment</span>
                        <span className={pStyles.payslipRowValue} style={{ color: '#065f46' }}>₹{fmt(entry.increment_amount)}</span>
                      </div>
                    )}
                    {Number(entry.incentive_amount) > 0 && (
                      <div className={pStyles.payslipRow}>
                        <span className={pStyles.payslipRowLabel} style={{ color: '#5b21b6' }}>★ Incentive</span>
                        <span className={pStyles.payslipRowValue} style={{ color: '#5b21b6' }}>₹{fmt(entry.incentive_amount)}</span>
                      </div>
                    )}
                    <div className={pStyles.payslipTotalRow}>
                      <span>Gross Total</span>
                      <span className={pStyles.payslipTotalEarn}>₹{fmt(entry.gross_salary)}</span>
                    </div>
                  </div>

                  <div className={pStyles.payslipCol}>
                    <div className={pStyles.payslipColTitle}>Deductions</div>
                    {Number(entry.pf_deduction) > 0 && (
                      <div className={pStyles.payslipRow}>
                        <span className={pStyles.payslipRowLabel}>Provident Fund (PF)</span>
                        <span className={pStyles.payslipRowValue}>₹{fmt(entry.pf_deduction)}</span>
                      </div>
                    )}
                    {Number(entry.esi_deduction) > 0 && (
                      <div className={pStyles.payslipRow}>
                        <span className={pStyles.payslipRowLabel}>ESI</span>
                        <span className={pStyles.payslipRowValue}>₹{fmt(entry.esi_deduction)}</span>
                      </div>
                    )}
                    {Number(entry.tds_deduction) > 0 && (
                      <div className={pStyles.payslipRow}>
                        <span className={pStyles.payslipRowLabel}>TDS</span>
                        <span className={pStyles.payslipRowValue}>₹{fmt(entry.tds_deduction)}</span>
                      </div>
                    )}
                    {Number(entry.other_deductions) > 0 && (
                      <div className={pStyles.payslipRow}>
                        <span className={pStyles.payslipRowLabel}>Other</span>
                        <span className={pStyles.payslipRowValue}>₹{fmt(entry.other_deductions)}</span>
                      </div>
                    )}
                    <div className={pStyles.payslipTotalRow}>
                      <span>Total Deductions</span>
                      <span className={pStyles.payslipTotalDeduct}>₹{fmt(entry.total_deductions)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay Banner */}
                <div className={pStyles.payslipNetRow}>
                  <span className={pStyles.payslipNetRowLabel}>NET PAY</span>
                  <span className={pStyles.payslipNetRowValue}>₹{fmt(entry.net_salary)}</span>
                </div>

                {/* Edit Entry Row */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9' }}>
                  {editEntry !== entry.id ? (
                    <button className={fStyles.btnSecondary} style={{ fontSize: 12 }} onClick={() => { setEditEntry(entry.id); setEditForm({ incentive_amount: entry.incentive_amount, increment_amount: entry.increment_amount }); }}>
                      <Pencil size={12}/> Edit Incentive / Increment
                    </button>
                  ) : (
                    <div className={pStyles.editEntryRow}>
                      <div className={pStyles.editEntryField}>
                        <span className={pStyles.editEntryLabel}>Incentive (₹)</span>
                        <input className={pStyles.editEntryInput} type="number" min="0" step="100" value={editForm.incentive_amount} onChange={e => setEditForm(p => ({...p, incentive_amount: e.target.value}))}/>
                      </div>
                      <div className={pStyles.editEntryField}>
                        <span className={pStyles.editEntryLabel}>Increment (₹)</span>
                        <input className={pStyles.editEntryInput} type="number" min="0" step="100" value={editForm.increment_amount} onChange={e => setEditForm(p => ({...p, increment_amount: e.target.value}))}/>
                      </div>
                      <button className={fStyles.btnPrimary} style={{ fontSize: 12 }} onClick={() => onSaveEntry(entry.id)}>
                        <CheckCircle2 size={13}/> Save & Refresh AI
                      </button>
                      <button className={fStyles.btnSecondary} style={{ fontSize: 12 }} onClick={() => setEditEntry(null)}><X size={13}/></button>
                    </div>
                  )}
                </div>

                {/* AI Brain Insights */}
                {(entry.ai_overall_summary || entry.ai_deduction_reason) && (
                  <div style={{ padding: '0 20px 16px' }}>
                    <button
                      onClick={() => toggleAi(entry.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#5b21b6', fontSize: 12, fontWeight: 700, padding: 0 }}>
                      <BrainCircuit size={13}/>
                      AI Brain Analysis
                      {expandedAi[entry.id] ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                    </button>
                    {expandedAi[entry.id] && (
                      <div className={pStyles.aiInsightBox}>
                        <div className={pStyles.aiInsightHeader}><BrainCircuit size={11}/> AI Brain Engine</div>
                        {entry.ai_overall_summary && (
                          <div className={pStyles.aiInsightSummary}>{entry.ai_overall_summary}</div>
                        )}
                        {entry.ai_deduction_reason && (
                          <div className={pStyles.aiReasonRow}>
                            <div className={pStyles.aiReasonLabel}>Deduction Reasoning</div>
                            <div className={pStyles.aiReasonText}>{entry.ai_deduction_reason}</div>
                          </div>
                        )}
                        {entry.ai_increment_reason && (
                          <div className={pStyles.aiReasonRow}>
                            <div className={pStyles.aiReasonLabel}>Increment Reasoning</div>
                            <div className={pStyles.aiReasonText}>{entry.ai_increment_reason}</div>
                          </div>
                        )}
                        {entry.ai_incentive_reason && (
                          <div className={pStyles.aiReasonRow}>
                            <div className={pStyles.aiReasonLabel}>Incentive Reasoning</div>
                            <div className={pStyles.aiReasonText}>{entry.ai_incentive_reason}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Salary Structures Tab ────────────────────────────────────────────────────
function SalaryStructuresTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ designation: '', basic_salary: 0, hra_percent: 0, da_percent: 0, ta_amount: 0, medical_allowance: 0, other_allowances: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();
  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  const load = async () => {
    setLoading(true);
    try { setItems((await adminApi.getSalaryStructures()).data || []); }
    catch { push('Failed.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openModal = (item = null) => {
    setForm(item ? {...item} : { designation: '', basic_salary: 0, hra_percent: 0, da_percent: 0, ta_amount: 0, medical_allowance: 0, other_allowances: 0, is_active: true });
    setModal(item || {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await adminApi.updateSalaryStructure(modal.id, form);
      else await adminApi.createSalaryStructure(form);
      push('Saved.', 'success'); load(); setModal(null);
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this salary structure?')) return;
    try { await adminApi.deleteSalaryStructure(id); setItems(p => p.filter(i => i.id !== id)); push('Deleted.', 'success'); }
    catch { push('Failed.', 'error'); }
  };

  if (loading) return <div className={fStyles.loading}><Loader2 size={18} className={fStyles.spin}/> Loading…</div>;

  return (
    <div className={fStyles.card}>
      <div className={fStyles.cardHeader}>
        <div>
          <h3 className={fStyles.cardTitle}>Salary Structures</h3>
          <p className={fStyles.cardSubtitle}>Define base salaries and allowance ratios by designation</p>
        </div>
        <button className={fStyles.btnPrimary} onClick={() => openModal()}><Plus size={15}/> New Structure</button>
      </div>
      <div className={fStyles.tableResponsive}>
        <table className={fStyles.table}>
          <thead>
            <tr>
              <th>Designation</th>
              <th className={fStyles.textRight}>Basic (₹)</th>
              <th className={fStyles.textRight}>HRA %</th>
              <th className={fStyles.textRight}>DA %</th>
              <th className={fStyles.textRight}>Transport</th>
              <th className={fStyles.textRight}>Medical</th>
              <th className={fStyles.textRight}>Gross (₹)</th>
              <th>Status</th>
              <th className={fStyles.textRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0
              ? <tr><td colSpan={9} className={fStyles.emptyState}>No structures defined. Add one to start processing payroll.</td></tr>
              : items.map(s => (
                <tr key={s.id}>
                  <td className={fStyles.textBold}>{s.designation}</td>
                  <td className={`${fStyles.fontMono} ${fStyles.textRight}`}>₹{fmt(s.basic_salary)}</td>
                  <td className={fStyles.textRight} style={{ color: 'var(--finance-text-muted)' }}>{s.hra_percent}%</td>
                  <td className={fStyles.textRight} style={{ color: 'var(--finance-text-muted)' }}>{s.da_percent}%</td>
                  <td className={`${fStyles.fontMono} ${fStyles.textRight}`}>₹{fmt(s.ta_amount)}</td>
                  <td className={`${fStyles.fontMono} ${fStyles.textRight}`}>₹{fmt(s.medical_allowance)}</td>
                  <td className={`${fStyles.fontMono} ${fStyles.textRight} ${fStyles.textBold}`}>₹{fmt(s.gross_salary)}</td>
                  <td><span className={`${fStyles.badge} ${s.is_active ? fStyles.badgePaid : ''}`}>{s.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  <td>
                    <div className={fStyles.actions}>
                      <button className={fStyles.iconBtn} onClick={() => openModal(s)}><Pencil size={14}/></button>
                      <button className={`${fStyles.iconBtn} ${fStyles.iconBtnDanger}`} onClick={() => del(s.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className={fStyles.overlay}>
          <div className={fStyles.modal} style={{ maxWidth: 660 }}>
            <div className={fStyles.modalHeader}>
              <h3 className={fStyles.modalTitle}>{modal?.id ? 'Edit Salary Structure' : 'New Salary Structure'}</h3>
              <button className={fStyles.modalClose} onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={fStyles.modalBody} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={fStyles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={fStyles.label}>Designation *</label>
                  <input className={fStyles.input} value={form.designation} onChange={e => set('designation', e.target.value)} required placeholder="e.g., Senior Teacher"/>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Basic Salary (₹)</label>
                  <input className={fStyles.input} type="number" min="0" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)}/>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>HRA (%)</label>
                  <input className={fStyles.input} type="number" min="0" max="100" step="0.5" value={form.hra_percent} onChange={e => set('hra_percent', e.target.value)}/>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>DA (%)</label>
                  <input className={fStyles.input} type="number" min="0" max="100" step="0.5" value={form.da_percent} onChange={e => set('da_percent', e.target.value)}/>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Transport Allowance (₹)</label>
                  <input className={fStyles.input} type="number" min="0" value={form.ta_amount} onChange={e => set('ta_amount', e.target.value)}/>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Medical Allowance (₹)</label>
                  <input className={fStyles.input} type="number" min="0" value={form.medical_allowance} onChange={e => set('medical_allowance', e.target.value)}/>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Other Allowances (₹)</label>
                  <input className={fStyles.input} type="number" min="0" value={form.other_allowances} onChange={e => set('other_allowances', e.target.value)}/>
                </div>
                <div className={fStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="active_str" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }}/>
                  <label htmlFor="active_str" className={fStyles.label} style={{ cursor: 'pointer', marginBottom: 0 }}>Active</label>
                </div>
              </div>
              <div className={fStyles.modalFooter}>
                <button type="button" className={fStyles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={fStyles.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={fStyles.spin}/>} Save Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deductions Tab ───────────────────────────────────────────────────────────
function DeductionsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', calculation_type: 'percent', value: 0, is_mandatory: true, is_active: true });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems((await adminApi.getDeductionTypes()).data || []); }
    catch { push('Failed.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openModal = (item = null) => {
    setForm(item ? {...item} : { name: '', calculation_type: 'percent', value: 0, is_mandatory: true, is_active: true });
    setModal(item || {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await adminApi.updateDeductionType(modal.id, form);
      else await adminApi.createDeductionType(form);
      push('Saved.', 'success'); load(); setModal(null);
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className={fStyles.loading}><Loader2 size={18} className={fStyles.spin}/> Loading…</div>;

  return (
    <div className={fStyles.card}>
      <div className={fStyles.cardHeader}>
        <div>
          <h3 className={fStyles.cardTitle}>Deduction Configuration</h3>
          <p className={fStyles.cardSubtitle}>Manage statutory and voluntary payroll deductions (PF, ESI, TDS, etc.)</p>
        </div>
        <button className={fStyles.btnPrimary} onClick={() => openModal()}><Plus size={15}/> Add Deduction</button>
      </div>
      <div className={fStyles.tableResponsive}>
        <table className={fStyles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Calculation Rule</th>
              <th>Type</th>
              <th>Status</th>
              <th className={fStyles.textRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0
              ? <tr><td colSpan={5} className={fStyles.emptyState}>No deductions configured. Standard deductions (PF, ESI, TDS) are recommended.</td></tr>
              : items.map(d => (
                <tr key={d.id}>
                  <td className={fStyles.textBold}>{d.name}</td>
                  <td className={fStyles.fontMono} style={{ color: 'var(--finance-text-muted)' }}>
                    {d.calculation_type === 'fixed' ? `₹${fmt(d.value)} fixed` : `${d.value}% of basic`}
                  </td>
                  <td><span className={`${fStyles.badge} ${d.is_mandatory ? fStyles.badgePending : ''}`}>{d.is_mandatory ? 'MANDATORY' : 'OPTIONAL'}</span></td>
                  <td><span className={`${fStyles.badge} ${d.is_active ? fStyles.badgePaid : fStyles.badgeDanger}`}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  <td>
                    <div className={fStyles.actions}>
                      <button className={fStyles.iconBtn} onClick={() => openModal(d)}><Pencil size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className={fStyles.overlay}>
          <div className={fStyles.modal}>
            <div className={fStyles.modalHeader}>
              <h3 className={fStyles.modalTitle}>{modal?.id ? 'Edit Deduction' : 'New Deduction'}</h3>
              <button className={fStyles.modalClose} onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={fStyles.modalBody}>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Name *</label>
                  <input className={fStyles.input} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required placeholder="e.g., Provident Fund (PF)"/>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Calculation Rule</label>
                  <select className={fStyles.input} value={form.calculation_type} onChange={e => setForm(p => ({...p, calculation_type: e.target.value}))}>
                    <option value="percent">% of Basic Salary</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>{form.calculation_type === 'percent' ? 'Percentage (%)' : 'Amount (₹)'}</label>
                  <input className={fStyles.input} type="number" min="0" step="0.01" value={form.value} onChange={e => setForm(p => ({...p, value: e.target.value}))}/>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm(p => ({...p, is_mandatory: e.target.checked}))}/>
                    Mandatory Deduction
                  </label>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({...p, is_active: e.target.checked}))}/>
                    Active
                  </label>
                </div>
              </div>
              <div className={fStyles.modalFooter}>
                <button type="button" className={fStyles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={fStyles.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={fStyles.spin}/>} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Increments Tab ───────────────────────────────────────────────────────────
function IncrementsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ staff: '', increment_type: 'annual', old_basic: 0, new_basic: 0, reason: '', effective_from: new Date().toISOString().split('T')[0] });
  const [aiReason, setAiReason] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const incAmt = () => Math.max(0, Number(form.new_basic) - Number(form.old_basic));
  const incPct = () => Number(form.old_basic) ? ((incAmt() / Number(form.old_basic)) * 100).toFixed(1) : 0;

  const load = async () => {
    setLoading(true);
    try {
      const [inc, st] = await Promise.all([adminApi.getIncrements(), adminApi.getStaff()]);
      setItems(inc.data || []);
      setStaff(st.data?.results || st.data || []);
    } catch { push('Failed.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openModal = (item = null) => {
    setAiReason('');
    if (item) {
      setForm({ staff: item.staff, increment_type: item.increment_type, old_basic: item.old_basic, new_basic: item.new_basic, reason: item.reason, effective_from: item.effective_from });
      setAiReason(item.ai_reason || '');
    } else {
      setForm({ staff: '', increment_type: 'annual', old_basic: 0, new_basic: 0, reason: '', effective_from: new Date().toISOString().split('T')[0] });
    }
    setModal(item || {});
  };

  const onStaffChange = (staffId) => {
    setForm(p => ({ ...p, staff: staffId }));
    // Auto-fill old_basic from staff's existing structure if available
  };

  const generateReason = async () => {
    if (!form.staff || !form.new_basic) { push('Select staff and fill basic salary values first.', 'error'); return; }
    setAiLoading(true);
    try {
      const r = await adminApi.generateIncrementAiReason({
        staff_id: form.staff,
        increment_type: form.increment_type,
        old_basic: form.old_basic,
        new_basic: form.new_basic,
        reason: form.reason,
      });
      setAiReason(r.data.ai_reason || '');
      push('AI reason generated!', 'success');
    } catch { push('Failed to generate AI reason.', 'error'); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, ai_reason: aiReason };
      if (modal?.id) await adminApi.updateIncrement(modal.id, payload);
      else await adminApi.createIncrement(payload);
      push('Saved.', 'success'); load(); setModal(null);
    } catch (err) { push(err?.response?.data?.error || 'Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this increment record?')) return;
    try { await adminApi.deleteIncrement(id); load(); push('Deleted.', 'success'); }
    catch { push('Failed.', 'error'); }
  };

  const typeClass = (t) => {
    const m = { merit: pStyles.badgeMerit, promotion: pStyles.badgePromotion, annual: pStyles.badgeAnnual, adjustment: pStyles.badgeAdjust };
    return m[t] || '';
  };

  if (loading) return <div className={fStyles.loading}><Loader2 size={18} className={fStyles.spin}/> Loading…</div>;

  return (
    <div className={fStyles.card}>
      <div className={fStyles.cardHeader}>
        <div>
          <h3 className={fStyles.cardTitle}>Increment & Revision History</h3>
          <p className={fStyles.cardSubtitle}>Track salary revisions with AI Brain-generated justifications</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={pStyles.aiBadge}><BrainCircuit size={10}/> AI Reasoning</span>
          <button className={fStyles.btnPrimary} onClick={() => openModal()}><Plus size={15}/> Add Increment</button>
        </div>
      </div>

      <div className={fStyles.tableResponsive}>
        <table className={fStyles.table}>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Designation</th>
              <th>Type</th>
              <th className={fStyles.textRight}>Old Basic</th>
              <th className={fStyles.textRight}>New Basic</th>
              <th className={fStyles.textRight}>Increment</th>
              <th>Effective From</th>
              <th>AI Reason (Preview)</th>
              <th className={fStyles.textRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0
              ? <tr><td colSpan={9} className={fStyles.emptyState}>No increment records yet. Add one to track salary revisions.</td></tr>
              : items.map(inc => (
                <tr key={inc.id}>
                  <td className={fStyles.textBold}>{inc.staff_name}</td>
                  <td style={{ color: 'var(--finance-text-muted)', fontSize: 13 }}>{inc.designation}</td>
                  <td>
                    <span className={`${fStyles.badge} ${typeClass(inc.increment_type)}`}>
                      {inc.increment_type_display}
                    </span>
                  </td>
                  <td className={`${fStyles.fontMono} ${fStyles.textRight}`}>₹{fmt(inc.old_basic)}</td>
                  <td className={`${fStyles.fontMono} ${fStyles.textRight}`}>₹{fmt(inc.new_basic)}</td>
                  <td className={fStyles.textRight}>
                    <span className={pStyles.incrementAmount}>+₹{fmt(inc.increment_amount)}</span>
                    <div className={pStyles.incrementOldNew}>
                      {inc.old_basic > 0 ? `+${((inc.increment_amount / inc.old_basic) * 100).toFixed(1)}%` : ''}
                    </div>
                  </td>
                  <td>{inc.effective_from}</td>
                  <td style={{ maxWidth: 260 }}>
                    {inc.ai_reason ? (
                      <span style={{ fontSize: 12, color: '#5b21b6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        <BrainCircuit size={10} style={{ display: 'inline', marginRight: 4 }}/>{inc.ai_reason}
                      </span>
                    ) : <span style={{ color: '#8590a6', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <div className={fStyles.actions}>
                      <button className={fStyles.iconBtn} onClick={() => openModal(inc)}><Pencil size={14}/></button>
                      <button className={`${fStyles.iconBtn} ${fStyles.iconBtnDanger}`} onClick={() => del(inc.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Increment Modal */}
      {modal !== null && (
        <div className={fStyles.overlay}>
          <div className={fStyles.modal} style={{ maxWidth: 600 }}>
            <div className={fStyles.modalHeader}>
              <h3 className={fStyles.modalTitle}>{modal?.id ? 'Edit Increment' : 'Record New Increment'}</h3>
              <button className={fStyles.modalClose} onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={fStyles.modalBody}>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Staff Member *</label>
                  <select className={fStyles.input} value={form.staff} onChange={e => onStaffChange(e.target.value)} required>
                    <option value="">Select staff…</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.user?.first_name} {s.user?.last_name} — {s.designation}</option>)}
                  </select>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Increment Type</label>
                  <select className={fStyles.input} value={form.increment_type} onChange={e => setForm(p => ({...p, increment_type: e.target.value}))}>
                    {INC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className={fStyles.formRow}>
                  <div className={fStyles.formGroup}>
                    <label className={fStyles.label}>Old Basic (₹)</label>
                    <input className={fStyles.input} type="number" min="0" value={form.old_basic} onChange={e => setForm(p => ({...p, old_basic: e.target.value}))}/>
                  </div>
                  <div className={fStyles.formGroup}>
                    <label className={fStyles.label}>New Basic (₹)</label>
                    <input className={fStyles.input} type="number" min="0" value={form.new_basic} onChange={e => setForm(p => ({...p, new_basic: e.target.value}))}/>
                  </div>
                </div>
                {incAmt() > 0 && (
                  <div style={{ background: '#d1fae5', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#065f46', fontWeight: 600, marginBottom: 12 }}>
                    Increment: ₹{fmt(incAmt())} / month (+{incPct()}%)
                  </div>
                )}
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Effective From</label>
                  <input className={fStyles.input} type="date" value={form.effective_from} onChange={e => setForm(p => ({...p, effective_from: e.target.value}))} required/>
                </div>
                <div className={fStyles.formGroup}>
                  <label className={fStyles.label}>Reason (HR Notes)</label>
                  <textarea className={`${fStyles.input} ${fStyles.textarea}`} value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} placeholder="e.g., Annual performance review — exceeds expectations"/>
                </div>
                {/* AI Reason */}
                <div className={fStyles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className={fStyles.label}>AI Brain Justification</label>
                    <button type="button" className={fStyles.btnSecondary} style={{ fontSize: 12, gap: 5 }} onClick={generateReason} disabled={aiLoading}>
                      {aiLoading ? <Loader2 size={12} className={fStyles.spin}/> : <Sparkles size={12}/>}
                      Generate AI Reason
                    </button>
                  </div>
                  <textarea
                    className={`${fStyles.input} ${fStyles.textarea}`}
                    style={{ background: aiReason ? '#f5f3ff' : undefined, borderColor: aiReason ? '#c4b5fd' : undefined, minHeight: 90 }}
                    value={aiReason}
                    onChange={e => setAiReason(e.target.value)}
                    placeholder="Click 'Generate AI Reason' to auto-generate a justification based on staff performance data, or type one manually."/>
                </div>
              </div>
              <div className={fStyles.modalFooter}>
                <button type="button" className={fStyles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={fStyles.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={fStyles.spin}/>} Save Increment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [active, setActive] = useState('overview');

  const VIEWS = {
    overview:   <OverviewTab/>,
    runs:       <PayrollRunsTab/>,
    structures: <SalaryStructuresTab/>,
    deductions: <DeductionsTab/>,
    increments: <IncrementsTab/>,
  };

  return (
    <div className={fStyles.financeModule}>
      <div className={fStyles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className={fStyles.pageTitle}>Payroll Management</h1>
            <p className={fStyles.pageSubtitle}>
              Salary structures · Monthly payroll runs · Deductions · Increments · AI Brain insights
            </p>
          </div>
          <span className={pStyles.aiBadge} style={{ marginTop: 4 }}><BrainCircuit size={11}/> AI Brain Active</span>
        </div>
      </div>

      <FinanceTabs tabs={NAV} activeTab={active} onTabChange={setActive}/>

      <div>{VIEWS[active]}</div>
    </div>
  );
}
