'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ReasonModal.module.css';

interface ReasonModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  maxLength?: number;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'restrict' | 'ban';
}

export default function ReasonModal({
  isOpen,
  title,
  placeholder = 'Enter reason...',
  maxLength = 255,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'restrict',
}: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (reason.trim()) {
      console.log('ReasonModal: Calling onConfirm with reason:', reason.trim());
      onConfirm(reason.trim());
      setReason('');
    } else {
      console.warn('ReasonModal: Reason is empty, not calling onConfirm');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <i className={`fas ${type === 'ban' ? 'fa-ban' : 'fa-user-clock'}`}></i>
            {title}
          </h3>
          <button className={styles.closeBtn} onClick={onCancel} aria-label="Close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className={styles.body}>
          <label className={styles.label}>
            Reason <span className={styles.required}>*</span>
          </label>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={4}
          />
          <div className={styles.charCount}>
            {reason.length} / {maxLength} characters
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`${styles.confirmBtn} ${type === 'ban' ? styles.danger : ''}`}
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

