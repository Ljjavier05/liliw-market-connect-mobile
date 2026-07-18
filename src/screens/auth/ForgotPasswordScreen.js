import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
} from 'react-native';
import * as authService from '../../services/auth.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import FormScreen from '../../components/FormScreen';
import {
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
} from '../../components/icons';
import { useTheme } from '../../context/ThemeContext';
import { isValidPhPhone, sanitizePhoneInput } from '../../utils/phone';

const STEPS = ['account', 'otp', 'done'];
const CHANNELS = [
  {
    id: 'SMS',
    label: 'SMS',
    hint: 'Enter the mobile number on your account. Code is sent there via SMS.',
    Icon: DevicePhoneMobileIcon,
  },
  {
    id: 'EMAIL',
    label: 'Email',
    hint: 'Code sent to this account email',
    Icon: EnvelopeIcon,
  },
];

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState('account');
  const [channel, setChannel] = useState('SMS');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const channelMeta = CHANNELS.find((c) => c.id === channel) || CHANNELS[0];
  const ChannelIcon = channelMeta.Icon;

  const handleSendOtp = async () => {
    const e = {};
    if (!email.trim()) e.email = 'Account email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (channel === 'SMS') {
      if (!phone.trim()) e.phone = 'Mobile number is required for SMS';
      else if (!isValidPhPhone(phone)) {
        e.phone = 'Use an 11-digit PH mobile (e.g. 09171234567)';
      }
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const data = await authService.forgotPassword(
        email.trim().toLowerCase(),
        channel,
        channel === 'SMS' ? phone : undefined
      );
      const via = data?.channel === 'EMAIL' || channel === 'EMAIL' ? 'email' : 'SMS';
      if (via === 'email' && data?.devOtp) {
        setOtp(String(data.devOtp));
        setStep('otp');
        Alert.alert(
          'Your email OTP',
          `SMTP is not set up yet, so no inbox email was sent.\n\nYour code: ${data.devOtp}\n\nIt is already filled in. To send real emails, add Gmail SMTP to backend/.env (see .env.example).`
        );
        return;
      }
      Alert.alert(
        'OTP sent',
        via === 'email'
          ? data?.message ||
              'A 6-digit OTP was sent to your email. Check inbox and spam folder.'
          : 'If that email and mobile number match an account, a 6-digit OTP was sent via SMS.'
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
    <FormScreen backgroundColor={colors.pageBg} contentContainerStyle={styles.scroll}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Sign In</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        Enter your account email. For SMS, also enter your registered mobile number.
      </Text>

      <View style={styles.stepRow}>
        {['Account', 'OTP', 'Done'].map((label, i) => (
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

      {step === 'account' ? (
        <View>
          <Input
            label="Account Email"
            placeholder="vendor@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={errors.email}
          />

          <Text style={styles.channelLabel}>Send verification code via</Text>
          <View style={styles.channelRow}>
            {CHANNELS.map(({ id, label, Icon }) => {
              const active = channel === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    setChannel(id);
                    setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  style={[styles.channelChip, active && styles.channelChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Send OTP via ${label}`}
                >
                  <Icon size={18} color={active ? colors.primary : colors.gray500} />
                  <Text style={[styles.channelChipText, active && styles.channelChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.channelHint}>{channelMeta.hint}</Text>

          {channel === 'SMS' ? (
            <Input
              label="Mobile Number"
              placeholder="09171234567"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              value={phone}
              onChangeText={(v) => {
                setPhone(sanitizePhoneInput(v));
                setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              error={errors.phone}
            />
          ) : null}

          <Button
            title={channel === 'EMAIL' ? 'Send OTP via Email' : 'Send OTP via SMS'}
            onPress={handleSendOtp}
            loading={loading}
            style={styles.sendBtn}
          />
        </View>
      ) : null}

      {step === 'otp' ? (
        <View>
          <View style={styles.sentBanner}>
            <ChannelIcon size={16} color={colors.primary} />
            <Text style={styles.sentBannerText}>
              Code sent via {channel === 'EMAIL' ? 'Email' : 'SMS'}. Check your{' '}
              {channel === 'EMAIL' ? 'inbox' : 'phone messages'}.
            </Text>
          </View>
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
            title={channel === 'EMAIL' ? 'Resend OTP via Email' : 'Resend OTP via SMS'}
            variant="ghost"
            onPress={handleSendOtp}
            loading={loading}
            style={styles.resend}
          />
          <Button
            title="Change delivery method"
            variant="ghost"
            onPress={() => setStep('account')}
            disabled={loading}
          />
        </View>
      ) : null}

      {step === 'done' ? (
        <View style={styles.doneWrap}>
          <CheckCircleIcon size={64} color={colors.success} />
          <Text style={styles.doneTitle}>Password reset</Text>
          <Text style={styles.doneText}>You can now sign in with your new password.</Text>
          <Button title="Back to Sign In" onPress={() => navigation.navigate('Login')} />
        </View>
      ) : null}
    </FormScreen>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

    topBar: { paddingTop: 56, marginBottom: 20 },
    backBtn: { alignSelf: 'flex-start' },
    backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },

    title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.inkMuted, marginBottom: 24, lineHeight: 20 },

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

    channelLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.gray700,
      marginBottom: 8,
    },
    channelRow: { flexDirection: 'row', gap: 10 },
    channelChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.gray200,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
    },
    channelChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    channelChipText: { fontSize: 14, fontWeight: '700', color: colors.gray600 },
    channelChipTextActive: { color: colors.primary },
    channelHint: {
      fontSize: 12,
      color: colors.gray500,
      marginTop: 8,
      marginBottom: 4,
      lineHeight: 16,
    },
    sendBtn: { marginTop: 12 },

    sentBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.primaryLight,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    sentBannerText: {
      flex: 1,
      fontSize: 13,
      color: colors.primaryDark || colors.primary,
      fontWeight: '500',
      lineHeight: 18,
    },

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
