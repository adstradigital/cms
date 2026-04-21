'use client';

import styles from './transport.module.css';

export default function StatCard({ icon: Icon, label, value, help, accent }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <div 
          className={styles.statIcon} 
          style={accent ? { background: `${accent}15`, color: accent } : undefined}
        >
          {Icon && <Icon size={22} strokeWidth={2.5} />}
        </div>
        <p className={styles.statLabel}>{label}</p>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <p className={styles.statValue}>{value}</p>
        {help && <p className={styles.statHelp}>{help}</p>}
      </div>
    </div>
  );
}
