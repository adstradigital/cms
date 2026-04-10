'use client';

import React, { useEffect, useState } from 'react';
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
  Bed
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminSidebar.module.css';

const AdminSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Sync expanded state with path navigation
  useEffect(() => {
    if (pathname?.startsWith('/admins/students')) setExpandedMenu('Students');
    else if (pathname?.startsWith('/admins/classes')) setExpandedMenu('Classes');
    else if (pathname?.startsWith('/admins/staff')) setExpandedMenu('Staff');
    else if (pathname?.startsWith('/admins/hostel')) setExpandedMenu('Hostel');
  }, [pathname]);
  
  const isStudentsPath = pathname?.startsWith('/admins/students');
  const isClassesPath = pathname?.startsWith('/admins/classes');
  const isStaffPath = pathname?.startsWith('/admins/staff');
  const isHostelPath = pathname?.startsWith('/admins/hostel');
  
  const isStudentsExpanded = expandedMenu === 'Students';
  const isClassesExpanded = expandedMenu === 'Classes';
  const isStaffExpanded = expandedMenu === 'Staff';
  const isHostelExpanded = expandedMenu === 'Hostel';

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
          onClick={() => setIsCollapsed((prev) => !prev)}
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

        {/* Staff Section */}
        {isCollapsed ? (
          <NavItem 
            icon={<Users size={18} />} 
            label="Staff" 
            collapsed={isCollapsed}
            active={isStaffPath} 
            href="/admins/staff/all"
          />
        ) : (
          <div className={styles.expandableMenuContainer}>
            <div 
              onClick={() => setExpandedMenu(expandedMenu === 'Staff' ? null : 'Staff')}
              className={`${styles.expandableMenu} ${isStaffExpanded ? styles.expanded : styles.collapsed}`}
            >
              <div className={styles.expandableMenuContent}>
                <div className={`${styles.expandableMenuIcon} ${isStaffExpanded ? styles.expanded : styles.collapsed}`}>
                  <Users size={18} />
                </div>
                <span>Staff</span>
              </div>
              <ChevronDown size={14} className={`${styles.expandableChevron} ${isStaffExpanded ? styles.rotated : ''}`} />
            </div>

            <div className={`${styles.subItemsContainer} ${isStaffExpanded ? styles.expanded : styles.collapsed}`}>
              <SubNavItem label="All Staff" active={pathname === '/admins/staff/all'} href="/admins/staff/all" />
              <SubNavItem label="Teachers" active={pathname === '/admins/staff/teachers'} href="/admins/staff/teachers" />
              <SubNavItem label="Roles & Permissions" active={pathname === '/admins/staff/roles'} href="/admins/staff/roles" />
              <SubNavItem label="Attendance & HR" active={pathname === '/admins/staff/hr'} href="/admins/staff/hr" />
              <SubNavItem label="Teacher Leaderboard" active={pathname === '/admins/staff/leaderboard'} href="/admins/staff/leaderboard" />
              <SubNavItem label="Tasks & Events" active={pathname === '/admins/staff/tasks'} href="/admins/staff/tasks" />
            </div>
          </div>
        )}

        {isCollapsed ? (
          <NavItem
            icon={<GraduationCap size={18} />}
            label="Students"
            collapsed={isCollapsed}
            active={isStudentsPath}
            href="/admins/students/directory"
          />
        ) : (
          <div className={styles.expandableMenuContainer}>
            <div 
              onClick={() => setExpandedMenu(expandedMenu === 'Students' ? null : 'Students')}
              className={`${styles.expandableMenu} ${isStudentsExpanded ? styles.expanded : styles.collapsed}`}
            >
              <div className={styles.expandableMenuContent}>
                <div className={`${styles.expandableMenuIcon} ${isStudentsExpanded ? styles.expanded : styles.collapsed}`}>
                  <GraduationCap size={18} />
                </div>
                <span>Students</span>
              </div>
              <ChevronDown size={14} className={`${styles.expandableChevron} ${isStudentsExpanded ? styles.rotated : ''}`} />
            </div>

            <div className={`${styles.subItemsContainer} ${isStudentsExpanded ? styles.expanded : styles.collapsed}`}>
              <SubNavItem label="Directory" active={pathname === '/admins/students/directory'} href="/admins/students/directory" />
              <SubNavItem label="Attendance" active={pathname === '/admins/students/attendance'} href="/admins/students/attendance" />
              <SubNavItem label="Performance" active={pathname === '/admins/students/performance'} href="/admins/students/performance" />
            </div>
          </div>
        )}

        {isCollapsed ? (
          <NavItem 
            icon={<LayoutGrid size={18} />} 
            label="Classes" 
            collapsed={isCollapsed}
            active={isClassesPath} 
            href="/admins/classes/management"
          />
        ) : (
          <div className={styles.expandableMenuContainer}>
            <div 
              onClick={() => setExpandedMenu(expandedMenu === 'Classes' ? null : 'Classes')}
              className={`${styles.expandableMenu} ${isClassesExpanded ? styles.expanded : styles.collapsed}`}
            >
              <div className={styles.expandableMenuContent}>
                <div className={`${styles.expandableMenuIcon} ${isClassesExpanded ? styles.expanded : styles.collapsed}`}>
                  <LayoutGrid size={18} />
                </div>
                <span>Classes</span>
              </div>
              <ChevronDown size={14} className={`${styles.expandableChevron} ${isClassesExpanded ? styles.rotated : ''}`} />
            </div>

            <div className={`${styles.subItemsContainer} ${isClassesExpanded ? styles.expanded : styles.collapsed}`}>
              <SubNavItem label="Class" active={pathname === '/admins/classes/management'} href="/admins/classes/management" />
              <SubNavItem label="Subject" active={pathname === '/admins/classes/subjects'} href="/admins/classes/subjects" />
              <SubNavItem label="Elections" active={pathname === '/admins/classes/elections'} href="/admins/classes/elections" />
              <SubNavItem label="Timetable Builder" active={pathname === '/admins/classes/timetable'} href="/admins/classes/timetable" />
            </div>
          </div>
        )}

        {/* Hostel Section */}
        {isCollapsed ? (
          <NavItem 
            icon={<Bed size={18} />} 
            label="Hostel" 
            collapsed={isCollapsed}
            active={isHostelPath} 
            href="/admins/hostel/overview"
          />
        ) : (
          <div className={styles.expandableMenuContainer}>
            <div 
              onClick={() => setExpandedMenu(expandedMenu === 'Hostel' ? null : 'Hostel')}
              className={`${styles.expandableMenu} ${isHostelExpanded ? styles.expanded : styles.collapsed}`}
            >
              <div className={styles.expandableMenuContent}>
                <div className={`${styles.expandableMenuIcon} ${isHostelExpanded ? styles.expanded : styles.collapsed}`}>
                  <Bed size={18} />
                </div>
                <span>Hostel</span>
              </div>
              <ChevronDown size={14} className={`${styles.expandableChevron} ${isHostelExpanded ? styles.rotated : ''}`} />
            </div>

            <div className={`${styles.subItemsContainer} ${isHostelExpanded ? styles.expanded : styles.collapsed}`}>
              <SubNavItem label="Overview" active={pathname === '/admins/hostel/overview'} href="/admins/hostel/overview" />
              <SubNavItem label="Hostel List" active={pathname === '/admins/hostel/directory'} href="/admins/hostel/directory" />
              <SubNavItem label="Rooms" active={pathname === '/admins/hostel/rooms'} href="/admins/hostel/rooms" />
              <SubNavItem label="Allocations" active={pathname === '/admins/hostel/allocations'} href="/admins/hostel/allocations" />
              <SubNavItem label="Attendance" active={pathname === '/admins/hostel/attendance'} href="/admins/hostel/attendance" />
              <SubNavItem label="Visitors" active={pathname === '/admins/hostel/visitors'} href="/admins/hostel/visitors" />
              <SubNavItem label="Mess" active={pathname === '/admins/hostel/mess'} href="/admins/hostel/mess" />
              <SubNavItem label="Fees" active={pathname === '/admins/hostel/fees'} href="/admins/hostel/fees" />
              <SubNavItem label="Analytics" active={pathname === '/admins/hostel/analytics'} href="/admins/hostel/analytics" />
            </div>
          </div>
        )}
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
          label="Admissions" 
          collapsed={isCollapsed}
          active={pathname === '/admins/admissions'} 
          href="/admins/admissions"
          onClick={() => setExpandedMenu(null)}
        />
        <NavItem 
          icon={<FileText size={18} />} 
          label="Examinations" 
          collapsed={isCollapsed}
          active={pathname === '/admins/examinations'} 
          href="/admins/examinations"
          onClick={() => setExpandedMenu(null)}
        />
      </nav>

      {/* Bottom Navigation */}
      <div className={styles.bottomNav}>
        {!isCollapsed && <p className={styles.sectionLabel}>Workspace</p>}
        <NavItem 
          icon={<Settings size={18} />} 
          label="Settings" 
          collapsed={isCollapsed} 
          active={pathname === '/admins/settings'}
          href="/admins/settings"
        />
        <NavItem icon={<HelpCircle size={18} />} label="Support" collapsed={isCollapsed} />
        <NavItem icon={<LogOut size={18} />} label="Log out" collapsed={isCollapsed} onClick={logout} />
      </div>
    </div>
  );
};

// Sub-component for Sidebar Links to keep code clean
const NavItem = ({ icon, label, collapsed = false, active = false, onClick, href }) => {
  const content = (
    <>
      {/* Top Concave Cutout */}
      {!collapsed && active && (
        <div className={styles.cutoutTop}>
          <div className={styles.cutoutTopInner}></div>
        </div>
      )}
      
      {/* Bottom Concave Cutout */}
      {!collapsed && active && (
        <div className={styles.cutoutBottom}>
          <div className={styles.cutoutBottomInner}></div>
        </div>
      )}
      
      <div style={{ opacity: active ? 1 : 0.8 }}>{icon}</div>
      {!collapsed && <span>{label}</span>}
    </>
  );

  const className = active 
    ? `${styles.navItemActive} ${collapsed ? styles.navItemActiveCollapsed : ''}`
    : `${styles.navItem} ${collapsed ? styles.navItemCollapsed : ''}`;

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick} title={collapsed ? label : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={className} title={collapsed ? label : undefined}>
      {content}
    </div>
  );
};

// Sub-component specifically for Nested Sidebar Links
const SubNavItem = ({ label, active = false, onClick, href }) => {
  const content = (
    <>
      {active && (
        <>
          <div className={styles.cutoutTop}>
            <div className={styles.cutoutTopInner}></div>
          </div>
          <div className={styles.cutoutBottom}>
            <div className={styles.cutoutBottomInner}></div>
          </div>
        </>
      )}
      
      <div className={active ? styles.bulletActive : styles.bulletInactive}></div>
      <span>{label}</span>
    </>
  );

  const className = active ? styles.subNavItemActive : styles.subNavItem;

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={className}>
      {content}
    </div>
  );
};

export default AdminSidebar;
