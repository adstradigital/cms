'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, 
  Bed, 
  Users, 
  CalendarCheck, 
  UserMinus, 
  CreditCard, 
  PieChart,
  PlusCircle,
  FileText,
  Building2
} from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';

// Sub-components
import HostelOverview from './HostelOverview';
import HostelRooms from './HostelRooms';
import HostelAllocations from './HostelAllocations';
import HostelAttendance from './HostelAttendance';
import HostelVisitors from './HostelVisitors';
import HostelFees from './HostelFees';
import HostelMess from './HostelMess';
import HostelAnalytics from './HostelAnalytics';
import HostelModal from './HostelModal';
import HostelList from './HostelList';

const TABS = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
  { id: 'rooms', label: 'Rooms', icon: <Bed size={18} /> },
  { id: 'allocations', label: 'Allocations', icon: <Users size={18} /> },
  { id: 'attendance', label: 'Attendance', icon: <CalendarCheck size={18} /> },
  { id: 'visitors', label: 'Visitors', icon: <UserMinus size={18} /> },
  { id: 'mess', label: 'Mess', icon: <FileText size={18} /> },
  { id: 'fees', label: 'Fees', icon: <CreditCard size={18} /> },
  { id: 'directory', label: 'Hostel List', icon: <Building2 size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <PieChart size={18} /> },
];

const HostelModule = ({ segment }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(segment || 'overview');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync state when segment prop changes
  useEffect(() => {
    if (segment && TABS.find(t => t.id === segment)) {
      setActiveTab(segment);
    }
  }, [segment]);

  // Fallback sync from pathname (for sidebar navigation)
  useEffect(() => {
    const parts = pathname?.split('/').filter(Boolean) || [];
    const lastPart = parts[parts.length - 1];
    if (lastPart && TABS.find(t => t.id === lastPart)) {
      setActiveTab(lastPart);
    }
  }, [pathname]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await hostelApi.getAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch hostel analytics', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch global dashboard stats
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    router.push(`/admins/hostel/${tabId}`);
  };

  const handleAddHostel = async (data) => {
    try {
      await hostelApi.createHostel(data);
      alert('Hostel created successfully!');
      setIsModalOpen(false);
      fetchAnalytics(); // Refresh the counts
    } catch (err) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create hostel';
      alert('Error: ' + errorMsg);
      throw err;
    }
  };

  return (
    <div className={styles.hostelContainer}>
      <header className={styles.hostelHeader}>
        <div className={styles.titleSection}>
          <h1>Hostel Management</h1>
          <p>Complete control over residency, attendance, and campus housing operations.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
            <PlusCircle size={18} />
            Add Hostel
          </button>
        </div>
      </header>

      <nav className={styles.tabNavigation}>
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/admins/hostel/${tab.id}`}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className={styles.contentArea}>
        {activeTab === 'overview' && <HostelOverview key="overview" analytics={analytics} loading={loading} />}
        {activeTab === 'rooms' && <HostelRooms key="rooms" />}
        {activeTab === 'allocations' && <HostelAllocations key="allocations" />}
        {activeTab === 'attendance' && <HostelAttendance key="attendance" />}
        {activeTab === 'visitors' && <HostelVisitors key="visitors" />}
        {activeTab === 'mess' && <HostelMess key="mess" />}
        {activeTab === 'fees' && <HostelFees key="fees" />}
        {activeTab === 'directory' && <HostelList key="directory" />}
        {activeTab === 'analytics' && <HostelAnalytics key="analytics" data={analytics} />}
      </div>

      <HostelModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddHostel} 
      />
    </div>
  );
};

export default HostelModule;
