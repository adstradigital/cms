'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './CalendarDateFab.module.css';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const CalendarDateFab = ({ scale = 1 }) => {
  const now = new Date();
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const fabRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  useEffect(() => {
    setPosition({ x: window.innerWidth - 90, y: window.innerHeight - 300 });
  }, []);

  const handlePointerDown = useCallback((e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    fabRef.current?.setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: Math.min(Math.max(30, dragStart.current.posX + dx), window.innerWidth - 30),
      y: Math.min(Math.max(30, dragStart.current.posY + dy), window.innerHeight - 30),
    });
  }, [isDragging]);

  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    fabRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  if (position.x === null) return null;

  return (
    <div
      ref={fabRef}
      className={`${styles.calFab} ${isDragging ? styles.dragging : ''}`}
      style={{ left: position.x, top: position.y, transform: `translate(-50%, -50%) scale(${scale})` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      title={now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    >
      <div className={styles.monthBar}>{MONTHS[now.getMonth()]}</div>
      <div className={styles.dateNum}>{now.getDate()}</div>
      <div className={styles.dayName}>{DAYS[now.getDay()]}</div>
    </div>
  );
};

export default CalendarDateFab;
