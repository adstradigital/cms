'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Atom,
  Home, 
  Users, 
  GraduationCap, 
  LayoutGrid, 
  Calendar, 
  BookOpen, 
  FileText, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Bed,
  Utensils,
  Library
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminSidebar.module.css';

const STORAGE_KEY = 'cms_admin_sidebar_collapsed';

// ─── Flyout Portal ────────────────────────────────────────────────────────────
function FlyoutPortal({ label, items, top, left, pathname, onClose, onMouseEnter, onMouseLeave }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const estimatedHeight = items.length * 40 + 50;
  const clampedTop = Math.min(top, window.innerHeight - estimatedHeight - 20);

  return createPortal(
    <div 
      className={styles.flyoutPortal} 
      style={{ top: `${clampedTop}px`, left: `${left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.flyoutHeader}>{label}</div>
      <div className={styles.flyoutList}>
        {items.map((sub, idx) => (
          <Link 
            key={idx} 
            href={sub.href}
            className={`${styles.flyoutItem} ${pathname === sub.href ? styles.flyoutItemActive : ''}`}
            onClick={onClose}
          >
            <div className={pathname === sub.href ? styles.bulletActive : styles.bulletInactive} />
            <span>{sub.label}</span>
          </Link>
        ))}
      </div>
    </div>,
    document.body
  );
}

const AdminSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [activeFlyout, setActiveFlyout] = useState(null);
  const hideTimer = useRef(null);

  const handleToggle = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  useEffect(() => {
    if (pathname?.startsWith('/admins/students')) setExpandedMenu('Students');
    else if (pathname?.startsWith('/admins/classes')) setExpandedMenu('Classes');
    else if (pathname?.startsWith('/admins/staff')) setExpandedMenu('Staff');
    else if (pathname?.startsWith('/admins/hostel')) setExpandedMenu('Hostel');
    else if (pathname?.startsWith('/admins/examinations')) setExpandedMenu('Examinations');
    else if (pathname?.startsWith('/admins/library')) setExpandedMenu('Library');
  }, [pathname]);
  
  const isStudentsPath = pathname?.startsWith('/admins/students');
  const isClassesPath = pathname?.startsWith('/admins/classes');
  const isStaffPath = pathname?.startsWith('/admins/staff');
  const isHostelPath = pathname?.startsWith('/admins/hostel');
  const isExaminationsPath = pathname?.startsWith('/admins/examinations');
  const isLibraryPath = pathname?.startsWith('/admins/library');

  // ── Flyout hover logic ──────────────────────────────────────────────────────
  const cancelHide = useCallback(() => {
    clearTimeout(hideTimer.current);
  }, []);

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setActiveFlyout(null), 120);
  }, []);

  const showFlyout = useCallback((e, label, items) => {
    if (!isCollapsed || !items?.length) return;
    cancelHide();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveFlyout({
      label,
      items,
      top: rect.top,
      left: rect.right + 8,
    });
  }, [isCollapsed, cancelHide]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const sections = {
    staff: [
      { label: "All Staff", href: "/admins/staff/all" },
      { label: "Teachers", href: "/admins/staff/teachers" },
      { label: "Roles & Permissions", href: "/admins/staff/roles" },
      { label: "Attendance & HR", href: "/admins/staff/hr" },
      { label: "Teacher Leaderboard", href: "/admins/staff/leaderboard" },
      { label: "Tasks & Events", href: "/admins/staff/tasks" },
    ],
    students: [
      { label: "Directory", href: "/admins/students/directory" },
      { label: "Attendance", href: "/admins/students/attendance" },
      { label: "Performance", href: "/admins/students/performance" },
    ],
    classes: [
      { label: "Class", href: "/admins/classes/management" },
      { label: "Subject", href: "/admins/classes/subjects" },
      { label: "Elections", href: "/admins/classes/elections" },
      { label: "Timetable Builder", href: "/admins/classes/timetable" },
    ],
    hostel: [
      { label: "Overview", href: "/admins/hostel/overview" },
      { label: "Hostel List", href: "/admins/hostel/directory" },
      { label: "Rooms", href: "/admins/hostel/rooms" },
      { label: "Allocations", href: "/admins/hostel/allocations" },
      { label: "Attendance", href: "/admins/hostel/attendance" },
      { label: "Visitors", href: "/admins/hostel/visitors" },
      { label: "Mess", href: "/admins/hostel/mess" },
      { label: "Fees", href: "/admins/hostel/fees" },
      { label: "Analytics", href: "/admins/hostel/analytics" },
    ],
    library: [
      { label: "Overview", href: "/admins/library/overview" },
      { label: "Book Management", href: "/admins/library/management" },
      { label: "Shelf Management", href: "/admins/library/shelves" },
      { label: "Issue System", href: "/admins/library/issue" },
      { label: "Fine Management", href: "/admins/library/fines" },
      { label: "Reports", href: "/admins/library/reports" },
    ],
    examinations: [
      { label: "Exam Types", href: "/admins/examinations/types" },
      { label: "Schedule", href: "/admins/examinations/schedule" },
      { label: "Timetable", href: "/admins/examinations/timetable" },
      { label: "Question Paper", href: "/admins/examinations/question-paper" },
      { label: "Marks Entry", href: "/admins/examinations/marks" },
      { label: "Result", href: "/admins/examinations/results" },
      { label: "Report Card", href: "/admins/examinations/report-card" },
      { label: "Online Test", href: "/admins/examinations/online-test" },
      { label: "Analytics", href: "/admins/examinations/analytics" },
    ]
  };

  // Helper to render a collapsible section — avoids repeating the pattern 6x
  const ExpandableSection = ({ label, icon, sectionKey, items, isActivePath, collapsedHref }) => {
    if (isCollapsed) {
      return (
        <NavItem
          icon={icon}
          label={label}
          collapsed={isCollapsed}
          active={isActivePath}
          href={collapsedHref}
          onMouseEnter={(e) => showFlyout(e, label, items)}
          onMouseLeave={scheduleHide}
        />
      );
    }

    return (
      <div className={styles.expandableMenuContainer}>
        <div
          onClick={() => setExpandedMenu(expandedMenu === sectionKey ? null : sectionKey)}
          className={`${styles.expandableMenu} ${expandedMenu === sectionKey ? styles.expanded : styles.collapsed}`}
        >
          <div className={styles.expandableMenuContent}>
            <div className={`${styles.expandableMenuIcon} ${expandedMenu === sectionKey ? styles.expanded : styles.collapsed}`}>
              {icon}
            </div>
            <span>{label}</span>
          </div>
          <ChevronDown
            size={14}
            className={`${styles.expandableChevron} ${expandedMenu === sectionKey ? styles.rotated : ''}`}
          />
        </div>
        <div className={`${styles.subItemsContainer} ${expandedMenu === sectionKey ? styles.expanded : styles.collapsed}`}>
          {items.map((sub, idx) => (
            <SubNavItem key={idx} label={sub.label} active={pathname === sub.href} href={sub.href} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Logo */}
      <div className={`${styles.logoContainer} ${isCollapsed ? styles.logoContainerCollapsed : ''}`}>
        <div className={styles.logoIcon}>
          <Atom size={16} strokeWidth={2.25} className={styles.logoReactIcon} />
        </div>
        {!isCollapsed && (
          <div className={styles.logoCopy}>
            <span className={styles.logoText}>CMS</span>
            <span className={styles.logoTag}>Admin Console</span>
          </div>
        )}
        <button
          type="button"
          className={styles.collapseButton}
          onClick={handleToggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {!isCollapsed && <p className={styles.sectionLabel}>Main</p>}

        <NavItem 
          icon={<Home size={18} />} 
          label="Dashboard" 
          collapsed={isCollapsed}
          active={pathname === '/admins'} 
          href="/admins"
          onClick={() => setExpandedMenu(null)}
        />

        <ExpandableSection
          label="Staff"
          icon={<Users size={18} />}
          sectionKey="Staff"
          items={sections.staff}
          isActivePath={isStaffPath}
          collapsedHref="/admins/staff/all"
        />

        <ExpandableSection
          label="Students"
          icon={<GraduationCap size={18} />}
          sectionKey="Students"
          items={sections.students}
          isActivePath={isStudentsPath}
          collapsedHref="/admins/students/directory"
        />

        <ExpandableSection
          label="Classes"
          icon={<LayoutGrid size={18} />}
          sectionKey="Classes"
          items={sections.classes}
          isActivePath={isClassesPath}
          collapsedHref="/admins/classes/management"
        />

        <NavItem 
          icon={<Utensils size={18} />} 
          label="Canteen" 
          collapsed={isCollapsed}
          active={pathname?.startsWith('/admins/canteen')} 
          href="/admins/canteen/overview"
          onClick={() => setExpandedMenu(null)}
        />

        <ExpandableSection
          label="Hostel"
          icon={<Bed size={18} />}
          sectionKey="Hostel"
          items={sections.hostel}
          isActivePath={isHostelPath}
          collapsedHref="/admins/hostel/overview"
        />

        <ExpandableSection
          label="Library"
          icon={<Library size={18} />}
          sectionKey="Library"
          items={sections.library}
          isActivePath={isLibraryPath}
          collapsedHref="/admins/library/overview"
        />

        <NavItem 
          icon={<Calendar size={18} />} 
          label="Course Sessions" 
          collapsed={isCollapsed}
          active={pathname === '/admins/sessions'} 
          href="/admins/sessions"
          onClick={() => setExpandedMenu(null)}
        />
        <NavItem 
          icon={<BookOpen size={18} />} 
          label="Lead Generation" 
          collapsed={isCollapsed}
          active={pathname === '/admins/leads'} 
          href="/admins/leads"
          onClick={() => setExpandedMenu(null)}
        />

        <ExpandableSection
          label="Examinations"
          icon={<FileText size={18} />}
          sectionKey="Examinations"
          items={sections.examinations}
          isActivePath={isExaminationsPath}
          collapsedHref="/admins/examinations/types"
        />
      </nav>

      {/* Flyout Portal — rendered into body, outside sidebar overflow */}
      {activeFlyout && (
        <FlyoutPortal
          label={activeFlyout.label}
          items={activeFlyout.items}
          top={activeFlyout.top}
          left={activeFlyout.left}
          pathname={pathname}
          onClose={() => setActiveFlyout(null)}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}

      {/* Bottom Navigation */}
      <div className={styles.bottomNav}>
        {!isCollapsed && <p className={styles.sectionLabel}>Workspace</p>}
        <NavItem icon={<Settings size={18} />} label="Settings" collapsed={isCollapsed} active={pathname === '/admins/settings'} href="/admins/settings" />
        <NavItem icon={<HelpCircle size={18} />} label="Support" collapsed={isCollapsed} active={pathname === '/admins/support'} href="/admins/support" />
        <NavItem icon={<LogOut size={18} />} label="Log out" collapsed={isCollapsed} onClick={logout} />
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, collapsed = false, active = false, onClick, href, onMouseEnter, onMouseLeave }) => {
  const content = (
    <>
      {!collapsed && active && <div className={styles.cutoutTop}><div className={styles.cutoutTopInner} /></div>}
      {!collapsed && active && <div className={styles.cutoutBottom}><div className={styles.cutoutBottomInner} /></div>}
      <div style={{ opacity: active ? 1 : 0.8 }}>{icon}</div>
      {!collapsed && <span>{label}</span>}
    </>
  );

  const className = active
    ? `${styles.navItemActive} ${collapsed ? styles.navItemActiveCollapsed : ''}`
    : `${styles.navItem} ${collapsed ? styles.navItemCollapsed : ''}`;

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} title={collapsed ? label : undefined}>
        {content}
      </Link>
    );
  }
  return (
    <div onClick={onClick} className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} title={collapsed ? label : undefined}>
      {content}
    </div>
  );
};

const SubNavItem = ({ label, active = false, onClick, href }) => {
  const content = (
    <>
      {active && (<><div className={styles.cutoutTop}><div className={styles.cutoutTopInner} /></div><div className={styles.cutoutBottom}><div className={styles.cutoutBottomInner} /></div></>)}
      <div className={active ? styles.bulletActive : styles.bulletInactive} />
      <span>{label}</span>
    </>
  );

  const className = active ? styles.subNavItemActive : styles.subNavItem;
  if (href) return <Link href={href} className={className} onClick={onClick}>{content}</Link>;
  return <div onClick={onClick} className={className}>{content}</div>;
};

export default AdminSidebar;
