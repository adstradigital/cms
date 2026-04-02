'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AnalogClockFab.module.css';

const AnalogClockFab = ({ scale = 1 }) => {
  const [time, setTime] = useState(new Date());
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial position
  useEffect(() => {
    setPosition({ x: window.innerWidth - 90, y: window.innerHeight - 160 });
  }, []);

  // ── Drag handlers ──
  const handlePointerDown = useCallback((e) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    dragRef.current?.setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
    setPosition({
      x: Math.min(Math.max(35, dragStart.current.posX + dx), window.innerWidth - 35),
      y: Math.min(Math.max(35, dragStart.current.posY + dy), window.innerHeight - 35),
    });
  }, [isDragging]);

  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    dragRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  // ── Clock hand angles ──
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  if (position.x === null) return null;

  return (
    <div
      ref={dragRef}
      className={`${styles.clockFab} ${isDragging ? styles.dragging : ''}`}
      style={{ left: position.x, top: position.y, transform: `translate(-50%, -50%) scale(${scale})` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      title={time.toLocaleTimeString()}
    >
      {/* Clock face */}
      <svg viewBox="0 0 100 100" className={styles.clockSvg}>
        {/* Outer ring */}
        <circle cx="50" cy="50" r="48" className={styles.outerRing} />
        <circle cx="50" cy="50" r="44" className={styles.face} />

        {/* Minute tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const isMajor = i % 5 === 0;
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const outerR = 42;
          const innerR = isMajor ? 36 : 39;
          return (
            <line
              key={i}
              x1={50 + Math.cos(angle) * innerR}
              y1={50 + Math.sin(angle) * innerR}
              x2={50 + Math.cos(angle) * outerR}
              y2={50 + Math.sin(angle) * outerR}
              className={isMajor ? styles.tickMajor : styles.tickMinor}
            />
          );
        })}

        {/* Numbers: 12, 3, 6, 9 */}
        <text x="50" y="20" className={styles.number}>12</text>
        <text x="80" y="53" className={styles.number}>3</text>
        <text x="50" y="86" className={styles.number}>6</text>
        <text x="20" y="53" className={styles.number}>9</text>

        {/* Hour hand */}
        <line
          x1="50" y1="50"
          x2="50" y2="26"
          className={styles.hourHand}
          transform={`rotate(${hourDeg}, 50, 50)`}
        />

        {/* Minute hand */}
        <line
          x1="50" y1="50"
          x2="50" y2="18"
          className={styles.minuteHand}
          transform={`rotate(${minuteDeg}, 50, 50)`}
        />

        {/* Second hand */}
        <line
          x1="50" y1="55"
          x2="50" y2="14"
          className={styles.secondHand}
          transform={`rotate(${secondDeg}, 50, 50)`}
        />

        {/* Center dot */}
        <circle cx="50" cy="50" r="2.5" className={styles.centerDot} />
        <circle cx="50" cy="50" r="1.2" className={styles.centerDotInner} />
      </svg>
    </div>
  );
};

export default AnalogClockFab;
