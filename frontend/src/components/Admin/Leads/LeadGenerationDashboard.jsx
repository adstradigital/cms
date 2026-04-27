import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Users, Search, Target, UserCheck, Phone, X, Save,
  LayoutGrid, List, Filter, TrendingUp, Calendar, AlertCircle,
  Flame, Thermometer, Snowflake, Globe, MessageSquare, Mail,
  PhoneCall, MapPin, Star, ChevronDown, Clock, Activity,
  CheckSquare, Square, Download, RefreshCw, Tag, ArrowRight,
  BarChart2, Zap
} from 'lucide-react';
import api from '@/api/instance';
import styles from './LeadGenerationDashboard.module.css';

const STATUS_PIPELINE = ["New", "Contacted", "Under Review", "Approved", "Rejected", "Enrolled"];
const SOURCE_OPTIONS = ["Website", "Phone Call", "Referral", "Walk-In", "Social Media", "School Event", "Agent", "Other"];
const PRIORITY_OPTIONS = ["Hot", "Warm", "Cold"];
const ACTIVITY_TYPES = ["Call", "Email", "Visit", "Note", "Follow-up"];

const STATUS_META = {
  New:           { color: '#2563eb', bg: '#dbeafe', label: 'New' },
  Contacted:     { color: '#d97706', bg: '#fef3c7', label: 'Contacted' },
  'Under Review':{ color: '#7c3aed', bg: '#ede9fe', label: 'Under Review' },
  Approved:      { color: '#059669', bg: '#d1fae5', label: 'Approved' },
  Rejected:      { color: '#dc2626', bg: '#fee2e2', label: 'Rejected' },
  Enrolled:      { color: '#0d9488', bg: '#ccfbf1', label: 'Converted' },
};

const PRIORITY_META = {
  Hot:  { icon: Flame,       color: '#ef4444', bg: '#fee2e2', label: 'Hot' },
  Warm: { icon: Thermometer, color: '#f97316', bg: '#ffedd5', label: 'Warm' },
  Cold: { icon: Snowflake,   color: '#3b82f6', bg: '#dbeafe', label: 'Cold' },
};

const SOURCE_ICONS = {
  'Website':      Globe,
  'Phone Call':   PhoneCall,
  'Referral':     Star,
  'Walk-In':      MapPin,
  'Social Media': MessageSquare,
  'School Event': Calendar,
  'Agent':        Tag,
  'Other':        Activity,
};

function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.Warm;
  const Icon = meta.icon;
  return (
    <span className={styles.priorityBadge} style={{ background: meta.bg, color: meta.color }}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

function StatusBadge({ status: s }) {
  const meta = STATUS_META[s] || {};
  return (
    <span className={styles.statusPill} style={{ background: meta.bg, color: meta.color }}>
      {meta.label || s}
    </span>
  );
}

function SourceBadge({ source }) {
  const Icon = SOURCE_ICONS[source] || Activity;
  return (
    <span className={styles.sourceBadge}>
      <Icon size={11} /> {source || 'Unknown'}
    </span>
  );
}

function FunnelBar({ label, count, total, color }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className={styles.funnelRow}>
      <span className={styles.funnelLabel}>{label}</span>
      <div className={styles.funnelBarTrack}>
        <div className={styles.funnelBarFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.funnelCount}>{count}</span>
      <span className={styles.funnelPct}>{pct}%</span>
    </div>
  );
}

const EMPTY_FORM = {
  id: null, guardian_name: '', contact_phone: '', contact_email: '',
  student_name: '', class_requested: '', previous_school: '',
  status: 'New', source: 'Other', priority: 'Warm', follow_up_date: '', notes: ''
};

export default function LeadGenerationDashboard() {
  const [inquiries, setInquiries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table'); // 'table' | 'kanban'

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState('');

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [detailActivities, setDetailActivities] = useState([]);
  const [activityForm, setActivityForm] = useState({ activity_type: 'Call', description: '' });

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (followUpFilter) params.set('follow_up', followUpFilter);
      if (searchTerm) params.set('search', searchTerm);

      const [inqRes, clsRes, analyticsRes] = await Promise.all([
        api.get(`/students/admission-inquiries/?${params.toString()}`),
        api.get('/students/classes/'),
        api.get('/students/admission-inquiries/analytics/'),
      ]);
      setInquiries(inqRes.data.results ?? inqRes.data);
      setClasses(clsRes.data.results ?? clsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, priorityFilter, followUpFilter, searchTerm]);

  useEffect(() => {
    const t = setTimeout(fetchData, searchTerm ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const openCreate = () => { setFormData(EMPTY_FORM); setIsFormOpen(true); };
  const openEdit   = (inq) => { setFormData({ ...inq, class_requested: inq.class_requested || '', follow_up_date: inq.follow_up_date || '' }); setIsFormOpen(true); };

  const openDetail = async (inq) => {
    setDetailLead(inq);
    setIsDetailOpen(true);
    try {
      const res = await api.get(`/students/admission-inquiries/${inq.id}/`);
      setDetailLead(res.data);
      setDetailActivities(res.data.activities || []);
    } catch {}
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (formData.id) {
        await api.patch(`/students/admission-inquiries/${formData.id}/`, formData);
      } else {
        await api.post('/students/admission-inquiries/', formData);
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save lead. Check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickStatus = async (id, newStatus) => {
    try {
      if (newStatus === 'Enrolled') {
        if (!confirm('Convert this lead to a full student profile?')) return;
        const res = await api.post(`/students/admission-inquiries/${id}/convert/`);
        alert(`Converted! Username: ${res.data.username} | Admission: ${res.data.admission_number}`);
      } else {
        await api.patch(`/students/admission-inquiries/${id}/`, { status: newStatus });
      }
      fetchData();
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selected.size === 0) return;
    if (!confirm(`Update ${selected.size} lead(s) to "${bulkStatus}"?`)) return;
    try {
      await api.post('/students/admission-inquiries/bulk-update/', {
        ids: Array.from(selected),
        status: bulkStatus,
      });
      setSelected(new Set());
      setBulkStatus('');
      fetchData();
    } catch {
      alert('Bulk update failed.');
    }
  };

  const logActivity = async () => {
    if (!activityForm.description.trim()) return;
    try {
      await api.post(`/students/admission-inquiries/${detailLead.id}/log-activity/`, activityForm);
      setActivityForm({ activity_type: 'Call', description: '' });
      const res = await api.get(`/students/admission-inquiries/${detailLead.id}/`);
      setDetailLead(res.data);
      setDetailActivities(res.data.activities || []);
      fetchData();
    } catch {
      alert('Failed to log activity.');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === inquiries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(inquiries.map(i => i.id)));
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Guardian', 'Phone', 'Email', 'Class', 'Status', 'Priority', 'Source', 'Follow-up', 'Date'],
      ...inquiries.map(i => [
        i.student_name, i.guardian_name, i.contact_phone, i.contact_email,
        i.class_requested_name || '', i.status, i.priority, i.source || '',
        i.follow_up_date || '', new Date(i.inquiry_date).toLocaleDateString()
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const isOverdue = (lead) => {
    if (!lead.follow_up_date) return false;
    return new Date(lead.follow_up_date) < new Date() && !['Enrolled', 'Rejected'].includes(lead.status);
  };

  // Kanban grouped
  const kanbanColumns = STATUS_PIPELINE.map(s => ({
    status: s,
    meta: STATUS_META[s],
    leads: inquiries.filter(i => i.status === s),
  }));

  return (
    <div className={styles.container}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Lead Pipeline</h1>
          <p className={styles.subtitle}>CRM · Prospect tracking · Conversion analytics</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={fetchData} title="Refresh"><RefreshCw size={16} /></button>
          <button className={styles.iconBtn} onClick={exportCSV} title="Export CSV"><Download size={16} /></button>
          <button className={styles.viewToggle} onClick={() => setView(v => v === 'table' ? 'kanban' : 'table')}>
            {view === 'table' ? <><LayoutGrid size={15} /> Kanban</> : <><List size={15} /> Table</>}
          </button>
          <button className={styles.newBtn} onClick={openCreate}><Plus size={16} /> New Lead</button>
        </div>
      </header>

      {/* ── Analytics Section ── */}
      {analytics && (
        <div className={styles.analyticsSection}>

          {/* Row 1: Stat cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIconWrap} style={{ background: '#dbeafe' }}>
                <Users size={22} color="#2563eb" />
              </div>
              <div className={styles.statVal}>{analytics.total}</div>
              <div className={styles.statLbl}>Total Leads</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIconWrap} style={{ background: '#d1fae5' }}>
                <UserCheck size={22} color="#059669" />
              </div>
              <div className={styles.statVal}>{analytics.conversion_rate}%</div>
              <div className={styles.statLbl}>Conversion Rate</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIconWrap} style={{ background: '#fee2e2' }}>
                <AlertCircle size={22} color="#dc2626" />
              </div>
              <div className={styles.statVal}>{analytics.overdue_followups}</div>
              <div className={styles.statLbl}>Overdue Follow-ups</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIconWrap} style={{ background: '#fef3c7' }}>
                <Clock size={22} color="#d97706" />
              </div>
              <div className={styles.statVal}>{analytics.followups_today}</div>
              <div className={styles.statLbl}>Due Today</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIconWrap} style={{ background: '#ffedd5' }}>
                <Flame size={22} color="#f97316" />
              </div>
              <div className={styles.statVal}>{analytics.by_priority?.Hot || 0}</div>
              <div className={styles.statLbl}>Hot Leads</div>
            </div>
          </div>

          {/* Row 2: Funnel + Sources */}
          <div className={styles.chartsGrid}>
            <div className={styles.funnelCard}>
              <div className={styles.chartCardTitle}><BarChart2 size={15} /> Pipeline Funnel</div>
              {STATUS_PIPELINE.filter(s => s !== 'Rejected').map(s => (
                <FunnelBar
                  key={s}
                  label={STATUS_META[s].label}
                  count={analytics.by_status?.[s] || 0}
                  total={analytics.total}
                  color={STATUS_META[s].color}
                />
              ))}
            </div>

            <div className={styles.sourceCard}>
              <div className={styles.chartCardTitle}><Zap size={15} /> Lead Sources</div>
              {Object.entries(analytics.by_source || {}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([src, cnt]) => {
                const Icon = SOURCE_ICONS[src] || Activity;
                const pct = analytics.total ? Math.round((cnt / analytics.total) * 100) : 0;
                return (
                  <div key={src} className={styles.sourceRow}>
                    <div className={styles.sourceLeft}>
                      <Icon size={13} />
                      <span className={styles.sourceName}>{src}</span>
                    </div>
                    <div className={styles.sourceRight}>
                      <div className={styles.sourceBarTrack}>
                        <div className={styles.sourceBarFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.sourceCount}>{cnt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── Filters ── */}
      <div className={styles.filtersBar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search name, guardian, phone, email…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          {['All', ...STATUS_PIPELINE].map(s => (
            <button
              key={s}
              className={`${styles.filterChip} ${statusFilter === s ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter(s)}
              style={statusFilter === s && s !== 'All' ? { background: STATUS_META[s]?.bg, color: STATUS_META[s]?.color } : {}}
            >
              {s === 'Enrolled' ? 'Converted' : s}
            </button>
          ))}
        </div>

        <div className={styles.filterSelects}>
          <select className={styles.filterSelect} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className={styles.filterSelect} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
            <option value="">All Sources</option>
            {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={styles.filterSelect} value={followUpFilter} onChange={e => setFollowUpFilter(e.target.value)}>
            <option value="">All Follow-ups</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
          </select>
        </div>
      </div>

      {/* ── Bulk Actions ── */}
      {selected.size > 0 && (
        <div className={styles.bulkBar}>
          <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
          <span>{selected.size} selected</span>
          <select className={styles.bulkSelect} value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
            <option value="">Change status to…</option>
            {STATUS_PIPELINE.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className={styles.bulkApplyBtn} onClick={handleBulkUpdate} disabled={!bulkStatus}>Apply</button>
          <button className={styles.bulkClearBtn} onClick={() => setSelected(new Set())}><X size={14} /> Clear</button>
        </div>
      )}

      {/* ── Table View ── */}
      {view === 'table' && (
        <div className={styles.tableCard}>
          {loading ? (
            <div className={styles.empty}><RefreshCw size={32} className={styles.spin} /><p>Loading leads…</p></div>
          ) : inquiries.length === 0 ? (
            <div className={styles.empty}><Users size={40} opacity={0.25} /><h3>No leads found</h3><p>Adjust filters or add a new lead.</p></div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><button className={styles.checkBtn} onClick={toggleSelectAll}>{selected.size === inquiries.length ? <CheckSquare size={16} /> : <Square size={16} />}</button></th>
                  <th>Prospect</th>
                  <th>Guardian / Contact</th>
                  <th>Class</th>
                  <th>Priority</th>
                  <th>Source</th>
                  <th>Follow-up</th>
                  <th>Stage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map(inq => (
                  <tr key={inq.id} className={`${styles.row} ${isOverdue(inq) ? styles.rowOverdue : ''} ${selected.has(inq.id) ? styles.rowSelected : ''}`}>
                    <td><button className={styles.checkBtn} onClick={() => toggleSelect(inq.id)}>{selected.has(inq.id) ? <CheckSquare size={16} style={{color:'var(--color-primary)'}} /> : <Square size={16} />}</button></td>
                    <td>
                      <div className={styles.prospectCell}>
                        <strong>{inq.student_name}</strong>
                        <span className={styles.dateLabel}>{new Date(inq.inquiry_date).toLocaleDateString()}</span>
                        {inq.activity_count > 0 && <span className={styles.activityDot}>{inq.activity_count}</span>}
                      </div>
                    </td>
                    <td>
                      <div className={styles.contactCell}>
                        <span>{inq.guardian_name}</span>
                        <span className={styles.phone}>{inq.contact_phone}</span>
                      </div>
                    </td>
                    <td>{inq.class_requested_name || '—'}</td>
                    <td><PriorityBadge priority={inq.priority} /></td>
                    <td><SourceBadge source={inq.source} /></td>
                    <td>
                      {inq.follow_up_date ? (
                        <span className={`${styles.followDate} ${isOverdue(inq) ? styles.overdue : ''}`}>
                          <Calendar size={12} /> {new Date(inq.follow_up_date).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <select
                        className={styles.stageSelect}
                        value={inq.status}
                        style={{ color: STATUS_META[inq.status]?.color, background: STATUS_META[inq.status]?.bg }}
                        onChange={e => quickStatus(inq.id, e.target.value)}
                      >
                        {STATUS_PIPELINE.map(s => <option key={s} value={s}>{s === 'Enrolled' ? 'Convert' : s}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.actionBtn} onClick={() => openDetail(inq)} title="View timeline">
                          <Activity size={14} />
                        </button>
                        <button className={styles.actionBtn} onClick={() => openEdit(inq)} title="Edit">
                          <Save size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Kanban View ── */}
      {view === 'kanban' && (
        <div className={styles.kanban}>
          {kanbanColumns.map(col => (
            <div key={col.status} className={styles.kanbanCol}>
              <div className={styles.kanbanColHeader} style={{ borderTopColor: col.meta.color }}>
                <span style={{ color: col.meta.color, fontWeight: 700 }}>{col.meta.label}</span>
                <span className={styles.kanbanCount} style={{ background: col.meta.bg, color: col.meta.color }}>{col.leads.length}</span>
              </div>
              <div className={styles.kanbanCards}>
                {col.leads.length === 0 && <div className={styles.kanbanEmpty}>No leads</div>}
                {col.leads.map(lead => (
                  <div key={lead.id} className={styles.kanbanCard} onClick={() => openDetail(lead)}>
                    <div className={styles.kanbanCardTop}>
                      <strong>{lead.student_name}</strong>
                      <PriorityBadge priority={lead.priority} />
                    </div>
                    <div className={styles.kanbanCardMeta}>
                      <Phone size={11} /> {lead.contact_phone}
                    </div>
                    <div className={styles.kanbanCardMeta}>
                      <Users size={11} /> {lead.guardian_name}
                    </div>
                    {lead.class_requested_name && (
                      <div className={styles.kanbanCardMeta}><Target size={11} /> {lead.class_requested_name}</div>
                    )}
                    <div className={styles.kanbanCardFooter}>
                      <SourceBadge source={lead.source} />
                      {isOverdue(lead) && <span className={styles.overdueTag}><AlertCircle size={11} /> Overdue</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lead Form Modal ── */}
      {isFormOpen && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setIsFormOpen(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{formData.id ? 'Edit Lead' : 'New Lead'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsFormOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Student Name *</label>
                  <input required name="student_name" value={formData.student_name} onChange={handleFormChange} placeholder="John Doe Jr." />
                </div>
                <div className={styles.field}>
                  <label>Class Requested</label>
                  <select name="class_requested" value={formData.class_requested || ''} onChange={handleFormChange}>
                    <option value="">— Select —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Guardian Name *</label>
                  <input required name="guardian_name" value={formData.guardian_name} onChange={handleFormChange} />
                </div>
                <div className={styles.field}>
                  <label>Contact Phone *</label>
                  <input required name="contact_phone" value={formData.contact_phone} onChange={handleFormChange} />
                </div>
                <div className={styles.field}>
                  <label>Contact Email</label>
                  <input type="email" name="contact_email" value={formData.contact_email} onChange={handleFormChange} />
                </div>
                <div className={styles.field}>
                  <label>Previous School</label>
                  <input name="previous_school" value={formData.previous_school} onChange={handleFormChange} />
                </div>
                <div className={styles.field}>
                  <label>Lead Source</label>
                  <select name="source" value={formData.source} onChange={handleFormChange}>
                    {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleFormChange}>
                    {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleFormChange}>
                    {STATUS_PIPELINE.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Follow-up Date</label>
                  <input type="date" name="follow_up_date" value={formData.follow_up_date} onChange={handleFormChange} />
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Notes</label>
                  <textarea name="notes" rows={3} value={formData.notes} onChange={handleFormChange} placeholder="Details from call or visit…" />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : (formData.id ? 'Save Changes' : 'Create Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lead Detail Panel ── */}
      {isDetailOpen && detailLead && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setIsDetailOpen(false); }}>
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <div>
                <h2 className={styles.detailName}>{detailLead.student_name}</h2>
                <div className={styles.detailMeta}>
                  <StatusBadge status={detailLead.status} />
                  <PriorityBadge priority={detailLead.priority} />
                  <SourceBadge source={detailLead.source} />
                </div>
              </div>
              <div className={styles.detailHeaderActions}>
                <button className={styles.editFromDetail} onClick={() => { setIsDetailOpen(false); openEdit(detailLead); }}>
                  <Save size={14} /> Edit
                </button>
                <button className={styles.closeBtn} onClick={() => setIsDetailOpen(false)}><X size={18} /></button>
              </div>
            </div>

            <div className={styles.detailBody}>
              {/* Info grid */}
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}><Phone size={14} /><span>{detailLead.contact_phone}</span></div>
                <div className={styles.infoItem}><Mail size={14} /><span>{detailLead.contact_email || '—'}</span></div>
                <div className={styles.infoItem}><Users size={14} /><span>{detailLead.guardian_name}</span></div>
                <div className={styles.infoItem}><Target size={14} /><span>{detailLead.class_requested_name || '—'}</span></div>
                {detailLead.follow_up_date && (
                  <div className={`${styles.infoItem} ${isOverdue(detailLead) ? styles.overdueText : ''}`}>
                    <Calendar size={14} /><span>Follow-up: {new Date(detailLead.follow_up_date).toLocaleDateString()}</span>
                  </div>
                )}
                {detailLead.assigned_to_name && (
                  <div className={styles.infoItem}><Star size={14} /><span>Assigned: {detailLead.assigned_to_name}</span></div>
                )}
              </div>

              {detailLead.notes && (
                <div className={styles.notesBox}>
                  <strong>Notes</strong>
                  <p>{detailLead.notes}</p>
                </div>
              )}

              {/* Quick stage change */}
              <div className={styles.stageRow}>
                <span className={styles.stageRowLabel}>Move stage:</span>
                {STATUS_PIPELINE.map(s => (
                  <button
                    key={s}
                    className={`${styles.stageChip} ${detailLead.status === s ? styles.stageChipActive : ''}`}
                    style={detailLead.status === s ? { background: STATUS_META[s].bg, color: STATUS_META[s].color, borderColor: STATUS_META[s].color } : {}}
                    onClick={async () => {
                      await quickStatus(detailLead.id, s);
                      const res = await api.get(`/students/admission-inquiries/${detailLead.id}/`);
                      setDetailLead(res.data);
                      setDetailActivities(res.data.activities || []);
                    }}
                  >
                    {s === 'Enrolled' ? 'Convert' : s}
                  </button>
                ))}
              </div>

              {/* Log activity */}
              <div className={styles.activitySection}>
                <h4 className={styles.sectionTitle}><Activity size={15} /> Activity Timeline</h4>

                <div className={styles.logForm}>
                  <select
                    className={styles.actTypeSelect}
                    value={activityForm.activity_type}
                    onChange={e => setActivityForm(p => ({ ...p, activity_type: e.target.value }))}
                  >
                    {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input
                    className={styles.logInput}
                    placeholder="Describe the interaction…"
                    value={activityForm.description}
                    onChange={e => setActivityForm(p => ({ ...p, description: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); logActivity(); } }}
                  />
                  <button className={styles.logBtn} onClick={logActivity}>Log</button>
                </div>

                <div className={styles.timeline}>
                  {detailActivities.length === 0 && <div className={styles.noActivity}>No activities yet.</div>}
                  {detailActivities.map(act => (
                    <div key={act.id} className={styles.timelineItem}>
                      <div className={styles.timelineDot} data-type={act.activity_type} />
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineHeader}>
                          <span className={styles.actType}>{act.activity_type}</span>
                          <span className={styles.actBy}>{act.created_by_name}</span>
                          <span className={styles.actTime}>{new Date(act.created_at).toLocaleString()}</span>
                        </div>
                        <p className={styles.actDesc}>{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
