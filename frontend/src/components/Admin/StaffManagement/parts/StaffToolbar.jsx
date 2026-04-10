import React from 'react';
import { Search, List, Grid, Download, Plus } from 'lucide-react';
import styles from '../AllStaff.module.css';

export default function StaffToolbar({ search, setSearch, filterRole, setFilterRole, roles, isGrid, setIsGrid, exportToCSV, openAddModal }) {
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={18} color="var(--theme-text-secondary)" />
          <input
            placeholder="Search by name, ID, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.select}
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
          <option value="Unassigned">Unassigned</option>
        </select>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.iconBtn} ${!isGrid ? styles.iconBtnActive : ''}`}
            onClick={() => setIsGrid(false)}
            title="List View"
          >
            <List size={18} />
          </button>
          <button
            className={`${styles.iconBtn} ${isGrid ? styles.iconBtnActive : ''}`}
            onClick={() => setIsGrid(true)}
            title="Grid View"
          >
            <Grid size={18} />
          </button>
        </div>
        <button className={styles.btn} onClick={exportToCSV}>
          <Download size={16} /> Export
        </button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAddModal}>
          <Plus size={16} /> Onboard Staff
        </button>
      </div>
    </>
  );
}
