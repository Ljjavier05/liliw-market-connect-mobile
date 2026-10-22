import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  getMyVendor,
  getMyRents,
  getMyViolations,
  getPricingInsights,
  getPermitCompliance,
} from '../../services/vendor.service';
import { getAnnouncements } from '../../services/announcement.service';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import LoadingScreen from '../../components/LoadingScreen';
import StoreAvatar from '../../components/StoreAvatar';
import { useAlertsOptional } from '../../context/AlertsContext';
import { useTheme } from '../../context/ThemeContext';
import { AIAvatar } from '../../components/AIIcon';
import { lightHaptic } from '../../utils/haptics';
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BellIcon,
  BoltIcon,
  BuildingStorefrontIcon,
  ChevronRightIcon,
  DocumentIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  SparklesIcon,
} from '../../components/icons';

function insightStatus(row, colors) {
  const min = Number(row.suggestedRange?.min ?? 0);
  const max = Number(row.suggestedRange?.max ?? 0);
  const price = Number(row.currentPrice ?? 0);
  if (price < min) return { label: 'Too low', bg: colors.primaryLight, text: colors.primary };
  if (price > max) return { label: 'Too high', bg: colors.warningSoft, text: colors.warningDeep };
  return { label: 'Good', bg: colors.successLight, text: colors.success };
}

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function VendorDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const alertsCtx = useAlertsOptional();
  const [vendor, setVendor] = useState(null);
  const [rents, setRents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [insights, setInsights] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loginWarnShown, setLoginWarnShown] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [v, r, vi, pi, c, ann] = await Promise.all([
        getMyVendor(),
        getMyRents().catch(() => []),
        getMyViolations().catch(() => []),
        getPricingInsights().catch(() => []),
        getPermitCompliance().catch(() => null),
        getAnnouncements().catch(() => []),
      ]);
      setVendor(v);
      setRents(r);
      setViolations(vi);
      setInsights(Array.isArray(pi) ? pi : []);
      setCompliance(c);
      setAnnouncements(Array.isArray(ann) ? ann : []);
    } catch (err) {
      if (err?.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
        await logout();
        return;
      }
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

  // Show 30-day / expired warning once per session when vendor lands on dashboard after login
  useFocusEffect(
    useCallback(() => {
      if (loginWarnShown || !compliance) return undefined;
      const msg = compliance.banner?.message || compliance.warning?.message;
      if (!msg) return undefined;
      setLoginWarnShown(true);
      const title = compliance.banner?.title || compliance.warning?.title || 'Business Permit';
      const timer = setTimeout(() => {
        Alert.alert(title, msg, [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Renew Permit',
            onPress: () => navigation.navigate('BusinessPermit'),
          },
        ]);
      }, 400);
      return () => clearTimeout(timer);
    }, [compliance, loginWarnShown, navigation])
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
      <View style={styles.brandRow}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>OFFICIAL VENDOR PORTAL</Text>
        </View>
      </View>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greetingForHour(new Date().getHours())},</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        {vendor?.stallNumber ? (
          <View style={styles.stallBadge}>
            <BuildingStorefrontIcon size={14} color={colors.primary} />
            <Text style={styles.stallBadgeText}>Stall {vendor.stallNumber}</Text>
          </View>
        ) : null}
      </View>

      {alertsCtx && alertsCtx.unreadCount > 0 ? (
        <TouchableOpacity
          style={styles.alertsBanner}
          onPress={() => navigation.navigate('Alerts')}
          activeOpacity={0.85}
        >
          <View style={styles.alertsBannerIcon}>
            <BellIcon size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertsBannerTitle}>
              {alertsCtx.unreadCount} new alert{alertsCtx.unreadCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.alertsBannerSub}>
              Tap to review SMS, rent, utilities, and stock
            </Text>
          </View>
          <ChevronRightIcon size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      {compliance?.banner ? (
        <TouchableOpacity
          style={[styles.alertsBanner, styles.permitExpiredBanner]}
          onPress={() => navigation.navigate('BusinessPermit')}
          activeOpacity={0.85}
        >
          <View style={[styles.alertsBannerIcon, { backgroundColor: colors.dangerLight || '#FEE2E2' }]}>
            <ExclamationTriangleIcon size={18} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertsBannerTitle, { color: colors.danger }]}>
              {compliance.banner.title}
            </Text>
            <Text style={[styles.alertsBannerSub, { color: colors.danger }]}>
              {compliance.banner.message}
            </Text>
          </View>
          <ChevronRightIcon size={18} color={colors.danger} />
        </TouchableOpacity>
      ) : null}

      {compliance?.warning && !compliance?.banner ? (
        <TouchableOpacity
          style={[styles.alertsBanner, styles.permitWarnBanner]}
          onPress={() => navigation.navigate('BusinessPermit')}
          activeOpacity={0.85}
        >
          <View style={[styles.alertsBannerIcon, { backgroundColor: colors.warningLight }]}>
            <ExclamationTriangleIcon size={18} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertsBannerTitle, { color: colors.warningDeep || colors.warning }]}>
              {compliance.warning.title}
            </Text>
            <Text style={styles.alertsBannerSub}>{compliance.warning.message}</Text>
          </View>
          <ChevronRightIcon size={18} color={colors.warning} />
        </TouchableOpacity>
      ) : null}

      {!vendor ? (
        <TouchableOpacity
          style={styles.setupCard}
          onPress={() => navigation.navigate('TabProfile')}
          activeOpacity={0.85}
        >
          <BuildingStorefrontIcon size={48} color={colors.white} style={styles.setupIcon} />
          <Text style={styles.setupTitle}>Set up your store</Text>
          <Text style={styles.setupSub}>
            Submit your vendor application with store details and documents. Admin will verify
            everything before your store unlocks for editing.
          </Text>
          <View style={styles.setupBtn}>
            <Text style={styles.setupBtnText}>Go to Profile →</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {vendor ? (
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
                  Your application is pending admin approval. You can view your submitted store details in Profile; editing unlocks after approval.
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

          {/* Municipal Announcements Widget */}
          {announcements.length > 0 && (
            <View style={styles.announcementCard}>
              <View style={styles.announcementCardHeader}>
                <View style={styles.announcementTitleRow}>
                  <View style={styles.announcementIconCircle}>
                    <MegaphoneIcon size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.announcementHeaderTitle}>Municipal Announcements</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Announcements')}
                  hitSlop={8}
                >
                  <Text style={styles.seeAll}>View all ({announcements.length}) →</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.announcementItem}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Announcements')}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.announcementMetaRow}>
                    {announcements[0].isPinned ? (
                      <View style={styles.announcementPinnedPill}>
                        <Text style={styles.announcementPinnedText}>PINNED</Text>
                      </View>
                    ) : null}
                    <Text style={styles.announcementDate}>
                      {new Date(announcements[0].createdAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.announcementTitle} numberOfLines={1}>
                    {announcements[0].title}
                  </Text>
                  <Text style={styles.announcementSnippet} numberOfLines={2}>
                    {announcements[0].body}
                  </Text>
                </View>
                <ChevronRightIcon size={18} color={colors.gray400} />
              </TouchableOpacity>
            </View>
          )}

          {/* AI Assistant Banner */}
          <TouchableOpacity
            style={styles.aiBannerCard}
            onPress={() => {
              lightHaptic();
              navigation.navigate('AIAssistant');
            }}
            activeOpacity={0.88}
          >
            <View style={styles.aiBannerLeft}>
              <AIAvatar size={38} showOnline={true} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.aiBannerTitle}>Liliw Market AI</Text>
                  <View style={styles.aiOnlineTag}>
                    <Text style={styles.aiOnlineTagText}>ASSISTANT</Text>
                  </View>
                </View>
                <Text style={styles.aiBannerSub} numberOfLines={2}>
                  Need help with stall rent, permits, or market policies? Ask questions instantly.
                </Text>
              </View>
            </View>
            <ChevronRightIcon size={18} color={colors.primary} />
          </TouchableOpacity>

          {vendor.status === 'APPROVED' ? (
            <>
              <Text style={styles.sectionTitle}>Store overview</Text>
              <View style={styles.statsRow}>
                <StatCard
                  icon={ArchiveBoxIcon}
                  label="Active products"
                  value={activeProducts}
                  color={colors.primary}
                />
                <StatCard
                  icon={ExclamationTriangleIcon}
                  label="Low stock"
                  value={lowStock.length}
                  color={lowStock.length ? colors.danger : colors.gray400}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  icon={BanknotesIcon}
                  label="Rent due"
                  value={totalDue > 0 ? `₱${totalDue.toLocaleString()}` : '0'}
                  color={totalDue > 0 ? colors.warning : colors.success}
                />
                <StatCard
                  icon={ExclamationTriangleIcon}
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
                    <Text style={styles.panelTitle}>Unpaid rent & dues</Text>
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
                <Text style={[styles.panelTitle, { marginBottom: 4 }]}>Market desk</Text>
                <TouchableOpacity
                  style={[styles.quickLink, { borderTopWidth: 0 }]}
                  onPress={() => {
                    lightHaptic();
                    navigation.navigate('AIAssistant');
                  }}
                  activeOpacity={0.85}
                >
                  <SparklesIcon size={18} color={colors.primary} />
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.quickLinkText, { fontWeight: '700' }]}>
                      AI Market Assistant
                    </Text>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  </View>
                  <ChevronRightIcon size={16} color={colors.gray300} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => navigation.navigate('Announcements')}
                  activeOpacity={0.85}
                >
                  <MegaphoneIcon size={18} color={colors.primary} />
                  <Text style={styles.quickLinkText}>Municipal Announcements</Text>
                  <ChevronRightIcon size={16} color={colors.gray300} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => navigation.navigate('AvailableStalls')}
                  activeOpacity={0.85}
                >
                  <BuildingStorefrontIcon size={18} color={colors.primary} />
                  <Text style={styles.quickLinkText}>Available Stalls</Text>
                  <ChevronRightIcon size={16} color={colors.gray300} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => navigation.navigate('TabRents')}
                  activeOpacity={0.85}
                >
                  <BanknotesIcon size={18} color={colors.primary} />
                  <Text style={styles.quickLinkText}>Stall Rent</Text>
                  <ChevronRightIcon size={16} color={colors.gray300} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => navigation.navigate('UtilityBills')}
                  activeOpacity={0.85}
                >
                  <BoltIcon size={18} color={colors.primary} />
                  <Text style={styles.quickLinkText}>Water & Electricity</Text>
                  <ChevronRightIcon size={16} color={colors.gray300} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => navigation.navigate('BusinessPermit')}
                  activeOpacity={0.85}
                >
                  <DocumentIcon size={18} color={colors.primary} />
                  <Text style={styles.quickLinkText}>Business Permit</Text>
                  <ChevronRightIcon size={16} color={colors.gray300} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => navigation.navigate('BusinessPermitApplication')}
                  activeOpacity={0.85}
                >
                  <ClipboardDocumentIcon size={18} color={colors.primary} />
                  <Text style={styles.quickLinkText}>Business Permit Application</Text>
                  <ChevronRightIcon size={16} color={colors.gray300} />
                </TouchableOpacity>
              </View>

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
                    const status = insightStatus(row, colors);
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
      ) : null}
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBg },
    content: { padding: 20, paddingBottom: 40 },

    brandRow: { marginBottom: 6 },
    brandBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: `${colors.primary}15`,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
    },
    brandBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingTop: 4,
    },
    greeting: { fontSize: 13, color: colors.gray400 },
    name: { fontSize: 22, fontWeight: '800', color: colors.gray900 },
    stallBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    stallBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },

    announcementCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderBrand,
      shadowColor: colors.shadowBrand,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    announcementCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    announcementTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    announcementIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    announcementHeaderTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.ink,
    },
    announcementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.gray50 || colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    announcementMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 3,
    },
    announcementPinnedPill: {
      backgroundColor: `${colors.accent || '#f59e0b'}25`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    announcementPinnedText: {
      fontSize: 9,
      fontWeight: '900',
      color: colors.accent || '#f59e0b',
    },
    announcementDate: {
      fontSize: 10,
      color: colors.inkMuted,
      fontWeight: '600',
    },
    announcementTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
      marginBottom: 2,
    },
    announcementSnippet: {
      fontSize: 12,
      color: colors.inkMuted,
      lineHeight: 16,
    },

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
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertsBannerTitle: { fontSize: 13, fontWeight: '800', color: colors.primary },
    alertsBannerSub: { fontSize: 11, color: colors.primaryDark, marginTop: 1 },
    permitExpiredBanner: {
      backgroundColor: colors.dangerLight || '#FEE2E2',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    permitWarnBanner: {
      backgroundColor: colors.warningLight,
      borderWidth: 1,
      borderColor: colors.warning,
    },

    setupCard: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      padding: 28,
      alignItems: 'center',
    },
    setupIcon: { marginBottom: 12 },
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
      backgroundColor: colors.surface,
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
      backgroundColor: colors.orangeSoft,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.warningBorder,
    },
    urgentTitle: { fontSize: 13, fontWeight: '800', color: colors.warning, marginBottom: 6 },
    urgentItem: { fontSize: 13, color: colors.gray700, paddingVertical: 3, fontWeight: '600' },

    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.gray700, marginBottom: 12 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },

    lowStockCard: {
      backgroundColor: colors.redWash,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
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
      backgroundColor: colors.surface,
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
    quickLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.gray100,
    },
    quickLinkText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },
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

    aiBannerCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: colors.primaryLight ? `${colors.primaryLight}50` : '#bae6fd',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    aiBannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      marginRight: 8,
    },
    aiBannerTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.gray900,
    },
    aiOnlineTag: {
      backgroundColor: '#ecfdf5',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: '#a7f3d0',
    },
    aiOnlineTagText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#059669',
      letterSpacing: 0.4,
    },
    aiBannerSub: {
      fontSize: 12,
      color: colors.gray500,
      marginTop: 2,
      lineHeight: 16,
    },
    aiBadge: {
      backgroundColor: '#38bdf8',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
    },
    aiBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#ffffff',
    },
  });
