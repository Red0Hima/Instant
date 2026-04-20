import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import type { Post } from '../types';
import { Avatar } from './Avatar';

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  const { isAdmin, toggleLike, addComment, deletePost, deleteComment, themeColors } = useApp();
  const author = post.author;
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef<TextInput | null>(null);

  if (!author) {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      <View style={styles.header}>
        <Avatar user={author} size={36} />
        <Text style={[styles.headerUsername, { color: themeColors.text }]}>{author.username}</Text>
        {isAdmin ? (
          <Pressable
            style={[styles.adminDeleteButton, { borderColor: themeColors.danger }]}
            onPress={() => {
              Alert.alert('Eliminar publicacion', 'Esta accion no se puede deshacer.', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    const result = await deletePost(post.id);
                    if (!result.ok) {
                      Alert.alert('No se pudo eliminar', result.message);
                    }
                  },
                },
              ]);
            }}
          >
            <Text style={[styles.adminDeleteText, { color: themeColors.danger }]}>Eliminar</Text>
          </Pressable>
        ) : null}
      </View>

      {post.mediaType === 'video' ? (
        <View style={[styles.videoPlaceholder, { backgroundColor: themeColors.chip }]}>
          <Ionicons name="play-circle" size={44} color={themeColors.text} />
          <Text style={{ color: themeColors.text, marginTop: 6, fontWeight: '700' }}>Video</Text>
        </View>
      ) : (
        <Image source={{ uri: post.imageUrl }} style={[styles.postImage, { backgroundColor: themeColors.chip }]} />
      )}

      <View style={styles.actions}>
        <Pressable onPress={() => toggleLike(post.id, post.likedByMe)} style={styles.iconButton}>
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={24}
            color={post.likedByMe ? themeColors.danger : themeColors.text}
          />
        </Pressable>
        <Pressable onPress={() => commentInputRef.current?.focus()} style={styles.iconButton}>
          <Ionicons name="chatbubble-outline" size={22} color={themeColors.text} />
        </Pressable>
        <Ionicons name="paper-plane-outline" size={22} color={themeColors.text} />
      </View>

      <Text style={[styles.likes, { color: themeColors.text }]}>{post.likeCount} me gusta</Text>
      {post.caption.trim().length > 0 ? (
        <Text style={[styles.caption, { color: themeColors.text }]}>
          <Text style={styles.bold}>{author.username} </Text>
          {post.caption}
        </Text>
      ) : null}
      <Text style={[styles.time, { color: themeColors.muted }]}>{post.createdAt}</Text>

      {post.comments.map((comment) => {
        return (
          <View key={comment.id} style={styles.commentWrap}>
            <Text style={[styles.comment, { color: themeColors.text }]}>
              <Text style={styles.bold}>{comment.author?.username ?? 'usuario'} </Text>
              {comment.text}
            </Text>
            {isAdmin ? (
              <Pressable
                onPress={async () => {
                  const result = await deleteComment(post.id, comment.id);
                  if (!result.ok) {
                    Alert.alert('No se pudo eliminar', result.message);
                  }
                }}
              >
                <Text style={[styles.commentDelete, { color: themeColors.danger }]}>Eliminar</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <View style={[styles.commentRow, { borderTopColor: themeColors.border }]}>
        <TextInput
          ref={commentInputRef}
          placeholder="Agrega un comentario..."
          placeholderTextColor={themeColors.muted}
          value={commentText}
          onChangeText={setCommentText}
          style={[styles.commentInput, { color: themeColors.text }]}
        />
        <Pressable
          onPress={async () => {
            const result = await addComment(post.id, commentText);
            if (!result.ok) {
              Alert.alert('No se pudo comentar', result.message);
              return;
            }
            setCommentText('');
          }}
        >
          <Text style={[styles.publish, { color: themeColors.primaryDark }]}>Publicar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  adminDeleteButton: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminDeleteText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerUsername: {
    fontWeight: '700',
  },
  postImage: {
    width: '100%',
    height: 340,
  },
  videoPlaceholder: {
    width: '100%',
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  likes: {
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  caption: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  bold: {
    fontWeight: '700',
  },
  time: {
    paddingHorizontal: 10,
    paddingTop: 4,
    fontSize: 12,
  },
  comment: {
    flex: 1,
    paddingTop: 6,
  },
  commentWrap: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  commentDelete: {
    paddingTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  commentInput: {
    flex: 1,
  },
  publish: {
    fontWeight: '700',
  },
});
