import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { radii } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function Card({ children, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderBrand,
      shadowColor: colors.shadowBrand,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
  });
