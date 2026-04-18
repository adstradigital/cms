'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './StudentAssignments.module.css';
import useFetch from '@/hooks/useFetch';
import api from '@/api/instance';
import { 
  BookOpen, 
  Clock, 
  FileText, 
  Download, 
  CheckCircle,
  ExternalLink,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Info,
  Layout,
  TrendingUp,
  Award,
  Calendar,
  Trophy,
  Star,
  Zap,
  FolderOpen
} from 'lucide-react';
import SubmissionModal from './SubmissionModal';
import FeedbackModal from './FeedbackModal';
import SubjectResourcesModal from './SubjectResourcesModal';

export default function StudentAssignments() {
  return (
    <Suspense fallback={<div>Loading workspace...</div>}>
      <StudentAssignmentsContent />
    </Suspense>
  );
}

function StudentAssignmentsContent() {
  const [activeTab, setActiveTab] = useState('pending');
  const [viewMode, setViewMode] = useState('tracker'); // 'tracker', 'portal', 'materials', 'grades'
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Get student profile 
  const { data: dashboardData, loading: profileLoading } = useFetch('/students/students/dashboard-data/');
  const sectionId = dashboardData?.profile?.section_id;
  const studentId = dashboardData?.profile?.id;

  // 2. Fetch Homework and Assignments
  const { data: homework, loading: hwLoading, refetch: refetchHw } = useFetch(
    sectionId ? `/academics/homework/?section=${sectionId}` : null
  );
  const { data: assignments, loading: assignLoading, refetch: refetchAssign } = useFetch(
    sectionId ? `/academics/assignments/?section=${sectionId}` : null
  );

  // 3. Status Tracking & Modal State
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalType, setModalType] = useState(null); 
  const [submissions, setSubmissions] = useState({});

  useEffect(() => {
    if (homework || assignments) {
      const combined = [
        ...(homework || []).map(h => ({ ...h, type: 'Homework', isAssignment: false })),
        ...(assignments || []).map(a => ({ ...a, type: a.is_project ? 'Project' : 'Assignment', isAssignment: true }))
      ];
      setTasks(combined);
    }
  }, [homework, assignments]);

  // Fetch submissions
  useEffect(() => {
    if (tasks.length > 0 && studentId) {
      const fetchAllSubmissions = async () => {
        const statuses = {};
        for (const task of tasks) {
          try {
            const res = await api.get(`/academics/homework/${task.id}/submissions/`);
            const mySub = res.data.find(s => s.student === studentId);
            if (mySub) statuses[task.id] = mySub;
          } catch (e) { console.error(`Error fetching submission for task ${task.id}`, e); }
        }
        setSubmissions(statuses);
      };
      fetchAllSubmissions();
    }
  }, [tasks, studentId]);

  // Handle Deep Linking
  useEffect(() => {
    const tab = searchParams.get('tab');
    const modal = searchParams.get('modal');
    const view = searchParams.get('view');
    if (tab) setActiveTab(tab);
    if (view) setViewMode(view);
    if (modal && tasks.length > 0) {
      if (modal === 'submission') setActiveTab('pending');
    }
  }, [searchParams, tasks]);

  // --- STATISTICS CALCULATIONS ---
  const stats = useMemo(() => {
    const total = tasks.length;
    const now = new Date();
    const subList = Object.values(submissions);
    const completed = subList.filter(s => s.status === 'submitted').length;
    const drafts = subList.filter(s => s.status === 'draft').length;
    const overdueCount = tasks.filter(t => new Date(t.due_date) < now && (!submissions[t.id] || submissions[t.id].status === 'draft')).length;
    
    // Grade mapping for average
    const gradeWeight = { 'A+': 100, 'A': 95, 'A-': 90, 'B+': 85, 'B': 80, 'B-': 75, 'C+': 70, 'C': 65, 'D': 50, 'F': 0 };
    const gradedSubmissions = subList.filter(s => s.grade);
    const totalPoints = gradedSubmissions.reduce((acc, s) => acc + (gradeWeight[s.grade] || 0), 0);
    const avgScore = gradedSubmissions.length > 0 ? Math.round(totalPoints / gradedSubmissions.length) : 0;

    return {
      total,
      completed,
      pending: total - completed,
      overdue: overdueCount,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      drafts,
      avgScore,
      reviewed: gradedSubmissions.length
    };
  }, [tasks, submissions]);

  const subjectProgress = useMemo(() => {
    const groups = {};
    tasks.forEach(t => {
      const sId = t.subject?.id;
      if (!sId) return;
      if (!groups[sId]) groups[sId] = { id: sId, name: t.subject.name, color: t.subject.color_code, total: 0, done: 0, rawSubject: t.subject };
      groups[sId].total++;
      if (submissions[t.id]?.status === 'submitted') groups[sId].done++;
    });
    return Object.values(groups).sort((a,b) => (b.done/b.total) - (a.done/a.total));
  }, [tasks, submissions]);

  const subjects = useMemo(() => {
    const subs = Array.from(new Set(tasks.map(t => t.subject?.id)))
      .map(id => tasks.find(t => t.subject?.id === id).subject);
    return subs;
  }, [tasks]);

  const getStatus = (task) => {
    const sub = submissions[task.id];
    if (sub) {
      if (sub.grade) return { label: 'Graded', class: 'graded', icon: <CheckCircle size={12} /> };
      if (sub.status === 'draft') return { label: 'Draft', class: 'draft', icon: <SaveIcon size={12} /> };
      if (sub.is_late) return { label: 'Submitted Late', class: 'overdue', icon: <Clock size={12} /> };
      return { label: 'Submitted', class: 'submitted', icon: <CheckCircle size={12} /> };
    }
    const isPast = new Date(task.due_date) < new Date();
    if (isPast) return { label: 'Not Submitted', class: 'overdue', icon: <AlertCircle size={12} /> };
    return { label: 'Pending', class: 'pending', icon: <Clock size={12} /> };
  };

  const filteredTasks = useMemo(() => {
    let list = tasks.filter(task => {
      const sub = submissions[task.id];
      const isPast = new Date(task.due_date) < new Date();
      
      if (viewMode === 'grades') return sub && sub.grade;
      if (viewMode === 'portal') return !sub || sub.status === 'draft';
      if (activeTab === 'completed') return (sub && sub.status === 'submitted') || isPast;
      return !sub || sub.status === 'draft';
    });

    if (selectedSubject !== 'all') list = list.filter(t => t.subject?.id === parseInt(selectedSubject));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }

    if (viewMode === 'grades') {
       return list.sort((a,b) => new Date(submissions[b.id].submitted_at) - new Date(submissions[a.id].submitted_at));
    }

    return list.sort((a, b) => {
      const now = new Date();
      const aDue = new Date(a.due_date);
      const bDue = new Date(b.due_date);
      const aOverdue = aDue < now && !submissions[a.id];
      const bOverdue = bDue < now && !submissions[b.id];
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return aDue - bDue;
    });
  }, [tasks, activeTab, submissions, selectedSubject, searchQuery, viewMode]);

  const timelineTasks = useMemo(() => {
    const now = new Date();
    const today = new Date(now.setHours(0,0,0,0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const groups = { overdue: [], today: [], thisWeek: [], upcoming: [] };

    tasks.forEach(task => {
      const sub = submissions[task.id];
      if (sub && sub.status === 'submitted') return; 
      const due = new Date(task.due_date);
      if (due < today) groups.overdue.push(task);
      else if (due < tomorrow) groups.today.push(task);
      else if (due < nextWeek) groups.thisWeek.push(task);
      else groups.upcoming.push(task);
    });
    return groups;
  }, [tasks, submissions]);

  if (profileLoading || (tasks.length === 0 && (hwLoading || assignLoading))) {
    return (
      <div className={styles.loader}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p>Syncing your agenda...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            {viewMode === 'tracker' ? 'Performance Tracker' : 
             viewMode === 'portal' ? 'Submission Portal' : 
             viewMode === 'grades' ? 'Academic Hub' : 
             viewMode === 'materials' ? 'Learning Materials' : 'My Agenda'}
          </h1>
          <p className={styles.subtitle}>
            {viewMode === 'tracker' ? 'Comprehensive overview of your academic progress' : 
             viewMode === 'portal' ? 'Upload and manage your submissions and drafts' : 
             viewMode === 'grades' ? 'Evaluation history and teacher feedback' :
             viewMode === 'materials' ? 'Access reference links and handouts for your subjects' :
             'Track your homework, assignments, and projects'}
          </p>
        </div>

        {(viewMode === 'tracker' || viewMode === 'grades') ? (
           <div className={styles.quickStat}>
              <div className={styles.statDot} />
              <span>{stats.reviewed} Evaluated Items</span>
           </div>
        ) : (
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`} onClick={() => setActiveTab('pending')}>Active Tasks</button>
            <button className={`${styles.tab} ${activeTab === 'completed' ? styles.tabActive : ''}`} onClick={() => setActiveTab('completed')}>Completed & Past</button>
          </div>
        )}
      </header>

      {/* TRACKER STATS RIBBON */}
      {viewMode === 'tracker' && (
        <section className={styles.achievementRibbon}>
          <div className={styles.achievementMain}>
            {/* Completion Rate Gauge */}
            <div className={styles.gaugeCol}>
              <div className={styles.circularGauge}>
                <svg viewBox="0 0 100 100">
                  <circle className={styles.gaugeBg} cx="50" cy="50" r="45" />
                  <circle
                    className={styles.gaugeFill}
                    cx="50" cy="50" r="45"
                    style={{ strokeDashoffset: 283 - (283 * stats.rate) / 100 }}
                  />
                </svg>
                <div className={styles.gaugeContent}>
                  <span className={styles.gaugeValue}>{stats.rate}%</span>
                  <span className={styles.gaugeLabel}>COMPLETED</span>
                </div>
              </div>
            </div>

            <div className={styles.verticalDivider} />

            {/* Completed */}
            <div className={styles.metricCol}>
              <div className={styles.metricIconBox} style={{ backgroundColor: '#052e16' }}>
                <CheckCircle size={20} color="#4ade80" />
              </div>
              <div className={styles.metricText}>
                <span className={styles.metricValue}>{stats.completed}</span>
                <span className={styles.metricLabel}>Completed</span>
              </div>
            </div>

            {/* Drafts */}
            <div className={styles.metricCol}>
              <div className={styles.metricIconBox} style={{ backgroundColor: '#422006' }}>
                <FileText size={20} color="#fbbf24" />
              </div>
              <div className={styles.metricText}>
                <span className={styles.metricValue}>{stats.drafts}</span>
                <span className={styles.metricLabel}>Drafts Saved</span>
              </div>
            </div>

            {/* Overdue */}
            <div className={styles.metricCol}>
              <div className={styles.metricIconBox} style={{ backgroundColor: '#450a0a' }}>
                <AlertCircle size={20} color="#f87171" />
              </div>
              <div className={styles.metricText}>
                <span className={styles.metricValue}>{stats.overdue}</span>
                <span className={styles.metricLabel}>Overdue</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GRADES HUB RIBBON */}
      {viewMode === 'grades' && (
        <section className={styles.achievementRibbon}>
           <div className={styles.achievementMain}>
             {/* Column 1: Avg Score Gauge */}
             <div className={styles.gaugeCol}>
                <div className={styles.circularGauge}>
                  <svg viewBox="0 0 100 100">
                    <circle className={styles.gaugeBg} cx="50" cy="50" r="45" />
                    <circle 
                      className={styles.gaugeFill} 
                      cx="50" cy="50" r="45" 
                      style={{ strokeDashoffset: 283 - (283 * stats.avgScore) / 100 }}
                    />
                  </svg>
                  <div className={styles.gaugeContent}>
                    <span className={styles.gaugeValue}>{stats.avgScore}%</span>
                    <span className={styles.gaugeLabel}>AVG. SCORE</span>
                  </div>
                </div>
             </div>

             <div className={styles.verticalDivider} />

             {/* Column 2: Top Subject */}
             <div className={styles.metricCol}>
                <div className={styles.metricIconBox} style={{ backgroundColor: '#1e293b' }}>
                  <Trophy size={20} color="#facc15" />
                </div>
                <div className={styles.metricText}>
                  <span className={styles.metricValue}>{subjectProgress[0]?.name || 'N/A'}</span>
                  <span className={styles.metricLabel}>Top Performing Subject</span>
                </div>
             </div>

             {/* Column 3: Total Evaluations */}
             <div className={styles.metricCol}>
                <div className={styles.metricIconBox} style={{ backgroundColor: '#1e1b4b' }}>
                  <Star size={20} color="#818cf8" />
                </div>
                <div className={styles.metricText}>
                  <span className={styles.metricValue}>{stats.reviewed} Items</span>
                  <span className={styles.metricLabel}>Total Evaluations</span>
                </div>
             </div>

             {/* Column 4: Late Submissions */}
             <div className={styles.metricCol}>
                <div className={styles.metricIconBox} style={{ backgroundColor: '#450a0a' }}>
                  <Zap size={20} color="#f87171" />
                </div>
                <div className={styles.metricText}>
                  <span className={styles.metricValue}>{Object.values(submissions).filter(s => s.is_late).length}</span>
                  <span className={styles.metricLabel}>Late Submissions</span>
                </div>
             </div>
           </div>
        </section>
      )}

      {/* Filter Bar */}
      <div className={`${styles.filterBar} ${viewMode === 'grades' ? styles.gradesFilter : ''}`}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder={viewMode === 'grades' ? "Search evaluations..." : "Search assignments..."} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
        
        {viewMode === 'grades' && <div className={styles.contentDivider} />}

        <div className={styles.filterGroup}>
          <div className={styles.selectWrapper}>
            <Filter size={16} />
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* MATERIALS HUB */}
      {viewMode === 'materials' && (
        <section className={styles.materialsHub}>
           <div className={styles.materialGrid}>
              {subjectProgress.map(s => (
                <div key={s.id} className={styles.materialCard} onClick={() => { setSelectedTask({ subject: s.rawSubject }); setModalType('resources'); }}>
                   <div className={styles.materialIcon} style={{ color: s.color, background: `${s.color}15` }}>
                      <FolderOpen size={32} />
                   </div>
                   <div className={styles.materialInfo}>
                      <h3>{s.name}</h3>
                      <p>View handouts and links</p>
                   </div>
                   <ArrowRight size={20} className={styles.cardArrow} />
                </div>
              ))}
           </div>
        </section>
      )}



      {filteredTasks.length > 0 && viewMode !== 'materials' ? (
        <div className={viewMode === 'grades' ? styles.gradeList : styles.tasksGrid}>
          {filteredTasks.map((task) => <TaskCard key={task.id} task={task} viewMode={viewMode} />)}
        </div>
      ) : viewMode !== 'materials' && (
        <div className={styles.emptyState}>
          <CheckCircle size={48} color="#10b981" />
          <h3>All caught up!</h3>
          <p>No matches found for this view.</p>
        </div>
      )}

      {/* Modals */}
      {modalType === 'submission' && (
        <SubmissionModal task={selectedTask} studentId={studentId} existingSubmission={submissions[selectedTask.id]} onClose={() => setModalType(null)} onSuccess={() => { refetchHw(); refetchAssign(); }} />
      )}
      {modalType === 'feedback' && (
        <FeedbackModal task={selectedTask} submission={submissions[selectedTask.id]} onClose={() => setModalType(null)} />
      )}
      {modalType === 'resources' && (
        <SubjectResourcesModal subject={selectedTask.subject} sectionId={sectionId} onClose={() => setModalType(null)} />
      )}
    </div>
  );

  function TaskCard({ task, viewMode }) {
    const status = getStatus(task);
    const sub = submissions[task.id];
    
    if (viewMode === 'grades') {
      return (
        <div className={styles.gradeItem} onClick={() => { setSelectedTask(task); setModalType('feedback'); }}>
          <div className={styles.gradeSubject} style={{ background: task.subject?.color_code }}>
            {task.subject?.name?.charAt(0)}
          </div>
          <div className={styles.gradeMainInfo}>
            <span className={styles.gradeTitle}>{task.title}</span>
            <div className={styles.gradeMeta}>
              <span>{task.subject?.name}</span>
              <span className={styles.dot}>•</span>
              <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
            </div>
            {sub.remarks && <p className={styles.remarksSnippet}>"{sub.remarks}"</p>}
          </div>
          <div className={styles.gradeValueBox}>
             <span className={styles.gradeLetter}>{sub.grade}</span>
             <button className={styles.viewResultBtn}>Detail <ArrowRight size={12} /></button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.taskCard}>
        <div className={styles.cardHeader}>
          <div className={styles.badges}>
            <span className={styles.subjectBadge} onClick={() => { setSelectedTask(task); setModalType('resources'); }} style={{ background: `${task.subject?.color_code}15`, color: task.subject?.color_code || '#4f46e5', cursor: 'pointer' }}>
              {task.subject?.name || 'Subject'} <ArrowRight size={10} style={{ marginLeft: '4px' }} />
            </span>
            <span className={styles.typeBadge}>{task.type}</span>
          </div>
          <div className={`${styles.statusBadge} ${styles[status.class]}`}>{status.label}</div>
        </div>
        <div className={styles.cardBody}>
          <h3 className={styles.title}>{task.title}</h3>
          <p className={styles.description}>{task.description}</p>
          {sub?.grade && (
            <div className={styles.compactGrade} onClick={() => { setSelectedTask(task); setModalType('feedback'); }}>
              <Award size={14} color="#fbbf24" />
              <span>Result: <strong>{sub.grade}</strong> — View Detail Feedback</span>
            </div>
          )}
          {sub?.is_late && <div className={styles.lateAlert}><AlertCircle size={12} /><span>Turned in after the deadline.</span></div>}
          <div className={styles.metaInfo}>
            <div className={`${styles.metaItem} ${status.label.includes('Overdue') ? styles.urgent : ''}`}><Clock size={14} /><span>{new Date(task.due_date).toLocaleDateString()}</span></div>
            <div className={styles.metaItem}><BookOpen size={14} /><span>{task.teacher?.full_name || 'Instructor'}</span></div>
          </div>
        </div>
        <div className={styles.cardFooter}>
          <button className={styles.resourceLink} onClick={() => { setSelectedTask(task); setModalType('resources'); }}><Info size={14} /> Resources</button>
          <button className={`${styles.submitBtn} ${(!sub || sub.status === 'draft') ? styles.submitBtnPrimary : ''}`} onClick={() => { 
            if (!sub || sub.status === 'draft') { setSelectedTask(task); setModalType('submission'); } 
            else if (sub.grade) { setSelectedTask(task); setModalType('feedback'); }
            else { alert('Already submitted.'); }
          }}>
            {sub?.status === 'draft' ? <>Edit Draft <ArrowRight size={14} /></> : sub?.status === 'submitted' ? (sub.grade ? <>Results <ExternalLink size={14} /></> : <>Submitted <CheckCircle size={14} /></>) : <>Turn In <FileText size={14} /></>}
          </button>
        </div>
      </div>
    );
  }
}

function SaveIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  );
}
