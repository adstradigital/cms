import React from 'react';
import { Mail, Phone, MoreVertical } from 'lucide-react';
import styles from '../AllStaff.module.css';

export default function StaffTableView({ filtered, openProfile, assignableRoles }) {
  if (filtered.length === 0) {
    return <div className={styles.emptyRow}>No staff found matching criteria.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: 60 }}>ID</th>
            <th>Name</th>
            <th>Role & Desig.</th>
            <th>Contact</th>
            <th>Status</th>
            <th style={{ width: 80, textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.id}>
              <td>
                <div className={styles.small}>{s.employee_id}</div>
              </td>
              <td>
                <div className={styles.rowName}>
                  <div className={styles.avatarSm}>{s.first_name?.[0] ?? '?'}</div>
                  <div>
                    <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>
                      {s.first_name ?? ''} {s.last_name ?? ''}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>
                  {s.role_name || 'Unassigned'}
                </div>
                <div className={styles.small}>{s.designation}</div>
              </td>
              <td>
                <div className={styles.small} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Phone size={12} /> {s.phone || 'N/A'}
                </div>
                <div className={styles.small} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={12} /> {s.email || 'N/A'}
                </div>
              </td>
              <td>
                <span className={`${styles.statusBadge} ${s.is_active ? styles.statusActive : styles.statusInactive}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <button className={styles.btn} onClick={() => openProfile(s)}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
