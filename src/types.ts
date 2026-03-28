export type ThemeMode = 'light' | 'dark';

export type Profile = {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  theme: ThemeMode;
};

export type PostComment = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
  author: Profile | null;
};

export type Post = {
  id: string;
  userId: string;
  caption: string;
  imageUrl: string;
  createdAt: string;
  author: Profile | null;
  likeCount: number;
  likedByMe: boolean;
  comments: PostComment[];
};

export type Follow = {
  followerId: string;
  followingId: string;
  createdAt: string;
};
