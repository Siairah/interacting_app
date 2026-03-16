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
              <video 
                src={media.file} 
                controls 
                className={styles.postMedia}
                preload="metadata"
                playsInline
                style={{ borderRadius: '12px' }}
                onError={(e) => {
                  console.error('Video load error:', e);
                  const target = e.target as HTMLVideoElement;
                  target.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.innerHTML = '<p style="padding: 20px; color: #999;">Unable to load video</p>';
                  target.parentElement?.appendChild(errorDiv);
                }}
              >
                <source src={media.file} type="video/mp4" />
                <source src={media.file} type="video/webm" />
                <source src={media.file} type="video/ogg" />
                Your browser does not support the video tag.
              </video>
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

