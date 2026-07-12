import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAlerts } from '../../context/AlertsContext';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import Button from '../../components/Button';
import { colors } from '../../theme/colors';

const TYPE_META = {
  VIOLATION: { icon: 'warning', color: colors.danger, bg: colors.dangerLight, label: 'Violation' },
  RENT_OVERDUE: { icon: 'cash', color: colors.danger, bg: colors.dangerLight, label: 'Overdue rent' },
  RENT_UNPAID: { icon: 'cash-outline', color: colors.warning, bg: colors.warningLight, label: 'Unpaid rent' },
  LOW_STOCK: { icon: 'cube', color: colors.warning, bg: colors.warningLight, label: 'Low stock' },
};

export default function AlertsScreen({ navigation }) {
  const {
    alerts,
    loading,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
    isRead,
  } = useAlerts();
  const [refreshing, setRefreshing] = React.useState(false);

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
    if (item.target) {
      const parent = navigation.getParent();
      if (parent) parent.navigate(item.target);
      else navigation.navigate(item.target);
    }
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
              ? `${unreadCount} unread · violations, rent, and stock`
              : 'You are up to date'}
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
            icon="🔔"
            title="No alerts right now"
            subtitle="We'll notify you about open violations, overdue rent, and low stock."
          />
        }
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] || TYPE_META.VIOLATION;
          const read = isRead(item.key);
          return (
            <TouchableOpacity
              style={[styles.card, !read && styles.cardUnread]}
              onPress={() => openAlert(item)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={styles.copy}>
                <View style={styles.topRow}>
                  <Text style={[styles.type, { color: meta.color }]}>{meta.label}</Text>
                  {!read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
                <Text style={styles.time}>
                  {item.at ? new Date(item.at).toLocaleString() : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  headerCard: {
    margin: 16,
    marginBottom: 4,
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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
