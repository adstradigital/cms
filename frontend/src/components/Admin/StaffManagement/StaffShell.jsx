'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, Users, UserRound, KeyRound, Clock, Trophy, ListTodo } from 'lucide-react';
import styles from './StaffShell.module.css';

const NAV = [
  { label: 'All Staff', path: '/admins/staff/all', icon: Users },
  { label: 'Teachers', path: '/admins/staff/teachers', icon: UserRound },
  { label: 'Roles & Permissions', path: '/admins/staff/roles', icon: Shield },
  { label: 'Attendance & HR', path: '/admins/staff/hr', icon: Clock },
  { label: 'Teacher Leaderboard', path: '/admins/staff/leaderboard', icon: Trophy },
  { label: 'Tasks & Events', path: '/admins/staff/tasks', icon: ListTodo },
];

export default function StaffShell({ title, subtitle, children }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.sideHeader}>
          <div className={styles.sideBadge}><KeyRound size={16} /></div>
          <div>
            <div className={styles.sideTitle}>Staff</div>
            <div className={styles.sideSub}>Management Console</div>
          </div>
        </div>
        <div className={styles.sideNav}>
          {NAV.map((item) => {
            const active = pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                onClick={() => router.push(item.path)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {subtitle && <p className={styles.pageSub}>{subtitle}</p>}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

