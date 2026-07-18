import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
// Expo Go (Android, SDK 51+) removed remote push — ignore that console error.
// In-app Alerts still work; OS notifications work in a development/production build.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications',
]);

function ThemedApp() {
  const { isDark } = useTheme();
  return (
    <AuthProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
