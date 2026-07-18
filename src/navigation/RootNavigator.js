import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthNavigator from './AuthNavigator';
import VendorNavigator from './VendorNavigator';
import LoadingScreen from '../components/LoadingScreen';

/**
 * Vendor-only root gate.
 * Non-vendor sessions are cleared in AuthContext; only VENDOR reaches VendorNavigator.
 */
export default function RootNavigator() {
  const { user, loading } = useAuth();
  const { isDark, colors } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.pageBg,
        card: colors.surface,
        text: colors.ink,
        border: colors.borderBrand,
        notification: colors.danger,
      },
    };
  }, [isDark, colors]);

  if (loading) {
    return <LoadingScreen message="Starting Liliw Market Connect..." />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <VendorNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
