'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  User, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  FileText
} from 'lucide-react';
import axios from '@/api/instance';

const CirculationManager = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, issued, overdue, returned
  
  const [formData, setFormData] = useState({
    book: '',
    student: '',
    staff: '',
    due_date: '',
    borrowerType: 'student' // student or staff
  });
  
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchIssues();
    fetchSupportData();
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

  const fetchIssues = async (statusFilter = '') => {
    try {
      setLoading(true);
      const url = statusFilter ? `/library/issues/?status=${statusFilter}` : '/library/issues/';
      const response = await axios.get(url);
      setIssues(getListData(response.data));
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async () => {
    try {
      const [booksRes, studentsRes, staffRes] = await Promise.allSettled([
        axios.get('/library/books/'),
        axios.get('/students/students/', { params: { paginate: 'false', is_active: 'true' } }),
        axios.get('/staff/', { params: { status: 'active' } })
      ]);

      if (booksRes.status === 'fulfilled') {
        const bookData = getListData(booksRes.value.data);
        setBooks(bookData.filter((book) => Number(book.available_copies) > 0));
      } else {
        console.error('Error fetching books:', booksRes.reason);
      }

      if (studentsRes.status === 'fulfilled') {
        setStudents(getListData(studentsRes.value.data));
      } else {
        console.error('Error fetching students:', studentsRes.reason);
      }

      if (staffRes.status === 'fulfilled') {
        setStaffList(getListData(staffRes.value.data));
      } else {
        console.error('Error fetching staff:', staffRes.reason);
      }
    } catch (error) {
      console.error('Error fetching support data:', error);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        book: formData.book,
        due_date: formData.due_date,
        [formData.borrowerType]: formData[formData.borrowerType]
      };
      await axios.post('/library/issues/', payload);
      setShowIssueModal(false);
      setFormData({ book: '', student: '', staff: '', due_date: '', borrowerType: 'student' });
      fetchIssues();
    } catch (error) {
      console.error('Error issuing book:', error);
      alert(error.response?.data?.error || 'Failed to issue book.');
    }
  };

  const handleReturn = async (id) => {
    if (window.confirm('Are you sure you want to mark this book as returned?')) {
      try {
        const response = await axios.post(`/library/issues/${id}/return/`);
        alert(`Book returned! Fine: ₹${response.data.fine_amount}`);
        fetchIssues();
      } catch (error) {
        console.error('Error returning book:', error);
      }
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'issued': return { bg: '#FFF7ED', color: '#D97706', label: 'Issued' };
      case 'overdue': return { bg: '#FEF2F2', color: '#DC2626', label: 'Overdue' };
      case 'returned': return { bg: '#ECFDF5', color: '#059669', label: 'Returned' };
      default: return { bg: '#F3F4F6', color: '#6B7280', label: status };
    }
  };

  return (
    <div>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--theme-bg-subtle)', padding: '4px', borderRadius: '8px' }}>
          {['all', 'issued', 'overdue', 'returned'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                fetchIssues(tab === 'all' ? '' : tab);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === tab ? 'var(--theme-bg-white)' : 'transparent',
                color: activeTab === tab ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === tab ? 'var(--theme-shadow-sm)' : 'none'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setShowIssueModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--theme-primary)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Plus size={18} />
          New Issue
        </button>
      </div>

      {/* Issues Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--theme-border)', textAlign: 'left' }}>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>BOOK</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>BORROWER</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>ISSUE DATE</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>DUE DATE</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>STATUS</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading circulation records...</td></tr>
            ) : issues.length > 0 ? issues.map((issue) => {
              const statusStyle = getStatusStyle(issue.status);
              return (
                <tr key={issue.id} style={{ borderBottom: '1px solid var(--theme-border-subtle)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--theme-text)', fontSize: '14px' }}>{issue.book_title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>ID: {issue.book}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={14} style={{ color: 'var(--theme-text-muted)' }} />
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>{issue.student_name || issue.staff_name}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)', marginLeft: '22px' }}>
                      {issue.student ? 'Student' : 'Staff'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px' }}>{issue.issue_date}</td>
                  <td style={{ padding: '16px', fontSize: '13px', color: issue.status === 'overdue' ? '#EF4444' : 'inherit' }}>{issue.due_date}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      backgroundColor: statusStyle.bg, 
                      color: statusStyle.color,
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>{statusStyle.label}</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {issue.status !== 'returned' && (
                      <button 
                        onClick={() => handleReturn(issue.id)}
                        style={{ 
                          backgroundColor: 'var(--theme-primary-light)', 
                          color: 'var(--theme-primary)', 
                          padding: '6px 12px', 
                          borderRadius: '6px', 
                          border: 'none', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          cursor: 'pointer' 
                        }}
                      >
                        Process Return
                      </button>
                    )}
                    {issue.status === 'returned' && issue.fine_amount > 0 && (
                      <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: '500' }}>
                        Fine: ₹{issue.fine_amount}
                      </span>
                    )}
                    {issue.status === 'returned' && issue.fine_amount === 0 && (
                       <CheckCircle size={18} style={{ color: '#10B981' }} />
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--theme-bg-white)', width: '100%', maxWidth: '500px',
            borderRadius: '16px', padding: '32px', boxShadow: 'var(--theme-shadow-xl)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Issue New Book</h2>
            <form onSubmit={handleIssue} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Select Book</label>
                <select required value={formData.book} onChange={e => setFormData({...formData, book: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border)', fontSize: '14px' }}>
                  <option value="">Choose a book...</option>
                  {books.map(book => (
                    <option key={book.id} value={book.id}>{book.title} ({book.available_copies} avail.)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Borrower Type</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" checked={formData.borrowerType === 'student'} onChange={() => setFormData({...formData, borrowerType: 'student', staff: ''})} /> 
                    Student
                  </label>
                  <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" checked={formData.borrowerType === 'staff'} onChange={() => setFormData({...formData, borrowerType: 'staff', student: ''})} /> 
                    Staff
                  </label>
                </div>
              </div>

              {formData.borrowerType === 'student' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Select Student</label>
                  <select required value={formData.student} onChange={e => setFormData({...formData, student: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border)', fontSize: '14px' }}>
                    <option value="">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{getStudentLabel(s)}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Select Staff Member</label>
                  <select required value={formData.staff} onChange={e => setFormData({...formData, staff: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border)', fontSize: '14px' }}>
                    <option value="">Choose a staff member...</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{getStaffLabel(s)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Due Date</label>
                <input required type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border)', fontSize: '14px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: 'var(--theme-primary)', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Issue Book</button>
                <button type="button" onClick={() => setShowIssueModal(false)} style={{ flex: 1, backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text)', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CirculationManager;
