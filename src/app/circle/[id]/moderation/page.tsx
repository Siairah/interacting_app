'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './moderation.module.css';

interface ModerationAction {
  id: string;
  type: 'approve' | 'reject' | 'warn' | 'restrict' | 'ban' | 'unban';
  target_user: {
    id: string;
    full_name: string;
    profile_pic: string | null;
  };
  admin: {
    id: string;
    full_name: string;
    profile_pic: string | null;
  };
  reason?: string;
  created_at: string;
}

interface Circle {
  id: string;
  name: string;
}

export default function ModerationHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.id as string;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    setUserId(storedUserId);
    
    // For now, just fetch basic circle info
    fetchCircleInfo();
  }, [circleId]);

  const fetchCircleInfo = async () => {
    try {
      const response = await fetch(`http://localhost:5000/circle-details/${circleId}`);
      const data = await response.json();

      if (data.success) {
        setCircle({
          id: data.circle.id,
          name: data.circle.name
        });
      }
    } catch (error) {
      console.error('Error fetching circle info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading moderation history...</p>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className={styles.errorContainer}>
        <h2>Circle Not Found</h2>
        <Link href="/circles" className={styles.backBtn}>
          Back to Circles
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href={`/circle/${circleId}`} className={styles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Circle
          </Link>
          <h2 className={styles.pageTitle}>Moderation History - {circle.name}</h2>
          <Link href="/dashboard" className={styles.homeButton}>
            <i className="fas fa-home"></i>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.comingSoon}>
          <i className="fas fa-hard-hat"></i>
          <h2>Moderation History</h2>
          <p>This feature is under development. Soon you'll be able to view:</p>
          <ul>
            <li>All moderation actions taken in this circle</li>
            <li>Admin warnings issued</li>
            <li>User restrictions and bans</li>
            <li>Post approvals and rejections</li>
            <li>Timeline of all moderation activities</li>
          </ul>
          <div className={styles.actionButtons}>
            <Link href={`/circle/${circleId}/manage`} className={styles.primaryBtn}>
              <i className="fas fa-users-cog"></i> Manage Circle
            </Link>
            <Link href={`/circle/${circleId}`} className={styles.secondaryBtn}>
              <i className="fas fa-arrow-left"></i> Back to Circle
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

