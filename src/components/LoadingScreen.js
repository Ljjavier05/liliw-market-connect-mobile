import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function LoadingScreen({ message = 'Loading...' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.pageBg,
      gap: 12,
    },
    text: {
      fontSize: 14,
      color: colors.inkMuted,
      marginTop: 8,
    },
  });
