'use client';

import { useEffect } from 'react';
import styles from './Toast.module.css';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export default function ToastComponent({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
        return 'fas fa-info-circle';
      default:
        return 'fas fa-info-circle';
    }
  };

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <div className={styles.toastContent}>
        <i className={getIcon()}></i>
        <span className={styles.toastMessage}>{toast.message}</span>
        <button
          className={styles.toastClose}
          onClick={() => onClose(toast.id)}
          aria-label="Close"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className={styles.toastProgress}></div>
    </div>
  );
}

