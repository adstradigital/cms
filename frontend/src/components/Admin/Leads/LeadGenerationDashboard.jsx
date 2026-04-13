import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Users, Search, Target, UserCheck, Phone, X, Save, ArrowRight
} from 'lucide-react';
import api from '@/api/instance';
import styles from './LeadGenerationDashboard.module.css';

const STATUS_CHOICES = ["New", "Contacted", "Under Review", "Approved", "Rejected", "Enrolled"];

const LeadGenerationDashboard = () => {
  const router = useRouter();
  const [inquiries, setInquiries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    guardian_name: '',
    contact_phone: '',
    contact_email: '',
    student_name: '',
    class_requested: '',
    previous_school: '',
    status: 'New',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inqRes, clsRes] = await Promise.all([
        api.get('/students/admission-inquiries/'),
        api.get('/students/classes/')
      ]);
      setInquiries(inqRes.data.results ? inqRes.data.results : inqRes.data);
      setClasses(clsRes.data.results ? clsRes.data.results : clsRes.data);
    } catch (err) {
      console.error('Error fetching leads data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const newCount = inquiries.filter(i => i.status === 'New').length;
  const reviewCount = inquiries.filter(i => i.status === 'Under Review').length;
  const enrolledCount = inquiries.filter(i => i.status === 'Enrolled').length;

  // Filtered List
  const filteredInquiries = inquiries.filter(inq => {
    if (statusFilter !== 'All' && inq.status !== statusFilter) return false;
    if (searchTerm && !inq.student_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'New': return styles.new;
      case 'Contacted': return styles.contacted;
      case 'Under Review': return styles.underReview;
      case 'Approved': return styles.approved;
      case 'Rejected': return styles.rejected;
      case 'Enrolled': return styles.enrolled;
      default: return '';
    }
  };

  const handleOpenModal = (inq = null) => {
    if (inq) {
      setFormData(inq);
    } else {
      setFormData({
        id: null, guardian_name: '', contact_phone: '', contact_email: '',
        student_name: '', class_requested: '', previous_school: '', status: 'New', notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
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
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save lead. Please check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickUpdateStatus = async (id, newStatus) => {
    try {
        if (newStatus === 'Enrolled') {
            await api.post(`/students/admission-inquiries/${id}/convert/`);
            alert('Successfully converted to Student Profile with generated credentials!');
        } else {
            await api.patch(`/students/admission-inquiries/${id}/`, { status: newStatus });
        }
        fetchData();
    } catch (err) {
        console.error('Failed to update status', err);
        alert('Failed to convert. Ensure data is valid.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Lead Generation Pipeline</h1>
          <p>Track and manage prospective leads and CRM activities.</p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.newButton} onClick={() => handleOpenModal()}>
            <Plus size={18} /> New Lead
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#e0f2fe', color: '#0ea5e9' }}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Leads</span>
            <span className={styles.statValue}>{inquiries.length}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#dbeafe', color: '#2563eb' }}>
            <Phone size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>New Leads</span>
            <span className={styles.statValue}>{newCount}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#ede9fe', color: '#7c3aed' }}>
            <Target size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Under Review</span>
            <span className={styles.statValue}>{reviewCount}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#d1fae5', color: '#10b981' }}>
            <UserCheck size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Converted</span>
            <span className={styles.statValue}>{enrolledCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filtersSection}>
        <div className={styles.filterTabs}>
          {['All', 'New', 'Contacted', 'Under Review', 'Approved', 'Enrolled'].map(tab => (
            <button
              key={tab}
              className={`${styles.filterTab} ${statusFilter === tab ? styles.active : ''}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab === 'Enrolled' ? 'Converted' : tab}
            </button>
          ))}
        </div>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* CRM List */}
      <div className={styles.inquiryList}>
        {loading ? (
          <div className={styles.emptyState}>Loading CRM data...</div>
        ) : filteredInquiries.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={48} opacity={0.3} />
            <h3>No leads found</h3>
            <p>0 applications match your filters.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lead/Prospect</th>
                <th>Class Requested</th>
                <th>Guardian Contact</th>
                <th>Stage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map(inq => (
                <tr key={inq.id}>
                  <td>
                    <strong>{inq.student_name}</strong>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                       {new Date(inq.inquiry_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td>{inq.class_requested_name || '-'}</td>
                  <td>
                    {inq.guardian_name}
                    <br />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{inq.contact_phone}</span>
                  </td>
                  <td>
                    <select 
                        className={`${styles.statusBadge} ${styles[getStatusClass(inq.status)]}`}
                        value={inq.status}
                        onChange={(e) => quickUpdateStatus(inq.id, e.target.value)}
                    >
                        {STATUS_CHOICES.map(s => <option key={s} value={s}>{s === 'Enrolled' ? 'Converted' : s}</option>)}
                    </select>
                  </td>
                  <td>
                    <button 
                        style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => handleOpenModal(inq)}
                    >
                        View / Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Wizard */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1e293b' }}>
              {formData.id ? 'Edit Lead' : 'New Lead Registration'}
            </h2>
            <form onSubmit={handleSave}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Lead Name *</label>
                  <input required name="student_name" value={formData.student_name} onChange={handleChange} placeholder="e.g. John Doe Jr." />
                </div>
                <div className={styles.formGroup}>
                  <label>Class/Interest</label>
                  <select name="class_requested" value={formData.class_requested || ''} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Guardian/Contact Name *</label>
                  <input required name="guardian_name" value={formData.guardian_name} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Contact Phone *</label>
                  <input required name="contact_phone" value={formData.contact_phone} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Contact Email</label>
                  <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Previous School / Context</label>
                  <input name="previous_school" value={formData.previous_school} onChange={handleChange} />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Status Pipeline</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    {STATUS_CHOICES.map(s => <option key={s} value={s}>{s === 'Enrolled' ? 'Converted' : s}</option>)}
                  </select>
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>CRM Notes</label>
                  <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} placeholder="Any details from the phone call or meeting..."></textarea>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (formData.id ? 'Save Changes' : 'Create Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadGenerationDashboard;
