'use client';

import React, { useState, useEffect } from 'react';
import styles from '../AdminDashboard/AdminDashboard.module.css';

// Importing sub-components
import AdminSidebar from '../AdminDashboard/AdminSidebar/AdminSidebar';
import AdminHeader from '../AdminDashboard/AdminHeader/AdminHeader';
import QuickActionFab from '../AdminDashboard/Widget/QuickActionFab';
import AnalogClockFab from '../AdminDashboard/Widget/AnalogClockFab';
import StickyNoteFab from '../AdminDashboard/Widget/StickyNoteFab';
import CalendarDateFab from '../AdminDashboard/Widget/CalendarDateFab';
import RightSidebar from '../AdminDashboard/RightSidebar/RightSidebar';

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

const AdminLayout = ({ children }) => {
  // Widget management state — persisted in localStorage
  const [activeWidgets, setActiveWidgets] = useState(DEFAULT_WIDGETS);
  const [widgetSizes, setWidgetSizes] = useState(DEFAULT_SIZES);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const savedWidgets = localStorage.getItem('cms_active_widgets');
      const savedSizes = localStorage.getItem('cms_widget_sizes');
      if (savedWidgets) setActiveWidgets(JSON.parse(savedWidgets));
      if (savedSizes) setWidgetSizes(JSON.parse(savedSizes));
    } catch {}
  }, []);

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
      
      {/* LEFT SIDEBAR (now handles its own routing state internally) */}
      <AdminSidebar />

      {/* MAIN CONTENT WRAPPER */}
      <div className={styles.mainContentWrapper}>
        <AdminHeader />
        <div className={styles.workspaceBody}>
          {children}
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

export default AdminLayout;
