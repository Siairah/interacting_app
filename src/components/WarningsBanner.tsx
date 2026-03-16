'use client';

import { useState, useEffect } from 'react';
import { showToast } from './ToastContainer';
import styles from './WarningsBanner.module.css';

interface Warning {
  id: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
}

interface WarningsBannerProps {
  circleId: string;
  userId: string | null;
}

export default function WarningsBanner({ circleId, userId }: WarningsBannerProps) {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && circleId) {
      fetchWarnings();
    }
  }, [userId, circleId]);

  const fetchWarnings = async () => {
    if (!userId || !circleId) return;

    try {
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/notifications/warnings/${circleId}?user_id=${userId}`);
      
      if (response.ok) {
        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          setWarnings(data.warnings || []);
        }
      }
    } catch (error) {
      console.error('Error fetching warnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (warningId: string) => {
    if (!userId) return;

    try {
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/notifications/acknowledge-warning/${warningId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: userId })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      
      if (data.success) {
        showToast('Warning acknowledged', 'success');
        // Remove acknowledged warning from list
        setWarnings(prev => prev.filter(w => w.id !== warningId));
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        showToast(sanitizeErrorMessage(data.message || 'Failed to acknowledge warning'), 'error');
      }
    } catch (error) {
      console.error('Error acknowledging warning:', error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      showToast('Failed to acknowledge warning: ' + sanitizeErrorMessage(error), 'error');
    }
  };

  const unacknowledgedWarnings = warnings.filter(w => !w.acknowledged);

  if (loading || unacknowledgedWarnings.length === 0) {
    return null;
  }

  return (
    <div className={styles.warningsBanner}>
      <div className={styles.warningHeader}>
        <i className="fas fa-exclamation-triangle"></i>
        <strong>Community Guidelines Warning</strong>
      </div>
      {unacknowledgedWarnings.map((warning) => (
        <div key={warning.id} className={styles.warningItem}>
          <div className={styles.warningMessage}>
            <p>{warning.message}</p>
            <small>{new Date(warning.created_at).toLocaleDateString()}</small>
          </div>
          <button
            className={styles.acknowledgeBtn}
            onClick={() => handleAcknowledge(warning.id)}
            title="Acknowledge and dismiss"
          >
            <i className="fas fa-check"></i> Acknowledge
          </button>
        </div>
      ))}
    </div>
  );
}

