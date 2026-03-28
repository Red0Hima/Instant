import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';

export function ReelsScreen() {
  const { posts, themeColors } = useApp();

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      style={[styles.container, { backgroundColor: '#111111' }]}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<Text style={styles.title}>Reels</Text>}
      renderItem={({ item }) => {
        const user = item.author;
        return (
          <View style={styles.card}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <View style={styles.overlay}>
              <Text style={styles.user}>{user?.username ?? 'usuario'}</Text>
              <Text style={styles.caption}>{item.caption}</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={<Text style={{ color: themeColors.muted, textAlign: 'center', marginTop: 20 }}>Sin reels todavia.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 10,
    gap: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#222222',
  },
  image: {
    width: '100%',
    height: 380,
  },
  overlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  user: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  caption: {
    color: '#f0f0f0',
    marginTop: 4,
  },
});
