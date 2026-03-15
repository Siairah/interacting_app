'use client';

import { useEffect } from 'react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

export default function ConfirmModal({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  confirmButtonClass = ''
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className={styles.overlay} 
      onClick={onCancel}
      onMouseDown={(e) => {
        // Prevent clicks from propagating to underlying modals
        e.stopPropagation();
      }}
    >
      <div 
        className={styles.modal} 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <p className={styles.message}>{message}</p>
          <div className={styles.buttons}>
            <button
              className={`${styles.button} ${styles.cancelButton}`}
              onClick={onCancel}
              type="button"
            >
              {cancelText}
            </button>
            <button
              className={`${styles.button} ${styles.confirmButton} ${confirmButtonClass}`}
              onClick={onConfirm}
              type="button"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

