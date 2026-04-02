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
  const [expandedMenu, setExpandedMenu] = useState(null);
  const isStudentsPath = pathname?.startsWith('/admins/students');
  const isClassesPath = pathname?.startsWith('/admins/classes');
  
  const isStudentsExpanded = expandedMenu === 'Students' || (expandedMenu === null && isStudentsPath);
  const isClassesExpanded = expandedMenu === 'Classes' || (expandedMenu === null && isClassesPath);

  const navigate = (path) => {
    router.push(path);
  };

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      
      {/* Logo */}
      <div className={`${styles.logoContainer} ${isCollapsed ? styles.logoContainerCollapsed : ''}`}>
        <div className={styles.logoIcon}>
          <Atom size={18} strokeWidth={2.25} className={styles.logoReactIcon} />
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
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {!isCollapsed && <p className={styles.sectionLabel}>Main</p>}
        <NavItem 
          icon={<Home size={20} />} 
          label="Dashboard" 
          collapsed={isCollapsed}
          active={pathname === '/admins'} 
          onClick={() => { navigate('/admins'); setExpandedMenu(null); }} 
        />
        <NavItem 
          icon={<Users size={20} />} 
          label="Teachers" 
          collapsed={isCollapsed}
          active={pathname === '/admins/teachers'} 
          onClick={() => { navigate('/admins/teachers'); setExpandedMenu(null); }} 
        />

        {isCollapsed ? (
          <NavItem
            icon={<GraduationCap size={20} />}
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
                  <GraduationCap size={20} />
                </div>
                <span>Students</span>
              </div>
              <ChevronDown size={16} className={`${styles.expandableChevron} ${isStudentsExpanded ? styles.rotated : ''}`} />
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
            icon={<LayoutGrid size={20} />} 
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
                  <LayoutGrid size={20} />
                </div>
                <span>Classes</span>
              </div>
              <ChevronDown size={16} className={`${styles.expandableChevron} ${isClassesExpanded ? styles.rotated : ''}`} />
            </div>

            <div className={`${styles.subItemsContainer} ${isClassesExpanded ? styles.expanded : styles.collapsed}`}>
              <SubNavItem label="Class" active={pathname === '/admins/classes/management'} onClick={() => navigate('/admins/classes/management')} />
              <SubNavItem label="Subject" active={pathname === '/admins/classes/subjects'} onClick={() => navigate('/admins/classes/subjects')} />
              <SubNavItem label="Syllabus" active={pathname === '/admins/classes/syllabus'} onClick={() => navigate('/admins/classes/syllabus')} />
              <SubNavItem label="Timetable Builder" active={pathname === '/admins/classes/timetable'} onClick={() => navigate('/admins/classes/timetable')} />
            </div>
          </div>
        )}
        <NavItem 
          icon={<Calendar size={20} />} 
          label="Course Sessions" 
          collapsed={isCollapsed}
          active={pathname === '/admins/sessions'} 
          onClick={() => { navigate('/admins/sessions'); setExpandedMenu(null); }} 
        />
        <NavItem 
          icon={<BookOpen size={20} />} 
          label="Admissions" 
          collapsed={isCollapsed}
          active={pathname === '/admins/admissions'} 
          onClick={() => { navigate('/admins/admissions'); setExpandedMenu(null); }} 
        />
        <NavItem 
          icon={<FileText size={20} />} 
          label="Examinations" 
          collapsed={isCollapsed}
          active={pathname === '/admins/examinations'} 
          onClick={() => { navigate('/admins/examinations'); setExpandedMenu(null); }} 
        />
      </nav>

      {/* Bottom Navigation */}
      <div className={styles.bottomNav}>
        {!isCollapsed && <p className={styles.sectionLabel}>Workspace</p>}
        <NavItem icon={<Settings size={20} />} label="Settings" collapsed={isCollapsed} />
        <NavItem icon={<HelpCircle size={20} />} label="Support" collapsed={isCollapsed} />
        <NavItem icon={<LogOut size={20} />} label="Log out" collapsed={isCollapsed} onClick={logout} />
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
