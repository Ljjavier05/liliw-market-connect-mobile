import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function EmptyState({ icon = '📭', title, subtitle }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.gray400,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
