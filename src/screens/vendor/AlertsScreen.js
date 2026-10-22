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
  CheckIcon,
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
    markUnread,
    markAllRead,
    markAllUnread,
    isRead,
  } = useAlerts();
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await refresh();
      })();
      return () => {
        active = false;
      };
    }, [refresh])
  );

  const displayedAlerts = useMemo(() => {
    if (filterTab === 'UNREAD') {
      return alerts.filter((a) => !isRead(a.key));
    }
    return alerts;
  }, [alerts, filterTab, isRead]);

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
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0
              ? `${unreadCount} unread · Tap to open`
              : 'All alerts caught up'}
          </Text>
        </View>
        {alerts.length > 0 ? (
          unreadCount > 0 ? (
            <Button title="Mark all read" variant="outline" size="sm" onPress={() => markAllRead()} />
          ) : (
            <Button title="Mark all unread" variant="outline" size="sm" onPress={() => markAllUnread()} />
          )
        ) : null}
      </View>

      {/* Segmented Filter: All vs Unread */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filterTab === 'ALL' && styles.filterBtnActive]}
          onPress={() => setFilterTab('ALL')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filterTab === 'ALL' && styles.filterTextActive]}>
            All ({alerts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterTab === 'UNREAD' && styles.filterBtnActive]}
          onPress={() => setFilterTab('UNREAD')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filterTab === 'UNREAD' && styles.filterTextActive]}>
            Unread
          </Text>
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedAlerts}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={BellIcon}
            title={filterTab === 'UNREAD' ? 'No unread alerts' : 'No alerts right now'}
            subtitle={
              filterTab === 'UNREAD'
                ? 'All your alerts are marked as read. Switch to "All" to view past alerts.'
                : "You'll see SMS from the market office here, plus unpaid rent, utilities, violations, and low stock."
            }
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
                  {!read ? (
                    <View style={styles.unreadTag}>
                      <View style={styles.dot} />
                      <Text style={styles.unreadTagText}>Unread</Text>
                    </View>
                  ) : null}
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

                {/* Bottom Row: Timestamp and Toggle Button */}
                <View style={styles.bottomRow}>
                  <Text style={styles.time}>
                    {item.at ? new Date(item.at).toLocaleDateString() : ''}
                  </Text>

                  <TouchableOpacity
                    style={[styles.toggleBtn, !read ? styles.toggleBtnUnread : styles.toggleBtnRead]}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      if (read) {
                        markUnread(item.key);
                      } else {
                        markRead(item.key);
                      }
                    }}
                    hitSlop={8}
                    activeOpacity={0.7}
                  >
                    {!read ? (
                      <View style={styles.btnRow}>
                        <CheckIcon size={12} color={colors.primary} />
                        <Text style={[styles.toggleBtnText, { color: colors.primary }]}>
                          Mark as read
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.btnRow}>
                        <View style={styles.readDot} />
                        <Text style={[styles.toggleBtnText, { color: colors.gray500 }]}>
                          Mark as unread
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <ChevronRightIcon size={18} color={colors.gray300} style={{ marginTop: 2 }} />
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
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.gray900 },
    headerSub: { fontSize: 12, color: colors.gray500, marginTop: 2 },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    filterBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.gray200 || '#e2e8f0',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.gray600 || '#475569',
    },
    filterTextActive: {
      color: '#ffffff',
    },
    unreadBadge: {
      backgroundColor: '#ef4444',
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    unreadBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#ffffff',
    },
    list: { padding: 16, paddingTop: 6, gap: 10, paddingBottom: 40, flexGrow: 1 },
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
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight ? `${colors.primaryLight}15` : colors.surface,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    type: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    unreadTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#fee2e2',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    unreadTagText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#ef4444',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#ef4444',
    },
    title: { fontSize: 14, fontWeight: '700', color: colors.gray900, marginTop: 2 },
    message: { fontSize: 13, color: colors.gray700, marginTop: 2 },
    detail: { fontSize: 12, color: colors.gray400, marginTop: 4, lineHeight: 16 },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 6,
      borderTopWidth: 0.5,
      borderTopColor: colors.gray200 || '#e2e8f0',
    },
    time: { fontSize: 11, color: colors.gray400 },
    toggleBtn: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    toggleBtnUnread: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight ? `${colors.primaryLight}30` : '#f0fdf4',
    },
    toggleBtnRead: {
      borderColor: colors.gray200 || '#e2e8f0',
      backgroundColor: 'transparent',
    },
    btnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    toggleBtnText: {
      fontSize: 11,
      fontWeight: '700',
    },
    readDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.gray400,
    },
  });
