'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Gamepad2,
  Navigation
} from 'lucide-react';
import styles from './Sidebar.module.css';
import useAuth from '@/hooks/useAuth';

const STORAGE_KEY = 'cms_sidebar_collapsed';

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
        { label: 'Bus Tracking', href: '/staff/transport-tracking', icon: Navigation },
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
        { 
          label: 'Results', 
          href: '/student/results', 
          icon: BarChart3,
          subItems: [
            { label: 'Academic Performance', href: '/student/results?view=academic' },
            { label: 'Online Quiz History', href: '/student/results?view=online' }
          ]
        },
        { label: 'Online Test', href: '/student/tests', icon: BrainCircuit },
        { label: 'Brain Games', href: '/student/brain-games', icon: Gamepad2 },
        { label: 'Fees', href: '/student/fees', icon: CreditCard },
      ]
    }
  ],
  parent: [
    {
      title: 'PARENT PORTAL',
      items: [
        { label: 'Dashboard', href: '/parent', icon: LayoutDashboard },
        { label: 'Child Progress View', href: '/parent?tab=academics', icon: BarChart3 },
        { label: 'Attendance Alerts', href: '/parent?tab=attendance', icon: ClipboardCheck },
        { label: 'Timetable & Holidays', href: '/parent?tab=timetable', icon: CalendarDays },
        { label: 'Homework View', href: '/parent?tab=homework', icon: Edit3 },
        { label: 'Fee Payments', href: '/parent?tab=fees', icon: CreditCard },
        { label: 'Teacher Communication', href: '/parent?tab=communication', icon: Users },
        { label: 'Transport Tracking', href: '/parent?tab=transport', icon: School },
        { label: 'Behavior & Conduct', href: '/parent?tab=conduct', icon: FileText },
      ]
    }
  ],
};

// ─── Flyout Portal ────────────────────────────────────────────────────────────
// Renders outside sidebar DOM entirely so overflow:clip can't touch it
function FlyoutPortal({ label, items, top, left, isPathActive, onClose }) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);

  useEffect(() => setMounted(true), []);

  // Clamp so flyout never goes below viewport
  const clampedTop = typeof window !== 'undefined'
    ? Math.min(top, window.innerHeight - (items.length * 44 + 60))
    : top;

  if (!mounted) return null;

  return createPortal(
    <div
      ref={ref}
      className={styles.flyoutPortal}
      style={{ top: clampedTop, left }}
    >
      <div className={styles.flyoutHeader}>{label}</div>
      {items.map((sub) => (
        <Link
          key={sub.label}
          href={sub.href}
          onClick={onClose}
          className={`${styles.flyoutItem} ${isPathActive(sub.href) ? styles.flyoutItemActive : ''}`}
        >
          <span className={styles.flyoutDot} />
          <span>{sub.label}</span>
        </Link>
      ))}
    </div>,
    document.body
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar({ role = 'admin', collapsed, onToggle }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const sections = menuSections[role] || menuSections.admin;

  // ── Persist collapse state ──────────────────────────────────────────────────
  // If parent passes collapsed prop, use it; otherwise manage internally with localStorage
  const isControlled = collapsed !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = isControlled ? collapsed : internalCollapsed;

  const handleToggle = useCallback(() => {
    if (isControlled) {
      onToggle?.();
    } else {
      setInternalCollapsed(prev => {
        const next = !prev;
        try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
        return next;
      });
    }
  }, [isControlled, onToggle]);

  // Sync to localStorage whenever parent-controlled collapsed changes
  useEffect(() => {
    if (!isControlled) return;
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch {}
  }, [isControlled, collapsed]);

  // ── Expanded sub-menus (expanded state) ─────────────────────────────────────
  const [expandedItems, setExpandedItems] = useState({});
  const toggleExpand = (label) => {
    setExpandedItems(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // ── Flyout state ─────────────────────────────────────────────────────────────
  const [activeFlyout, setActiveFlyout] = useState(null);
  const hideTimer = useRef(null);

  const showFlyout = useCallback((e, item) => {
    if (!isCollapsed || !item.subItems?.length) return;
    clearTimeout(hideTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    // left = collapsed sidebar width (read from CSS var or fall back to 64)
    const sidebarEl = e.currentTarget.closest('aside');
    const sidebarWidth = sidebarEl ? sidebarEl.getBoundingClientRect().width : 64;
    setActiveFlyout({
      label: item.label,
      items: item.subItems,
      top: rect.top,
      left: sidebarWidth + 8,
    });
  }, [isCollapsed]);

  const schedulehide = useCallback(() => {
    hideTimer.current = setTimeout(() => setActiveFlyout(null), 120);
  }, []);

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const isPathActive = (href) => {
    if (!href) return false;
    const [base, query] = href.split('?');
    if (pathname !== base) return false;
    
    const currentQuery = searchParams.toString();
    
    // Case 1: Href has no query (e.g. /parent)
    // It should only be active if the current URL also has no relevant query params
    if (!query) {
      return !searchParams.get('tab') && !searchParams.get('view');
    }
    
    // Case 2: Href has query (e.g. /parent?tab=attendance)
    const hrefParams = new URLSearchParams(query);
    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };

  const getSettingsHref = () => role === 'parent' ? '/parent?tab=settings' : (role === 'admin' ? '/admins/settings' : `/${role}/settings`);
  const getSupportHref  = () => role === 'parent' ? '/parent?tab=support'  : (role === 'admin' ? '/admins/support'  : `/${role}/support`);

  return (
    <>
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandLogo}><Zap size={20} /></div>
          {!isCollapsed && (
            <div className={styles.brandText}>
              <span className={styles.brandName}>CMS</span>
              <span className={styles.brandRole}>{role}</span>
            </div>
          )}
        </div>

        {/* Toggle */}
        <button className={styles.toggleBtn} onClick={handleToggle}>
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Navigation */}
        <nav className={styles.nav}>
          {sections.map((section, sIdx) => (
            <div key={sIdx} className={styles.sectionGroup}>
              {!isCollapsed && <div className={styles.sectionLabel}>{section.title}</div>}
              <div className={styles.menuList}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const hasSubItems = item.subItems?.length > 0;
                  const isExpanded = expandedItems[item.label] || pathname.startsWith(item.href);
                  const isActive = isPathActive(item.href);

                  return (
                    <div
                      key={item.label}
                      className={styles.menuItemContainer}
                      onMouseEnter={(e) => showFlyout(e, item)}
                      onMouseLeave={schedulehide}
                    >
                      {hasSubItems ? (
                        <>
                          <div
                            className={`${styles.menuItem} ${isActive ? styles.menuActive : ''}`}
                            onClick={() => !isCollapsed && toggleExpand(item.label)}
                          >
                            <div className={styles.menuLeft}>
                              {isActive && <div className={styles.activeBar} />}
                              <span className={styles.menuIcon}><Icon size={18} /></span>
                              {!isCollapsed && <span className={styles.menuLabel}>{item.label}</span>}
                            </div>
                            {!isCollapsed && (
                              <ChevronDown
                                size={14}
                                className={`${styles.expandIcon} ${isExpanded ? styles.expandOpen : ''}`}
                              />
                            )}
                          </div>

                          {/* Inline dropdown — expanded state only */}
                          {!isCollapsed && isExpanded && (
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
                            {!isCollapsed && <span className={styles.menuLabel}>{item.label}</span>}
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
              {!isCollapsed && <span className={styles.menuLabel}>Settings</span>}
            </div>
          </Link>
          <Link href={getSupportHref()} className={styles.menuItem}>
            <div className={styles.menuLeft}>
              <span className={styles.menuIcon}><HelpCircle size={18} /></span>
              {!isCollapsed && <span className={styles.menuLabel}>Support</span>}
            </div>
          </Link>
          <button onClick={logout} className={`${styles.menuItem} ${styles.logoutItem}`}>
            <div className={styles.menuLeft}>
              <span className={styles.menuIcon}><LogOut size={18} /></span>
              {!isCollapsed && <span className={styles.menuLabel}>Log out</span>}
            </div>
          </button>
        </div>
      </aside>

      {/* Flyout — rendered outside sidebar via portal */}
      {activeFlyout && (
        <FlyoutPortal
          label={activeFlyout.label}
          items={activeFlyout.items}
          top={activeFlyout.top}
          left={activeFlyout.left}
          isPathActive={isPathActive}
          onClose={() => setActiveFlyout(null)}
        />
      )}

      {/* Invisible backdrop to catch mouse leaving both sidebar and flyout */}
      {activeFlyout && (
        <div
          className={styles.flyoutBackdrop}
          onMouseEnter={schedulehide}
        />
      )}
    </>
  );
}
