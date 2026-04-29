'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { HandCoins, Plus, Trash2 } from 'lucide-react';
import alumniApi from '@/api/alumniApi';

const normalizeList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--theme-border-subtle)',
  outline: 'none',
  background: 'var(--theme-bg-white)',
  color: 'var(--theme-text)',
};

function Modal({ open, title, onClose, children, width = 680 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          background: 'var(--theme-bg-white)',
          borderRadius: 16,
          border: '1px solid var(--theme-border-subtle)',
          boxShadow: 'var(--theme-shadow-md)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--theme-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{title}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--theme-text-muted)' }}>
            ✕
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

export default function AlumniContributions() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [alumniOptions, setAlumniOptions] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    alumni: '',
    amount: '',
    currency: 'INR',
    contributed_on: '',
    note: '',
  });

  const totals = useMemo(() => {
    const byCurrency = {};
    rows.forEach((r) => {
      const c = r.currency || 'INR';
      const amt = Number(r.amount || 0);
      byCurrency[c] = (byCurrency[c] || 0) + (Number.isFinite(amt) ? amt : 0);
    });
    return byCurrency;
  }, [rows]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [contribRes, alumniRes] = await Promise.all([alumniApi.listContributions(), alumniApi.listAlumni({ status: 'approved' })]);
      setRows(normalizeList(contribRes.data));
      setAlumniOptions(normalizeList(alumniRes.data));
    } catch (e) {
      console.error(e);
      alert('Failed to load contributions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openAdd = () => {
    setForm({ alumni: '', amount: '', currency: 'INR', contributed_on: '', note: '' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.alumni) return alert('Select an alumni.');
    if (!String(form.amount || '').trim()) return alert('Amount is required.');

    setSaving(true);
    try {
      await alumniApi.createContribution({
        alumni: Number(form.alumni),
        amount: String(form.amount),
        currency: form.currency || 'INR',
        contributed_on: form.contributed_on || undefined,
        note: form.note || '',
      });
      setModalOpen(false);
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm('Delete this contribution record?')) return;
    try {
      await alumniApi.deleteContribution(row.id);
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert('Delete failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ECFDF5',
              borderRadius: 12,
              color: '#059669',
            }}
          >
            <HandCoins size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>Alumni Contributions</div>
            <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>Record donations/contributions and view history</div>
          </div>
        </div>

        <button
          onClick={openAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--theme-primary)',
            color: 'white',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Add Contribution
        </button>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.keys(totals).length === 0 ? (
          <div style={{ color: 'var(--theme-text-muted)' }}>No contribution totals yet.</div>
        ) : (
          Object.entries(totals).map(([cur, amt]) => (
            <div
              key={cur}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid var(--theme-border-subtle)',
                background: 'var(--theme-bg-subtle)',
                fontWeight: 900,
                color: 'var(--theme-text)',
              }}
            >
              Total: {cur} {amt.toFixed(2)}
            </div>
          ))
        )}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1.2fr 0.8fr',
            background: 'var(--theme-bg-subtle)',
            padding: '12px 14px',
            fontSize: 12,
            fontWeight: 900,
            color: 'var(--theme-text-muted)',
            borderBottom: '1px solid var(--theme-border-subtle)',
          }}
        >
          <div>Alumni</div>
          <div>Amount</div>
          <div>Date</div>
          <div>Note</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No contribution records.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1.2fr 0.8fr',
                padding: '12px 14px',
                borderBottom: '1px solid var(--theme-border-subtle)',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{r.alumni_name || r.alumni}</div>
              <div style={{ color: 'var(--theme-text)' }}>
                {r.currency} {r.amount}
              </div>
              <div style={{ color: 'var(--theme-text)' }}>{r.contributed_on}</div>
              <div style={{ color: 'var(--theme-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note || '—'}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => remove(r)}
                  style={{
                    border: 'none',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    borderRadius: 10,
                    padding: '8px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} title="Add Contribution" onClose={() => (saving ? null : setModalOpen(false))}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Alumni</div>
            <select value={form.alumni} onChange={(e) => setForm((p) => ({ ...p, alumni: e.target.value }))} style={inputStyle}>
              <option value="">Select...</option>
              {alumniOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.graduation_year})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Amount</div>
            <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Currency</div>
            <input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Date</div>
            <input type="date" value={form.contributed_on} onChange={(e) => setForm((p) => ({ ...p, contributed_on: e.target.value }))} style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Note</div>
            <textarea
              rows={4}
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button
            onClick={() => setModalOpen(false)}
            disabled={saving}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--theme-border-subtle)',
              background: 'var(--theme-bg-white)',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              color: 'var(--theme-text)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--theme-primary)',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

