'use client';

import React, { useMemo, useState } from 'react';
import { CalendarPlus, Pin, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import styles from './NoticeBoard.module.css';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { ToastStack, useToast } from '@/components/common/useToast';

const NoticeBoardView = ({ section }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [draft, setDraft] = useState({ title: '', body: '', is_pinned: false });
  const { toasts, push, dismiss } = useToast();

  const load = async () => {
    if (!section?.id) return;
    try {
      setLoading(true);
      const res = await adminApi.getNotifications({ type: 'general', section: section.id }).catch(() => null);
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch {
      push('Could not load notices', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id]);

  const pinned = useMemo(() => items.filter((x) => x.is_pinned), [items]);
  const normal = useMemo(() => items.filter((x) => !x.is_pinned), [items]);

  const create = async () => {
    if (!section?.id || !draft.title.trim() || !draft.body.trim()) return;
    try {
      setLoading(true);
      const payload = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        notification_type: 'general',
        target_audience: 'students',
        target_section: section.id,
        target_class: section.school_class,
        is_pinned: !!draft.is_pinned,
      };
      const res = await adminApi.createNotification(payload);
      setItems((prev) => [res.data, ...prev]);
      setDraft({ title: '', body: '', is_pinned: false });
      setCreateOpen(false);
      push('Notice created', 'success');
    } catch {
      push('Could not create notice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const publish = async (id) => {
    try {
      await adminApi.publishNotification(id);
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_published: true } : x)));
      push('Notice published', 'success');
    } catch {
      push('Could not publish notice', 'error');
    }
  };

  const togglePin = async (item) => {
    try {
      const res = await adminApi.updateNotification(item.id, { is_pinned: !item.is_pinned });
      setItems((prev) => prev.map((x) => (x.id === item.id ? res.data : x)));
    } catch {
      push('Could not update pin', 'error');
    }
  };

  const remove = async (id) => {
    try {
      await adminApi.deleteNotification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      push('Notice deleted', 'success');
    } catch {
      push('Could not delete notice', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Notice Board</h2>
          <p className={styles.subtitle} style={{ marginTop: 6 }}>
            {section ? `${section.class_name || 'Class'} - Section ${section.name}` : 'Select a section'}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={load} disabled={loading || !section?.id}><RefreshCw size={16} /> Refresh</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setCreateOpen(true)} disabled={!section?.id}><Plus size={16} /> New Notice</button>
        </div>
      </div>

      {!section?.id ? (
        <div className={styles.empty}>Select a section from Dashboard first.</div>
      ) : (
        <div className={styles.grid}>
          {pinned.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupTitle}><Pin size={16} /> Pinned</div>
              <div className={styles.list}>
                {pinned.map((n) => (
                  <div key={n.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <b>{n.title}</b>
                      <span className={styles.badge}>{n.is_published ? 'Published' : 'Draft'}</span>
                    </div>
                    <p className={styles.body}>{n.body}</p>
                    <div className={styles.cardActions}>
                      <button className={styles.btnSm} onClick={() => togglePin(n)}><Pin size={14} /> Unpin</button>
                      {!n.is_published && <button className={styles.btnSm} onClick={() => publish(n.id)}><Send size={14} /> Publish</button>}
                      <button className={styles.btnSmDanger} onClick={() => setConfirmDelete(n.id)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.group}>
            <div className={styles.groupTitle}><CalendarPlus size={16} /> Latest</div>
            <div className={styles.list}>
              {normal.length === 0 ? (
                <div className={styles.emptySmall}>No notices yet.</div>
              ) : normal.map((n) => (
                <div key={n.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <b>{n.title}</b>
                    <span className={styles.badge}>{n.is_published ? 'Published' : 'Draft'}</span>
                  </div>
                  <p className={styles.body}>{n.body}</p>
                  <div className={styles.cardActions}>
                    <button className={styles.btnSm} onClick={() => togglePin(n)}><Pin size={14} /> {n.is_pinned ? 'Unpin' : 'Pin'}</button>
                    {!n.is_published && <button className={styles.btnSm} onClick={() => publish(n.id)}><Send size={14} /> Publish</button>}
                    <button className={styles.btnSmDanger} onClick={() => setConfirmDelete(n.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className={styles.modalOverlay} onClick={() => setCreateOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>New Notice</h3>
              <button className={styles.modalClose} onClick={() => setCreateOpen(false)}>X</button>
            </div>
            <div className={styles.modalBody}>
              <label>Title</label>
              <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. PTM Reminder" />
              <label>Message</label>
              <textarea rows={5} value={draft.body} onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))} placeholder="Write the notice..." />
              <label className={styles.checkRow}>
                <input type="checkbox" checked={draft.is_pinned} onChange={(e) => setDraft((p) => ({ ...p, is_pinned: e.target.checked }))} />
                Pin to top
              </label>
              <div className={styles.modalActions}>
                <button className={styles.btn} onClick={() => setCreateOpen(false)}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={create} disabled={!draft.title.trim() || !draft.body.trim()}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Notice"
        message="This will permanently delete the notice."
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { const id = confirmDelete; setConfirmDelete(null); remove(id); }}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const NoticeBoard = ({ section }) => (
  <ErrorBoundary>
    <NoticeBoardView section={section} />
  </ErrorBoundary>
);

export default NoticeBoard;

