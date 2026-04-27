'use client';

import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/api/adminApi';
import styles from './AIBrainHub.module.css';

const TASK_LABELS = {
  report_card_bulk: 'Bulk Report Cards',
  at_risk_sweep: 'At-Risk Sweep',
  attendance_check: 'Attendance Check',
  consecutive_absence: 'Absence Alert',
  performance_digest: 'Performance Digest',
  draft_cleanup: 'Draft Cleanup',
};

const ACTION_LABELS = {
  preview_generated: 'Preview Generated',
  preview_applied: 'Applied',
  manual_override: 'Manual Override',
  timetable_rolled_back: 'Rolled Back',
  at_risk_sweep: 'At-Risk Sweep',
  at_risk_resolved: 'Risk Resolved',
};

const STATUS_COLORS = {
  success: 'success',
  failed: 'danger',
  running: 'info',
  pending: 'warning',
};

const QUICK_TASKS = [
  { type: 'at_risk_sweep', label: 'Run At-Risk Sweep', icon: '⚠' },
  { type: 'attendance_check', label: 'Check Attendance', icon: '✓' },
  { type: 'performance_digest', label: 'Performance Digest', icon: '📊' },
  { type: 'draft_cleanup', label: 'Cleanup Old Drafts', icon: '🗑' },
];

export default function AIBrainHub() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [taskLogs, setTaskLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [triggering, setTriggering] = useState(null);
  const [toast, setToast] = useState(null);
  const [pollingId, setPollingId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTaskLogs = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await adminApi.getAiTaskLogs();
      setTaskLogs(res.data.logs || []);
    } catch {
      showToast('Failed to load task logs.', 'error');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await adminApi.getAiBrainAuditLog();
      setAuditLogs(res.data.logs || []);
    } catch {
      showToast('Failed to load audit log.', 'error');
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskLogs();
    fetchAuditLogs();
  }, [fetchTaskLogs, fetchAuditLogs]);

  // Poll running tasks every 5s
  useEffect(() => {
    const running = taskLogs.filter(t => t.status === 'running' || t.status === 'pending');
    if (running.length > 0 && !pollingId) {
      const id = setInterval(fetchTaskLogs, 5000);
      setPollingId(id);
    } else if (running.length === 0 && pollingId) {
      clearInterval(pollingId);
      setPollingId(null);
    }
    return () => { if (pollingId) clearInterval(pollingId); };
  }, [taskLogs, pollingId, fetchTaskLogs]);

  const handleTrigger = async (taskType) => {
    setTriggering(taskType);
    try {
      const res = await adminApi.triggerAiTask({ task_type: taskType });
      showToast(res.data.message || 'Task queued.');
      fetchTaskLogs();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to trigger task.';
      showToast(msg, 'error');
    } finally {
      setTriggering(null);
    }
  };

  const stats = {
    total: taskLogs.length,
    success: taskLogs.filter(t => t.status === 'success').length,
    failed: taskLogs.filter(t => t.status === 'failed').length,
    running: taskLogs.filter(t => t.status === 'running' || t.status === 'pending').length,
  };

  const formatTime = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>
      )}

      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>AI Brain Hub</h2>
          <p className={styles.subtitle}>Automation tasks, audit trail, and quick actions</p>
        </div>
        <button className={styles.refreshBtn} onClick={() => { fetchTaskLogs(); fetchAuditLogs(); }}>
          Refresh
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{stats.total}</span>
          <span className={styles.statLabel}>Tasks Total</span>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <span className={styles.statNum}>{stats.success}</span>
          <span className={styles.statLabel}>Succeeded</span>
        </div>
        <div className={`${styles.statCard} ${styles.statFailed}`}>
          <span className={styles.statNum}>{stats.failed}</span>
          <span className={styles.statLabel}>Failed</span>
        </div>
        <div className={`${styles.statCard} ${styles.statRunning}`}>
          <span className={styles.statNum}>{stats.running}</span>
          <span className={styles.statLabel}>Running</span>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h3 className={styles.sectionTitle}>Quick Actions</h3>
        <div className={styles.quickGrid}>
          {QUICK_TASKS.map(t => (
            <button
              key={t.type}
              className={styles.quickBtn}
              onClick={() => handleTrigger(t.type)}
              disabled={triggering === t.type}
            >
              <span className={styles.quickIcon}>{t.icon}</span>
              <span>{triggering === t.type ? 'Queueing…' : t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tabs}>
        {['tasks', 'audit'].map(tab => (
          <button
            key={tab}
            className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'tasks' ? 'Task Logs' : 'Audit Log'}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className={styles.panel}>
          {loadingTasks ? (
            <div className={styles.empty}>Loading…</div>
          ) : taskLogs.length === 0 ? (
            <div className={styles.empty}>No tasks have run yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Triggered By</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {taskLogs.map(log => (
                    <tr key={log.id}>
                      <td className={styles.taskName}>{TASK_LABELS[log.task_type] || log.task_type}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[STATUS_COLORS[log.status] || 'info']}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className={styles.muted}>{log.triggered_by}</td>
                      <td className={styles.muted}>{formatTime(log.started_at)}</td>
                      <td className={styles.muted}>{formatTime(log.completed_at)}</td>
                      <td className={styles.muted}>
                        {log.error_message
                          ? <span className={styles.errorText}>{log.error_message.slice(0, 60)}</span>
                          : log.result_payload?.count != null
                            ? `${log.result_payload.count} items`
                            : log.result_payload?.total_flagged != null
                              ? `${log.result_payload.total_flagged} flagged`
                              : log.result_payload?.sections_processed != null
                                ? `${log.result_payload.sections_processed} sections`
                                : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className={styles.panel}>
          {loadingAudit ? (
            <div className={styles.empty}>Loading…</div>
          ) : auditLogs.length === 0 ? (
            <div className={styles.empty}>No audit entries yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Draft Type</th>
                    <th>Details</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <span className={`${styles.actionChip} ${styles[log.action?.replace(/_/g, '')]}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className={styles.taskName}>{log.actor}</td>
                      <td className={styles.muted}>{log.draft_type || '—'}</td>
                      <td className={styles.muted}>
                        {Object.entries(log.details || {}).map(([k, v]) =>
                          <span key={k} className={styles.detail}>{k}: {String(v)}</span>
                        )}
                      </td>
                      <td className={styles.muted}>{formatTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
