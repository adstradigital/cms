'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2, Upload, CheckCircle2, XCircle, BadgeCheck, BadgeX } from 'lucide-react';
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
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--theme-text-muted)' }}
            aria-label="Close"
          >
            <XCircle size={18} />
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

export default function AlumniManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [filters, setFilters] = useState({
    search: '',
    graduation_year: '',
    industry: '',
    location: '',
    status: '',
    is_verified: '',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    graduation_year: '',
    class_stream: '',
    email: '',
    phone: '',
    job_role: '',
    organization: '',
    industry: '',
    location: '',
    status: 'approved',
    is_verified: false,
  });

  const [importing, setImporting] = useState(false);
  const [importDefaultStatus, setImportDefaultStatus] = useState('pending');

  const queryParams = useMemo(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) p[k] = v;
    });
    return p;
  }, [filters]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await alumniApi.listAlumni(queryParams);
      setRows(normalizeList(res.data));
    } catch (e) {
      console.error(e);
      alert('Failed to load alumni list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      graduation_year: '',
      class_stream: '',
      email: '',
      phone: '',
      job_role: '',
      organization: '',
      industry: '',
      location: '',
      status: 'approved',
      is_verified: false,
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      graduation_year: row.graduation_year || '',
      class_stream: row.class_stream || '',
      email: row.email || '',
      phone: row.phone || '',
      job_role: row.job_role || '',
      organization: row.organization || '',
      industry: row.industry || '',
      location: row.location || '',
      status: row.status || 'approved',
      is_verified: Boolean(row.is_verified),
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) return alert('Name is required.');
    if (!String(form.graduation_year || '').trim()) return alert('Graduation year is required.');

    const payload = {
      ...form,
      graduation_year: Number(form.graduation_year),
    };

    setSaving(true);
    try {
      if (editing?.id) {
        await alumniApi.updateAlumni(editing.id, payload);
      } else {
        await alumniApi.createAlumni(payload);
      }
      setModalOpen(false);
      await fetchRows();
    } catch (e) {
      console.error(e);
      alert('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete alumni record for "${row?.name}"?`)) return;
    try {
      await alumniApi.deleteAlumni(row.id);
      await fetchRows();
    } catch (e) {
      console.error(e);
      alert('Delete failed.');
    }
  };

  const toggleVerified = async (row) => {
    try {
      if (row.is_verified) await alumniApi.unverifyAlumni(row.id);
      else await alumniApi.verifyAlumni(row.id);
      await fetchRows();
    } catch (e) {
      console.error(e);
      alert('Update failed.');
    }
  };

  const approveReject = async (row, action) => {
    try {
      if (action === 'approve') await alumniApi.approveAlumni(row.id);
      else await alumniApi.rejectAlumni(row.id);
      await fetchRows();
    } catch (e) {
      console.error(e);
      alert('Action failed.');
    }
  };

  const onImportFile = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await alumniApi.importAlumni(file, { defaultStatus: importDefaultStatus });
      const created = res.data?.created ?? 0;
      const errors = res.data?.errors ?? [];
      alert(`Import complete. Created: ${created}. Errors: ${errors.length}.`);
      await fetchRows();
    } catch (e) {
      console.error(e);
      alert('Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const onExport = async () => {
    try {
      const res = await alumniApi.exportAlumniCsv(queryParams);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alumni_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Export failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <div
        style={{
          background: 'var(--theme-bg-subtle)',
          border: '1px solid var(--theme-border-subtle)',
          borderRadius: 16,
          padding: 16,
          display: 'grid',
          gridTemplateColumns: '1.25fr 0.7fr 0.9fr 0.9fr 0.7fr 0.7fr',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Keyword search</div>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--theme-text-muted)' }} />
            <input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Name / company / email..."
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Year</div>
          <input
            type="number"
            value={filters.graduation_year}
            onChange={(e) => setFilters((p) => ({ ...p, graduation_year: e.target.value }))}
            placeholder="e.g. 2020"
            style={inputStyle}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Industry</div>
          <input
            value={filters.industry}
            onChange={(e) => setFilters((p) => ({ ...p, industry: e.target.value }))}
            placeholder="e.g. IT"
            style={inputStyle}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Location</div>
          <input
            value={filters.location}
            onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))}
            placeholder="e.g. Pune"
            style={inputStyle}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Status</div>
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            style={inputStyle}
          >
            <option value="">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Verified</div>
          <select
            value={filters.is_verified}
            onChange={(e) => setFilters((p) => ({ ...p, is_verified: e.target.value }))}
            style={inputStyle}
          >
            <option value="">All</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={fetchRows}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--theme-primary)',
                color: 'white',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Apply Filters
            </button>
            <button
              onClick={() =>
                setFilters({
                  search: '',
                  graduation_year: '',
                  industry: '',
                  location: '',
                  status: '',
                  is_verified: '',
                })
              }
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--theme-border-subtle)',
                background: 'var(--theme-bg-white)',
                color: 'var(--theme-text)',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--theme-border-subtle)',
                background: 'var(--theme-bg-white)',
                cursor: importing ? 'not-allowed' : 'pointer',
                opacity: importing ? 0.6 : 1,
                fontWeight: 900,
                color: 'var(--theme-text)',
              }}
            >
              <Upload size={18} />
              Import
              <input
                type="file"
                accept=".csv,.xlsx,.xlsm"
                disabled={importing}
                onChange={(e) => onImportFile(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
            </label>

            <select value={importDefaultStatus} onChange={(e) => setImportDefaultStatus(e.target.value)} style={{ ...inputStyle, width: 170 }}>
              <option value="pending">Import as Pending</option>
              <option value="approved">Import as Approved</option>
              <option value="rejected">Import as Rejected</option>
            </select>

            <button
              onClick={onExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--theme-border-subtle)',
                background: 'var(--theme-bg-white)',
                cursor: 'pointer',
                fontWeight: 900,
                color: 'var(--theme-text)',
              }}
            >
              <Download size={18} /> Export CSV
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
              <Plus size={18} /> Add Alumni
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 0.8fr 1.2fr 1.4fr 1fr 0.9fr 1.1fr',
            gap: 0,
            background: 'var(--theme-bg-subtle)',
            padding: '12px 14px',
            fontSize: 12,
            fontWeight: 900,
            color: 'var(--theme-text-muted)',
            borderBottom: '1px solid var(--theme-border-subtle)',
          }}
        >
          <div>Alumni</div>
          <div>Year</div>
          <div>Company</div>
          <div>Role</div>
          <div>Location</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No alumni found.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.8fr 1.2fr 1.4fr 1fr 0.9fr 1.1fr',
                padding: '12px 14px',
                borderBottom: '1px solid var(--theme-border-subtle)',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>
                  {r.email || '—'} {r.phone ? `• ${r.phone}` : ''} {r.is_verified ? '• Verified' : ''}
                </div>
              </div>
              <div style={{ color: 'var(--theme-text)' }}>{r.graduation_year}</div>
              <div style={{ color: 'var(--theme-text)' }}>{r.organization || '—'}</div>
              <div style={{ color: 'var(--theme-text)' }}>{r.job_role || '—'}</div>
              <div style={{ color: 'var(--theme-text)' }}>{r.location || '—'}</div>
              <div style={{ color: 'var(--theme-text)' }}>{r.status}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => toggleVerified(r)}
                  title={r.is_verified ? 'Mark unverified' : 'Mark verified'}
                  style={{
                    border: '1px solid var(--theme-border-subtle)',
                    background: 'var(--theme-bg-white)',
                    borderRadius: 10,
                    padding: '8px 10px',
                    cursor: 'pointer',
                  }}
                >
                  {r.is_verified ? <BadgeX size={16} /> : <BadgeCheck size={16} />}
                </button>

                {r.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => approveReject(r, 'approve')}
                      title="Approve"
                      style={{
                        border: 'none',
                        background: '#DCFCE7',
                        color: '#166534',
                        borderRadius: 10,
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      onClick={() => approveReject(r, 'reject')}
                      title="Reject"
                      style={{
                        border: 'none',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        borderRadius: 10,
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <XCircle size={16} />
                    </button>
                  </>
                ) : null}

                <button
                  onClick={() => openEdit(r)}
                  title="Edit"
                  style={{
                    border: '1px solid var(--theme-border-subtle)',
                    background: 'var(--theme-bg-white)',
                    borderRadius: 10,
                    padding: '8px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => remove(r)}
                  title="Delete"
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

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editing ? 'Edit Alumni' : 'Add Alumni'}
        onClose={() => (saving ? null : setModalOpen(false))}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Name</div>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Graduation year</div>
            <input
              type="number"
              value={form.graduation_year}
              onChange={(e) => setForm((p) => ({ ...p, graduation_year: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Class / Stream</div>
            <input
              value={form.class_stream}
              onChange={(e) => setForm((p) => ({ ...p, class_stream: e.target.value }))}
              placeholder="e.g. Science"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Email</div>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Phone</div>
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Organization</div>
            <input
              value={form.organization}
              onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Job role</div>
            <input value={form.job_role} onChange={(e) => setForm((p) => ({ ...p, job_role: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Industry</div>
            <input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Location</div>
            <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Status</div>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="alumni-verified"
              type="checkbox"
              checked={form.is_verified}
              onChange={(e) => setForm((p) => ({ ...p, is_verified: e.target.checked }))}
            />
            <label htmlFor="alumni-verified" style={{ fontWeight: 900, color: 'var(--theme-text)' }}>
              Verified alumni
            </label>
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

