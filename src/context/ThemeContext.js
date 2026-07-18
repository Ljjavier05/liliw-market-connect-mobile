import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors } from '../theme/colors';

const STORAGE_KEY = 'liliw-theme-mode';

const ThemeContext = createContext({
  mode: 'light',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
  toggleMode: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') setModeState(saved);
      } catch {
        // Keep default when storage is unavailable
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setMode = useCallback((next) => {
    if (next !== 'dark' && next !== 'light') return;
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors: mode === 'dark' ? darkColors : lightColors,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode]
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
