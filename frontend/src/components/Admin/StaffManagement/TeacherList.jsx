'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Filter, LayoutGrid, List, ExternalLink, BookOpen } from 'lucide-react';
import styles from './Staff.module.css';
import adminApi from '@/api/adminApi';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const TeacherList = () => {
  const [view, setView] = useState('grid');
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getTeachers();
      setTeachers(normalizeList(res.data));
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter((t) =>
      String(t.full_name || '').toLowerCase().includes(term) ||
      String(t.employee_id || '').toLowerCase().includes(term) ||
      String(t.email || '').toLowerCase().includes(term)
    );
  }, [teachers, searchQuery]);

  const renderGridView = () => (
    <div className={styles.grid}>
      {filteredTeachers.map((teacher) => (
        <div key={teacher.id} className={styles.card}>
          <div className={`${styles.statusBadge} ${teacher.status === 'active' ? styles.active : ''}`}>
            {teacher.status}
          </div>

          <div className={styles.cardHeader}>
            <div className={styles.avatar}>
              {String(teacher.full_name || 'T').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className={styles.teacherInfo}>
              <h3>{teacher.full_name}</h3>
              <span>{teacher.designation} - {teacher.employee_id}</span>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Joined</span>
              <div className={styles.statValue}>
                {teacher.joining_date || '-'}
              </div>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Email</span>
              <div className={styles.statValue} style={{ fontSize: 11, wordBreak: 'break-all' }}>
                {teacher.email || '-'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span className={styles.statLabel}>Role</span>
            <div className={styles.tagContainer}>
              <span className={styles.tag}>{teacher.role_name || 'Teacher'}</span>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button className={styles.btn} type="button">
              <ExternalLink size={14} /> Profile
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
              <BookOpen size={14} /> Timetable
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Teacher</th>
            <th className={styles.th}>Employee ID</th>
            <th className={styles.th}>Joining Date</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredTeachers.map((teacher) => (
            <tr key={teacher.id}>
              <td className={styles.td}>
                <div className={styles.teacherRow}>
                  <div className={styles.avatarSmall}>{String(teacher.full_name || 'T')[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{teacher.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>{teacher.designation}</div>
                  </div>
                </div>
              </td>
              <td className={styles.td}>{teacher.employee_id}</td>
              <td className={styles.td}>{teacher.joining_date || '-'}</td>
              <td className={styles.td}>
                <span className={`${styles.statusBadge} ${teacher.status === 'active' ? styles.active : ''}`} style={{ position: 'static' }}>
                  {teacher.status}
                </span>
              </td>
              <td className={styles.td}>
                <button className={styles.btn} style={{ width: 'auto', padding: '6px 12px' }} type="button">
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={styles.container} style={{ padding: 0 }}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>Academic Staff (Teachers)</h2>
          <p>Directory of all teaching personnel.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: 'auto', padding: '10px 24px', flex: '0 0 auto' }} type="button">
          <Plus size={18} /> Add Teacher
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, ID, email..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('grid')}
            type="button"
            aria-label="Grid view"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('list')}
            type="button"
            aria-label="List view"
          >
            <List size={18} />
          </button>
        </div>

        <button className={styles.btn} style={{ width: 'auto', flex: '0 0 auto' }} type="button" onClick={fetchTeachers}>
          <Filter size={18} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading teachers...</div>
      ) : (
        view === 'grid' ? renderGridView() : renderListView()
      )}
    </div>
  );
};

export default TeacherList;
