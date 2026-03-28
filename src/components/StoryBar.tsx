import { ScrollView, StyleSheet, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { Avatar } from './Avatar';

type StoryBarProps = {
  onSelectUser?: (userId: string) => void;
};

export function StoryBar({ onSelectUser }: StoryBarProps) {
  const { profiles, currentUser } = useApp();
  const people = profiles.filter((profile) => profile.id !== currentUser?.id).slice(0, 20);

  if (people.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {people.map((person) => {
          return <Avatar key={person.id} user={person} showUsername highlight onPress={() => onSelectUser?.(person.id)} />;
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  content: {
    gap: 10,
    paddingHorizontal: 10,
  },
});
