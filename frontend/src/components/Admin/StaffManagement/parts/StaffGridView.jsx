import React from 'react';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import styles from '../AllStaff.module.css';

export default function StaffGridView({ filtered, openProfile }) {
  if (filtered.length === 0) {
    return <div className={styles.empty}>No staff found matching the criteria.</div>;
  }

  return (
    <div className={styles.grid}>
      {filtered.map((s) => (
        <div key={s.id} className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.avatar}>{s.first_name?.[0] ?? '?'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.cardName}>{s.first_name ?? ''} {s.last_name ?? ''}</div>
              <div className={styles.cardMeta}>{s.designation} • {s.employee_id}</div>
            </div>
            <button className={styles.iconBtn} onClick={() => openProfile(s)}>
              <ExternalLink size={16} />
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className={styles.small} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Phone size={12} /> {s.phone || 'N/A'}
            </div>
            <div className={styles.small} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={12} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email || 'N/A'}</span>
            </div>
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.roleBadge}>{s.role_name || 'Unassigned'}</div>
            <div className={`${styles.statusBadge} ${s.is_active ? styles.statusActive : styles.statusInactive}`}>
              {s.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
