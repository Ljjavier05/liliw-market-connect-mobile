import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  getAvailableStalls,
  getMyStallContext,
  requestStall,
  cancelStallRequest,
  getPermitCompliance,
} from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import {
  BellAlertIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '../../components/icons';
import { useTheme } from '../../context/ThemeContext';

const DISMISS_KEY = 'stall-decision-dismissed';

function isRecent(dateStr, days = 14) {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return Date.now() - t < days * 24 * 60 * 60 * 1000;
}

function formatMoney(amount) {
  if (amount == null) return null;
  return `₱${Number(amount).toLocaleString()}/month`;
}

export default function VendorAvailableStallsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [available, setAvailable] = useState([]);
  const [context, setContext] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingId, setRequestingId] = useState(null);
  const [notes, setNotes] = useState('');
  const [decisionDismissed, setDecisionDismissed] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync(DISMISS_KEY)
      .then((v) => {
        if (v) setDecisionDismissed(v);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [stalls, ctx, c] = await Promise.all([
        getAvailableStalls(),
        getMyStallContext(),
        getPermitCompliance().catch(() => null),
      ]);
      setAvailable(Array.isArray(stalls) ? stalls : []);
      setContext(ctx);
      setCompliance(c);
    } catch {
      // Keep last data on poll failure — never Alert.alert here (steals keyboard focus)
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

  const dismissDecision = async (id) => {
    setDecisionDismissed(id);
    try {
      await SecureStore.setItemAsync(DISMISS_KEY, id);
    } catch {
      // ignore
    }
  };

  const handleRequest = async (stallId) => {
    if (compliance?.expired || compliance?.blocked) {
      Alert.alert(
        'Business Permit expired',
        compliance?.banner?.message ||
          'Your Business Permit has expired. Renew it before requesting a stall.'
      );
      return;
    }
    setRequestingId(stallId);
    try {
      await requestStall(stallId, notes);
      setNotes('');
      Alert.alert('Submitted', 'Stall request submitted — awaiting office review.');
      await fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not submit request');
    } finally {
      setRequestingId(null);
    }
  };

  const handleCancel = (id) => {
    Alert.alert('Cancel request', 'Cancel your pending stall request?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelStallRequest(id);
            Alert.alert('Cancelled', 'Request cancelled.');
            await fetchData();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Could not cancel');
          }
        },
      },
    ]);
  };

  const canRequest =
    context?.vendorStatus === 'APPROVED' &&
    !context?.occupiedStall &&
    !context?.pendingRequest &&
    !compliance?.expired &&
    !compliance?.blocked;

  const decision = context?.latestDecision;
  const showDecisionBanner =
    decision &&
    decisionDismissed !== decision.id &&
    isRecent(decision.reviewedAt || decision.updatedAt || decision.createdAt) &&
    !(decision.status === 'APPROVED' && context?.occupiedStall);

  if (loading) return <LoadingScreen message="Loading available stalls..." />;

  const ListHeader = (
    <View style={styles.headerBlock}>
      <Text style={styles.intro}>
        If you already chose a stall on your application, wait for store approval — it assigns the
        stall automatically. Use this page only if you still need a unit.
      </Text>

      {showDecisionBanner && decision.status === 'REJECTED' ? (
        <View style={[styles.banner, styles.bannerDanger]}>
          <XCircleIcon size={22} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.danger }]}>
              <BellAlertIcon size={14} color={colors.danger} /> Stall request not approved
            </Text>
            <Text style={[styles.bannerBody, { color: colors.danger }]}>
              Your request for stall {decision.stall?.number} was rejected.
              {decision.adminNotes
                ? ` Reason: ${decision.adminNotes}`
                : ' You can request a different available stall.'}
            </Text>
            <TouchableOpacity onPress={() => dismissDecision(decision.id)}>
              <Text style={[styles.dismiss, { color: colors.danger }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {showDecisionBanner && decision.status === 'APPROVED' ? (
        <View style={[styles.banner, styles.bannerSuccess]}>
          <CheckCircleIcon size={22} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.success }]}>
              Stall request approved
            </Text>
            <Text style={[styles.bannerBody, { color: colors.success }]}>
              Stall {decision.stall?.number} is yours. Please settle stall rent at the market office.
              {decision.adminNotes ? ` Note: ${decision.adminNotes}` : ''}
            </Text>
            <TouchableOpacity onPress={() => dismissDecision(decision.id)}>
              <Text style={[styles.dismiss, { color: colors.success }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {context?.occupiedStall ? (
        <View style={[styles.banner, styles.bannerInfo]}>
          <CheckCircleIcon size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.primary }]}>
              Your assigned stall: {context.occupiedStall.number}
            </Text>
            <Text style={[styles.bannerBody, { color: colors.primary }]}>
              {[context.occupiedStall.section, context.occupiedStall.category]
                .filter(Boolean)
                .join(' · ') || 'Assigned by market office'}
            </Text>
          </View>
        </View>
      ) : null}

      {context?.pendingRequest ? (
        <View style={[styles.banner, styles.bannerWarn]}>
          <ClockIcon size={22} color={colors.warningDeep} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.warningDeep }]}>
              Pending request: Stall {context.pendingRequest.stall?.number}
            </Text>
            <Text style={[styles.bannerBody, { color: colors.warningDeep }]}>
              Submitted {new Date(context.pendingRequest.createdAt).toLocaleString()}.
              {context.pendingRequest.notes?.includes('application')
                ? ' This stall is held with your store application.'
                : ' You will be notified when the office reviews this request.'}
            </Text>
            <TouchableOpacity onPress={() => handleCancel(context.pendingRequest.id)}>
              <Text style={[styles.dismiss, { color: colors.warningDeep }]}>Cancel request</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {context?.vendorStatus && context.vendorStatus !== 'APPROVED' ? (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Text style={[styles.bannerTitle, { color: colors.warningDeep }]}>
            Vendor application not approved yet
          </Text>
          <Text style={[styles.bannerBody, { color: colors.warningDeep }]}>
            You can browse stalls, but requests open only after your application is approved.
          </Text>
        </View>
      ) : null}

      {canRequest ? (
        <View style={styles.notesBlock}>
          <Text style={styles.notesLabel}>Optional note for the office</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Prefer near entrance"
            placeholderTextColor={colors.gray400}
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Open stalls</Text>
    </View>
  );

  const ListFooter =
    context?.requestHistory?.length > 0 ? (
      <View style={styles.historyBlock}>
        <Text style={styles.sectionTitle}>Request history</Text>
        {context.requestHistory.map((r) => (
          <View key={r.id} style={styles.historyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyStall}>{r.stall?.number || '—'}</Text>
              <Text style={styles.historyMeta}>
                {new Date(r.createdAt).toLocaleDateString()}
                {r.adminNotes || r.notes ? ` · ${r.adminNotes || r.notes}` : ''}
              </Text>
            </View>
            <Badge
              label={r.status === 'REJECTED' ? 'NOT APPROVED' : r.status}
              variant={r.status}
            />
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={available}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={BuildingStorefrontIcon}
            title="No available stalls right now"
            subtitle="Check back later or contact the market office."
          />
        }
        renderItem={({ item: s }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stallNumber}>{s.number}</Text>
                <Text style={styles.stallMeta}>
                  {[s.section, s.category, s.size].filter(Boolean).join(' · ') || 'Open stall'}
                </Text>
              </View>
              <Badge label="AVAILABLE" variant="ACTIVE" />
            </View>
            {s.monthlyRate != null ? (
              <Text style={styles.rate}>{formatMoney(s.monthlyRate)}</Text>
            ) : null}
            {s.notes ? <Text style={styles.notes}>{s.notes}</Text> : null}
            <View style={styles.cardActions}>
              {canRequest ? (
                <Button
                  title={requestingId === s.id ? 'Requesting…' : 'Request this stall'}
                  loading={requestingId === s.id}
                  onPress={() => handleRequest(s.id)}
                />
              ) : (
                <Text style={styles.locked}>
                  {compliance?.expired || compliance?.blocked
                    ? 'Renew your Business Permit before requesting a stall'
                    : context?.occupiedStall
                      ? 'You already have an assigned stall'
                      : context?.pendingRequest
                        ? 'You already have a pending request'
                        : 'Requests unlock after application approval'}
                </Text>
              )}
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBg },
    list: { padding: 16, gap: 10, paddingBottom: 40, flexGrow: 1 },
    headerBlock: { marginBottom: 4 },
    intro: { fontSize: 13, color: colors.inkMuted, lineHeight: 19, marginBottom: 14 },

    banner: {
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    bannerDanger: { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder },
    bannerSuccess: { backgroundColor: colors.successLight, borderColor: colors.success },
    bannerInfo: { backgroundColor: colors.primaryLight, borderColor: colors.borderBrand },
    bannerWarn: { backgroundColor: colors.warningSoft, borderColor: colors.warningBorder },
    bannerTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
    bannerBody: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
    dismiss: { marginTop: 8, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

    notesBlock: { marginBottom: 12 },
    notesLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
    notesInput: {
      borderWidth: 1.5,
      borderColor: colors.gray200,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.ink,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 10,
      marginTop: 6,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    stallNumber: { fontSize: 20, fontWeight: '800', color: colors.ink },
    stallMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
    rate: { marginTop: 10, fontSize: 14, fontWeight: '700', color: colors.gray800 },
    notes: { marginTop: 6, fontSize: 12, color: colors.gray500, lineHeight: 16 },
    cardActions: { marginTop: 14 },
    locked: {
      fontSize: 12,
      color: colors.gray400,
      textAlign: 'center',
      lineHeight: 17,
      paddingVertical: 6,
    },

    historyBlock: { marginTop: 16 },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    historyStall: { fontSize: 14, fontWeight: '700', color: colors.ink },
    historyMeta: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  });
