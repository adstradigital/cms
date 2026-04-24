'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A simple Map wrapper component.
 * Uses Google Maps if API key provided, otherwise falls back to Leaflet for smooth moving tracking.
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

  // Leaflet refs
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);

  // --- Google Maps Logic ---
  useEffect(() => {
    if (!apiKey) return;
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
      window.initMap = () => { setGoogleObj(window.google); };
      document.head.appendChild(script);
    };
    loadScript();
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) return;
    if (googleObj && mapRef.current && !map) {
      const instance = new googleObj.maps.Map(mapRef.current, {
        center: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
        zoom,
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
      });
      setMap(instance);
    }
  }, [googleObj, map, lat, lng, zoom, apiKey]);

  useEffect(() => {
    if (!apiKey || !map || !googleObj) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

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
  }, [map, googleObj, markers, onMarkerClick, apiKey]);

  useEffect(() => {
    if (!apiKey) return;
    if (map && lat && lng) {
      map.panTo({ lat: parseFloat(lat), lng: parseFloat(lng) });
    }
  }, [map, lat, lng, apiKey]);


  // --- Leaflet Logic ---
  const leafletMarkersRef = useRef({});
  const leafletTrailsRef = useRef({});

  useEffect(() => {
    if (apiKey) return;
    if (typeof window === 'undefined') return;

    const initLeaflet = () => {
      const L = window.L;
      if (!L) return;

      const currentLat = parseFloat(lat) || 0;
      const currentLng = parseFloat(lng) || 0;

      if (!leafletMapRef.current && mapRef.current) {
        leafletMapRef.current = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true
        }).setView([currentLat || 11.25, currentLng || 75.78], zoom);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(leafletMapRef.current);
        
        L.control.zoom({ position: 'bottomright' }).addTo(leafletMapRef.current);
      }

      if (leafletMapRef.current && markers && markers.length > 0) {
        const currentMarkerIds = new Set();
        const busColors = ['#1a73e8', '#ea4335', '#fbbc05', '#34a853', '#ff6d00', '#46bdc6', '#7b1fa2', '#c2185b'];
        const bounds = L.latLngBounds();

        markers.forEach((m, index) => {
          if (!m.latitude || !m.longitude) return;
          const id = String(m.id || m.title || index);
          currentMarkerIds.add(id);
          const pos = [parseFloat(m.latitude), parseFloat(m.longitude)];
          bounds.extend(pos);
          
          const colorIndex = (typeof m.id === 'number' ? m.id : index) % busColors.length;
          const busColor = busColors[colorIndex];
          const zIndex = m.isCurrent ? 1000 : 500;

          // 1. Manage Polyline Trail (Subtle history)
          if (!leafletTrailsRef.current[id]) {
            leafletTrailsRef.current[id] = L.polyline([pos], {
              color: busColor,
              weight: 3,
              opacity: 0.3,
              dashArray: '5, 10'
            }).addTo(leafletMapRef.current);
          } else {
            const poly = leafletTrailsRef.current[id];
            const currentPath = poly.getLatLngs();
            // Keep last 20 points
            if (currentPath.length > 0) {
              const lastPoint = currentPath[currentPath.length - 1];
              if (lastPoint.lat !== pos[0] || lastPoint.lng !== pos[1]) {
                currentPath.push(pos);
                if (currentPath.length > 20) currentPath.shift();
                poly.setLatLngs(currentPath);
              }
            }
          }

          // 2. Marker HTML
          const markerHtml = `
            <div class="marker-shell" style="transition: all 5s linear; transform-origin: center;">
              <div class="${!m.isOffline ? 'pulse' : ''}" style="width: 38px; height: 38px; background: ${busColor}; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; position: relative;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                   <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
                </svg>
              </div>
              <style>
                @keyframes markerPulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
                .pulse::after { content: ''; position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${busColor}; z-index: -1; animation: markerPulse 2s infinite; }
              </style>
            </div>
          `;

          const icon = L.divIcon({
            html: markerHtml,
            className: 'custom-icon',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
          });

          const popupHtml = `
            <div style="padding: 10px; min-width: 220px; font-family: 'Inter', sans-serif;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                <span style="font-weight: 800; color: #1e293b;">${m.title}</span>
                <span style="font-size: 0.6rem; color: #10b981; font-weight: 700;">LIVE</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.75rem; color: #64748b;">
                <div><strong style="color: #475569;">Route:</strong> ${m.route || 'N/A'}</div>
                <div><strong style="color: #475569;">Driver:</strong> ${m.driver || 'N/A'}</div>
                <div><strong style="color: #475569;">Speed:</strong> ${m.speed || 0} km/h</div>
                <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 4px;">Last Ping: ${m.lastSeen ? new Date(m.lastSeen).toLocaleTimeString() : 'Just now'}</div>
              </div>
            </div>
          `;

          if (leafletMarkersRef.current[id]) {
            leafletMarkersRef.current[id].setLatLng(pos);
            leafletMarkersRef.current[id].setIcon(icon);
            leafletMarkersRef.current[id].getPopup().setContent(popupHtml);
          } else {
            const marker = L.marker(pos, { icon, zIndexOffset: zIndex }).addTo(leafletMapRef.current);
            marker.bindPopup(popupHtml, { className: 'modern-popup', offset: [0, -10] });
            marker.on('click', () => onMarkerClick(m));
            leafletMarkersRef.current[id] = marker;
          }
        });

        // 3. Auto-fit if requested (e.g. on first load with markers)
        if (markers.length > 1 && !lat && !lng) {
            leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
        } else if (currentLat && currentLng) {
            leafletMapRef.current.panTo([currentLat, currentLng]);
        }
      }
    };

    if (!window.L) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-script')) {
        const script = document.createElement('script');
        script.id = 'leaflet-script';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = initLeaflet;
        document.head.appendChild(script);
      }
    } else {
      initLeaflet();
    }
  }, [apiKey, lat, lng, zoom, markers, onMarkerClick]);

  // Cleanup Leaflet on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', zIndex: 1 }} />;
}
