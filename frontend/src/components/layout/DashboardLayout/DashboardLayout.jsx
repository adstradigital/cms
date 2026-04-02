import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import styles from './DashboardLayout.module.css';

/**
 * Main dashboard layout wrapper.
 * Wraps pages with Sidebar + Navbar + content area.
 */
export default function DashboardLayout({ children, role = 'admin', pageTitle = 'Dashboard' }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // TODO: pull from AuthContext
  const user = { name: 'Admin User', role };

  const handleLogout = () => {
    // TODO: call auth logout
    window.location.href = '/login';
  };

  return (
    <div className={styles.layout}>
      <Sidebar
        role={role}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={styles.main}
        style={{
          marginLeft: sidebarCollapsed
            ? 'var(--sidebar-collapsed-width)'
            : 'var(--sidebar-width)',
        }}
      >
        <Navbar title={pageTitle} user={user} onLogout={handleLogout} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
