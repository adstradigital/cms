'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StickyNote, X, Save } from 'lucide-react';
import styles from './StickyNoteFab.module.css';

const StickyNoteFab = ({ scale = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const fabRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);

  // Load saved note
  useEffect(() => {
    const saved = localStorage.getItem('admin_sticky_note');
    if (saved) setNote(saved);
    setPosition({ x: window.innerWidth - 90, y: window.innerHeight - 230 });
  }, []);

  // Auto-save
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('admin_sticky_note', note);
    }, 500);
    return () => clearTimeout(timeout);
  }, [note]);

  // ── Drag handlers ──
  const handlePointerDown = useCallback((e) => {
    if (e.target.closest(`.${styles.notePanel}`)) return;
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    fabRef.current?.setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
    setPosition({
      x: Math.min(Math.max(30, dragStart.current.posX + dx), window.innerWidth - 30),
      y: Math.min(Math.max(30, dragStart.current.posY + dy), window.innerHeight - 30),
    });
  }, [isDragging]);

  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    fabRef.current?.releasePointerCapture(e.pointerId);
    if (!hasMoved.current) setIsOpen((prev) => !prev);
  }, []);

  if (position.x === null) return null;

  return (
    <>
      <div
        className={styles.fabWrapper}
        style={{ left: position.x, top: position.y, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {/* Note Panel */}
        {isOpen && (
          <div className={styles.notePanel}>
            <div className={styles.notePanelHeader}>
              <span>📝 Quick Note</span>
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <textarea
              className={styles.noteTextarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jot something down..."
              rows={5}
            />
            <div className={styles.notePanelFooter}>
              <Save size={12} />
              <span>Auto-saved</span>
            </div>
          </div>
        )}

        {/* FAB Button */}
        <button
          ref={fabRef}
          className={`${styles.fab} ${isOpen ? styles.fabOpen : ''} ${isDragging ? styles.dragging : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label="Sticky Note"
        >
          <StickyNote size={22} />
          {note.length > 0 && !isOpen && <span className={styles.badge} />}
        </button>
      </div>
    </>
  );
};

export default StickyNoteFab;
