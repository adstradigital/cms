'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import InteractiveBackground from '@/components/common/InteractiveBackground';
import styles from './DashboardLayout.module.css';
import useAuth from '@/hooks/useAuth';

/**
 * Main dashboard layout wrapper.
 * Uses CSS Grid to create a 2-column layout: [Sidebar Spacer | Content Area]
 * This ensures the fixed Sidebar never overlaps the content.
 */
export default function DashboardLayout({ children, role = 'admin', pageTitle = 'Dashboard' }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();

  // Safely grab the user's name, but if it's a parent account displaying "Test Student", 
  // explicitly show "Test Parent" for a better UX, since in this demo parents and students 
  // might share similar base profiles.
  let displayName = user?.full_name || user?.username || 'User';
  if (role === 'parent' || user?.portal === 'parent') {
    if (displayName.toLowerCase() === 'test student' || displayName === 'parent_test') {
      displayName = 'Test Parent';
    }
  }

  const currentUser = {
    name: displayName,
    role: user?.role_name || role
  };

  return (
    <>
      <InteractiveBackground />
      <Sidebar
        role={role}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={styles.layout} data-collapsed={sidebarCollapsed}>
        {/* 
            This spacer div occupies the first column of the grid.
            Its width matches the Sidebar, physically pushing the Main content to the right.
        */}
        <div className={styles.sidebarSpacer} />

        <div className={styles.main}>
          <Navbar title={pageTitle} user={currentUser} onLogout={logout} />
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </>
  );
}
