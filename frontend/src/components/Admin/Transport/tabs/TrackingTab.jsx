'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapPinned, Radio, Clock, Gauge, AlertTriangle, BusFront, Map as MapIcon, Navigation, RefreshCcw, PieChart } from 'lucide-react';

import transportApi from '@/api/transportApi';
import StatCard from '../StatCard';
import GoogleMap from '../GoogleMap';
import styles from '../transport.module.css';

const TRACKING_STATUS = {
  on_time: { label: 'On Time', dot: styles.dotGreen, color: '#22c55e', bg: '#dcfce7' },
  delayed: { label: 'Delayed', dot: styles.dotYellow, color: '#f59e0b', bg: '#fef3c7' },
  not_started: { label: 'Inactive', dot: styles.dotRed, color: '#ef4444', bg: '#fee2e2' },
};

function getTrackingStatus(location) {
  if (!location) return 'not_started';
  const recordedAt = new Date(location.recorded_at);
  const diffMin = (Date.now() - recordedAt.getTime()) / 60000;
  if (diffMin > 10) return 'not_started';
  if (diffMin > 3) return 'delayed';
  return 'on_time';
}

export default function TrackingTab({ buses, routes }) {
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [fleetLocations, setFleetLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLocations = useCallback(async () => {
    try {
      const res = await transportApi.getLocationLogs({ latest: 'true' });
      const logs = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      
      const latestMap = {};
      logs.forEach(log => {
        const busId = typeof log.bus === 'object' ? log.bus.id : log.bus;
        latestMap[busId] = log;
      });
      
      setFleetLocations(latestMap);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch tracking data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 5000); // 5s fast polling for real-time feel
    return () => clearInterval(interval);
  }, [fetchLocations]);

  const activeBuses = buses.filter((b) => b.is_active && b.status === 'active');
  
  const filteredBuses = activeBuses.filter(b => 
    b.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedBus = activeBuses.find(b => String(b.id) === String(selectedBusId));
  const selectedLocation = fleetLocations[selectedBusId];

  const getEnhancedStatus = (loc) => {
    if (!loc) return { label: 'Offline', class: styles.statusOffline };
    const recordedAt = new Date(loc.recorded_at);
    const diffSec = (Date.now() - recordedAt.getTime()) / 1000;
    
    if (diffSec > 30) return { label: 'Offline', class: styles.statusOffline };
    if (diffSec > 10) return { label: 'Delayed', class: styles.statusDelayed };
    return { label: 'On Time', class: styles.statusOnline };
  };

  return (
    <section className={styles.section}>
      <div className={styles.trackingWrapperFull}>
        {/* Right Content: Full Map */}
        <main className={styles.mapContainerFull}>
          <div className={styles.mapOverlay}>
            <div style={{ 
              background: 'white', 
              padding: '12px 24px', 
              borderRadius: '20px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '20px'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                  Live Fleet Monitor
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  Tracking {activeBuses.length} active units • Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
              <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                {activeBuses.map((b, idx) => {
                  const loc = fleetLocations[b.id];
                  const status = getEnhancedStatus(loc);
                  const busColors = ['#1a73e8', '#ea4335', '#fbbc05', '#34a853', '#ff6d00', '#46bdc6', '#7b1fa2', '#c2185b'];
                  const busColor = busColors[idx % busColors.length];
                  
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                       <div style={{ width: 8, height: 8, borderRadius: '50%', background: busColor }} />
                       {b.bus_number}
                       <span style={{ fontSize: '0.6rem', opacity: 0.6, marginLeft: 4 }}>({status.label})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <GoogleMap 
            height="100%"
            markers={activeBuses.map((b, idx) => {
              const loc = fleetLocations[b.id];
              const route = routes.find(r => r.bus === b.id);
              return {
                id: b.id,
                latitude: loc?.latitude,
                longitude: loc?.longitude,
                title: b.bus_number,
                subtitle: b.name,
                driver: b.driver_user_name || 'Assigned Driver',
                route: route ? route.name : 'General Route',
                speed: loc?.speed_kmph || 0,
                lastSeen: loc?.recorded_at,
                isCurrent: selectedBus ? b.id === selectedBus.id : false,
                isOffline: getEnhancedStatus(loc).label === 'Offline'
              };
            }).filter(m => m.latitude && m.longitude)}
            onMarkerClick={(m) => setSelectedBusId(m.id)}
          />

          {/* Map Legend */}
          <div style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            zIndex: 1000,
            background: 'white',
            padding: '12px 16px',
            borderRadius: '16px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <h5 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>Fleet Color Map</h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxWidth: '200px' }}>
              {activeBuses.slice(0, 8).map((b, idx) => {
                const colors = ['#1a73e8', '#ea4335', '#fbbc05', '#34a853', '#ff6d00', '#46bdc6', '#7b1fa2', '#c2185b'];
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 600 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[idx % colors.length] }} />
                    {b.bus_number}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.mapControls}>
            <button className={styles.controlBtn} title="Fit All Buses" onClick={() => { setSelectedBusId(null); fetchLocations(); }}>
              <PieChart size={18} />
            </button>
            <button className={styles.controlBtn} title="Recenter Map" onClick={() => { if(selectedLocation) fetchLocations(); }}>
              <Navigation size={18} />
            </button>
            <button className={styles.controlBtn} title="Refresh Data" onClick={fetchLocations}>
              <RefreshCcw size={18} />
            </button>
          </div>
        </main>
      </div>
    </section>
  );
}
