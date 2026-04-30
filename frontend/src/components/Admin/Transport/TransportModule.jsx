'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BusFront,
  Clock3,
  CreditCard,
  MapPinned,
  MessageSquareWarning,
  PieChart,
  RefreshCcw,
  Route,
  Users,
} from 'lucide-react';

import transportApi from '@/api/transportApi';
import styles from './transport.module.css';

import OverviewTab from './tabs/OverviewTab';
import BusesTab from './tabs/BusesTab';
import RoutesTab from './tabs/RoutesTab';
import TrackingTab from './tabs/TrackingTab';
import AttendanceTab from './tabs/AttendanceTab';
import StudentsTab from './tabs/StudentsTab';
import FeesTab from './tabs/FeesTab';
import ComplaintsTab from './tabs/ComplaintsTab';
import AnalyticsTab from './tabs/AnalyticsTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'buses', label: 'Fleet', icon: BusFront },
  { id: 'routes', label: 'Routes & Stops', icon: Route },
  { id: 'tracking', label: 'Live Tracking', icon: MapPinned },
  { id: 'attendance', label: 'Attendance', icon: Clock3 },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'fees', label: 'Fees & Payments', icon: CreditCard },
  { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
];

const asList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export default function TransportModule({ segment = 'overview' }) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState(segment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (segment && TABS.find((t) => t.id === segment)) {
      setActiveTab(segment);
    }
  }, [segment]);

  useEffect(() => {
    const parts = pathname?.split('/').filter(Boolean) || [];
    const last = parts[parts.length - 1];
    if (TABS.some((t) => t.id === last)) {
      setActiveTab(last);
    }
  }, [pathname]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [busRes, routeRes, studentRes, feeRes, complaintRes, locationRes] = await Promise.all([
        transportApi.getBuses(),
        transportApi.getRoutes(),
        transportApi.getStudentTransports(),
        transportApi.getFees(),
        transportApi.getComplaints(),
        transportApi.getLocationLogs(),
      ]);
      setBuses(asList(busRes.data));
      setRoutes(asList(routeRes.data));
      setStudents(asList(studentRes.data));
      setFees(asList(feeRes.data));
      setComplaints(asList(complaintRes.data));
      setLocations(asList(locationRes.data));
    } catch (err) {
      console.error('Transport load failed', err);
      setError('Unable to load transport data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    router.push(`/admins/transport/${tabId}`);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab buses={buses} routes={routes} students={students} fees={fees} complaints={complaints} locations={locations} onTab={switchTab} />;
      case 'buses':
        return <BusesTab buses={buses} onRefresh={loadAll} />;
      case 'routes':
        return <RoutesTab routes={routes} buses={buses} onRefresh={loadAll} />;
      case 'tracking':
        return <TrackingTab buses={buses} routes={routes} locations={locations} onRefresh={loadAll} />;
      case 'attendance':
        return <AttendanceTab students={students} routes={routes} onRefresh={loadAll} />;
      case 'students':
        return <StudentsTab students={students} routes={routes} buses={buses} onRefresh={loadAll} />;
      case 'fees':
        return <FeesTab fees={fees} routes={routes} students={students} onRefresh={loadAll} />;
      case 'complaints':
        return <ComplaintsTab complaints={complaints} buses={buses} routes={routes} students={students} onRefresh={loadAll} />;
      case 'analytics':
        return <AnalyticsTab />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Transportation Management</h1>
          <p>Manage your school transport fleet, routes, GPS tracking, fees, and complaints.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={loadAll} disabled={loading}>
            <RefreshCcw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <nav className={styles.tabs} role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={`/admins/transport/${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={(e) => { e.preventDefault(); switchTab(tab.id); }}
            >
              <Icon size={15} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {error && <div className={styles.error}>{error}</div>}
      {loading && !buses.length && <div className={styles.loading}>Loading transport data...</div>}

      {!loading && renderTab()}
    </div>
  );
}
