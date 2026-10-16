import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import FormScreen from '../../components/FormScreen';
import { FingerPrintIcon } from '../../components/icons';
import { API_BASE_URL } from '../../config/env';
import {
  getBiometricCapabilities,
  isBiometricLoginEnabled,
  enableBiometricLogin,
  getBiometricStoredEmail,
} from '../../utils/biometrics';
import { lightHaptic, successHaptic } from '../../utils/haptics';

const brandLogo = require('../../../assets/liliw-seal.png');

function getErrorMessage(err) {
  if (err?.code === 'ROLE_NOT_ALLOWED') {
    return err.message;
  }
  if (err?.response?.data?.code === 'ACCOUNT_DEACTIVATED' || err?.response?.status === 403) {
    return (
      err?.response?.data?.message ||
      'Your account has been deactivated by the market office. Contact them to reactivate — your store profile is kept.'
    );
  }
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }
  if (!err?.response) {
    return `Cannot reach the server.\nCheck that the backend is running and API_BASE_URL is correct.\n\n${API_BASE_URL}`;
  }
  return err.message || 'Something went wrong';
}

export default function LoginScreen({ navigation }) {
  const { login, loginWithBiometrics } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Fingerprint');
  const [biometricLoading, setBiometricLoading] = useState(false);

  const isAuthenticating = loading || biometricLoading;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop;
    if (isAuthenticating) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.94,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isAuthenticating, pulseAnim]);

  useEffect(() => {
    (async () => {
      const caps = await getBiometricCapabilities();
      const enabled = await isBiometricLoginEnabled();
      if (caps.supported && caps.enrolled && enabled) {
        setBiometricAvailable(true);
        setBiometricLabel(caps.label);
        const savedEmail = await getBiometricStoredEmail();
        if (savedEmail) {
          setForm((prev) => ({ ...prev, email: prev.email || savedEmail }));
        }
      }
    })();
  }, []);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    const id = form.email.trim();
    const digits = id.replace(/\D/g, '');
    const isPhone = /^09\d{9}$/.test(digits) || /^639\d{9}$/.test(digits);
    const isEmail = /\S+@\S+\.\S+/.test(id);
    if (!id) e.email = 'Email or mobile number is required';
    else if (!isPhone && !isEmail) e.email = 'Enter a valid email or PH mobile';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleBiometricLogin = async () => {
    lightHaptic();
    setBiometricLoading(true);
    try {
      await loginWithBiometrics();
      successHaptic();
    } catch (err) {
      if (err.code !== 'BIOMETRIC_CANCELLED') {
        Alert.alert('Biometric Sign-In', err.message || 'Verification failed. Please sign in with your password.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await login(form.email.trim().toLowerCase(), form.password);
      successHaptic();

      const caps = await getBiometricCapabilities();
      const alreadyEnabled = await isBiometricLoginEnabled();
      if (caps.supported && caps.enrolled && !alreadyEnabled && data.token) {
        Alert.alert(
          `Enable ${caps.label} Login?`,
          `Would you like to sign in faster next time using ${caps.label.toLowerCase()} instead of typing your password?`,
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: `Enable ${caps.label}`,
              onPress: async () => {
                await enableBiometricLogin(data.token, form.email.trim().toLowerCase());
                successHaptic();
              },
            },
          ]
        );
      }
    } catch (err) {
      if (err?.code === 'ROLE_NOT_ALLOWED') {
        Alert.alert('Vendors only', err.message);
      } else {
        Alert.alert('Login Failed', getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormScreen backgroundColor={colors.pageBg} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image source={brandLogo} style={styles.logoImage} resizeMode="cover" />
          </View>
          <Text style={styles.appName}>Liliw Market Connect</Text>
          <Text style={styles.tagline}>Vendor portal for Liliw Public Market</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in with your vendor account</Text>

          <Input
            label="Email or mobile"
            placeholder="email@example.com or 09171234567"
            keyboardType="default"
            textContentType="username"
            autoComplete="username"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => set('email', v)}
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            value={form.password}
            onChangeText={(v) => set('password', v)}
            error={errors.password}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotWrap}
            accessibilityRole="button"
          >
            <Text style={styles.forgot}>Forgot password?</Text>
          </TouchableOpacity>

          <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.btn} />

          {biometricAvailable ? (
            <>
              <View style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR QUICK LOGIN</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.biometricBtn}
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
                activeOpacity={0.85}
              >
                <FingerPrintIcon size={22} color={colors.primary} />
                <Text style={styles.biometricBtnText}>
                  {biometricLoading ? 'Verifying...' : `Sign In with ${biometricLabel}`}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>New vendor? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={isAuthenticating}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {}}
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <Animated.View style={[styles.loadingLogoWrap, { transform: [{ scale: pulseAnim }] }]}>
                <Image source={brandLogo} style={styles.loadingLogoImage} resizeMode="cover" />
              </Animated.View>
              <ActivityIndicator size="small" color={colors.primary} style={styles.loadingSpinner} />
              <Text style={styles.loadingTitle}>
                {biometricLoading ? `Verifying ${biometricLabel}...` : 'Signing You In...'}
              </Text>
              <Text style={styles.loadingSub}>
                {biometricLoading ? 'Authenticating your fingerprint' : 'Securing your vendor workspace'}
              </Text>
            </View>
          </View>
        </Modal>
    </FormScreen>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

    header: { alignItems: 'center', paddingTop: 72, paddingBottom: 32 },
    logoWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.surface,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
    logoImage: { width: '100%', height: '100%' },
    appName: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    tagline: { fontSize: 13, color: colors.inkMuted, textAlign: 'center' },

    form: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.borderBrand,
      shadowColor: colors.shadowBrand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 4,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.inkMuted, marginBottom: 24 },

    forgotWrap: { alignSelf: 'flex-end', marginBottom: 8, marginTop: -4 },
    forgot: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    btn: { marginTop: 4 },

    orDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 14,
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.borderBrand,
    },
    dividerText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.inkMuted,
      letterSpacing: 0.8,
    },
    biometricBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: `${colors.primary}12`,
      borderWidth: 1,
      borderColor: `${colors.primary}35`,
    },
    biometricBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { fontSize: 14, color: colors.gray500 },
    link: { fontSize: 14, color: colors.primary, fontWeight: '700' },

    loadingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingCard: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderBrand,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
    },
    loadingLogoWrap: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 2.5,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
      marginBottom: 18,
    },
    loadingLogoImage: {
      width: '100%',
      height: '100%',
    },
    loadingSpinner: {
      marginBottom: 12,
    },
    loadingTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.ink,
      textAlign: 'center',
      marginBottom: 4,
    },
    loadingSub: {
      fontSize: 13,
      color: colors.inkMuted,
      textAlign: 'center',
    },
  });
