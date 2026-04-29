'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Eye, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
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

function Modal({ open, title, onClose, children, width = 780 }) {
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
            ✕
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

export default function AlumniEvents() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
    venue: '',
  });

  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpRows, setRsvpRows] = useState([]);
  const [rsvpEvent, setRsvpEvent] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await alumniApi.listEvents();
      setEvents(normalizeList(res.data));
    } catch (e) {
      console.error(e);
      alert('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', start_at: '', end_at: '', venue: '' });
    setModalOpen(true);
  };

  const openEdit = (evt) => {
    setEditing(evt);
    setForm({
      title: evt.title || '',
      description: evt.description || '',
      start_at: evt.start_at ? String(evt.start_at).slice(0, 16) : '',
      end_at: evt.end_at ? String(evt.end_at).slice(0, 16) : '',
      venue: evt.venue || '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title?.trim()) return alert('Title is required.');
    if (!form.start_at) return alert('Start date/time is required.');

    const payload = {
      title: form.title,
      description: form.description,
      start_at: form.start_at,
      end_at: form.end_at || null,
      venue: form.venue,
    };

    setSaving(true);
    try {
      if (editing?.id) await alumniApi.updateEvent(editing.id, payload);
      else await alumniApi.createEvent(payload);
      setModalOpen(false);
      await fetchEvents();
    } catch (e) {
      console.error(e);
      alert('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (evt) => {
    if (!confirm(`Delete event "${evt?.title}"?`)) return;
    try {
      await alumniApi.deleteEvent(evt.id);
      await fetchEvents();
    } catch (e) {
      console.error(e);
      alert('Delete failed.');
    }
  };

  const viewRsvps = async (evt) => {
    setRsvpEvent(evt);
    setRsvpRows([]);
    setRsvpOpen(true);
    setRsvpLoading(true);
    try {
      const res = await alumniApi.getEventRsvps(evt.id);
      setRsvpRows(normalizeList(res.data));
    } catch (e) {
      console.error(e);
      alert('Failed to load RSVPs.');
    } finally {
      setRsvpLoading(false);
    }
  };

  const sendInvite = async (evt, type) => {
    const subject = type === 'reminder' ? `Reminder: ${evt.title}` : `Invitation: ${evt.title}`;
    const msg = type === 'reminder'
      ? `Reminder for the alumni event "${evt.title}".\n\nWhen: ${new Date(evt.start_at).toLocaleString()}\nWhere: ${evt.venue || 'TBA'}\n\nPlease RSVP if you haven't yet.`
      : `You're invited to the alumni event "${evt.title}".\n\nWhen: ${new Date(evt.start_at).toLocaleString()}\nWhere: ${evt.venue || 'TBA'}\n\nPlease RSVP.`;

    if (!confirm(`Create and send an announcement?\n\n${subject}`)) return;

    try {
      const createRes = await alumniApi.createCommunication({
        channel: 'email',
        subject,
        message: msg,
        segment_filters: {},
        status: 'draft',
      });
      await alumniApi.sendCommunication(createRes.data.id);
      alert('Invitation marked as sent.');
    } catch (e) {
      console.error(e);
      alert('Failed to send invitation.');
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
              background: '#F5F3FF',
              borderRadius: 12,
              color: '#7C3AED',
            }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>Event Management</div>
            <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>Create reunions, webinars, meetups — track RSVPs & send reminders</div>
          </div>
        </div>

        <button
          onClick={openCreate}
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
          <Plus size={18} /> Create Event
        </button>
      </div>

      <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr',
            background: 'var(--theme-bg-subtle)',
            padding: '12px 14px',
            fontSize: 12,
            fontWeight: 900,
            color: 'var(--theme-text-muted)',
            borderBottom: '1px solid var(--theme-border-subtle)',
          }}
        >
          <div>Event</div>
          <div>Date/Time</div>
          <div>Venue</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No events yet.</div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr',
                padding: '12px 14px',
                borderBottom: '1px solid var(--theme-border-subtle)',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{evt.title}</div>
                <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>
                  RSVP: {evt.rsvp_counts?.going || 0} going • {evt.rsvp_counts?.maybe || 0} maybe • {evt.rsvp_counts?.not_going || 0} not going
                </div>
              </div>
              <div style={{ color: 'var(--theme-text)' }}>{new Date(evt.start_at).toLocaleString()}</div>
              <div style={{ color: 'var(--theme-text)' }}>{evt.venue || '—'}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => viewRsvps(evt)}
                  title="View RSVPs"
                  style={{
                    border: '1px solid var(--theme-border-subtle)',
                    background: 'var(--theme-bg-white)',
                    borderRadius: 10,
                    padding: '8px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={16} />
                </button>

                <button
                  onClick={() => sendInvite(evt, 'invite')}
                  title="Send invitation"
                  style={{
                    border: 'none',
                    background: '#DBEAFE',
                    color: '#1E40AF',
                    borderRadius: 10,
                    padding: '8px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <Megaphone size={16} />
                </button>

                <button
                  onClick={() => sendInvite(evt, 'reminder')}
                  title="Send reminder"
                  style={{
                    border: 'none',
                    background: '#FEF3C7',
                    color: '#92400E',
                    borderRadius: 10,
                    padding: '8px 10px',
                    cursor: 'pointer',
                    fontWeight: 900,
                  }}
                >
                  R
                </button>

                <button
                  onClick={() => openEdit(evt)}
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
                  onClick={() => remove(evt)}
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

      <Modal open={modalOpen} title={editing ? 'Edit Event' : 'Create Event'} onClose={() => (saving ? null : setModalOpen(false))}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Title</div>
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Start</div>
            <input type="datetime-local" value={form.start_at} onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>End (optional)</div>
            <input type="datetime-local" value={form.end_at} onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))} style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Venue</div>
            <input value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} placeholder="e.g. Auditorium" style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--theme-text-muted)', marginBottom: 6 }}>Description</div>
            <textarea
              rows={6}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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

      <Modal open={rsvpOpen} title={`RSVPs${rsvpEvent ? `: ${rsvpEvent.title}` : ''}`} onClose={() => setRsvpOpen(false)} width={680}>
        {rsvpLoading ? (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading RSVPs...</div>
        ) : rsvpRows.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No RSVPs recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rsvpRows.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid var(--theme-border-subtle)',
                  background: 'var(--theme-bg-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{r.alumni_name || r.alumni}</div>
                  <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>{r.note || ''}</div>
                </div>
                <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{r.status}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

