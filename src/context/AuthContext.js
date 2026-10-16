import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth.service';
import { clearStoredToken, getStoredToken, setStoredToken } from '../services/api';
import {
  promptBiometricAuth,
  isBiometricLoginEnabled,
  getBiometricStoredToken,
  updateBiometricTokenIfActive,
} from '../utils/biometrics';

const AuthContext = createContext(null);

const VENDOR_ROLE = 'VENDOR';

function assertVendor(user) {
  if (!user || user.role !== VENDOR_ROLE) {
    const err = new Error('This app is for market vendors only.');
    err.code = 'ROLE_NOT_ALLOWED';
    throw err;
  }
  return user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const token = await getStoredToken();
        if (!token) return;
        const me = await authService.getMe();
        if (cancelled) return;
        if (me.role !== VENDOR_ROLE) {
          await clearStoredToken();
          setUser(null);
          return;
        }
        setUser(me);
      } catch (err) {
        await clearStoredToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const start = Date.now();
    const data = await authService.login(email, password);
    assertVendor(data.user);
    if (data.token) {
      await updateBiometricTokenIfActive(data.token);
    }
    const elapsed = Date.now() - start;
    if (elapsed < 2000) {
      await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
    }
    setUser(data.user);
    return data;
  }, []);

  const loginWithBiometrics = useCallback(async () => {
    const hasBiometrics = await isBiometricLoginEnabled();
    if (!hasBiometrics) {
      throw new Error('Biometric login is not enabled on this device.');
    }

    const authenticated = await promptBiometricAuth('Scan your fingerprint to sign in');
    if (!authenticated) {
      const err = new Error('Biometric verification was cancelled.');
      err.code = 'BIOMETRIC_CANCELLED';
      throw err;
    }

    const token = await getBiometricStoredToken();
    if (!token) {
      throw new Error('No saved biometric session found. Please sign in with password.');
    }

    const start = Date.now();
    await setStoredToken(token);
    try {
      const me = await authService.getMe();
      assertVendor(me);
      const elapsed = Date.now() - start;
      if (elapsed < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
      }
      setUser(me);
      return me;
    } catch (err) {
      await clearStoredToken();
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error('Session expired. Please sign in with password to re-enable biometric sign-in.');
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (payload) => {
    // OTP signup is handled on RegisterScreen; keep for compatibility.
    return authService.registerSendOtp(payload);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authService.getMe();
    assertVendor(me);
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      loginWithBiometrics,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, login, loginWithBiometrics, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
