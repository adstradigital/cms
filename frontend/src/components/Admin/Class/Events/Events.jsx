'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, MapPin, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import styles from './Events.module.css';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { ToastStack, useToast } from '@/components/common/useToast';

const EventsView = ({ section }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [draft, setDraft] = useState({ title: '', body: '', event_start: '', event_end: '', location: '', is_pinned: false });
  const { toasts, push, dismiss } = useToast();

  const load = async () => {
    if (!section?.id) return;
    try {
      setLoading(true);
      const res = await adminApi.getNotifications({ type: 'event', section: section.id }).catch(() => null);
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch {
      push('Could not load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id]);

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const as = a.event_start ? new Date(a.event_start).getTime() : 0;
      const bs = b.event_start ? new Date(b.event_start).getTime() : 0;
      return bs - as;
    });
    return copy;
  }, [items]);

  const create = async () => {
    if (!section?.id || !draft.title.trim()) return;
    try {
      setLoading(true);
      const payload = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        notification_type: 'event',
        target_audience: 'students',
        target_section: section.id,
        target_class: section.school_class,
        is_pinned: !!draft.is_pinned,
        event_start: draft.event_start || null,
        event_end: draft.event_end || null,
        location: draft.location || '',
      };
      const res = await adminApi.createNotification(payload);
      setItems((prev) => [res.data, ...prev]);
      setDraft({ title: '', body: '', event_start: '', event_end: '', location: '', is_pinned: false });
      setCreateOpen(false);
      push('Event created', 'success');
    } catch {
      push('Could not create event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const publish = async (id) => {
    try {
      await adminApi.publishNotification(id);
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_published: true } : x)));
      push('Event published', 'success');
    } catch {
      push('Could not publish event', 'error');
    }
  };

  const remove = async (id) => {
    try {
      await adminApi.deleteNotification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      push('Event deleted', 'success');
    } catch {
      push('Could not delete event', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Events / Calendar</h2>
          <p className={styles.subtitle} style={{ marginTop: 6 }}>
            {section ? `${section.class_name || 'Class'} - Section ${section.name}` : 'Select a section'}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={load} disabled={loading || !section?.id}><RefreshCw size={16} /> Refresh</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setCreateOpen(true)} disabled={!section?.id}><Plus size={16} /> New Event</button>
        </div>
      </div>

      {!section?.id ? (
        <div className={styles.empty}>Select a section from Dashboard first.</div>
      ) : (
        <div className={styles.list}>
          {sorted.length === 0 ? (
            <div className={styles.empty}>No events yet.</div>
          ) : sorted.map((ev) => (
            <div key={ev.id} className={styles.card}>
              <div className={styles.top}>
                <div>
                  <b>{ev.title}</b>
                  <div className={styles.metaRow}>
                    <span className={styles.meta}><CalendarDays size={14} /> {ev.event_start ? new Date(ev.event_start).toLocaleString() : 'TBD'}</span>
                    {ev.location && <span className={styles.meta}><MapPin size={14} /> {ev.location}</span>}
                  </div>
                </div>
                <span className={styles.badge}>{ev.is_published ? 'Published' : 'Draft'}</span>
              </div>
              {ev.body && <p className={styles.body}>{ev.body}</p>}
              <div className={styles.cardActions}>
                {!ev.is_published && <button className={styles.btnSm} onClick={() => publish(ev.id)}><Send size={14} /> Publish</button>}
                <button className={styles.btnSmDanger} onClick={() => setConfirmDelete(ev.id)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <div className={styles.modalOverlay} onClick={() => setCreateOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>New Event</h3>
              <button className={styles.modalClose} onClick={() => setCreateOpen(false)}>X</button>
            </div>
            <div className={styles.modalBody}>
              <label>Title</label>
              <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. PTM Day" />
              <label>Description</label>
              <textarea rows={4} value={draft.body} onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))} placeholder="Optional details..." />
              <label>Start</label>
              <input type="datetime-local" value={draft.event_start} onChange={(e) => setDraft((p) => ({ ...p, event_start: e.target.value }))} />
              <label>End</label>
              <input type="datetime-local" value={draft.event_end} onChange={(e) => setDraft((p) => ({ ...p, event_end: e.target.value }))} />
              <label>Location</label>
              <input value={draft.location} onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Auditorium" />
              <div className={styles.modalActions}>
                <button className={styles.btn} onClick={() => setCreateOpen(false)}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={create} disabled={!draft.title.trim()}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Event"
        message="This will permanently delete the event."
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { const id = confirmDelete; setConfirmDelete(null); remove(id); }}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const Events = ({ section }) => (
  <ErrorBoundary>
    <EventsView section={section} />
  </ErrorBoundary>
);

export default Events;

