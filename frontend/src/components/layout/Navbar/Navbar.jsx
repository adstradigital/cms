'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { User, Settings, LogOut, ChevronDown, Shield, Mail, Phone } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar({ title = '', user = null, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProfileHref = () => {
    const role = user?.role?.toLowerCase();
    if (role === 'student') return '/student/profile';
    if (role === 'admin') return '/admins/profile';
    return '#';
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.right}>


        {/* Search */}
        <div className={styles.search}>
          <input
            type="text"
            placeholder="Search..."
            className={styles.searchInput}
          />
        </div>

        {/* Notifications */}
        <button className={styles.iconBtn} title="Notifications">
          🔔
        </button>

        {/* User menu with dropdown */}
        {user && (
          <div className={styles.profileArea} ref={dropdownRef}>
            <button
              className={styles.profileTrigger}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className={styles.avatar}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userRole}>{user.role}</span>
              </div>
              <ChevronDown 
                size={14} 
                className={`${styles.chevron} ${showDropdown ? styles.chevronOpen : ''}`} 
              />
            </button>

            {showDropdown && (
              <div className={styles.dropdown}>
                {/* Profile Header */}
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownAvatar}>
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className={styles.dropdownUserInfo}>
                    <span className={styles.dropdownName}>{user.name}</span>
                    <span className={styles.dropdownRole}>
                      <Shield size={10} /> {user.role}
                    </span>
                  </div>
                </div>

                <div className={styles.dropdownDivider} />

                {/* Quick Links */}
                <a 
                  href={getProfileHref()} 
                  className={styles.dropdownItem}
                  onClick={() => setShowDropdown(false)}
                >
                  <User size={16} />
                  <span>My Profile</span>
                </a>
                <a 
                  href="#" 
                  className={styles.dropdownItem}
                  onClick={() => setShowDropdown(false)}
                >
                  <Settings size={16} />
                  <span>Account Settings</span>
                </a>

                <div className={styles.dropdownDivider} />

                {/* Logout */}
                <button 
                  className={styles.dropdownLogout}
                  onClick={() => { setShowDropdown(false); onLogout(); }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
