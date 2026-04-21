'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Tag, X, Loader2, DollarSign, CheckCircle, XCircle, Copy, AlertTriangle } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
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
function FeeHeadModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing || BLANK_HEAD);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();
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
function StructureModal({ editing, categories, classes, academicYears, onClose, onSaved }) {
  const [form, setForm] = useState(editing || { academic_year: '', school_class: '', category: '', amount: '', due_date: '', term: 'monthly', is_mandatory: true, late_fine_per_day: 0 });
  const [instalments, setInstalments] = useState([]);
  const [addingInstalment, setAddingInstalment] = useState(false);
  const [newIns, setNewIns] = useState({ instalment_number: '', amount: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

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
function CopyStructureModal({ classes, academicYears, onClose, onSaved }) {
  const [form, setForm] = useState({ from_class: '', to_class: '', academic_year: '', increase_percent: 0 });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();
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

  const { push } = useToast();

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
              <thead><tr><th>Class</th><th>Fee Head</th><th>Type</th><th className={styles.textRight}>Amount</th><th>Due Date</th><th>Frequency</th><th>Status</th><th className={styles.textRight}>Fine/Day</th><th className={styles.textRight}>Actions</th></tr></thead>
              <tbody>
                {structures.length === 0 ? <tr><td colSpan={9} className={styles.emptyState}>No class structures assigned.</td></tr> : structures.map(s => (
                  <tr key={s.id}>
                    <td className={styles.textBold}>{s.class_name}</td>
                    <td>{s.category_name}</td>
                    <td><span className={styles.badge}>{s.category_type}</span></td>
                    <td className={`${styles.fontMono} ${styles.textRight}`} style={{ fontWeight: 700 }}>₹{Number(s.amount).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{s.due_date}</td>
                    <td style={{ color: 'var(--finance-text-muted)' }}>{TERMS.find(t => t.value === s.term)?.label}</td>
                    <td>{s.is_mandatory ? <span className={styles.badgePaid} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800 }}>Mandatory</span> : <span className={styles.badgeDanger} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800 }}>Optional</span>}</td>
                    <td className={styles.textRight} style={{ color: 'var(--finance-text-muted)' }}>₹{s.late_fine_per_day}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.iconBtn} onClick={() => setStructModal(s)}><Pencil size={14} /></button>
                        <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => deleteStructure(s.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
