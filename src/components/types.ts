// Shared types for post components

export interface PostUser {
  id: string;
  email: string;
  full_name: string;
  profile_pic: string;
}

export interface PostCircle {
  id: string;
  name: string;
  cover_image?: string;
}

export interface PostMedia {
  file: string;
  type: string;
}

export interface PostLiker {
  id: string;
  email: string;
  full_name: string;
  profile_pic: string;
}

export interface PostComment {
  id: string;
  content: string;
  created_at: string;
  user: PostUser;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  user: PostUser;
  circle: PostCircle | null;
  media_files: PostMedia[];
  like_count: number;
  user_liked: boolean;
  comment_count: number;
  recent_likers?: PostLiker[];
  comments?: PostComment[];
}

