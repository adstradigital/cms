'use client';

import React from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Briefcase, 
  Users, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import styles from './PortalSelector.module.css';

const PortalSelector = () => {
  const portals = [
    {
      id: 'student',
      title: 'Student Portal',
      description: 'View your grades, attendance, and campus events.',
      icon: <GraduationCap size={40} />,
      href: '/login/student',
      color: '#3b82f6'
    },
    {
      id: 'teacher',
      title: 'Teacher Portal',
      description: 'Manage classes, student progress, and digital lessons.',
      icon: <Briefcase size={40} />,
      href: '/login/teacher',
      color: '#8b5cf6'
    },
    {
      id: 'parent',
      title: 'Parent Portal',
      description: 'Track your child\'s academic journey and fee status.',
      icon: <Users size={40} />,
      href: '/login/parent',
      color: '#10b981'
    }
  ];

  return (
    <div className={styles.container}>
      {/* Background elements */}
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.mainTitle}>Access Your Portal</h1>
          <p className={styles.subtitle}>Select your entry point to the Blaze Education ecosystem.</p>
        </div>

        <div className={styles.grid}>
          {portals.map((portal) => (
            <Link href={portal.href} key={portal.id} className={styles.card}>
              <div className={styles.iconWrapper} style={{ backgroundColor: `${portal.color}15`, color: portal.color }}>
                {portal.icon}
              </div>
              <h2 className={styles.cardTitle}>{portal.title}</h2>
              <p className={styles.cardDescription}>{portal.description}</p>
              <div className={styles.actionRow} style={{ color: portal.color }}>
                <span>Enter Portal</span>
                <ChevronRight size={18} />
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.footer}>
          <Link href="/login/admin" className={styles.adminLink}>
            <ShieldCheck size={16} />
            <span>Management Console</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PortalSelector;
