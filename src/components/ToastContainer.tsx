'use client';

import { useState, useCallback } from 'react';
import Toast, { Toast as ToastType } from './Toast';
import styles from './ToastContainer.module.css';

let toastIdCounter = 0;
let addToastFn: ((toast: Omit<ToastType, 'id'>) => void) | null = null;

export function showToast(message: string, type: ToastType['type'] = 'info', duration?: number) {
  if (addToastFn) {
    addToastFn({ message, type, duration });
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const addToast = useCallback((toast: Omit<ToastType, 'id'>) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Set the global function
  if (typeof window !== 'undefined') {
    addToastFn = addToast;
  }

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}

