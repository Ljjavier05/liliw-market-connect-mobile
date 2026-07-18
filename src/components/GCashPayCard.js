import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import {
  ClipboardDocumentIcon,
  DevicePhoneMobileIcon,
} from './icons';

/**
 * Market Office GCash payment card — shared by Stall Rent & Utility Bills.
 */
export default function GCashPayCard({
  officeGcash,
  subtitle = 'Use this office number for payments.',
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!officeGcash?.number) return;
    try {
      await Clipboard.setStringAsync(String(officeGcash.number));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Copy failed', 'Could not copy the GCash number. Please copy it manually.');
    }
  };

  if (!officeGcash?.number) {
    return (
      <View style={styles.warnCard}>
        <Text style={styles.warnTitle}>Market Office GCash is not set yet</Text>
        <Text style={styles.warnBody}>
          Contact the market office for payment instructions before submitting proof.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <DevicePhoneMobileIcon size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Send payment via GCash</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.numberBox}>
        <View style={{ flex: 1 }}>
          {officeGcash.accountName ? (
            <Text style={styles.accountName}>{officeGcash.accountName}</Text>
          ) : null}
          <Text style={styles.number} selectable>
            {officeGcash.number}
          </Text>
        </View>
        <TouchableOpacity style={styles.copyBtn} onPress={copy} activeOpacity={0.85}>
          <ClipboardDocumentIcon size={16} color={colors.primary} />
          <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.steps}>
        {['Send the exact amount', 'Choose & preview receipt', 'Submit — wait for confirmation'].map(
          (step, i) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}

export function openProofUrl(url) {
  if (!url) return;
  Linking.openURL(url).catch(() => {
    Alert.alert('Cannot open', 'Unable to open the proof file.');
  });
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.primaryLight,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.borderBrand,
      marginBottom: 12,
    },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 15, fontWeight: '700', color: colors.ink },
    sub: { fontSize: 12, color: colors.inkMuted, marginTop: 2, lineHeight: 17 },
    numberBox: {
      marginTop: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderBrand,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    accountName: { fontSize: 12, color: colors.inkMuted },
    number: {
      marginTop: 2,
      fontSize: 22,
      fontWeight: '800',
      color: colors.ink,
      letterSpacing: 0.5,
      fontVariant: ['tabular-nums'],
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderBrand,
      backgroundColor: colors.primaryLight,
    },
    copyText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    steps: { marginTop: 12, gap: 8 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepNum: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumText: { fontSize: 11, fontWeight: '800', color: colors.white },
    stepText: { flex: 1, fontSize: 12, color: colors.gray700, lineHeight: 16 },
    warnCard: {
      backgroundColor: colors.warningSoft,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      marginBottom: 12,
    },
    warnTitle: { fontSize: 14, fontWeight: '700', color: colors.warningDeep },
    warnBody: { fontSize: 12, color: colors.warningDeep, marginTop: 4, lineHeight: 17 },
  });
