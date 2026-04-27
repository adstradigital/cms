import React, { useState } from 'react';
import {
  HelpCircle,
  Mail,
  ChevronDown,
  Send,
  Shield,
  Keyboard,
  CheckCircle,
  Phone,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  FileText,
  Zap,
  Activity,
  Ticket,
  Hash,
  RefreshCw,
} from 'lucide-react';
import styles from './AdminSupport.module.css';

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#ef4444', lightBg: '#fef2f2', sla: '1 hour',   Icon: AlertTriangle },
  high:     { label: 'High',     color: '#f97316', lightBg: '#fff7ed', sla: '4 hours',  Icon: AlertCircle  },
  medium:   { label: 'Medium',   color: '#f59e0b', lightBg: '#fffbeb', sla: '24 hours', Icon: Info         },
  low:      { label: 'Low',      color: '#10b981', lightBg: '#f0fdf4', sla: '72 hours', Icon: CheckCircle  },
};

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: '#3b82f6', bg: '#eff6ff' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: '#fffbeb' },
  resolved:    { label: 'Resolved',    color: '#10b981', bg: '#f0fdf4' },
  closed:      { label: 'Closed',      color: '#94a3b8', bg: '#f8fafc' },
};

const HEALTH_COLOR = { operational: '#10b981', degraded: '#f59e0b', down: '#ef4444' };

const INITIAL_TICKETS = [
  { id: 'TKT-047', subject: 'SMS notifications not sending',        priority: 'high',     status: 'in_progress', category: 'Bug Report',      module: 'Notifications',  updated: '2h ago'  },
  { id: 'TKT-046', subject: 'Fee report export keeps failing',      priority: 'medium',   status: 'open',        category: 'Bug Report',      module: 'Fees',           updated: '5h ago'  },
  { id: 'TKT-044', subject: 'Bulk student import feature',          priority: 'low',      status: 'resolved',    category: 'Feature Request', module: 'Students',       updated: '1d ago'  },
  { id: 'TKT-041', subject: 'Login session timeout too short',      priority: 'medium',   status: 'closed',      category: 'General',         module: 'Authentication', updated: '3d ago'  },
  { id: 'TKT-038', subject: 'Cannot assign hostel room to student', priority: 'critical', status: 'resolved',    category: 'Bug Report',      module: 'Hostel',         updated: '4d ago'  },
];

const SERVICE_HEALTH = [
  { name: 'Core API Gateway',       status: 'operational', delay: '12ms',  uptime: '99.98%' },
  { name: 'Student Database',       status: 'operational', delay: '4ms',   uptime: '100%'   },
  { name: 'SMS & Email Service',    status: 'degraded',    delay: '1.2s',  uptime: '97.3%'  },
  { name: 'File Storage (S3)',      status: 'operational', delay: '45ms',  uptime: '99.99%' },
  { name: 'Authentication Service', status: 'operational', delay: '22ms',  uptime: '99.95%' },
  { name: 'Reporting Engine',       status: 'operational', delay: '88ms',  uptime: '99.7%'  },
];

const CONTACT_CHANNELS = [
  { label: 'Technical Support', email: 'support@campusms.io',  Icon: Shield,        color: '#3b82f6' },
  { label: 'Billing & Accounts', email: 'billing@campusms.io', Icon: FileText,      color: '#8b5cf6' },
  { label: 'Security Issues',   email: 'security@campusms.io', Icon: AlertTriangle, color: '#ef4444' },
  { label: 'General Enquiry',   email: 'hello@campusms.io',    Icon: Mail,          color: '#10b981' },
];

const MODULES = [
  'Students', 'Staff', 'Classes & Timetable', 'Fees & Payments',
  'Attendance', 'Exams & Results', 'Library', 'Hostel',
  'Transport', 'Canteen', 'Authentication', 'Reports', 'Settings', 'Other',
];

const FAQ_DATA = [
  { question: 'How do I add a new student to the system?',           answer: 'Navigate to Students → Directory from the sidebar. Click "Add Student" at the top right. Fill in the student details including name, admission number, class, and section. You can also upload documents and set guardian details during this process.' },
  { question: 'How can I assign a teacher to a class section?',      answer: 'Go to Classes → Class from the sidebar. Select the class, then choose a section. Use the "Class Teacher" dropdown to assign a teacher. For subject-level assignments, navigate to Classes → Subjects and use the Subject Allocation feature.' },
  { question: 'How do I generate the timetable?',                    answer: 'Open Classes → Timetable Builder. Select the academic year, class, and section. Drag-and-drop subjects into period slots. Ensure subject allocations are complete before building. You can also auto-generate schedules using "Auto Fill".' },
  { question: 'How do I manage fee structures and collect payments?', answer: 'Navigate to the Fees module. Under "Fee Structure", define fee heads (tuition, transport, hostel, etc.) and set amounts per class. To collect payments, go to "Fee Collection", search for a student, and record payment with receipt.' },
  { question: 'How can I set up hostel rooms and allocate students?', answer: 'Go to Hostel → Hostel List to register hostels and floors. Use Hostel → Rooms to define rooms with capacity. Finally, use Hostel → Allocations to assign students to specific rooms and beds.' },
  { question: 'What user roles are available and how do I manage permissions?', answer: 'Navigate to Staff → Roles & Permissions. Predefined roles include Admin, Principal, Class Teacher, Subject Teacher, Accountant, Support Staff, Driver, and Warden. Edit role permissions or assign individual overrides from the user profile.' },
  { question: 'How do I change the school branding and colors?',     answer: 'Go to Settings from the sidebar. Under "Branding & Theme", upload your school logo and change the primary and secondary colors. These colors are reflected across the entire application.' },
  { question: 'How do I manage the canteen menu and orders?',        answer: "Navigate to Canteen from the sidebar. The overview shows today's menu, active orders, and revenue. Add menu categories, define items with pricing, and manage daily meal plans from this section." },
];

const SHORTCUTS = [
  { label: 'Open Search',        keys: ['Ctrl', 'K']          },
  { label: 'Dashboard',          keys: ['Ctrl', 'D']          },
  { label: 'Quick Add Student',  keys: ['Ctrl', 'Shift', 'S'] },
  { label: 'Toggle Sidebar',     keys: ['Ctrl', 'B']          },
  { label: 'Notifications',      keys: ['Ctrl', 'N']          },
];

const TABS = [
  { key: 'all',         label: 'All'         },
  { key: 'open',        label: 'Open'        },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved',    label: 'Resolved'    },
];

let ticketCounter = 48;
const genId = () => `TKT-${String(ticketCounter++).padStart(3, '0')}`;

const categoryLabel = (v) => ({
  bug: 'Bug Report', feature: 'Feature Request', access: 'Access & Permissions',
  billing: 'Billing', data: 'Data & Security', performance: 'Performance', general: 'General',
}[v] || 'General');

export default function AdminSupport() {
  const [tickets, setTickets]       = useState(INITIAL_TICKETS);
  const [activeTab, setActiveTab]   = useState('all');
  const [openFaq, setOpenFaq]       = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData]     = useState({ priority: 'medium', category: 'bug', module: 'Other', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);

  const handleInput = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1100));
    const id = genId();
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setTickets(p => [{ id, subject: formData.subject, priority: formData.priority, status: 'open', category: categoryLabel(formData.category), module: formData.module, created: today, updated: 'Just now' }, ...p]);
    setSubmitting(false);
    setFormData({ priority: 'medium', category: 'bug', module: 'Other', subject: '', message: '' });
    setSuccessTicket(id);
    setTimeout(() => setSuccessTicket(null), 5000);
  };

  const filteredFaqs    = FAQ_DATA.filter(f => f.question.toLowerCase().includes(searchTerm.toLowerCase()) || f.answer.toLowerCase().includes(searchTerm.toLowerCase()));
  const displayTickets  = activeTab === 'all' ? tickets : tickets.filter(t => t.status === activeTab);
  const openCount       = tickets.filter(t => t.status === 'open').length;
  const inProgCount     = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount   = tickets.filter(t => t.status === 'resolved').length;
  const pc              = PRIORITY_CONFIG[formData.priority];

  return (
    <div className={styles.container}>

      {/* ── Header ────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Help &amp; Support</h1>
          <p className={styles.subtitle}>Raise tickets, track issues, and connect with our support team.</p>
        </div>
      </header>

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        {[
          { label: 'Open Tickets',   value: openCount,      sub: `${tickets.filter(t=>['critical','high'].includes(t.priority)&&t.status==='open').length} high / critical`, color: '#3b82f6', Icon: Ticket    },
          { label: 'In Progress',    value: inProgCount,    sub: 'Being worked on',   color: '#f59e0b', Icon: Activity      },
          { label: 'Resolved (30d)', value: resolvedCount,  sub: '94% SLA met',       color: '#10b981', Icon: CheckCircle   },
          { label: 'Avg. Response',  value: '3.2h',         sub: 'Across all tickets', color: '#8b5cf6', Icon: Clock        },
        ].map(({ label, value, sub, color, Icon }) => (
          <div key={label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: `${color}18` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div className={styles.statValue} style={{ color }}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
              <div className={styles.statSub}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main two-column grid ──────────────────────────── */}
      <div className={styles.grid}>

        {/* LEFT: Raise Ticket + My Tickets */}
        <div className={styles.mainCol}>

          {/* Raise a Ticket */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Send size={19} className={styles.sectionIcon} />
              <h2>Raise a Ticket</h2>
            </div>

            {/* Priority cards */}
            <div className={styles.priorityGroup}>
              <label className={styles.fieldLabel}>Priority Level</label>
              <div className={styles.priorityGrid}>
                {Object.entries(PRIORITY_CONFIG).map(([key, p]) => {
                  const sel = formData.priority === key;
                  const { Icon } = p;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.priorityCard} ${sel ? styles.prioritySel : ''}`}
                      style={sel ? { borderColor: p.color, background: p.lightBg } : {}}
                      onClick={() => setFormData(prev => ({ ...prev, priority: key }))}
                    >
                      <Icon size={14} style={{ color: p.color }} />
                      <span className={styles.pCardLabel} style={sel ? { color: p.color } : {}}>{p.label}</span>
                      <span className={styles.pSla}>{p.sla}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Issue Type</label>
                  <select name="category" value={formData.category} onChange={handleInput}>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="access">Access &amp; Permissions</option>
                    <option value="billing">Billing &amp; Subscription</option>
                    <option value="data">Data &amp; Security</option>
                    <option value="performance">Performance Issue</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Affected Module</label>
                  <select name="module" value={formData.module} onChange={handleInput}>
                    {MODULES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Subject</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleInput} placeholder="Brief description of your issue" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Describe the Issue</label>
                <textarea name="message" value={formData.message} onChange={handleInput} rows={3} placeholder="Steps to reproduce, expected vs actual behavior, error messages…" />
              </div>

              <div className={styles.formFooter}>
                <div className={styles.slaPill} style={{ color: pc.color, background: pc.lightBg }}>
                  <Clock size={12} />
                  <span><strong>{pc.label}</strong> priority — response within <strong>{pc.sla}</strong></span>
                </div>
                <button type="submit" className={styles.submitBtn} disabled={submitting || !formData.subject.trim() || !formData.message.trim()}>
                  {submitting ? <RefreshCw size={15} className={styles.spin} /> : <Send size={15} />}
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </section>

          {/* My Tickets */}
          <section className={styles.section}>
            <div className={styles.sectionHeaderBetween}>
              <div className={styles.sectionHeader}>
                <Ticket size={19} className={styles.sectionIcon} />
                <h2>My Tickets</h2>
              </div>
              <div className={styles.tabs}>
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    <span className={styles.tabCount}>
                      {tab.key === 'all' ? tickets.length : tickets.filter(t => t.status === tab.key).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.ticketList}>
              {displayTickets.length > 0 ? displayTickets.map((t, i) => {
                const p = PRIORITY_CONFIG[t.priority];
                const s = STATUS_CONFIG[t.status];
                return (
                  <div key={i} className={styles.ticketRow}>
                    <div className={styles.ticketLeft}>
                      <span className={styles.ticketId}><Hash size={11} />{t.id}</span>
                      <span className={styles.ticketSubject}>{t.subject}</span>
                      <div className={styles.ticketMeta}>
                        <span>{t.category}</span><span className={styles.dot}>·</span>
                        <span>{t.module}</span><span className={styles.dot}>·</span>
                        <Clock size={10} /><span>{t.updated}</span>
                      </div>
                    </div>
                    <div className={styles.ticketBadges}>
                      <span className={styles.badge} style={{ color: p.color, background: p.lightBg }}>{p.label}</span>
                      <span className={styles.badge} style={{ color: s.color, background: s.bg }}>{s.label}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className={styles.empty}>No tickets for this filter.</div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT: System Status + SLA + Contact */}
        <div className={styles.sideCol}>

          {/* System Status */}
          <section className={styles.section}>
            <div className={styles.sectionHeaderBetween}>
              <div className={styles.sectionHeader}>
                <Activity size={19} className={styles.sectionIcon} />
                <h2>System Status</h2>
              </div>
              <div className={styles.pulseDot} />
            </div>
            <div className={styles.healthList}>
              {SERVICE_HEALTH.map((s, i) => (
                <div key={i} className={styles.healthRow}>
                  <div className={styles.healthLeft}>
                    <div className={`${styles.dot8} ${styles[s.status]}`} />
                    <div>
                      <div className={styles.svcName}>{s.name}</div>
                      <div className={styles.svcMeta}>{s.delay} · {s.uptime} uptime</div>
                    </div>
                  </div>
                  <span className={styles.svcStatus} style={{ color: HEALTH_COLOR[s.status] }}>{s.status}</span>
                </div>
              ))}
            </div>
          </section>

          {/* SLA Reference — compact 2×2 grid */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Clock size={19} className={styles.sectionIcon} />
              <h2>SLA Response Times</h2>
            </div>
            <div className={styles.slaGrid}>
              {Object.entries(PRIORITY_CONFIG).map(([key, p]) => {
                const { Icon } = p;
                return (
                  <div key={key} className={styles.slaCell}>
                    <div className={styles.slaCellLeft}>
                      <div className={styles.slaDot} style={{ background: p.color }} />
                      <Icon size={13} style={{ color: p.color }} />
                      <span className={styles.slaLabel} style={{ color: p.color }}>{p.label}</span>
                    </div>
                    <span className={styles.slaTime}>{p.sla}</span>
                  </div>
                );
              })}
            </div>
            <p className={styles.slaNoteText}>SLA clock starts on agent acknowledgement.</p>
          </section>

          {/* Contact Channels */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Mail size={19} className={styles.sectionIcon} />
              <h2>Contact Channels</h2>
            </div>

            {/* 2×2 email grid */}
            <div className={styles.contactGrid}>
              {CONTACT_CHANNELS.map((ch, i) => {
                const { Icon } = ch;
                return (
                  <div key={i} className={styles.contactCell}>
                    <div className={styles.contactIcon} style={{ background: `${ch.color}18` }}>
                      <Icon size={14} style={{ color: ch.color }} />
                    </div>
                    <div className={styles.contactText}>
                      <span className={styles.contactLabel}>{ch.label}</span>
                      <a href={`mailto:${ch.email}`} className={styles.contactEmail}>{ch.email}</a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Horizontal helpline */}
            <div className={styles.helpline}>
              <div className={styles.helplineItem}>
                <Phone size={14} style={{ color: '#34d399' }} />
                <div>
                  <div className={styles.hlLabel}>Main Support</div>
                  <strong className={styles.hlNumber}>+1 (800) 555-0199</strong>
                </div>
              </div>
              <div className={styles.helplineDivider} />
              <div className={styles.helplineItem}>
                <Zap size={14} style={{ color: '#fb923c' }} />
                <div>
                  <div className={styles.hlLabel}>Emergency (24/7)</div>
                  <strong className={styles.hlNumber}>+1 (800) 555-0123</strong>
                </div>
              </div>
              <div className={styles.helplineHours}>
                <CheckCircle size={12} style={{ color: '#34d399' }} />
                <span>Mon – Sun · 09:00 AM – 10:00 PM</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Bottom row: FAQ | Shortcuts ───────────────────── */}
      <div className={styles.bottomGrid}>

        {/* FAQ */}
        <section className={styles.section}>
          <div className={styles.sectionHeaderBetween}>
            <div className={styles.sectionHeader}>
              <HelpCircle size={19} className={styles.sectionIcon} />
              <h2>Frequently Asked Questions</h2>
            </div>
            <div className={styles.searchWrap}>
              <input
                type="text"
                placeholder="Search FAQs…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
          <div className={styles.faqList}>
            {filteredFaqs.length > 0 ? filteredFaqs.map((faq, idx) => (
              <div key={idx} className={`${styles.faqItem} ${openFaq === idx ? styles.faqOpen : ''}`}>
                <button className={styles.faqQ} onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                  {faq.question}
                  <ChevronDown size={15} className={`${styles.chevron} ${openFaq === idx ? styles.chevronOpen : ''}`} />
                </button>
                {openFaq === idx && <div className={styles.faqA}>{faq.answer}</div>}
              </div>
            )) : (
              <div className={styles.empty}>No questions matched your search.</div>
            )}
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Keyboard size={19} className={styles.sectionIcon} />
            <h2>Keyboard Shortcuts</h2>
          </div>
          <div className={styles.shortcutList}>
            {SHORTCUTS.map((s, i) => (
              <div key={i} className={styles.shortcutRow}>
                <span className={styles.shortcutLabel}>{s.label}</span>
                <div className={styles.keys}>
                  {s.keys.map((k, j) => <kbd key={j}>{k}</kbd>)}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.shortcutTip}>
            <Info size={13} className={styles.tipIcon} />
            <span>Press <kbd>?</kbd> anywhere to show all shortcuts.</span>
          </div>
        </section>
      </div>

      {/* ── Toast ─────────────────────────────────────────── */}
      {successTicket && (
        <div className={styles.toast}>
          <CheckCircle size={17} />
          <div>
            <strong>Ticket {successTicket} created</strong>
            <span> — our team will respond within {pc.sla}.</span>
          </div>
        </div>
      )}
    </div>
  );
}
