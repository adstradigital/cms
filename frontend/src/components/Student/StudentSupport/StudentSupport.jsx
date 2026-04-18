'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  Send, 
  Mail, 
  Phone, 
  BookOpen, 
  History, 
  CheckCircle,
  MessageSquare,
  ShieldAlert,
  Clock
} from 'lucide-react';
import styles from './StudentSupport.module.css';

const FAQ_DATA = [
  {
    question: "How do I submit an assignment?",
    answer: "Navigate to the Assignments module from the sidebar. Under the 'Submission Portal' tab, find your active assignment and click 'Upload Submission'. You can upload PDF or Document files. Make sure to click 'Submit' after the file upload is complete."
  },
  {
    question: "Where can I see my exam results?",
    answer: "Go to the 'Results' section in the sidebar. You can view your current term performance and download detailed report cards once they are released by the academic office."
  },
  {
    question: "How can I request leave for an upcoming absence?",
    answer: "Open the 'Attendance' module and switch to the 'Leave Portal' tab. Use the 'New Leave Application' button to select your dates and provide a reason. You can track the approval status in your Leave History section."
  },
  {
    question: "What should I do if my fee payment is not reflected?",
    answer: "Fee updates can take up to 24-48 hours depending on the bank. If you made a payment over 48 hours ago and it's not showing in the 'Fees' module, please submit an inquiry using the support form with your transaction ID."
  },
  {
    question: "How do I renew library books online?",
    answer: "In the 'Library' module, go to 'My Holdings'. If a book is eligible for renewal, you will see a 'Renew' button next to it. Note that books already overdue or reserved by others cannot be renewed online."
  }
];

export default function StudentSupport() {
  const [openFaq, setOpenFaq] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'academic',
    message: ''
  });

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    setShowSuccess(true);
    setFormData({ subject: '', category: 'academic', message: '' });
    setTimeout(() => setShowSuccess(false), 4000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Student Support Center</h1>
        <p className={styles.subtitle}>Get help with your academics, enrollment, and portal usage.</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <HelpCircle size={20} className={styles.sectionIcon} />
              <h2>Knowledge Base & FAQ</h2>
            </div>
            <div className={styles.faqList}>
              {FAQ_DATA.map((faq, i) => (
                <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.open : ''}`}>
                  <button className={styles.faqQuestion} onClick={() => toggleFaq(i)}>
                    {faq.question}
                    <ChevronDown size={16} className={`${styles.faqChevron} ${openFaq === i ? styles.rotated : ''}`} />
                  </button>
                  {openFaq === i && <div className={styles.faqAnswer}>{faq.answer}</div>}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Clock size={20} className={styles.sectionIcon} />
              <h2>Contact Operating Hours</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className={styles.helplineItem}>
                <div className={styles.iconCircle} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                  <BookOpen size={18} />
                </div>
                <div className={styles.helpInfo}>
                  <h4>Academic Office</h4>
                  <p>Mon-Fri: 9 AM - 4 PM</p>
                </div>
              </div>
              <div className={styles.helplineItem}>
                <div className={styles.iconCircle} style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <ShieldAlert size={18} />
                </div>
                <div className={styles.helpInfo}>
                  <h4>Security & Emergency</h4>
                  <p>24/7 Available</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <MessageSquare size={20} className={styles.sectionIcon} />
              <h2>Submit an Inquiry</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Department / Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange}>
                  <option value="academic">Academic & Exams</option>
                  <option value="accounts">Fees & Payments</option>
                  <option value="it">Portal & Login Issues</option>
                  <option value="general">General Feedback</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Subject</label>
                <input 
                  type="text" 
                  name="subject" 
                  placeholder="e.g., Assignment upload issue"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Detailed Query</label>
                <textarea 
                  name="message" 
                  rows={5} 
                  placeholder="Tell us what you need help with..."
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={submitting || !formData.subject || !formData.message}
              >
                {submitting ? 'Sending Ticket...' : 'Send Message'}
                <Send size={16} />
              </button>
            </form>
          </section>

          <section className={styles.section} style={{ background: '#0f172a', color: 'white' }}>
            <div className={styles.sectionHeader}>
              <Phone size={20} color="#34d399" />
              <h2 style={{ color: 'white' }}>Institutional Helpline</h2>
            </div>
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span>General:</span>
                <strong>+1 (888) 123-4567</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Technical:</span>
                <strong>+1 (888) 123-9999</strong>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
                <Mail size={14} />
                <span>support@blaze-edu.com</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {showSuccess && (
        <div className={styles.successToast}>
          <CheckCircle size={18} />
          Your support ticket was created successfully!
        </div>
      )}
    </div>
  );
}
