import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import FormScreen from '../../components/FormScreen';
import { API_BASE_URL } from '../../config/env';

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
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email.trim().toLowerCase(), form.password);
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
    <FormScreen backgroundColor={colors.primaryLight} contentContainerStyle={styles.scroll}>
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>New vendor? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>
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

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { fontSize: 14, color: colors.gray500 },
    link: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  });
