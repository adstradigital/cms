'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A simple Google Maps wrapper component.
 * Requires a Google Maps API Key. 
 */
export default function GoogleMap({ 
  lat, 
  lng, 
  zoom = 15, 
  markers = [], 
  apiKey = '', 
  height = '400px',
  onMarkerClick = () => {} 
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [googleObj, setGoogleObj] = useState(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadScript = () => {
      if (window.google && window.google.maps) {
        setGoogleObj(window.google);
        return;
      }

      if (document.getElementById('google-maps-script')) return;

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      window.initMap = () => {
        setGoogleObj(window.google);
      };

      document.head.appendChild(script);
    };

    if (apiKey) {
      loadScript();
    }
  }, [apiKey]);

  useEffect(() => {
    if (googleObj && mapRef.current && !map) {
      const instance = new googleObj.maps.Map(mapRef.current, {
        center: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
        zoom,
        styles: [
          {
            "featureType": "poi",
            "stylers": [{ "visibility": "off" }]
          }
        ]
      });
      setMap(instance);
    }
  }, [googleObj, map, lat, lng, zoom]);

  // Update markers
  useEffect(() => {
    if (!map || !googleObj) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach(pos => {
      const marker = new googleObj.maps.Marker({
        position: { lat: parseFloat(pos.latitude), lng: parseFloat(pos.longitude) },
        map,
        title: pos.title || 'Bus',
        icon: pos.isCurrent ? {
          path: googleObj.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#fff',
        } : undefined
      });

      marker.addListener('click', () => onMarkerClick(pos));
      markersRef.current.push(marker);
    });

  }, [map, googleObj, markers, onMarkerClick]);

  // Re-center when lat/lng changes
  useEffect(() => {
    if (map && lat && lng) {
      map.panTo({ lat: parseFloat(lat), lng: parseFloat(lng) });
    }
  }, [map, lat, lng]);

  if (!apiKey) {
    return (
      <div style={{ 
        height, 
        background: '#f1f5f9', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        borderRadius: 12,
        border: '1px dashed #cbd5e1',
        color: '#64748b'
      }}>
        <p>Google Maps API Key Missing</p>
        <p style={{ fontSize: '0.75rem' }}>Please provide a key in settings or component props.</p>
        <div style={{ marginTop: 12, fontWeight: 600 }}>
          Location: {lat}, {lng}
        </div>
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }} />;
}
