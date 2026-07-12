import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../theme/colors';
import { sanitizePhoneInput } from '../../utils/phone';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (form.phone && !/^09\d{9}$/.test(form.phone)) {
      e.phone = 'Use an 11-digit PH mobile (e.g. 09171234567)';
    }
    if (!form.password || form.password.length < 6) {
      e.password = 'Password must be at least 6 characters';
    }
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone || undefined,
      });
    } catch (err) {
      Alert.alert(
        'Registration Failed',
        err?.code === 'ROLE_NOT_ALLOWED'
          ? err.message
          : err.response?.data?.message || 'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Create vendor account</Text>
        <Text style={styles.subtitle}>
          Register as a stall vendor for Liliw Public Market. You can submit your store application after signing in.
        </Text>

        <View style={styles.roleChip}>
          <Text style={styles.roleChipText}>Role: Vendor</Text>
        </View>

        <Input
          label="Full Name"
          placeholder="Juan dela Cruz"
          textContentType="name"
          autoCapitalize="words"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          error={errors.name}
        />
        <Input
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={form.email}
          onChangeText={(v) => set('email', v)}
          error={errors.email}
        />
        <Input
          label="Phone (recommended)"
          placeholder="09171234567"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          value={form.phone}
          onChangeText={(v) => set('phone', sanitizePhoneInput(v))}
          error={errors.phone}
        />
        <Input
          label="Password"
          placeholder="Min. 6 characters"
          secureTextEntry
          textContentType="newPassword"
          value={form.password}
          onChangeText={(v) => set('password', v)}
          error={errors.password}
        />
        <Input
          label="Confirm Password"
          placeholder="Re-enter password"
          secureTextEntry
          textContentType="newPassword"
          value={form.confirmPassword}
          onChangeText={(v) => set('confirmPassword', v)}
          error={errors.confirmPassword}
        />

        <Button title="Create Account" onPress={handleRegister} loading={loading} style={styles.btn} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  topBar: { paddingTop: 56, marginBottom: 20 },
  backBtn: { alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },

  title: { fontSize: 26, fontWeight: '800', color: colors.gray900, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.gray500, marginBottom: 16, lineHeight: 20 },

  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  roleChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  btn: { marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: colors.gray500 },
  link: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});
