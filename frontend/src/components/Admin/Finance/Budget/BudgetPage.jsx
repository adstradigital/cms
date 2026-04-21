'use client';
import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Pencil, Trash2, Calendar, Target, ChevronRight } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import FinanceTabs from '../shared/FinanceTabs';
import styles from '../shared/FinanceLayout.module.css';

const TABS = [
  { key: 'annual', label: 'Annual Budget', icon: <Calendar size={18} /> },
  { key: 'variance', label: 'Budget vs Actual', icon: <Target size={18} /> },
];

// ─── Annual Budget Tab ────────────────────────────────────────────────────────
function AnnualBudgetTab() {
  const [budgets, setBudgets] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);
  const [form, setForm] = useState({ title: 'Annual Budget', academic_year: '', total_allocated: 0, status: 'draft', notes: '' });
  const [itemForm, setItemForm] = useState({ category: '', allocated_amount: 0, notes: '' });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    Promise.all([adminApi.getAnnualBudgets(), adminApi.getAcademicYears()])
      .then(([b, y]) => { setBudgets(b.data || []); setYears(y.data || []); })
      .catch(() => push('Failed.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const selectBudget = async (b) => {
    setSelected(b);
    try { setItems((await adminApi.getBudgetItems(b.id)).data || []); }
    catch { push('Failed to load items.', 'error'); }
  };

  const createBudget = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await adminApi.createAnnualBudget(form);
      push('Budget created.', 'success');
      const r = await adminApi.getAnnualBudgets(); setBudgets(r.data || []);
      setModal(null);
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const addItem = async (e) => {
    e.preventDefault(); if (!selected) return;
    setSaving(true);
    try {
      await adminApi.createBudgetItem({ ...itemForm, budget: selected.id });
      const r = await adminApi.getBudgetItems(selected.id); setItems(r.data || []);
      setItemModal(null);
      push('Item added.', 'success');
    } catch { push('Failed.', 'error'); }
    finally { setSaving(false); }
  };

  const delItem = async (id) => {
    try { await adminApi.deleteBudgetItem(id); setItems(p => p.filter(i => i.id !== id)); push('Deleted.', 'success'); }
    catch { push('Failed.', 'error'); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading budgets...</div>;

  const totalAllocated = items.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent_amount), 0);

  return (
    <div className={styles.splitLayout}>
      {/* Left: Budget list */}
      <section className={styles.leftColumn}>
        <div className={styles.card} style={{ padding: 0 }}>
          <div className={styles.cardHeader} style={{ padding: '20px 24px', margin: 0 }}>
            <span className={styles.cardTitle} style={{ fontSize: 16 }}>Budgets</span>
            <button className={styles.btnSecondary} onClick={() => setModal(true)}><Plus size={14} /> New</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {budgets.length === 0 ? <div className={styles.emptyState} style={{ padding: 40 }}>No budgets yet.</div> : budgets.map(b => (
              <button 
                key={b.id} 
                onClick={() => selectBudget(b)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 24px', border: 'none', borderBottom: '1px solid var(--finance-border)',
                  background: selected?.id === b.id ? 'rgba(9,20,38,0.04)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = selected?.id === b.id ? 'rgba(9,20,38,0.04)' : '#f6faff'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = selected?.id === b.id ? 'rgba(9,20,38,0.04)' : 'transparent'}
              >
                <div>
                  <div className={styles.textBold} style={{ fontSize: 14 }}>{b.title}</div>
                  <div className={styles.textSub}>{b.academic_year_name || '—'} · <span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 800 }}>{b.status}</span></div>
                </div>
                <ChevronRight size={16} color="var(--finance-text-muted)" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Right: Items */}
      <section className={styles.rightColumn}>
        <div className={styles.card} style={{ padding: 0 }}>
          {!selected ? (
            <div className={styles.emptyState}>← Select a budget to view line items</div>
          ) : (
            <>
              <div className={styles.cardHeader} style={{ padding: '24px', margin: 0 }}>
                <div>
                  <div className={styles.cardTitle}>{selected.title}</div>
                  <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                    <div>
                      <div className={styles.fontMono} style={{ fontSize: 20, fontWeight: 800 }}>₹{totalAllocated.toLocaleString('en-IN')}</div>
                      <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11 }}>Allocated</div>
                    </div>
                    <div>
                      <div className={styles.fontMono} style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>₹{totalSpent.toLocaleString('en-IN')}</div>
                      <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11 }}>Spent</div>
                    </div>
                    <div>
                      <div className={styles.fontMono} style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>₹{(totalAllocated - totalSpent).toLocaleString('en-IN')}</div>
                      <div className={styles.textSub} style={{ textTransform: 'uppercase', fontSize: 11 }}>Remaining</div>
                    </div>
                  </div>
                </div>
                <button className={styles.btnPrimary} onClick={() => setItemModal(true)}><Plus size={15} /> Add Line Item</button>
              </div>
              
              <div className={styles.tableResponsive} style={{ margin: 0 }}>
                <table className={styles.table}>
                  <thead><tr><th>Category</th><th className={styles.textRight}>Allocated</th><th className={styles.textRight}>Spent</th><th className={styles.textRight}>Remaining</th><th className={styles.textRight}>Actions</th></tr></thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan={5} className={styles.emptyState} style={{ padding: 40 }}>No line items defined yet.</td></tr> : items.map(i => (
                      <tr key={i.id}>
                        <td className={styles.textBold}>{i.category}</td>
                        <td className={`${styles.fontMono} ${styles.textRight}`}>₹{Number(i.allocated_amount).toLocaleString('en-IN')}</td>
                        <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: '#dc2626' }}>₹{Number(i.spent_amount).toLocaleString('en-IN')}</td>
                        <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: '#16a34a', fontWeight: 800 }}>₹{(Number(i.allocated_amount) - Number(i.spent_amount)).toLocaleString('en-IN')}</td>
                        <td>
                          <div className={styles.actions}>
                            <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => delItem(i.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* New budget modal */}
      {modal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>New Annual Budget</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={createBudget}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Title</label>
                  <input className={styles.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Academic Year</label>
                  <select className={styles.input} value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))} required>
                    <option value="">Select…</option>{years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Total Allocated (₹)</label>
                  <input className={styles.input} type="number" min="0" value={form.total_allocated} onChange={e => setForm(p => ({ ...p, total_allocated: e.target.value }))} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving && <Loader2 size={14} className={styles.spin} />} Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add item modal */}
      {itemModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Line Item</h3>
              <button className={styles.modalClose} onClick={() => setItemModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={addItem}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Category *</label>
                  <input className={styles.input} value={itemForm.category} onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))} required placeholder="e.g. Infrastructure, Salaries, Events…" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Allocated Amount (₹)</label>
                  <input className={styles.input} type="number" min="0" value={itemForm.allocated_amount} onChange={e => setItemForm(p => ({ ...p, allocated_amount: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Notes</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} value={itemForm.notes} onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setItemModal(null)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving && <Loader2 size={14} className={styles.spin} />} Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Budget vs Actual Tab ─────────────────────────────────────────────────────
function VarianceTab() {
  const [budgets, setBudgets] = useState([]);
  const [selected, setSelected] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    adminApi.getAnnualBudgets().then(r => { setBudgets(r.data || []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadItems = async (id) => {
    setSelected(id);
    if (!id) { setItems([]); return; }
    try { setItems((await adminApi.getBudgetItems(id)).data || []); }
    catch { push('Failed.', 'error'); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Select Budget for Variance Analysis</label>
          <select className={`${styles.input} ${styles.select}`} style={{ maxWidth: 400 }} value={selected} onChange={e => loadItems(e.target.value)}>
            <option value="">Select a budget to compare…</option>
            {budgets.map(b => <option key={b.id} value={b.id}>{b.title} ({b.academic_year_name})</option>)}
          </select>
        </div>
      </div>
      
      {selected ? items.length > 0 ? (
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead><tr><th>Category</th><th className={styles.textRight}>Allocated</th><th className={styles.textRight}>Spent</th><th className={styles.textRight}>Variance</th><th>Utilization %</th></tr></thead>
            <tbody>
              {items.map(i => {
                const alloc = Number(i.allocated_amount);
                const spent = Number(i.spent_amount);
                const variance = alloc - spent;
                const pct = alloc > 0 ? ((spent / alloc) * 100).toFixed(1) : 0;
                return (
                  <tr key={i.id}>
                    <td className={styles.textBold}>{i.category}</td>
                    <td className={`${styles.fontMono} ${styles.textRight}`}>₹{alloc.toLocaleString('en-IN')}</td>
                    <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: spent > alloc ? '#dc2626' : 'inherit' }}>₹{spent.toLocaleString('en-IN')}</td>
                    <td className={`${styles.fontMono} ${styles.textRight}`} style={{ color: variance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 800 }}>
                      {variance >= 0 ? '+' : ''}₹{variance.toLocaleString('en-IN')}
                    </td>
                    <td style={{ width: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                          <div style={{ height: '100%', borderRadius: 99, background: pct > 100 ? '#dc2626' : pct > 80 ? '#f59e0b' : '#16a34a', width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className={styles.textSub}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className={styles.emptyState}>No line items in this budget.</div> : null}
    </div>
  );
}

export default function BudgetPage() {
  const [tab, setTab] = useState('annual');
  return (
    <div className={styles.financeModule}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Budget Planning</h1>
        <p className={styles.pageSubtitle}>Plan annual budgets and track actual spend vs allocation</p>
      </div>
      <FinanceTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />
      <div>
        {tab === 'annual' ? <AnnualBudgetTab /> : <VarianceTab />}
      </div>
    </div>
  );
}
