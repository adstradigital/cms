'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  UserPlus, 
  FileSpreadsheet, 
  ClipboardCheck, 
  FileText, 
  Edit3, 
  CalendarDays, 
  Library, 
  BarChart3, 
  CreditCard, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  BrainCircuit,
  Gamepad2
} from 'lucide-react';
import styles from './Sidebar.module.css';
import useAuth from '@/hooks/useAuth';

const menuSections = {
  admin: [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', href: '/admins', icon: LayoutDashboard },
        { label: 'Teachers', href: '/admins/teachers', icon: Users },
        { label: 'Students', href: '/admins/students', icon: GraduationCap },
        { label: 'Classes', href: '/admins/classes', icon: School },
        { label: 'Course Sessions', href: '/admins/courses', icon: BookOpen },
        { label: 'Lead Generation', href: '/admins/leads', icon: UserPlus },
        { label: 'Examinations', href: '/admins/exams', icon: FileSpreadsheet },
      ]
    }
  ],
  staff: [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', href: '/staff', icon: LayoutDashboard },
        { label: 'Attendance', href: '/staff/attendance', icon: ClipboardCheck },
        { label: 'Exams', href: '/staff/exams', icon: FileText },
        { label: 'Assignments', href: '/staff/assignments', icon: Edit3 },
      ]
    }
  ],
  student: [
    {
      title: 'NAVIGATION',
      items: [
        { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
        { label: 'My Profile', href: '/student/profile', icon: Users },
        { label: 'Timetable', href: '/student/timetable', icon: CalendarDays },
        { 
          label: 'Attendance', 
          href: '/student/attendance', 
          icon: ClipboardCheck,
          subItems: [
            { label: 'Attendance Insights', href: '/student/attendance?view=insights' },
            { label: 'Leave Portal', href: '/student/attendance?view=leaves' },
            { label: 'Academic Calendar', href: '/student/attendance?view=calendar' }
          ]
        },
        { 
          label: 'Library', 
          href: '/student/library', 
          icon: Library,
          subItems: [
            { label: 'Resources Catalog', href: '/student/library?view=catalog' },
            { label: 'My Holdings', href: '/student/library?view=holdings' },
            { label: 'Reservations & Help', href: '/student/library?view=help' }
          ]
        },
        { 
          label: 'Assignments', 
          href: '/student/assignments', 
          icon: Edit3,
          subItems: [
            { label: 'Submission Portal', href: '/student/assignments?view=portal' },
            { label: 'Grades & Feedback', href: '/student/assignments?view=grades' },
            { label: 'Assignment Tracker', href: '/student/assignments?view=tracker' },
            { label: 'Learning Materials', href: '/student/assignments?view=materials' }
          ]
        },
        { label: 'Results', href: '/student/results', icon: BarChart3 },
        { label: 'Quiz Center', href: '/student/quizzes', icon: BrainCircuit },
        { label: 'Brain Games', href: '/student/brain-games', icon: Gamepad2 },
        { label: 'Fees', href: '/student/fees', icon: CreditCard },
      ]
    }
  ],
  parent: [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', href: '/parent', icon: LayoutDashboard },
        { label: 'Child Progress', href: '/parent/child-progress', icon: BarChart3 },
        { label: 'Payments', href: '/parent/payments', icon: CreditCard },
      ]
    }
  ],
};

export default function Sidebar({ role = 'admin', collapsed = false, onToggle }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const sections = menuSections[role] || menuSections.admin;
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (label) => {
    setExpandedItems(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const getSettingsHref = () => {
    if (role === 'admin') return '/admins/settings';
    return `/${role}/settings`;
  };

  const getSupportHref = () => {
    if (role === 'admin') return '/admins/support';
    return `/${role}/support`;
  };

  // Improved matcher for active state
  const isPathActive = (href) => {
    if (!href) return false;
    const [base, query] = href.split('?');
    const pathMatches = pathname === base;
    
    if (query) {
      const queryParams = new URLSearchParams(query);
      const view = queryParams.get('view');
      return pathMatches && searchParams.get('view') === view;
    }
    
    return pathMatches;
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandLogo}>
          <Zap size={20} />
        </div>
        {!collapsed && (
          <div className={styles.brandText}>
            <span className={styles.brandName}>CMS</span>
            <span className={styles.brandRole}>{role}</span>
          </div>
        )}
      </div>

      {/* Toggle */}
      <button className={styles.toggleBtn} onClick={onToggle}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Navigation */}
      <nav className={styles.nav}>
        {sections.map((section, sIdx) => (
          <div key={sIdx} className={styles.sectionGroup}>
            {!collapsed && <div className={styles.sectionLabel}>{section.title}</div>}
            <div className={styles.menuList}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedItems[item.label] || pathname.startsWith(item.href);
                const isActive = pathname === item.href;

                return (
                  <div key={item.label}>
                    {hasSubItems ? (
                      <>
                        <div 
                          className={`${styles.menuItem} ${isActive ? styles.menuActive : ''}`}
                          onClick={() => !collapsed && toggleExpand(item.label)}
                        >
                          <div className={styles.menuLeft}>
                            {isActive && <div className={styles.activeBar} />}
                            <span className={styles.menuIcon}><Icon size={18} /></span>
                            {!collapsed && <span className={styles.menuLabel}>{item.label}</span>}
                          </div>
                          {!collapsed && (
                            <ChevronDown 
                              size={14} 
                              className={`${styles.expandIcon} ${isExpanded ? styles.expandOpen : ''}`} 
                            />
                          )}
                        </div>
                        
                        {!collapsed && isExpanded && (
                          <div className={styles.subMenu}>
                            {item.subItems.map((sub) => (
                              <Link 
                                key={sub.label} 
                                href={sub.href}
                                className={`${styles.subMenuItem} ${isPathActive(sub.href) ? styles.subMenuActive : ''}`}
                              >
                                <div className={styles.subDot} />
                                <span>{sub.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className={`${styles.menuItem} ${isActive ? styles.menuActive : ''}`}
                      >
                        <div className={styles.menuLeft}>
                          {isActive && <div className={styles.activeBar} />}
                          <span className={styles.menuIcon}><Icon size={18} /></span>
                          {!collapsed && <span className={styles.menuLabel}>{item.label}</span>}
                        </div>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerDivider} />
        <Link href={getSettingsHref()} className={styles.menuItem}>
          <div className={styles.menuLeft}>
            <span className={styles.menuIcon}><Settings size={18} /></span>
            {!collapsed && <span className={styles.menuLabel}>Settings</span>}
          </div>
        </Link>
        <Link href={getSupportHref()} className={styles.menuItem}>
          <div className={styles.menuLeft}>
            <span className={styles.menuIcon}><HelpCircle size={18} /></span>
            {!collapsed && <span className={styles.menuLabel}>Support</span>}
          </div>
        </Link>
        <button onClick={logout} className={`${styles.menuItem} ${styles.logoutItem}`}>
          <div className={styles.menuLeft}>
            <span className={styles.menuIcon}><LogOut size={18} /></span>
            {!collapsed && <span className={styles.menuLabel}>Log out</span>}
          </div>
        </button>
      </div>
    </aside>
  );
}
