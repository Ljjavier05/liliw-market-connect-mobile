import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radii } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const buildVariants = (colors) => ({
  PENDING: { bg: colors.warningLight, text: colors.warning },
  APPROVED: { bg: colors.successLight, text: colors.success },
  REJECTED: { bg: colors.dangerLight, text: colors.danger },
  SUSPENDED: { bg: colors.gray100, text: colors.gray600 },
  ACTIVE: { bg: colors.successLight, text: colors.success },
  INACTIVE: { bg: colors.gray100, text: colors.gray500 },
  PAID: { bg: colors.successLight, text: colors.success },
  UNPAID: { bg: colors.warningLight, text: colors.warning },
  OVERDUE: { bg: colors.dangerLight, text: colors.danger },
  PARTIAL: { bg: colors.warningSoft, text: colors.warningDeep },
  OPEN: { bg: colors.dangerLight, text: colors.danger },
  ACKNOWLEDGED: { bg: colors.warningLight, text: colors.warning },
  RESOLVED: { bg: colors.successLight, text: colors.success },
  APPEALED: { bg: colors.primaryLight, text: colors.primary },
  UNDER_REVIEW: { bg: colors.primaryLight, text: colors.primary },
  RESUBMISSION_REQUIRED: { bg: colors.dangerLight, text: colors.danger },
  EXPIRED: { bg: colors.gray100, text: colors.gray600 },
  DRAFT: { bg: colors.gray100, text: colors.gray600 },
  SUBMITTED: { bg: colors.warningLight, text: colors.warning },
  DOCUMENTS_REQUESTED: { bg: colors.warningSoft, text: colors.warningDeep },
  WARNING: { bg: colors.warningLight, text: colors.warning },
  MINOR: { bg: colors.warningSoft, text: colors.warningDeep },
  MAJOR: { bg: colors.dangerLight, text: colors.danger },
  CRITICAL: { bg: colors.criticalBg, text: colors.criticalText },
  VENDOR: { bg: colors.primaryLight, text: colors.primary },
});

export default function Badge({ label, variant }) {
  const { colors } = useTheme();
  const variants = useMemo(() => buildVariants(colors), [colors]);
  const key = (variant || label || '').toString().toUpperCase();
  const style = variants[key] || { bg: colors.gray100, text: colors.gray600 };

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
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
