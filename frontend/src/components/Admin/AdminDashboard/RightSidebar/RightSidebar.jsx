'use client';

import React, { useState } from 'react';
import {
  LayoutGrid,
  HelpCircle,
  Newspaper,
  Minus,
  Plus,
  Clock,
  CalendarDays,
  StickyNote,
  Zap,
  ChevronRight,
  X,
  MessageCircle
} from 'lucide-react';
import styles from './RightSidebar.module.css';

/* ─── Widget Catalog ─────────────────────────────────────── */
const WIDGET_CATALOG = [
  { id: 'quickAction', label: 'Quick Actions', icon: Zap, color: '#facc15', desc: 'Radial menu' },
  { id: 'analogClock', label: 'Analog Clock', icon: Clock, color: '#38bdf8', desc: 'Live clock' },
  { id: 'calendarDate', label: 'Calendar', icon: CalendarDays, color: '#f87171', desc: 'Today date' },
  { id: 'stickyNote', label: 'Sticky Note', icon: StickyNote, color: '#fb923c', desc: 'Notepad' },
  { id: 'quickChat', label: 'Quick Chat', icon: MessageCircle, color: '#a855f7', desc: 'Floating chat' },
];

const SIZE_OPTIONS = [
  { key: 'sm', label: 'S' },
  { key: 'md', label: 'M' },
  { key: 'lg', label: 'L' },
];

/* ─── Sections ────────────────────────────────────────────── */
const SECTIONS = [
  { id: 'widgets', label: 'Widgets', icon: LayoutGrid },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'news', label: 'Updates', icon: Newspaper },
];

const RightSidebar = ({ activeWidgets, onToggleWidget, widgetSizes, onResizeWidget }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('widgets');

  const activeCount = Object.values(activeWidgets).filter(Boolean).length;

  return (
    <>
      {/* Small Floating Edge Toggle (Smart Sidebar style) */}
      <button
        className={`${styles.smartToggle} ${isOpen ? styles.smartToggleHidden : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <div className={styles.toggleBar} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
      )}

      {/* Dark Glassmorphism Sidebar */}
      <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        
        {/* Top Control Bar */}
        <div className={styles.sidebarHeader}>
          <div className={styles.brandGroup}>
            <div className={styles.brandDot} style={{ background: '#f87171' }} />
            <div className={styles.brandDot} style={{ background: '#facc15' }} />
            <div className={styles.brandDot} style={{ background: '#4ade80' }} />
          </div>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Section Navigation */}
        <div className={styles.navMenu}>
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                className={`${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <div className={styles.navIconBox}>
                  <Icon size={16} />
                </div>
                <span>{sec.label}</span>
                {isActive && <ChevronRight size={14} className={styles.navChevron} />}
              </button>
            );
          })}
        </div>

        <div className={styles.divider} />

        {/* Section Content Area */}
        <div className={styles.contentArea}>
          {activeSection === 'widgets' && (
            <div className={styles.widgetSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Dashboard Widgets</span>
                <span className={styles.sectionBadge}>{activeCount} Active</span>
              </div>

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
                        <div className={styles.widgetInfo}>
                          <div className={styles.widgetIcon} style={{ '--w-color': widget.color }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className={styles.widgetLabel}>{widget.label}</div>
                            <div className={styles.widgetDesc}>{widget.desc}</div>
                          </div>
                        </div>

                        <button
                          className={`${styles.toggleActionBtn} ${isActive ? styles.toggleActionBtnRemove : ''}`}
                          onClick={() => onToggleWidget(widget.id)}
                        >
                          {isActive ? <Minus size={14} /> : <Plus size={14} />}
                        </button>
                      </div>

                      {/* Glassmorphic size controls */}
                      {isActive && (
                        <div className={styles.sizeControls}>
                          <span className={styles.sizeTitle}>SIZE</span>
                          <div className={styles.sizeOptions}>
                            {SIZE_OPTIONS.map((size) => (
                              <button
                                key={size.key}
                                className={`${styles.sizeBtn} ${currentSize === size.key ? styles.sizeBtnActive : ''}`}
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
            </div>
          )}

          {activeSection === 'faq' && (
            <div className={styles.placeholderSection}>
              <HelpCircle size={32} opacity={0.5} />
              <p>FAQ Content Coming Soon</p>
            </div>
          )}

          {activeSection === 'news' && (
            <div className={styles.placeholderSection}>
              <Newspaper size={32} opacity={0.5} />
              <p>News & Updates Coming Soon</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RightSidebar;
