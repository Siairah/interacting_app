'use client';

import { useRouter } from 'next/navigation';
import { PostUser, PostCircle } from './types';
import styles from './PostHeader.module.css';

interface PostHeaderProps {
  user: PostUser;
  createdAt: string;
  circle?: PostCircle | null;
  showOptions?: boolean;
  onOptionsClick?: () => void;
}

export default function PostHeader({
  user,
  createdAt,
  circle,
  showOptions = true,
  onOptionsClick
}: PostHeaderProps) {
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
    <div className={styles.postHeader}>
      <div className={styles.userInfo}>
        <button 
          type="button"
          className={styles.profilePicButton}
          onClick={() => router.push(`/profile/${user.id}`)}
        >
          <img 
            src={user.profile_pic || '/images/default_profile.png'} 
            alt="Profile" 
            className={styles.profilePic}
          />
        </button>
        <div>
          <button 
            type="button"
            className={styles.userNameButton}
            onClick={() => router.push(`/profile/${user.id}`)}
          >
            <h5 className={styles.userName}>{user.full_name}</h5>
          </button>
          <p className={styles.postDate}>{formatTimeAgo(createdAt)}</p>
          {circle && (
            <span className={styles.postCircle}>
              <button 
                onClick={() => router.push(`/circle/${circle.id}`)}
                className={styles.circleLink}
              >
                <i className="fas fa-users"></i> {circle.name}
              </button>
            </span>
          )}
        </div>
      </div>
      {showOptions && (
        <div className={styles.postOptions}>
          <button onClick={onOptionsClick} className={styles.optionsButton}>
            <i className="fas fa-ellipsis-h"></i>
          </button>
        </div>
      )}
    </div>
  );
}

