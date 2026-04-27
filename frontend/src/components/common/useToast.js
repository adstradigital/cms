'use client';

import React, { useCallback, useState } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', ttl = 2600) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);

  return { toasts, push, dismiss };
};

export const ToastStack = ({ toasts, dismiss }) => {
  if (!toasts?.length) return null;
  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10000 }}>
      {toasts.map((t) => (
        <div key={t.id} onClick={() => dismiss(t.id)} style={{ padding: '10px 12px', borderRadius: 10, color: 'white', cursor: 'pointer', background: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#16a34a' : '#2563eb', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
          {t.message}
        </div>
      ))}
    </div>
  );
};
