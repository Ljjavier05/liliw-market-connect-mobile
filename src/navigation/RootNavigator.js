import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import VendorNavigator from './VendorNavigator';
import LoadingScreen from '../components/LoadingScreen';

/**
 * Vendor-only root gate.
 * Non-vendor sessions are cleared in AuthContext; only VENDOR reaches VendorNavigator.
 */
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Starting Liliw Market Connect..." />;
  }

  return (
    <NavigationContainer>
      {user ? <VendorNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
