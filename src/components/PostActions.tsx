'use client';

import { PostLiker } from './types';
import styles from './PostActions.module.css';

interface PostActionsProps {
  postId: string;
  likeCount: number;
  userLiked: boolean;
  commentCount: number;
  recentLikers?: PostLiker[];
  onLike: () => void;
  onShowLikers?: () => void;
  onCommentClick?: () => void;
}

export default function PostActions({
  likeCount,
  userLiked,
  commentCount,
  recentLikers = [],
  onLike,
  onShowLikers,
  onCommentClick
}: PostActionsProps) {
  return (
    <>
      <div className={styles.postActions}>
        <button 
          className={styles.likeBtn} 
          onClick={onLike}
        >
          {userLiked ? (
            <i className="fas fa-heart" style={{ color: '#dc3545' }}></i>
          ) : (
            <i className="far fa-heart"></i>
          )}
          <span className={styles.likeCount}>{likeCount}</span>
        </button>
        <button 
          className={styles.commentBtn} 
          onClick={onCommentClick}
        >
          <i className="far fa-comment"></i>
          <span className={styles.commentCount}>{commentCount}</span>
        </button>
      </div>

      {recentLikers.length > 0 && onShowLikers && (
        <button 
          className={styles.likerNames}
          onClick={onShowLikers}
        >
          {recentLikers.slice(0, 3).map((liker, index) => (
            <span key={liker.id}>
              {liker.full_name}
              {index < Math.min(recentLikers.length, 3) - 1 && ', '}
            </span>
          ))}
          {likeCount > 3 && ` and ${likeCount - 3} others`}
        </button>
      )}
    </>
  );
}

