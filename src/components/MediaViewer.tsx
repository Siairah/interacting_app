'use client';

import { useEffect } from 'react';
import styles from './MediaViewer.module.css';

interface MediaViewerProps {
  media: { url: string; type: 'image' | 'video' };
  onClose: () => void;
}

export default function MediaViewer({ media, onClose }: MediaViewerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className={styles.mediaViewerModal} onClick={onClose}>
      <div className={styles.mediaViewerContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeMediaViewer} onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        <div className={styles.mediaContainer}>
          {media.type === 'video' ? (
            <video 
              src={media.url} 
              controls 
              preload="metadata"
              playsInline
              style={{ 
                maxWidth: '90vw', 
                maxHeight: '90vh', 
                width: 'auto', 
                height: 'auto',
                borderRadius: '12px',
                backgroundColor: '#000'
              }}
              onError={(e) => {
                console.error('Video load error in MediaViewer:', e);
              }}
            >
              <source src={media.url} type="video/mp4" />
              <source src={media.url} type="video/webm" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              id="full-size-image"
              src={media.url}
              alt="Full size"
              className={styles.fullSizeMedia}
            />
          )}
        </div>
      </div>
    </div>
  );
}

