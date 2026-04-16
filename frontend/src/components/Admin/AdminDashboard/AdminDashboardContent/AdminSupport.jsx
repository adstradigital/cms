import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  Mail,
  ChevronDown,
  Send,
  Shield,
  Database,
  Monitor,
  Keyboard,
  CheckCircle,
  Phone,
  FileText,
  Users
} from 'lucide-react';
import styles from './AdminSupport.module.css';

const FAQ_DATA = [
  {
    question: 'How do I add a new student to the system?',
    answer: 'Navigate to Students → Directory from the sidebar. Click the "Add Student" button at the top right. Fill in the student details including name, admission number, class, and section. You can also upload documents and set guardian details during this process.'
  },
  {
    question: 'How can I assign a teacher to a class section?',
    answer: 'Go to Classes → Class from the sidebar. Select the class you want, then choose a section. In the section details, use the "Class Teacher" dropdown to assign a teacher. For subject-level assignments, navigate to Classes → Subjects and use the Subject Allocation feature.'
  },
  {
    question: 'How do I generate the timetable?',
    answer: 'Open Classes → Timetable Builder from the sidebar. Select the academic year, class, and section. The builder lets you drag-and-drop subjects into period slots. Ensure subject allocations are complete before building the timetable. You can also auto-generate schedules using the "Auto Fill" button.'
  },
  {
    question: 'How do I manage fee structures and collect payments?',
    answer: 'Navigate to the Fees module from the sidebar. Under "Fee Structure", you can define fee heads (tuition, transport, hostel, etc.) and set amounts per class. To collect payments, go to "Fee Collection", search for a student, and record their payment along with the receipt.'
  },
  {
    question: 'How can I set up hostel rooms and allocate students?',
    answer: 'Go to Hostel → Hostel List to register hostels and their floors. Then use Hostel → Rooms to define individual rooms with capacity. Finally, use Hostel → Allocations to assign students to specific rooms and beds.'
  },
  {
    question: 'What user roles are available and how do I manage permissions?',
    answer: 'Navigate to Staff → Roles & Permissions. The system comes with predefined roles: Admin, Principal, Class Teacher, Subject Teacher, Accountant, Support Staff, Driver, and Warden. Each role has a specific set of permissions. You can edit role permissions or assign individual overrides from the user profile.'
  },
  {
    question: 'How do I change the school branding and colors?',
    answer: 'Go to Settings from the sidebar. Under "Branding & Theme", you can upload your school logo and change the primary and secondary colors. These colors will be reflected across the entire application for a consistent brand experience.'
  },
  {
    question: 'How do I manage the canteen menu and orders?',
    answer: 'Navigate to Canteen from the sidebar. The overview shows today\'s menu, active orders, and revenue statistics. You can add menu categories, define items with pricing, and manage daily meal plans from this section.'
  }
];

const SHORTCUTS = [
  { label: 'Open Search', keys: ['Ctrl', 'K'] },
  { label: 'Go to Dashboard', keys: ['Ctrl', 'D'] },
  { label: 'Quick Add Student', keys: ['Ctrl', 'Shift', 'S'] },
  { label: 'Toggle Sidebar', keys: ['Ctrl', 'B'] },
  { label: 'Open Notifications', keys: ['Ctrl', 'N'] },
];

const SERVICE_HEALTH_DATA = [
  { name: 'Core API Gateway', status: 'operational', delay: '12ms' },
  { name: 'Student Database', status: 'operational', delay: '4ms' },
  { name: 'SMS & Email Service', status: 'degraded', delay: '1.2s' },
  { name: 'File Storage (S3)', status: 'operational', delay: '45ms' },
  { name: 'Authentication Auth0', status: 'operational', delay: '22ms' }
];

const AdminSupport = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) return;

    setSubmitting(true);
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1200));
    setSubmitting(false);
    setFormData({ subject: '', category: 'general', message: '' });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3500);
  };

  const filteredFaqs = FAQ_DATA.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Help & Support</h1>
          <p className={styles.subtitle}>
            Find answers, get help, and connect with our support team.
          </p>
        </div>
      </header>

      {/* Main Grid */}
      <div className={styles.grid}>
        {/* Left Column */}
        <div className={styles.mainColumn}>
          {/* FAQ Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeaderBetween}>
              <div className={styles.sectionHeader}>
                <HelpCircle size={20} className={styles.sectionIcon} />
                <h2>Frequently Asked Questions</h2>
              </div>
              <div className={styles.searchBox}>
                <input 
                  type="text" 
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.faqList}>
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, index) => (
                  <div
                    key={index}
                    className={`${styles.faqItem} ${openFaq === index ? styles.open : ''}`}
                  >
                    <button
                      className={styles.faqQuestion}
                      onClick={() => toggleFaq(index)}
                    >
                      {faq.question}
                      <ChevronDown
                        size={16}
                        className={`${styles.faqChevron} ${openFaq === index ? styles.rotated : ''}`}
                      />
                    </button>
                    {openFaq === index && (
                      <div className={styles.faqAnswer}>{faq.answer}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className={styles.noResults}>
                  No questions matched your search term.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className={styles.sideColumn}>
          {/* Contact Form */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Mail size={20} className={styles.sectionIcon} />
              <h2>Submit a Request</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Brief description of your issue"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="general">General Inquiry</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="billing">Billing & Subscription</option>
                  <option value="data">Data & Security</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Describe your issue or question in detail..."
                />
              </div>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || !formData.subject.trim() || !formData.message.trim()}
              >
                <Send size={16} />
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </section>

          {/* Service Health Dashboard */}
          <section className={styles.section}>
            <div className={styles.sectionHeaderBetween}>
              <div className={styles.sectionHeader}>
                <Shield size={20} className={styles.sectionIcon} />
                <h2>Service Health</h2>
              </div>
              <div className={styles.statusPulse}></div>
            </div>
            <div className={styles.healthList}>
              {SERVICE_HEALTH_DATA.map((service, i) => (
                <div key={i} className={styles.healthItem}>
                  <div className={styles.healthInfo}>
                    <span className={styles.serviceName}>{service.name}</span>
                    <span className={styles.serviceDelay}>{service.delay}</span>
                  </div>
                  <div className={styles.healthStatus}>
                    <div className={`${styles.statusIndicator} ${styles[service.status]}`}></div>
                    <span className={styles.statusText}>{service.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Support Helpline */}
          <section className={styles.section} style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white' }}>
            <div className={styles.sectionHeader}>
              <Phone size={20} style={{ color: '#34d399' }} />
              <h2 style={{ color: 'white' }}>Support Helpline</h2>
            </div>
            <div className={styles.helplineContent}>
              <p className={styles.helplineText}>Need urgent technical assistance? Our team is available 24/7 for critical issues.</p>
              <div className={styles.helplineNumbers}>
                <div className={styles.phoneRow}>
                  <span>Main:</span>
                  <strong>+1 (800) 555-0199</strong>
                </div>
                <div className={styles.phoneRow}>
                  <span>Emergency:</span>
                  <strong>+1 (800) 555-0123</strong>
                </div>
              </div>
              <div className={styles.supportHours}>
                <CheckCircle size={14} style={{ color: '#34d399' }} />
                <span>Mon - Sun: 09:00 AM - 10:00 PM</span>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Keyboard size={20} className={styles.sectionIcon} />
              <h2>Keyboard Shortcuts</h2>
            </div>
            <div className={styles.shortcutsGrid}>
              {SHORTCUTS.map((shortcut, i) => (
                <div key={i} className={styles.shortcutRow}>
                  <span className={styles.shortcutLabel}>{shortcut.label}</span>
                  <div className={styles.shortcutKeys}>
                    {shortcut.keys.map((key, j) => (
                      <kbd key={j}>{key}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className={styles.successToast}>
          <CheckCircle size={18} />
          Your support request has been submitted successfully!
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
