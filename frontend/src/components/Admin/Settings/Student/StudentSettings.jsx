import React from 'react';
import { Users } from 'lucide-react';

const StudentSettings = ({ styles }) => {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Student Settings</h2>
          <p className={styles.subtitle}>Configure student enrollment, roll numbers, and parent portal access.</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Users size={18} />
          <h3>General Configuration</h3>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Additional student-specific configurations (like automatic Roll No generation patterns, 
          mandatory fields for admission, etc.) will be added here.
        </p>
      </section>
    </div>
  );
};

export default StudentSettings;
