"use client";
import React, { useState } from 'react';
import { 
  Settings2, CalendarDays, Clock, FileText, Edit3, 
  Award, FileBadge, MonitorPlay, LineChart, Plus,
  LayoutDashboard, ServerCog, ClipboardCheck, GraduationCap, LayoutPanelLeft
} from 'lucide-react';
import styles from './ExaminationsDashboard.module.css';

// Import sub-modules
import ExamTypesTab from './ExamTypes/ExamTypesTab';
import ScheduleExamsTab from './ScheduleExams/ScheduleExamsTab';
import ExamTimetableTab from './ExamTimetable/ExamTimetableTab';
import QuestionPaperTab from './QuestionPaper/QuestionPaperTab';
import MarksEntryTab from './MarksEntry/MarksEntryTab';
import ResultTab from './Result/ResultTab';
import ReportCardTab from './ReportCard/ReportCardTab';
import OnlineTestTab from './OnlineTest/OnlineTestTab';
import AnalyticsTab from './Analytics/AnalyticsTab';

const CATEGORIES = [
  { id: 'setup', label: 'Setup & Config', icon: ServerCog, tabs: [
    { id: 'types', label: 'Exam Types', icon: Settings2 }
  ]},
  { id: 'operations', label: 'Exam Operations', icon: LayoutDashboard, tabs: [
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'timetable', label: 'Timetable', icon: Clock },
    { id: 'question-paper', label: 'Question Paper', icon: FileText }
  ]},
  { id: 'evaluation', label: 'Evaluation & Results', icon: ClipboardCheck, tabs: [
    { id: 'marks', label: 'Marks Entry', icon: Edit3, isNew: true },
    { id: 'results', label: 'Result', icon: Award },
    { id: 'report-card', label: 'Report Card', icon: FileBadge, isNew: true }
  ]},
  { id: 'digital', label: 'Digital Assessment', icon: MonitorPlay, tabs: [
    { id: 'online-test', label: 'Online Test', icon: MonitorPlay, isNew: true }
  ]},
  { id: 'insights', label: 'Insights & Analytics', icon: LineChart, tabs: [
    { id: 'analytics', label: 'Analytics', icon: LineChart, isNew: true }
  ]}
];

export default function ExaminationsDashboard() {
  const [activeCategory, setActiveCategory] = useState('operations');
  const [activeTab, setActiveTab] = useState('schedule');

  const handleCategorySelect = (catId) => {
    setActiveCategory(catId);
    const cat = CATEGORIES.find(c => c.id === catId);
    if (cat && cat.tabs.length > 0) {
      setActiveTab(cat.tabs[0].id);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'types': return <ExamTypesTab />;
      case 'schedule': return <ScheduleExamsTab />;
      case 'timetable': return <ExamTimetableTab />;
      case 'question-paper': return <QuestionPaperTab />;
      case 'marks': return <MarksEntryTab />;
      case 'results': return <ResultTab />;
      case 'report-card': return <ReportCardTab />;
      case 'online-test': return <OnlineTestTab />;
      case 'analytics': return <AnalyticsTab />;
      default: return <ScheduleExamsTab />;
    }
  };

  const currentCategoryData = CATEGORIES.find(c => c.id === activeCategory);
  const CatIcon = currentCategoryData?.icon || LayoutPanelLeft;

  return (
    <div className={styles.container}>
      {/* Sidebar Navigation */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Examinations</h2>
          <div className={styles.sidebarSub}>Comprehensive Assessment System</div>
        </div>
        <div className={styles.sidebarNav}>
          <div className={styles.navCategory}>Modules</div>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                className={`${styles.navItem} ${activeCategory === cat.id ? styles.navItemActive : ''}`}
                onClick={() => handleCategorySelect(cat.id)}
              >
                <Icon size={18} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainArea}>
        <div className={styles.topBar}>
          <div className={styles.catTitle}>
            <CatIcon size={20} color="var(--color-primary)" />
            {currentCategoryData?.label}
          </div>
          <button style={{padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'}}>
            <Plus size={16} /> New {currentCategoryData?.tabs?.[0]?.label || 'Asset'}
          </button>
        </div>

        {/* Dynamic Nested Tabs */}
        <div style={{padding: '24px 24px 0 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div className={styles.tabContainerScroll}>
            {currentCategoryData?.tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  {tab.label}
                  {tab.isNew && (
                    <span style={{
                      fontSize: '9px', backgroundColor: '#3B82F6', color: '#fff', 
                      padding: '2px 6px', borderRadius: '999px', fontWeight: 'bold'
                    }}>NEW</span>
                  )}
                </button>
              );
            })}
          </div>

          <div 
            className={styles.contentArea} 
            style={{
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              overflowY: activeTab === 'Question Paper' ? 'hidden' : 'auto'
            }}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
