'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, AlertCircle, BookOpen,
  Download, Share2, Printer, ArrowUpRight, ArrowDownRight, Star
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import styles from './PerfomaceStdDetail.module.css';
import adminApi from '@/api/adminApi';

const PerfomaceStdDetail = ({ studentSummary, examId, subjects, onBack, onEnterMarks }) => {
  const [trajectory, setTrajectory] = useState([]);
  const [reportCard, setReportCard] = useState(null);
  const [loadingTraj, setLoadingTraj] = useState(false);

  const studentId = studentSummary?.student_id;

  // Fetch trajectory (all report cards for this student) + current report card
  useEffect(() => {
    if (!studentId) return;
    setLoadingTraj(true);
    adminApi.getReportCards({ student: studentId })
      .then(res => {
        const rcs = Array.isArray(res.data) ? res.data : [];
        // Build trajectory data
        setTrajectory(
          rcs
            .filter(rc => rc.percentage != null)
            .map(rc => ({ name: rc.exam_name || `Exam ${rc.exam}`, score: parseFloat(rc.percentage) }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        // Current exam report card
        if (examId) {
          const current = rcs.find(rc => String(rc.exam) === String(examId));
          setReportCard(current || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTraj(false));
  }, [studentId, examId]);

  // Build bar chart data from subjects in this exam
  const subjectChartData = useMemo(() => {
    if (!studentSummary?.subjects) return [];
    return subjects
      .map(sub => {
        const entry = studentSummary.subjects[String(sub.id)];
        if (!entry) return null;
        return {
          subject: sub.name.length > 8 ? sub.name.slice(0, 8) + '…' : sub.name,
          fullName: sub.name,
          student: entry.percentage ?? 0,
          isAbsent: entry.is_absent,
        };
      })
      .filter(Boolean);
  }, [studentSummary, subjects]);

  // Smart insights from real data
  const insights = useMemo(() => {
    const list = [];
    if (!studentSummary?.subjects) return list;

    const subEntries = Object.values(studentSummary.subjects);
    if (!subEntries.length) return list;

    const withPct = subEntries.filter(s => s.percentage != null && !s.is_absent);
    if (!withPct.length) return list;

    const best = withPct.reduce((a, b) => (a.percentage > b.percentage ? a : b));
    const worst = withPct.reduce((a, b) => (a.percentage < b.percentage ? a : b));
    const avg = withPct.reduce((a, s) => a + s.percentage, 0) / withPct.length;

    list.push({
      type: 'positive',
      text: `Strongest subject: ${best.name} (${best.percentage}%)`,
      icon: <Star size={14} />,
    });
    if (worst.percentage < avg - 10) {
      list.push({
        type: 'warning',
        text: `Needs improvement: ${worst.name} (${worst.percentage}% — ${(avg - worst.percentage).toFixed(1)}% below average)`,
        icon: <AlertCircle size={14} />,
      });
    }
    if (trajectory.length >= 2) {
      const last = trajectory[trajectory.length - 1].score;
      const prev = trajectory[trajectory.length - 2].score;
      const diff = last - prev;
      list.push({
        type: diff >= 0 ? 'trend' : 'warning',
        text: diff >= 0
          ? `Improving trajectory (+${diff.toFixed(1)}% from previous exam)`
          : `Declining trend (${diff.toFixed(1)}% from previous exam)`,
        icon: diff >= 0 ? <TrendingUp size={14} /> : <ArrowDownRight size={14} />,
      });
    }

    return list;
  }, [studentSummary, trajectory]);

  const overallPct = studentSummary?.overall_percentage;
  const rank = studentSummary?.rank;
  const grade = studentSummary?.grade || reportCard?.grade || '—';

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.profileInfo}>
          <div className={styles.avatarCircle}>
            {(studentSummary?.name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className={styles.meta}>
            <h2 className={styles.name}>{studentSummary?.name || '—'}</h2>
            <p className={styles.subtext}>
              ID: {studentSummary?.admission_number || '—'}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={onBack}>Back to List</button>
          {onEnterMarks && (
            <button className={styles.secondaryBtn} onClick={() => onEnterMarks(studentId)}>
              + Enter Marks
            </button>
          )}
          <button className={styles.primaryBtn} onClick={() => window.print()}>
            <Printer size={16} /> Print Full Report
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          {/* Quick stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Overall Rank</span>
              <div className={styles.statValue}>
                {rank ? `#${rank}` : '—'}
                {rank && rank <= 3 && <span className={styles.trendUp}><ArrowUpRight size={14} /></span>}
              </div>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Overall %</span>
              <div className={styles.statValue}>
                {overallPct != null ? `${parseFloat(overallPct).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Grade</span>
              <div className={`${styles.statValue} ${styles.gradeVal}`}>{grade}</div>
            </div>
          </div>

          {/* Subject bar chart */}
          <div className={styles.chartSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}><BookOpen size={18} /> Subject Breakdown</h3>
              <div className={styles.legend}>
                <span className={styles.legendItem}><i className={styles.dotStudent} /> Student %</span>
              </div>
            </div>
            {subjectChartData.length > 0 ? (
              <div className={styles.barChartWrap}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={subjectChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--theme-text-muted)' }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--theme-text-muted)' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
                      formatter={(val, _name, props) => [props.payload.isAbsent ? 'Absent' : `${val}%`, 'Score']}
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                    />
                    <Bar dataKey="student" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.noData}>No subject marks entered yet.</p>
            )}
          </div>

          {/* Smart insights */}
          <div className={styles.insightsSection}>
            <h3 className={styles.sectionTitle}><TrendingUp size={18} /> Smart Insights</h3>
            {insights.length > 0 ? (
              <div className={styles.insightsList}>
                {insights.map((insight, idx) => (
                  <div key={idx} className={`${styles.insightItem} ${styles[insight.type]}`}>
                    <div className={styles.insightIcon}>{insight.icon}</div>
                    <span className={styles.insightText}>{insight.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noData}>Enter marks to generate insights.</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          {/* Trajectory */}
          <div className={styles.trajectoryCard}>
            <h3 className={styles.sectionTitle}>Trajectory</h3>
            {trajectory.length >= 2 ? (
              <div className={styles.areaChartWrap}>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={trajectory}>
                    <defs>
                      <linearGradient id="trajGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--theme-text-muted)' }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--theme-text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)', borderRadius: 8, color: 'var(--theme-text)' }} />
                    <Area type="monotone" dataKey="score" stroke="var(--color-primary)" fillOpacity={1} fill="url(#trajGrad)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.noData}>{loadingTraj ? 'Loading…' : 'Need 2+ exams for trajectory.'}</p>
            )}
          </div>

          {/* Report card preview */}
          <div className={styles.reportPreview}>
            <div className={styles.cardHeader}>
              <div>
                <h4 className={styles.cardTitle}>Report Card</h4>
                <span className={styles.cardTerm}>
                  {reportCard ? `Exam: ${reportCard.exam_name || `#${reportCard.exam}`}` : 'Current Exam'}
                </span>
              </div>
              {reportCard?.pdf_file && (
                <a href={reportCard.pdf_file} target="_blank" rel="noreferrer">
                  <Download size={18} className={styles.cardIcon} />
                </a>
              )}
            </div>

            <div className={styles.cardBody}>
              <div className={styles.cardGrid}>
                <div className={styles.cardItem}>
                  <span className={styles.cardLabel}>Overall %</span>
                  <span className={styles.cardValue}>
                    {overallPct != null ? `${parseFloat(overallPct).toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className={styles.cardItem}>
                  <span className={styles.cardLabel}>Grade</span>
                  <span className={styles.cardGrade}>{grade}</span>
                </div>
                <div className={styles.cardItem}>
                  <span className={styles.cardLabel}>Rank</span>
                  <span className={styles.cardValue}>{rank ? `#${rank}` : '—'}</span>
                </div>
              </div>

              <div className={styles.cardSummary}>
                <div className={styles.summaryRow}>
                  <span>Status</span>
                  <span className={
                    overallPct >= 85 ? styles.tagExcellent :
                    overallPct >= 60 ? styles.tagGood :
                    overallPct >= 35 ? styles.tagAverage : styles.tagAtRisk
                  }>
                    {overallPct >= 85 ? 'Excellent' :
                     overallPct >= 60 ? 'Good' :
                     overallPct >= 35 ? 'Average' :
                     overallPct != null ? 'At Risk' : 'No Data'}
                  </span>
                </div>
                {reportCard?.teacher_remarks && (
                  <div className={styles.summaryRow}>
                    <span>Teacher Remark</span>
                    <p className={styles.remarkText}>{reportCard.teacher_remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Per-subject detail table */}
          {subjectChartData.length > 0 && (
            <div className={styles.subjectDetailTable}>
              <h4 className={styles.sectionTitle}>Subject-wise Marks</h4>
              <table>
                <thead>
                  <tr><th>Subject</th><th>Marks</th><th>Max</th><th>%</th></tr>
                </thead>
                <tbody>
                  {subjects.map(sub => {
                    const entry = studentSummary?.subjects?.[String(sub.id)];
                    if (!entry) return null;
                    return (
                      <tr key={sub.id}>
                        <td>{sub.name}</td>
                        <td>{entry.is_absent ? 'Absent' : (entry.marks ?? '—')}</td>
                        <td>{entry.max_marks}</td>
                        <td className={!entry.is_absent && entry.percentage < 40 ? styles.riskText : ''}>
                          {entry.is_absent ? '—' : (entry.percentage != null ? `${entry.percentage}%` : '—')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerfomaceStdDetail;
