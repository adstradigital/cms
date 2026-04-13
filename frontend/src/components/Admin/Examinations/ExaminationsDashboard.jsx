'use client';

import React, { useState } from 'react';
import { LayoutDashboard, CalendarDays, ClipboardEdit, FileSpreadsheet, FileBadge } from 'lucide-react';
import styles from './ExaminationsDashboard.module.css';

import OverviewTab from './Tabs/OverviewTab';
import ExamManagementTab from './Tabs/ExamManagementTab';
import SchedulerTab from './Tabs/SchedulerTab';
import GradingSheetTab from './Tabs/GradingSheetTab';
import ReportCardsTab from './Tabs/ReportCardsTab';

const ExaminationsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'exams':
        return <ExamManagementTab />;
      case 'scheduler':
        return <SchedulerTab />;
      case 'grading':
        return <GradingSheetTab />;
      case 'reports':
        return <ReportCardsTab />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Examinations Command Center</h1>
        <p className={styles.subtitle}>
          Manage exam schedules, grading sheets, and report card publishing from one central interface.
        </p>
      </header>

      <nav className={styles.navTabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={18} /> Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'exams' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          <CalendarDays size={18} /> Master Exams
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'scheduler' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('scheduler')}
        >
          <ClipboardEdit size={18} /> Scheduler
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'grading' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('grading')}
        >
          <FileSpreadsheet size={18} /> Bulk Grading
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'reports' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileBadge size={18} /> Report Cards
        </button>
      </nav>

      <main className={styles.tabContent}>
        {renderTabContent()}
      </main>
    </div>
  );
};

export default ExaminationsDashboard;
