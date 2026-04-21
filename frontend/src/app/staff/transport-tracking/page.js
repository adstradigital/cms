'use client';

import { useState, useEffect, useRef } from 'react';
import { Navigation, Play, Square, MapPin, Gauge, AlertCircle, CheckCircle2 } from 'lucide-react';
import transportApi from '@/api/transportApi';

export default function DriverTrackingPage() {
  const [tracking, setTracking] = useState(false);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState('');
  const [lastPing, setLastPing] = useState(null);
  const [busInfo, setBusInfo] = useState(null);
  const pingIntervalRef = useRef(null);

  // Get current bus assignment on load
  useEffect(() => {
    transportApi.getBuses({ mine: 'true' })
      .then(res => {
        const buses = Array.isArray(res.data) ? res.data : [];
        if (buses.length > 0) {
          setBusInfo(buses[0]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch assigned bus', err);
        setError('Could not verify bus assignment.');
      });
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setTracking(true);
    setError('');

    // Immediate first ping
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendPing(pos.coords);
        setCoords(pos.coords);
      },
      (err) => setError(`Location Error: ${err.message}`)
    );

    // Set interval for subsequent pings
    pingIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendPing(pos.coords);
          setCoords(pos.coords);
        },
        (err) => console.error('Periodic location error', err),
        { enableHighAccuracy: true }
      );
    }, 20000); // 20 seconds
  };

  const stopTracking = () => {
    setTracking(false);
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
  };

  const sendPing = async (c) => {
    try {
      await transportApi.pingBus({
        latitude: c.latitude,
        longitude: c.longitude,
        speed_kmph: (c.speed || 0) * 3.6 // Convert m/s to km/h
      });
      setLastPing(new Date());
    } catch (err) {
      console.error('Ping failed', err);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a', 
      color: '#fff', 
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Navigation size={24} color="#3b82f6" />
          Bus Tracker
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 5 }}>Driver Tracking Console</p>
      </header>

      {busInfo ? (
        <div style={{ background: '#1e293b', borderRadius: 20, padding: '20px', marginBottom: '30px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: '#3b82f620', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
              <Navigation size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{busInfo.bus_number}</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>{busInfo.name}</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: 20, padding: '20px', marginBottom: '30px', display: 'flex', gap: 12, alignItems: 'center', color: '#fca5a5' }}>
          <AlertCircle size={20} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>No bus assigned. Please contact admin.</p>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '40px' }}>
        <button 
          onClick={tracking ? stopTracking : startTracking}
          disabled={!busInfo}
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: 'none',
            background: tracking ? '#ef4444' : '#3b82f6',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 15,
            cursor: 'pointer',
            boxShadow: tracking ? '0 0 40px rgba(239, 68, 68, 0.4)' : '0 0 40px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.3s ease',
            opacity: busInfo ? 1 : 0.5
          }}
        >
          {tracking ? <Square size={48} fill="#fff" /> : <Play size={48} fill="#fff" style={{ marginLeft: 5 }} />}
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{tracking ? 'STOP' : 'START'}</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            color: tracking ? '#22c55e' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'center'
          }}>
            {tracking ? (
              <><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> Tracking Active</>
            ) : 'Ready to Track'}
          </p>
          {lastPing && (
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 5 }}>
              Last update sent: {lastPing.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 'auto' }}>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: 16, border: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Speed</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 5 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{coords?.speed ? Math.round(coords.speed * 3.6) : 0}</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>km/h</span>
          </div>
        </div>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: 16, border: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</p>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'Waiting...'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', background: '#ef4444', color: '#fff', padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <AlertCircle size={20} />
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{error}</p>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
