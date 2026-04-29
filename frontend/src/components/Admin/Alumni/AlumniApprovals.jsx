'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, XCircle, BadgeCheck, BadgeX } from 'lucide-react';
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

export default function AlumniApprovals() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    graduation_year: '',
    location: '',
  });

  const queryParams = useMemo(() => {
    const p = { status: 'pending' };
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
      alert('Failed to load pending approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (id) => {
    try {
      await alumniApi.approveAlumni(id);
      await fetchRows();
    } catch (e) {
      console.error(e);
      alert('Approve failed.');
    }
  };

  const reject = async (id) => {
    try {
      await alumniApi.rejectAlumni(id);
      await fetchRows();
    } catch (e) {
      console.error(e);
      alert('Reject failed.');
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
          gridTemplateColumns: '1.4fr 0.7fr 0.9fr auto',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Keyword search</div>
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
          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Year</div>
          <input
            type="number"
            value={filters.graduation_year}
            onChange={(e) => setFilters((p) => ({ ...p, graduation_year: e.target.value }))}
            placeholder="e.g. 2021"
            style={inputStyle}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Location</div>
          <input
            value={filters.location}
            onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))}
            placeholder="e.g. Mumbai"
            style={inputStyle}
          />
        </div>

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
            height: 42,
          }}
        >
          Apply
        </button>
      </div>

      {/* Pending list */}
      <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 0.8fr 1.2fr 1fr 1.2fr',
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
          <div>Location</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No pending approvals.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.8fr 1.2fr 1fr 1.2fr',
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
              <div style={{ color: 'var(--theme-text)' }}>{r.location || '—'}</div>
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

                <button
                  onClick={() => approve(r.id)}
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
                  onClick={() => reject(r.id)}
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

