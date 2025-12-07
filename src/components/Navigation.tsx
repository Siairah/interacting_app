"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "./NotificationBell";
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
              href="/messenger" 
              className={`${styles.navLink} ${isActive('/messenger') ? styles.active : ''}`}
            >
              <i className="fas fa-comment-dots"></i>
              <span className={styles.menuName}>Messenger</span>
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

