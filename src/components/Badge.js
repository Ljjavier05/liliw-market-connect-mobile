import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const VARIANTS = {
  PENDING: { bg: colors.warningLight, text: colors.warning },
  APPROVED: { bg: colors.primaryLight, text: colors.primary },
  REJECTED: { bg: colors.dangerLight, text: colors.danger },
  SUSPENDED: { bg: colors.gray100, text: colors.gray600 },
  ACTIVE: { bg: colors.successLight, text: colors.success },
  INACTIVE: { bg: colors.gray100, text: colors.gray500 },
  PAID: { bg: colors.successLight, text: colors.success },
  UNPAID: { bg: colors.warningLight, text: colors.warning },
  OVERDUE: { bg: colors.dangerLight, text: colors.danger },
  PARTIAL: { bg: '#ffedd5', text: '#c2410c' },
  OPEN: { bg: colors.dangerLight, text: colors.danger },
  ACKNOWLEDGED: { bg: colors.warningLight, text: colors.warning },
  RESOLVED: { bg: colors.successLight, text: colors.success },
  APPEALED: { bg: colors.primaryLight, text: colors.primary },
  WARNING: { bg: colors.warningLight, text: colors.warning },
  MINOR: { bg: '#ffedd5', text: '#c2410c' },
  MAJOR: { bg: colors.dangerLight, text: colors.danger },
  CRITICAL: { bg: '#7f1d1d', text: '#fecaca' },
  VENDOR: { bg: colors.primaryLight, text: colors.primary },
};

export default function Badge({ label, variant }) {
  const key = (variant || label || '').toString().toUpperCase();
  const style = VARIANTS[key] || { bg: colors.gray100, text: colors.gray600 };

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
