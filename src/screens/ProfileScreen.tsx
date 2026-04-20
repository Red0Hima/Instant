import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { useApp } from '../context/AppContext';

export function ProfileScreen() {
  const { currentUser, isAdmin, posts, refreshAll, logout, followerCount, followingCount, updateProfile, updateAvatar, updateTheme, themeColors } = useApp();
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [username, setUsername] = useState(currentUser?.username ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastAutoRefreshAt = useRef(0);

  useEffect(() => {
    setFullName(currentUser?.fullName ?? '');
    setUsername(currentUser?.username ?? '');
    setBio(currentUser?.bio ?? '');
  }, [currentUser?.id, currentUser?.fullName, currentUser?.username, currentUser?.bio]);

  const myPosts = useMemo(
    () => posts.filter((post) => post.userId === currentUser?.id),
    [posts, currentUser?.id],
  );

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll, refreshing]);

  const totalLikes = myPosts.reduce((sum, post) => sum + post.likeCount, 0);
  const followers = currentUser ? followerCount(currentUser.id) : 0;
  const following = currentUser ? followingCount(currentUser.id) : 0;

  if (!currentUser) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: themeColors.muted }}>No hay perfil activo.</Text>
      </View>
    );
  }

  const onPickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Habilita acceso a fotos para cambiar avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled) {
      return;
    }

    const upload = await updateAvatar(result.assets[0].uri);
    if (!upload.ok) {
      Alert.alert('No se pudo actualizar foto', upload.message);
    }
  };

  return (
    <FlatList
      data={myPosts}
      keyExtractor={(item) => item.id}
      numColumns={3}
      style={[styles.container, { backgroundColor: themeColors.background }]}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.grid}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      onScroll={(event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const pulledDownAtTop = offsetY < -40;
        const now = Date.now();
        if (myPosts.length === 0 && pulledDownAtTop && !refreshing && now - lastAutoRefreshAt.current > 3000) {
          lastAutoRefreshAt.current = now;
          void onRefresh();
        }
      }}
      scrollEventThrottle={16}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Avatar user={currentUser} size={72} />
            <View>
              <Text style={[styles.name, { color: themeColors.text }]}>{currentUser.fullName}</Text>
              {isAdmin ? (
                <View style={[styles.adminBadge, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.adminBadgeText}>Administrador</Text>
                </View>
              ) : null}
              <Text style={[styles.username, { color: themeColors.muted }]}>@{currentUser.username}</Text>
              <Text style={[styles.bio, { color: themeColors.text }]}>{currentUser.bio || 'Sin bio'}</Text>
            </View>
          </View>

          <Pressable style={[styles.secondaryButton, { borderColor: themeColors.border }]} onPress={onPickAvatar}>
            <Text style={{ color: themeColors.primaryDark, fontWeight: '700' }}>Cambiar foto de perfil</Text>
          </Pressable>

          <View style={styles.stats}>
            <View style={[styles.statBox, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
              <Text style={[styles.statNumber, { color: themeColors.text }]}>{myPosts.length}</Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Posts</Text>
            </View>
            <View style={[styles.statBox, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
              <Text style={[styles.statNumber, { color: themeColors.text }]}>{totalLikes}</Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Likes</Text>
            </View>
            <View style={[styles.statBox, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
              <Text style={[styles.statNumber, { color: themeColors.text }]}>{followers}</Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Seguidores</Text>
            </View>
            <View style={[styles.statBox, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
              <Text style={[styles.statNumber, { color: themeColors.text }]}>{following}</Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Siguiendo</Text>
            </View>
          </View>

          <View style={[styles.editCard, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
            <Text style={[styles.section, { color: themeColors.text, marginTop: 0 }]}>Personalizacion</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nombre"
              placeholderTextColor={themeColors.muted}
              style={[styles.input, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }]}
            />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Usuario"
              placeholderTextColor={themeColors.muted}
              autoCapitalize="none"
              style={[styles.input, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }]}
            />
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor={themeColors.muted}
              multiline
              style={[
                styles.input,
                { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background, minHeight: 76, textAlignVertical: 'top' },
              ]}
            />

            <Pressable
              style={[styles.saveButton, { backgroundColor: saving ? themeColors.muted : themeColors.primary }]}
              disabled={saving}
              onPress={async () => {
                setSaving(true);
                const result = await updateProfile({ fullName, username, bio });
                setSaving(false);
                if (!result.ok) {
                  Alert.alert('No se pudo guardar', result.message);
                  return;
                }
                Alert.alert('Perfil actualizado', 'Tus cambios se guardaron en la base de datos.');
              }}
            >
              <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
            </Pressable>
          </View>

          <View style={[styles.optionsCard, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
            <Pressable onPress={() => setShowOptions((prev) => !prev)}>
              <Text style={[styles.section, { color: themeColors.text, marginTop: 0 }]}>Opciones</Text>
            </Pressable>
            {showOptions ? (
              <View style={styles.optionRow}>
                <Text style={{ color: themeColors.text, fontWeight: '600' }}>Modo oscuro</Text>
                <Switch
                  value={currentUser.theme === 'dark'}
                  onValueChange={(value) => {
                    updateTheme(value ? 'dark' : 'light');
                  }}
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                />
              </View>
            ) : null}
          </View>

          <Pressable style={[styles.logoutButton, { backgroundColor: themeColors.primaryDark }]} onPress={logout}>
            <Text style={styles.logoutText}>Cerrar sesion</Text>
          </Pressable>

          <Text style={[styles.section, { color: themeColors.text }]}>Tus publicaciones</Text>
        </View>
      }
      renderItem={({ item }) =>
        item.mediaType === 'video' ? (
          <View style={[styles.postImage, styles.videoPlaceholder, { backgroundColor: themeColors.chip }]}>
            <Ionicons name="play-circle" size={30} color={themeColors.text} />
          </View>
        ) : (
          <Image source={{ uri: item.imageUrl }} style={[styles.postImage, { backgroundColor: themeColors.chip }]} />
        )
      }
      ListEmptyComponent={<Text style={[styles.empty, { color: themeColors.muted }]}>Aun no tienes publicaciones.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
  },
  username: {
    marginTop: 2,
  },
  bio: {
    marginTop: 4,
    maxWidth: 230,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    marginTop: 10,
    marginHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  statBox: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
  },
  editCard: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 10,
  },
  saveText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
  },
  optionsCard: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  optionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutButton: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
  },
  logoutText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
  },
  section: {
    fontWeight: '700',
    fontSize: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  grid: {
    paddingHorizontal: 8,
    gap: 8,
    paddingBottom: 18,
  },
  row: {
    gap: 8,
  },
  postImage: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
  },
});
