import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import type { Follow, Post, Profile, ThemeMode } from '../types';
import { getThemeColors, type ThemeColors } from '../theme/colors';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type Result = { ok: true; message?: string } | { ok: false; message: string };

type AppContextValue = {
  isReady: boolean;
  isConfigured: boolean;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  errorMessage: string | null;
  currentUser: Profile | null;
  profiles: Profile[];
  posts: Post[];
  follows: Follow[];
  theme: ThemeMode;
  themeColors: ThemeColors;
  login: (email: string, password: string) => Promise<Result>;
  register: (email: string, password: string, username: string, fullName: string) => Promise<Result>;
  requestPasswordReset: (email: string) => Promise<Result>;
  updatePassword: (newPassword: string) => Promise<Result>;
  logout: () => Promise<void>;
  refreshAll: () => Promise<void>;
  createPost: (imageUri: string, caption: string) => Promise<Result>;
  toggleLike: (postId: string, likedByMe: boolean) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<Result>;
  toggleFollow: (targetUserId: string) => Promise<Result>;
  isFollowing: (targetUserId: string) => boolean;
  followerCount: (userId: string) => number;
  followingCount: (userId: string) => number;
  updateProfile: (data: { fullName: string; username: string; bio: string }) => Promise<Result>;
  updateTheme: (theme: ThemeMode) => Promise<Result>;
  updateAvatar: (imageUri: string) => Promise<Result>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function normalizeUsername(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, '_');
}

function toIsoDate(value: string) {
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    bio: row.bio ?? '',
    avatarUrl: row.avatar_url ?? null,
    theme: row.theme === 'dark' ? 'dark' : 'light',
  };
}

function mapPost(row: any, currentUserId: string | null): Post {
  const likes = Array.isArray(row.likes) ? row.likes : [];
  const comments = Array.isArray(row.comments) ? row.comments : [];
  return {
    id: row.id,
    userId: row.user_id,
    caption: row.caption,
    imageUrl: row.image_url,
    createdAt: toIsoDate(row.created_at),
    author: row.author ? mapProfile(row.author) : null,
    likeCount: likes.length,
    likedByMe: likes.some((like: any) => like.user_id === currentUserId),
    comments: comments
      .sort((a: any, b: any) => (a.created_at > b.created_at ? 1 : -1))
      .map((comment: any) => ({
        id: comment.id,
        postId: comment.post_id,
        userId: comment.user_id,
        text: comment.text,
        createdAt: toIsoDate(comment.created_at),
        author: comment.author ? mapProfile(comment.author) : null,
      })),
  };
}

function mapFollow(row: any): Follow {
  return {
    followerId: row.follower_id,
    followingId: row.following_id,
    createdAt: row.created_at,
  };
}

async function uploadFileToBucket(bucket: 'avatars' | 'posts', path: string, imageUri: string) {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = decode(base64);

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  const theme: ThemeMode = currentUser?.theme ?? 'light';
  const themeColors = getThemeColors(theme);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url, theme')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapProfile);
  };

  const fetchPosts = async (currentUserId: string | null) => {
    const { data, error } = await supabase
      .from('posts')
      .select(
        `
        id,
        user_id,
        caption,
        image_url,
        created_at,
        author:profiles!posts_user_id_fkey(id, username, full_name, bio, avatar_url, theme),
        likes(user_id),
        comments(
          id,
          post_id,
          user_id,
          text,
          created_at,
          author:profiles!comments_user_id_fkey(id, username, full_name, bio, avatar_url, theme)
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => mapPost(row, currentUserId));
  };

  const fetchFollows = async () => {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id, following_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      const isMissingTable = error.code === '42P01';
      const isSchemaCacheLag = /schema cache|could not find the table/i.test(error.message ?? '');
      if (isMissingTable || isSchemaCacheLag) {
        return [];
      }
      throw error;
    }

    return (data ?? []).map(mapFollow);
  };

  const ensureProfile = async (userId: string, email: string | null, username?: string, fullName?: string) => {
    const cleanUsername = normalizeUsername(username || email?.split('@')[0] || `user_${userId.slice(0, 6)}`);
    const cleanFullName = (fullName || cleanUsername).trim();

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile) {
      return;
    }

    const { error } = await supabase.from('profiles').insert(
      {
        id: userId,
        username: cleanUsername,
        full_name: cleanFullName,
      },
    );

    if (error) {
      throw error;
    }
  };

  const refreshAll = async () => {
    if (!isSupabaseConfigured) {
      setErrorMessage('Configura Supabase en EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      setIsReady(true);
      return;
    }

    const currentUserId = session?.user?.id ?? null;

    try {
      if (session?.user) {
        const md = session.user.user_metadata ?? {};
        await ensureProfile(session.user.id, session.user.email ?? null, md.username, md.full_name);
      }

      const [nextProfiles, nextPosts, nextFollows] = await Promise.all([
        fetchProfiles(),
        fetchPosts(currentUserId),
        fetchFollows(),
      ]);
      setProfiles(nextProfiles);
      setPosts(nextPosts);
      setFollows(nextFollows);
      setCurrentUser(nextProfiles.find((profile) => profile.id === currentUserId) ?? null);
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error.message ?? 'No se pudo sincronizar la base de datos.');
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsReady(true);
      setErrorMessage('Falta configurar Supabase. Revisa el archivo .env.example.');
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const authSubscription = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }
      setSession(nextSession ?? null);
    });

    return () => {
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    refreshAll();
  }, [session?.user?.id]);

  useEffect(() => {
    const parseAndSetSessionFromUrl = async (url: string) => {
      try {
        const [basePart, hashPart] = url.split('#');
        const queryPart = basePart.includes('?') ? basePart.split('?')[1] : '';
        const hashParams = new URLSearchParams(hashPart ?? '');
        const queryParams = new URLSearchParams(queryPart);

        const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');
        const type = hashParams.get('type') ?? queryParams.get('type');
        const tokenHash = hashParams.get('token_hash') ?? queryParams.get('token_hash');

        if (type === 'recovery') {
          setIsPasswordRecovery(true);
        }

        if (tokenHash && type === 'recovery') {
          await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          });
          setIsPasswordRecovery(true);
          return;
        }

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      } catch {
        // Ignore malformed links and continue normal auth flow.
      }
    };

    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        void parseAndSetSessionFromUrl(url);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }: { url: string }) => {
      void parseAndSetSessionFromUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel('public-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refreshAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const login = async (email: string, password: string): Promise<Result> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      if (!cleanEmail || !cleanPassword) {
        return { ok: false, message: 'Escribe correo y contrasena.' };
      }

      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true };
    } catch (error: any) {
      return { ok: false, message: error.message ?? 'No se pudo iniciar sesion.' };
    }
  };

  const register = async (email: string, password: string, username: string, fullName: string): Promise<Result> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanUsername = normalizeUsername(username);
      const cleanName = fullName.trim();

      if (cleanEmail.length < 5 || cleanPassword.length < 6 || cleanUsername.length < 3 || cleanName.length < 3) {
        return { ok: false, message: 'Completa los campos correctamente.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanName,
          },
        },
      });

      if (error) {
        if (/rate limit/i.test(error.message)) {
          return {
            ok: false,
            message: 'Demasiados intentos de registro. Espera unos minutos y vuelve a intentar.',
          };
        }
        return { ok: false, message: error.message };
      }

      if (!data.user) {
        return { ok: false, message: 'No se pudo crear la cuenta.' };
      }

      // If email confirmation is enabled, there may be no session yet and RLS would block profile insert.
      if (data.session) {
        await ensureProfile(data.user.id, cleanEmail, cleanUsername, cleanName);
      } else {
        return { ok: true, message: 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesion.' };
      }

      return { ok: true, message: 'Cuenta creada correctamente.' };
    } catch (error: any) {
      return { ok: false, message: error.message ?? 'No se pudo completar el registro.' };
    }
  };

  const requestPasswordReset = async (email: string): Promise<Result> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { ok: false, message: 'Escribe tu correo para recuperar contrasena.' };
      }

      // Use native deep link explicitly to avoid localhost/browser redirects.
      const redirectTo = 'instantappa4://reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true, message: 'Te enviamos un link para restablecer tu contrasena.' };
    } catch (error: any) {
      return { ok: false, message: error.message ?? 'No se pudo enviar el correo de recuperacion.' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<Result> => {
    try {
      const cleanPassword = newPassword.trim();
      if (cleanPassword.length < 6) {
        return { ok: false, message: 'La nueva contrasena debe tener minimo 6 caracteres.' };
      }

      const { error } = await supabase.auth.updateUser({ password: cleanPassword });
      if (error) {
        return { ok: false, message: error.message };
      }

      setIsPasswordRecovery(false);
      return { ok: true, message: 'Contrasena actualizada correctamente.' };
    } catch (error: any) {
      return { ok: false, message: error.message ?? 'No se pudo actualizar la contrasena.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsPasswordRecovery(false);
    setCurrentUser(null);
  };

  const createPost = async (imageUri: string, caption: string): Promise<Result> => {
    if (!currentUser || !session?.user?.id) {
      return { ok: false, message: 'Sesion no valida.' };
    }

    const cleanCaption = caption.trim();
    if (!cleanCaption || !imageUri) {
      return { ok: false, message: 'Selecciona imagen y escribe caption.' };
    }

    try {
      const postPath = `${session.user.id}/${Date.now()}.jpg`;
      const imageUrl = await uploadFileToBucket('posts', postPath, imageUri);

      const { error } = await supabase.from('posts').insert({
        user_id: currentUser.id,
        caption: cleanCaption,
        image_url: imageUrl,
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      await refreshAll();
      return { ok: true };
    } catch (error: any) {
      return { ok: false, message: error.message ?? 'No se pudo publicar.' };
    }
  };

  const toggleLike = async (postId: string, likedByMe: boolean) => {
    if (!currentUser) {
      return;
    }

    const previousPosts = posts;
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        if (likedByMe) {
          return {
            ...post,
            likedByMe: false,
            likeCount: Math.max(0, post.likeCount - 1),
          };
        }

        return {
          ...post,
          likedByMe: true,
          likeCount: post.likeCount + 1,
        };
      }),
    );

    if (likedByMe) {
      const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      if (error) {
        setPosts(previousPosts);
      }
      return;
    }

    const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id });
    if (error) {
      setPosts(previousPosts);
    }
  };

  const addComment = async (postId: string, text: string): Promise<Result> => {
    if (!currentUser) {
      return { ok: false, message: 'Sesion no valida.' };
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return { ok: false, message: 'Escribe un comentario.' };
    }

    const optimisticComment = {
      id: `optimistic-${Date.now()}`,
      postId,
      userId: currentUser.id,
      text: cleanText,
      createdAt: toIsoDate(new Date().toISOString()),
      author: currentUser,
    };

    const previousPosts = posts;
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }
        return {
          ...post,
          comments: [...post.comments, optimisticComment],
        };
      }),
    );

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: currentUser.id,
      text: cleanText,
    });

    if (error) {
      setPosts(previousPosts);
      return { ok: false, message: error.message };
    }

    return { ok: true };
  };

  const isFollowing = (targetUserId: string) => {
    if (!currentUser) {
      return false;
    }
    return follows.some((follow) => follow.followerId === currentUser.id && follow.followingId === targetUserId);
  };

  const followerCount = (userId: string) => {
    return follows.filter((follow) => follow.followingId === userId).length;
  };

  const followingCount = (userId: string) => {
    return follows.filter((follow) => follow.followerId === userId).length;
  };

  const toggleFollow = async (targetUserId: string): Promise<Result> => {
    if (!currentUser) {
      return { ok: false, message: 'Sesion no valida.' };
    }

    if (currentUser.id === targetUserId) {
      return { ok: false, message: 'No puedes seguirte a ti mismo.' };
    }

    const currentlyFollowing = isFollowing(targetUserId);
    const previousFollows = follows;

    if (currentlyFollowing) {
      setFollows((currentFollows) =>
        currentFollows.filter(
          (follow) => !(follow.followerId === currentUser.id && follow.followingId === targetUserId),
        ),
      );

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId);

      if (error) {
        setFollows(previousFollows);
        return { ok: false, message: error.message };
      }

      return { ok: true, message: 'Dejaste de seguir a este usuario.' };
    }

    const optimisticFollow: Follow = {
      followerId: currentUser.id,
      followingId: targetUserId,
      createdAt: new Date().toISOString(),
    };

    setFollows((currentFollows) => [optimisticFollow, ...currentFollows]);

    const { error } = await supabase.from('follows').insert({
      follower_id: currentUser.id,
      following_id: targetUserId,
    });

    if (error) {
      setFollows(previousFollows);
      return { ok: false, message: error.message };
    }

    return { ok: true, message: 'Ahora sigues a este usuario.' };
  };

  const updateProfile = async (data: { fullName: string; username: string; bio: string }): Promise<Result> => {
    if (!currentUser) {
      return { ok: false, message: 'Sesion no valida.' };
    }

    const payload = {
      full_name: data.fullName.trim(),
      username: normalizeUsername(data.username),
      bio: data.bio.trim(),
    };

    if (payload.full_name.length < 3 || payload.username.length < 3) {
      return { ok: false, message: 'Nombre y usuario deben tener minimo 3 caracteres.' };
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', currentUser.id);
    if (error) {
      return { ok: false, message: error.message };
    }

    await refreshAll();
    return { ok: true };
  };

  const updateTheme = async (nextTheme: ThemeMode): Promise<Result> => {
    if (!currentUser) {
      return { ok: false, message: 'Sesion no valida.' };
    }

    const { error } = await supabase.from('profiles').update({ theme: nextTheme }).eq('id', currentUser.id);
    if (error) {
      return { ok: false, message: error.message };
    }

    await refreshAll();
    return { ok: true };
  };

  const updateAvatar = async (imageUri: string): Promise<Result> => {
    if (!currentUser || !session?.user?.id) {
      return { ok: false, message: 'Sesion no valida.' };
    }

    try {
      const avatarPath = `${session.user.id}/avatar.jpg`;

      // Force replacement of the previous avatar object to avoid stale file state.
      const { error: removeError } = await supabase.storage.from('avatars').remove([avatarPath]);
      if (removeError && !/not found/i.test(removeError.message)) {
        return { ok: false, message: removeError.message };
      }

      const avatarUrl = await uploadFileToBucket('avatars', avatarPath, imageUri);
      const cacheBustedAvatarUrl = `${avatarUrl}?v=${Date.now()}`;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedAvatarUrl })
        .eq('id', currentUser.id);

      if (error) {
        return { ok: false, message: error.message };
      }

      await refreshAll();
      return { ok: true };
    } catch (error: any) {
      return { ok: false, message: error.message ?? 'No se pudo subir la foto.' };
    }
  };

  const value = useMemo(
    () => ({
      isReady,
      isConfigured: isSupabaseConfigured,
      isAuthenticated: Boolean(session?.user && currentUser),
      isPasswordRecovery,
      errorMessage,
      currentUser,
      profiles,
      posts,
      follows,
      theme,
      themeColors,
      login,
      register,
      requestPasswordReset,
      updatePassword,
      logout,
      refreshAll,
      createPost,
      toggleLike,
      addComment,
      toggleFollow,
      isFollowing,
      followerCount,
      followingCount,
      updateProfile,
      updateTheme,
      updateAvatar,
    }),
    [
      isReady,
      session?.user,
      currentUser,
      isPasswordRecovery,
      errorMessage,
      profiles,
      posts,
      follows,
      theme,
      themeColors,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
