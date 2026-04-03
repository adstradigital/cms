'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  PanelLeftOpen
} from 'lucide-react';
import styles from './AdminSidebar.module.css';

const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(
    pathname?.startsWith('/admins/students') ? 'Students' : 
    pathname?.startsWith('/admins/classes') ? 'Classes' : 
    pathname?.startsWith('/admins/staff') ? 'Staff' : null
  );
  const [lastPath, setLastPath] = useState(pathname);

  // Sync expanded state with path navigation
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (pathname?.startsWith('/admins/students')) setExpandedMenu('Students');
    else if (pathname?.startsWith('/admins/classes')) setExpandedMenu('Classes');
    else if (pathname?.startsWith('/admins/staff')) setExpandedMenu('Staff');
  }
  
  const isStudentsPath = pathname?.startsWith('/admins/students');
  const isClassesPath = pathname?.startsWith('/admins/classes');
  const isStaffPath = pathname?.startsWith('/admins/staff');
  
  const isStudentsExpanded = expandedMenu === 'Students';
  const isClassesExpanded = expandedMenu === 'Classes';
  const isStaffExpanded = expandedMenu === 'Staff';

  const navigate = (path) => {
    router.push(path);
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
          onClick={() => { navigate('/admins'); setExpandedMenu(null); }} 
        />

        {/* Staff Section */}
        {isCollapsed ? (
          <NavItem 
            icon={<Users size={18} />} 
            label="Staff" 
            collapsed={isCollapsed}
            active={isStaffPath} 
            onClick={() => navigate('/admins/staff/all')} 
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
              <SubNavItem label="All Staff" active={pathname === '/admins/staff/all'} onClick={() => navigate('/admins/staff/all')} />
              <SubNavItem label="Teachers" active={pathname === '/admins/staff/teachers'} onClick={() => navigate('/admins/staff/teachers')} />
              <SubNavItem label="Roles & Permissions" active={pathname === '/admins/staff/roles'} onClick={() => navigate('/admins/staff/roles')} />
              <SubNavItem label="Attendance & HR" active={pathname === '/admins/staff/hr'} onClick={() => navigate('/admins/staff/hr')} />
              <SubNavItem label="Teacher Leaderboard" active={pathname === '/admins/staff/leaderboard'} onClick={() => navigate('/admins/staff/leaderboard')} />
              <SubNavItem label="Tasks & Events" active={pathname === '/admins/staff/tasks'} onClick={() => navigate('/admins/staff/tasks')} />
            </div>
          </div>
        )}

        {isCollapsed ? (
          <NavItem
            icon={<GraduationCap size={18} />}
            label="Students"
            collapsed={isCollapsed}
            active={isStudentsPath}
            onClick={() => navigate('/admins/students/directory')}
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
              <SubNavItem label="Directory" active={pathname === '/admins/students/directory'} onClick={() => navigate('/admins/students/directory')} />
              <SubNavItem label="Attendance" active={pathname === '/admins/students/attendance'} onClick={() => navigate('/admins/students/attendance')} />
              <SubNavItem label="Performance" active={pathname === '/admins/students/performance'} onClick={() => navigate('/admins/students/performance')} />
            </div>
          </div>
        )}

        {isCollapsed ? (
          <NavItem 
            icon={<LayoutGrid size={18} />} 
            label="Classes" 
            collapsed={isCollapsed}
            active={isClassesPath} 
            onClick={() => navigate('/admins/classes/management')} 
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
              <SubNavItem label="Class" active={pathname === '/admins/classes/management'} onClick={() => navigate('/admins/classes/management')} />
              <SubNavItem label="Subject" active={pathname === '/admins/classes/subjects'} onClick={() => navigate('/admins/classes/subjects')} />
              <SubNavItem label="Elections" active={pathname === '/admins/classes/elections'} onClick={() => navigate('/admins/classes/elections')} />
              <SubNavItem label="Timetable Builder" active={pathname === '/admins/classes/timetable'} onClick={() => navigate('/admins/classes/timetable')} />
            </div>
          </div>
        )}
        <NavItem 
          icon={<Calendar size={18} />} 
          label="Course Sessions" 
          collapsed={isCollapsed}
          active={pathname === '/admins/sessions'} 
          onClick={() => { navigate('/admins/sessions'); setExpandedMenu(null); }} 
        />
        <NavItem 
          icon={<BookOpen size={18} />} 
          label="Admissions" 
          collapsed={isCollapsed}
          active={pathname === '/admins/admissions'} 
          onClick={() => { navigate('/admins/admissions'); setExpandedMenu(null); }} 
        />
        <NavItem 
          icon={<FileText size={18} />} 
          label="Examinations" 
          collapsed={isCollapsed}
          active={pathname === '/admins/examinations'} 
          onClick={() => { navigate('/admins/examinations'); setExpandedMenu(null); }} 
        />
      </nav>

      {/* Bottom Navigation */}
      <div className={styles.bottomNav}>
        {!isCollapsed && <p className={styles.sectionLabel}>Workspace</p>}
        <NavItem icon={<Settings size={18} />} label="Settings" collapsed={isCollapsed} />
        <NavItem icon={<HelpCircle size={18} />} label="Support" collapsed={isCollapsed} />
        <NavItem icon={<LogOut size={18} />} label="Log out" collapsed={isCollapsed} onClick={logout} />
      </div>
    </div>
  );
};

// Sub-component for Sidebar Links to keep code clean
const NavItem = ({ icon, label, collapsed = false, active = false, onClick }) => {
  if (active) {
    return (
      <div
        onClick={onClick}
        className={`${styles.navItemActive} ${collapsed ? styles.navItemActiveCollapsed : ''}`}
        title={collapsed ? label : undefined}
      >
        {/* Top Concave Cutout */}
        {!collapsed && (
          <div className={styles.cutoutTop}>
            <div className={styles.cutoutTopInner}></div>
          </div>
        )}
        
        {/* Bottom Concave Cutout */}
        {!collapsed && (
          <div className={styles.cutoutBottom}>
            <div className={styles.cutoutBottomInner}></div>
          </div>
        )}
        
        {icon}
        {!collapsed && <span>{label}</span>}
      </div>
    );
  }
  
  return (
    <div onClick={onClick} className={`${styles.navItem} ${collapsed ? styles.navItemCollapsed : ''}`} title={collapsed ? label : undefined}>
      <div style={{ opacity: 0.8 }}>{icon}</div>
      {!collapsed && <span>{label}</span>}
    </div>
  );
};

// Sub-component specifically for Nested Sidebar Links
const SubNavItem = ({ label, active = false, onClick }) => {
  if (active) {
    return (
      <div onClick={onClick} className={styles.subNavItemActive}>
        {/* Top Concave Cutout */}
        <div className={styles.cutoutTop}>
          <div className={styles.cutoutTopInner}></div>
        </div>
        
        {/* Bottom Concave Cutout */}
        <div className={styles.cutoutBottom}>
          <div className={styles.cutoutBottomInner}></div>
        </div>
        
        {/* Bullet point indicator */}
        <div className={styles.bulletActive}></div>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div onClick={onClick} className={styles.subNavItem}>
      <div className={styles.bulletInactive}></div>
      <span>{label}</span>
    </div>
  );
};

export default AdminSidebar;
