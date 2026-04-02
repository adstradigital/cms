import { forwardRef } from 'react';
import styles from './Input.module.css';

/**
 * Reusable Input component
 */
const Input = forwardRef(function Input(
  {
    label,
    type = 'text',
    error,
    helperText,
    fullWidth = false,
    className = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={`${styles.input} ${error ? styles.error : ''}`}
        {...props}
      />
      {(error || helperText) && (
        <span className={error ? styles.errorText : styles.helperText}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

export default Input;
