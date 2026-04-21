'use client';
import React, { useState } from 'react';
import {
  Settings, DollarSign, TrendingUp, AlertTriangle, Receipt, Percent, FileText
} from 'lucide-react';
import FinanceTabs from '../shared/FinanceTabs';
import FeeStructure from './FeeStructure/FeeStructure';
import FeeCollection from './FeeCollection/FeeCollection';
import FeeTracking from './FeeTracking/FeeTracking';
import FeeReceipts from './FeeReceipts/FeeReceipts';
import Concessions from './Concessions/Concessions';
import FeeDefaulters from './FeeDefaulters/FeeDefaulters';
import styles from '../shared/FinanceLayout.module.css';

const NAV_ITEMS = [
  { key: 'structure',  label: 'Fee Structure',  icon: <Settings size={18} /> },
  { key: 'collection', label: 'Collection', icon: <DollarSign size={18} /> },
  { key: 'tracking',   label: 'Tracking',   icon: <TrendingUp size={18} /> },
  { key: 'receipts',   label: 'Receipts',        icon: <Receipt size={18} /> },
  { key: 'concessions',label: 'Concessions',     icon: <Percent size={18} /> },
  { key: 'defaulters', label: 'Defaulters',      icon: <AlertTriangle size={18} /> },
];

const VIEWS = {
  structure:   <FeeStructure />,
  collection:  <FeeCollection />,
  tracking:    <FeeTracking />,
  receipts:    <FeeReceipts />,
  concessions: <Concessions />,
  defaulters:  <FeeDefaulters />,
};

export default function FeesPage() {
  const [active, setActive] = useState('structure');

  return (
    <div className={styles.financeModule}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Fee Management</h1>
        <p className={styles.pageSubtitle}>Structures, collections, and tracking across the institution</p>
      </div>
      
      <FinanceTabs tabs={NAV_ITEMS} activeTab={active} onTabChange={setActive} />
      
      <div>
        {VIEWS[active]}
      </div>
    </div>
  );
}
