'use client';

import React, { useEffect, useState } from 'react';
import { Star, Plus, Trash2 } from 'lucide-react';
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

function Modal({ open, title, onClose, children, width = 720 }) {
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

export default function AlumniHighlights() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [alumniOptions, setAlumniOptions] = useState([]);

  const [filters, setFilters] = useState({ visibility: '', is_featured: '' });

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    alumni: '',
    title: '',
    story: '',
    visibility: 'private',
    is_featured: false,
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [achRes, alumniRes] = await Promise.all([
        alumniApi.listAchievements(filters.visibility || filters.is_featured ? filters : undefined),
        alumniApi.listAlumni({ status: 'approved' }),
      ]);
      setRows(normalizeList(achRes.data));
      setAlumniOptions(normalizeList(alumniRes.data));
    } catch (e) {
      console.error(e);
      alert('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setForm({ alumni: '', title: '', story: '', visibility: 'private', is_featured: false });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.alumni) return alert('Select an alumni.');
    if (!form.title?.trim()) return alert('Title is required.');

    setSaving(true);
    try {
      await alumniApi.createAchievement({
        alumni: Number(form.alumni),
        title: form.title,
        story: form.story,
        visibility: form.visibility,
        is_featured: Boolean(form.is_featured),
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

  const toggleFeatured = async (row) => {
    try {
      await alumniApi.updateAchievement(row.id, { is_featured: !row.is_featured });
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert('Update failed.');
    }
  };

  const toggleVisibility = async (row) => {
    const next = row.visibility === 'public' ? 'private' : 'public';
    try {
      await alumniApi.updateAchievement(row.id, { visibility: next });
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert('Update failed.');
    }
  };

  const remove = async (row) => {
    if (!confirm('Delete this achievement/highlight?')) return;
    try {
      await alumniApi.deleteAchievement(row.id);
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
              background: '#FEF3C7',
              borderRadius: 12,
              color: '#92400E',
            }}
          >
            <Star size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>Achievements & Highlights</div>
            <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>Feature notable alumni stories and control visibility</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filters.visibility} onChange={(e) => setFilters((p) => ({ ...p, visibility: e.target.value }))} style={{ ...inputStyle, width: 180 }}>
            <option value="">All visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <select value={filters.is_featured} onChange={(e) => setFilters((p) => ({ ...p, is_featured: e.target.value }))} style={{ ...inputStyle, width: 180 }}>
            <option value="">All</option>
            <option value="true">Featured only</option>
            <option value="false">Not featured</option>
          </select>
          <button
            onClick={fetchAll}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--theme-border-subtle)',
              background: 'var(--theme-bg-white)',
              fontWeight: 900,
              cursor: 'pointer',
              color: 'var(--theme-text)',
            }}
          >
            Apply
          </button>
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
            <Plus size={18} /> Add Highlight
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 0.9fr 0.9fr 0.8fr',
            background: 'var(--theme-bg-subtle)',
            padding: '12px 14px',
            fontSize: 12,
            fontWeight: 900,
            color: 'var(--theme-text-muted)',
            borderBottom: '1px solid var(--theme-border-subtle)',
          }}
        >
          <div>Alumni</div>
          <div>Title</div>
          <div>Visibility</div>
          <div>Featured</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No highlights yet.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 0.9fr 0.9fr 0.8fr',
                padding: '12px 14px',
                borderBottom: '1px solid var(--theme-border-subtle)',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{r.alumni_name || r.alumni}</div>
              <div style={{ color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
              <div style={{ color: 'var(--theme-text)' }}>{r.visibility}</div>
              <div style={{ color: 'var(--theme-text)' }}>{r.is_featured ? 'Yes' : 'No'}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => toggleVisibility(r)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--theme-border-subtle)',
                    background: 'var(--theme-bg-white)',
                    fontWeight: 900,
                    cursor: 'pointer',
                    color: 'var(--theme-text)',
                  }}
                >
                  Toggle visibility
                </button>
                <button
                  onClick={() => toggleFeatured(r)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--theme-border-subtle)',
                    background: 'var(--theme-bg-white)',
                    fontWeight: 900,
                    cursor: 'pointer',
                    color: 'var(--theme-text)',
                  }}
                >
                  {r.is_featured ? 'Unfeature' : 'Feature'}
                </button>
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
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} title="Add Highlight" onClose={() => (saving ? null : setModalOpen(false))}>
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

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Title</div>
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Visibility</div>
            <select value={form.visibility} onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value }))} style={inputStyle}>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="highlight-featured"
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))}
            />
            <label htmlFor="highlight-featured" style={{ fontWeight: 900, color: 'var(--theme-text)' }}>
              Featured
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Story / Award / Achievement</div>
            <textarea
              rows={7}
              value={form.story}
              onChange={(e) => setForm((p) => ({ ...p, story: e.target.value }))}
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

