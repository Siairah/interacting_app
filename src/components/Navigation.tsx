"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "./NotificationBell";
import { getChatRooms } from "@/utils/chatApi";
import { getSocket } from "@/utils/socketAuth";
import styles from "./Navigation.module.css";

interface UserProfile {
  id?: string;
  fullName: string;
  email: string;
  profilePic?: string;
}

interface NavigationProps {
  isHidden?: boolean;
}

export default function Navigation({ isHidden = false }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadUser = async () => {
        // Use Socket.IO first, then fallback
        const { ensureAuth } = await import('@/utils/socketAuth');
        const { userData } = await ensureAuth();
        
        if (userData) {
          const userWithProfile = {
            ...userData,
            profilePic: userData.profilePic || userData.profile_pic || "/images/default_profile.png",
            fullName: userData.fullName || userData.full_name || "User"
          };
          setUser(userWithProfile);
          setUserId(userData.id || userData._id || null);
        } else {
          setUser(null);
          setUserId(null);
        }
      };
      
      loadUser();
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadUnreadCount = async () => {
      try {
        const rooms = await getChatRooms(userId);
        const totalUnread = rooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);
        setUnreadMessageCount(totalUnread);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (msg.room && msg.sender?.id !== userId) {
        setUnreadMessageCount((prev) => prev + 1);
      }
    };

    const handleUnreadUpdate = (data: { room_id: string; unread_count: number }) => {
      loadUnreadCount();
    };

    const handleGroupCreated = () => {
      loadUnreadCount();
    };

    const handleDMCreated = () => {
      loadUnreadCount();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('unread_update', handleUnreadUpdate);
    socket.on('group_created', handleGroupCreated);
    socket.on('dm_created', handleDMCreated);

    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('unread_update', handleUnreadUpdate);
      socket.off('group_created', handleGroupCreated);
      socket.off('dm_created', handleDMCreated);
      clearInterval(interval);
    };
  }, [userId, pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    if (typeof window !== "undefined") {
      // Clear tab-specific Socket.IO auth
      const { disconnectSocket } = await import('@/utils/socketAuth');
      disconnectSocket();
      
      // Clear tab-specific sessionStorage
      const tabId = sessionStorage.getItem('socket_tab_id');
      if (tabId) {
        sessionStorage.removeItem(`tab_auth_token_${tabId}`);
        sessionStorage.removeItem(`tab_user_id_${tabId}`);
        sessionStorage.removeItem(`tab_user_data_${tabId}`);
        sessionStorage.removeItem('socket_tab_id');
      }
      
      // Clear localStorage (for any fallback)
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
    }
    router.push("/");
  }

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className={`${styles.navbar} ${isHidden ? styles.navbarHidden : ''}`}>
      <div className={styles.navContainer}>
        <Link href="/dashboard" className={styles.navbarBrand}>
          <img src="/images/logo.png" alt="Chautari Logo" />
          <span>Chautari</span>
        </Link>

        <div className={styles.searchContainer}>
          <div className={styles.searchForm}>
            <input type="search" placeholder="Search..." />
            <button><i className="fas fa-search"></i></button>
          </div>
        </div>

        <ul className={styles.navbarNav}>
          <li className={styles.navItem}>
            <Link 
              href="/dashboard" 
              className={`${styles.navLink} ${isActive('/dashboard') ? styles.active : ''}`}
            >
              <i className="fas fa-home"></i>
              <span className={styles.menuName}>Home</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link 
              href="/chat" 
              className={`${styles.navLink} ${isActive('/chat') ? styles.active : ''}`}
            >
              <i className="fas fa-comment-dots"></i>
              <span className={styles.menuName}>Messenger</span>
              {unreadMessageCount > 0 && (
                <span className={styles.messageBadge}>{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
              )}
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link 
              href="/circles" 
              className={`${styles.navLink} ${isActive('/circles') ? styles.active : ''}`}
            >
              <i className="fas fa-users"></i>
              <span className={styles.menuName}>Communities</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link 
              href="#" 
              className={`${styles.navLink} ${isActive('/events') ? styles.active : ''}`}
            >
              <i className="fas fa-calendar-alt"></i>
              <span className={styles.menuName}>Events</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <NotificationBell userId={userId} />
          </li>
          <li className={`${styles.navItem} ${styles.dropdown} user-menu-container`}>
            <button 
              className={styles.navLink}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <i className="fas fa-bars"></i>
              <span className={styles.menuName}>Menu</span>
            </button>
            {showUserMenu && (
              <ul className={styles.dropdownMenu}>
                <li>
                  <Link href="/profile" className={styles.dropdownItem}>
                    <i className="fas fa-user"></i> Profile
                  </Link>
                </li>
                <li>
                  <Link href="/circles" className={styles.dropdownItem}>
                    <i className="fas fa-users"></i> Communities
                  </Link>
                </li>
                <li><hr className={styles.dropdownDivider} /></li>
                <li>
                  <button onClick={handleLogout} className={styles.dropdownItem}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

