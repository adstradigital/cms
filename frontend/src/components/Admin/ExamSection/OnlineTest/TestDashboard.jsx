import React, { useState } from 'react';
import { Plus, Edit3, Play, Trash2, ClipboardList, Clock, Users, AlertCircle, FileText, Shuffle, Calendar } from 'lucide-react';
import styles from './OnlineTest.module.css';

const GRADING_LABELS = { mixed: 'Mixed', auto: 'Auto', manual: 'Manual' };

function formatDateTime(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function TestDashboard({ tests, sections, subjects, onCreate, onSelect, onPublish, onDelete, onGradingQueue }) {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    title: '', section: '', subject: '', grading_mode: 'mixed',
    duration_minutes: 60, max_attempts: 1, shuffle_questions: false,
    start_at: '', end_at: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.start_at) delete payload.start_at;
    if (!payload.end_at) delete payload.end_at;
    onCreate(payload);
    setShowCreate(false);
    setFormData({ title: '', section: '', subject: '', grading_mode: 'mixed', duration_minutes: 60, max_attempts: 1, shuffle_questions: false, start_at: '', end_at: '' });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.header}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Assessment Dashboard</h3>
        <button className={styles.createButton} onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create New Test
        </button>
      </div>

      <div className={styles.testGrid}>
        {tests.map(test => {
          const startLabel = formatDateTime(test.start_at);
          const endLabel = formatDateTime(test.end_at);
          const hasPending = test.pending_count > 0;

          return (
            <div key={test.id} className={styles.testCard}>
              {/* Card header */}
              <div className={styles.testHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className={styles.testTitle}>{test.title}</h4>
                  <div className={styles.testMeta}>
                    <span>{test.section_name}</span>
                    <span className={styles.metaDot}>·</span>
                    <span>{test.subject_name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`${styles.badge} ${test.is_published ? styles.badgePublished : styles.badgeDraft}`}>
                    {test.is_published ? 'Published' : 'Draft'}
                  </span>
                  {hasPending && (
                    <span className={`${styles.badge} ${styles.badgePending}`}>
                      {test.pending_count} Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className={styles.statRow}>
                <span className={styles.statChip}>
                  <FileText size={12} /> {test.question_count} Qs
                </span>
                <span className={styles.statChip}>
                  {test.total_marks} Marks
                </span>
                {test.duration_minutes && (
                  <span className={styles.statChip}>
                    <Clock size={12} /> {test.duration_minutes} min
                  </span>
                )}
                <span className={`${styles.statChip} ${styles.gradingChip}`}>
                  {GRADING_LABELS[test.grading_mode] || test.grading_mode}
                </span>
                {test.shuffle_questions && (
                  <span className={styles.statChip} title="Questions shuffled">
                    <Shuffle size={12} />
                  </span>
                )}
              </div>

              {/* Attempt count */}
              {test.is_published && (
                <div className={styles.attemptRow}>
                  <Users size={13} />
                  <span>{test.attempt_count || 0} submission{test.attempt_count !== 1 ? 's' : ''}</span>
                  {test.max_attempts > 1 && <span className={styles.metaDot}>·</span>}
                  {test.max_attempts > 1 && <span>max {test.max_attempts} attempts</span>}
                </div>
              )}

              {/* Schedule window */}
              {(startLabel || endLabel) && (
                <div className={styles.scheduleRow}>
                  <Calendar size={12} />
                  {startLabel && <span>From {startLabel}</span>}
                  {startLabel && endLabel && <span className={styles.metaDot}>→</span>}
                  {endLabel && <span>Until {endLabel}</span>}
                </div>
              )}

              {/* Actions */}
              <div className={styles.testActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => onSelect(test.id)}
                  title="Open Builder"
                >
                  <Edit3 size={13} /> Builder
                </button>
                {test.is_published && (
                  <button
                    className={styles.actionBtn}
                    onClick={() => onGradingQueue(test.id)}
                    title="Open Grading Queue"
                  >
                    <ClipboardList size={13} /> Queue{hasPending ? ` (${test.pending_count})` : ''}
                  </button>
                )}
                <button
                  className={styles.actionBtn}
                  onClick={() => onPublish(test.id)}
                  title={test.is_published ? 'Unpublish test' : 'Publish test'}
                >
                  <Play size={13} /> {test.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => onDelete(test.id)}
                  title="Delete test"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {tests.length === 0 && (
          <div className={styles.emptyState}>
            <AlertCircle size={40} />
            <p>No tests yet. Click <strong>Create New Test</strong> to begin.</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className={styles.modalContent}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Create New Assessment</h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Test Title</label>
                <input
                  required
                  type="text"
                  className={styles.formInput}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mid-Term Physics Evaluation"
                />
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Section</label>
                  <select required className={styles.formInput} value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}>
                    <option value="">Select Section</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.class_name} - {s.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Subject</label>
                  <select required className={styles.formInput} value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}>
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Grading Mode</label>
                  <select className={styles.formInput} value={formData.grading_mode} onChange={e => setFormData({ ...formData, grading_mode: e.target.value })}>
                    <option value="mixed">Mixed (Auto + Manual)</option>
                    <option value="auto">Auto-Graded Only (MCQs)</option>
                    <option value="manual">Manual Grading Only</option>
                  </select>
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Duration (minutes)</label>
                  <input type="number" min="1" className={styles.formInput} value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })} placeholder="Leave blank for no limit" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Available From <span className={styles.optionalLabel}>(optional)</span></label>
                  <input type="datetime-local" className={styles.formInput} value={formData.start_at} onChange={e => setFormData({ ...formData, start_at: e.target.value })} />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Closes At <span className={styles.optionalLabel}>(optional)</span></label>
                  <input type="datetime-local" className={styles.formInput} value={formData.end_at} onChange={e => setFormData({ ...formData, end_at: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Max Attempts</label>
                  <input type="number" min="1" className={styles.formInput} value={formData.max_attempts} onChange={e => setFormData({ ...formData, max_attempts: e.target.value })} />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={formData.shuffle_questions} onChange={e => setFormData({ ...formData, shuffle_questions: e.target.checked })} />
                    Shuffle Questions
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" className={styles.actionBtn} style={{ flex: 'none', padding: '8px 20px' }} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className={styles.createButton}>Create Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
