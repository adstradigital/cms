'use client';

import { useEffect, useState } from 'react';
import { Check, X, FileText, Calendar, Filter, Search, User, Clock, AlertCircle } from 'lucide-react';
import styles from './LeaveRequestsAd.module.css';

import instance from '@/api/instance';

export default function LeaveRequestsAd({ initialClass = '', initialSection = '', classes = [], sections = [] }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    class: initialClass,
    section: initialSection,
    status: '',
    leave_type: '',
    from_date: '',
    to_date: '',
    search: '',
  });

  // Sync with props if they change
  useEffect(() => {
    setFilters(prev => ({ ...prev, class: initialClass, section: initialSection }));
  }, [initialClass, initialSection]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.class) params.set('class', filters.class);
      if (filters.section) params.set('section', filters.section);
      if (filters.status) params.set('status', filters.status);
      if (filters.leave_type) params.set('leave_type', filters.leave_type);
      if (filters.from_date) params.set('from_date', filters.from_date);
      if (filters.to_date) params.set('to_date', filters.to_date);

      const res = await instance.get(`/attendance/leave-requests/?${params.toString()}`);
      let data = res.data;
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        data = data.filter(r => 
          r.student_name.toLowerCase().includes(q) || 
          (r.admission_number && r.admission_number.toLowerCase().includes(q))
        );
      }
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filters.class, filters.section, filters.status, filters.leave_type, filters.from_date, filters.to_date, filters.search]);

  const handleReview = async (id, status) => {
    try {
      const res = await instance.patch(`/attendance/leave-requests/${id}/review/`, { status });
      if (res.status === 200) {
        fetchRequests();
      }
    } catch (e) {
      console.error(e);
      alert('Review failed');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label><Filter size={14} /> Class</label>
          <select value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label><Filter size={14} /> Section</label>
          <select value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
            <option value="">All Sections</option>
            {sections
              .filter(s => !filters.class || s.school_class_id == filters.class)
              .map(sec => (
                <option key={sec.id} value={sec.id}>{sec.class_name || 'Class'} - {sec.name}</option>
              ))
            }
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label><Clock size={14} /> Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label><AlertCircle size={14} /> Type</label>
          <select value={filters.leave_type} onChange={(e) => setFilters({ ...filters, leave_type: e.target.value })}>
            <option value="">All Types</option>
            <option value="medical">Medical</option>
            <option value="casual">Casual</option>
            <option value="duty">Duty</option>
            <option value="sports">Sports</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label><Calendar size={14} /> Date Range</label>
          <div className={styles.dateInputs}>
            <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} />
            <span>to</span>
            <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} />
          </div>
        </div>

        <div className={styles.searchBox}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search student..." 
            value={filters.search} 
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading leave requests...</div>
        ) : requests.length === 0 ? (
          <div className={styles.empty}>No leave requests found matching filters.</div>
        ) : (
          <div className={styles.grid}>
            {requests.map((req) => (
              <div key={req.id} className={`${styles.card} ${styles[req.status]}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.studentInfo}>
                    <div className={styles.avatar}>
                      {req.student_name.charAt(0)}
                    </div>
                    <div>
                      <h3>{req.student_name}</h3>
                      <p>{req.class_name} {req.section_name} | ADM: {req.admission_number}</p>
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${styles[req.status]}`}>
                    {req.status}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.metaRow}>
                    <div className={styles.metaItem}>
                      <Calendar size={14} />
                      <span>{req.from_date} to {req.to_date}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <AlertCircle size={14} />
                      <span className={styles.typeTag}>{req.leave_type}</span>
                    </div>
                  </div>

                  <div className={styles.reasonBox}>
                    <h4>Reason:</h4>
                    <p>{req.reason}</p>
                  </div>

                  {req.leave_type === 'medical' && (
                    <div className={styles.certificateArea}>
                      {req.certificate ? (
                        <a href={req.certificate} target="_blank" rel="noreferrer" className={styles.certLink}>
                          <FileText size={16} />
                          View Medical Certificate
                        </a>
                      ) : (
                        <div className={styles.noCert}>
                          <AlertCircle size={14} /> No certificate uploaded
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className={styles.cardActions}>
                    <button className={styles.rejectBtn} onClick={() => handleReview(req.id, 'rejected')}>
                      <X size={16} /> Reject
                    </button>
                    <button className={styles.approveBtn} onClick={() => handleReview(req.id, 'approved')}>
                      <Check size={16} /> Approve
                    </button>
                  </div>
                )}
                
                {req.status !== 'pending' && (
                  <div className={styles.reviewInfo}>
                    <Clock size={12} />
                    Reviewed by {req.reviewed_by_name} on {new Date(req.reviewed_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
