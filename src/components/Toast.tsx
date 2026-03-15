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
        return 'fas fa-times-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
        return 'fas fa-info-circle';
      default:
        return 'fas fa-info-circle';
    }
  };

  return (
    <div 
      className={`${styles.toast} ${styles[toast.type]}`}
      onClick={(e) => {
        // Don't close if clicking the close button or icon
        const target = e.target as HTMLElement;
        if (target.closest(`.${styles.toastClose}`) || target.closest(`.${styles.toastIcon}`)) {
          return;
        }
        onClose(toast.id);
      }}
    >
      <div className={styles.toastContent}>
        <div className={styles.toastIcon}>
          <i className={getIcon()}></i>
        </div>
        <span className={styles.toastMessage}>{toast.message}</span>
        <button
          className={styles.toastClose}
          onClick={(e) => {
            e.stopPropagation();
            onClose(toast.id);
          }}
          aria-label="Close notification"
          type="button"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className={styles.toastProgress}>
        <div className={styles.toastProgressBar}></div>
      </div>
    </div>
  );
}
