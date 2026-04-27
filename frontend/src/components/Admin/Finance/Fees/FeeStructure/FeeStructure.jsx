'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Tag, X, Loader2, DollarSign, CheckCircle, XCircle, Copy, AlertTriangle, Eye } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast, ToastStack } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';

const FEE_TYPES = [
  { value: 'academic', label: 'Academic' },
  { value: 'transport', label: 'Transport' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const TERMS = [
  { value: 'one_time', label: 'One Time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annually', label: 'Annually' },
  { value: 'per_term', label: 'Per Term' },
];

const BLANK_HEAD = { name: '', description: '', fee_type: 'academic', is_optional: false, is_refundable: false };

// ─── Fee Head Modal ───────────────────────────────────────────────────────────
function FeeHeadModal({ editing, onClose, onSaved, push }) {
  const [form, setForm] = useState(editing || BLANK_HEAD);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return push('Fee head name is required.', 'error');
    setSaving(true);
    try {
      if (editing?.id) { await adminApi.updateFeeCategory(editing.id, form); push('Fee head updated.', 'success'); }
      else { await adminApi.createFeeCategory(form); push('Fee head created.', 'success'); }
      onSaved();
    } catch { push('Failed to save fee head.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{editing?.id ? 'Edit Fee Head' : 'New Fee Head'}</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Name *</label>
              <input className={styles.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Tuition Fee, Lab Fee..." required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Type</label>
              <select className={styles.input} value={form.fee_type} onChange={e => set('fee_type', e.target.value)}>
                {FEE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea className={`${styles.input} ${styles.textarea}`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={form.is_optional} onChange={e => set('is_optional', e.target.checked)} style={{ width: 16, height: 16 }} />
                <span>Optional Fee</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={form.is_refundable} onChange={e => set('is_refundable', e.target.checked)} style={{ width: 16, height: 16 }} />
                <span>Refundable</span>
              </label>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <Loader2 size={16} className={styles.spin} /> : null} {editing?.id ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Structure Entry Modal ────────────────────────────────────────────────────
function ConfigureFeeStructureModal({
  categories,
  classes,
  academicYears,
  initialAcademicYear,
  initialClass,
  onClose,
  onSaved,
  push,
}) {
  const [academicYear, setAcademicYear] = useState(initialAcademicYear || '');
  const [schoolClass, setSchoolClass] = useState(initialClass || '');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return (categories || []).filter((c) => String(c?.name || '').toLowerCase().includes(q));
  }, [categories, query]);

  const setRow = (key, patch) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const ensureRows = (existingStructures = []) => {
    const existingByCategoryId = new Map();
    (existingStructures || []).forEach((s) => {
      existingByCategoryId.set(String(s.category), s);
    });

    const baseDue = (() => {
      const first = existingStructures?.[0]?.due_date;
      return first ? String(first) : '';
    })();
    const baseTerm = (() => {
      const first = existingStructures?.[0]?.term;
      return first ? String(first) : 'monthly';
    })();

    setRows(
      (categories || []).map((cat) => {
        const existing = existingByCategoryId.get(String(cat.id));
        return {
          key: String(cat.id),
          structure_id: existing?.id || null,
          enabled: Boolean(existing),
          category: cat.id,
          category_name: cat.name,
          category_type: cat.fee_type,
          amount: existing ? String(existing.amount ?? '') : '',
          due_date: existing ? String(existing.due_date ?? '') : baseDue,
          term: existing ? String(existing.term ?? 'monthly') : baseTerm,
          is_mandatory: existing ? Boolean(existing.is_mandatory) : !Boolean(cat.is_optional),
          late_fine_per_day: existing ? String(existing.late_fine_per_day ?? 0) : '0',
        };
      })
    );
  };

  useEffect(() => {
    ensureRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories?.length]);

  useEffect(() => {
    const run = async () => {
      if (!academicYear || !schoolClass) {
        ensureRows([]);
        return;
      }
      setLoading(true);
      try {
        const r = await adminApi.getFeeStructures({ academic_year: academicYear, class: schoolClass });
        ensureRows(r.data || []);
      } catch {
        push('Failed to load existing fee setup for this class.', 'error');
        ensureRows([]);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear, schoolClass]);

  const visibleRows = useMemo(() => {
    const visibleKeys = new Set(filteredCategories.map((c) => String(c.id)));
    return rows.filter((r) => visibleKeys.has(r.key));
  }, [rows, filteredCategories]);

  const selectAllVisible = () => {
    const visibleKeys = new Set(filteredCategories.map((c) => String(c.id)));
    setRows((prev) => prev.map((r) => (visibleKeys.has(r.key) ? { ...r, enabled: true } : r)));
  };

  const clearVisible = () => {
    const visibleKeys = new Set(filteredCategories.map((c) => String(c.id)));
    setRows((prev) => prev.map((r) => (visibleKeys.has(r.key) ? { ...r, enabled: false } : r)));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!academicYear || !schoolClass) return push('Select academic year and class.', 'error');

    const selected = rows.filter((r) => r.enabled);
    if (selected.length === 0) return push('Select at least one fee head.', 'warn');

    const invalid = selected.find((r) => !r.amount || Number(r.amount) <= 0 || !r.due_date);
    if (invalid) return push('Fill amount (>0) and due date for all selected heads.', 'error');

    setSaving(true);
    setProgress({ done: 0, total: selected.length });
    try {
      let done = 0;
      for (const r of selected) {
        const payload = {
          academic_year: academicYear,
          school_class: schoolClass,
          category: r.category,
          amount: r.amount,
          due_date: r.due_date,
          term: r.term,
          is_mandatory: r.is_mandatory,
          late_fine_per_day: r.late_fine_per_day || 0,
        };

        if (r.structure_id) await adminApi.updateFeeStructure(r.structure_id, payload);
        else {
          const created = await adminApi.createFeeStructure(payload);
          const createdId = created?.data?.id;
          if (createdId) setRow(r.key, { structure_id: createdId });
        }

        done += 1;
        setProgress({ done, total: selected.length });
      }

      push('Fee structure configured.', 'success');
      onSaved();
    } catch {
      push('Failed to save fee structure setup.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: 1150 }}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Configure Fee Structure</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className={styles.modalBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Academic Year *</label>
                <select className={styles.input} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required>
                  <option value="">Select Year</option>
                  {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Class *</label>
                <select className={styles.input} value={schoolClass} onChange={(e) => setSchoolClass(e.target.value)} required>
                  <option value="">Select Class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Search Fee Heads</label>
                <input className={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type to filter..." />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="button" className={styles.btnSecondary} onClick={selectAllVisible} disabled={loading || saving}>
                  <CheckCircle size={14} /> Select All
                </button>
                <button type="button" className={styles.btnSecondary} onClick={clearVisible} disabled={loading || saving}>
                  <XCircle size={14} /> Clear
                </button>
              </div>
              {saving && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--finance-text-muted)', fontSize: 13, fontWeight: 700 }}>
                  <Loader2 size={16} className={styles.spin} />
                  Saving {progress.done}/{progress.total}
                </div>
              )}
            </div>

            {loading ? (
              <div className={styles.loading} style={{ padding: 30 }}>
                <Loader2 size={18} className={styles.spin} /> Loading existing setup...
              </div>
            ) : (
              <div className={styles.tableResponsive} style={{ marginTop: 14 }}>
                <table className={styles.table} style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, padding: '8px 8px' }}>Use</th>
                      <th style={{ padding: '8px 8px' }}>Fee Head</th>
                      <th style={{ width: 70, padding: '8px 8px' }}>Type</th>
                      <th className={styles.textRight} style={{ width: 85, padding: '8px 8px' }}>Amount (₹)</th>
                      <th style={{ width: 110, padding: '8px 8px' }}>Due Date</th>
                      <th style={{ width: 95, padding: '8px 8px' }}>Frequency</th>
                      <th style={{ width: 80, padding: '8px 8px' }}>Mandatory</th>
                      <th className={styles.textRight} style={{ width: 80, padding: '8px 8px' }}>Fine/Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr><td colSpan={8} className={styles.emptyState} style={{ padding: 30 }}>No fee heads match your search.</td></tr>
                    ) : (
                      visibleRows.map((r) => (
                        <tr key={r.key}>
                          <td style={{ padding: '8px 8px' }}>
                            <input
                              type="checkbox"
                              checked={r.enabled}
                              onChange={(e) => setRow(r.key, { enabled: e.target.checked })}
                              style={{ width: 15, height: 15 }}
                            />
                          </td>
                          <td className={styles.textBold} style={{ padding: '8px 8px', fontSize: 13 }}>
                            {r.category_name}
                            {r.structure_id && (
                              <span className={styles.badge} style={{ marginLeft: 6, padding: '2px 4px', fontSize: 9, background: '#ecfeff', color: '#0e7490' }}>
                                Existing
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 8px' }}><span className={styles.badge} style={{ fontSize: 10, padding: '2px 6px' }}>{r.category_type}</span></td>
                          <td className={styles.textRight} style={{ padding: '8px 8px' }}>
                            <input
                              className={styles.input}
                              type="number"
                              min="0"
                              step="0.01"
                              value={r.amount}
                              disabled={!r.enabled}
                              onChange={(e) => setRow(r.key, { amount: e.target.value })}
                              style={{ width: 85, marginLeft: 'auto', padding: '5px 8px', fontSize: 13 }}
                              placeholder="0"
                            />
                          </td>
                          <td style={{ padding: '8px 8px' }}>
                            <input
                              className={styles.input}
                              type="date"
                              value={r.due_date}
                              disabled={!r.enabled}
                              onChange={(e) => setRow(r.key, { due_date: e.target.value })}
                              style={{ padding: '5px 8px', fontSize: 13, width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '8px 8px' }}>
                            <select
                              className={styles.input}
                              value={r.term}
                              disabled={!r.enabled}
                              onChange={(e) => setRow(r.key, { term: e.target.value })}
                              style={{ padding: '5px 8px', fontSize: 13, width: '100%' }}
                            >
                              {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '8px 8px' }}>
                            <select
                              className={styles.input}
                              value={r.is_mandatory ? 'yes' : 'no'}
                              disabled={!r.enabled}
                              onChange={(e) => setRow(r.key, { is_mandatory: e.target.value === 'yes' })}
                              style={{ padding: '5px 8px', fontSize: 13, width: '100%' }}
                            >
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </td>
                          <td className={styles.textRight} style={{ padding: '8px 8px' }}>
                            <input
                              className={styles.input}
                              type="number"
                              min="0"
                              step="0.01"
                              value={r.late_fine_per_day}
                              disabled={!r.enabled}
                              onChange={(e) => setRow(r.key, { late_fine_per_day: e.target.value })}
                              style={{ width: 80, marginLeft: 'auto', padding: '5px 8px', fontSize: 13 }}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--finance-text-muted)', fontSize: 13 }}>
              <AlertTriangle size={16} />
              This modal creates/updates selected fee heads for the chosen class and year. It does not auto-delete unchecked existing entries.
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>Close</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving || loading}>
              {saving ? <Loader2 size={16} className={styles.spin} /> : null} Save Setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StructureModal({ editing, categories, classes, academicYears, onClose, onSaved, push }) {
  const [form, setForm] = useState(editing || { academic_year: '', school_class: '', category: '', amount: '', due_date: '', term: 'monthly', is_mandatory: true, late_fine_per_day: 0 });
  const [instalments, setInstalments] = useState([]);
  const [addingInstalment, setAddingInstalment] = useState(false);
  const [newIns, setNewIns] = useState({ instalment_number: '', amount: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing?.id) { adminApi.getFeeInstalments({ fee_structure: editing.id }).then(r => setInstalments(r.data || [])).catch(() => {}); }
  }, [editing?.id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.academic_year || !form.school_class || !form.category || !form.amount || !form.due_date) return push('Please fill all required fields.', 'error');
    setSaving(true);
    try {
      if (editing?.id) { await adminApi.updateFeeStructure(editing.id, form); push('Structure updated.', 'success'); }
      else { await adminApi.createFeeStructure(form); push('Structure created.', 'success'); }
      onSaved();
    } catch { push('Failed to save structure.', 'error'); }
    finally { setSaving(false); }
  };

  const addInstalment = async () => {
    if (!editing?.id) return push('Save the structure first, then add instalments.', 'warn');
    if (!newIns.amount || !newIns.due_date || !newIns.instalment_number) return push('Fill all instalment fields.', 'error');
    try {
      await adminApi.createFeeInstalment({ ...newIns, fee_structure: editing.id });
      const r = await adminApi.getFeeInstalments({ fee_structure: editing.id });
      setInstalments(r.data || []); setNewIns({ instalment_number: '', amount: '', due_date: '' }); setAddingInstalment(false);
      push('Instalment added.', 'success');
    } catch { push('Failed to add instalment.', 'error'); }
  };

  const deleteInstalment = async (id) => {
    try { await adminApi.deleteFeeInstalment(id); setInstalments(p => p.filter(i => i.id !== id)); push('Instalment removed.', 'success'); }
    catch { push('Failed to remove.', 'error'); }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: 800 }}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{editing?.id ? 'Edit Fee Structure' : 'Add Fee Structure'}</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Academic Year *</label>
                <select className={styles.input} value={form.academic_year} onChange={e => set('academic_year', e.target.value)} required>
                  <option value="">Select Year</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Class *</label>
                <select className={styles.input} value={form.school_class} onChange={e => set('school_class', e.target.value)} required>
                  <option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Fee Head *</label>
                <select className={styles.input} value={form.category} onChange={e => set('category', e.target.value)} required>
                  <option value="">Select Fee Head</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Amount (₹) *</label>
                <input className={styles.input} type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Due Date *</label>
                <input className={styles.input} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Frequency</label>
                <select className={styles.input} value={form.term} onChange={e => set('term', e.target.value)}>
                  {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Late Fine / Day (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01" value={form.late_fine_per_day} onChange={e => set('late_fine_per_day', e.target.value)} />
              </div>
              <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginTop: 24 }}>
                  <input type="checkbox" checked={form.is_mandatory} onChange={e => set('is_mandatory', e.target.checked)} style={{ width: 16, height: 16 }} />
                  <span>Mandatory for all students</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' }}>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <Loader2 size={16} className={styles.spin} /> : null} {editing?.id ? 'Update Setup' : 'Save Setup'}</button>
            </div>
          </form>

          {/* Instalment Plans */}
          {editing?.id && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Instalment Plans</h4>
                <button className={styles.btnSecondary} onClick={() => setAddingInstalment(true)}><Plus size={14} /> Add</button>
              </div>
              
              {instalments.length === 0 && !addingInstalment && <p className={styles.emptyState} style={{ padding: 20 }}>No instalments. Break this annual fee into smaller chunks.</p>}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {instalments.map(ins => (
                  <div key={ins.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 40px', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 800 }}>#{ins.instalment_number}</span>
                    <span className={styles.fontMono} style={{ fontWeight: 700 }}>₹{ins.amount}</span>
                    <span style={{ color: 'var(--finance-text-muted)' }}>{ins.due_date}</span>
                    <div className={styles.actions}><button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => deleteInstalment(ins.id)}><Trash2 size={14} /></button></div>
                  </div>
                ))}
              </div>

              {addingInstalment && (
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr auto auto', gap: 12, alignItems: 'center', background: '#fff', padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 12 }}>
                  <input className={styles.input} type="number" placeholder="No." min="1" value={newIns.instalment_number} onChange={e => setNewIns(p => ({ ...p, instalment_number: e.target.value }))} />
                  <input className={styles.input} type="number" placeholder="Amount (₹)" min="0" value={newIns.amount} onChange={e => setNewIns(p => ({ ...p, amount: e.target.value }))} />
                  <input className={styles.input} type="date" value={newIns.due_date} onChange={e => setNewIns(p => ({ ...p, due_date: e.target.value }))} />
                  <button className={styles.btnPrimary} onClick={addInstalment}>Add</button>
                  <button className={styles.btnSecondary} onClick={() => setAddingInstalment(false)}><X size={16} /></button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Copy Structure Modal ─────────────────────────────────────────────────────
function CopyStructureModal({ classes, academicYears, onClose, onSaved, push }) {
  const [form, setForm] = useState({ from_class: '', to_class: '', academic_year: '', increase_percent: 0 });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCopy = async (e) => {
    e.preventDefault();
    if (!form.from_class || !form.to_class || !form.academic_year) return push('Please fill all required fields.', 'error');
    setSaving(true);
    try {
      await adminApi.copyFeeStructure(form);
      push('Fee structure copied successfully!', 'success'); onSaved();
    } catch { push('Failed to copy structure.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Copy Fee Structure</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleCopy}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Academic Year *</label>
              <select className={styles.input} value={form.academic_year} onChange={e => set('academic_year', e.target.value)} required>
                <option value="">Select Year</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Copy From Class *</label>
              <select className={styles.input} value={form.from_class} onChange={e => set('from_class', e.target.value)} required>
                <option value="">Select Source Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Copy To Class *</label>
              <select className={styles.input} value={form.to_class} onChange={e => set('to_class', e.target.value)} required>
                <option value="">Select Target Class</option>{classes.filter(c => c.id !== Number(form.from_class)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Increase by % (optional)</label>
              <input className={styles.input} type="number" min="0" max="100" step="0.1" value={form.increase_percent} onChange={e => set('increase_percent', e.target.value)} placeholder="0" />
            </div>
            <div style={{ marginTop: 16, padding: 16, background: '#fffbeb', color: '#92400e', borderRadius: 8, fontSize: 13, border: '1px solid #fde68a' }}>
              All fee heads from the source class will be duplicated to the target class for this academic year.
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <Loader2 size={16} className={styles.spin} /> : null} Copy Structure</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── View Group Modal ─────────────────────────────────────────────────────────
function ViewGroupModal({ group, onClose, terms }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: 800 }}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Fee Structure for {group.class_name}</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fee Head</th>
                  <th>Type</th>
                  <th className={styles.textRight}>Amount</th>
                  <th>Due Date</th>
                  <th>Frequency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {group.components.map(s => (
                  <tr key={s.id}>
                    <td>{s.category_name}</td>
                    <td><span className={styles.badge}>{s.category_type}</span></td>
                    <td className={`${styles.fontMono} ${styles.textRight}`}>₹{Number(s.amount).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{s.due_date}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{terms.find(t => t.value === s.term)?.label || s.term}</td>
                    <td>{s.is_mandatory ? <span className={styles.badgePaid} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800 }}>Mandatory</span> : <span className={styles.badgeDanger} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800 }}>Optional</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className={styles.textRight} style={{ fontWeight: 800, padding: '16px 8px' }}>Total Amount</td>
                  <td className={`${styles.fontMono} ${styles.textRight}`} style={{ fontWeight: 800, padding: '16px 8px', color: '#0f172a' }}>₹{group.total_amount.toLocaleString('en-IN')}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FeeStructure() {
  const [categories, setCategories] = useState([]);
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('heads');  // 'heads' or 'structures'
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const [headModal, setHeadModal] = useState(null);
  const [structModal, setStructModal] = useState(null);
  const [copyModal, setCopyModal] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [viewGroupModal, setViewGroupModal] = useState(null);

  const { push, toasts, dismiss } = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catRes, classRes, yearRes] = await Promise.all([adminApi.getFeeCategories(), adminApi.getClasses(), adminApi.getAcademicYears()]);
      setCategories(catRes.data || []); setClasses(classRes.data || []); setAcademicYears(yearRes.data || []);
    } catch { push('Failed to load data.', 'error'); }
    finally { setLoading(false); }
  };

  const fetchStructures = async () => {
    const params = {}; if (filterClass) params.class = filterClass; if (filterYear) params.academic_year = filterYear;
    try { const r = await adminApi.getFeeStructures(params); setStructures(r.data || []); }
    catch { push('Failed to load structures.', 'error'); }
  };

  useEffect(() => { if (tab === 'structures') fetchStructures(); }, [tab, filterClass, filterYear]);

  const deleteCategory = async (id) => {
    if (!confirm('Delete this fee head?')) return;
    try { await adminApi.deleteFeeCategory(id); setCategories(p => p.filter(c => c.id !== id)); push('Fee head deleted.', 'success'); }
    catch { push('Failed to delete.', 'error'); }
  };

  const deleteStructure = async (id) => {
    if (!confirm('Delete this fee structure entry?')) return;
    try { await adminApi.deleteFeeStructure(id); setStructures(p => p.filter(s => s.id !== id)); push('Structure deleted.', 'success'); }
    catch { push('Failed to delete.', 'error'); }
  };

  const groupedCategories = useMemo(() => {
    const grp = {}; categories.forEach(c => { if (!grp[c.fee_type]) grp[c.fee_type] = []; grp[c.fee_type].push(c); });
    return grp;
  }, [categories]);

  const groupedStructures = useMemo(() => {
    const groups = {};
    structures.forEach(s => {
      const key = `${s.academic_year || 'any'}-${s.school_class || s.class_name}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          class_name: s.class_name,
          school_class: s.school_class,
          academic_year: s.academic_year,
          total_amount: 0,
          components: []
        };
      }
      groups[key].components.push(s);
      groups[key].total_amount += Number(s.amount) || 0;
    });
    return Object.values(groups);
  }, [structures]);

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading setup data...</div>;

  return (
    <div>
      {/* Sub Navigation Pills */}
      <div style={{ display: 'flex', marginBottom: 24, padding: 4, background: '#f1f5f9', borderRadius: 12, width: 'fit-content' }}>
        <button onClick={() => setTab('heads')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: tab === 'heads' ? '#fff' : 'transparent', color: tab === 'heads' ? '#091426' : '#64748b', border: 'none', borderRadius: 8, boxShadow: tab === 'heads' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
          <Tag size={16} /> Fee Heads
        </button>
        <button onClick={() => setTab('structures')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: tab === 'structures' ? '#fff' : 'transparent', color: tab === 'structures' ? '#091426' : '#64748b', border: 'none', borderRadius: 8, boxShadow: tab === 'structures' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
          <DollarSign size={16} /> Class Structures
        </button>
      </div>

      {tab === 'heads' && (
        <div className={styles.card} style={{ padding: 0 }}>
          <div className={styles.cardHeader} style={{ padding: 24 }}>
            <div><h3 className={styles.cardTitle}>Global Fee Heads</h3><p className={styles.cardSubtitle}>Define the categories of fees collected by the institution</p></div>
            <button className={styles.btnPrimary} onClick={() => setHeadModal({})}><Plus size={14} /> New Head</button>
          </div>
          
          <div style={{ padding: 24, paddingTop: 0 }}>
            {categories.length === 0 ? <div className={styles.emptyState}>No fee heads yet.</div> : Object.entries(groupedCategories).map(([type, cats]) => (
              <div key={type} style={{ marginBottom: 32 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 16 }}>{FEE_TYPES.find(t => t.value === type)?.label || type}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {cats.map(cat => (
                    <div key={cat.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>{cat.name}</h4>
                        <div className={styles.actions}>
                          <button className={styles.iconBtn} onClick={() => setHeadModal(cat)}><Pencil size={14} /></button>
                          <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => deleteCategory(cat.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {cat.description && <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{cat.description}</p>}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 8 }}>
                        {cat.is_optional && <span className={styles.badge} style={{ background: '#fef3c7', color: '#b45309' }}>Optional</span>}
                        {cat.is_refundable && <span className={styles.badge} style={{ background: '#e0f2fe', color: '#0369a1' }}>Refundable</span>}
                        {!cat.is_optional && <span className={styles.badge} style={{ background: '#f1f5f9', color: '#475569' }}>Mandatory</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'structures' && (
        <div className={styles.card} style={{ padding: 0 }}>
          <div className={styles.cardHeader} style={{ padding: 24 }}>
            <div><h3 className={styles.cardTitle}>Class Fee Structures</h3><p className={styles.cardSubtitle}>Assign fee heads to classes and set amounts</p></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className={styles.btnSecondary} onClick={() => setConfigModal(true)}><DollarSign size={14} /> Configure</button>
              <button className={styles.btnSecondary} onClick={() => setCopyModal(true)}><Copy size={14} /> Copy Setup</button>
              <button className={styles.btnPrimary} onClick={() => setStructModal({})}><Plus size={14} /> Assign Fee</button>
            </div>
          </div>
          <div style={{ padding: '0 24px 24px', display: 'flex', gap: 16, borderBottom: '1px solid #f1f5f9' }}>
             <select className={styles.input} style={{ width: 200 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}><option value="">All Years</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select>
             <select className={styles.input} style={{ width: 200 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}><option value="">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          
          <div className={styles.tableResponsive} style={{ borderTop: 'none', borderRadius: 0, margin: 0 }}>
            <table className={styles.table}>
              <thead><tr><th>Class</th><th>Fee Components</th><th className={styles.textRight}>Total Amount</th><th className={styles.textRight}>Actions</th></tr></thead>
              <tbody>
                {groupedStructures.length === 0 ? <tr><td colSpan={4} className={styles.emptyState}>No class structures assigned.</td></tr> : groupedStructures.map(g => (
                  <tr key={g.key}>
                    <td className={styles.textBold} style={{ fontSize: 14 }}>{g.class_name}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{g.components.length} fee heads</td>
                    <td className={`${styles.fontMono} ${styles.textRight}`} style={{ fontWeight: 800, color: '#0f172a' }}>₹{g.total_amount.toLocaleString('en-IN')}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.btnSecondary} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setViewGroupModal(g)}><Eye size={14} /> View Structure</button>
                        <button className={styles.iconBtn} onClick={() => setConfigModal({ class: g.school_class, year: g.academic_year })} title="Edit Structure"><Pencil size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {configModal && (
        <ConfigureFeeStructureModal
          categories={categories}
          classes={classes}
          academicYears={academicYears}
          initialAcademicYear={typeof configModal === 'object' ? configModal.year : filterYear}
          initialClass={typeof configModal === 'object' ? configModal.class : filterClass}
          onClose={() => setConfigModal(false)}
          onSaved={() => { setConfigModal(false); fetchStructures(); }}
          push={push}
        />
      )}

      {headModal && (
        <FeeHeadModal
          editing={headModal?.id ? headModal : null}
          onClose={() => setHeadModal(null)}
          onSaved={() => { setHeadModal(null); fetchAll(); }}
          push={push}
        />
      )}

      {structModal && (
        <StructureModal
          editing={structModal?.id ? structModal : null}
          categories={categories}
          classes={classes}
          academicYears={academicYears}
          onClose={() => setStructModal(null)}
          onSaved={() => { setStructModal(null); fetchStructures(); }}
          push={push}
        />
      )}

      {copyModal && (
        <CopyStructureModal
          classes={classes}
          academicYears={academicYears}
          onClose={() => setCopyModal(false)}
          onSaved={() => { setCopyModal(false); fetchStructures(); }}
          push={push}
        />
      )}

      {viewGroupModal && (
        <ViewGroupModal
          group={viewGroupModal}
          onClose={() => setViewGroupModal(null)}
          terms={TERMS}
        />
      )}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
