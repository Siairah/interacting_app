"use client";

import React from "react";
import PostCard from "@/components/PostCard";
import WarningsBanner from "@/components/WarningsBanner";
import { Post } from "@/components/types";
interface BackendPost {
  id: string;
  content: string;
  created_at: string;
  user: any;
  media_files: any[];
  like_count: number;
  user_liked: boolean;
  comment_count: number;
}

interface CircleTabsProps {
  activeTab: 'posts' | 'events';
  circle: any;
  currentUser: any;
  id: string;
  showPostMenu: string | null;
  hiddenPosts: Set<string>;
  convertToPostCardFormat: (post: BackendPost) => Post;
  setShowCreatePost: (v: boolean) => void;
  setShowAddEvent: (v: boolean) => void;
  setShowPostMenu: (v: string | null) => void;
  setSelectedPost: (v: Post | null) => void;
  setShowViewPostModal: (v: boolean) => void;
  setShowReportModal: (v: boolean) => void;
  setHiddenPosts: (fn: (prev: Set<string>) => Set<string>) => void;
  handleEditPost: (post: Post) => void;
  handleDeletePost: (postId: string) => void;
  handleLike: (postId: string) => void;
  handleCommentAdded: () => void;
  handleJoinCircle: () => void;
  renderEventsTab: () => React.ReactNode;
  styles: any;
}

export default function CircleTabs(props: CircleTabsProps) {
  const { activeTab, circle, currentUser, id, showPostMenu, hiddenPosts: _hiddenPosts,
    convertToPostCardFormat, setShowCreatePost, setShowAddEvent: _setShowAddEvent, setShowPostMenu,
    setSelectedPost, setShowViewPostModal, setShowReportModal, setHiddenPosts, handleEditPost, handleDeletePost,
    handleLike, handleCommentAdded, handleJoinCircle, renderEventsTab, styles } = props;

  if (activeTab === 'events') {
    return renderEventsTab();
  }

  return (
    <div key="posts-tab">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Community Posts</h2>
        {(circle.is_member || circle.visibility !== 'private') && !circle.is_restricted && !circle.is_banned && (
          <button onClick={() => setShowCreatePost(true)} className={styles.createPostBtn}>
            <i className="fas fa-plus"></i> Create Post
          </button>
        )}
      </div>
      {currentUser && circle.is_member && <WarningsBanner circleId={id} userId={currentUser.id} />}
      <div className={styles.postsGrid}>
        {circle.is_restricted ? (
          <div className={styles.joinPrompt}>
            <div className={styles.joinPromptIcon}><i className="fas fa-user-lock"></i></div>
            <h3 className={styles.joinPromptTitle}>Access Restricted</h3>
            <p className={styles.joinPromptText}>You are restricted until <strong>{circle.restricted_until}</strong>.</p>
          </div>
        ) : circle.is_banned ? (
          <div className={styles.joinPrompt}>
            <div className={styles.joinPromptIcon}><i className="fas fa-ban"></i></div>
            <h3 className={styles.joinPromptTitle}>Banned</h3>
            <p className={styles.joinPromptText}>You have been banned from this circle.</p>
          </div>
        ) : (circle.is_member || circle.visibility !== 'private') && circle.posts && circle.posts.length > 0 ? (
          circle.posts.map((post: BackendPost) => {
            const postCardData = convertToPostCardFormat(post);
            return (
              <PostCard
                key={post.id}
                post={postCardData}
                userId={currentUser?.id}
                showComments={false}
                onLike={handleLike}
                onCommentAdded={handleCommentAdded}
                customOptionsMenu={
                  <div className={styles.postOptionsDropdown}>
                    <button className={styles.postOptions} onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}>
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                    {showPostMenu === post.id && (
                      <div className={styles.postDropdownMenu}>
                        <button className={styles.dropdownItem} onClick={() => { setShowPostMenu(null); setSelectedPost(postCardData); setShowViewPostModal(true); }}>
                          <i className="fas fa-eye"></i> View Post
                        </button>
                        {currentUser?.id === post.user.id && (
                          <>
                            <button className={styles.dropdownItem} onClick={() => handleEditPost(postCardData)}>
                              <i className="fas fa-edit"></i> Edit Post
                            </button>
                            <button className={`${styles.dropdownItem} ${styles.textDanger}`} onClick={() => { setShowPostMenu(null); handleDeletePost(post.id); }}>
                              <i className="fas fa-trash"></i> Delete Post
                            </button>
                          </>
                        )}
                        {currentUser?.id !== post.user.id && (
                          <button className={styles.dropdownItem} onClick={() => { setShowPostMenu(null); setSelectedPost(postCardData); setShowReportModal(true); }}>
                            <i className="fas fa-flag"></i> Report
                          </button>
                        )}
                        <button className={styles.dropdownItem} onClick={() => { setShowPostMenu(null); setHiddenPosts(prev => new Set(prev).add(post.id)); }}>
                          <i className="fas fa-eye-slash"></i> Hide Post
                        </button>
                      </div>
                    )}
                  </div>
                }
              />
            );
          })
        ) : (circle.is_member || circle.visibility !== 'private') ? (
          <div className={styles.emptyState}>
            <i className="fas fa-comment-slash"></i>
            <h3>No Posts Yet</h3>
            <p>Be the first to share something with this community!</p>
            <button onClick={() => setShowCreatePost(true)} className={styles.createPostBtn}>
              <i className="fas fa-plus"></i> Create Post
            </button>
          </div>
        ) : (
          <div className={styles.joinPrompt}>
            <div className={styles.joinPromptIcon}><i className="fas fa-lock"></i></div>
            <h3 className={styles.joinPromptTitle}>Join to View Posts</h3>
            <p className={styles.joinPromptText}>This is a private circle. Join to see posts and participate.</p>
            <button onClick={handleJoinCircle} className={styles.joinPromptBtn}>
              <i className="fas fa-sign-in-alt"></i> Join Circle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
