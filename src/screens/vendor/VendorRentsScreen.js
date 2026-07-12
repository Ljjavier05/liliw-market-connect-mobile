import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyRents } from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import StatCard from '../../components/StatCard';
import { colors } from '../../theme/colors';

const STATUS_STYLES = {
  PAID: { bg: colors.successLight, text: colors.success, border: colors.success },
  UNPAID: { bg: colors.warningLight, text: colors.warning, border: colors.warning },
  OVERDUE: { bg: colors.dangerLight, text: colors.danger, border: colors.danger },
  PARTIAL: { bg: '#ffedd5', text: '#c2410c', border: '#fb923c' },
};

function formatMoney(amount) {
  return `₱${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function VendorRentsScreen() {
  const [rents, setRents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL | UNPAID | OVERDUE | PAID

  const fetchData = useCallback(async () => {
    try {
      const data = await getMyRents();
      setRents(Array.isArray(data) ? data : []);
    } catch {
      setRents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  usePolling(fetchData, 10000);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const unpaid = useMemo(() => rents.filter((r) => r.status !== 'PAID'), [rents]);
  const overdue = useMemo(() => rents.filter((r) => r.status === 'OVERDUE'), [rents]);
  const paid = useMemo(() => rents.filter((r) => r.status === 'PAID'), [rents]);
  const totalDue = useMemo(
    () => unpaid.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [unpaid]
  );
  const totalPaid = useMemo(
    () => paid.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [paid]
  );

  const filtered = useMemo(() => {
    if (filter === 'UNPAID') return rents.filter((r) => r.status !== 'PAID');
    if (filter === 'OVERDUE') return rents.filter((r) => r.status === 'OVERDUE');
    if (filter === 'PAID') return rents.filter((r) => r.status === 'PAID');
    return rents;
  }, [rents, filter]);

  const renderItem = ({ item }) => {
    const style = STATUS_STYLES[item.status] || STATUS_STYLES.UNPAID;
    return (
      <View style={[styles.card, { borderLeftColor: style.border }]}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.period}>{item.periodLabel || 'Rent period'}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.gray400} />
              <Text style={styles.metaText}>Due {formatDate(item.dueDate)}</Text>
            </View>
            {item.paidDate ? (
              <View style={styles.metaRow}>
                <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
                <Text style={[styles.metaText, { color: colors.success }]}>
                  Paid {formatDate(item.paidDate)}
                </Text>
              </View>
            ) : null}
            {item.notes ? (
              <Text style={styles.notes} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
          </View>

          <View style={styles.cardRight}>
            <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
              <Text style={[styles.statusText, { color: style.text }]}>{item.status}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen message="Loading rent records..." />;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.statsRow}>
          <StatCard
            icon="💰"
            label="Total due"
            value={formatMoney(totalDue)}
            color={totalDue > 0 ? colors.warning : colors.success}
          />
          <StatCard
            icon="✅"
            label="Paid"
            value={formatMoney(totalPaid)}
            color={colors.success}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="📄"
            label="Records"
            value={rents.length}
            color={colors.primary}
          />
          <StatCard
            icon="⚠️"
            label="Overdue"
            value={overdue.length}
            color={overdue.length ? colors.danger : colors.gray400}
          />
        </View>
      </View>

      {unpaid.length > 0 ? (
        <View style={styles.alertBanner}>
          <Text style={styles.alertTitle}>
            {unpaid.length} unpaid rent record{unpaid.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.alertSub}>
            Total due: {formatMoney(totalDue)} — Please settle at the market office.
          </Text>
        </View>
      ) : null}

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}
        >
          {[
            { id: 'ALL', label: 'All' },
            { id: 'UNPAID', label: 'Unpaid' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'PAID', label: 'Paid' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.filterText, filter === f.id && styles.filterTextActive]}
                numberOfLines={1}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="💰"
            title={filter === 'ALL' ? 'No rent records yet' : 'No matching rent records'}
            subtitle="Rent bills issued by the market office will appear here."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },

  summary: { paddingHorizontal: 16, paddingTop: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },

  alertBanner: {
    backgroundColor: colors.dangerLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 10,
  },
  alertTitle: { fontSize: 13, fontWeight: '700', color: colors.danger },
  alertSub: { fontSize: 12, color: colors.danger, marginTop: 2, lineHeight: 17 },

  filtersWrap: {
    height: 52,
    justifyContent: 'center',
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray800,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  filterTextActive: { color: colors.white },

  list: { padding: 16, gap: 10, paddingBottom: 40, flexGrow: 1 },

  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardLeft: { flex: 1 },
  period: { fontSize: 15, fontWeight: '700', color: colors.gray900, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, color: colors.gray400 },
  notes: { fontSize: 12, color: colors.gray500, marginTop: 8, lineHeight: 16 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
