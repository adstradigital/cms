'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle,
  Users, FileText, Settings, ChevronRight, BarChart3, Receipt, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import adminApi from '@/api/adminApi';
import layoutStyles from '../shared/FinanceLayout.module.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function FinanceDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [defaulters, setDefaulters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [defRes, payRes, expRes] = await Promise.all([
        adminApi.getFeeDefaulters().catch(() => ({ data: [] })),
        adminApi.getFeePayments({ status: 'paid' }).catch(() => ({ data: [] })),
        adminApi.getExpenseEntries({ status: 'paid' }).catch(() => ({ data: [] }))
      ]);
      setDefaulters(defRes.data || []);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalOutstanding = defaulters.reduce((acc, d) => acc + Number(d.total_due || d.fee_structure || 0), 0);
  const receiptsIssued = payments.length;

  // Chart 1: Revenue vs Expenses last 6 months
  const monthlyData = () => {
    const dataMap = {};
    const today = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mName = d.toLocaleString('default', { month: 'short' });
      dataMap[`${mName} ${d.getFullYear()}`] = { name: mName, sortedKey: d.getTime(), revenue: 0, expense: 0 };
    }

    payments.forEach(p => {
      if (!p.payment_date) return;
      const d = new Date(p.payment_date);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      if (dataMap[key]) dataMap[key].revenue += Number(p.amount_paid);
    });

    expenses.forEach(e => {
      if (!e.date) return;
      const d = new Date(e.date);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      if (dataMap[key]) dataMap[key].expense += Number(e.amount);
    });

    return Object.values(dataMap).sort((a,b) => a.sortedKey - b.sortedKey);
  };

  // Chart 2: Collection by Category mapping
  const categoryData = () => {
    const map = {};
    payments.forEach(p => {
      const cat = p.category_name || 'Other';
      if (!map[cat]) map[cat] = 0;
      map[cat] += Number(p.amount_paid);
    });
    return Object.keys(map).map((k) => ({ name: k, value: map[k] })).sort((a,b) => b.value - a.value);
  };

  const chartInfoData = monthlyData();
  const chartPieData = categoryData();

  if (loading) {
    return <div className={layoutStyles.loading} style={{ height: '50vh' }}><Loader2 size={24} className={layoutStyles.spin} /> Loading dashboard...</div>;
  }

  return (
    <div className={layoutStyles.financeModule}>
      {/* Header */}
      <div className={layoutStyles.pageHeader}>
        <h1 className={layoutStyles.pageTitle}>Finance Overview</h1>
        <p className={layoutStyles.pageSubtitle}>Analytics, performance metrics, and recent activity</p>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className={layoutStyles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className={layoutStyles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Total Collected</div>
            <div className={layoutStyles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>₹{totalCollected.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className={layoutStyles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} style={{ transform: 'rotate(180deg)' }} />
          </div>
          <div>
            <div className={layoutStyles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Total Expenses</div>
            <div className={layoutStyles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#dc2626' }}>₹{totalExpenses.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className={layoutStyles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className={layoutStyles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Outstanding Dues</div>
            <div className={layoutStyles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#d97706' }}>₹{totalOutstanding.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className={layoutStyles.card} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={24} />
          </div>
          <div>
            <div className={layoutStyles.textSub} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>Receipts Issued</div>
            <div className={layoutStyles.fontMono} style={{ fontSize: 24, fontWeight: 900, color: '#7c3aed' }}>{receiptsIssued}</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className={layoutStyles.card} style={{ padding: 0 }}>
          <div className={layoutStyles.cardHeader} style={{ padding: 24 }}>
             <h3 className={layoutStyles.cardTitle}>Cash Flow (Last 6 Months)</h3>
          </div>
          <div style={{ height: 320, padding: '0 24px 24px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartInfoData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontWeight: 600 }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12, fontWeight: 600 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className={layoutStyles.card} style={{ padding: 0 }}>
          <div className={layoutStyles.cardHeader} style={{ padding: 24 }}>
             <h3 className={layoutStyles.cardTitle}>Revenue by Category</h3>
          </div>
          <div style={{ height: 320, padding: '0 24px 24px', display: 'flex', flexDirection: 'column' }}>
            {chartPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `₹${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontWeight: 600 }}
                  />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
                No revenue data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Defaulters Table */}
      <div className={layoutStyles.card} style={{ padding: 0 }}>
        <div className={layoutStyles.cardHeader} style={{ padding: 24 }}>
          <div>
            <h3 className={layoutStyles.cardTitle}>Recent Defaulters</h3>
            <p className={layoutStyles.cardSubtitle}>Students with overdue and pending payments</p>
          </div>
          <button className={layoutStyles.btnSecondary} onClick={() => router.push('/admins/finance/fees/defaulters')}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className={layoutStyles.tableResponsive} style={{ borderTop: 'none', borderRadius: 0, margin: 0 }}>
          <table className={layoutStyles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No.</th>
                <th>Fee Head</th>
                <th className={layoutStyles.textRight}>Amount Due</th>
                <th className={layoutStyles.textCenter}>Status</th>
              </tr>
            </thead>
            <tbody>
              {defaulters.length === 0 ? (
                 <tr><td colSpan={5} className={layoutStyles.emptyState}>No defaulters currently.</td></tr>
              ) : defaulters.slice(0, 5).map((d) => (
                <tr key={d.id}>
                  <td className={layoutStyles.textBold}>{d.student_name}</td>
                  <td style={{ color: 'var(--finance-text-muted)' }}>{d.admission_number}</td>
                  <td>{d.category_name}</td>
                  <td className={`${layoutStyles.fontMono} ${layoutStyles.textRight}`} style={{ color: '#dc2626', fontWeight: 800 }}>
                    ₹{Number(d.total_due || d.fee_structure || 0).toLocaleString('en-IN')}
                  </td>
                  <td className={layoutStyles.textCenter}>
                    <span className={`${layoutStyles.badge} ${d.status === 'overdue' ? layoutStyles.badgeDanger : layoutStyles.badgePending}`}>
                      {d.status?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
