import React from 'react';
import { BookOpen } from 'lucide-react';

const AcademicsSettings = ({ styles }) => {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Academic Module Settings</h2>
          <p className={styles.subtitle}>Configure classes, subjects, grading systems, and timetable defaults.</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <BookOpen size={18} />
          <h3>General Academics</h3>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          This section will host settings for default timetable periods, grading schemas (A-F, percentages), 
          and curriculum standards.
        </p>
      </section>
    </div>
  );
};

export default AcademicsSettings;
