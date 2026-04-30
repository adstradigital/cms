import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, MessageSquare, Settings, ChevronDown, User, LogOut, Shield, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import adminApi from '@/api/adminApi';
import styles from './AdminHeader.module.css';

const AdminHeader = () => {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    const managedSectionId = useMemo(() => {
        const sec = user?.managed_sections?.[0];
        return sec?.id || null;
    }, [user]);

    useEffect(() => {
        if (!managedSectionId) {
            setNotifications([]);
            return;
        }
        const shouldLoad = activeDropdown === 'notif' || notifications.length === 0;
        if (!shouldLoad) return;

        let cancelled = false;
        (async () => {
            try {
                setNotifLoading(true);
                const res = await adminApi.getNotifications({
                    type: 'attendance',
                    audience: 'staff',
                    section: managedSectionId,
                    published: 'true',
                });
                const data = res?.data;
                const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
                if (!cancelled) setNotifications(list.slice(0, 6));
            } catch {
                if (!cancelled) setNotifications([]);
            } finally {
                if (!cancelled) setNotifLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeDropdown, managedSectionId, notifications.length]);

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
                        {notifications.length > 0 && <span className={styles.notificationBadge}></span>}
                    </button>
                    {activeDropdown === 'notif' && (
                        <div className={styles.dropdown}>
                            <div className={styles.dropdownHeader}>Notifications</div>
                            <div className={styles.dropdownContent}>
                                {notifLoading ? (
                                    <div className={styles.dropdownItem}>Loading...</div>
                                ) : notifications.length > 0 ? (
                                    notifications.map((n) => (
                                        <div key={n.id} className={styles.dropdownItem}>
                                            {n.title}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.dropdownItem}>No notifications</div>
                                )}
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
                <div className={`${styles.actionWrapper} ${styles.profileActionWrapper}`}>
                    <div className={styles.profileContainer} onClick={() => toggleDropdown('profile')}>
                        <img
                            src={user?.profile?.photo || user?.photo || "https://i.pravatar.cc/150?img=11"}
                            alt="User"
                            className={styles.profileImage}
                        />
                        <div className={styles.profileMeta}>
                            <span className={styles.profileName}>{user?.full_name || user?.first_name || user?.username || 'Admin'}</span>
                            <span className={styles.profileRole}>{user?.role_name || 'Administrator'}</span>
                        </div>
                        <ChevronDown size={16} className={styles.profileChevron} />
                    </div>

                    {activeDropdown === 'profile' && (
                        <div className={`${styles.dropdown} ${styles.profileDropdown}`}>
                            <div className={styles.dropdownHeader}>Account</div>
                            <div className={styles.dropdownContent}>
                                <button
                                    className={styles.dropdownItem}
                                    onClick={() => {
                                        closeDropdowns();
                                        router.push('/admins/settings');
                                    }}
                                >
                                    <User size={14} /> My Profile
                                </button>
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
