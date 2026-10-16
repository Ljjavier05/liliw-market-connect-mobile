import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMyViolations } from '../../services/vendor.service';
import { useAlertsOptional } from '../../context/AlertsContext';
import { useTheme } from '../../context/ThemeContext';
import usePolling from '../../hooks/usePolling';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import { CheckCircleIcon } from '../../components/icons';

const buildSeverityStyles = (colors) => ({
  WARNING: { border: colors.amberBorder, bg: colors.warningLight, text: colors.amberInk, label: 'Warning' },
  MINOR: { border: colors.orangeBorder, bg: colors.orangeSoft, text: colors.orangeInk, label: 'Minor' },
  MAJOR: { border: colors.dangerBorder, bg: colors.dangerSoft, text: colors.dangerDeep, label: 'Major' },
  CRITICAL: { border: colors.danger, bg: colors.dangerLight, text: colors.dangerDeep || colors.danger, label: 'Critical' },
});

const buildStatusStyles = (colors) => ({
  OPEN: { bg: colors.dangerLight, text: colors.danger },
  ACKNOWLEDGED: { bg: colors.warningLight, text: colors.warning },
  RESOLVED: { bg: colors.successLight, text: colors.success },
  APPEALED: { bg: colors.primaryLight, text: colors.primary },
});

export default function VendorViolationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const severityStyles = useMemo(() => buildSeverityStyles(colors), [colors]);
  const statusStyles = useMemo(() => buildStatusStyles(colors), [colors]);
  const alertsCtx = useAlertsOptional();
  const alertsRef = useRef(alertsCtx);
  alertsRef.current = alertsCtx;

  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getMyViolations();
      setViolations(Array.isArray(data) ? data : []);
    } catch {
      setViolations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  usePolling(fetchData, 8000);

  // Opening this tab clears the Violations badge — vendor already saw the list
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await fetchData();
        if (!active) return;
        const ctx = alertsRef.current;
        if (!ctx) return;
        await ctx.refresh();
        if (!active) return;
        await ctx.markViolationsSeen();
      })();
      return () => {
        active = false;
      };
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const open = violations.filter((v) => v.status === 'OPEN' || v.status === 'ACKNOWLEDGED');

  const renderItem = ({ item }) => {
    const sev = severityStyles[item.severity] || severityStyles.WARNING;
    const sta = statusStyles[item.status] || statusStyles.OPEN;

    return (
      <View style={[styles.card, { borderColor: sev.border, backgroundColor: sev.bg }]}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: sev.border }]}>
            <Text style={[styles.badgeText, { color: sev.text }]}>{sev.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: sta.bg }]}>
            <Text style={[styles.badgeText, { color: sta.text }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={[styles.type, { color: sev.text }]}>{item.type}</Text>
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : '—'}
          </Text>
          {item.issuedBy ? <Text style={styles.metaText}>by {item.issuedBy}</Text> : null}
          {item.penalty != null && Number(item.penalty) > 0 ? (
            <Text style={[styles.metaText, styles.penalty]}>
              Penalty ₱{Number(item.penalty).toFixed(2)}
            </Text>
          ) : null}
        </View>

        {item.resolution ? (
          <Text style={styles.resolution}>Resolution: {item.resolution}</Text>
        ) : null}
      </View>
    );
  };

  if (loading) return <LoadingScreen message="Loading violations..." />;

  return (
    <View style={styles.container}>
      {open.length > 0 ? (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            You have {open.length} unresolved violation{open.length > 1 ? 's' : ''}. Contact the
            market office to resolve these issues.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={violations}
        keyExtractor={(v) => v.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={CheckCircleIcon}
            title="No violations on record"
            subtitle="Keep following market rules."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBg },
    alertBanner: {
      backgroundColor: colors.dangerLight,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 14,
      margin: 16,
      marginBottom: 0,
      borderRadius: 10,
    },
    alertText: { fontSize: 13, color: colors.danger, fontWeight: '600', lineHeight: 18 },
    list: { padding: 16, gap: 12, paddingBottom: 40, flexGrow: 1 },
    card: {
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
    },
    badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    type: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    description: { fontSize: 13, color: colors.gray600, lineHeight: 18 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    metaText: { fontSize: 11, color: colors.gray400 },
    penalty: { color: colors.danger, fontWeight: '600' },
    resolution: {
      fontSize: 12,
      color: colors.primary,
      marginTop: 8,
      fontWeight: '500',
      lineHeight: 16,
    },
  });
