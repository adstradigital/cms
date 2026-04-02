import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import styles from './AdminDashboard.module.css';

// Importing sub-components
import AdminSidebar from './AdminSidebar/AdminSidebar';
import AdminHeader from './AdminHeader/AdminHeader';
import AdminDashboardContent from './AdminDashboardContent/AdminDashboardContent';
import QuickActionFab from './Widget/QuickActionFab';
import AnalogClockFab from './Widget/AnalogClockFab';
import StickyNoteFab from './Widget/StickyNoteFab';
import CalendarDateFab from './Widget/CalendarDateFab';
import RightSidebar from './RightSidebar/RightSidebar';

// Sub-Feature Modules
import Class from '../Class/Class';
import Subjects from '../Class/Subjects/Subjects';
import TimeTable from '../Class/TimeTable/TimeTable';
// Placeholder for Syllabus
const Syllabus = () => (
  <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
    <h2>Syllabus Management</h2>
    <p>Module coming soon...</p>
  </div>
);

/* ─── Default widget state ──────────────────────────────── */
const DEFAULT_WIDGETS = {
  quickAction: true,
  analogClock: false,
  calendarDate: false,
  stickyNote: false,
};

const DEFAULT_SIZES = {
  quickAction: 'md',
  analogClock: 'md',
  calendarDate: 'md',
  stickyNote: 'md',
};

const SIZE_SCALE = { sm: 0.75, md: 1, lg: 1.3 };

const AdminDashboard = () => {
  // State for nested sidebar navigation
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [activeItem, setActiveItem] = useState('Dashboard');

  // Widget management state — persisted in localStorage
  const [activeWidgets, setActiveWidgets] = useState(DEFAULT_WIDGETS);
  const [widgetSizes, setWidgetSizes] = useState(DEFAULT_SIZES);

  const pathname = usePathname();

  // Sync activeItem with pathname
  useEffect(() => {
    if (!pathname) return;
    
    if (pathname === '/admins') setActiveItem('Dashboard');
    else if (pathname === '/admins/classes/management') setActiveItem('Class');
    else if (pathname === '/admins/classes/subjects') setActiveItem('Subject');
    else if (pathname === '/admins/classes/syllabus') setActiveItem('Syllabus');
    else if (pathname === '/admins/classes/timetable') setActiveItem('Timetable Builder');
    else if (pathname === '/admins/students/directory') setActiveItem('Directory');
    else if (pathname === '/admins/students/attendance') setActiveItem('Attendance');
    else if (pathname === '/admins/students/performance') setActiveItem('Performance');
  }, [pathname]);

  // Hydrate from localStorage on mount

  // Persist on change
  useEffect(() => {
    localStorage.setItem('cms_active_widgets', JSON.stringify(activeWidgets));
  }, [activeWidgets]);

  useEffect(() => {
    localStorage.setItem('cms_widget_sizes', JSON.stringify(widgetSizes));
  }, [widgetSizes]);

  const handleToggleWidget = (id) => {
    setActiveWidgets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResizeWidget = (id, size) => {
    setWidgetSizes((prev) => ({ ...prev, [id]: size }));
  };

  return (
    <div className={styles.dashboardContainer}>
      
      {/* LEFT SIDEBAR */}
      <AdminSidebar 
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        expandedMenu={expandedMenu}
        setExpandedMenu={setExpandedMenu}
        // Patch navigate for local state switching if needed, 
        // but Sidebar uses router.push. Let's add a sync effect or local switch.
      />

      {/* MAIN CONTENT WRAPPER */}
      <div className={styles.mainContentWrapper}>
        <AdminHeader />
        <div className={styles.workspaceBody}>
          {activeItem === 'Dashboard' && <AdminDashboardContent />}
          {activeItem === 'Class' && <Class />}
          {activeItem === 'Subject' && <Subjects />}
          {activeItem === 'Syllabus' && <Syllabus />}
          {activeItem === 'Timetable Builder' && <TimeTable />}
          
          {/* Fallback for Students (can add Student directory here) */}
          {(['Directory', 'Attendance', 'Performance'].includes(activeItem)) && (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
              <h2>Student {activeItem}</h2>
              <p>Section integrated into main workspace.</p>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING WIDGET FABs — conditionally rendered */}
      {activeWidgets.quickAction && (
        <QuickActionFab
          scale={SIZE_SCALE[widgetSizes.quickAction]}
          onAction={(id) => console.log('Quick action:', id)}
        />
      )}
      {activeWidgets.analogClock && (
        <AnalogClockFab scale={SIZE_SCALE[widgetSizes.analogClock]} />
      )}
      {activeWidgets.calendarDate && (
        <CalendarDateFab scale={SIZE_SCALE[widgetSizes.calendarDate]} />
      )}
      {activeWidgets.stickyNote && (
        <StickyNoteFab scale={SIZE_SCALE[widgetSizes.stickyNote]} />
      )}

      {/* RIGHT SIDEBAR — Sections (Widgets, FAQ, News) */}
      <RightSidebar
        activeWidgets={activeWidgets}
        onToggleWidget={handleToggleWidget}
        widgetSizes={widgetSizes}
        onResizeWidget={handleResizeWidget}
      />
    </div>
  );
};

export default AdminDashboard;
