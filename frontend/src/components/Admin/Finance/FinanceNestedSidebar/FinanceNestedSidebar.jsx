'use client';
import React from 'react';
import styles from './FinanceNestedSidebar.module.css';

export default function FinanceNestedSidebar({ items, activeKey, onChange }) {
  return (
    <div className={styles.sidebar}>
      {items.map((item) => (
        <button
          key={item.key}
          className={`${styles.item} ${activeKey === item.key ? styles.active : ''}`}
          onClick={() => onChange(item.key)}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
          {activeKey === item.key && <span className={styles.dot} />}
        </button>
      ))}
    </div>
  );
}
