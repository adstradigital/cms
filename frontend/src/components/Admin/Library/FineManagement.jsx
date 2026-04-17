'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Save, 
  Loader2, 
  AlertCircle,
  Calendar,
  User,
  BookOpen,
  Filter,
  Check
} from 'lucide-react';
import axios from '@/api/instance';

const FineManagement = () => {
  const [fines, setFines] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('tracking'); // 'tracking' or 'rules'

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const getListData = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const upsertSetting = (list, configKey, value) => {
    const normalized = String(value ?? '');
    const existingIndex = list.findIndex((item) => item.config_key === configKey);
    if (existingIndex >= 0) {
      const next = [...list];
      next[existingIndex] = { ...next[existingIndex], value: normalized };
      return next;
    }
    return [...list, { config_key: configKey, value: normalized }];
  };

  const getSettingValue = (configKey, fallback) => {
    const setting = settings.find((item) => item.config_key === configKey);
    return setting?.value ?? String(fallback);
  };

  const getErrorMessage = (error, fallback) => {
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.response?.data?.detail) return error.response.data.detail;
    return fallback;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeSubTab === 'rules') {
        const res = await axios.get('/library/settings/');
        setSettings(getListData(res.data));
      } else {
        const res = await axios.get('/library/issues/', { params: { has_fine: 'true' } });
        // Filtering in frontend because backend might not have 'has_fine' param explicitly yet
        const allIssues = getListData(res.data);
        setFines(allIssues.filter(i => (i.fine_amount > 0 || i.status === 'overdue')));
      }
    } catch (error) {
      console.error('Error fetching fine data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRule = async (configKey, newValue) => {
    const normalizedValue = String(newValue ?? '').trim();
    if (!normalizedValue) return;

    setSubmitting(true);
    try {
      await axios.patch(`/library/settings/${configKey}/`, { value: normalizedValue });
      setSettings((prev) => upsertSetting(prev, configKey, normalizedValue));
    } catch (error) {
      if (error?.response?.status === 404) {
        try {
          await axios.post('/library/settings/', {
            config_key: configKey,
            value: normalizedValue,
            description: configKey === 'grace_period_days'
              ? 'Optional grace period before fine starts after due date.'
              : 'Daily fine amount for overdue books.'
          });
          setSettings((prev) => upsertSetting(prev, configKey, normalizedValue));
          return;
        } catch (createError) {
          alert(getErrorMessage(createError, 'Failed to update rule.'));
          return;
        }
      }
      alert(getErrorMessage(error, 'Failed to update rule.'));
    } finally {
      setSubmitting(false);
    }
  };

  const markAsPaid = async (id) => {
    if (window.confirm('Mark this fine as paid?')) {
      try {
        await axios.post(`/library/issues/${id}/pay/`);
        fetchData();
      } catch (error) {
        alert('Failed to update status.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => setActiveSubTab('tracking')}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: activeSubTab === 'tracking' ? 'var(--theme-primary)' : 'var(--theme-bg-subtle)',
            color: activeSubTab === 'tracking' ? 'white' : 'var(--theme-text)',
            fontWeight: '600'
          }}
        >
          Fine Tracking
        </button>
        <button 
          onClick={() => setActiveSubTab('rules')}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: activeSubTab === 'rules' ? 'var(--theme-primary)' : 'var(--theme-bg-subtle)',
            color: activeSubTab === 'rules' ? 'white' : 'var(--theme-text)',
            fontWeight: '600'
          }}
        >
          Fine Rules Setup
        </button>
      </div>

      {activeSubTab === 'rules' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          {/* Fine Rate */}
          <div style={{ backgroundColor: 'var(--theme-bg-white)', padding: '24px', borderRadius: '16px', border: '1px solid var(--theme-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '10px', borderRadius: '10px' }}><DollarSign size={20} /></div>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Fine Per Day</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--theme-text-muted)', marginBottom: '20px' }}>Set the daily fine amount for overdue books.</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold' }}>₹</span>
                <input 
                  type="number" 
                  step="1"
                  disabled={submitting}
                  value={getSettingValue('fine_rate_per_day', 5)}
                  onChange={(e) => setSettings((prev) => upsertSetting(prev, 'fine_rate_per_day', e.target.value))}
                  onBlur={(e) => handleUpdateRule('fine_rate_per_day', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 24px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', fontWeight: '600' }}
                />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--theme-text-muted)' }}>INR / Day</span>
            </div>
          </div>

          {/* Grace Period */}
          <div style={{ backgroundColor: 'var(--theme-bg-white)', padding: '24px', borderRadius: '16px', border: '1px solid var(--theme-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#F0FDF4', color: '#10B981', padding: '10px', borderRadius: '10px' }}><Clock size={20} /></div>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Grace Period</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--theme-text-muted)', marginBottom: '20px' }}>Optional period before fine starts calculating after due date.</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="number" 
                disabled={submitting}
                value={getSettingValue('grace_period_days', 0)}
                onChange={(e) => setSettings((prev) => upsertSetting(prev, 'grace_period_days', e.target.value))}
                onBlur={(e) => handleUpdateRule('grace_period_days', e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', fontWeight: '600' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--theme-text-muted)' }}>Days</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--theme-bg-white)', borderRadius: '12px', border: '1px solid var(--theme-border-subtle)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--theme-bg-subtle)', borderBottom: '1px solid var(--theme-border-subtle)' }}>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600' }}>Student / Borrower</th>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600' }}>Book & Dates</th>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600' }}>Lateness</th>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600' }}>Total Fine</th>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading fine records...</td></tr>
              ) : fines.length > 0 ? fines.map((record) => {
                const daysLate = record.return_date ? 
                  Math.max(0, Math.floor((new Date(record.return_date) - new Date(record.due_date)) / (1000 * 60 * 60 * 24))) :
                  Math.max(0, Math.floor((new Date() - new Date(record.due_date)) / (1000 * 60 * 60 * 24)));
                
                return (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--theme-border-subtle)' }}>
                    <td style={{ padding: '16px' }}>
                      <p style={{ fontWeight: '600', color: 'var(--theme-text)' }}>{record.student_name || record.staff_name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>{record.student ? 'Student' : 'Staff'}</p>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '500' }}>{record.book_title}</p>
                      <p style={{ fontSize: '11px', color: 'var(--theme-text-muted)' }}>Due: {record.due_date} | Ret: {record.return_date || 'Pending'}</p>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: '#DC2626', fontWeight: '700' }}>{daysLate} Days Late</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: record.fine_paid ? '#059669' : '#DC2626' }}>
                        ₹{parseFloat(record.fine_amount).toFixed(2)}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--theme-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {record.fine_paid ? <><CheckCircle size={12} color="#059669" /> Paid</> : <><XCircle size={12} color="#DC2626" /> Pending</>}
                      </p>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {!record.fine_paid && record.fine_amount > 0 && (
                        <button 
                          onClick={() => markAsPaid(record.id)}
                          style={{
                            padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--theme-primary)',
                            backgroundColor: 'transparent', color: 'var(--theme-primary)', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <Check size={14} /> Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>No outstanding fines. Great!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FineManagement;
