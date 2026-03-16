export interface User {
  id: string;
  email: string;
  full_name: string;
  profile_pic: string | null;
}

export interface Member {
  id: string;
  user: User;
  is_admin: boolean;
  joined_at: string;
}

export interface PendingRequest {
  id: string;
  user: User;
  message: string;
  requested_at: string;
}

export interface PendingPost {
  id: string;
  user: User;
  content: string;
  created_at: string;
  media?: string[];
}

export interface FlaggedPost {
  id: string;
  post: {
    id: string;
    content: string;
    user: User;
    media_files?: Array<{ file: string; type: string }>;
  };
  reason: string;
  evidence_image?: string | null;
  flagged_by: User;
  created_at: string;
}

export interface ReportedPost {
  id: string;
  post: {
    id: string;
    content: string;
    user: User;
    media_files?: Array<{ file: string; type: string }>;
  };
  reason: string;
  evidence_image?: string | null;
  reported_by: User;
  created_at: string;
}

export interface BannedUser {
  id: string;
  user: User;
  reason: string;
  banned_at: string;
}

export interface RestrictedUser {
  id: string;
  user: User;
  reason: string;
  restricted_until: string;
  created_at: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  visibility: string;
}

export interface ManagementData {
  success: boolean;
  message?: string;
  circle: Circle;
  members: Member[];
  pending_requests: PendingRequest[];
  pending_posts: PendingPost[];
  flagged_posts: FlaggedPost[];
  reported_posts: ReportedPost[];
  admin_count: number;
  pending_posts_count: number;
  flagged_posts_count: number;
  reported_posts_count: number;
  total_pending: number;
}

