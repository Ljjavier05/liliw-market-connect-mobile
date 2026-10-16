import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { getMyPayments } from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import LoadingScreen from '../../components/LoadingScreen';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import { BanknotesIcon, DocumentIcon, EyeIcon, ShareIcon } from '../../components/icons';
import { useTheme } from '../../context/ThemeContext';
import { uploadUrl } from '../../utils/media';
import { shareOrSaveFile } from '../../utils/fileShare';
import { lightHaptic } from '../../utils/haptics';

function money(n) {
  return `₱${Number(n || 0).toFixed(2)}`;
}

function formatDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function VendorPaymentsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMyPayments();
      setData(res);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Could not load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  usePolling(load, 45000, true);

  if (loading) return <LoadingScreen message="Loading payments..." />;

  const payments = data?.payments || [];
  const rents = data?.currentBills?.rents || [];
  const utilities = data?.currentBills?.utilities || [];
  const outstanding = data?.outstandingBalance || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Outstanding balance</Text>
        <Text style={styles.balanceValue}>{money(outstanding)}</Text>
        <Text style={styles.balanceHint}>Pay via Stall Rent or Water & Electricity, then track status here.</Text>
      </View>

      <Text style={styles.sectionTitle}>Current bills</Text>
      {rents.length === 0 && utilities.length === 0 ? (
        <Text style={styles.muted}>No open bills right now.</Text>
      ) : (
        <>
          {rents.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.billRow}
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('TabRents', { screen: 'VendorRentsList' });
                } else {
                  navigation.navigate('TabRents');
                }
              }}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.billTitle}>Stall Rent · {r.periodLabel}</Text>
                <Text style={styles.billMeta}>Due {formatDate(r.dueDate)}</Text>
              </View>
              <Badge label={r.status} variant={r.status} />
              <Text style={styles.billAmt}>{money(r.amount)}</Text>
            </TouchableOpacity>
          ))}
          {utilities.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={styles.billRow}
              onPress={() => navigation.navigate('UtilityBills')}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.billTitle}>
                  {u.type} · {u.periodLabel}
                </Text>
                <Text style={styles.billMeta}>Due {formatDate(u.dueDate)}</Text>
              </View>
              <Badge label={u.status} variant={u.status} />
              <Text style={styles.billAmt}>{money(u.amount)}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Payment history</Text>
      {payments.length === 0 ? (
        <EmptyState
          icon={BanknotesIcon}
          title="No payments yet"
          subtitle="When you submit payment proof, history and receipts appear here."
        />
      ) : (
        payments.map((p) => (
          <View key={p.id} style={styles.payCard}>
            <View style={styles.payHeader}>
              <Text style={styles.payBilling}>{p.billingNumber}</Text>
              <Badge
                label={p.paymentStatus}
                variant={
                  p.paymentStatus === 'VERIFIED'
                    ? 'APPROVED'
                    : p.paymentStatus === 'REJECTED'
                      ? 'REJECTED'
                      : 'PENDING'
                }
              />
            </View>
            <Text style={styles.payMeta}>
              {formatDate(p.paymentDate)} · {p.paymentMethod} · {money(p.amountPaid)}
            </Text>
            {p.receiptNumber ? (
              <Text style={styles.receipt}>Receipt {p.receiptNumber}</Text>
            ) : null}
            {p.remarks && p.paymentStatus === 'REJECTED' ? (
              <Text style={styles.reject}>{p.remarks}</Text>
            ) : null}
            {p.receipts?.[0]?.pdfPath ? (
              <View style={styles.receiptActionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    lightHaptic();
                    const url = uploadUrl(p.receipts[0].pdfPath);
                    Linking.openURL(url).catch(() =>
                      Alert.alert('Unable to open', 'Could not open the receipt.')
                    );
                  }}
                  style={styles.receiptBtn}
                  activeOpacity={0.8}
                >
                  <EyeIcon size={15} color={colors.primary} />
                  <Text style={styles.receiptBtnText}>View Receipt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    lightHaptic();
                    const url = uploadUrl(p.receipts[0].pdfPath);
                    shareOrSaveFile(url, `Official_Receipt_${p.receiptNumber || p.billingNumber}.pdf`);
                  }}
                  style={styles.receiptShareBtn}
                  activeOpacity={0.8}
                >
                  <ShareIcon size={14} color={colors.ink} />
                  <Text style={styles.receiptShareBtnText}>Save / Share</Text>
                </TouchableOpacity>
              </View>
            ) : p.proofUrl ? (
              <View style={styles.receiptActionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    lightHaptic();
                    const url = uploadUrl(p.proofUrl);
                    Linking.openURL(url).catch(() =>
                      Alert.alert('Unable to open', 'Could not open payment proof.')
                    );
                  }}
                  style={styles.receiptBtn}
                  activeOpacity={0.8}
                >
                  <EyeIcon size={15} color={colors.primary} />
                  <Text style={styles.receiptBtnText}>View Proof</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    lightHaptic();
                    const url = uploadUrl(p.proofUrl);
                    shareOrSaveFile(url, `Payment_Proof_${p.billingNumber}.jpg`);
                  }}
                  style={styles.receiptShareBtn}
                  activeOpacity={0.8}
                >
                  <ShareIcon size={14} color={colors.ink} />
                  <Text style={styles.receiptShareBtnText}>Save / Share</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <Text style={styles.breakdown}>
              Rental {money(p.rentalFee)} · Cleaning {money(p.cleaningFee)} · Assoc{' '}
              {money(p.associationFee)}
            </Text>
            {Number(p.remainingBalance) > 0 ? (
              <Text style={styles.remaining}>Balance left: {money(p.remainingBalance)}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBg },
    content: { padding: 20, paddingBottom: 40 },
    balanceCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
    balanceValue: { color: colors.white, fontSize: 28, fontWeight: '800', marginTop: 4 },
    balanceHint: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8, lineHeight: 17 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 10 },
    muted: { color: colors.inkMuted, fontSize: 13, marginBottom: 12 },
    billRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border || colors.gray200,
    },
    billTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
    billMeta: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
    billAmt: { fontSize: 13, fontWeight: '800', color: colors.ink },
    payCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border || colors.gray200,
    },
    payHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    payBilling: { fontSize: 13, fontWeight: '800', color: colors.ink, flex: 1 },
    payMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 6 },
    receipt: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 4 },
    reject: { fontSize: 12, color: colors.danger, marginTop: 6 },
    receiptActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      flexWrap: 'wrap',
    },
    receiptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: `${colors.primary}12`,
    },
    receiptBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    receiptShareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.gray100,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    receiptShareBtnText: { fontSize: 12, fontWeight: '700', color: colors.ink },
    breakdown: { fontSize: 11, color: colors.inkMuted, marginTop: 8 },
    remaining: { fontSize: 12, fontWeight: '700', color: colors.warning || colors.amber, marginTop: 4 },
  });
