import { useCallback, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { Avatar } from '../components/Avatar';
import type { RootStackParamList } from '../navigation/types';

type UserProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

export function UserProfileScreen({ route }: UserProfileScreenProps) {
  const { userId } = route.params;
  const { currentUser, profiles, posts, refreshAll, isFollowing, followerCount, followingCount, toggleFollow, themeColors } = useApp();
  const [followLoading, setFollowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const profile = profiles.find((item) => item.id === userId) ?? null;
  const userPosts = useMemo(() => posts.filter((item) => item.userId === userId), [posts, userId]);
  const amFollowing = isFollowing(userId);
  const followers = followerCount(userId);
  const following = followingCount(userId);
  const isSelfProfile = currentUser?.id === userId;

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll, refreshing]);

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <Text style={{ color: themeColors.muted }}>Usuario no encontrado.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={userPosts}
      keyExtractor={(item) => item.id}
      numColumns={3}
      style={{ backgroundColor: themeColors.background }}
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Avatar user={profile} size={76} />
            <View style={styles.headerText}>
              <Text style={[styles.name, { color: themeColors.text }]}>{profile.fullName}</Text>
              <Text style={{ color: themeColors.muted }}>@{profile.username}</Text>
              <Text style={{ color: themeColors.text, marginTop: 4 }}>{profile.bio || 'Sin bio.'}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
              <Text style={[styles.statNumber, { color: themeColors.text }]}>{followers}</Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Seguidores</Text>
            </View>
            <View style={[styles.statBox, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
              <Text style={[styles.statNumber, { color: themeColors.text }]}>{following}</Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Siguiendo</Text>
            </View>
          </View>

          {!isSelfProfile ? (
            <Pressable
              style={[
                styles.followButton,
                {
                  backgroundColor: amFollowing ? themeColors.chip : themeColors.primary,
                  borderColor: themeColors.border,
                },
              ]}
              disabled={followLoading}
              onPress={async () => {
                setFollowLoading(true);
                const result = await toggleFollow(userId);
                setFollowLoading(false);
                if (!result.ok) {
                  Alert.alert('No se pudo actualizar', result.message);
                }
              }}
            >
              <Text style={{ color: amFollowing ? themeColors.text : '#ffffff', fontWeight: '700' }}>
                {followLoading ? 'Actualizando...' : amFollowing ? 'Siguiendo' : 'Seguir'}
              </Text>
            </Pressable>
          ) : null}

          <Text style={[styles.section, { color: themeColors.text }]}>Publicaciones</Text>
        </View>
      }
      renderItem={({ item }) => <Image source={{ uri: item.imageUrl }} style={[styles.postImage, { backgroundColor: themeColors.chip }]} />}
      ListEmptyComponent={<Text style={{ color: themeColors.muted, textAlign: 'center', marginTop: 20 }}>Este usuario aun no publica.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  header: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '700',
    fontSize: 16,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
  },
  followButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  row: {
    gap: 8,
  },
  postImage: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
  },
});
