'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Post } from './types';
import PostHeader from './PostHeader';
import PostMedia from './PostMedia';
import PostActions from './PostActions';
import CommentModal from './CommentModal';
import styles from './PostCard.module.css';

interface PostCardProps {
  post: Post;
  userId?: string | null;
  showComments?: boolean;
  onLike?: (postId: string) => void;
  onCommentAdded?: () => void;
  className?: string;
  customOptionsMenu?: React.ReactNode;
}

export default function PostCard({
  post,
  userId,
  showComments = false,
  onLike,
  onCommentAdded,
  className = '',
  customOptionsMenu
}: PostCardProps) {
  const router = useRouter();
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);

  const handleLike = async () => {
    if (!userId) return;
    
    if (onLike) {
      onLike(post.id);
    } else {
      // Default like handler
      try {
        // Use Socket.IO token for API call
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/toggle-like/${post.id}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ user_id: userId }),
        });

        const data = await response.json();
        if (data.success && onCommentAdded) {
          onCommentAdded();
        }
      } catch (error) {
        console.error('Error toggling like:', error);
      }
    }
  };

  return (
    <>
      <div className={`${styles.postCard} ${className}`}>
        <PostHeader 
          user={post.user}
          createdAt={post.created_at}
          circle={post.circle}
          showOptions={!customOptionsMenu}
        />
        {customOptionsMenu && (
          <div className={styles.customOptionsContainer}>
            {customOptionsMenu}
          </div>
        )}

        <p className={styles.postCaption}>{post.content}</p>

        {post.media_files && post.media_files.length > 0 && (
          <PostMedia 
            mediaFiles={post.media_files}
            postId={post.id}
          />
        )}

        <PostActions
          postId={post.id}
          likeCount={post.like_count}
          userLiked={post.user_liked}
          commentCount={post.comment_count}
          recentLikers={post.recent_likers || []}
          onLike={handleLike}
          onShowLikers={() => setShowLikersModal(true)}
          onCommentClick={() => {
            if (showComments) {
              // If on post detail page, show modal
              setShowCommentModal(true);
            } else {
              // If on dashboard/feed, open modal
              setShowCommentModal(true);
            }
          }}
        />

      </div>

      {/* Comment Modal */}
      <CommentModal
        post={post}
        comments={post.comments || []}
        userId={userId}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onCommentAdded={() => {
          if (onCommentAdded) {
            onCommentAdded();
          }
        }}
      />

      {/* Likers Modal */}
      {showLikersModal && post.recent_likers && (
        <div className={styles.modalOverlay} onClick={() => setShowLikersModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>People who liked this post</h5>
              <button 
                className={styles.modalClose}
                onClick={() => setShowLikersModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <ul className={styles.likerList}>
                {post.recent_likers.map(liker => (
                  <li key={liker.id} className={styles.likerItem}>
                    <img 
                      src={liker.profile_pic} 
                      alt="Profile" 
                      className={styles.likerPic}
                    />
                    <span>{liker.full_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

