'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Percent } from 'lucide-react';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';

const TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount (₹)' },
  { value: 'full_waiver', label: 'Full Waiver' },
];

function ConcessionModal({ editing, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    concession_type: editing?.concession_type || 'percentage',
    value: editing?.value ?? 0,
    applicable_category: editing?.applicable_category || '',
    is_active: editing?.is_active ?? true,
    remarks: editing?.remarks || '',
  });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing?.id) { await adminApi.updateConcession(editing.id, form); push('Concession updated.', 'success'); }
      else { await adminApi.createConcession(form); push('Concession created.', 'success'); }
      onSaved();
    } catch { push('Failed to save concession.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{editing?.id ? 'Edit Concession' : 'New Concession'}</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Name *</label>
              <input className={styles.input} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Sibling Discount, Merit Scholarship" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Type</label>
              <select className={`${styles.input} ${styles.select}`} value={form.concession_type} onChange={e => set('concession_type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {form.concession_type !== 'full_waiver' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Value ({form.concession_type === 'percentage' ? '%' : '₹'})</label>
                <input className={styles.input} type="number" min="0" step="0.01" value={form.value} onChange={e => set('value', e.target.value)} />
              </div>
            )}
            <div className={styles.formGroup}>
              <label className={styles.label}>Applicable Fee Head (optional)</label>
              <select className={`${styles.input} ${styles.select}`} value={form.applicable_category || ''} onChange={e => set('applicable_category', e.target.value || null)}>
                <option value="">All fee heads</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Remarks</label>
              <textarea className={`${styles.input} ${styles.textarea}`} value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} />
            </div>
            <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <span className={styles.label} style={{ cursor: 'pointer', margin: 0 }} onClick={() => set('is_active', !form.is_active)}>Active Context</span>
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

export default function Concessions() {
  const [concessions, setConcessions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const { push } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, cat] = await Promise.all([adminApi.getConcessions(), adminApi.getFeeCategories()]);
      setConcessions(c.data || []); setCategories(cat.data || []);
    } catch { push('Failed to load concessions.', 'error'); }
    finally { setLoading(false); }
  };

  const deleteConcession = async (id) => {
    if (!confirm('Delete this concession type?')) return;
    try { await adminApi.deleteConcession(id); setConcessions(p => p.filter(c => c.id !== id)); push('Deleted.', 'success'); }
    catch { push('Failed to delete.', 'error'); }
  };

  if (loading) return <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading concessions...</div>;

  return (
    <div>
      <div className={styles.card} style={{ padding: 0 }}>
        <div className={styles.cardHeader} style={{ padding: 24 }}>
          <div>
            <h3 className={styles.cardTitle}>Concessions</h3>
            <p className={styles.cardSubtitle}>Manage scholarships, waivers, and discounts</p>
          </div>
          <button className={styles.btnPrimary} onClick={() => setModal({})}><Plus size={14} /> New Concession</button>
        </div>
        
        <div style={{ padding: 24, paddingTop: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {concessions.length === 0 && <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>No concessions defined yet. Create your first one.</div>}
          
          {concessions.map(c => (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', background: c.is_active ? '#fff' : '#f8fafc', border: `1px solid ${c.is_active ? '#e2e8f0' : '#f1f5f9'}`, borderRadius: 12, padding: 20, boxShadow: c.is_active ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Percent size={20} /></div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.is_active ? '#0f172a' : '#94a3b8' }}>{c.name}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--finance-text-muted)' }}>{TYPES.find(t => t.value === c.concession_type)?.label}</p>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.iconBtn} onClick={() => setModal(c)}><Pencil size={14} /></button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => deleteConcession(c.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              
              <div style={{ marginTop: 24 }}>
                <div className={styles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: c.is_active ? '#16a34a' : '#94a3b8' }}>
                  {c.concession_type !== 'full_waiver' ? (c.concession_type === 'percentage' ? `${c.value}% OFF` : `₹${c.value} OFF`) : 'FULL WAIVER'}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--finance-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{c.applicable_category_name ? `On: ${c.applicable_category_name}` : 'Applies to all fee heads'}</span>
                  {!c.is_active && <span className={styles.badge} style={{ background: '#f1f5f9', color: '#64748b' }}>INACTIVE</span>}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {modal !== null && <ConcessionModal editing={modal} categories={categories} onClose={() => setModal(null)} onSaved={() => { fetchData(); setModal(null); }} />}
    </div>
  );
}
