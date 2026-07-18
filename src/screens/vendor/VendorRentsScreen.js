import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getMyRentsBundle,
  uploadRentProof,
} from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import Button from '../../components/Button';
import GCashPayCard, { openProofUrl } from '../../components/GCashPayCard';
import {
  BanknotesIcon,
  BoltIcon,
  CalendarIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '../../components/icons';
import { useTheme } from '../../context/ThemeContext';
import { uploadUrl } from '../../utils/media';
import { pickerAssetToUploadFile } from '../../utils/pickerFile';

const buildStatusStyles = (colors) => ({
  PAID: { bg: colors.successLight, text: colors.success, border: colors.success, label: 'Paid' },
  UNPAID: { bg: colors.warningLight, text: colors.warning, border: colors.warning, label: 'Unpaid' },
  OVERDUE: { bg: colors.dangerLight, text: colors.danger, border: colors.danger, label: 'Overdue' },
  PARTIAL: {
    bg: colors.warningSoft,
    text: colors.warningDeep,
    border: colors.warningBorder,
    label: 'Partial',
  },
  PENDING_VERIFY: {
    bg: colors.primaryLight,
    text: colors.primary,
    border: colors.primary,
    label: 'Under review',
  },
});

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

function canSubmitProof(status) {
  return ['UNPAID', 'OVERDUE', 'PARTIAL', 'PENDING_VERIFY'].includes(status);
}

function isUnsettled(status) {
  return status !== 'PAID';
}

/** Unsettled first (overdue → unpaid → rest), then paid. */
function sortDuesFirst(a, b) {
  const rank = (status) => {
    if (status === 'OVERDUE') return 0;
    if (status === 'UNPAID') return 1;
    if (status === 'PARTIAL') return 2;
    if (status === 'PENDING_VERIFY') return 3;
    if (status === 'PAID') return 9;
    return 5;
  };
  const d = rank(a.status) - rank(b.status);
  if (d !== 0) return d;
  return new Date(b.dueDate || 0) - new Date(a.dueDate || 0);
}

export default function VendorRentsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusStyles = useMemo(() => buildStatusStyles(colors), [colors]);
  const [rents, setRents] = useState([]);
  const [officeGcash, setOfficeGcash] = useState({ number: null, accountName: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [drafts, setDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [preview, setPreview] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getMyRentsBundle();
      setRents(data.rents || []);
      setOfficeGcash(data.officeGcash || { number: null, accountName: null });
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
  const totalDue = useMemo(
    () => unpaid.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [unpaid]
  );

  const filtered = useMemo(() => {
    let rows = rents;
    if (filter === 'UNPAID') rows = rents.filter((r) => r.status !== 'PAID');
    else if (filter === 'OVERDUE') rows = rents.filter((r) => r.status === 'OVERDUE');
    else if (filter === 'PAID') rows = rents.filter((r) => r.status === 'PAID');
    return [...rows].sort(sortDuesFirst);
  }, [rents, filter]);

  const listData = useMemo(() => {
    if (filter !== 'ALL') {
      return filtered.map((item) => ({ kind: 'row', item }));
    }
    const unsettled = filtered.filter((r) => isUnsettled(r.status));
    const paid = filtered.filter((r) => r.status === 'PAID');
    const rows = [];
    if (unsettled.length > 0) {
      rows.push({ kind: 'section', id: 'unpaid', title: 'Unpaid', count: unsettled.length });
      unsettled.forEach((item) => rows.push({ kind: 'row', item }));
    }
    if (paid.length > 0) {
      rows.push({ kind: 'section', id: 'paid', title: 'Paid', count: paid.length });
      paid.forEach((item) => rows.push({ kind: 'row', item }));
    }
    return rows;
  }, [filtered, filter]);

  const pickProof = async (rentId) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a payment receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = pickerAssetToUploadFile(result.assets[0], 'rent-proof');
    if (file) setDrafts((prev) => ({ ...prev, [rentId]: file }));
  };

  const clearDraft = (rentId) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[rentId];
      return next;
    });
  };

  const submitProof = async (rentId) => {
    const draft = drafts[rentId];
    if (!draft) {
      Alert.alert('Missing proof', 'Choose a receipt image first.');
      return;
    }
    setSubmittingId(rentId);
    try {
      await uploadRentProof(rentId, draft);
      clearDraft(rentId);
      Alert.alert('Submitted', 'Proof submitted — waiting for market office confirmation.');
      await fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Submit failed');
    } finally {
      setSubmittingId(null);
    }
  };

  const renderRentCard = (item) => {
    const style = statusStyles[item.status] || statusStyles.UNPAID;
    const draft = drafts[item.id];
    const unsettled = isUnsettled(item.status);
    const proofRejected =
      item.proofUrl && (item.status === 'UNPAID' || item.status === 'OVERDUE');

    return (
      <View
        style={[
          styles.card,
          unsettled ? styles.cardUnpaid : styles.cardPaid,
          { borderColor: unsettled ? colors.danger : style.border },
        ]}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.period}>{item.periodLabel || 'Rent period'}</Text>
            <View style={styles.metaRow}>
              <CalendarIcon size={13} color={colors.gray400} />
              <Text style={styles.metaText}>Due {formatDate(item.dueDate)}</Text>
            </View>
            {item.status === 'PENDING_VERIFY' ? (
              <Text style={styles.statusHint}>
                Proof submitted — waiting for market office confirmation.
              </Text>
            ) : null}
            {proofRejected ? (
              <Text style={styles.rejectHint}>
                Previous proof was not accepted. Upload a new receipt and submit again.
              </Text>
            ) : null}
            {item.status === 'PAID' ? (
              <View style={styles.metaRow}>
                <CheckCircleIcon size={13} color={colors.success} />
                <Text style={[styles.metaText, { color: colors.success }]}>
                  Paid {formatDate(item.paidDate)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.amount, unsettled && { color: colors.danger }]}>
              {formatMoney(item.amount)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
              <Text style={[styles.statusText, { color: style.text }]}>{style.label}</Text>
            </View>
          </View>
        </View>

        {item.proofUrl && !draft ? (
          <TouchableOpacity
            style={styles.proofRow}
            onPress={() =>
              setPreview({
                uri: uploadUrl(item.proofUrl, item.proofUploadedAt),
                title: `${item.periodLabel || 'Rent'} proof`,
              })
            }
          >
            <DocumentIcon size={16} color={colors.gray500} />
            <Text style={styles.proofRowText}>Submitted proof</Text>
            <EyeIcon size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        {canSubmitProof(item.status) ? (
          <View style={styles.uploadBlock}>
            {draft ? (
              <TouchableOpacity
                onPress={() => setPreview({ uri: draft.uri, title: 'Selected receipt' })}
                activeOpacity={0.85}
              >
                <Image source={{ uri: draft.uri }} style={styles.draftPreview} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.uploadActions}>
              <Button
                title={draft ? 'Change receipt' : 'Choose receipt'}
                variant="secondary"
                size="sm"
                onPress={() => pickProof(item.id)}
                style={{ flex: 1 }}
              />
              {draft ? (
                <Button
                  title="Submit"
                  size="sm"
                  loading={submittingId === item.id}
                  onPress={() => submitProof(item.id)}
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
            {draft ? (
              <TouchableOpacity onPress={() => clearDraft(item.id)}>
                <Text style={styles.clearDraft}>Remove selected</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.uploadHintRow}>
                <CloudArrowUpIcon size={14} color={colors.gray400} />
                <Text style={styles.uploadHint}>JPG or PNG receipt from GCash</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item: row }) => {
    if (row.kind === 'section') {
      return (
        <View style={styles.sectionHead}>
          <Text
            style={[
              styles.sectionTitle,
              row.id === 'unpaid' ? { color: colors.danger } : { color: colors.success },
            ]}
          >
            {row.title}
          </Text>
          <Text style={styles.sectionCount}>{row.count}</Text>
        </View>
      );
    }
    return renderRentCard(row.item);
  };

  if (loading) return <LoadingScreen message="Loading rent records..." />;

  const ListHeader = (
    <View>
      <TouchableOpacity
        style={styles.utilityLink}
        onPress={() => navigation.navigate('UtilityBills')}
        activeOpacity={0.85}
      >
        <BoltIcon size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.utilityLinkTitle}>Water & Electricity</Text>
          <Text style={styles.utilityLinkSub}>View and pay utility bills</Text>
        </View>
        <Text style={styles.utilityLinkCta}>Open →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.utilityLink}
        onPress={() => navigation.navigate('Payments')}
        activeOpacity={0.85}
      >
        <BanknotesIcon size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.utilityLinkTitle}>Payments</Text>
          <Text style={styles.utilityLinkSub}>History, receipts, and outstanding balance</Text>
        </View>
        <Text style={styles.utilityLinkCta}>Open →</Text>
      </TouchableOpacity>

      <GCashPayCard
        officeGcash={officeGcash}
        subtitle="Use this office number for stall rent payments."
      />

      {unpaid.length > 0 ? (
        <View style={styles.alertBanner}>
          <ExclamationTriangleIcon size={18} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {unpaid.length} unpaid rent record{unpaid.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.alertSub}>Total due: {formatMoney(totalDue)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(row) =>
          row.kind === 'section' ? `section-${row.id}` : row.item.id
        }
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={BanknotesIcon}
            title={filter === 'ALL' ? 'No rent records yet' : 'No matching rent records'}
            subtitle="When the market office generates stall rent for the month, it appears here."
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreview(null)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{preview?.title || 'Proof'}</Text>
              <TouchableOpacity onPress={() => setPreview(null)} hitSlop={10}>
                <XMarkIcon size={22} color={colors.ink} />
              </TouchableOpacity>
            </View>
            {preview?.uri ? (
              <Image source={{ uri: preview.uri }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
            {preview?.uri && !preview.uri.startsWith('file:') && !preview.uri.startsWith('content:') ? (
              <Button
                title="Open externally"
                variant="secondary"
                size="sm"
                onPress={() => openProofUrl(preview.uri)}
                style={{ marginTop: 10 }}
              />
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBg },
    list: { padding: 16, gap: 10, paddingBottom: 40, flexGrow: 1 },

    utilityLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    utilityLinkTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
    utilityLinkSub: { fontSize: 12, color: colors.inkMuted, marginTop: 1 },
    utilityLinkCta: { fontSize: 13, fontWeight: '700', color: colors.primary },

    alertBanner: {
      backgroundColor: colors.dangerLight,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    alertTitle: { fontSize: 13, fontWeight: '700', color: colors.danger },
    alertSub: { fontSize: 12, color: colors.danger, marginTop: 2 },

    filtersWrap: { height: 48, marginBottom: 4 },
    filters: { alignItems: 'center', flexDirection: 'row' },
    filterChip: {
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.gray300,
      marginRight: 8,
      justifyContent: 'center',
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 13, fontWeight: '700', color: colors.gray800 },
    filterTextActive: { color: colors.white },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 2,
    },
    cardUnpaid: {
      backgroundColor: colors.dangerLight,
    },
    cardPaid: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 2,
    },
    sectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
    sectionCount: { fontSize: 12, fontWeight: '700', color: colors.inkMuted },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    cardLeft: { flex: 1 },
    period: { fontSize: 15, fontWeight: '700', color: colors.gray900, marginBottom: 6 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    metaText: { fontSize: 12, color: colors.gray400 },
    statusHint: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 8, lineHeight: 16 },
    rejectHint: {
      fontSize: 12,
      color: colors.warningDeep,
      fontWeight: '600',
      marginTop: 8,
      lineHeight: 16,
    },
    cardRight: { alignItems: 'flex-end', gap: 6 },
    amount: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

    proofRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.gray50,
      borderWidth: 1,
      borderColor: colors.gray200,
    },
    proofRowText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.gray600 },

    uploadBlock: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.gray200,
      gap: 8,
    },
    draftPreview: {
      width: '100%',
      height: 140,
      borderRadius: 10,
      backgroundColor: colors.gray100,
    },
    uploadActions: { flexDirection: 'row', gap: 8 },
    uploadHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    uploadHint: { fontSize: 11, color: colors.gray400 },
    clearDraft: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.danger,
      textAlign: 'center',
      paddingVertical: 4,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      maxHeight: '80%',
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    modalTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, flex: 1 },
    modalImage: { width: '100%', height: 360, borderRadius: 10 },
  });
