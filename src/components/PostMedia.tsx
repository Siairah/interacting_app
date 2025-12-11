'use client';

import { useState } from 'react';
import { PostMedia as PostMediaType } from './types';
import styles from './PostMedia.module.css';

interface PostMediaProps {
  mediaFiles: PostMediaType[];
  postId: string;
}

export default function PostMedia({ mediaFiles, postId }: PostMediaProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + mediaFiles.length) % mediaFiles.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % mediaFiles.length);
  };

  const handleIndicatorClick = (index: number) => {
    setActiveIndex(index);
  };

  if (!mediaFiles || mediaFiles.length === 0) return null;

  return (
    <div className={styles.mediaContainer}>
      <div className={styles.postMediaCarousel} id={`carousel-${postId}`}>
        {mediaFiles.map((media, index) => (
          <div 
            key={index} 
            className={`${styles.carouselItem} ${index === activeIndex ? styles.active : ''}`}
          >
            {media.type === 'video' ? (
              <div className={styles.videoPlaceholder} style={{ width: '100%', maxHeight: '400px', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: '12px' }}>
                <i className="fas fa-video" style={{ fontSize: '48px', color: '#999', marginBottom: '10px' }}></i>
                <p style={{ color: '#999' }}>Video playback not supported</p>
              </div>
            ) : (
              <img src={media.file} alt="Post Media" className={styles.postMedia} />
            )}
          </div>
        ))}
      </div>

      {mediaFiles.length > 1 && (
        <div className={styles.carouselControls}>
          <button 
            className={styles.carouselPrev}
            onClick={handlePrev}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <button 
            className={styles.carouselNext}
            onClick={handleNext}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          <div className={styles.carouselIndicators}>
            {mediaFiles.map((_, index) => (
              <span 
                key={index}
                className={`${styles.indicator} ${index === activeIndex ? styles.active : ''}`}
                onClick={() => handleIndicatorClick(index)}
              ></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

