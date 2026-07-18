import React, { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { radii } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { EyeIcon, EyeSlashIcon } from './icons';

export default function Input({
  label,
  error,
  secureTextEntry,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          {...props}
          style={[styles.input, style]}
          placeholderTextColor={colors.gray400}
          secureTextEntry={isPassword && !visible}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          autoCorrect={props.autoCorrect ?? false}
          underlineColorAndroid="transparent"
          blurOnSubmit={props.blurOnSubmit ?? false}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {isPassword ? (
          <Pressable
            focusable={false}
            onPress={() => setVisible((v) => !v)}
            style={styles.eyeBtn}
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            {visible ? (
              <EyeSlashIcon size={18} color={colors.gray400} />
            ) : (
              <EyeIcon size={18} color={colors.gray400} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { marginBottom: 14 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.gray700,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.gray200,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      minHeight: 48,
    },
    inputFocused: {
      borderColor: colors.primary,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: colors.shadowBrand,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.18,
            shadowRadius: 4,
          }
        : {}),
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.ink,
      paddingVertical: Platform.OS === 'android' ? 10 : 12,
    },
    inputError: {
      borderColor: colors.danger,
    },
    eyeBtn: {
      padding: 4,
      minWidth: 32,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontSize: 12,
      color: colors.danger,
      marginTop: 4,
    },
  });
