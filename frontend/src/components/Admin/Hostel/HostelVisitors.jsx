'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  Search,
  Check,
  X,
  Clock,
  Loader2,
} from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';
import instance from '@/api/instance';

const DEFAULT_FORM = {
  student: '',
  visitor_name: '',
  visitor_phone: '',
  relation: 'parent',
  visitor_id_proof: '',
  purpose: '',
  check_in: '',
  check_out: '',
  approval_status: 'pending',
  remarks: '',
};

const RELATION_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'relative', label: 'Relative' },
  { value: 'friend', label: 'Friend' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

const APPROVAL_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approve (Warden)' },
  { value: 'denied', label: 'Deny (Warden)' },
];

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getStudentName = (student) => {
  const first = student?.user?.first_name || '';
  const last = student?.user?.last_name || '';
  return `${first} ${last}`.trim() || student?.admission_number || 'Student';
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const payload = error?.response?.data;
  if (!payload) return fallbackMessage;
  if (typeof payload === 'string') return payload;
  if (payload.error) return payload.error;
  const firstField = Object.keys(payload)[0];
  if (!firstField) return fallbackMessage;
  const fieldError = payload[firstField];
  if (Array.isArray(fieldError)) return fieldError[0];
  return fieldError || fallbackMessage;
};

const HostelVisitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const res = await hostelApi.getVisitors();
      setVisitors(normalizeListPayload(res.data));
    } catch (err) {
      console.error(err);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLookupLoading(true);
    try {
      const res = await instance.get('/students/students/', { params: { is_active: 'true' } });
      setStudents(normalizeListPayload(res.data));
    } catch (err) {
      console.error(err);
      setStudents([]);
      alert(getApiErrorMessage(err, 'Failed to load student list.'));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({ ...DEFAULT_FORM });
    setIsModalOpen(true);
    if (students.length === 0) {
      fetchStudents();
    }
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
  };

  const handleRegisterVisitor = async (event) => {
    event.preventDefault();
    if (!formData.student || !formData.visitor_name || !formData.visitor_phone) {
      alert('Please fill student, visitor name and phone.');
      return;
    }
    if (formData.check_out && formData.check_in && new Date(formData.check_out) < new Date(formData.check_in)) {
      alert('Exit time cannot be earlier than entry time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        student: Number(formData.student),
        visitor_name: formData.visitor_name.trim(),
        visitor_phone: formData.visitor_phone.trim(),
        relation: formData.relation,
        visitor_id_proof: formData.visitor_id_proof.trim(),
        purpose: formData.purpose.trim(),
        remarks: formData.remarks.trim(),
      };
      if (formData.check_in) payload.check_in = new Date(formData.check_in).toISOString();
      if (formData.check_out) payload.check_out = new Date(formData.check_out).toISOString();

      const created = await hostelApi.createVisitor(payload);

      if (formData.approval_status === 'approved' || formData.approval_status === 'denied') {
        await hostelApi.approveVisitor(created.data.id, formData.approval_status);
      }

      alert('Visitor log registered successfully.');
      setIsModalOpen(false);
      fetchVisitors();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to register visitor.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id, decision) => {
    try {
      await hostelApi.approveVisitor(id, decision);
      fetchVisitors();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Action failed.'));
    }
  };

  const handleCheckout = async (id) => {
    try {
      await hostelApi.checkoutVisitor(id);
      fetchVisitors();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Checkout failed.'));
    }
  };

  const filteredVisitors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visitors;
    return visitors.filter((item) => {
      const haystack = [
        item.visitor_name,
        item.visitor_phone,
        item.student_name,
        item.student_admission,
        item.relation,
        item.approval_status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [visitors, searchTerm]);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => getStudentName(a).localeCompare(getStudentName(b))),
    [students]
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search visitor or student..." 
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        
        <button className={styles.btnPrimary} onClick={handleOpenModal}>
          <UserPlus size={18} />
          Register Visitor
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '20%' }}>Visitor</th>
              <th style={{ width: '20%' }}>Student to Visit</th>
              <th style={{ width: '15%' }}>Relation</th>
              <th style={{ width: '15%' }}>Check-in</th>
              <th style={{ width: '15%' }}>Status</th>
              <th style={{ width: '15%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading visitor logs...</td></tr>
            ) : filteredVisitors.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No visitor records found.</td></tr>
            ) : filteredVisitors.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.visitor_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{item.visitor_phone}</div>
                </td>
                <td style={{ fontWeight: '500' }}>{item.student_name}</td>
                <td style={{ textTransform: 'capitalize', fontWeight: '500' }}>{item.relation}</td>
                <td>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{new Date(item.check_in).toLocaleDateString()}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td>
                  {item.approval_status === 'pending' ? (
                    <span className={`${styles.badge} ${styles.badgeWarning}`}>Pending</span>
                  ) : item.approval_status === 'approved' ? (
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>Approved</span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeDanger}`}>Denied</span>
                  )}
                </td>
                <td>
                  <div className={styles.actionWrapper} style={{ gap: '8px' }}>
                    {item.approval_status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(item.id, 'approved')} className={styles.btnIcon} style={{ background: '#dcfce7', color: '#166534', border: 'none' }} title="Approve"><Check size={16} /></button>
                        <button onClick={() => handleApprove(item.id, 'denied')} className={styles.btnIcon} style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }} title="Deny"><X size={16} /></button>
                      </>
                    )}
                    {item.approval_status === 'approved' && !item.check_out && (
                      <button onClick={() => handleCheckout(item.id)} className={styles.btnSecondary} style={{ fontSize: '12px', padding: '6px 12px' }}>Check-out</button>
                    )}
                    {item.check_out && (
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={handleCloseModal}>
          <div
            className={styles.modalContent}
            style={{ width: 'min(820px, 96vw)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Register Visitor</h2>
              <button type="button" className={styles.modalClose} onClick={handleCloseModal} aria-label="Close visitor form">
                <X size={18} />
              </button>
            </div>

            {lookupLoading ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#475569' }}>
                <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                Loading students...
              </div>
            ) : (
              <form className={styles.modalForm} onSubmit={handleRegisterVisitor}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Student To Visit</label>
                    <select
                      required
                      className={styles.formControl}
                      value={formData.student}
                      onChange={(event) => setFormData((prev) => ({ ...prev, student: event.target.value }))}
                    >
                      <option value="">Select Student</option>
                      {sortedStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {`${getStudentName(student)} (${student.admission_number || 'N/A'})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Visitor Name</label>
                    <input
                      required
                      type="text"
                      className={styles.formControl}
                      placeholder="Enter visitor full name"
                      value={formData.visitor_name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, visitor_name: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Visitor Phone</label>
                    <input
                      required
                      type="text"
                      className={styles.formControl}
                      placeholder="Enter phone number"
                      value={formData.visitor_phone}
                      onChange={(event) => setFormData((prev) => ({ ...prev, visitor_phone: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Relation</label>
                    <select
                      className={styles.formControl}
                      value={formData.relation}
                      onChange={(event) => setFormData((prev) => ({ ...prev, relation: event.target.value }))}
                    >
                      {RELATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Entry Time</label>
                    <input
                      type="datetime-local"
                      className={styles.formControl}
                      value={formData.check_in}
                      onChange={(event) => setFormData((prev) => ({ ...prev, check_in: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Exit Time (Optional)</label>
                    <input
                      type="datetime-local"
                      className={styles.formControl}
                      value={formData.check_out}
                      onChange={(event) => setFormData((prev) => ({ ...prev, check_out: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Approval (Warden)</label>
                    <select
                      className={styles.formControl}
                      value={formData.approval_status}
                      onChange={(event) => setFormData((prev) => ({ ...prev, approval_status: event.target.value }))}
                    >
                      {APPROVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>ID Proof (Optional)</label>
                    <input
                      type="text"
                      className={styles.formControl}
                      placeholder="Aadhaar / ID card / Passport no."
                      value={formData.visitor_id_proof}
                      onChange={(event) => setFormData((prev) => ({ ...prev, visitor_id_proof: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Purpose (Optional)</label>
                    <textarea
                      className={styles.formControl}
                      placeholder="Reason for visit..."
                      value={formData.purpose}
                      onChange={(event) => setFormData((prev) => ({ ...prev, purpose: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Remarks (Optional)</label>
                    <textarea
                      className={styles.formControl}
                      placeholder="Additional notes..."
                      value={formData.remarks}
                      onChange={(event) => setFormData((prev) => ({ ...prev, remarks: event.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.btnSecondary} onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Save Visitor Log'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelVisitors;
