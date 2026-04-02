import styles from './Card.module.css';

/**
 * Reusable Card component
 */
export default function Card({
  children,
  title,
  subtitle,
  padding = true,
  hoverable = false,
  className = '',
  ...props
}) {
  const classes = [
    styles.card,
    padding ? styles.padded : '',
    hoverable ? styles.hoverable : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
