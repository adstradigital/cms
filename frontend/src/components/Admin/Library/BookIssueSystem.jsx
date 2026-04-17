'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  User, 
  Calendar, 
  RefreshCcw, 
  CheckCircle, 
  X,
  Clock,
  AlertCircle,
  Save,
  Loader2,
  Info
} from 'lucide-react';
import axios from '@/api/instance';

const BookIssueSystem = () => {
  const today = new Date().toISOString().split('T')[0];

  const [activeRecords, setActiveRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' or 'issue_form'
  
  // Modal for returning
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningRecord, setReturningRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const getListData = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const getStudentLabel = (student) => {
    const fullName =
      [student?.user?.first_name, student?.user?.last_name].filter(Boolean).join(' ').trim() ||
      student?.user?.full_name ||
      student?.full_name ||
      'Unnamed Student';
    const admissionRef = student?.admission_number || student?.roll_number || student?.id;
    return `${fullName} (${admissionRef})`;
  };

  const getStaffLabel = (staffMember) => {
    const fullName =
      staffMember?.full_name ||
      [staffMember?.first_name, staffMember?.last_name].filter(Boolean).join(' ').trim() ||
      [staffMember?.user?.first_name, staffMember?.user?.last_name].filter(Boolean).join(' ').trim() ||
      'Unnamed Staff';
    const employeeRef = staffMember?.employee_id || staffMember?.staff_id || staffMember?.id;
    return `${fullName} (${employeeRef})`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesRes, studentsRes, staffRes, booksRes] = await Promise.allSettled([
        axios.get('/library/issues/', { params: { status: 'issued' } }),
        axios.get('/students/students/', { params: { paginate: 'false', is_active: 'true' } }),
        axios.get('/staff/', { params: { status: 'active' } }),
        axios.get('/library/books/')
      ]);

      if (issuesRes.status === 'fulfilled') {
        setActiveRecords(getListData(issuesRes.value.data));
      } else {
        console.error('Failed to load active issues:', issuesRes.reason);
      }

      if (studentsRes.status === 'fulfilled') {
        setStudents(getListData(studentsRes.value.data));
      } else {
        console.error('Failed to load students:', studentsRes.reason);
      }

      if (staffRes.status === 'fulfilled') {
        setStaff(getListData(staffRes.value.data));
      } else {
        console.error('Failed to load staff:', staffRes.reason);
      }

      if (booksRes.status === 'fulfilled') {
        const bookData = getListData(booksRes.value.data);
        setBooks(bookData.filter((book) => Number(book.available_copies) > 0));
      } else {
        console.error('Failed to load books:', booksRes.reason);
      }
    } catch (error) {
      console.error('Error fetching issue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [issueForm, setIssueForm] = useState({
    borrower_type: 'student',
    student: '',
    staff: '',
    book: '',
    issue_date: today,
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [returnForm, setReturnForm] = useState({
    return_date: today,
    condition: '',
  });

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        book: issueForm.book,
        issue_date: issueForm.issue_date,
        due_date: issueForm.due_date,
        [issueForm.borrower_type]: issueForm[issueForm.borrower_type]
      };
      await axios.post('/library/issues/', payload);
      setActiveSubTab('list');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`/library/issues/${returningRecord.id}/return/`, {
        return_date: returnForm.return_date,
        condition: returnForm.condition
      });
      setIsReturnModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to return book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReturnModal = (record) => {
    setReturningRecord(record);
    setReturnForm({ return_date: today, condition: '' });
    setIsReturnModalOpen(true);
  };

  const handleIssueDateChange = (event) => {
    const nextIssueDate = event.target.value;
    setIssueForm((prev) => {
      const nextDueDate = prev.due_date && prev.due_date < nextIssueDate ? nextIssueDate : prev.due_date;
      return { ...prev, issue_date: nextIssueDate, due_date: nextDueDate };
    });
  };

  const getReturnTiming = () => {
    if (!returnForm.return_date || !returningRecord?.due_date) return null;

    const selectedReturnDate = new Date(`${returnForm.return_date}T00:00:00`);
    const dueDate = new Date(`${returningRecord.due_date}T00:00:00`);
    const delayDays = Math.floor((selectedReturnDate - dueDate) / (1000 * 60 * 60 * 24));

    if (Number.isNaN(delayDays)) return null;
    if (delayDays <= 0) {
      return {
        label: 'On Time',
        detail: 'Returned on or before due date.',
        color: '#059669',
        bg: '#ECFDF5'
      };
    }

    return {
      label: `Delayed by ${delayDays} day${delayDays > 1 ? 's' : ''}`,
      detail: 'Returned after due date.',
      color: '#DC2626',
      bg: '#FEF2F2'
    };
  };

  const returnTiming = getReturnTiming();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => setActiveSubTab('list')}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: activeSubTab === 'list' ? 'var(--theme-primary)' : 'var(--theme-bg-subtle)',
            color: activeSubTab === 'list' ? 'white' : 'var(--theme-text)',
            fontWeight: '600'
          }}
        >
          Active Issues (Records)
        </button>
        <button 
          onClick={() => setActiveSubTab('issue_form')}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: activeSubTab === 'issue_form' ? 'var(--theme-primary)' : 'var(--theme-bg-subtle)',
            color: activeSubTab === 'issue_form' ? 'white' : 'var(--theme-text)',
            fontWeight: '600'
          }}
        >
          Issue New Book
        </button>
      </div>

      {activeSubTab === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--theme-bg-white)', borderRadius: '12px', border: '1px solid var(--theme-border-subtle)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--theme-bg-subtle)', borderBottom: '1px solid var(--theme-border-subtle)' }}>
                  <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>Borrower</th>
                  <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>Book Title</th>
                  <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>Issue Date</th>
                  <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>Due Date</th>
                  <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>Status</th>
                  <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading active issues...</td></tr>
                ) : activeRecords.length > 0 ? activeRecords.map((record) => {
                  const isOverdue = new Date(record.due_date) < new Date();
                  return (
                    <tr key={record.id} style={{ borderBottom: '1px solid var(--theme-border-subtle)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ backgroundColor: 'var(--theme-bg-subtle)', padding: '8px', borderRadius: '50%' }}><User size={16} /></div>
                          <div>
                            <p style={{ fontWeight: '600', color: 'var(--theme-text)', fontSize: '14px' }}>{record.student_name || record.staff_name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>{record.student ? 'Student' : 'Staff'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <p style={{ fontWeight: '600', color: 'var(--theme-text)', fontSize: '14px' }}>{record.book_title}</p>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--theme-text)' }}>{record.issue_date}</p>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <p style={{ fontSize: '13px', color: isOverdue ? '#DC2626' : 'var(--theme-text)' }}>{record.due_date}</p>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                          backgroundColor: isOverdue ? '#FEF2F2' : '#ECFDF5', color: isOverdue ? '#DC2626' : '#059669'
                        }}>
                          {isOverdue ? 'Overdue' : 'On Time'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleOpenReturnModal(record)}
                          style={{ 
                            padding: '8px 16px', borderRadius: '8px', border: '1px solid #10B981', 
                            backgroundColor: '#10B981', color: 'white', cursor: 'pointer', fontWeight: '600'
                          }}
                        >
                          Return Book
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>No active issues found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'var(--theme-bg-white)', borderRadius: '12px', padding: '32px', 
          border: '1px solid var(--theme-border-subtle)', maxWidth: '800px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Issue a Book</h2>
          <p style={{ color: 'var(--theme-text-muted)', marginBottom: '24px' }}>Select a borrower and a book to create a new issue record.</p>
          
          <form onSubmit={handleIssueSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Borrower Type</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={issueForm.borrower_type === 'student'}
                    onChange={() => setIssueForm((prev) => ({ ...prev, borrower_type: 'student', staff: '' }))}
                  /> Student
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={issueForm.borrower_type === 'staff'}
                    onChange={() => setIssueForm((prev) => ({ ...prev, borrower_type: 'staff', student: '' }))}
                  /> Staff
                </label>
              </div>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Select {issueForm.borrower_type === 'student' ? 'Student' : 'Staff'}
              </label>
              <select 
                required 
                value={issueForm[issueForm.borrower_type]} 
                onChange={e => setIssueForm({...issueForm, [issueForm.borrower_type]: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', backgroundColor: 'var(--theme-bg-subtle)' }}
              >
                <option value="">Choose {issueForm.borrower_type}...</option>
                {(issueForm.borrower_type === 'student' ? students : staff).map(p => (
                  <option key={p.id} value={p.id}>
                    {issueForm.borrower_type === 'student' ? getStudentLabel(p) : getStaffLabel(p)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Select Book</label>
              <select 
                required 
                value={issueForm.book} 
                onChange={e => setIssueForm({...issueForm, book: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', backgroundColor: 'var(--theme-bg-subtle)' }}
              >
                <option value="">Choose a book...</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.title} ({b.available_copies} avail.)</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Issue Date</label>
              <input
                type="date"
                required
                value={issueForm.issue_date}
                max={today}
                onChange={handleIssueDateChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', backgroundColor: 'var(--theme-bg-subtle)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Due Date</label>
              <input 
                type="date"
                required
                value={issueForm.due_date}
                min={issueForm.issue_date}
                onChange={e => setIssueForm({...issueForm, due_date: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', backgroundColor: 'var(--theme-bg-subtle)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={submitting}
                style={{ 
                  width: '100%', padding: '12px', borderRadius: '8px', border: 'none', 
                  backgroundColor: 'var(--theme-primary)', color: 'white', fontWeight: '600', cursor: 'pointer' 
                }}
              >
                {submitting ? <Loader2 className="animate-spin" /> : <BookOpen size={18} style={{marginRight: '8px'}} />}
                Issue Book
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ backgroundColor: 'var(--theme-bg-white)', borderRadius: '16px', width: '450px', maxWidth: '90%', boxShadow: 'var(--theme-shadow-lg)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--theme-border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Return Book</h3>
              <button onClick={() => setIsReturnModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleReturnSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: 'var(--theme-bg-subtle)', padding: '16px', borderRadius: '12px', marginBottom: '8px' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>{returningRecord?.book_title}</p>
                <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>Issued to: {returningRecord?.student_name || returningRecord?.staff_name}</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Return Date</label>
                <input
                  type="date"
                  required
                  value={returnForm.return_date}
                  min={returningRecord?.issue_date || undefined}
                  max={today}
                  onChange={e => setReturnForm({ ...returnForm, return_date: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', backgroundColor: 'var(--theme-bg-subtle)' }}
                />
              </div>

              {returnTiming && (
                <div style={{ backgroundColor: returnTiming.bg, color: returnTiming.color, borderRadius: '10px', padding: '10px 12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700' }}>Return Status: {returnTiming.label}</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>{returnTiming.detail}</p>
                </div>
              )}
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Book Condition (Optional)</label>
                <textarea 
                  value={returnForm.condition} 
                  onChange={e => setReturnForm({...returnForm, condition: e.target.value})}
                  placeholder="e.g. Good condition, minor wear..."
                  rows="3"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsReturnModalOpen(false)} style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} style={{marginRight: '8px'}} />} 
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookIssueSystem;
