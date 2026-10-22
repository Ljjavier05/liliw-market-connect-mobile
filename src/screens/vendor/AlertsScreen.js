import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAlerts } from '../../context/AlertsContext';
import { useTheme } from '../../context/ThemeContext';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import Button from '../../components/Button';
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BeakerIcon,
  BellIcon,
  BoltIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '../../components/icons';

const buildTypeMeta = (colors) => ({
  VIOLATION: {
    icon: ExclamationTriangleIcon,
    color: colors.danger,
    bg: colors.dangerLight,
    label: 'Violation',
  },
  RENT_OVERDUE: {
    icon: BanknotesIcon,
    color: colors.danger,
    bg: colors.dangerLight,
    label: 'Overdue rent',
  },
  RENT_UNPAID: {
    icon: BanknotesIcon,
    color: colors.warning,
    bg: colors.warningLight,
    label: 'Unpaid rent',
  },
  UTILITY_OVERDUE: {
    icon: BoltIcon,
    color: colors.danger,
    bg: colors.dangerLight,
    label: 'Overdue utility',
  },
  UTILITY_UNPAID: {
    icon: BeakerIcon,
    color: colors.warning,
    bg: colors.warningLight,
    label: 'Unpaid utility',
  },
  LOW_STOCK: {
    icon: ArchiveBoxIcon,
    color: colors.warning,
    bg: colors.warningLight,
    label: 'Low stock',
  },
  OFFICE_SMS: {
    icon: DevicePhoneMobileIcon,
    color: colors.primary,
    bg: colors.primaryLight,
    label: 'SMS / Office',
  },
});

function resolveSmsMeta(item, colors, base) {
  const tone = item.tone || 'neutral';
  if (tone === 'success') {
    return {
      icon: CheckCircleIcon,
      color: colors.success,
      bg: colors.successLight || colors.primaryLight,
      label: item.label || base.label,
    };
  }
  if (tone === 'danger') {
    return {
      icon: XCircleIcon,
      color: colors.danger,
      bg: colors.dangerLight,
      label: item.label || base.label,
    };
  }
  return {
    ...base,
    label: item.label || base.label,
  };
}

export default function AlertsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const typeMeta = useMemo(() => buildTypeMeta(colors), [colors]);
  const {
    alerts,
    loading,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
    isRead,
  } = useAlerts();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const latest = await refresh();
        if (!active) return;
        // Opening Alerts clears the bell / dashboard unread badge
        await markAllRead((latest || []).map((a) => a.key));
      })();
      return () => {
        active = false;
      };
    }, [refresh, markAllRead])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openAlert = async (item) => {
    await markRead(item.key);
    if (!item.target) return;

    const target = String(item.target);
    const parent = navigation.getParent();

    // Tab routes live on the bottom navigator
    if (target.startsWith('Tab')) {
      if (parent) parent.navigate(target);
      else navigation.navigate(target);
      return;
    }

    // Nested stack screens that live under a specific tab
    if (target === 'UtilityBills' && parent) {
      parent.navigate('TabRents', { screen: 'UtilityBills' });
      return;
    }
    if ((target === 'BusinessPermit' || target === 'BusinessPermitApplication' || target === 'AvailableStalls') && parent) {
      parent.navigate('TabDashboard', { screen: target });
      return;
    }

    navigation.navigate(target);
  };

  if (loading && alerts.length === 0) {
    return <LoadingScreen message="Loading alerts..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0
              ? `${unreadCount} unread · SMS, rent, utilities & stock`
              : 'SMS and office messages stay in sync here'}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Button title="Mark all read" variant="outline" size="sm" onPress={markAllRead} />
        ) : null}
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={BellIcon}
            title="No alerts right now"
            subtitle="You'll see SMS from the market office here, plus unpaid rent, utilities, violations, and low stock."
          />
        }
        renderItem={({ item }) => {
          const base = typeMeta[item.type] || typeMeta.OFFICE_SMS;
          const meta =
            item.type === 'OFFICE_SMS' ? resolveSmsMeta(item, colors, base) : base;
          const TypeIcon = meta.icon;
          const read = isRead(item.key);
          return (
            <TouchableOpacity
              style={[styles.card, !read && styles.cardUnread]}
              onPress={() => openAlert(item)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                <TypeIcon size={18} color={meta.color} />
              </View>
              <View style={styles.copy}>
                <View style={styles.topRow}>
                  <Text style={[styles.type, { color: meta.color }]}>{meta.label}</Text>
                  {!read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text
                  style={[
                    styles.message,
                    item.tone === 'danger' && { color: colors.danger },
                    item.tone === 'success' && { color: colors.success },
                  ]}
                >
                  {item.message}
                </Text>
                {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
                <Text style={styles.time}>
                  {item.at ? new Date(item.at).toLocaleString() : ''}
                </Text>
              </View>
              <ChevronRightIcon size={18} color={colors.gray300} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBg },
    headerCard: {
      margin: 16,
      marginBottom: 4,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.gray900 },
    headerSub: { fontSize: 12, color: colors.gray500, marginTop: 2 },
    list: { padding: 16, gap: 10, paddingBottom: 40, flexGrow: 1 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    cardUnread: {
      borderWidth: 1.5,
      borderColor: colors.primaryLight,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    type: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    title: { fontSize: 14, fontWeight: '700', color: colors.gray900, marginTop: 2 },
    message: { fontSize: 13, color: colors.gray700, marginTop: 2 },
    detail: { fontSize: 12, color: colors.gray400, marginTop: 4, lineHeight: 16 },
    time: { fontSize: 11, color: colors.gray300, marginTop: 6 },
  });
