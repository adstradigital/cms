'use client';
import React from 'react';
import styles from './FinanceLayout.module.css';

export default function FinanceTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsList}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`${styles.tabBtn} ${isActive ? styles.activeTab : ''}`}
              onClick={() => onTabChange(tab.key)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
