import React, { useState } from 'react';
import { Search, Bell, MessageSquare, Settings, ChevronDown, User, LogOut, Shield, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminHeader.module.css';

const AdminHeader = () => {
    const { user, logout } = useAuth();
    const [activeDropdown, setActiveDropdown] = useState(null);

    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const closeDropdowns = () => setActiveDropdown(null);

    return (
        <header className={styles.header}>
            {/* Search */}
            <div className={styles.searchContainer}>
                <div className={styles.searchIconWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                </div>
                <input
                    type="text"
                    placeholder="Search.."
                    className={styles.searchInput}
                />
            </div>

            {/* Right Actions */}
            <div className={styles.actionsContainer} onMouseLeave={closeDropdowns}>
                {/* Notifications */}
                <div className={styles.actionWrapper}>
                    <button className={styles.iconButton} onClick={() => toggleDropdown('notif')}>
                        <Bell size={20} />
                        <span className={styles.notificationBadge}></span>
                    </button>
                    {activeDropdown === 'notif' && (
                        <div className={styles.dropdown}>
                            <div className={styles.dropdownHeader}>Notifications</div>
                            <div className={styles.dropdownContent}>
                                <div className={styles.dropdownItem}>New mark entry recorded</div>
                                <div className={styles.dropdownItem}>Attendance report generated</div>
                                <div className={styles.dropdownItemViewAll}>View all notifications</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className={styles.actionWrapper}>
                    <button className={styles.iconButton} onClick={() => toggleDropdown('msg')}>
                        <MessageSquare size={20} />
                        <span className={styles.messageBadge}></span>
                    </button>
                    {activeDropdown === 'msg' && (
                        <div className={styles.dropdown}>
                            <div className={styles.dropdownHeader}>Messages</div>
                            <div className={styles.dropdownContent}>
                                <div className={styles.dropdownItem}>Parent inquiry: Kristina S.</div>
                                <div className={styles.dropdownItem}>Staff meeting scheduled</div>
                                <div className={styles.dropdownItemViewAll}>Go to Inbox</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div className={styles.actionWrapper}>
                    <button className={styles.iconButton} onClick={() => toggleDropdown('set')} aria-label="Settings">
                        <Settings size={20} />
                    </button>
                    {activeDropdown === 'set' && (
                        <div className={styles.dropdown}>
                            <div className={styles.dropdownHeader}>Settings</div>
                            <div className={styles.dropdownContent}>
                                <button className={styles.dropdownItem}><Shield size={14} /> Global Policy</button>
                                <button className={styles.dropdownItem}><Key size={14} /> Security Keys</button>
                                <button className={styles.dropdownItem}><Settings size={14} /> System Config</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div className={styles.actionWrapper}>
                    <div className={styles.profileContainer} onClick={() => toggleDropdown('profile')}>
                        <img
                            src={user?.photo || "https://i.pravatar.cc/150?img=11"}
                            alt="User"
                            className={styles.profileImage}
                        />
                        <div className={styles.profileMeta}>
                            <span className={styles.profileName}>{user?.first_name || 'Admin'}</span>
                            <span className={styles.profileRole}>{user?.role_name || 'Administrator'}</span>
                        </div>
                        <ChevronDown size={16} className={styles.profileChevron} />
                    </div>

                    {activeDropdown === 'profile' && (
                        <div className={styles.dropdown}>
                            <div className={styles.dropdownHeader}>Account</div>
                            <div className={styles.dropdownContent}>
                                <button className={styles.dropdownItem}><User size={14} /> My Profile</button>
                                <button className={`${styles.dropdownItem} ${styles.danger}`} onClick={logout}>
                                    <LogOut size={14} /> Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
