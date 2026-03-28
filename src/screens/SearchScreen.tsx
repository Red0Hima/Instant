import { useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { useApp } from '../context/AppContext';

export function SearchScreen() {
  const { posts, profiles, themeColors } = useApp();
  const [query, setQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      return profiles;
    }

    return profiles.filter((user) => {
      return (
        user.username.toLowerCase().includes(cleanQuery) ||
        user.fullName.toLowerCase().includes(cleanQuery)
      );
    });
  }, [profiles, query]);

  const filteredPosts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      return posts;
    }

    return posts.filter((post) => {
      const author = post.author;
      return (
        post.caption.toLowerCase().includes(cleanQuery) ||
        author?.username.toLowerCase().includes(cleanQuery) ||
        author?.fullName.toLowerCase().includes(cleanQuery)
      );
    });
  }, [posts, query]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Buscar</Text>
      <TextInput
        style={[styles.search, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.surface }]}
        value={query}
        onChangeText={setQuery}
        placeholder="Busca por usuario o texto"
        placeholderTextColor={themeColors.muted}
      />

      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Usuarios</Text>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.users}
        renderItem={({ item }) => <Avatar user={item} showUsername />}
        ListEmptyComponent={<Text style={{ color: themeColors.muted }}>Sin resultados</Text>}
      />

      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Publicaciones</Text>

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => <Image source={{ uri: item.imageUrl }} style={[styles.image, { backgroundColor: themeColors.chip }]} />}
        ListEmptyComponent={<Text style={{ color: themeColors.muted, textAlign: 'center', marginTop: 20 }}>Sin publicaciones</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  search: {
    marginTop: 10,
    marginHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  users: {
    paddingHorizontal: 10,
    gap: 10,
  },
  grid: {
    padding: 8,
    gap: 8,
  },
  gridRow: {
    gap: 8,
  },
  image: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
  },
});
