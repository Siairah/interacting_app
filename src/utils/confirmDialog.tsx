'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import ConfirmModal from '@/components/ConfirmModal';

export function confirmDialog(
  message: string,
  confirmText: string = 'OK',
  cancelText: string = 'Cancel',
  confirmButtonClass: string = ''
): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleConfirm = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(true);
    };

    const handleCancel = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(false);
    };

    root.render(
      React.createElement(ConfirmModal, {
        isOpen: true,
        message: message,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
        confirmText: confirmText,
        cancelText: cancelText,
        confirmButtonClass: confirmButtonClass
      })
    );
  });
}

