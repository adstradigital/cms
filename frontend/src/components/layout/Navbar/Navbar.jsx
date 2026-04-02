import { useTheme } from '@/context/ThemeContext';
import styles from './Navbar.module.css';

export default function Navbar({ title = '', user = null, onLogout }) {
  const { colorTheme, setColorTheme } = useTheme();

  const themes = [
    { name: 'green', color: '#00a676' },
    { name: 'blue', color: '#2563eb' },
    { name: 'red', color: '#dc2626' },
    { name: 'purple', color: '#7c3aed' },
    { name: 'orange', color: '#f97316' },
  ];

  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.right}>
        {/* Theme Selector */}
        <div className="flex gap-2 mr-4">
          {themes.map((t) => (
            <button
              key={t.name}
              onClick={() => setColorTheme(t.name)}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: t.color,
                border: colorTheme === t.name ? '2px solid #fff' : 'none',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
              }}
              title={`${t.name} theme`}
            />
          ))}
        </div>

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

        {/* User menu */}
        {user && (
          <div className={styles.userMenu}>
            <div className={styles.avatar}>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{user.role}</span>
            </div>
            <button className={styles.logoutBtn} onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
