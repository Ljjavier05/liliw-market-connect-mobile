import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  getMyVendor,
  getMyRents,
  getMyViolations,
  getPricingInsights,
} from '../../services/vendor.service';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import LoadingScreen from '../../components/LoadingScreen';
import StoreAvatar from '../../components/StoreAvatar';
import { useAlertsOptional } from '../../context/AlertsContext';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

function insightStatus(row) {
  const min = Number(row.suggestedRange?.min ?? 0);
  const max = Number(row.suggestedRange?.max ?? 0);
  const price = Number(row.currentPrice ?? 0);
  if (price < min) return { label: 'Too low', bg: colors.primaryLight, text: colors.primary };
  if (price > max) return { label: 'Too high', bg: '#ffedd5', text: '#c2410c' };
  return { label: 'Good', bg: colors.successLight, text: colors.success };
}

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function VendorDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const alertsCtx = useAlertsOptional();
  const [vendor, setVendor] = useState(null);
  const [rents, setRents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [v, r, vi, pi] = await Promise.all([
        getMyVendor(),
        getMyRents().catch(() => []),
        getMyViolations().catch(() => []),
        getPricingInsights().catch(() => []),
      ]);
      // null = confirmed no vendor profile (404). Keep previous on unexpected errors.
      setVendor(v);
      setRents(r);
      setViolations(vi);
      setInsights(Array.isArray(pi) ? pi : []);
    } catch (err) {
      if (err?.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
        await logout();
        return;
      }
      // Do not clear vendor — avoids "Set up your store" flash when account status changes
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  // Refresh every time Dashboard tab/screen is focused (e.g. after saving logo)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <LoadingScreen message="Loading dashboard..." />;

  const products = vendor?.products || [];
  const activeProducts = products.filter((p) => p.isActive).length;
  const lowStock = products.filter((p) => p.isActive && p.stock <= 5);
  const unpaidRents = rents.filter((r) => r.status !== 'PAID');
  const overdueRents = rents.filter((r) => r.status === 'OVERDUE');
  const openViolations = violations.filter(
    (v) => v.status === 'OPEN' || v.status === 'ACKNOWLEDGED'
  );
  const criticalViolations = violations.filter(
    (v) => v.severity === 'CRITICAL' && v.status !== 'RESOLVED'
  );
  const totalDue = unpaidRents.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{greetingForHour(new Date().getHours())}</Text>
        <Text style={styles.name}>{user?.name}</Text>
      </View>

      {alertsCtx && alertsCtx.unreadCount > 0 ? (
        <TouchableOpacity
          style={styles.alertsBanner}
          onPress={() => navigation.navigate('Alerts')}
          activeOpacity={0.85}
        >
          <View style={styles.alertsBannerIcon}>
            <Ionicons name="notifications" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertsBannerTitle}>
              {alertsCtx.unreadCount} new alert{alertsCtx.unreadCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.alertsBannerSub}>
              Tap to review violations, rent, and stock warnings
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      {!vendor ? (
        <TouchableOpacity
          style={styles.setupCard}
          onPress={() => navigation.navigate('TabProfile')}
          activeOpacity={0.85}
        >
          <Text style={styles.setupIcon}>🏪</Text>
          <Text style={styles.setupTitle}>Set up your store</Text>
          <Text style={styles.setupSub}>
            Submit your vendor application to start selling at Liliw Public Market.
          </Text>
          <View style={styles.setupBtn}>
            <Text style={styles.setupBtnText}>Go to Profile →</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.storeCard}>
            <View style={styles.storeRow}>
              <StoreAvatar
                logo={vendor.logo}
                name={vendor.storeName}
                cacheKey={vendor.updatedAt || vendor.logo}
                size={52}
                radius={14}
              />
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{vendor.storeName}</Text>
                <Text style={styles.storeMeta} numberOfLines={1}>
                  {[
                    vendor.stallNumber && `Stall ${vendor.stallNumber}`,
                    vendor.businessType,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No stall details yet'}
                </Text>
              </View>
              <Badge label={vendor.status} variant={vendor.status} />
            </View>

            {vendor.status === 'PENDING' ? (
              <View style={styles.alertBox}>
                <Text style={styles.alertText}>
                  Your application is pending admin approval. You will get an SMS once reviewed.
                </Text>
              </View>
            ) : null}
            {vendor.status === 'REJECTED' ? (
              <View style={[styles.alertBox, styles.alertDanger]}>
                <Text style={[styles.alertText, styles.alertTextDanger]}>
                  Application rejected
                  {vendor.rejectionReason ? `: ${vendor.rejectionReason}` : '.'} You can re-apply
                  from Profile.
                </Text>
              </View>
            ) : null}
            {vendor.status === 'SUSPENDED' ? (
              <View style={[styles.alertBox, styles.alertDanger]}>
                <Text style={[styles.alertText, styles.alertTextDanger]}>
                  Your stall is suspended. Your store profile and products are kept. Once the
                  market office reactivates your account, you can manage your store again.
                </Text>
              </View>
            ) : null}
          </View>

          {(criticalViolations.length > 0 || overdueRents.length > 0 || lowStock.length > 0) && (
            <View style={styles.urgentCard}>
              <Text style={styles.urgentTitle}>Needs attention</Text>
              {criticalViolations.length > 0 ? (
                <TouchableOpacity onPress={() => navigation.navigate('TabViolations')}>
                  <Text style={styles.urgentItem}>
                    {criticalViolations.length} critical violation
                    {criticalViolations.length > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {overdueRents.length > 0 ? (
                <TouchableOpacity onPress={() => navigation.navigate('TabRents')}>
                  <Text style={styles.urgentItem}>
                    {overdueRents.length} overdue rent record
                    {overdueRents.length > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {lowStock.length > 0 ? (
                <TouchableOpacity onPress={() => navigation.navigate('TabProducts')}>
                  <Text style={styles.urgentItem}>
                    {lowStock.length} low-stock product{lowStock.length > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {vendor.status === 'APPROVED' ? (
            <>
              <Text style={styles.sectionTitle}>Store overview</Text>
              <View style={styles.statsRow}>
                <StatCard
                  icon="📦"
                  label="Active products"
                  value={activeProducts}
                  color={colors.primary}
                />
                <StatCard
                  icon="⚠️"
                  label="Low stock"
                  value={lowStock.length}
                  color={lowStock.length ? colors.danger : colors.gray400}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  icon="💰"
                  label="Rent due"
                  value={totalDue > 0 ? `₱${totalDue.toLocaleString()}` : '0'}
                  color={totalDue > 0 ? colors.warning : colors.success}
                />
                <StatCard
                  icon="🚨"
                  label="Open violations"
                  value={openViolations.length}
                  color={openViolations.length ? colors.danger : colors.success}
                />
              </View>

              {lowStock.length > 0 ? (
                <View style={styles.lowStockCard}>
                  <Text style={styles.lowStockTitle}>Low stock</Text>
                  {lowStock.slice(0, 5).map((p) => (
                    <View key={p.id} style={styles.lowStockRow}>
                      <Text style={styles.lowStockName}>{p.name}</Text>
                      <Text style={styles.lowStockQty}>{p.stock} left</Text>
                    </View>
                  ))}
                  {lowStock.length > 5 ? (
                    <TouchableOpacity onPress={() => navigation.navigate('TabProducts')}>
                      <Text style={styles.seeAll}>See all products →</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {unpaidRents.length > 0 ? (
                <View style={styles.panel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Unpaid rent</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('TabRents')}>
                      <Text style={styles.seeAll}>View all</Text>
                    </TouchableOpacity>
                  </View>
                  {unpaidRents.slice(0, 3).map((r) => (
                    <View key={r.id} style={styles.panelRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.panelRowTitle}>{r.periodLabel || 'Rent period'}</Text>
                        <Text style={styles.panelRowSub}>
                          Due {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}
                        </Text>
                      </View>
                      <Text style={styles.panelAmount}>₱{Number(r.amount).toLocaleString()}</Text>
                      <Badge label={r.status} variant={r.status} />
                    </View>
                  ))}
                </View>
              ) : null}

              {openViolations.length > 0 ? (
                <View style={styles.panel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Open violations</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('TabViolations')}>
                      <Text style={styles.seeAll}>View all</Text>
                    </TouchableOpacity>
                  </View>
                  {openViolations.slice(0, 3).map((v) => (
                    <View key={v.id} style={styles.panelRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.panelRowTitle}>{v.type}</Text>
                        <Text style={styles.panelRowSub} numberOfLines={1}>
                          {v.description || v.severity}
                        </Text>
                      </View>
                      <Badge label={v.severity} variant={v.severity} />
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <View>
                    <Text style={styles.panelTitle}>Price Watch</Text>
                    <Text style={styles.panelRowSub}>Market vs your prices</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('PricingInsights')}>
                    <Text style={styles.seeAll}>See all</Text>
                  </TouchableOpacity>
                </View>

                {insights.length === 0 ? (
                  <Text style={styles.panelRowSub}>
                    No insights yet. Add active products to get price suggestions.
                  </Text>
                ) : (
                  insights.slice(0, 4).map((row) => {
                    const status = insightStatus(row);
                    return (
                      <TouchableOpacity
                        key={row.productId}
                        style={styles.panelRow}
                        onPress={() => navigation.navigate('PricingInsights')}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.panelRowTitle}>{row.productName}</Text>
                          <Text style={styles.panelRowSub}>
                            You ₱{Number(row.currentPrice).toFixed(2)} · Market ₱
                            {Number(row.marketAveragePrice).toFixed(2)}
                          </Text>
                          <Text style={styles.rangeHint}>
                            Suggest ₱{Number(row.suggestedRange?.min).toFixed(2)} – ₱
                            {Number(row.suggestedRange?.max).toFixed(2)}
                          </Text>
                        </View>
                        <View style={[styles.insightBadge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.insightBadgeText, { color: status.text }]}>
                            {status.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: 20, paddingBottom: 40 },

  header: { marginBottom: 16, paddingTop: 4 },
  greeting: { fontSize: 13, color: colors.gray400 },
  name: { fontSize: 22, fontWeight: '800', color: colors.gray900 },

  alertsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  alertsBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertsBannerTitle: { fontSize: 13, fontWeight: '800', color: colors.primary },
  alertsBannerSub: { fontSize: 11, color: colors.primaryDark, marginTop: 1 },

  setupCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
  },
  setupIcon: { fontSize: 48, marginBottom: 12 },
  setupTitle: { fontSize: 18, fontWeight: '800', color: colors.white, marginBottom: 6 },
  setupSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  setupBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  setupBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  storeCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: '700', color: colors.gray900 },
  storeMeta: { fontSize: 12, color: colors.gray400, marginTop: 2 },

  alertBox: {
    marginTop: 12,
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    padding: 10,
  },
  alertDanger: { backgroundColor: colors.dangerLight },
  alertText: { fontSize: 13, color: colors.warning, fontWeight: '500', lineHeight: 18 },
  alertTextDanger: { color: colors.danger },

  urgentCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  urgentTitle: { fontSize: 13, fontWeight: '800', color: colors.warning, marginBottom: 6 },
  urgentItem: { fontSize: 13, color: colors.gray700, paddingVertical: 3, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.gray700, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },

  lowStockCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    marginBottom: 16,
  },
  lowStockTitle: { fontSize: 14, fontWeight: '700', color: colors.danger, marginBottom: 10 },
  lowStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lowStockName: { fontSize: 13, color: colors.gray700, flex: 1, marginRight: 8 },
  lowStockQty: { fontSize: 13, fontWeight: '700', color: colors.danger },

  panel: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  panelTitle: { fontSize: 14, fontWeight: '700', color: colors.gray800 },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray100,
  },
  panelRowTitle: { fontSize: 13, fontWeight: '600', color: colors.gray800 },
  panelRowSub: { fontSize: 11, color: colors.gray400, marginTop: 2 },
  panelAmount: { fontSize: 13, fontWeight: '700', color: colors.gray800 },
  seeAll: { fontSize: 12, fontWeight: '700', color: colors.primary },
  rangeHint: { fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '600' },
  insightBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  insightBadgeText: { fontSize: 11, fontWeight: '700' },
});
