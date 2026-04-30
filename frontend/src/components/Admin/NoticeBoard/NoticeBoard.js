'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, Calendar, Edit2, FileText, MessageSquare, Newspaper,
  Pin, PinOff, Plus, RefreshCw, Search, Send, Trash2, X,
  Image as ImageIcon, Table as TableIcon, Trash, PlusCircle
} from 'lucide-react';
import styles from './NoticeBoard.module.css';
import adminApi from '@/api/adminApi';
import { ToastStack, useToast } from '@/components/common/useToast';
import ConfirmDialog from '@/components/common/ConfirmDialog';

/* ── Category config ─────────────────────────────── */
const CATS = {
  general:      { label: 'Notice',  bg: '#fef08a', border: '#ca8a04', tack: '#ca8a04', Icon: Bell },
  event:        { label: 'Event',   bg: '#bbf7d0', border: '#16a34a', tack: '#16a34a', Icon: Calendar },
  exam:         { label: 'Exam',    bg: '#fecaca', border: '#dc2626', tack: '#dc2626', Icon: FileText },
  announcement: { label: 'News',    bg: '#fed7aa', border: '#ea580c', tack: '#ea580c', Icon: Newspaper },
  message:      { label: 'Message', bg: '#bfdbfe', border: '#2563eb', tack: '#2563eb', Icon: MessageSquare },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  ...Object.entries(CATS).map(([key, cfg]) => ({ key, label: cfg.label })),
];

const STORAGE_KEY = 'cms_noticeBoard_pos';
const EMPTY_DRAFT = { 
  title: '', 
  body: '', 
  notification_type: 'general', 
  is_pinned: false,
  imageFile: null,
  hasTable: false,
  tableData: { headers: ['Col 1', 'Col 2'], rows: [['', '']] }
};

/* ── Helpers ──────────────────────────────────────── */
const stableRot = (id) => {
  const n = String(id).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return (n % 10 - 4.5) * 0.75;
};

const defaultPos = (id, idx) => {
  const n = String(id).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  return {
    x: 36 + col * 280 + (n % 44 - 22),
    y: 36 + row * 240 + ((n * 7) % 38 - 19),
  };
};

const fmtDate = (s) => {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
};

/* ── NoticeCard ───────────────────────────────────── */
function NoticeCard({ item, pos, isDragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPin, onEdit, onPublish, onDelete, onView }) {
  const cfg = CATS[item.notification_type] || CATS.general;
  const rot = stableRot(item.id);
  const tackColor = item.is_pinned ? '#dc2626' : cfg.tack;

  const stopBtn = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  const hasTable = item.rich_content?.type === 'table';

  return (
    <div
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        transform: `rotate(${isDragging ? rot * 1.4 : rot}deg)`,
        background: cfg.bg,
        zIndex: isDragging ? 9999 : (item.is_pinned ? 10 : 1),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={() => onView(item)}
    >
      <div
        className={styles.tack}
        style={{ background: `radial-gradient(circle at 38% 32%, ${tackColor}dd, ${tackColor})` }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={stopBtn(onPin)}
        title={item.is_pinned ? 'Unpin' : 'Pin'}
      >
        <div className={styles.tackStem} />
      </div>

      <div className={styles.cardCat} style={{ color: cfg.border, borderColor: cfg.border }}>
        <cfg.Icon size={10} />
        {cfg.label}
      </div>

      <h4 className={styles.cardTitle}>{item.title}</h4>
      
      {item.image_url && (
        <div className={styles.cardImageWrapper}>
          <img src={item.image_url} alt="Notice Attachment" className={styles.cardImage} draggable={false} />
        </div>
      )}

      {hasTable && (
        <div className={styles.cardTablePreview}>
          <table>
            <thead>
              <tr>
                {item.rich_content.data.headers.slice(0, 3).map((h, i) => (
                  <th key={i}>{h || '...'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.rich_content.data.rows.slice(0, 2).map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.slice(0, 3).map((cell, cIdx) => (
                    <td key={cIdx}>{cell || '...'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!item.image_url && !hasTable && (
        <p className={styles.cardBody}>{item.body}</p>
      )}

      <div className={styles.cardFooter}>
        <span className={styles.cardDate}>{fmtDate(item.created_at)}</span>
        <span className={`${styles.cardStatus} ${item.is_published ? styles.published : styles.draft}`}>
          {item.is_published ? 'Published' : 'Draft'}
        </span>
      </div>

      <div className={styles.cardActions}>
        <button className={styles.cardBtn} title={item.is_pinned ? 'Unpin' : 'Pin'} onClick={stopBtn(onPin)} onPointerDown={(e) => e.stopPropagation()}>
          {item.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
        <button className={styles.cardBtn} title="Edit" onClick={stopBtn(onEdit)} onPointerDown={(e) => e.stopPropagation()}>
          <Edit2 size={12} />
        </button>
        {!item.is_published && (
          <button className={styles.cardBtn} title="Publish" onClick={stopBtn(onPublish)} onPointerDown={(e) => e.stopPropagation()}>
            <Send size={12} />
          </button>
        )}
        <button className={`${styles.cardBtn} ${styles.cardBtnDanger}`} title="Delete" onClick={stopBtn(onDelete)} onPointerDown={(e) => e.stopPropagation()}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────── */
export default function NoticeBoard() {
  const [items, setItems] = useState([]);
  const [positions, setPositions] = useState({});
  const [activeCard, setActiveCard] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  const { toasts, push, dismiss } = useToast();
  const dragRef = useRef(null);
  const posRef = useRef({});
  const fileInputRef = useRef(null);

  /* Load saved positions */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      posRef.current = saved;
      setPositions(saved);
    } catch { /* ignore */ }
  }, []);

  const assignDefaults = useCallback((list) => {
    const saved = { ...posRef.current };
    let changed = false;
    list.forEach((item, idx) => {
      if (!saved[item.id]) {
        saved[item.id] = defaultPos(item.id, idx);
        changed = true;
      }
    });
    if (changed) {
      posRef.current = saved;
      setPositions({ ...saved });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { /* ignore */ }
    }
  }, []);

  /* Load from API */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getNotifications({});
      const raw = res?.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : [];
      setItems(list);
      assignDefaults(list);
    } catch {
      push('Could not load notices', 'error');
    } finally {
      setLoading(false);
    }
  }, [push, assignDefaults]);

  useEffect(() => { load(); }, [load]);

  /* Create / update */
  const submit = async () => {
    if (!draft.title.trim()) {
      push('Title is required', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('title', draft.title.trim());
      formData.append('body', draft.body.trim());
      formData.append('notification_type', draft.notification_type);
      formData.append('target_audience', 'all');
      formData.append('is_pinned', draft.is_pinned);

      if (draft.imageFile) {
        formData.append('image', draft.imageFile);
      } else if (editItem && !previewUrl) {
        // If editing and preview URL is cleared, we might need a way to clear the image.
        // For now, if they replace it, it sends the new file.
      }

      if (draft.hasTable) {
        formData.append('rich_content', JSON.stringify({
          type: 'table',
          data: draft.tableData
        }));
      } else {
        formData.append('rich_content', JSON.stringify(null));
      }

      if (editItem) {
        const res = await adminApi.updateNotification(editItem.id, formData);
        setItems((prev) => prev.map((x) => (x.id === editItem.id ? res.data : x)));
        push('Notice updated', 'success');
      } else {
        const res = await adminApi.createNotification(formData);
        const created = res.data;
        setItems((prev) => [created, ...prev]);
        const newPos = {
          x: 50 + Math.round(Math.random() * 200),
          y: 30 + Math.round(Math.random() * 80),
        };
        const updated = { ...posRef.current, [created.id]: newPos };
        posRef.current = updated;
        setPositions({ ...updated });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
        push('Notice posted to the board', 'success');
      }
      setModalOpen(false);
      setEditItem(null);
      setDraft(EMPTY_DRAFT);
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
      push('Could not save notice', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* Actions */
  const togglePin = async (item) => {
    try {
      const res = await adminApi.updateNotification(item.id, { is_pinned: !item.is_pinned });
      setItems((prev) => prev.map((x) => (x.id === item.id ? res.data : x)));
    } catch {
      push('Could not update pin', 'error');
    }
  };

  const publish = async (id) => {
    try {
      await adminApi.publishNotification(id);
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_published: true } : x)));
      push('Notice published', 'success');
    } catch {
      push('Could not publish', 'error');
    }
  };

  const remove = async (id) => {
    try {
      await adminApi.deleteNotification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      const updated = { ...posRef.current };
      delete updated[id];
      posRef.current = updated;
      setPositions({ ...updated });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      push('Notice removed', 'success');
    } catch {
      push('Could not delete', 'error');
    }
  };

  /* Drag handlers */
  const startDrag = useCallback((e, id) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = posRef.current[id] || { x: 80, y: 80 };
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    setActiveCard(id);
  }, []);

  const moveDrag = useCallback((e, id) => {
    if (!dragRef.current || dragRef.current.id !== id) return;
    const { startX, startY, origX, origY } = dragRef.current;
    const newPos = {
      x: Math.max(0, origX + e.clientX - startX),
      y: Math.max(0, origY + e.clientY - startY),
    };
    posRef.current = { ...posRef.current, [id]: newPos };
    setPositions((prev) => ({ ...prev, [id]: newPos }));
  }, []);

  const stopDrag = useCallback(() => {
    if (dragRef.current) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)); } catch { /* ignore */ }
    }
    dragRef.current = null;
    setActiveCard(null);
  }, []);

  /* Modal Helpers */
  const openCreate = () => {
    setEditItem(null);
    setDraft(EMPTY_DRAFT);
    setPreviewUrl(null);
    setViewItem(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    
    const hasTable = item.rich_content?.type === 'table';
    const tableData = hasTable ? item.rich_content.data : EMPTY_DRAFT.tableData;

    setDraft({
      title: item.title || '',
      body: item.body || '',
      notification_type: item.notification_type || 'general',
      is_pinned: !!item.is_pinned,
      imageFile: null,
      hasTable,
      tableData
    });
    setPreviewUrl(item.image_url || null);
    setViewItem(null);
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDraft(p => ({ ...p, imageFile: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  /* Table Builder Helpers */
  const addTableRow = () => {
    setDraft(p => ({
      ...p,
      tableData: {
        ...p.tableData,
        rows: [...p.tableData.rows, Array(p.tableData.headers.length).fill('')]
      }
    }));
  };

  const addTableCol = () => {
    setDraft(p => ({
      ...p,
      tableData: {
        headers: [...p.tableData.headers, `Col ${p.tableData.headers.length + 1}`],
        rows: p.tableData.rows.map(r => [...r, ''])
      }
    }));
  };

  const updateHeader = (cIdx, val) => {
    setDraft(p => {
      const newHeaders = [...p.tableData.headers];
      newHeaders[cIdx] = val;
      return { ...p, tableData: { ...p.tableData, headers: newHeaders } };
    });
  };

  const updateCell = (rIdx, cIdx, val) => {
    setDraft(p => {
      const newRows = [...p.tableData.rows];
      newRows[rIdx][cIdx] = val;
      return { ...p, tableData: { ...p.tableData, rows: newRows } };
    });
  };

  const removeRow = (rIdx) => {
    setDraft(p => {
      const newRows = p.tableData.rows.filter((_, i) => i !== rIdx);
      return { ...p, tableData: { ...p.tableData, rows: newRows } };
    });
  };

  const removeCol = (cIdx) => {
    setDraft(p => {
      const newHeaders = p.tableData.headers.filter((_, i) => i !== cIdx);
      const newRows = p.tableData.rows.map(r => r.filter((_, i) => i !== cIdx));
      return { ...p, tableData: { headers: newHeaders, rows: newRows } };
    });
  };

  /* Derived */
  const displayed = useMemo(() => {
    let list = items;
    if (filter !== 'all') list = list.filter((x) => x.notification_type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((x) =>
        x.title?.toLowerCase().includes(q) || x.body?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, search]);

  const counts = useMemo(() => {
    const c = { all: items.length };
    Object.keys(CATS).forEach((k) => { c[k] = items.filter((x) => x.notification_type === k).length; });
    return c;
  }, [items]);

  const pinned = useMemo(() => items.filter((x) => x.is_pinned).length, [items]);
  const drafts = useMemo(() => items.filter((x) => !x.is_published).length, [items]);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.boardHeading}>
          <span className={styles.boardIcon}>📌</span>
          <div>
            <h1 className={styles.boardTitle}>Notice Board</h1>
            <p className={styles.boardSub}>School-wide announcements, events, exams &amp; rank lists</p>
          </div>
        </div>
        <div className={styles.topActions}>
          <button className={styles.btnRefresh} onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={15} className={loading ? styles.spin : ''} />
          </button>
          <button className={styles.btnPost} onClick={openCreate}>
            <Plus size={15} /> Compose Notice
          </button>
        </div>
      </div>

      <div className={styles.statsStrip}>
        {[
          { label: 'Total Notices', value: items.length, bg: '#eff6ff', color: '#2563eb', Icon: Bell },
          { label: 'Pinned',        value: pinned,       bg: '#fef2f2', color: '#dc2626', Icon: Pin },
          { label: 'Drafts',        value: drafts,       bg: '#fefce8', color: '#ca8a04', Icon: FileText },
          { label: 'Events',        value: counts.event || 0,  bg: '#f0fdf4', color: '#16a34a', Icon: Calendar },
          { label: 'Exams/Lists',   value: counts.exam || 0,   bg: '#fff7ed', color: '#ea580c', Icon: FileText },
        ].map(({ label, value, bg, color, Icon }) => (
          <div key={label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: bg, color }}>
              <Icon size={16} />
            </div>
            <div>
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`${styles.chip} ${filter === f.key ? styles.chipActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className={styles.chipCount}>{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search notices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.boardFrame}>
        <div className={`${styles.screw} ${styles.screwTL}`} />
        <div className={`${styles.screw} ${styles.screwTR}`} />
        <div className={`${styles.screw} ${styles.screwBL}`} />
        <div className={`${styles.screw} ${styles.screwBR}`} />

        <div className={styles.boardCanvas}>
          {displayed.length === 0 && !loading && (
            <div className={styles.emptyBoard}>
              <span style={{ fontSize: 52 }}>📋</span>
              <p>The board is empty</p>
              <button className={styles.btnPost} onClick={openCreate} style={{ marginTop: 16 }}>
                <Plus size={15} /> Post the first notice
              </button>
            </div>
          )}

          {displayed.map((item) => {
            const idx = items.indexOf(item);
            const pos = positions[item.id] || defaultPos(item.id, idx);
            return (
              <NoticeCard
                key={item.id}
                item={item}
                pos={pos}
                isDragging={activeCard === item.id}
                onPointerDown={(e) => startDrag(e, item.id)}
                onPointerMove={(e) => moveDrag(e, item.id)}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                onPin={() => togglePin(item)}
                onEdit={() => openEdit(item)}
                onPublish={() => publish(item.id)}
                onDelete={() => setConfirmDelete(item.id)}
                onView={(it) => setViewItem(it)}
              />
            );
          })}
        </div>
      </div>

      {/* Composer Modal */}
      {modalOpen && !viewItem && (
        <div className={styles.composerOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.composerModal} onClick={(e) => e.stopPropagation()}>
            <div
              className={styles.composerHeader}
              style={{ borderTop: `4px solid ${CATS[draft.notification_type].border}` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: CATS[draft.notification_type].bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.25s ease',
                  }}
                >
                  {React.createElement(CATS[draft.notification_type].Icon, {
                    size: 18,
                    color: CATS[draft.notification_type].border,
                  })}
                </span>
                <h3>{editItem ? 'Edit Notice' : 'Compose Notice'}</h3>
              </div>
              <button className={styles.composerClose} onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.composerBody}>
              {/* Sidebar: Categories */}
              <div className={styles.composerSidebar}>
                <div
                  className={styles.sidebarAccent}
                  style={{
                    background: CATS[draft.notification_type].bg,
                    borderColor: CATS[draft.notification_type].border,
                  }}
                />
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Category</span>
                  <div className={styles.catList}>
                    {Object.entries(CATS).map(([key, cfg]) => (
                      <button
                        key={key}
                        className={`${styles.catBtn} ${draft.notification_type === key ? styles.catBtnActive : ''}`}
                        onClick={() => setDraft(p => ({ ...p, notification_type: key }))}
                        style={draft.notification_type === key ? {
                          background: cfg.bg,
                          borderColor: cfg.border,
                          color: cfg.border,
                        } : {}}
                      >
                        <span
                          className={styles.catSwatch}
                          style={{ background: cfg.bg, borderColor: cfg.border }}
                        />
                        <cfg.Icon size={14} style={{ color: draft.notification_type === key ? cfg.border : undefined }} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className={styles.composerMain}>
                <input
                  className={styles.composerTitleInput}
                  placeholder="Notice Title (e.g., Final Term Exam Rank List)"
                  value={draft.title}
                  onChange={(e) => setDraft(p => ({ ...p, title: e.target.value }))}
                />

                <div className={styles.editorContainer}>
                  <div className={styles.editorToolbar}>
                    <button 
                      className={`${styles.editorBtn} ${draft.hasTable ? styles.editorBtnActive : ''}`}
                      onClick={() => setDraft(p => ({ ...p, hasTable: !p.hasTable }))}
                      title="Add Data Table"
                    >
                      <TableIcon size={16} />
                    </button>
                    <button 
                      className={styles.editorBtn}
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach Image"
                    >
                      <ImageIcon size={16} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                  
                  <textarea
                    className={styles.editorTextarea}
                    placeholder="Write your notice content here..."
                    value={draft.body}
                    onChange={(e) => setDraft(p => ({ ...p, body: e.target.value }))}
                  />
                </div>

                {/* Table Builder UI */}
                {draft.hasTable && (
                  <div className={styles.tableBuilder}>
                    <div className={styles.tableHeader}>
                      <span className={styles.fieldLabel}>Data Table (Rank List, Exam Rooms, etc.)</span>
                      <div className={styles.tableControls}>
                        <button className={styles.btnCancel} style={{ padding: '4px 8px' }} onClick={addTableCol}>
                          + Column
                        </button>
                        <button className={styles.btnCancel} style={{ padding: '4px 8px' }} onClick={addTableRow}>
                          + Row
                        </button>
                      </div>
                    </div>
                    <div className={styles.tableWrapper}>
                      <table className={styles.customTable}>
                        <thead>
                          <tr>
                            {draft.tableData.headers.map((h, cIdx) => (
                              <th key={cIdx}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <input 
                                    className={styles.cellInput} 
                                    value={h} 
                                    onChange={(e) => updateHeader(cIdx, e.target.value)} 
                                  />
                                  <Trash size={12} style={{ cursor:'pointer', marginRight:4, color:'#ef4444' }} onClick={() => removeCol(cIdx)}/>
                                </div>
                              </th>
                            ))}
                            <th style={{ width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {draft.tableData.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx}>
                                  <input 
                                    className={styles.cellInput} 
                                    value={cell} 
                                    onChange={(e) => updateCell(rIdx, cIdx, e.target.value)} 
                                  />
                                </td>
                              ))}
                              <td style={{ textAlign: 'center' }}>
                                <Trash size={14} style={{ cursor:'pointer', color:'#ef4444' }} onClick={() => removeRow(rIdx)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Image Preview */}
                {previewUrl && (
                  <div className={styles.imageUploadArea}>
                    <button className={styles.removeImageBtn} onClick={() => {
                      setPreviewUrl(null);
                      setDraft(p => ({ ...p, imageFile: null }));
                    }}>
                      <X size={14} />
                    </button>
                    <img src={previewUrl} alt="Attachment Preview" className={styles.imagePreview} />
                  </div>
                )}
              </div>
            </div>

            <div className={styles.composerFooter}>
              <label className={styles.pinRow}>
                <input
                  type="checkbox"
                  checked={draft.is_pinned}
                  onChange={(e) => setDraft(p => ({ ...p, is_pinned: e.target.checked }))}
                />
                📌 Pin to board
              </label>
              <div className={styles.composerActions}>
                <button className={styles.btnCancel} onClick={() => setModalOpen(false)}>Cancel</button>
                <button className={styles.btnPrimary} onClick={submit} disabled={loading}>
                  {editItem ? 'Save Changes' : 'Post to Board'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Notice Fullscreen Modal */}
      {viewItem && (
        <div className={styles.composerOverlay} onClick={() => setViewItem(null)}>
          <div
            className={styles.composerModal}
            style={{ maxWidth: 680, height: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={styles.composerHeader}
              style={{ borderTop: `4px solid ${CATS[viewItem.notification_type]?.border || 'var(--color-primary)'}` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: CATS[viewItem.notification_type]?.bg || '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {React.createElement(CATS[viewItem.notification_type]?.Icon || Bell, {
                    size: 18,
                    color: CATS[viewItem.notification_type]?.border || '#000',
                  })}
                </span>
                <h3 style={{ color: CATS[viewItem.notification_type]?.border }}>{viewItem.title}</h3>
              </div>
              <button className={styles.composerClose} onClick={() => setViewItem(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.viewModalBody}>
              <div className={styles.viewModalMeta}>
                <span>{fmtDate(viewItem.created_at)}</span>
                <span>By {viewItem.created_by_name || 'Admin'}</span>
              </div>

              {viewItem.image_url && (
                <img src={viewItem.image_url} alt="Attachment" className={styles.viewModalImage} />
              )}

              <div className={styles.viewModalText}>{viewItem.body}</div>

              {viewItem.rich_content?.type === 'table' && (
                <table className={styles.viewModalTable}>
                  <thead>
                    <tr>
                      {viewItem.rich_content.data.headers.map((h, i) => <th key={i}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {viewItem.rich_content.data.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Notice"
        message="This will permanently remove this notice from the board."
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const id = confirmDelete;
          setConfirmDelete(null);
          remove(id);
        }}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
