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
import { getPricingInsights } from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import { colors } from '../../theme/colors';

function money(n) {
  return `₱${Number(n || 0).toFixed(2)}`;
}

function getStatus(row) {
  const min = Number(row.suggestedRange?.min ?? 0);
  const max = Number(row.suggestedRange?.max ?? 0);
  const price = Number(row.currentPrice ?? 0);
  if (price < min) {
    return {
      key: 'LOW',
      label: 'Too low',
      hint: 'Consider raising your price',
      icon: 'arrow-up',
      bg: colors.primaryLight,
      text: colors.primary,
    };
  }
  if (price > max) {
    return {
      key: 'HIGH',
      label: 'Too high',
      hint: 'Consider lowering your price',
      icon: 'arrow-down',
      bg: '#ffedd5',
      text: '#c2410c',
    };
  }
  return {
    key: 'GOOD',
    label: 'Good',
    hint: 'Within suggested range',
    icon: 'checkmark',
    bg: colors.successLight,
    text: colors.success,
  };
}

export default function PricingInsightsScreen({ navigation }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL | GOOD | LOW | HIGH

  const fetchData = useCallback(async () => {
    try {
      const rows = await getPricingInsights();
      setInsights(Array.isArray(rows) ? rows : []);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  usePolling(fetchData, 15000);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const enriched = useMemo(
    () =>
      insights.map((row) => ({
        ...row,
        status: getStatus(row),
      })),
    [insights]
  );

  const counts = useMemo(
    () => ({
      good: enriched.filter((r) => r.status.key === 'GOOD').length,
      low: enriched.filter((r) => r.status.key === 'LOW').length,
      high: enriched.filter((r) => r.status.key === 'HIGH').length,
    }),
    [enriched]
  );

  const filtered = useMemo(() => {
    if (filter === 'ALL') return enriched;
    return enriched.filter((r) => r.status.key === filter);
  }, [enriched, filter]);

  const renderItem = ({ item }) => {
    const s = item.status;
    const diff = Number(item.currentPrice) - Number(item.marketAveragePrice);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.productName}</Text>
            <Text style={styles.category}>{item.category || 'Uncategorized'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={12} color={s.text} />
            <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Your price</Text>
            <Text style={styles.gridValue}>{money(item.currentPrice)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Market avg</Text>
            <Text style={styles.gridValue}>{money(item.marketAveragePrice)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Sold avg</Text>
            <Text style={styles.gridValue}>{money(item.historicalAverageSoldPrice)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Units sold</Text>
            <Text style={styles.gridValue}>{item.unitsSold ?? 0}</Text>
          </View>
        </View>

        <View style={styles.rangeBox}>
          <Text style={styles.rangeLabel}>Suggested range</Text>
          <Text style={styles.rangeValue}>
            {money(item.suggestedRange?.min)} – {money(item.suggestedRange?.max)}
          </Text>
          <Text style={styles.hint}>{s.hint}</Text>
          <Text style={styles.diff}>
            vs market:{' '}
            <Text style={{ color: diff >= 0 ? colors.warning : colors.primary, fontWeight: '700' }}>
              {diff >= 0 ? '+' : ''}
              {money(diff)}
            </Text>
          </Text>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen message="Loading price insights..." />;

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Price Watch</Text>
        <Text style={styles.introSub}>
          Suggested ranges based on market averages and your sales history.
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{counts.good} good</Text>
          <Text style={styles.summaryDot}>·</Text>
          <Text style={[styles.summaryText, { color: colors.primary }]}>{counts.low} too low</Text>
          <Text style={styles.summaryDot}>·</Text>
          <Text style={[styles.summaryText, { color: '#c2410c' }]}>{counts.high} too high</Text>
        </View>
      </View>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}
        >
          {[
            { id: 'ALL', label: 'All' },
            { id: 'GOOD', label: 'Good' },
            { id: 'LOW', label: 'Too low' },
            { id: 'HIGH', label: 'Too high' },
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
        keyExtractor={(item) => item.productId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📊"
            title={filter === 'ALL' ? 'No pricing insights yet' : 'No matching products'}
            subtitle="Add active products to see market price suggestions."
          />
        }
        ListFooterComponent={
          insights.length > 0 ? (
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate('TabProducts')}
            >
              <Text style={styles.manageBtnText}>Manage products →</Text>
            </TouchableOpacity>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },

  intro: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
  },
  introTitle: { fontSize: 16, fontWeight: '800', color: colors.gray900 },
  introSub: { fontSize: 12, color: colors.gray500, marginTop: 4, lineHeight: 17 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  summaryText: { fontSize: 12, fontWeight: '700', color: colors.success },
  summaryDot: { color: colors.gray300 },

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
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  productName: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  category: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '50%', marginBottom: 10 },
  gridLabel: { fontSize: 11, color: colors.gray400, fontWeight: '600' },
  gridValue: { fontSize: 14, fontWeight: '800', color: colors.gray900, marginTop: 2 },

  rangeBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
  },
  rangeLabel: { fontSize: 11, fontWeight: '700', color: colors.primary },
  rangeValue: { fontSize: 14, fontWeight: '800', color: colors.primaryDark, marginTop: 2 },
  hint: { fontSize: 12, color: colors.gray600, marginTop: 4 },
  diff: { fontSize: 11, color: colors.gray500, marginTop: 4 },

  manageBtn: { alignItems: 'center', paddingVertical: 12 },
  manageBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
