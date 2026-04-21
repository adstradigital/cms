'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapPinned, Radio, Clock, Gauge, AlertTriangle, BusFront, Map as MapIcon, Navigation } from 'lucide-react';

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

export default function TrackingTab({ buses }) {
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [fleetLocations, setFleetLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchLocations = useCallback(async () => {
    try {
      const res = await transportApi.getLocationLogs({ latest: 'true' });
      const logs = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      
      // We actually want latest for EACH bus. 
      // If the API returns all latest, great. If not, we might need a better endpoint.
      // For now, let's assume we fetch all logs and filter the latest per bus.
      const allLogsRes = await transportApi.getLocationLogs();
      const allLogs = Array.isArray(allLogsRes.data) ? allLogsRes.data : [];
      
      const latestMap = {};
      allLogs.forEach(log => {
        const busId = log.bus;
        if (!latestMap[busId] || new Date(log.recorded_at) > new Date(latestMap[busId].recorded_at)) {
          latestMap[busId] = log;
        }
      });
      
      setFleetLocations(latestMap);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch tracking data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 20000); // 20 seconds refresh
    return () => clearInterval(interval);
  }, [fetchLocations]);

  const activeBuses = buses.filter((b) => b.is_active && b.status === 'active');
  const selectedBus = activeBuses.find(b => String(b.id) === String(selectedBusId));
  const selectedLocation = fleetLocations[selectedBusId];

  // Stats calculation
  const stats = { on_time: 0, delayed: 0, inactive: 0 };
  activeBuses.forEach(bus => {
    const st = getTrackingStatus(fleetLocations[bus.id]);
    if (st === 'not_started') stats.inactive++;
    else if (st === 'delayed') stats.delayed++;
    else stats.on_time++;
  });

  return (
    <section className={styles.section}>
      {/* Stats Header */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--space-4)' }}>
        <StatCard icon={Radio} label="Live & On Time" value={stats.on_time} accent="#22c55e" />
        <StatCard icon={Clock} label="Delayed / Slow" value={stats.delayed} accent="#f59e0b" />
        <StatCard icon={AlertTriangle} label="Offline / Idle" value={stats.inactive} accent="#ef4444" />
      </div>

      <div className={styles.dual} style={{ height: 'calc(100vh - 350px)', minHeight: 600 }}>
        {/* Left Panel: Fleet List */}
        <div className={styles.panel} style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column' }}>
          <div className={styles.panelHeader} style={{ padding: '16px 20px', borderBottom: '1px solid var(--t-line)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Navigation size={18} color="var(--t-accent)" />
              Live Fleet
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--t-muted)' }}>
              Updates every 20s
            </span>
          </div>
          
          <div className={styles.simpleList} style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {activeBuses.map((bus) => {
              const loc = fleetLocations[bus.id];
              const statusKey = getTrackingStatus(loc);
              const st = TRACKING_STATUS[statusKey];
              const isSelected = String(selectedBusId) === String(bus.id);

              return (
                <div
                  key={bus.id}
                  className={styles.simpleRow}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 8,
                    border: isSelected ? '2px solid var(--t-accent)' : '1px solid var(--t-line)',
                    background: isSelected ? 'var(--t-accent-light)' : '#fff',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setSelectedBusId(bus.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 10, 
                        background: isSelected ? '#fff' : '#f1f5f9', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: isSelected ? 'var(--t-accent)' : '#64748b'
                      }}>
                        <BusFront size={20} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--t-ink)' }}>{bus.bus_number}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--t-muted)', margin: 0 }}>{bus.name}</p>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      padding: '2px 8px', 
                      borderRadius: 20, 
                      fontWeight: 700,
                      background: st.bg,
                      color: st.color
                    }}>
                      {st.label}
                    </span>
                  </div>
                  {loc && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--t-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Gauge size={12} /> {loc.speed_kmph || 0} km/h
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {new Date(loc.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Map */}
        <div className={styles.panel} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {selectedBus ? (
            <>
              <div style={{ 
                position: 'absolute', 
                top: 20, 
                left: 20, 
                zIndex: 10, 
                background: 'rgba(255,255,255,0.95)', 
                padding: '12px 18px', 
                borderRadius: 16, 
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--t-line)',
                display: 'flex',
                alignItems: 'center',
                gap: 15
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Tracking {selectedBus.bus_number}</h4>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--t-muted)' }}>
                    Last heartbeat: {selectedLocation ? new Date(selectedLocation.recorded_at).toLocaleTimeString() : 'Never'}
                  </p>
                </div>
                {selectedLocation && (
                  <div style={{ paddingLeft: 15, borderLeft: '1px solid var(--t-line)' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--t-accent)' }}>
                      {selectedLocation.speed_kmph || 0}
                    </span>
                    <span style={{ fontSize: '0.6rem', marginLeft: 4, color: 'var(--t-muted)' }}>KM/H</span>
                  </div>
                )}
              </div>

              <GoogleMap 
                lat={selectedLocation?.latitude} 
                lng={selectedLocation?.longitude} 
                height="100%"
                markers={activeBuses.map(b => ({
                  latitude: fleetLocations[b.id]?.latitude,
                  longitude: fleetLocations[b.id]?.longitude,
                  title: b.bus_number,
                  isCurrent: b.id === selectedBus.id
                })).filter(m => m.latitude && m.longitude)}
              />
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--t-muted)', background: '#f8fafc' }}>
              <MapIcon size={48} style={{ marginBottom: 15, opacity: 0.5 }} />
              <p style={{ fontWeight: 500 }}>Select a bus to begin live tracking</p>
              <p style={{ fontSize: '0.8rem' }}>Fleet overview is refreshed automatically</p>
            </div>
          )}
          
          <div style={{ position: 'absolute', bottom: 20, right: 20, fontSize: '0.65rem', background: 'rgba(255,255,255,0.8)', padding: '4px 10px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
            Last data fetch: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </section>
  );
}
