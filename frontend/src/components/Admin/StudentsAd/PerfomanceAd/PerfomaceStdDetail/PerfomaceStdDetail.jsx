import React from 'react';
import { 
  TrendingUp, Award, AlertCircle, BookOpen, 
  ChevronRight, Download, Share2, Star,
  ArrowUpRight, ArrowDownRight, Printer
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import styles from './PerfomaceStdDetail.module.css';

const PerfomaceStdDetail = ({ student, onBack }) => {
  // Mock data for demonstration - in production, this would come from props or API
  const subjectData = [
    { subject: 'Mathematics', student: 88, classAvg: 72, top: 95 },
    { subject: 'Science', student: 76, classAvg: 68, top: 92 },
    { subject: 'English', student: 92, classAvg: 75, top: 94 },
    { subject: 'History', student: 65, classAvg: 70, top: 88 },
    { subject: 'Geography', student: 82, classAvg: 71, top: 90 },
  ];

  const trajectoryData = [
    { name: 'Term 1', score: 78 },
    { name: 'Term 2', score: 82 },
    { name: 'Term 3', score: 85 },
  ];

  const insights = [
    { type: 'positive', text: 'Top 5% in Mathematics (Class Rank #2)', icon: <Star size={14} /> },
    { type: 'trend', text: 'Improving in Science (+8% from T1)', icon: <TrendingUp size={14} /> },
    { type: 'warning', text: 'Performance in History is 5% below class average', icon: <AlertCircle size={14} /> },
  ];

  return (
    <div className={styles.container}>
      {/* Top Navigation & Profile Summary */}
      <div className={styles.header}>
        <div className={styles.profileInfo}>
          <img 
            src={student?.user?.profile?.photo || `https://i.pravatar.cc/150?u=${student?.id}`} 
            alt="Student" 
            className={styles.avatar} 
          />
          <div className={styles.meta}>
            <h2 className={styles.name}>{student?.user?.first_name} {student?.user?.last_name}</h2>
            <p className={styles.subtext}>ID: {student?.admission_number} • Class {student?.class_name}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
           <button className={styles.secondaryBtn} onClick={onBack}>Back to List</button>
           <button className={styles.primaryBtn}><Printer size={16} /> Print Full Report</button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left Column: Analytics */}
        <div className={styles.leftCol}>
          
          {/* Quick Stats Grid */}
          <div className={styles.statsGrid}>
             <div className={styles.statCard}>
                <span className={styles.statLabel}>Overall Rank</span>
                <div className={styles.statValue}>#12 <span className={styles.trendUp}><ArrowUpRight size={14}/> 2</span></div>
             </div>
             <div className={styles.statCard}>
                <span className={styles.statLabel}>Attendance</span>
                <div className={styles.statValue}>94%</div>
             </div>
             <div className={styles.statCard}>
                <span className={styles.statLabel}>Percentile</span>
                <div className={styles.statValue}>88.5%</div>
             </div>
          </div>

          {/* Subject Comparison Chart */}
          <div className={styles.chartSection}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}><BookOpen size={18} /> Subject Breakdown</h3>
                <div className={styles.legend}>
                    <span className={styles.legendItem}><i className={styles.dotStudent}></i> Student</span>
                    <span className={styles.legendItem}><i className={styles.dotAvg}></i> Class Avg</span>
                </div>
            </div>
            <div className={styles.barChartWrap}>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={subjectData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip 
                            cursor={{fill: 'rgba(0,0,0,0.02)'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                        />
                        <Bar dataKey="student" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={24} />
                        <Bar dataKey="classAvg" fill="var(--theme-border)" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Insights */}
          <div className={styles.insightsSection}>
            <h3 className={styles.sectionTitle}><TrendingUp size={18} /> Smart Insights</h3>
            <div className={styles.insightsList}>
                {insights.map((insight, idx) => (
                    <div key={idx} className={`${styles.insightItem} ${styles[insight.type]}`}>
                        <div className={styles.insightIcon}>{insight.icon}</div>
                        <span className={styles.insightText}>{insight.text}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Column: Report Card Preview & Trajectory */}
        <div className={styles.rightCol}>
            
            {/* Trajectory Area Chart */}
            <div className={styles.trajectoryCard}>
                <h3 className={styles.sectionTitle}>Trajectory</h3>
                <div className={styles.areaChartWrap}>
                    <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={trajectoryData}>
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip />
                            <Area 
                                type="monotone" 
                                dataKey="score" 
                                stroke="var(--color-primary)" 
                                fillOpacity={1} 
                                fill="url(#colorScore)" 
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Mini Report Card Preview */}
            <div className={styles.reportPreview}>
                <div className={styles.cardHeader}>
                    <div>
                        <h4 className={styles.cardTitle}>Report Card</h4>
                        <span className={styles.cardTerm}>Sess 2024-25 • Term 3</span>
                    </div>
                    <Download size={18} className={styles.cardIcon} />
                </div>
                
                <div className={styles.cardBody}>
                    <div className={styles.cardGrid}>
                        <div className={styles.cardItem}>
                            <span className={styles.cardLabel}>GPA</span>
                            <span className={styles.cardValue}>3.8</span>
                        </div>
                        <div className={styles.cardItem}>
                            <span className={styles.cardLabel}>Grade</span>
                            <span className={styles.cardGrade}>A+</span>
                        </div>
                        <div className={styles.cardItem}>
                            <span className={styles.cardLabel}>Credits</span>
                            <span className={styles.cardValue}>18/18</span>
                        </div>
                    </div>
                    
                    <div className={styles.cardSummary}>
                        <div className={styles.summaryRow}>
                            <span>Academic Standing</span>
                            <span className={styles.tagExcellent}>Excellent</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Teacher Remark</span>
                            <p className={styles.remarkText}>Consistent performer with strong analytical skills in Math.</p>
                        </div>
                    </div>
                </div>
                
                <button className={styles.viewFullBtn}>
                    Review & Sign <ChevronRight size={14} />
                </button>
            </div>

            {/* Teacher Actions */}
            <div className={styles.teacherActions}>
                <button className={styles.actionBtn}>
                    <Share2 size={16} /> Share with Parent
                </button>
                <button className={styles.actionBtn}>
                    <AlertCircle size={16} /> Mark for Intervention
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PerfomaceStdDetail;
