'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  BookOpen, 
  AlertCircle, 
  CheckCircle, 
  DollarSign,
  Loader2,
  Calendar,
  Share2
} from 'lucide-react';
import axios from '@/api/instance';

const LibraryReports = () => {
  const [reportData, setReportData] = useState([]);
  const [reportType, setReportType] = useState('issued'); // 'issued', 'overdue', 'fines', 'availability'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const reportOptions = [
    { id: 'issued', label: 'Issued Books', icon: <BookOpen size={18} />, desc: 'Current books held by borrowers.' },
    { id: 'overdue', label: 'Overdue Books', icon: <AlertCircle size={18} />, desc: 'Books past their return due date.' },
    { id: 'fines', label: 'Fine Collection', icon: <DollarSign size={18} />, desc: 'History of fines and payment status.' },
    { id: 'availability', label: 'Book Availability', icon: <CheckCircle size={18} />, desc: 'Real-time stock and shelf location.' },
  ];

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const getEmptyMessage = () => {
    switch (reportType) {
      case 'issued':
        return 'No currently issued books.';
      case 'overdue':
        return 'No overdue books right now.';
      case 'fines':
        return 'No fine records available.';
      case 'availability':
        return 'No books available in catalog.';
      default:
        return 'No data available for this report type.';
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/library/reports/', { params: { report_type: reportType } });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setReportData(rows);
    } catch (error) {
      console.error('Error fetching report:', error);
      setReportData([]);
      setError(error.response?.data?.error || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const getFilenameFromDisposition = (contentDisposition) => {
    if (!contentDisposition) return '';

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const basicMatch = contentDisposition.match(/filename="?([^\";]+)"?/i);
    if (basicMatch?.[1]) {
      return basicMatch[1];
    }

    return '';
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await axios.get('/library/reports/export/', {
        params: { report_type: reportType },
        responseType: 'blob'
      });

      const filename =
        getFilenameFromDisposition(response.headers?.['content-disposition']) ||
        `library_${reportType}_report.xlsx`;

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert('Failed to export report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Report Selector Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {reportOptions.map((opt) => (
          <div 
            key={opt.id}
            onClick={() => setReportType(opt.id)}
            style={{
              padding: '20px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease',
              backgroundColor: reportType === opt.id ? 'var(--theme-primary-light)' : 'var(--theme-bg-white)',
              border: `2px solid ${reportType === opt.id ? 'var(--theme-primary)' : 'var(--theme-border-subtle)'}`,
              display: 'flex', flexDirection: 'column', gap: '10px'
            }}
          >
            <div style={{ color: 'var(--theme-primary)' }}>{opt.icon}</div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--theme-text)' }}>{opt.label}</h4>
            <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>{opt.desc}</p>
          </div>
        ))}
      </div>

      {/* Report Table Area */}
      <div style={{ backgroundColor: 'var(--theme-bg-white)', borderRadius: '12px', border: '1px solid var(--theme-border-subtle)', minHeight: '400px' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--theme-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
            {reportOptions.find(o => o.id === reportType)?.label} Data
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleExport}
              disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px' }}
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button 
              onClick={fetchReport}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--theme-primary)', color: 'white', cursor: 'pointer', fontSize: '14px' }}
            >
              Refresh
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto', color: 'var(--theme-text-muted)' }} /></div>
          ) : error ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#DC2626' }}>{error}</div>
          ) : reportData.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--theme-bg-subtle)' }}>
                  {reportType === 'availability' ? (
                    <>
                      <th style={{ padding: '16px', fontSize: '13px' }}>Book Title</th>
                      <th style={{ padding: '16px', fontSize: '13px' }}>Author</th>
                      <th style={{ padding: '16px', fontSize: '13px' }}>Total</th>
                      <th style={{ padding: '16px', fontSize: '13px' }}>Available</th>
                      <th style={{ padding: '16px', fontSize: '13px' }}>Shelf</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '16px', fontSize: '13px' }}>Borrower</th>
                      <th style={{ padding: '16px', fontSize: '13px' }}>Book</th>
                      <th style={{ padding: '16px', fontSize: '13px' }}>Due Date</th>
                      {reportType === 'fines' && <th style={{ padding: '16px', fontSize: '13px' }}>Total Fine</th>}
                      {reportType === 'fines' && <th style={{ padding: '16px', fontSize: '13px' }}>Paid Status</th>}
                      {reportType !== 'fines' && <th style={{ padding: '16px', fontSize: '13px' }}>Status</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--theme-border-subtle)' }}>
                    {reportType === 'availability' ? (
                      <>
                        <td style={{ padding: '16px', fontWeight: '500' }}>{item.title}</td>
                        <td style={{ padding: '16px', color: 'var(--theme-text-muted)' }}>{item.author}</td>
                        <td style={{ padding: '16px' }}>{item.total_copies}</td>
                        <td style={{ padding: '16px', color: item.available_copies > 0 ? '#10B981' : '#DC2626', fontWeight: 'bold' }}>{item.available_copies}</td>
                        <td style={{ padding: '16px' }}>{item.shelf_name || 'N/A'}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '16px', fontWeight: '500' }}>{item.student_name || item.staff_name}</td>
                        <td style={{ padding: '16px', color: 'var(--theme-text-muted)' }}>{item.book_title}</td>
                        <td style={{ padding: '16px' }}>{item.due_date}</td>
                        {reportType === 'fines' && <td style={{ padding: '16px', fontWeight: 'bold', color: '#DC2626' }}>₹{item.fine_amount}</td>}
                        {reportType === 'fines' && <td style={{ padding: '16px' }}>{item.fine_paid ? 'Paid' : 'Pending'}</td>}
                        {reportType !== 'fines' && (
                          <td style={{ padding: '16px' }}>
                            {reportType === 'overdue'
                              ? (item.status === 'returned' ? 'RETURNED LATE' : 'OVERDUE')
                              : String(item.status || '').toUpperCase()}
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>{getEmptyMessage()}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryReports;
