'use client';

import React, { useState } from 'react';
import {
  PanelRight,
  X,
  Plus,
  Minus,
  Clock,
  CalendarDays,
  StickyNote,
  Zap,
  Maximize2,
  Minimize2,
  LayoutGrid,
} from 'lucide-react';
import styles from './WidgetDrawer.module.css';

/* ─── Widget Registry ─────────────────────────────────────── */
const WIDGET_CATALOG = [
  {
    id: 'quickAction',
    label: 'Quick Actions',
    icon: Zap,
    color: '#1e293b',
    description: 'Radial shortcut menu',
  },
  {
    id: 'analogClock',
    label: 'Analog Clock',
    icon: Clock,
    color: '#0ea5e9',
    description: 'Live analog clock',
  },
  {
    id: 'calendarDate',
    label: 'Calendar',
    icon: CalendarDays,
    color: '#ef4444',
    description: 'Today\'s date',
  },
  {
    id: 'stickyNote',
    label: 'Sticky Note',
    icon: StickyNote,
    color: '#f59e0b',
    description: 'Quick notepad',
  },
];

const SIZE_OPTIONS = [
  { key: 'sm', label: 'S' },
  { key: 'md', label: 'M' },
  { key: 'lg', label: 'L' },
];

/* ─── Component ───────────────────────────────────────────── */
const WidgetDrawer = ({ activeWidgets, onToggleWidget, widgetSizes, onResizeWidget }) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = Object.values(activeWidgets).filter(Boolean).length;

  return (
    <>
      {/* Toggle Tab — always visible on right edge */}
      <button
        className={`${styles.toggleTab} ${isOpen ? styles.toggleTabOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Widget Panel"
      >
        <LayoutGrid size={16} />
        {activeCount > 0 && (
          <span className={styles.countBadge}>{activeCount}</span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
      )}

      {/* Drawer Panel */}
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <LayoutGrid size={18} />
            <span>Widgets</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Active count summary */}
        <div className={styles.summary}>
          <span>{activeCount} of {WIDGET_CATALOG.length} active</span>
        </div>

        {/* Widget List */}
        <div className={styles.widgetList}>
          {WIDGET_CATALOG.map((widget) => {
            const isActive = activeWidgets[widget.id];
            const currentSize = widgetSizes?.[widget.id] || 'md';
            const Icon = widget.icon;

            return (
              <div
                key={widget.id}
                className={`${styles.widgetCard} ${isActive ? styles.widgetCardActive : ''}`}
              >
                <div className={styles.widgetCardTop}>
                  {/* Icon + Info */}
                  <div className={styles.widgetInfo}>
                    <div
                      className={styles.widgetIcon}
                      style={{ '--widget-color': widget.color }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className={styles.widgetLabel}>{widget.label}</div>
                      <div className={styles.widgetDesc}>{widget.description}</div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    className={`${styles.toggleBtn} ${isActive ? styles.toggleBtnActive : ''}`}
                    onClick={() => onToggleWidget(widget.id)}
                    aria-label={isActive ? 'Remove widget' : 'Add widget'}
                  >
                    {isActive ? <Minus size={14} /> : <Plus size={14} />}
                  </button>
                </div>

                {/* Size controls — only if active */}
                {isActive && (
                  <div className={styles.sizeControls}>
                    <span className={styles.sizeLabel}>Size</span>
                    <div className={styles.sizeButtons}>
                      {SIZE_OPTIONS.map((size) => (
                        <button
                          key={size.key}
                          className={`${styles.sizeBtn} ${
                            currentSize === size.key ? styles.sizeBtnActive : ''
                          }`}
                          onClick={() => onResizeWidget(widget.id, size.key)}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className={styles.footer}>
          Drag widgets to reposition
        </div>
      </div>
    </>
  );
};

export default WidgetDrawer;
