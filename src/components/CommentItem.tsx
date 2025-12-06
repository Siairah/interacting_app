'use client';

import { useRouter } from 'next/navigation';
import { PostComment } from './types';
import styles from './CommentItem.module.css';

interface CommentItemProps {
  comment: PostComment;
}

export default function CommentItem({ comment }: CommentItemProps) {
  const router = useRouter();

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className={styles.comment}>
      <button 
        className={styles.commentPicContainer}
        onClick={() => router.push(`/profile/${comment.user.id}`)}
      >
        <img 
          src={comment.user.profile_pic || '/images/default_profile.png'} 
          alt="Profile" 
          className={styles.commentPic}
        />
      </button>
      <div className={styles.commentBody}>
        <button 
          className={styles.commentUsername}
          onClick={() => router.push(`/profile/${comment.user.id}`)}
        >
          {comment.user.full_name}
        </button>
        <p className={styles.commentText}>{comment.content}</p>
        <p className={styles.commentTime}>{formatTimeAgo(comment.created_at)}</p>
      </div>
    </div>
  );
}

