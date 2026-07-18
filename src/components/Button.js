import React, { useMemo } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { radii } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function Button({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const isDisabled = disabled || loading;
  const spinnerColor =
    variant === 'outline' || variant === 'ghost' || variant === 'secondary'
      ? colors.primary
      : colors.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors, isDark) =>
  StyleSheet.create({
    base: {
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    primary: {
      backgroundColor: colors.primaryDark,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(232, 245, 255, 0.16)' : 'rgba(255, 255, 255, 0.28)',
      shadowColor: colors.shadowBrand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.32,
      shadowRadius: 10,
      elevation: 4,
    },
    secondary: {
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    danger: {
      backgroundColor: isDark ? '#b91c1c' : colors.danger,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    disabled: {
      opacity: 0.5,
    },
    size_sm: { paddingVertical: 8, paddingHorizontal: 14 },
    size_md: { paddingVertical: 12, paddingHorizontal: 16 },
    size_lg: { paddingVertical: 16, paddingHorizontal: 24 },

    text: { fontWeight: '600' },
    text_primary: { color: colors.white },
    text_secondary: { color: isDark ? colors.primaryMid : colors.primaryDark },
    text_outline: { color: colors.primary },
    text_danger: { color: colors.white },
    text_ghost: { color: colors.primary },

    textSize_sm: { fontSize: 13 },
    textSize_md: { fontSize: 15 },
    textSize_lg: { fontSize: 16 },
  });
