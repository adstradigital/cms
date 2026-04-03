'use client';

import React, { useMemo, useState } from 'react';
import {
  Book, Download, ExternalLink, File, MoreVertical, PlayCircle, Plus, Globe,
  Eye
} from 'lucide-react';
import styles from '../Class.module.css';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { ToastStack, useToast } from '@/components/common/useToast';

let materialsCache = {};

const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (!n) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const inferFileSize = (item) => {
  if (item.file_size_bytes != null) return formatBytes(item.file_size_bytes);
  if (item.file_size != null) return formatBytes(item.file_size);
  return item.file ? 'Unknown' : '-';
};

const getEmbedUrl = (url) => {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm?.[1]) return `https://player.vimeo.com/video/${vm[1]}`;
  return '';
};

const MaterialsView = ({ section }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [materials, setMaterials] = useState(materialsCache[section?.id]?.materials || []);
  const [subjects, setSubjects] = useState(materialsCache[section?.id]?.subjects || []);
  const [loading, setLoading] = useState(!materialsCache[section?.id]);
  const [isAdding, setIsAdding] = useState(false);
  const [materialType, setMaterialType] = useState('document');
  const [preview, setPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { toasts, push, dismiss } = useToast();

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = section ? { section: section.id } : {};
      if (activeFilter !== 'all') params.material_type = activeFilter;
      const response = await adminApi.getMaterials(params);
      const list = Array.isArray(response.data) ? response.data : [];
      setMaterials(list);
      materialsCache[section?.id || 'all'] = { ...(materialsCache[section?.id || 'all'] || {}), materials: list };
    } catch {
      push('Failed to fetch materials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const params = section ? { school_class: section.school_class } : {};
      const res = await adminApi.getSubjects(params);
      const list = Array.isArray(res.data) ? res.data : [];
      setSubjects(list);
      materialsCache[section?.id || 'all'] = { ...(materialsCache[section?.id || 'all'] || {}), subjects: list };
    } catch {
      push('Failed to fetch subjects', 'error');
    }
  };

  React.useEffect(() => { fetchSubjects(); /* once per section */ }, [section?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchMaterials(); }, [section?.id, activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPreview = (item) => {
    if (item.material_type === 'video') {
      if (item.external_url) return setPreview({ type: getEmbedUrl(item.external_url) ? 'embed' : 'link', url: item.external_url, title: item.title });
      return setPreview({ type: 'video', url: item.file, title: item.title });
    }
    if (item.material_type === 'document') {
      return setPreview({ type: 'pdf', url: item.file, title: item.title });
    }
    if (item.material_type === 'link') {
      return setPreview({ type: getEmbedUrl(item.external_url) ? 'embed' : 'link', url: item.external_url, title: item.title });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const backup = materials;
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    setDeleteTarget(null);
    try {
      await adminApi.deleteMaterial(id);
      push('Material deleted', 'success');
    } catch {
      setMaterials(backup);
      push('Failed to delete material', 'error');
    }
  };

  const previewContent = useMemo(() => {
    if (!preview) return null;
    if (preview.type === 'video') {
      return <video controls style={{ width: '100%', maxHeight: '70vh' }} src={preview.url} />;
    }
    if (preview.type === 'pdf') {
      return <iframe title={preview.title} src={preview.url} style={{ width: '100%', height: '70vh', border: 'none' }} />;
    }
    if (preview.type === 'embed') {
      const embed = getEmbedUrl(preview.url);
      if (embed) return <iframe title={preview.title} src={embed} style={{ width: '100%', height: '70vh', border: 'none' }} allowFullScreen />;
    }
    return <a href={preview.url} target="_blank" rel="noreferrer">Open link in new tab</a>;
  }, [preview]);

  return (
    <div className={styles.materialsWrapper}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className={`${styles.tab} ${activeFilter === 'all' ? styles.tabActive : ''}`} onClick={() => setActiveFilter('all')}>All Resources</button>
          <button className={`${styles.tab} ${activeFilter === 'video' ? styles.tabActive : ''}`} onClick={() => setActiveFilter('video')}>Videos</button>
          <button className={`${styles.tab} ${activeFilter === 'document' ? styles.tabActive : ''}`} onClick={() => setActiveFilter('document')}>Documents</button>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setIsAdding(true)}><Plus size={18} /> Add Material</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Resource Title</th>
              <th className={styles.th}>Subject</th>
              <th className={styles.th}>Source</th>
              <th className={styles.th}>Size</th>
              <th className={styles.th}>Added On</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="7" className={styles.td} style={{ textAlign: 'center' }}>Loading...</td></tr> : null}
            {!loading && materials.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.td} style={{ textAlign: 'center', padding: '40px', color: 'var(--theme-text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}><Book size={40} strokeWidth={1.5} /><p>No materials found for this section.</p></div>
                </td>
              </tr>
            ) : materials.map((item) => (
              <tr key={item.id}>
                <td className={styles.td}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.material_type === 'video' && <PlayCircle size={18} color="var(--color-danger)" />}
                    {item.material_type === 'document' && <File size={18} color="var(--color-secondary)" />}
                    {item.material_type === 'link' && <Globe size={18} color="var(--color-success)" />}
                  </div>
                </td>
                <td className={styles.td}><div style={{ display: 'flex', flexDirection: 'column' }}><b>{item.title}</b><span className={styles.subtitle}>{item.material_type_display}</span></div></td>
                <td className={styles.td}>{item.subject_name}</td>
                <td className={styles.td}><span className={`${styles.badge} ${styles.info}`}>{item.teacher_name || 'Admin'}</span></td>
                <td className={styles.td}>{inferFileSize(item)}</td>
                <td className={styles.td}>{new Date(item.created_at).toLocaleDateString()}</td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: 6, borderRadius: 8 }} onClick={() => openPreview(item)}><Eye size={14} /></button>
                    {item.material_type === 'link' ? (
                      <a href={item.external_url} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: 6, borderRadius: 8 }}><ExternalLink size={14} /></a>
                    ) : (
                      <a href={item.file} download className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: 6, borderRadius: 8 }}><Download size={14} /></a>
                    )}
                    <button className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: 6, borderRadius: 8, color: 'var(--color-danger)' }} onClick={() => setDeleteTarget(item)}><MoreVertical size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 500 }}>
            <div className={styles.modalHeader}><h2>Add New Material</h2><button className={styles.closeBtn} onClick={() => setIsAdding(false)}>×</button></div>
            <form className={styles.modalForm} onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              formData.append('section', section.id);
              try {
                await adminApi.createMaterial(formData);
                fetchMaterials();
                setIsAdding(false);
                push('Material uploaded', 'success');
              } catch {
                push('Failed to upload material', 'error');
              }
            }}>
              <div className={styles.formGroup}><label>Title</label><input name="title" placeholder="e.g. Introduction to Algebra" required /></div>
              <div className={styles.formGroup}><label>Subject</label><select name="subject" required><option value="">Select Subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className={styles.formGroup}><label>Type</label><select name="material_type" value={materialType} onChange={(e) => setMaterialType(e.target.value)} required><option value="document">Document (PDF/Doc)</option><option value="video">Video (MP4/Link)</option><option value="link">External Link (Web)</option></select></div>
              {materialType === 'link' ? <div className={styles.formGroup}><label>External URL</label><input name="external_url" placeholder="https://example.com" required /></div> : <div className={styles.formGroup}><label>Upload File</label><input type="file" name="file" required /></div>}
              <div className={styles.formGroup}><label>Description (Optional)</label><textarea name="description" rows="3" placeholder="Brief details about the resource..."></textarea></div>
              <div className={styles.modalActions}><button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsAdding(false)}>Cancel</button><button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Upload Resource</button></div>
            </form>
          </div>
        </div>
      )}

      {preview && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 900 }}>
            <div className={styles.modalHeader}><h2>Preview: {preview.title}</h2><button className={styles.closeBtn} onClick={() => setPreview(null)}>×</button></div>
            <div style={{ padding: 16 }}>{previewContent}</div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Material"
        message={`Delete "${deleteTarget?.title || ''}"? This cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const Materials = (props) => (
  <ErrorBoundary>
    <MaterialsView {...props} />
  </ErrorBoundary>
);

export default Materials;
