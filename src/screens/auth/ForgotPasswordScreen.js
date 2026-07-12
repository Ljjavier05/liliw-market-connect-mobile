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
import { Ionicons } from '@expo/vector-icons';
import * as authService from '../../services/auth.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../theme/colors';

const STEPS = ['email', 'otp', 'done'];

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const handleSendOtp = async () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      Alert.alert(
        'OTP sent',
        'If that email exists and has a phone number on file, a 6-digit OTP was sent via SMS.'
      );
      setStep('otp');
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const e = {};
    if (!otp || otp.length !== 6) e.otp = 'Enter the 6-digit OTP';
    if (!newPassword || newPassword.length < 6) {
      e.newPassword = 'Password must be at least 6 characters';
    }
    if (newPassword !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      });
      setStep('done');
    } catch (err) {
      Alert.alert('Reset failed', err.response?.data?.message || 'Invalid or expired OTP');
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
            <Text style={styles.backText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          We will send a one-time code to the phone number linked to your vendor account.
        </Text>

        <View style={styles.stepRow}>
          {['Email', 'OTP', 'Done'].map((label, i) => (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= stepIndex && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, i <= stepIndex && styles.stepDotTextActive]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, i === stepIndex && styles.stepLabelActive]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {step === 'email' ? (
          <View>
            <Input
              label="Account Email"
              placeholder="vendor@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setErrors((prev) => ({ ...prev, email: '' }));
              }}
              error={errors.email}
            />
            <Button title="Send OTP via SMS" onPress={handleSendOtp} loading={loading} />
          </View>
        ) : null}

        {step === 'otp' ? (
          <View>
            <Input
              label="6-digit OTP"
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(v) => {
                setOtp(v.replace(/\D/g, '').slice(0, 6));
                setErrors((prev) => ({ ...prev, otp: '' }));
              }}
              error={errors.otp}
              style={styles.otpInput}
            />
            <Input
              label="New Password"
              placeholder="Min. 6 characters"
              secureTextEntry
              value={newPassword}
              onChangeText={(v) => {
                setNewPassword(v);
                setErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              error={errors.newPassword}
            />
            <Input
              label="Confirm New Password"
              placeholder="Re-enter password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
            />
            <Button title="Reset Password" onPress={handleReset} loading={loading} />
            <Button
              title="Resend OTP"
              variant="ghost"
              onPress={handleSendOtp}
              loading={loading}
              style={styles.resend}
            />
          </View>
        ) : null}

        {step === 'done' ? (
          <View style={styles.doneWrap}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.doneTitle}>Password reset</Text>
            <Text style={styles.doneText}>You can now sign in with your new password.</Text>
            <Button title="Back to Sign In" onPress={() => navigation.navigate('Login')} />
          </View>
        ) : null}
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
  subtitle: { fontSize: 14, color: colors.gray500, marginBottom: 24, lineHeight: 20 },

  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotText: { fontSize: 12, fontWeight: '700', color: colors.gray400 },
  stepDotTextActive: { color: colors.white },
  stepLabel: { fontSize: 11, color: colors.gray400, fontWeight: '600' },
  stepLabelActive: { color: colors.primary },

  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
  },

  resend: { marginTop: 8 },

  doneWrap: { alignItems: 'center', paddingTop: 24, gap: 10 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.gray900, marginTop: 8 },
  doneText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
});
