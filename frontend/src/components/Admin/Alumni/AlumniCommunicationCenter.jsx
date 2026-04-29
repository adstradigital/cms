'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
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

export default function AlumniCommunicationCenter() {
  const [sending, setSending] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logs, setLogs] = useState([]);

  const [form, setForm] = useState({
    channel: 'email',
    subject: '',
    message: '',
    graduation_year: '',
    location: '',
    industry: '',
    is_verified: '',
  });

  const segmentFilters = useMemo(() => {
    const f = {};
    if (form.graduation_year) f.graduation_year = Number(form.graduation_year);
    if (form.location) f.location = form.location;
    if (form.industry) f.industry = form.industry;
    if (form.is_verified !== '') f.is_verified = form.is_verified === 'true';
    return f;
  }, [form.graduation_year, form.industry, form.is_verified, form.location]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await alumniApi.listCommunications();
      setLogs(normalizeList(res.data));
    } catch (e) {
      console.error(e);
      alert('Failed to load communication history.');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const createAndMaybeSend = async ({ sendNow }) => {
    if (!form.message?.trim()) return alert('Message is required.');
    if (form.channel === 'email' && !form.subject?.trim()) return alert('Subject is required for email.');

    setSending(true);
    try {
      const createRes = await alumniApi.createCommunication({
        channel: form.channel,
        subject: form.channel === 'email' ? form.subject : '',
        message: form.message,
        segment_filters: segmentFilters,
        status: 'draft',
      });

      const created = createRes.data;
      if (sendNow) {
        const sendRes = await alumniApi.sendCommunication(created.id);
        alert(`Announcement marked as sent. Recipient count: ${sendRes.data?.recipient_count ?? 0}`);
      } else {
        alert('Draft saved.');
      }

      setForm((p) => ({ ...p, subject: '', message: '' }));
      await fetchLogs();
    } catch (e) {
      console.error(e);
      alert('Failed to send announcement.');
    } finally {
      setSending(false);
    }
  };

  const sendDraft = async (log) => {
    if (!confirm('Send this draft announcement now?')) return;
    try {
      const res = await alumniApi.sendCommunication(log.id);
      alert(`Marked as sent. Recipient count: ${res.data?.recipient_count ?? 0}`);
      await fetchLogs();
    } catch (e) {
      console.error(e);
      alert('Send failed.');
    }
  };

  const deleteLog = async (log) => {
    if (!confirm('Delete this communication log?')) return;
    try {
      await alumniApi.deleteCommunication(log.id);
      await fetchLogs();
    } catch (e) {
      console.error(e);
      alert('Delete failed.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16 }}>
      {/* Composer */}
      <div
        style={{
          border: '1px solid var(--theme-border-subtle)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--theme-bg-white)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFF7ED',
              borderRadius: 12,
              color: '#C2410C',
            }}
          >
            <Megaphone size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>Communication Center</div>
            <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>Bulk email/SMS/in-app announcements with audience segments</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Channel</div>
            <select value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))} style={inputStyle}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="in_app">In-app</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Batch / Graduation year</div>
            <input
              type="number"
              value={form.graduation_year}
              onChange={(e) => setForm((p) => ({ ...p, graduation_year: e.target.value }))}
              placeholder="e.g. 2018"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Location</div>
            <input
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Bengaluru"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Industry</div>
            <input
              value={form.industry}
              onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
              placeholder="e.g. Healthcare"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Verified</div>
            <select value={form.is_verified} onChange={(e) => setForm((p) => ({ ...p, is_verified: e.target.value }))} style={inputStyle}>
              <option value="">All</option>
              <option value="true">Verified only</option>
              <option value="false">Unverified only</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Subject (email only)</div>
            <input
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Announcement subject"
              style={inputStyle}
              disabled={form.channel !== 'email'}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Message</div>
            <textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Type your announcement..."
              rows={7}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => createAndMaybeSend({ sendNow: false })}
            disabled={sending}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--theme-border-subtle)',
              background: 'var(--theme-bg-white)',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              color: 'var(--theme-text)',
              opacity: sending ? 0.7 : 1,
            }}
          >
            Save Draft
          </button>
          <button
            onClick={() => createAndMaybeSend({ sendNow: true })}
            disabled={sending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--theme-primary)',
              color: 'white',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              opacity: sending ? 0.7 : 1,
            }}
          >
            <Send size={18} />
            {sending ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>

      {/* History */}
      <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, overflow: 'hidden', background: 'var(--theme-bg-white)' }}>
        <div
          style={{
            padding: '12px 14px',
            fontWeight: 900,
            color: 'var(--theme-text)',
            borderBottom: '1px solid var(--theme-border-subtle)',
            background: 'var(--theme-bg-subtle)',
          }}
        >
          Communication History
        </div>

        {loadingLogs ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No communications yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((l) => (
              <div
                key={l.id}
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--theme-border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.channel?.toUpperCase()} — {l.subject || '(no subject)'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>
                    Status: {l.status} • Recipients: {l.recipient_count ?? 0}
                    {l.sent_at ? ` • Sent: ${new Date(l.sent_at).toLocaleString()}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {l.status === 'draft' ? (
                    <button
                      onClick={() => sendDraft(l)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'var(--theme-primary)',
                        color: 'white',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      Send
                    </button>
                  ) : null}

                  <button
                    onClick={() => deleteLog(l)}
                    title="Delete log"
                    style={{
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#FEE2E2',
                      color: '#991B1B',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

