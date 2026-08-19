export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  role: string;
  isBanned: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
}

export interface Post {
  id: string;
  author: User;
  content: string | null;
  media: { id: string; url: string; mimeType: string }[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string | null;
  reporterAvatar: string | null;
  type: string;
  targetId: string | null;
  reason: string;
  details: string | null;
  status: string;
  actionTaken: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: string;
  status: string;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalReports: number;
  pendingReports: number;
  totalBlogPosts: number;
  newUsersToday: number;
  activeUsersToday: number;
}
