import React from 'react';
import { GraduationCap } from 'lucide-react';

const StaffSettings = ({ styles }) => {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Staff & Role Settings</h2>
          <p className={styles.subtitle}>Manage employee configurations, default permissions, and staff departments.</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <GraduationCap size={18} />
          <h3>Staff Configuration</h3>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Configurations for staff IDs, teacher workloads, and portal access policies will go here.
        </p>
      </section>
    </div>
  );
};

export default StaffSettings;
