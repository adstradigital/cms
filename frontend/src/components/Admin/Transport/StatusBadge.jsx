'use client';

import styles from './transport.module.css';

const TONE_MAP = {
  paid: 'good', active: 'good', resolved: 'good', closed: 'good', on_time: 'good',
  partial: 'warn', in_progress: 'warn', maintenance: 'warn', delayed: 'warn',
  overdue: 'danger', inactive: 'danger', not_started: 'danger', urgent: 'danger', high: 'danger',
  medium: 'warn', low: 'neutral',
};

export default function StatusBadge({ value, label }) {
  const tone = TONE_MAP[value] || 'neutral';
  const cls = {
    good: styles.badgeGood,
    warn: styles.badgeWarn,
    danger: styles.badgeDanger,
    neutral: styles.badgeNeutral,
  }[tone];

  return (
    <span className={`${styles.badge} ${cls}`}>
      {label || (value || '').replace(/_/g, ' ')}
    </span>
  );
}
