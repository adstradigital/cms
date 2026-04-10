'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from '../AdminDashboard/AdminDashboard.module.css';

import AdminSidebar from '../AdminDashboard/AdminSidebar/AdminSidebar';
import AdminHeader from '../AdminDashboard/AdminHeader/AdminHeader';
import QuickActionFab from '../AdminDashboard/Widget/QuickActionFab';
import AnalogClockFab from '../AdminDashboard/Widget/AnalogClockFab';
import StickyNoteFab from '../AdminDashboard/Widget/StickyNoteFab';
import CalendarDateFab from '../AdminDashboard/Widget/CalendarDateFab';
import RightSidebar from '../AdminDashboard/RightSidebar/RightSidebar';

/* ─── Default widget configuration ──────────────────────────────── */
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

export default function AdminLayout({ children }) {
  // 1. Guard against Next.js DOM Hydration mismatches
  const [isMounted, setIsMounted] = useState(false);

  // 2. Widget management state
  const [activeWidgets, setActiveWidgets] = useState(DEFAULT_WIDGETS);
  const [widgetSizes, setWidgetSizes] = useState(DEFAULT_SIZES);

  // 3. Hydrate Safely Once on Mount
  useEffect(() => {
    try {
      const savedWidgets = localStorage.getItem('cms_active_widgets');
      const savedSizes = localStorage.getItem('cms_widget_sizes');
      if (savedWidgets) setActiveWidgets(JSON.parse(savedWidgets));
      if (savedSizes) setWidgetSizes(JSON.parse(savedSizes));
    } catch (error) {
      console.warn("Storage access failed, defaulting widget state.");
    }
    // Flag hydration complete to allow UI rendering
    setIsMounted(true);
  }, []);

  // 4. Reactive Persistence
  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('cms_active_widgets', JSON.stringify(activeWidgets));
  }, [activeWidgets, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('cms_widget_sizes', JSON.stringify(widgetSizes));
  }, [widgetSizes, isMounted]);

  // Event Handlers
  const handleToggleWidget = (id) => setActiveWidgets((p) => ({ ...p, [id]: !p[id] }));
  const handleResizeWidget = (id, size) => setWidgetSizes((p) => ({ ...p, [id]: size }));

  // Prevent harsh hydration jumping by returning an invisible container before mount
  if (!isMounted) {
    return (
      <div className={styles.dashboardContainer} style={{ opacity: 0 }}>
        {/* Completely invisible structurally identical frame to prevent CLS */}
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* ─── LEFT SIDEBAR ─── */}
      <AdminSidebar />

      {/* ─── MAIN CONTENT ─── */}
      <div className={styles.mainContentWrapper}>
        <AdminHeader />
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {children}
        </main>
      </div>

      {/* ─── FLOATING WIDGETS ─── */}
      {activeWidgets.quickAction && (
        <QuickActionFab scale={SIZE_SCALE[widgetSizes.quickAction]} onAction={(id) => console.log('Action:', id)} />
      )}
      {activeWidgets.analogClock && <AnalogClockFab scale={SIZE_SCALE[widgetSizes.analogClock]} />}
      {activeWidgets.calendarDate && <CalendarDateFab scale={SIZE_SCALE[widgetSizes.calendarDate]} />}
      {activeWidgets.stickyNote && <StickyNoteFab scale={SIZE_SCALE[widgetSizes.stickyNote]} />}

      {/* ─── RIGHT SIDEBAR ─── */}
      <RightSidebar
        activeWidgets={activeWidgets}
        onToggleWidget={handleToggleWidget}
        widgetSizes={widgetSizes}
        onResizeWidget={handleResizeWidget}
      />
    </div>
  );
}
