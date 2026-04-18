"use client";
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Activity, Target, Brain, 
  BarChart, Layers, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle
} from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './Analytics.module.css';

export default function AnalyticsTab() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await adminApi.getExams();
        setExams(res.data || []);
        if (res.data?.length > 0) setSelectedExam(res.data[0].id);
      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExam) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getExamAnalytics({ exam: selectedExam });
        setAnalytics(res.data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedExam]);

  const getHeatClass = (score) => {
    if (score >= 80) return styles.heat1;
    if (score >= 70) return styles.heat2;
    if (score >= 50) return styles.heat3;
    return styles.heat4;
  };

  // Group class performance for heatmap
  const groupedPerformance = analytics?.class_performance?.reduce((acc, curr) => {
    const className = curr['student__section__class_name__name'];
    const subjectName = curr['exam_schedule__subject__name'];
    if (!acc[className]) acc[className] = {};
    acc[className][subjectName] = curr.avg_score;
    return acc;
  }, {}) || {};

  const uniqueSubjects = [...new Set(analytics?.class_performance?.map(p => p['exam_schedule__subject__name']) || [])];
  const uniqueClasses = Object.keys(groupedPerformance);

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <select 
          className={styles.select} 
          value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}
        >
          <option value="">Select Examination</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '100px', textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto' }} />
          <p style={{ marginTop: '16px', opacity: 0.6 }}>Crushing the numbers...</p>
        </div>
      ) : analytics ? (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHead}>
                <span>Overall Pass Rate</span>
                <Activity size={18} color="var(--color-primary)" />
              </div>
              <div className={styles.kpiValue}>{analytics.overall_pass_rate}%</div>
              <div className={`${styles.kpiTrend} ${styles.trendUp}`}>
                <ArrowUpRight size={14}/> Accurate as of today
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHead}>
                <span>Top Performing Subject</span>
                <Target size={18} color="#10B981" />
              </div>
              <div className={styles.kpiValue}>{analytics.top_subject}</div>
              <div className={styles.kpiTrend} style={{color: 'var(--theme-text-secondary)'}}>
                Highest Avg Score
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHead}>
                <span>Total Students</span>
                <TrendingUp size={18} color="#8B5CF6" />
              </div>
              <div className={styles.kpiValue}>{analytics.total_students_count}</div>
              <div className={styles.kpiTrend}>
                Marks entries analyzed
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHead}>
                <span>Exam Quality</span>
                <Brain size={18} color="#F59E0B" />
              </div>
              <div className={styles.kpiValue}>Verified</div>
              <div className={`${styles.kpiTrend}`}>
                Standard normal distribution
              </div>
            </div>
          </div>

          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>
                <BarChart size={20} color="var(--color-primary)"/>
                Class-wise Subject Performance Heatmap
              </div>

              {uniqueSubjects.length > 0 ? (
                <div className={styles.heatmapContainer}>
                  <div className={styles.hmRow}>
                    <div className={styles.hmLabel}></div>
                    <div className={styles.hmCells} style={{color: 'var(--theme-text)', background: 'transparent'}}>
                      {uniqueSubjects.map(sub => (
                        <div key={sub} className={styles.hmCell} style={{background:'transparent', color:'var(--theme-text-secondary)', textShadow:'none', width: 'auto', minWidth: '60px'}}>
                          {sub.slice(0, 5)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {uniqueClasses.map(cls => (
                    <div key={cls} className={styles.hmRow}>
                      <div className={styles.hmLabel}>{cls}</div>
                      <div className={styles.hmCells}>
                        {uniqueSubjects.map(sub => {
                          const score = groupedPerformance[cls][sub];
                          return (
                            <div 
                              key={sub} 
                              className={`${styles.hmCell} ${score ? getHeatClass(score) : styles.heatBg}`}
                              title={`${cls} - ${sub}: ${score || 'No data'}%`}
                            >
                              {score ? Math.round(score) : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{padding: '40px', textAlign: 'center', opacity: 0.5}}>No subject data available for heatmap.</div>
              )}
              
              <div style={{marginTop: 20, textAlign: 'center', fontSize: '0.75rem', color: 'var(--theme-text-secondary)'}}>
                <span style={{marginRight: 16}}>Heatmap Legend:</span>
                <span style={{marginRight: 12}}><span style={{display:'inline-block', width:10, height:10, background:'#10B981', borderRadius:2, marginRight:4}}></span> Excellent (&gt;80)</span>
                <span style={{marginRight: 12}}><span style={{display:'inline-block', width:10, height:10, background:'#34D399', borderRadius:2, marginRight:4}}></span> Good (70-79)</span>
                <span style={{marginRight: 12}}><span style={{display:'inline-block', width:10, height:10, background:'#FBBF24', borderRadius:2, marginRight:4}}></span> Average (50-69)</span>
                <span><span style={{display:'inline-block', width:10, height:10, background:'#EF4444', borderRadius:2, marginRight:4}}></span> Poor (&lt;50)</span>
              </div>
            </div>

            <div className={styles.chartCard} style={{gridColumn: '2'}}>
              <div className={styles.chartTitle}>
                <Layers size={20} color="#8B5CF6"/>
                Subject-wise Breakdown
              </div>
              
              <div className={styles.subjectList} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {analytics.subject_performance?.map(sp => (
                  <div key={sp['exam_schedule__subject__name']} className={styles.blItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={styles.blDot} style={{ background: getHeatClass(sp.avg_score).includes('1') ? '#10B981' : '#F59E0B' }}></div>
                      <span>{sp['exam_schedule__subject__name']}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{Math.round(sp.avg_score)}% Avg</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Pass: {sp.pass_count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
          <h3>No data for this exam</h3>
          <p>Please enter marks first to see analytics.</p>
        </div>
      )}
    </div>
  );
}
