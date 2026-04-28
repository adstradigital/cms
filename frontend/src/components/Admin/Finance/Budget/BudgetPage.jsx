'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Loader2, Pencil, Trash2, Calendar, Target,
  BarChart3, TrendingUp, CheckCircle2, Clock, ChevronRight,
  Layers,
} from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import FinanceTabs from '../shared/FinanceTabs';
import shared from '../shared/FinanceLayout.module.css';
import s from './BudgetPage.module.css';

const TABS = [
  { key: 'annual',   label: 'Annual Budgets',     icon: <Layers size={16} /> },
  { key: 'variance', label: 'Budget vs Actual',   icon: <BarChart3 size={16} /> },
];

const CATEGORY_PRESETS = [
  { label: 'Events',        color: '#8b5cf6' },
  { label: 'Hostel',        color: '#0891b2' },
  { label: 'Transport',     color: '#d97706' },
  { label: 'Salaries',      color: '#2563eb' },
  { label: 'Infrastructure',color: '#dc2626' },
  { label: 'IT & Technology',color: '#059669' },
  { label: 'Library',       color: '#ea580c' },
  { label: 'Sports',        color: '#65a30d' },
  { label: 'Canteen',       color: '#db2777' },
  { label: 'Utilities',     color: '#4f46e5' },
  { label: 'Maintenance',   color: '#78716c' },
  { label: 'Academics',     color: '#0369a1' },
];

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     cls: s.sDraft },
  approved:  { label: 'Approved',  cls: s.sApproved },
  finalized: { label: 'Finalized', cls: s.sFinalized },
};

const getCategoryColor = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('event'))                          return '#8b5cf6';
  if (n.includes('hostel'))                         return '#0891b2';
  if (n.includes('transport') || n.includes('bus')) return '#d97706';
  if (n.includes('salar') || n.includes('payroll')) return '#2563eb';
  if (n.includes('infra') || n.includes('construct'))return '#dc2626';
  if (n.includes('it') || n.includes('tech') || n.includes('computer')) return '#059669';
  if (n.includes('library') || n.includes('book')) return '#ea580c';
  if (n.includes('sport') || n.includes('game'))   return '#65a30d';
  if (n.includes('canteen') || n.includes('food') || n.includes('cafeteria')) return '#db2777';
  if (n.includes('util') || n.includes('electric') || n.includes('water')) return '#4f46e5';
  if (n.includes('maint') || n.includes('repair')) return '#78716c';
  if (n.includes('academ') || n.includes('exam') || n.includes('curriculum')) return '#0369a1';
  return '#64748b';
};

const getUtilColor = (p) => p >= 100 ? '#dc2626' : p >= 80 ? '#d97706' : '#16a34a';
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const calcPct = (spent, alloc) => alloc > 0 ? Math.min(999, Math.round((spent / alloc) * 100)) : 0;

// ─── Annual Budgets Tab ────────────────────────────────────────────────────────
function AnnualTab() {
  const [budgets, setBudgets]         = useState([]);
  const [years, setYears]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [items, setItems]             = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [budgetModal, setBudgetModal] = useState(null);
  const [itemModal, setItemModal]     = useState(null);
  const [budgetForm, setBudgetForm]   = useState({ title: 'Annual Budget', academic_year: '', total_allocated: '', status: 'draft', notes: '' });
  const [itemForm, setItemForm]       = useState({ category: '', allocated_amount: '', spent_amount: '0', notes: '' });
  const [saving, setSaving]           = useState(false);
  const { push } = useToast();

  useEffect(() => {
    Promise.all([adminApi.getAnnualBudgets(), adminApi.getAcademicYears()])
      .then(([b, y]) => { setBudgets(b.data || []); setYears(y.data || []); })
      .catch(() => push('Failed to load budgets.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const selectBudget = async (b) => {
    setSelected(b);
    setItemsLoading(true);
    try { setItems((await adminApi.getBudgetItems(b.id)).data || []); }
    catch { push('Failed to load budget items.', 'error'); }
    finally { setItemsLoading(false); }
  };

  const saveBudget = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (budgetModal?.id) {
        const updated = (await adminApi.updateAnnualBudget(budgetModal.id, budgetForm)).data;
        setBudgets(p => p.map(b => b.id === updated.id ? updated : b));
        if (selected?.id === updated.id) setSelected(updated);
      } else {
        await adminApi.createAnnualBudget(budgetForm);
        const r = await adminApi.getAnnualBudgets(); setBudgets(r.data || []);
      }
      push(budgetModal?.id ? 'Budget updated.' : 'Budget created.', 'success');
      setBudgetModal(null);
    } catch { push('Failed to save budget.', 'error'); }
    finally { setSaving(false); }
  };

  const saveItem = async (e) => {
    e.preventDefault(); if (!selected) return; setSaving(true);
    try {
      if (itemModal?.id) await adminApi.updateBudgetItem(itemModal.id, itemForm);
      else await adminApi.createBudgetItem({ ...itemForm, budget: selected.id });
      const r = await adminApi.getBudgetItems(selected.id); setItems(r.data || []);
      push(itemModal?.id ? 'Item updated.' : 'Item added.', 'success');
      setItemModal(null);
    } catch { push('Failed to save item.', 'error'); }
    finally { setSaving(false); }
  };

  const deleteItem = async (id) => {
    try {
      await adminApi.deleteBudgetItem(id);
      setItems(p => p.filter(i => i.id !== id));
      push('Item removed.', 'success');
    } catch { push('Failed to delete.', 'error'); }
  };

  const totalAlloc    = useMemo(() => items.reduce((s, i) => s + Number(i.allocated_amount || 0), 0), [items]);
  const totalSpent    = useMemo(() => items.reduce((s, i) => s + Number(i.spent_amount || 0), 0), [items]);
  const totalRemaining = totalAlloc - totalSpent;
  const utilPct       = calcPct(totalSpent, totalAlloc);
  const utilColor     = getUtilColor(utilPct);

  if (loading) return <div className={shared.loading}><Loader2 size={18} className={shared.spin} /> Loading budgets…</div>;

  return (
    <>
      <div className={shared.splitLayout}>
        {/* ── Left: Budget list ── */}
        <section className={shared.leftColumn}>
          <div className={shared.card} style={{ padding: 0 }}>
            <div className={shared.cardHeader} style={{ padding: '16px 20px', margin: 0 }}>
              <span className={shared.cardTitle} style={{ fontSize: 15 }}>Annual Budgets</span>
              <button
                className={shared.btnPrimary}
                onClick={() => { setBudgetForm({ title: 'Annual Budget', academic_year: '', total_allocated: '', status: 'draft', notes: '' }); setBudgetModal({}); }}
              >
                <Plus size={14} /> New
              </button>
            </div>

            {budgets.length === 0 ? (
              <div className={s.emptyPanel}>
                <div className={s.emptyCircle}><Calendar size={24} /></div>
                <div className={s.emptyH}>No budgets yet</div>
                <div className={s.emptyP}>Create your first annual budget to start allocating funds across departments.</div>
              </div>
            ) : budgets.map(b => (
              <button
                key={b.id}
                className={`${s.budgetCard} ${selected?.id === b.id ? s.budgetCardActive : ''}`}
                onClick={() => selectBudget(b)}
              >
                <div className={s.budgetCardAccent} />
                <div className={s.budgetCardContent}>
                  <div className={s.budgetInfo}>
                    <div className={s.budgetName}>{b.title}</div>
                    <div className={s.budgetYear}>{b.academic_year_name || '—'}</div>
                  </div>
                  <div className={s.budgetRight}>
                    <span className={`${shared.badge} ${STATUS_CONFIG[b.status]?.cls || s.sDraft}`}>
                      {STATUS_CONFIG[b.status]?.label || b.status}
                    </span>
                    <div className={s.budgetAlloc}>{fmt(b.total_allocated)}</div>
                  </div>
                  <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Right: Budget detail ── */}
        <section className={shared.rightColumn}>
          <div className={shared.card} style={{ padding: 0, overflow: 'hidden' }}>
            {!selected ? (
              <div className={s.emptyPanel}>
                <div className={s.emptyCircle}><Target size={24} /></div>
                <div className={s.emptyH}>Select a budget</div>
                <div className={s.emptyP}>Choose a budget from the list to view and manage its category allocations.</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className={s.detailHeader}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <h3 className={s.detailTitle}>{selected.title}</h3>
                      <div className={s.detailMeta}>
                        <span>{selected.academic_year_name}</span>
                        <span className={`${shared.badge} ${STATUS_CONFIG[selected.status]?.cls || s.sDraft}`}>
                          {STATUS_CONFIG[selected.status]?.label || selected.status}
                        </span>
                        {selected.notes && <span style={{ fontStyle: 'italic', fontSize: 12 }}>{selected.notes}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        className={shared.btnSecondary}
                        style={{ fontSize: 12 }}
                        onClick={() => { setBudgetForm({ title: selected.title, academic_year: selected.academic_year, total_allocated: selected.total_allocated, status: selected.status, notes: selected.notes || '' }); setBudgetModal(selected); }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className={shared.btnPrimary}
                        onClick={() => { setItemForm({ category: '', allocated_amount: '', spent_amount: '0', notes: '' }); setItemModal({}); }}
                      >
                        <Plus size={14} /> Add Item
                      </button>
                    </div>
                  </div>

                  <div className={s.detailStats}>
                    <div className={s.detailStat}>
                      <div className={s.detailStatVal} style={{ color: '#091426' }}>{fmt(totalAlloc)}</div>
                      <div className={s.detailStatLbl}>Allocated</div>
                    </div>
                    <div className={s.detailStat}>
                      <div className={s.detailStatVal} style={{ color: '#dc2626' }}>{fmt(totalSpent)}</div>
                      <div className={s.detailStatLbl}>Spent</div>
                    </div>
                    <div className={s.detailStat}>
                      <div className={s.detailStatVal} style={{ color: totalRemaining >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(totalRemaining)}</div>
                      <div className={s.detailStatLbl}>Remaining</div>
                    </div>
                  </div>

                  {totalAlloc > 0 && (
                    <div className={s.overallBar}>
                      <div className={s.overallBarLabel}>
                        <span>Overall Utilization</span>
                        <span style={{ color: utilColor, fontFamily: 'monospace', fontWeight: 800 }}>{utilPct}%</span>
                      </div>
                      <div className={s.overallBarTrack}>
                        <div className={s.overallBarFill} style={{ width: `${Math.min(100, utilPct)}%`, background: utilColor }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                {itemsLoading ? (
                  <div className={shared.loading}><Loader2 size={16} className={shared.spin} /> Loading items…</div>
                ) : items.length === 0 ? (
                  <div className={s.emptyPanel}>
                    <div className={s.emptyCircle}><Layers size={22} /></div>
                    <div className={s.emptyH}>No line items yet</div>
                    <div className={s.emptyP}>Add categories like Events, Hostel, Transport, Salaries and track spend against each.</div>
                    <button
                      className={shared.btnPrimary}
                      onClick={() => { setItemForm({ category: '', allocated_amount: '', spent_amount: '0', notes: '' }); setItemModal({}); }}
                    >
                      <Plus size={14} /> Add First Item
                    </button>
                  </div>
                ) : (
                  items.map(item => {
                    const alloc   = Number(item.allocated_amount || 0);
                    const spent   = Number(item.spent_amount || 0);
                    const rem     = alloc - spent;
                    const p       = calcPct(spent, alloc);
                    const dotColor = getCategoryColor(item.category);
                    const barColor = getUtilColor(p);
                    return (
                      <div key={item.id} className={s.itemRow}>
                        <div className={s.itemDot} style={{ background: dotColor }} />
                        <div className={s.itemInfo}>
                          <div className={s.itemCat}>{item.category}</div>
                          <div className={s.itemProgressRow}>
                            <div className={s.itemBarTrack}>
                              <div className={s.itemBarFill} style={{ width: `${Math.min(100, p)}%`, background: barColor }} />
                            </div>
                            <span className={s.itemPct} style={{ color: barColor }}>{p}% used</span>
                          </div>
                        </div>
                        <div className={s.itemAmounts}>
                          <div className={s.amountGroup}>
                            <div className={s.amountVal}>{fmt(alloc)}</div>
                            <div className={s.amountLbl}>Allocated</div>
                          </div>
                          <div className={s.amountGroup}>
                            <div className={s.amountVal} style={{ color: '#dc2626' }}>{fmt(spent)}</div>
                            <div className={s.amountLbl}>Spent</div>
                          </div>
                          <div className={s.amountGroup}>
                            <div className={s.amountVal} style={{ color: rem >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(Math.abs(rem))}{rem < 0 ? ' over' : ''}</div>
                            <div className={s.amountLbl}>Remaining</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            className={shared.iconBtn}
                            onClick={() => { setItemForm({ category: item.category, allocated_amount: item.allocated_amount, spent_amount: item.spent_amount, notes: item.notes || '' }); setItemModal(item); }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button className={`${shared.iconBtn} ${shared.iconBtnDanger}`} onClick={() => deleteItem(item.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Budget modal */}
      {budgetModal !== null && (
        <div className={shared.overlay}>
          <div className={shared.modal}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>{budgetModal?.id ? 'Edit Budget' : 'New Annual Budget'}</h3>
              <button className={shared.modalClose} onClick={() => setBudgetModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveBudget}>
              <div className={shared.modalBody}>
                <div className={shared.formGroup}>
                  <label className={shared.label}>Title</label>
                  <input className={shared.input} value={budgetForm.title} onChange={e => setBudgetForm(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div className={shared.formGroup}>
                  <label className={shared.label}>Academic Year *</label>
                  <select className={shared.input} value={budgetForm.academic_year} onChange={e => setBudgetForm(p => ({ ...p, academic_year: e.target.value }))} required>
                    <option value="">Select year…</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className={shared.formGroup}>
                  <label className={shared.label}>Total Budget Envelope (₹)</label>
                  <input className={shared.input} type="number" min="0" step="1" value={budgetForm.total_allocated} onChange={e => setBudgetForm(p => ({ ...p, total_allocated: e.target.value }))} placeholder="e.g. 5000000" />
                </div>
                <div className={shared.formGroup}>
                  <label className={shared.label}>Status</label>
                  <select className={shared.input} value={budgetForm.status} onChange={e => setBudgetForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="finalized">Finalized</option>
                  </select>
                </div>
                <div className={shared.formGroup}>
                  <label className={shared.label}>Notes</label>
                  <textarea className={`${shared.input} ${shared.textarea}`} value={budgetForm.notes} onChange={e => setBudgetForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
              </div>
              <div className={shared.modalFooter}>
                <button type="button" className={shared.btnSecondary} onClick={() => setBudgetModal(null)}>Cancel</button>
                <button type="submit" className={shared.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={shared.spin} />}
                  {budgetModal?.id ? 'Save Changes' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item modal */}
      {itemModal !== null && (
        <div className={shared.overlay}>
          <div className={shared.modal}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>{itemModal?.id ? 'Edit Line Item' : 'Add Line Item'}</h3>
              <button className={shared.modalClose} onClick={() => setItemModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveItem}>
              <div className={shared.modalBody}>
                <div className={shared.formGroup}>
                  <label className={shared.label}>Category *</label>
                  <input
                    className={shared.input}
                    value={itemForm.category}
                    onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))}
                    required
                    placeholder="e.g. Events, Hostel, Transport…"
                  />
                  <div className={s.presetChips}>
                    {CATEGORY_PRESETS.map(cp => (
                      <button
                        key={cp.label}
                        type="button"
                        className={s.presetChip}
                        onClick={() => setItemForm(p => ({ ...p, category: cp.label }))}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cp.color, display: 'inline-block', flexShrink: 0 }} />
                        {cp.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Allocated Amount (₹) *</label>
                    <input className={shared.input} type="number" min="0" step="1" value={itemForm.allocated_amount} onChange={e => setItemForm(p => ({ ...p, allocated_amount: e.target.value }))} required placeholder="0" />
                  </div>
                  <div className={shared.formGroup} style={{ marginBottom: 0 }}>
                    <label className={shared.label}>Spent Amount (₹)</label>
                    <input className={shared.input} type="number" min="0" step="1" value={itemForm.spent_amount} onChange={e => setItemForm(p => ({ ...p, spent_amount: e.target.value }))} placeholder="0" />
                  </div>
                </div>
                <div className={shared.formGroup} style={{ marginTop: 16 }}>
                  <label className={shared.label}>Notes</label>
                  <textarea className={`${shared.input} ${shared.textarea}`} value={itemForm.notes} onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
              </div>
              <div className={shared.modalFooter}>
                <button type="button" className={shared.btnSecondary} onClick={() => setItemModal(null)}>Cancel</button>
                <button type="submit" className={shared.btnPrimary} disabled={saving}>
                  {saving && <Loader2 size={14} className={shared.spin} />}
                  {itemModal?.id ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Budget vs Actual Tab ─────────────────────────────────────────────────────
function VarianceTab() {
  const [budgets, setBudgets]         = useState([]);
  const [selected, setSelected]       = useState('');
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    adminApi.getAnnualBudgets()
      .then(r => setBudgets(r.data || []))
      .catch(() => push('Failed to load budgets.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const loadItems = async (id) => {
    setSelected(id);
    if (!id) { setItems([]); return; }
    setItemsLoading(true);
    try { setItems((await adminApi.getBudgetItems(id)).data || []); }
    catch { push('Failed to load items.', 'error'); }
    finally { setItemsLoading(false); }
  };

  const totalAlloc = items.reduce((s, i) => s + Number(i.allocated_amount || 0), 0);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent_amount || 0), 0);
  const totalVar   = totalAlloc - totalSpent;
  const totalPct   = calcPct(totalSpent, totalAlloc);

  if (loading) return <div className={shared.loading}><Loader2 size={18} className={shared.spin} /> Loading…</div>;

  return (
    <div className={shared.card} style={{ padding: 0, overflow: 'hidden' }}>
      <div className={shared.cardHeader} style={{ padding: '20px 24px', margin: 0 }}>
        <div>
          <h3 className={shared.cardTitle}>Budget vs Actual</h3>
          <p className={shared.cardSubtitle}>Compare planned allocations against actual spending per category</p>
        </div>
        <select
          className={shared.input}
          style={{ maxWidth: 340 }}
          value={selected}
          onChange={e => loadItems(e.target.value)}
        >
          <option value="">Select a budget to analyze…</option>
          {budgets.map(b => <option key={b.id} value={b.id}>{b.title} — {b.academic_year_name}</option>)}
        </select>
      </div>

      {!selected ? (
        <div className={s.emptyPanel}>
          <div className={s.emptyCircle}><BarChart3 size={24} /></div>
          <div className={s.emptyH}>Select a budget to begin</div>
          <div className={s.emptyP}>Choose a budget above to compare planned allocations against actual spend across all categories.</div>
        </div>
      ) : itemsLoading ? (
        <div className={shared.loading}><Loader2 size={16} className={shared.spin} /> Loading items…</div>
      ) : items.length === 0 ? (
        <div className={s.emptyPanel}>
          <div className={s.emptyH}>No line items in this budget</div>
          <div className={s.emptyP}>Add category items in the Annual Budgets tab first.</div>
        </div>
      ) : (
        <>
          <div className={s.varHead}>
            <span>Category</span>
            <span style={{ textAlign: 'right' }}>Allocated</span>
            <span style={{ textAlign: 'right' }}>Spent</span>
            <span style={{ textAlign: 'right' }}>Variance</span>
            <span>Utilization</span>
          </div>

          {items.map(item => {
            const alloc    = Number(item.allocated_amount || 0);
            const spent    = Number(item.spent_amount || 0);
            const variance = alloc - spent;
            const p        = calcPct(spent, alloc);
            const uColor   = getUtilColor(p);
            const catColor = getCategoryColor(item.category);
            return (
              <div key={item.id} className={s.varRow}>
                <div className={s.varName}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, display: 'inline-block', flexShrink: 0 }} />
                  {item.category}
                </div>
                <div className={s.varAmt}>{fmt(alloc)}</div>
                <div className={s.varAmt} style={{ color: spent > alloc ? '#dc2626' : 'inherit' }}>{fmt(spent)}</div>
                <div className={s.varAmt} style={{ color: variance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 800 }}>
                  {variance >= 0 ? '+' : ''}{fmt(variance)}
                </div>
                <div className={s.varBarWrap}>
                  <div className={s.varBarTrack}>
                    <div className={s.varBarFill} style={{ width: `${Math.min(100, p)}%`, background: uColor }} />
                  </div>
                  <span className={s.varPct} style={{ color: uColor }}>{p}%</span>
                </div>
              </div>
            );
          })}

          {/* Summary row */}
          <div className={`${s.varRow} ${s.varSummary}`}>
            <div className={s.varName} style={{ fontWeight: 800 }}>Total</div>
            <div className={s.varAmt} style={{ fontWeight: 800 }}>{fmt(totalAlloc)}</div>
            <div className={s.varAmt} style={{ fontWeight: 800, color: totalSpent > totalAlloc ? '#dc2626' : 'inherit' }}>{fmt(totalSpent)}</div>
            <div className={s.varAmt} style={{ fontWeight: 800, color: totalVar >= 0 ? '#16a34a' : '#dc2626' }}>
              {totalVar >= 0 ? '+' : ''}{fmt(totalVar)}
            </div>
            <div className={s.varBarWrap}>
              <div className={s.varBarTrack}>
                <div className={s.varBarFill} style={{ width: `${Math.min(100, totalPct)}%`, background: getUtilColor(totalPct) }} />
              </div>
              <span className={s.varPct} style={{ color: getUtilColor(totalPct), fontWeight: 800 }}>{totalPct}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const [tab, setTab]       = useState('annual');
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    adminApi.getAnnualBudgets().then(r => setBudgets(r.data || [])).catch(() => {});
  }, []);

  const totalValue = useMemo(() => budgets.reduce((s, b) => s + Number(b.total_allocated || 0), 0), [budgets]);
  const active = budgets.filter(b => b.status === 'approved' || b.status === 'finalized').length;
  const draft  = budgets.filter(b => b.status === 'draft').length;
  const lakh   = totalValue >= 100000 ? `₹${(totalValue / 100000).toFixed(1)}L` : fmt(totalValue);

  return (
    <div className={shared.financeModule}>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>Budget Planning</h1>
        <p className={shared.pageSubtitle}>Plan, allocate and monitor budget utilization across all school departments</p>
      </div>

      {/* KPI Strip */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiAccent} style={{ background: '#091426' }} />
          <div className={s.kpiIcon} style={{ background: '#f1f5f9', color: '#475569' }}><Layers size={18} /></div>
          <div className={s.kpiLabel}>Total Budgets</div>
          <div className={s.kpiValue}>{budgets.length}</div>
          <div className={s.kpiSub}>{active} active · {draft} draft</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiAccent} style={{ background: '#2563eb' }} />
          <div className={s.kpiIcon} style={{ background: '#eff6ff', color: '#2563eb' }}><TrendingUp size={18} /></div>
          <div className={s.kpiLabel}>Total Budget Value</div>
          <div className={s.kpiValue} style={{ color: '#2563eb' }}>{lakh}</div>
          <div className={s.kpiSub}>Sum of all budget envelopes</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiAccent} style={{ background: '#16a34a' }} />
          <div className={s.kpiIcon} style={{ background: '#d1fae5', color: '#16a34a' }}><CheckCircle2 size={18} /></div>
          <div className={s.kpiLabel}>Active Budgets</div>
          <div className={s.kpiValue} style={{ color: '#16a34a' }}>{active}</div>
          <div className={s.kpiSub}>Approved &amp; finalized</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiAccent} style={{ background: '#d97706' }} />
          <div className={s.kpiIcon} style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={18} /></div>
          <div className={s.kpiLabel}>Pending Approval</div>
          <div className={s.kpiValue} style={{ color: '#d97706' }}>{draft}</div>
          <div className={s.kpiSub}>Budgets in draft state</div>
        </div>
      </div>

      <FinanceTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />
      <div>{tab === 'annual' ? <AnnualTab /> : <VarianceTab />}</div>
    </div>
  );
}
