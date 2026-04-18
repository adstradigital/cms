import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import InteractiveBackground from '@/components/common/InteractiveBackground';
import styles from './DashboardLayout.module.css';
import useAuth from '@/hooks/useAuth';

/**
 * Main dashboard dashboard-layout wrapper.
 * Wraps pages with Sidebar + Navbar + content area.
 */
export default function DashboardLayout({ children, role = 'admin', pageTitle = 'Dashboard' }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const currentUser = {
    name: user?.full_name || user?.username || 'User',
    role: user?.role_name || role
  };

  return (
    <div className={styles.layout}>
      <InteractiveBackground />
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
          transition: 'margin-left var(--transition-base)',
        }}
      >
        <Navbar title={pageTitle} user={currentUser} onLogout={logout} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
