'use client';

import React from 'react';

const ConfirmDialog = ({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, loading }) => {
  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 420, background: 'var(--theme-surface)', border: '1px solid var(--theme-border)', borderRadius: 16, padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: 'var(--theme-text-muted)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onCancel} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--theme-border)' }}> {cancelText} </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#dc2626', color: 'white' }}>
            {loading ? 'Working...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
