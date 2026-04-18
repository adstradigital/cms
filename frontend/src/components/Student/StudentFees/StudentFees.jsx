'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Receipt, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Loader2,
  Calendar,
  History,
  Zap,
  ArrowRight,
  TrendingUp,
  Award,
  Star
} from 'lucide-react';
import styles from './StudentFees.module.css';
import useFetch from '@/hooks/useFetch';
import adminApi from '@/api/adminApi';

export default function StudentFees() {
  const { data: dashData, loading: dashLoading } = useFetch('/students/students/dashboard-data/');
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const studentId = dashData?.profile?.id;

  useEffect(() => {
    if (!studentId) {
      if (!dashLoading) setLoading(false);
      return;
    }

    const fetchStatement = async () => {
      try {
        setLoading(true);
        const res = await adminApi.getStudentFeeStatement(studentId);
        setStatement(res.data);
      } catch (err) {
        console.error("Failed to fetch fee statement", err);
        setError("Unable to load fee details.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatement();
  }, [studentId, dashLoading]);

  const stats = useMemo(() => {
    if (!statement) return null;
    const total = parseFloat(statement.total_fee) || 0;
    const paid = parseFloat(statement.total_paid) || 0;
    const due = parseFloat(statement.total_due) || 0;
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
    
    return { total, paid, due, percentage };
  }, [statement]);

  if (loading || dashLoading) {
    return (
      <div className={styles.loader}>
        <Loader2 className="animate-spin" size={40} color="#4f46e5" />
        <p>Syncing your financial ledger...</p>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className={styles.emptyState}>
        <Zap size={48} color="#f87171" />
        <h2 className={styles.emptyTitle}>Access Error</h2>
        <p className={styles.emptyText}>{error || "Fee records for your account could not be found."}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Financial Dashboard</h1>
          <p>Academic Year {statement.academic_year || 'Current'}</p>
        </div>
      </header>

      {/* PREMIUM FINANCIAL RIBBON */}
      <section className={styles.achievementRibbon}>
        <div className={styles.achievementMain}>
          {/* Payment Gauge */}
          <div className={styles.gaugeCol}>
            <div className={styles.circularGauge}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.gaugeBg} cx="50" cy="50" r="45" />
                <circle 
                  className={styles.gaugeFill} 
                  style={{ strokeDashoffset: 283 - (283 * (stats?.percentage || 0)) / 100, stroke: '#6366f1' }} 
                  cx="50" cy="50" r="45" 
                />
              </svg>
              <div className={styles.gaugeContent}>
                <span className={styles.gaugeValue}>{stats?.percentage}%</span>
                <span className={styles.gaugeLabel}>PAID</span>
              </div>
            </div>
          </div>

          <div className={styles.verticalDivider} />

          {/* Total Fee */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e293b' }}>
              <Wallet size={20} color="#94a3b8" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>₹{stats?.total?.toLocaleString()}</span>
              <span className={styles.metricLabel}>Total Annual Fee</span>
            </div>
          </div>

          {/* Amount Paid */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#064e3b' }}>
              <CheckCircle2 size={20} color="#34d399" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>₹{stats?.paid?.toLocaleString()}</span>
              <span className={styles.metricLabel}>Amount Paid</span>
            </div>
          </div>

          {/* Outstanding */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: stats?.due > 0 ? '#450a0a' : '#1e293b' }}>
              <CreditCard size={20} color={stats?.due > 0 ? '#f87171' : '#94a3b8'} />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>₹{stats?.due?.toLocaleString()}</span>
              <span className={styles.metricLabel}>Outstanding Balance</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.mainLayout}>
        <div className={styles.historyCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <History size={18} /> Transaction Logs
            </h3>
            <div className={styles.tableLegend}>
              <span>Academic History • {statement.payments?.length || 0} Records</span>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            {statement.payments && statement.payments.length > 0 ? (
              <table className={styles.feesTable}>
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Receipt No.</th>
                    <th>Category</th>
                    <th>Method</th>
                    <th className={styles.textRight}>Amount Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.payments.map((p, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className={styles.dateCell}>
                          <Calendar size={13} />
                          {new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className={styles.receiptNo}>#{p.receipt_number}</td>
                      <td className={styles.categoryCell}>{p.fee_structure?.category?.name || "Tuition Fee"}</td>
                      <td>
                        <span className={styles.methodBadge}>{p.payment_method}</span>
                      </td>
                      <td className={`${styles.amountCell} ${styles.textRight}`}>
                        ₹{parseFloat(p.amount_paid).toLocaleString()}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[p.status.toLowerCase()]}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyTable}>
                <Receipt size={48} color="#e2e8f0" />
                <p>No historical payments detected for this year.</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.sidePanel}>
           {stats?.due > 0 && (
             <div className={styles.alertCard}>
                <div className={styles.alertHeader}>
                   <div className={styles.alertIcon}><AlertCircle size={20} /></div>
                   <h4>Payment Required</h4>
                </div>
                <p>An outstanding balance of <strong>₹{stats.due.toLocaleString()}</strong> is due for the current period.</p>
                <button className={styles.payNowBtn}>Pay Securely <ArrowRight size={16} /></button>
             </div>
           )}

           <div className={styles.supportCard}>
             <div className={styles.supportIcon}><Award size={20} color="#4f46e5" /></div>
             <div className={styles.supportInfo}>
                <h4>Fee Assistance</h4>
                <p>Scholarship and installment plans available.</p>
             </div>
             <button className={styles.detailsBtn}>Contact Accounts</button>
           </div>
        </div>
      </div>
    </div>
  );
}
