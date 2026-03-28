import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import type { Profile } from '../types';

type AvatarProps = {
  user: Profile;
  size?: number;
  showUsername?: boolean;
  highlight?: boolean;
  onPress?: () => void;
};

export function Avatar({ user, size = 56, showUsername = false, highlight = false, onPress }: AvatarProps) {
  const { themeColors } = useApp();

  const content = (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.ring,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            borderColor: highlight ? themeColors.primary : themeColors.border,
            backgroundColor: themeColors.surface,
          },
        ]}
      >
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: themeColors.chip,
            }}
          >
            <Text style={{ color: themeColors.text, fontWeight: '800' }}>
              {user.username.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      {showUsername ? <Text style={[styles.username, { color: themeColors.text }]}>{user.username}</Text> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 76,
  },
  ring: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    marginTop: 4,
    fontSize: 12,
  },
});
