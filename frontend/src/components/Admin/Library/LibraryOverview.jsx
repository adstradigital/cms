'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  History,
  Info
} from 'lucide-react';
import axios from '@/api/instance';

const LibraryOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/library/dashboard/');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching library dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--theme-text-muted)', padding: '40px', textAlign: 'center' }}>Loading dashboard data...</div>;

  const stats = [
    { label: 'Total Books', value: data?.stats?.total_books || 0, icon: <BookOpen size={24} />, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Issued Books', value: data?.stats?.issued_books || 0, icon: <History size={24} />, color: '#059669', bg: '#ECFDF5' },
    { label: 'Available Books', value: data?.stats?.available_books || 0, icon: <CheckCircle size={24} />, color: '#10B981', bg: '#F0FDF4' },
    { label: 'Overdue Books', value: data?.stats?.overdue_books || 0, icon: <Clock size={24} />, color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Total Fines Collected', value: `₹${data?.stats?.total_fines_collected?.toFixed(2) || '0.00'}`, icon: <TrendingUp size={24} />, color: '#D97706', bg: '#FFFBEB' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{
            backgroundColor: 'var(--theme-bg-white)',
            border: '1px solid var(--theme-border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            transition: 'transform 0.2s ease',
            cursor: 'default'
          }}>
            <div style={{
              backgroundColor: stat.bg,
              color: stat.color,
              padding: '12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ color: 'var(--theme-text-muted)', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{stat.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--theme-text)' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
        {/* Popular Books */}
        <div style={{
          backgroundColor: 'var(--theme-bg-white)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--theme-border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--theme-text)' }}>Most Borrowed Books</h3>
            <button style={{ color: 'var(--theme-primary)', fontSize: '14px', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data?.popular_books?.length > 0 ? data.popular_books.map((book, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'var(--theme-bg-subtle)'
              }}>
                <div style={{ fontSize: '24px', opacity: 0.5 }}>📚</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', color: 'var(--theme-text)', fontSize: '15px' }}>{book.title}</p>
                  <p style={{ color: 'var(--theme-text-muted)', fontSize: '13px' }}>{book.author} • {book.category}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '700', color: 'var(--theme-primary)', fontSize: '16px' }}>{book.issue_count}</p>
                  <p style={{ fontSize: '11px', color: 'var(--theme-text-muted)' }}>Issues</p>
                </div>
              </div>
            )) : (
              <p style={{ color: 'var(--theme-text-muted)', padding: '20px', textAlign: 'center' }}>No borrowing history found.</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          backgroundColor: 'var(--theme-bg-white)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--theme-border-subtle)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--theme-text)', marginBottom: '20px' }}>Recent Issues</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {data?.recent_issues?.length > 0 ? data.recent_issues.map((issue, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                <div style={{ 
                  width: '2px', 
                  backgroundColor: issue.status === 'returned' ? '#10B981' : '#F59E0B', 
                  borderRadius: '2px' 
                }}></div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>
                    {issue.book_title}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--theme-text-muted)' }}>
                    Issued {issue.student_name || issue.staff_name} • {issue.issue_date}
                  </p>
                </div>
              </div>
            )) : (
              <p style={{ color: 'var(--theme-text-muted)', padding: '20px', textAlign: 'center' }}>No recent issues.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryOverview;
