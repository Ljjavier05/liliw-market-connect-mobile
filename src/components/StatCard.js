import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radii } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { ArchiveBoxIcon } from './icons';

export default function StatCard({
  icon: Icon = ArchiveBoxIcon,
  label,
  value,
  color,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tint = color || colors.primary;
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${tint}18` }]}>
        <Icon size={20} color={tint} />
      </View>
      <Text style={[styles.value, { color: tint }]}>{value ?? '—'}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderBrand,
      shadowColor: colors.shadowBrand,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      minWidth: 90,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    value: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 2,
    },
    label: {
      fontSize: 11,
      color: colors.inkMuted,
      textAlign: 'center',
      fontWeight: '500',
    },
  });
