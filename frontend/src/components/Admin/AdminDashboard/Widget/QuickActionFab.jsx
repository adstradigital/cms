'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, UserPlus, BookOpen, Bell, FileText, Calendar, DollarSign } from 'lucide-react';
import styles from './QuickActionFab.module.css';

const QUICK_ACTIONS = [
  { id: 'add-student', label: 'Add Student', icon: UserPlus, color: '#0ea5e9' },
  { id: 'add-subject', label: 'Add Subject', icon: BookOpen, color: '#8b5cf6' },
  { id: 'notification', label: 'Notification', icon: Bell, color: '#f59e0b' },
  { id: 'report', label: 'Report', icon: FileText, color: '#10b981' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, color: '#ec4899' },
  { id: 'fee', label: 'Collect Fee', icon: DollarSign, color: '#6366f1' },
];

const QuickActionFab = ({ onAction, scale = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);

  // Initialize position on mount — currently empty to favor CSS defaults
  useEffect(() => {
    // We let CSS (right: 30px, bottom: 30px) handle the initial state
    // only update if we have a saved position or specific requirement
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.target.closest(`.${styles.actionItem}`)) return;

    // Capture current actual position if it's still null (driven by CSS defaults)
    let curX = position.x;
    let curY = position.y;

    if (curX === null || curY === null) {
      const container = dragRef.current?.closest(`.${styles.fabContainer}`);
      const rect = container?.getBoundingClientRect();
      if (rect) {
        curX = rect.left + rect.width / 2;
        curY = rect.top + rect.height / 2;
        setPosition({ x: curX, y: curY });
      }
    }

    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: curX || 0,
      posY: curY || 0,
    };
    dragRef.current?.setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true;
    }

    const newX = Math.min(Math.max(28, dragStart.current.posX + dx), window.innerWidth - 28);
    const newY = Math.min(Math.max(28, dragStart.current.posY + dy), window.innerHeight - 28);
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    dragRef.current?.releasePointerCapture(e.pointerId);

    if (!hasMoved.current) {
      setIsOpen((prev) => !prev);
    }
  }, []);

  const handleActionClick = (actionId) => {
    setIsOpen(false);
    onAction?.(actionId);
  };

  return (
    <>
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
      )}

      <div
        className={styles.fabContainer}
        style={{ 
          ...(position.x !== null ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : {}),
          transform: `translate(-50%, -50%) scale(${scale})` 
        }}
      >
        {/* Action items radial menu */}
        <div className={`${styles.actionsRing} ${isOpen ? styles.actionsRingOpen : ''}`}>
          {QUICK_ACTIONS.map((action, index) => {
            const angle = -90 + (index * 360) / QUICK_ACTIONS.length;
            const rad = (angle * Math.PI) / 180;
            const radius = 85;
            const tx = Math.cos(rad) * radius;
            const ty = Math.sin(rad) * radius;
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                className={styles.actionItem}
                style={{
                  '--tx': `${tx}px`,
                  '--ty': `${ty}px`,
                  '--delay': `${index * 40}ms`,
                  '--action-color': action.color,
                }}
                onClick={() => handleActionClick(action.id)}
                title={action.label}
              >
                <Icon size={18} />
                <span className={styles.actionTooltip}>{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main FAB button */}
        <button
          ref={dragRef}
          className={`${styles.fab} ${isOpen ? styles.fabOpen : ''} ${isDragging ? styles.fabDragging : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label="Quick Actions"
        >
          {isOpen ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>
    </>
  );
};

export default QuickActionFab;
