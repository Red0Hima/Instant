import 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { CreatePostScreen } from './src/screens/CreatePostScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReelsScreen } from './src/screens/ReelsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { UserProfileScreen } from './src/screens/UserProfileScreen';
import type { RootStackParamList } from './src/navigation/types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function AppTabs() {
  const { themeColors } = useApp();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: themeColors.primaryDark,
        tabBarInactiveTintColor: themeColors.muted,
        tabBarStyle: {
          backgroundColor: themeColors.tab,
          borderTopColor: themeColors.border,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Inicio: 'home-outline',
            Buscar: 'search-outline',
            Crear: 'add-circle-outline',
            Reels: 'play-circle-outline',
            Perfil: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Buscar" component={SearchScreen} />
      <Tab.Screen name="Crear" component={CreatePostScreen} />
      <Tab.Screen name="Reels" component={ReelsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  const { themeColors } = useApp();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.surface },
        headerTintColor: themeColors.text,
      }}
    >
      <Stack.Screen name="MainTabs" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Perfil' }} />
    </Stack.Navigator>
  );
}

function AppRoot() {
  const { isAuthenticated, isPasswordRecovery, isReady, isConfigured, errorMessage, theme, themeColors } = useApp();

  if (!isReady) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.text, { color: themeColors.text }]}>Cargando datos...</Text>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Falta configurar Supabase</Text>
        <Text style={[styles.text, { color: themeColors.muted }]}>Copia .env.example a .env y agrega tus claves.</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {errorMessage ? (
        <View style={[styles.banner, { backgroundColor: themeColors.chip, borderBottomColor: themeColors.border }]}>
          <Text style={{ color: themeColors.text, fontSize: 12 }}>{errorMessage}</Text>
        </View>
      ) : null}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {isAuthenticated && !isPasswordRecovery ? <MainStack /> : <LoginScreen />}
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppRoot />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    textAlign: 'center',
  },
  banner: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  safeArea: {
    flex: 1,
  },
});
