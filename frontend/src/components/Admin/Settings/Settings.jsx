import React, { useState } from 'react';
import { 
  UserCircle2, Building2, Calendar, LockKeyhole, 
  Users, GraduationCap, BookOpen, Settings2
} from 'lucide-react';
import styles from './Settings.module.css';

// Import Settings Sections (We will create these)
import ProfileSettings from './Profile/ProfileSettings';
import SchoolSettings from './School/SchoolSettings';
import AcademicCyclesSettings from './AcademicCycles/AcademicCyclesSettings';
import SecuritySettings from './Security/SecuritySettings';
import StudentSettings from './Student/StudentSettings';
import StaffSettings from './Staff/StaffSettings';
import AcademicsSettings from './Academics/AcademicsSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const MENU_GROUPS = [
    {
      title: 'Personal',
      items: [
        { id: 'profile', label: 'My Profile', icon: <UserCircle2 size={18} /> },
        { id: 'security', label: 'Security', icon: <LockKeyhole size={18} /> },
      ]
    },
    {
      title: 'Institution',
      items: [
        { id: 'school', label: 'School Identity', icon: <Building2 size={18} /> },
        { id: 'academic_cycles', label: 'Academic Cycles', icon: <Calendar size={18} /> },
      ]
    },
    {
      title: 'Modules',
      items: [
        { id: 'students', label: 'Students', icon: <Users size={18} /> },
        { id: 'staff', label: 'Staff & Roles', icon: <GraduationCap size={18} /> },
        { id: 'academics', label: 'Academics', icon: <BookOpen size={18} /> },
        { id: 'general', label: 'General Config', icon: <Settings2 size={18} /> },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileSettings styles={styles} />;
      case 'school': return <SchoolSettings styles={styles} />;
      case 'academic_cycles': return <AcademicCyclesSettings styles={styles} />;
      case 'security': return <SecuritySettings styles={styles} />;
      case 'students': return <StudentSettings styles={styles} />;
      case 'staff': return <StaffSettings styles={styles} />;
      case 'academics': return <AcademicsSettings styles={styles} />;
      default: return (
        <div className={styles.section}>
          <h3>Coming Soon</h3>
          <p>This settings module is under construction.</p>
        </div>
      );
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        {MENU_GROUPS.map((group, idx) => (
          <div key={idx}>
            <div className={styles.sidebarTitle}>{group.title}</div>
            <ul className={styles.sidebarMenu}>
              {group.items.map(item => (
                <li 
                  key={item.id}
                  className={`${styles.sidebarItem} ${activeTab === item.id ? styles.active : ''}`} 
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.icon}
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;
