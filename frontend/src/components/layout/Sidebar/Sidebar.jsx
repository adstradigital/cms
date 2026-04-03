'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const menuItems = {
  admin: [
    { label: 'Dashboard', href: '/admins', icon: '📁' },
    { label: 'Teachers', href: '/admins/teachers', icon: '👨‍🏫' },
    { label: 'Students', href: '/admins/students', icon: '🎓' },
    { label: 'Classes', href: '/admins/classes', icon: '🏫' },
  
    { label: 'Course Sessions', href: '/admins/courses', icon: '📚' },
    { label: 'Admissions', href: '/admins/admissions', icon: '📝' },
    { label: 'Examinations', href: '/admins/exams', icon: '📑' },
  ],
  staff: [
    { label: 'Dashboard', href: '/staff', icon: '📊' },
    { label: 'Attendance', href: '/staff/attendance', icon: '📋' },
    { label: 'Exams', href: '/staff/exams', icon: '📝' },
    { label: 'Assignments', href: '/staff/assignments', icon: '📚' },
  ],
  student: [
    { label: 'Dashboard', href: '/student', icon: '📊' },
    { label: 'Timetable', href: '/student/timetable', icon: '🗓️' },
    { label: 'Results', href: '/student/results', icon: '📈' },
    { label: 'Fees', href: '/student/fees', icon: '💰' },
  ],
  parent: [
    { label: 'Dashboard', href: '/parent', icon: '📊' },
    { label: 'Child Progress', href: '/parent/child-progress', icon: '📈' },
    { label: 'Payments', href: '/parent/payments', icon: '💳' },
  ],
};

export default function Sidebar({ role = 'admin', collapsed = false, onToggle }) {
  const pathname = usePathname();
  const items = menuItems[role] || menuItems.admin;

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logo}>
        {!collapsed && <span className={styles.logoText}>CMS.</span>}
        <button className={styles.toggleBtn} onClick={onToggle}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className={styles.nav}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            {!collapsed && <span className={styles.label}>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <Link href="/admins/settings" className={styles.footerItem}>
          <span className={styles.icon}>⚙️</span>
          {!collapsed && <span className={styles.label}>Settings</span>}
        </Link>
        <Link href="/support" className={styles.footerItem}>
          <span className={styles.icon}>❓</span>
          {!collapsed && <span className={styles.label}>Support</span>}
        </Link>
        <Link href="/logout" className={styles.footerItem}>
          <span className={styles.icon}>↪️</span>
          {!collapsed && <span className={styles.label}>Log out</span>}
        </Link>
      </div>
    </aside>
  );
}
