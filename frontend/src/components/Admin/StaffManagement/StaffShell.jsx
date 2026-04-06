'use client';

import React from 'react';
import styles from './StaffShell.module.css';

export default function StaffShell({ title, subtitle, children }) {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {subtitle && <p className={styles.pageSub}>{subtitle}</p>}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

