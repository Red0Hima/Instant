import { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { StoryBar } from '../components/StoryBar';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';

export function HomeScreen() {
  const { posts, themeColors, refreshAll } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const lastAutoRefreshAt = useRef(0);

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll, refreshing]);

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      onScroll={(event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const pulledDownAtTop = offsetY < -40;
        const now = Date.now();
        if (posts.length === 0 && pulledDownAtTop && !refreshing && now - lastAutoRefreshAt.current > 3000) {
          lastAutoRefreshAt.current = now;
          void onRefresh();
        }
      }}
      scrollEventThrottle={16}
      ListHeaderComponent={
        <View>
          <Text style={[styles.title, { color: themeColors.text }]}>Inicio</Text>
          <Text style={[styles.subtitle, { color: themeColors.muted }]}>Usuarios registrados</Text>
          <StoryBar onSelectUser={(userId) => navigation.navigate('UserProfile', { userId })} />
        </View>
      }
      ListEmptyComponent={
        <Pressable onPress={() => void onRefresh()}>
          <Text style={[styles.empty, { color: themeColors.muted }]}>Aun no hay publicaciones. Toca para recargar.</Text>
        </Pressable>
      }
      renderItem={({ item }) => <PostCard post={item} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  subtitle: {
    paddingHorizontal: 4,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
  },
});
