'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Play, FileText, BarChart2, Minus } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import FinanceTabs from '../shared/FinanceTabs';
import styles from '../shared/FinanceLayout.module.css';

const NAV = [
  { key: 'structures', label: 'Salary Structures', icon: <BarChart2 size={18} /> },
  { key: 'deductions', label: 'Deductions',         icon: <Minus size={18} /> },
  { key: 'runs',       label: 'Payroll Runs',        icon: <Play size={18} /> },
];

// ─── Salary Structure Tab ─────────────────────────────────────────────────────
function SalaryStructuresTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ designation: '', basic_salary: 0, hra_percent: 0, da_percent: 0, ta_amount: 0, medical_allowance: 0, other_allowances: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { fetch_(); }, []);
  const fetch_ = async () => {
    setLoading(true);
    try { setItems((await adminApi.getSalaryStructures()).data || []); }
    catch { push('Failed.', 'error'); }
    finally { setLoading(false); }
  };

  const openModal = (item = null) => {
    setForm(item ? { ...item } : { designation: '', basic_salary: 0, hra_percent: 0, da_percent: 0, ta_amount: 0, medical_allowance: 0, other_allowances: 0, is_active: true });
    setModal(item || {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await adminApi.updateSalaryStructure(modal.id, form);
      else await adminApi.createSalaryStructure(form);
      push('Saved.', 'success'); fetch_(); setModal(null);
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete Salary Structure?')) return;
    try { await adminApi.deleteSalaryStructure(id); setItems(p => p.filter(i => i.id !== id)); push('Deleted.', 'success'); }
    catch { push('Failed.', 'error'); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading salary structures...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
         <div>
           <h3 className={styles.cardTitle}>Salary Structures</h3>
           <p className={styles.cardSubtitle}>Define base salaries and allowances by designation</p>
         </div>
         <button className={styles.btnPrimary} onClick={() => openModal()}><Plus size={15} /> New Structure</button>
      </div>
      
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr><th>Designation</th><th className={styles.textRight}>Basic (₹)</th><th className={styles.textRight}>HRA %</th><th className={styles.textRight}>DA %</th><th className={styles.textRight}>Gross (₹)</th><th>Status</th><th className={styles.textRight}>Actions</th></tr>
          </thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={7} className={styles.emptyState}>No structures defined yet. Add one to start processing payroll.</td></tr> : items.map(s => (
              <tr key={s.id}>
                <td className={styles.textBold}>{s.designation}</td>
                <td className={`${styles.fontMono} ${styles.textRight}`}>₹{Number(s.basic_salary).toLocaleString('en-IN')}</td>
                <td className={styles.textRight} style={{ color: 'var(--finance-text-muted)' }}>{s.hra_percent}%</td>
                <td className={styles.textRight} style={{ color: 'var(--finance-text-muted)' }}>{s.da_percent}%</td>
                <td className={`${styles.fontMono} ${styles.textRight} ${styles.textBold}`}>₹{Number(s.gross_salary).toLocaleString('en-IN')}</td>
                <td><span className={`${styles.badge} ${s.is_active ? styles.badgePaid : ''}`}>{s.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.iconBtn} onClick={() => openModal(s)}><Pencil size={14} /></button>
                    <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => del(s.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className={styles.overlay}>
          <div className={styles.modal} style={{ maxWidth: 640 }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{modal?.id ? 'Edit Salary Structure' : 'New Salary Structure'}</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Designation *</label>
                  <input className={styles.input} value={form.designation} onChange={e => set('designation', e.target.value)} required placeholder="e.g., Senior Professor" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Basic Salary (₹)</label>
                  <input className={styles.input} type="number" min="0" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>HRA (%)</label>
                  <input className={styles.input} type="number" min="0" max="100" value={form.hra_percent} onChange={e => set('hra_percent', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>DA (%)</label>
                  <input className={styles.input} type="number" min="0" max="100" value={form.da_percent} onChange={e => set('da_percent', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Transport Allowance (₹)</label>
                  <input className={styles.input} type="number" min="0" value={form.ta_amount} onChange={e => set('ta_amount', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Medical Allowance (₹)</label>
                  <input className={styles.input} type="number" min="0" value={form.medical_allowance} onChange={e => set('medical_allowance', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Other Allowances (₹)</label>
                  <input className={styles.input} type="number" min="0" value={form.other_allowances} onChange={e => set('other_allowances', e.target.value)} />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <label className={styles.label} style={{ cursor: 'pointer' }} onClick={() => set('is_active', !form.is_active)}>Active</label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving && <Loader2 size={14} className={styles.spin} />} Save</button>
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
  const [form, setForm] = useState({ name: '', calculation_type: 'fixed', value: 0, is_mandatory: false, is_active: true });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => { fetch_(); }, []);
  const fetch_ = async () => {
    setLoading(true);
    try { setItems((await adminApi.getDeductionTypes()).data || []); }
    catch { push('Failed.', 'error'); }
    finally { setLoading(false); }
  };

  const openModal = (item = null) => {
    setForm(item ? { ...item } : { name: '', calculation_type: 'fixed', value: 0, is_mandatory: false, is_active: true });
    setModal(item || {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await adminApi.updateDeductionType(modal.id, form);
      else await adminApi.createDeductionType(form);
      push('Saved.', 'success'); fetch_(); setModal(null);
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading deductions...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
         <div>
           <h3 className={styles.cardTitle}>Deduction Config</h3>
           <p className={styles.cardSubtitle}>Manage tax, PF, ESI, and other payroll deductions</p>
         </div>
         <button className={styles.btnPrimary} onClick={() => openModal()}><Plus size={15} /> Add Deduction</button>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr><th>Name</th><th>Calculation Rule</th><th>Status</th><th>Type</th><th className={styles.textRight}>Actions</th></tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id}>
                <td className={styles.textBold}>{d.name}</td>
                <td className={styles.fontMono} style={{ color: 'var(--finance-text-muted)' }}>
                  {d.calculation_type === 'fixed' ? `₹${d.value} fixed` : `${d.value}% of basic`}
                </td>
                <td><span className={`${styles.badge} ${d.is_active ? styles.badgePaid : ''}`}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                <td><span className={`${styles.badge} ${d.is_mandatory ? styles.badgePending : ''}`}>{d.is_mandatory ? 'MANDATORY' : 'OPTIONAL'}</span></td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.iconBtn} onClick={() => openModal(d)}><Pencil size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{modal?.id ? 'Edit Deduction' : 'New Deduction'}</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name *</label>
                  <input className={styles.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Calculation Rule</label>
                  <select className={styles.input} value={form.calculation_type} onChange={e => setForm(p => ({ ...p, calculation_type: e.target.value }))}>
                    <option value="fixed">Fixed Amount (₹)</option>
                    <option value="percent">Percentage of Basic (%)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Value</label>
                  <input className={styles.input} type="number" min="0" step="0.01" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
                </div>
                <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
                  <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm(p => ({ ...p, is_mandatory: e.target.checked }))} style={{ cursor: 'pointer' }} />
                  <label className={styles.label} style={{ cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, is_mandatory: !p.is_mandatory }))}>Mandatory Deduction</label>
                </div>
                <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ cursor: 'pointer' }} />
                  <label className={styles.label} style={{ cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}>Active</label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving && <Loader2 size={14} className={styles.spin} />} Save</button>
              </div>
            </form>
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
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), academic_year: '' });
  const [years, setYears] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  useEffect(() => {
    Promise.all([adminApi.getPayrollRuns(), adminApi.getAcademicYears()])
      .then(([r, y]) => { setRuns(r.data || []); setYears(y.data || []); })
      .catch(() => push('Failed.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const createRun = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await adminApi.createPayrollRun(form);
      push('Payroll run created.', 'success');
      const r = await adminApi.getPayrollRuns(); setRuns(r.data || []);
      setNewRunModal(false);
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const processRun = async (id) => {
    if (!confirm('Process payroll for all active staff? This will auto-calculate salaries.')) return;
    setProcessing(id);
    try {
      await adminApi.processPayrollRun(id);
      push('Payroll processed!', 'success');
      const r = await adminApi.getPayrollRuns(); setRuns(r.data || []);
    } catch (e) {
      push(e?.response?.data?.error || 'Failed to process.', 'error');
    } finally { setProcessing(null); }
  };

  const openPayslips = async (runId) => {
    try {
      const r = await adminApi.getPayrollRun(runId);
      setRunDetail(r.data);
      setPayslipModal(runId);
    } catch { push('Failed to load payslips.', 'error'); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading runs...</div>;

  const statusBadge = (s) => {
    if (s === 'processed') return styles.badgePaid;
    if (s === 'draft') return styles.badgePending;
    return '';
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
           <h3 className={styles.cardTitle}>Payroll Runs</h3>
           <p className={styles.cardSubtitle}>Generate pay slips and process monthly salaries</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setNewRunModal(true)}><Plus size={15} /> New Run</button>
      </div>
      
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr><th>Period</th><th>Academic Year</th><th className={styles.textRight}>Staff</th><th className={styles.textRight}>Total Net</th><th>Status</th><th className={styles.textRight}>Actions</th></tr>
          </thead>
          <tbody>
            {runs.length === 0 ? <tr><td colSpan={6} className={styles.emptyState}>No payroll runs. Create one to start.</td></tr> : runs.map(r => (
              <tr key={r.id}>
                <td className={styles.textBold}>{MONTHS[r.month - 1]} {r.year}</td>
                <td style={{ color: 'var(--finance-text-muted)' }}>{r.academic_year_name || '—'}</td>
                <td className={styles.textRight}>{r.staff_count}</td>
                <td className={`${styles.fontMono} ${styles.textRight} ${styles.textBold}`}>₹{Number(r.total_net).toLocaleString('en-IN')}</td>
                <td><span className={`${styles.badge} ${statusBadge(r.status)}`}>{r.status}</span></td>
                <td>
                  <div className={styles.actions}>
                    {r.status === 'draft' && (
                      <button className={styles.btnSecondary} onClick={() => processRun(r.id)} disabled={processing === r.id}>
                        {processing === r.id ? <Loader2 size={14} className={styles.spin} /> : <Play size={14} />} Process
                      </button>
                    )}
                    <button className={styles.btnSecondary} style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }} onClick={() => openPayslips(r.id)}>
                      <FileText size={14} /> Payslips
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {newRunModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create Payroll Run</h3>
              <button className={styles.modalClose} onClick={() => setNewRunModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={createRun}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Month</label>
                  <select className={styles.input} value={form.month} onChange={e => setForm(p => ({ ...p, month: Number(e.target.value) }))}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Year</label>
                  <input className={styles.input} type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Academic Year</label>
                  <select className={styles.input} value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))}>
                    <option value="">Select...</option>{years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setNewRunModal(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving && <Loader2 size={14} className={styles.spin} />} Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal style for Payslip Print Modal */}
      <style dangerouslySetInnerHTML={{__html: `
        .psModal { background: #fff; width: 100%; max-width: 860px; max-height: 90vh; display: flex; flex-direction: column; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); }
        .psList { overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; background: #f0f4f9; }
        .psCard { background: #fff; border: 1px solid #dfe3e8; border-radius: 12px; padding: 20px; }
        .psTop { display: flex; justify-content: space-between; border-bottom: 1px solid #dfe3e8; padding-bottom: 16px; margin-bottom: 16px; }
        .psNet { font-size: 24px; font-weight: 800; color: #16a34a; }
        .psGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .psSectionTitle { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8590a6; margin-bottom: 8px; }
        .psRow { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #171c20; }
        .psRow span:first-child { color: #45474c; }
        .psTotal { font-weight: 700; color: #171c20 !important; }
        .psTotal span { color: #171c20 !important; }
        .psRow:last-child { border-bottom: none; }
        @media print { .psModal { position: static; max-height: none; box-shadow: none; border: none; } .modalHeader { display: none; } .psList { background: #fff; padding: 0; } .psCard { margin-bottom: 30px; break-inside: avoid; border: 2px solid #000; } }
      `}} />
      {payslipModal && runDetail && (
        <div className={styles.overlay}>
          <div className="psModal">
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Payslips — {MONTHS[(runDetail.month || 1) - 1]} {runDetail.year}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.btnSecondary} onClick={() => window.print()}><FileText size={14} /> Print All</button>
                <button className={styles.modalClose} onClick={() => { setPayslipModal(null); setRunDetail(null); }}><X size={18} /></button>
              </div>
            </div>
            <div className="psList">
              {(!runDetail.entries || runDetail.entries.length === 0) ? (
                <div className={styles.emptyState}>No payslip entries. Process the payroll run first.</div>
              ) : runDetail.entries.map(entry => (
                <div key={entry.id} className="psCard">
                  <div className="psTop">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#171c20' }}>{entry.staff_name}</div>
                      <div style={{ fontSize: 13, color: '#45474c', marginTop: 4 }}>{entry.employee_id} · {entry.designation}</div>
                    </div>
                    <div className="psNet">₹{Number(entry.net_salary).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="psGrid">
                    <div>
                      <div className="psSectionTitle">Earnings</div>
                      <div className="psRow"><span>Basic</span><span>₹{Number(entry.basic_salary).toLocaleString('en-IN')}</span></div>
                      <div className="psRow"><span>HRA</span><span>₹{Number(entry.hra).toLocaleString('en-IN')}</span></div>
                      <div className="psRow"><span>DA</span><span>₹{Number(entry.da).toLocaleString('en-IN')}</span></div>
                      <div className="psRow"><span>Transport</span><span>₹{Number(entry.ta).toLocaleString('en-IN')}</span></div>
                      <div className="psRow psTotal"><span>Gross</span><span>₹{Number(entry.gross_salary).toLocaleString('en-IN')}</span></div>
                    </div>
                    <div>
                      <div className="psSectionTitle">Deductions</div>
                      <div className="psRow"><span>PF</span><span>₹{Number(entry.pf_deduction).toLocaleString('en-IN')}</span></div>
                      <div className="psRow"><span>ESI</span><span>₹{Number(entry.esi_deduction).toLocaleString('en-IN')}</span></div>
                      <div className="psRow"><span>TDS</span><span>₹{Number(entry.tds_deduction).toLocaleString('en-IN')}</span></div>
                      <div className="psRow"><span>Other</span><span>₹{Number(entry.other_deductions).toLocaleString('en-IN')}</span></div>
                      <div className="psRow psTotal"><span>Total Deductions</span><span style={{ color: '#dc2626' }}>₹{Number(entry.total_deductions).toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Payroll Page ────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [active, setActive] = useState('structures');
  const VIEWS = { structures: <SalaryStructuresTab />, deductions: <DeductionsTab />, runs: <PayrollRunsTab /> };

  return (
    <div className={styles.financeModule}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Payroll Management</h1>
        <p className={styles.pageSubtitle}>Salary structures, monthly payroll runs, and payslips</p>
      </div>
      
      <FinanceTabs tabs={NAV} activeTab={active} onTabChange={setActive} />
      
      <div>
        {VIEWS[active]}
      </div>
    </div>
  );
}
