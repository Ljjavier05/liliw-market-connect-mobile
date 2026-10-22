import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Pressable,
  TextInput,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  getMyBusinessPermits,
  submitBusinessPermit,
  replaceBusinessPermit,
  renewBusinessPermit,
} from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '../../components/icons';
import { useTheme } from '../../context/ThemeContext';
import { uploadUrl } from '../../utils/media';
import { pickerAssetToUploadFile } from '../../utils/pickerFile';

const STATUS_LABELS = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  RESUBMISSION_REQUIRED: 'Resubmit required',
};

const REPLACEABLE = ['REJECTED', 'EXPIRED', 'RESUBMISSION_REQUIRED', 'APPROVED'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isPdf(uriOrName = '') {
  return /\.pdf($|\?)/i.test(String(uriOrName)) || String(uriOrName).includes('application/pdf');
}

export default function VendorBusinessPermitScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [permits, setPermits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendorMeta, setVendorMeta] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pickedFile, setPickedFile] = useState(null);
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    businessCategory: '',
    permitNumber: '',
    issueDate: '',
    expirationDate: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await getMyBusinessPermits();
      setPermits(data.permits || []);
      setCategories(data.categories || []);
      setVendorMeta(data.vendor);
      setCompliance(data.compliance || null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Could not load permits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  usePolling(load, 45000, true);

  const latest = permits[0] || null;

  const openCreate = () => {
    setReplaceTarget(null);
    setPickedFile(null);
    setForm({
      businessName: vendorMeta?.storeName || latest?.businessName || '',
      ownerName: vendorMeta?.ownerName || latest?.ownerName || '',
      businessCategory: latest?.businessCategory || categories[0] || '',
      permitNumber: '',
      issueDate: '',
      expirationDate: '',
    });
    setFormOpen(true);
  };

  const openReplace = (permit) => {
    setReplaceTarget(permit);
    setPickedFile(null);
    setForm({
      businessName: permit.businessName || '',
      ownerName: permit.ownerName || '',
      businessCategory: permit.businessCategory || '',
      permitNumber: permit.permitNumber || '',
      issueDate: permit.issueDate ? String(permit.issueDate).slice(0, 10) : '',
      expirationDate: permit.expirationDate ? String(permit.expirationDate).slice(0, 10) : '',
    });
    setFormOpen(true);
  };

  const openRenew = (permit) => {
    setReplaceTarget(permit);
    setPickedFile(null);
    setForm({
      businessName: permit.businessName || '',
      ownerName: permit.ownerName || '',
      businessCategory: permit.businessCategory || '',
      permitNumber: permit.permitNumber || '',
      issueDate: '',
      expirationDate: '',
    });
    setFormOpen(true);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload your permit.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPickedFile(pickerAssetToUploadFile(result.assets[0], 'permit'));
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if ((asset.size || 0) > 5 * 1024 * 1024) {
      Alert.alert('File too large', 'Maximum file size is 5 MB.');
      return;
    }
    setPickedFile(pickerAssetToUploadFile(asset, 'permit'));
  };

  const chooseFile = () => {
    Alert.alert('Upload permit', 'Choose file type', [
      { text: 'Photo (JPG/PNG)', onPress: pickImage },
      { text: 'Document (PDF)', onPress: pickPdf },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitForm = async () => {
    if (!form.businessName.trim() || !form.ownerName.trim() || !form.businessCategory.trim()) {
      Alert.alert('Missing info', 'Business name, owner, and category are required.');
      return;
    }
    if (replaceTarget && !pickedFile) {
      const mustUpload =
        replaceTarget.status === 'EXPIRED' ||
        replaceTarget.status === 'APPROVED' ||
        !replaceTarget.permitFile;
      if (mustUpload) {
        Alert.alert('Missing file', 'Please upload your renewed Business Permit document.');
        return;
      }
    }

    if (!replaceTarget && !pickedFile) {
      Alert.alert('Missing file', 'Please upload your permit document.');
      return;
    }

    setSaving(true);
    try {
      if (replaceTarget) {
        const isRenew =
          replaceTarget.status === 'EXPIRED' ||
          replaceTarget.status === 'APPROVED' ||
          Boolean(replaceTarget.renewedAt);
        if (isRenew) {
          await renewBusinessPermit(replaceTarget.id, form, pickedFile);
          Alert.alert(
            'Renewal submitted',
            'Your renewed business permit was submitted and is pending market office approval.'
          );
        } else {
          await replaceBusinessPermit(replaceTarget.id, form, pickedFile);
          Alert.alert('Submitted', 'Your permit was resubmitted for review.');
        }
      } else {
        await submitBusinessPermit(form, pickedFile);
        Alert.alert('Submitted', 'Your business permit was uploaded and is pending review.');
      }
      setFormOpen(false);
      setReplaceTarget(null);
      setPickedFile(null);
      await load();
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const viewPermit = (permit) => {
    const url = uploadUrl(permit.permitFile, permit.updatedAt);
    if (!url) {
      Alert.alert('No file', 'No permit document on file.');
      return;
    }
    if (isPdf(permit.permitFile)) {
      Linking.openURL(url).catch(() => Alert.alert('Unable to open', 'Could not open the document.'));
      return;
    }
    setPreview({ uri: url, title: permit.businessName });
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.flex}>
      <ScrollView
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
        {compliance?.banner ? (
          <View style={[styles.warnBox, { backgroundColor: colors.dangerLight || '#FEE2E2' }]}>
            <ExclamationTriangleIcon size={18} color={colors.danger} />
            <Text style={[styles.warnText, { color: colors.danger }]}>
              {compliance.banner.message}
            </Text>
          </View>
        ) : null}
        {compliance?.warning && !compliance?.banner ? (
          <View style={[styles.warnBox, { backgroundColor: colors.warningLight }]}>
            <ExclamationTriangleIcon size={18} color={colors.warning} />
            <Text style={[styles.warnText, { color: colors.warningDeep || colors.warning }]}>
              {compliance.warning.message}
            </Text>
          </View>
        ) : null}

        {vendorMeta ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Store application</Text>
                <Text style={styles.businessName}>{vendorMeta.storeName}</Text>
              </View>
              {vendorMeta.status ? (
                <Badge label={vendorMeta.status} variant={vendorMeta.status} />
              ) : null}
            </View>
            {vendorMeta.businessType ? (
              <Row label="Business type" value={vendorMeta.businessType} styles={styles} />
            ) : null}
            {vendorMeta.stallNumber ? (
              <Row label="Stall" value={vendorMeta.stallNumber} styles={styles} />
            ) : null}
            {vendorMeta.status === 'APPROVED' ? (
              <Text style={styles.approvedHint}>
                Your store is approved. Upload or renew your business permit below when needed.
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text style={[styles.historyTitle, { marginBottom: 8 }]}>On-file business permits</Text>

        {!latest ? (
          <EmptyState
            icon={DocumentIcon}
            title="No business permit yet"
            subtitle="Upload your mayor’s / business permit so the market office can verify your stall."
          />
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.businessName}>{latest.businessName}</Text>
              <Badge
                label={STATUS_LABELS[latest.status] || latest.status}
                variant={
                  latest.status === 'APPROVED'
                    ? 'APPROVED'
                    : latest.status === 'PENDING'
                      ? 'PENDING'
                      : latest.status === 'UNDER_REVIEW'
                        ? 'APPEALED'
                        : latest.status === 'REJECTED' || latest.status === 'RESUBMISSION_REQUIRED'
                          ? 'REJECTED'
                          : latest.status === 'EXPIRED'
                            ? 'INACTIVE'
                            : latest.status
                }
              />
            </View>

            <Row label="Permit number" value={latest.permitNumber || '—'} styles={styles} />
            <Row label="Category" value={latest.businessCategory} styles={styles} />
            <Row label="Date issued" value={formatDate(latest.issueDate)} styles={styles} />
            <Row label="Expiration" value={formatDate(latest.expirationDate)} styles={styles} />
            <Row label="Submitted" value={formatDate(latest.submittedAt)} styles={styles} />

            {latest.status === 'REJECTED' || latest.status === 'RESUBMISSION_REQUIRED' ? (
              <View style={styles.remarkBox}>
                <Text style={styles.remarkTitle}>Admin remarks</Text>
                <Text style={styles.remarkText}>{latest.adminRemarks || 'No remarks provided.'}</Text>
              </View>
            ) : null}

            {latest.expiringSoon && latest.status === 'APPROVED' ? (
              <View style={[styles.warnBox, { backgroundColor: colors.warningLight }]}>
                <ExclamationTriangleIcon size={18} color={colors.warning} />
                <Text style={[styles.warnText, { color: colors.warningDeep || colors.warning }]}>
                  Your Business Permit will expire on {formatDate(latest.expirationDate)}. Please
                  renew your permit to continue using marketplace features.
                </Text>
              </View>
            ) : null}

            {latest.status === 'EXPIRED' ? (
              <View style={[styles.warnBox, { backgroundColor: colors.dangerLight || '#FEE2E2' }]}>
                <ExclamationTriangleIcon size={18} color={colors.danger} />
                <Text style={[styles.warnText, { color: colors.danger }]}>
                  Your Business Permit has expired. Please submit your renewed permit for approval.
                </Text>
              </View>
            ) : null}

            {latest.permitFile ? (
              <TouchableOpacity
                style={styles.previewTap}
                onPress={() => viewPermit(latest)}
                activeOpacity={0.85}
              >
                {isPdf(latest.permitFile) ? (
                  <View style={styles.pdfPreview}>
                    <DocumentIcon size={28} color={colors.primary} />
                    <Text style={styles.pdfPreviewText}>PDF on file — tap to view</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: uploadUrl(latest.permitFile, latest.updatedAt) }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
              </TouchableOpacity>
            ) : null}

            <View style={styles.actions}>
              <Button
                title="View Permit"
                variant="secondary"
                onPress={() => viewPermit(latest)}
                style={styles.actionBtn}
              />
              {REPLACEABLE.includes(latest.status) ? (
                <Button
                  title="Renew Business Permit"
                  onPress={() => openRenew(latest)}
                  style={styles.actionBtn}
                />
              ) : null}
              {['REJECTED', 'RESUBMISSION_REQUIRED'].includes(latest.status) ? (
                <Button
                  title="Resubmit Permit"
                  variant="secondary"
                  onPress={() => openReplace(latest)}
                  style={styles.actionBtn}
                />
              ) : null}
            </View>
          </View>
        )}

        {!latest ? (
          <Button
            title="Upload Permit"
            onPress={openCreate}
            style={styles.uploadCta}
          />
        ) : null}

        {permits.length > 1 ? (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>Previous submissions</Text>
            {permits.slice(1).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.historyRow}
                onPress={() => viewPermit(p)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{p.businessName}</Text>
                  <Text style={styles.historyMeta}>
                    {formatDate(p.submittedAt)} · {STATUS_LABELS[p.status] || p.status}
                  </Text>
                </View>
                <EyeIcon size={18} color={colors.gray400} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {replaceTarget ? 'Renew Business Permit' : 'Upload Business Permit'}
              </Text>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={10}>
                <XMarkIcon size={22} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Field
                label="Business name"
                value={form.businessName}
                onChangeText={(v) => setForm((f) => ({ ...f, businessName: v }))}
                styles={styles}
                colors={colors}
              />
              <Field
                label="Owner name"
                value={form.ownerName}
                onChangeText={(v) => setForm((f) => ({ ...f, ownerName: v }))}
                styles={styles}
                colors={colors}
              />
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories.map((c) => {
                  const active = form.businessCategory === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setForm((f) => ({ ...f, businessCategory: c }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Field
                label="Permit number"
                value={form.permitNumber}
                onChangeText={(v) => setForm((f) => ({ ...f, permitNumber: v }))}
                styles={styles}
                colors={colors}
              />
              <Field
                label="Date issued (YYYY-MM-DD)"
                value={form.issueDate}
                onChangeText={(v) => setForm((f) => ({ ...f, issueDate: v }))}
                styles={styles}
                colors={colors}
                placeholder="2025-01-15"
              />
              <Field
                label="Expiration (YYYY-MM-DD)"
                value={form.expirationDate}
                onChangeText={(v) => setForm((f) => ({ ...f, expirationDate: v }))}
                styles={styles}
                colors={colors}
                placeholder="2026-01-15"
              />

              <TouchableOpacity style={styles.filePick} onPress={chooseFile} activeOpacity={0.85}>
                <CloudArrowUpIcon size={22} color={colors.primary} />
                <Text style={styles.filePickText}>
                  {pickedFile?.name || (replaceTarget ? 'Replace file (optional if keeping current)' : 'Choose PDF / JPG / PNG')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.hint}>Max 5 MB · PDF, JPG, JPEG, PNG</Text>

              <Button title={saving ? 'Submitting…' : 'Submit'} onPress={submitForm} loading={saving} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewModal} onPress={() => setPreview(null)}>
          {preview ? (
            <Image source={{ uri: preview.uri }} style={styles.previewFull} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function Row({ label, value, styles }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, styles, colors, placeholder }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.pageBg },
    content: { padding: 16, paddingBottom: 40 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border || colors.gray200,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    businessName: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.ink },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    approvedHint: {
      marginTop: 12,
      fontSize: 13,
      fontWeight: '600',
      color: colors.success,
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.gray100,
    },
    rowLabel: { fontSize: 13, color: colors.inkMuted },
    rowValue: { fontSize: 13, fontWeight: '600', color: colors.ink, maxWidth: '55%', textAlign: 'right' },
    remarkBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerLight,
    },
    remarkTitle: { fontSize: 12, fontWeight: '700', color: colors.danger, marginBottom: 4 },
    remarkText: { fontSize: 13, color: colors.ink, lineHeight: 18 },
    warnBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    warnText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
    previewTap: { marginTop: 14, borderRadius: 12, overflow: 'hidden' },
    previewImage: { width: '100%', height: 180, backgroundColor: colors.gray100 },
    pdfPreview: {
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      gap: 6,
    },
    pdfPreviewText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    actions: { marginTop: 14, gap: 8 },
    actionBtn: { marginTop: 0 },
    uploadCta: { marginTop: 16 },
    history: { marginTop: 24 },
    historyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.gray100,
      gap: 8,
    },
    historyName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    historyMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '92%',
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, flex: 1, paddingRight: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.inkMuted, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.gray200,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.ink,
      backgroundColor: colors.pageBg,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.gray100,
      marginRight: 8,
    },
    chipActive: { backgroundColor: colors.primaryLight },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
    chipTextActive: { color: colors.primary },
    filePick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginBottom: 6,
      marginTop: 4,
    },
    filePickText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primary },
    hint: { fontSize: 11, color: colors.inkMuted, marginBottom: 16 },
    previewModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      padding: 12,
    },
    previewFull: { width: '100%', height: '80%' },
  });
