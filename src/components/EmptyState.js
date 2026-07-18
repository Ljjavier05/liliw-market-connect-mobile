import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { InboxIcon } from './icons';

export default function EmptyState({
  icon: Icon = InboxIcon,
  title,
  subtitle,
  iconColor,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Icon size={48} color={iconColor || colors.gray300} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    icon: { marginBottom: 12 },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.ink,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: colors.inkMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
  });
