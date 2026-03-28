import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';

export function CreatePostScreen() {
  const { createPost, themeColors } = useApp();
  const [imageUri, setImageUri] = useState('');
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitas habilitar acceso a fotos para publicar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Crear Publicacion</Text>

      <Pressable style={[styles.imagePicker, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <Text style={{ color: themeColors.muted }}>Seleccionar imagen</Text>
        )}
      </Pressable>

      <TextInput
        style={[
          styles.input,
          styles.captionInput,
          { borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text },
        ]}
        value={caption}
        onChangeText={setCaption}
        placeholder="Escribe un caption"
        placeholderTextColor={themeColors.muted}
        multiline
      />

      <Pressable
        style={[styles.button, { backgroundColor: publishing ? themeColors.muted : themeColors.primary }]}
        disabled={publishing}
        onPress={async () => {
          setPublishing(true);
          const result = await createPost(imageUri, caption);
          if (!result.ok) {
            Alert.alert('No se pudo publicar', result.message);
            setPublishing(false);
            return;
          }
          setCaption('');
          setImageUri('');
          setPublishing(false);
          Alert.alert('Publicado', 'Tu post ya aparece en el inicio.');
        }}
      >
        <Text style={styles.buttonText}>{publishing ? 'Publicando...' : 'Publicar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  imagePicker: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 260,
  },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  captionInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '700',
  },
});
