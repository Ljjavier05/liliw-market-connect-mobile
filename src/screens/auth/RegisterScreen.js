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
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import FormScreen from '../../components/FormScreen';
import {
  DevicePhoneMobileIcon,
  EnvelopeIcon,
} from '../../components/icons';
import { isValidPhPhone, sanitizePhoneInput } from '../../utils/phone';

const CHANNELS = [
  {
    id: 'EMAIL',
    label: 'Email',
    hint: 'Code will be sent to the email you enter below. Re-type it to confirm.',
    Icon: EnvelopeIcon,
  },
  {
    id: 'SMS',
    label: 'SMS',
    hint: 'Code will be sent to the mobile number you enter below. Re-type it to confirm.',
    Icon: DevicePhoneMobileIcon,
  },
];

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState('form'); // form | otp
  const [channel, setChannel] = useState('EMAIL');
  const [registrationKey, setRegistrationKey] = useState('');
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    confirmEmail: '',
    phone: '',
    confirmPhone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const channelMeta = CHANNELS.find((c) => c.id === channel) || CHANNELS[0];
  const ChannelIcon = channelMeta.Icon;

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validateForm = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';

    if (channel === 'EMAIL') {
      if (!form.email.trim()) e.email = 'Email is required for email verification';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
      if (!form.confirmEmail.trim()) e.confirmEmail = 'Confirm your email';
      else if (form.email.trim().toLowerCase() !== form.confirmEmail.trim().toLowerCase()) {
        e.confirmEmail = 'Emails do not match';
      }
      if (form.phone && !isValidPhPhone(form.phone)) {
        e.phone = 'Use an 11-digit PH mobile (e.g. 09171234567)';
      }
    } else {
      if (!form.phone.trim()) e.phone = 'Mobile number is required for SMS verification';
      else if (!isValidPhPhone(form.phone)) {
        e.phone = 'Use an 11-digit PH mobile (e.g. 09171234567)';
      }
      if (!form.confirmPhone.trim()) e.confirmPhone = 'Confirm your mobile number';
      else if (form.phone !== form.confirmPhone) {
        e.confirmPhone = 'Mobile numbers do not match';
      }
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
      if (form.email && form.confirmEmail && form.email.trim().toLowerCase() !== form.confirmEmail.trim().toLowerCase()) {
        e.confirmEmail = 'Emails do not match';
      }
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

  const handleSendOtp = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const data = await authService.registerSendOtp({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        confirmEmail: form.confirmEmail.trim() || undefined,
        phone: form.phone || undefined,
        confirmPhone: form.confirmPhone || undefined,
        password: form.password,
        confirmPassword: form.confirmPassword,
        channel,
      });
      setRegistrationKey(data.registrationKey || '');
      if (data.devOtp) {
        setOtp(String(data.devOtp));
        Alert.alert('Your verification code', `Code: ${data.devOtp}\n\n${data.message || ''}`);
      } else {
        Alert.alert(
          'Code sent',
          data.message ||
            (channel === 'EMAIL'
              ? 'Check your email for the verification code.'
              : 'Check your SMS for the verification code.')
        );
      }
      setStep('otp');
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Enter the 6-digit code' });
      return;
    }
    setLoading(true);
    try {
      const data = await authService.registerVerify({
        registrationKey,
        otp,
        channel,
        email: form.email.trim() || undefined,
        phone: form.phone || undefined,
      });
      Alert.alert('Account created', data.message || 'You can now sign in.', [
        {
          text: 'Sign In',
          onPress: () =>
            navigation.navigate('Login', {
              email: data.loginHint || form.email || form.phone,
            }),
        },
      ]);
    } catch (err) {
      Alert.alert('Verification failed', err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormScreen backgroundColor={colors.pageBg} contentContainerStyle={styles.scroll}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (step === 'otp' ? setStep('form') : navigation.goBack())}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{step === 'otp' ? '← Edit details' : '← Back'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Create vendor account</Text>
      <Text style={styles.subtitle}>
        {step === 'form'
          ? 'Choose Email or SMS for your verification code. Confirm that contact, then we will send a code before creating your account.'
          : `Enter the 6-digit code sent via ${channel === 'EMAIL' ? 'email' : 'SMS'}.`}
      </Text>

      <View style={styles.roleChip}>
        <Text style={styles.roleChipText}>Role: Vendor</Text>
      </View>

      {step === 'form' ? (
        <View>
          <Input
            label="Full Name"
            placeholder="Juan dela Cruz"
            textContentType="name"
            autoCapitalize="words"
            value={form.name}
            onChangeText={(v) => set('name', v)}
            error={errors.name}
          />

          <Text style={styles.channelLabel}>Receive verification code via</Text>
          <View style={styles.channelRow}>
            {CHANNELS.map(({ id, label, Icon }) => {
              const active = channel === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    setChannel(id);
                    setErrors((prev) => ({
                      ...prev,
                      email: '',
                      confirmEmail: '',
                      phone: '',
                      confirmPhone: '',
                    }));
                  }}
                  style={[styles.channelChip, active && styles.channelChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
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

          {channel === 'EMAIL' || form.email || channel === 'SMS' ? (
            <>
              <Input
                label={channel === 'EMAIL' ? 'Email' : 'Email (optional)'}
                placeholder="you@example.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={form.email}
                onChangeText={(v) => set('email', v)}
                error={errors.email}
              />
              {(channel === 'EMAIL' || !!form.email) && (
                <Input
                  label={channel === 'EMAIL' ? 'Confirm Email' : 'Confirm Email (optional)'}
                  placeholder="Re-enter email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={form.confirmEmail}
                  onChangeText={(v) => set('confirmEmail', v)}
                  error={errors.confirmEmail}
                />
              )}
            </>
          ) : null}

          <Input
            label={channel === 'SMS' ? 'Mobile Number' : 'Mobile Number (optional)'}
            placeholder="09171234567"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={form.phone}
            onChangeText={(v) => set('phone', sanitizePhoneInput(v))}
            error={errors.phone}
          />
          {(channel === 'SMS' || !!form.phone) && (
            <Input
              label={channel === 'SMS' ? 'Confirm Mobile Number' : 'Confirm Mobile (optional)'}
              placeholder="Re-enter mobile number"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              value={form.confirmPhone}
              onChangeText={(v) => set('confirmPhone', sanitizePhoneInput(v))}
              error={errors.confirmPhone}
            />
          )}

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

          <Button
            title={channel === 'EMAIL' ? 'Send code via Email' : 'Send code via SMS'}
            onPress={handleSendOtp}
            loading={loading}
            style={styles.btn}
          />
        </View>
      ) : (
        <View>
          <View style={styles.sentBanner}>
            <ChannelIcon size={16} color={colors.primary} />
            <Text style={styles.sentBannerText}>
              Code sent via {channel === 'EMAIL' ? 'Email' : 'SMS'}. Enter it to finish creating your
              account.
            </Text>
          </View>
          <Input
            label="6-digit verification code"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(v) => {
              setOtp(v.replace(/\D/g, '').slice(0, 6));
              setErrors((prev) => ({ ...prev, otp: '' }));
            }}
            error={errors.otp}
          />
          <Button title="Verify & Create Account" onPress={handleVerify} loading={loading} />
          <Button
            title="Resend code"
            variant="ghost"
            onPress={handleSendOtp}
            loading={loading}
            style={styles.resend}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Sign In</Text>
        </TouchableOpacity>
      </View>
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
    subtitle: { fontSize: 14, color: colors.inkMuted, marginBottom: 16, lineHeight: 20 },
    roleChip: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 20,
    },
    roleChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    channelLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 8,
    },
    channelRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    channelChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.gray200,
      backgroundColor: colors.surface,
    },
    channelChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    channelChipText: { fontSize: 14, fontWeight: '600', color: colors.gray500 },
    channelChipTextActive: { color: colors.primary },
    channelHint: { fontSize: 12, color: colors.inkMuted, marginBottom: 16, lineHeight: 17 },
    btn: { marginTop: 8 },
    resend: { marginTop: 8 },
    sentBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      marginBottom: 16,
    },
    sentBannerText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { fontSize: 14, color: colors.gray500 },
    link: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  });
