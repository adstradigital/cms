'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, CheckCircle, XCircle, Clock, LayoutGrid, FileText, CheckSquare } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import FinanceTabs from '../shared/FinanceTabs';
import styles from '../shared/FinanceLayout.module.css';

const TABS = [
  { key: 'categories', label: 'Categories', icon: <LayoutGrid size={18} /> },
  { key: 'entry', label: 'Expense Entry', icon: <FileText size={18} /> },
  { key: 'approvals', label: 'Approvals', icon: <CheckSquare size={18} /> },
];

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  cls: styles.badgePending, icon: Clock },
  approved: { label: 'Approved', cls: styles.badgePaid,    icon: CheckCircle },
  rejected: { label: 'Rejected', cls: styles.badgeDanger,  icon: XCircle },
  paid:     { label: 'Paid',     cls: styles.badgePaid,    icon: CheckCircle },
};

// ─── Category Tab ─────────────────────────────────────────────────────────────
function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => { fetchCats(); }, []);
  const fetchCats = async () => {
    setLoading(true);
    try { setCats((await adminApi.getExpenseCategories()).data || []); }
    catch { push('Failed to load.', 'error'); }
    finally { setLoading(false); }
  };

  const openModal = (cat = null) => {
    setForm(cat ? { name: cat.name, description: cat.description, is_active: cat.is_active } : { name: '', description: '', is_active: true });
    setModal(cat || {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await adminApi.updateExpenseCategory(modal.id, form);
      else await adminApi.createExpenseCategory(form);
      push('Saved.', 'success'); fetchCats(); setModal(null);
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete Category?')) return;
    try { await adminApi.deleteExpenseCategory(id); setCats(p => p.filter(c => c.id !== id)); push('Deleted.', 'success'); }
    catch { push('Failed to delete.', 'error'); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading categories...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>Expense Categories</h3>
          <p className={styles.cardSubtitle}>Manage different types of institutional expenses</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => openModal()}><Plus size={15} /> New Category</button>
      </div>
      
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
           <thead>
               <tr><th>Category Name</th><th>Description</th><th>Status</th><th className={styles.textRight}>Actions</th></tr>
           </thead>
           <tbody>
               {cats.map(c => (
                   <tr key={c.id}>
                       <td className={styles.textBold}>{c.name}</td>
                       <td style={{ color: 'var(--finance-text-muted)' }}>{c.description || '—'}</td>
                       <td><span className={`${styles.badge} ${c.is_active ? styles.badgePaid : ''}`}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                       <td>
                           <div className={styles.actions}>
                               <button className={styles.iconBtn} onClick={() => openModal(c)}><Pencil size={14} /></button>
                               <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} style={{ color: '#dc2626' }} onClick={() => del(c.id)}><Trash2 size={14} /></button>
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
              <h3 className={styles.modalTitle}>{modal?.id ? 'Edit Category' : 'New Category'}</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name *</label>
                  <input className={styles.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <label className={styles.label} style={{ cursor: 'pointer' }} onClick={() => setForm(p=>({...p, is_active: !p.is_active}))}>Active Directory</label>
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

// ─── Entry Tab ────────────────────────────────────────────────────────────────
function EntryTab() {
  const [entries, setEntries] = useState([]);
  const [cats, setCats] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ category: '', title: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], academic_year: '' });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    Promise.all([adminApi.getExpenseEntries(), adminApi.getExpenseCategories(), adminApi.getAcademicYears()])
      .then(([e, c, y]) => { setEntries(e.data || []); setCats(c.data || []); setYears(y.data || []); })
      .catch(() => push('Failed to load.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await adminApi.createExpenseEntry(form);
      push('Expense submitted.', 'success');
      const r = await adminApi.getExpenseEntries();
      setEntries(r.data || []); setModal(null);
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete Expense?')) return;
    try { await adminApi.deleteExpenseEntry(id); setEntries(p => p.filter(e => e.id !== id)); push('Deleted.', 'success'); }
    catch { push('Failed.', 'error'); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading expenses...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
           <h3 className={styles.cardTitle}>Expense Entries</h3>
           <p className={styles.cardSubtitle}>Log and track your submitted expenses</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setModal(true)}><Plus size={15} /> Submit Expense</button>
      </div>
      
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr><th>Title</th><th>Category</th><th className={styles.textRight}>Amount</th><th>Date</th><th>Submitted By</th><th>Status</th><th className={styles.textRight}>Actions</th></tr>
          </thead>
          <tbody>
            {entries.length === 0 ? <tr><td colSpan={7} className={styles.emptyState}>No expense entries logged yet.</td></tr> : entries.map(e => {
              const c = STATUS_CONFIG[e.status] || STATUS_CONFIG.pending;
              return (<tr key={e.id}>
                <td className={styles.textBold}>{e.title}</td>
                <td style={{ color: 'var(--finance-text-muted)' }}>{e.category_name}</td>
                <td className={`${styles.fontMono} ${styles.textRight}`}>₹{Number(e.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td style={{ color: 'var(--finance-text-muted)' }}>{e.expense_date}</td>
                <td style={{ color: 'var(--finance-text-muted)' }}>{e.submitted_by_name}</td>
                <td><span className={`${styles.badge} ${c.cls}`}>{c.label}</span></td>
                <td>
                   <div className={styles.actions}>
                       <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} style={{ color: '#dc2626' }} onClick={() => del(e.id)}><Trash2 size={14} /></button>
                   </div>
                </td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className={styles.overlay}>
          <div className={styles.modal} style={{ maxWidth: 640 }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Submit Expense Entry</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Title *</label>
                  <input className={styles.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g., Office Supplies Restock" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Category *</label>
                  <select className={styles.input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required>
                    <option value="">Select...</option>{cats.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Amount (₹) *</label>
                  <input className={styles.input} type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date *</label>
                  <input className={styles.input} type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Academic Year</label>
                  <select className={styles.input} value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))}>
                    <option value="">Select...</option>{years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Description</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Any additional details..." />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving && <Loader2 size={14} className={styles.spin} />} Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Approvals Tab ────────────────────────────────────────────────────────────
function ApprovalsTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const { push } = useToast();

  const fetchPending = async () => {
    setLoading(true);
    try { setEntries((await adminApi.getExpenseEntries({ status: 'pending' })).data || []); }
    catch { push('Failed.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const act = async (id, action) => {
    setProcessing(id);
    try {
      await adminApi.approveExpense(id, { action });
      push(`Expense ${action}.`, 'success');
      fetchPending();
    } catch { push('Failed.', 'error'); }
    finally { setProcessing(null); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading pending approvals...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
         <div>
           <h3 className={styles.cardTitle}>Pending Approvals</h3>
           <p className={styles.cardSubtitle}>Review and process submitted expenses</p>
         </div>
         <span className={`${styles.badge} ${styles.badgePending}`}>{entries.length} Pending</span>
      </div>
      
      {entries.length === 0 ? <div className={styles.emptyState}>No pending expenses. Everything is reviewed!</div> : (
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr><th>Title</th><th>Category</th><th className={styles.textRight}>Amount</th><th>Date</th><th>Submitted By</th><th className={styles.textRight}>Actions</th></tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td className={styles.textBold}>{e.title}</td>
                  <td style={{ color: 'var(--finance-text-muted)' }}>{e.category_name}</td>
                  <td className={`${styles.fontMono} ${styles.textRight}`}>₹{Number(e.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td style={{ color: 'var(--finance-text-muted)' }}>{e.expense_date}</td>
                  <td style={{ color: 'var(--finance-text-muted)' }}>{e.submitted_by_name}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnSecondary} style={{ color: '#065f46', borderColor: '#d1fae5', background: '#ecfdf5' }} disabled={processing === e.id} onClick={() => act(e.id, 'approved')}>
                        {processing === e.id ? <Loader2 size={14} className={styles.spin} /> : <CheckCircle size={14} />} Approve
                      </button>
                      <button className={styles.btnSecondary} style={{ color: '#dc2626', borderColor: '#fee2e2', background: '#fef2f2' }} disabled={processing === e.id} onClick={() => act(e.id, 'rejected')}>
                        {processing === e.id ? <Loader2 size={14} className={styles.spin} /> : <XCircle size={14} />} Reject
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
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [tab, setTab] = useState('categories');
  const VIEWS = { categories: <CategoriesTab />, entry: <EntryTab />, approvals: <ApprovalsTab /> };

  return (
    <div className={styles.financeModule}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Expense Tracking</h1>
        <p className={styles.pageSubtitle}>Manage and review institutional expenses</p>
      </div>
      
      <FinanceTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />
      
      <div>
        {VIEWS[tab]}
      </div>
    </div>
  );
}
