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
import { getMyUtilityBills, uploadUtilityProof } from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import Button from '../../components/Button';
import GCashPayCard, { openProofUrl } from '../../components/GCashPayCard';
import {
  BeakerIcon,
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

export default function VendorUtilityBillsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusStyles = useMemo(() => buildStatusStyles(colors), [colors]);
  const [bills, setBills] = useState([]);
  const [officeGcash, setOfficeGcash] = useState({ number: null, accountName: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState('');
  const [drafts, setDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [preview, setPreview] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getMyUtilityBills(type || undefined);
      setBills(data.bills || []);
      setOfficeGcash(data.officeGcash || { number: null, accountName: null });
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  usePolling(fetchData, 12000);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const unpaid = useMemo(() => bills.filter((b) => b.status !== 'PAID'), [bills]);
  const totalDue = useMemo(
    () => unpaid.reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [unpaid]
  );

  const sortedBills = useMemo(() => [...bills].sort(sortDuesFirst), [bills]);

  const listData = useMemo(() => {
    const unsettled = sortedBills.filter((b) => isUnsettled(b.status));
    const paid = sortedBills.filter((b) => b.status === 'PAID');
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
  }, [sortedBills]);

  const pickProof = async (billId) => {
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
    const file = pickerAssetToUploadFile(result.assets[0], 'utility-proof');
    if (file) setDrafts((prev) => ({ ...prev, [billId]: file }));
  };

  const clearDraft = (billId) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[billId];
      return next;
    });
  };

  const submitProof = async (billId) => {
    const draft = drafts[billId];
    if (!draft) {
      Alert.alert('Missing proof', 'Choose a receipt image first.');
      return;
    }
    setSubmittingId(billId);
    try {
      await uploadUtilityProof(billId, draft);
      clearDraft(billId);
      Alert.alert('Submitted', 'Proof submitted — waiting for market office confirmation.');
      await fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Submit failed');
    } finally {
      setSubmittingId(null);
    }
  };

  const renderBillCard = (item) => {
    const style = statusStyles[item.status] || statusStyles.UNPAID;
    const draft = drafts[item.id];
    const unsettled = isUnsettled(item.status);
    const isWater = item.type === 'WATER';
    const TypeIcon = isWater ? BeakerIcon : BoltIcon;
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
        <View style={styles.typeRow}>
          <View style={[styles.typeChip, isWater ? styles.typeWater : styles.typePower]}>
            <TypeIcon size={14} color={isWater ? colors.primary : colors.warningDeep} />
            <Text style={[styles.typeText, { color: isWater ? colors.primary : colors.warningDeep }]}>
              {isWater ? 'Water' : 'Electricity'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
            <Text style={[styles.statusText, { color: style.text }]}>{style.label}</Text>
          </View>
        </View>

        <Text style={styles.period}>{item.periodLabel || 'Billing period'}</Text>
        <View style={styles.metaRow}>
          <CalendarIcon size={13} color={colors.gray400} />
          <Text style={styles.metaText}>Due {formatDate(item.dueDate)}</Text>
        </View>
        <Text style={[styles.amount, unsettled && { color: colors.danger }]}>
          {formatMoney(item.amount)}
        </Text>

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
              Settled {formatDate(item.paidDate)}
            </Text>
          </View>
        ) : null}

        {item.proofUrl && !draft ? (
          <TouchableOpacity
            style={styles.proofRow}
            onPress={() =>
              setPreview({
                uri: uploadUrl(item.proofUrl, item.proofUploadedAt),
                title: `${item.periodLabel || 'Bill'} proof`,
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
    return renderBillCard(row.item);
  };

  if (loading) return <LoadingScreen message="Loading utility bills..." />;

  const ListHeader = (
    <View>
      <GCashPayCard
        officeGcash={officeGcash}
        subtitle="Use this office number for water and electricity bills."
      />

      {unpaid.length > 0 ? (
        <View style={styles.alertBanner}>
          <ExclamationTriangleIcon size={18} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {unpaid.length} unsettled bill{unpaid.length > 1 ? 's' : ''}
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
            { id: '', label: 'All' },
            { id: 'WATER', label: 'Water' },
            { id: 'ELECTRICITY', label: 'Electricity' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id || 'ALL'}
              style={[styles.filterChip, type === f.id && styles.filterChipActive]}
              onPress={() => {
                setLoading(true);
                setType(f.id);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, type === f.id && styles.filterTextActive]}>
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
            icon={BoltIcon}
            title="No utility bills yet"
            subtitle="When the market office posts water or electricity bills, they appear here."
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
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 8,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    typeWater: { backgroundColor: colors.primaryLight },
    typePower: { backgroundColor: colors.warningSoft },
    typeText: { fontSize: 11, fontWeight: '700' },
    period: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    metaText: { fontSize: 12, color: colors.gray400 },
    amount: { fontSize: 22, fontWeight: '800', color: colors.gray900, marginTop: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    statusHint: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 8, lineHeight: 16 },
    rejectHint: {
      fontSize: 12,
      color: colors.warningDeep,
      fontWeight: '600',
      marginTop: 8,
      lineHeight: 16,
    },

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
