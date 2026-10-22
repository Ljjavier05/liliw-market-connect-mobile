import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  TextInput,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  getMyPermitApplications,
  createPermitApplication,
  updatePermitApplication,
} from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import {
  CloudArrowUpIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '../../components/icons';
import { useTheme } from '../../context/ThemeContext';
import { uploadUrl } from '../../utils/media';
import { pickerAssetToUploadFile } from '../../utils/pickerFile';
import { sanitizePhoneInput } from '../../utils/phone';

const STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DOCUMENTS_REQUESTED: 'Docs requested',
};

const EMPTY_FORM = {
  businessName: '',
  ownerName: '',
  businessAddress: '',
  contactNumber: '',
  businessCategory: '',
  businessType: '',
  additionalRemarks: '',
};

function formatDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString();
}

function toUploadFile(asset) {
  if (!asset?.uri) return null;
  return pickerAssetToUploadFile(asset, 'document');
}

export default function VendorBusinessPermitApplicationScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [apps, setApps] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [permits, setPermits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [eligible, setEligible] = useState(false);
  const [gateMessage, setGateMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState({
    governmentId: null,
    barangayClearance: null,
    dtiSecRegistration: null,
    otherDocuments: [],
  });

  const load = useCallback(async () => {
    try {
      const data = await getMyPermitApplications();
      setApps(data.applications || []);
      setVendor(data.vendor || null);
      setPermits(data.permits || []);
      setCategories(data.categories || []);
      setBusinessTypes(data.businessTypes || []);
      setEligible(data.eligible);
      setGateMessage(data.gateMessage);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Could not load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  usePolling(load, 45000, true);

  const latest = apps[0] || null;

  const openCreate = () => {
    setEditTarget(null);
    setForm({
      ...EMPTY_FORM,
      businessCategory: categories[0] || '',
      businessType: businessTypes[0] || '',
    });
    setFiles({
      governmentId: null,
      barangayClearance: null,
      dtiSecRegistration: null,
      otherDocuments: [],
    });
    setFormOpen(true);
  };

  const openEdit = (app) => {
    if (!app.canEdit) {
      Alert.alert(
        'Locked',
        'This application cannot be edited while it is pending or under review unless the office requests documents.'
      );
      return;
    }
    setEditTarget(app);
    setForm({
      businessName: app.businessName || '',
      ownerName: app.ownerName || '',
      businessAddress: app.businessAddress || '',
      contactNumber: app.contactNumber || '',
      businessCategory: app.businessCategory || '',
      businessType: app.businessType || '',
      additionalRemarks: app.additionalRemarks || '',
    });
    setFiles({
      governmentId: null,
      barangayClearance: null,
      dtiSecRegistration: null,
      otherDocuments: [],
    });
    setFormOpen(true);
  };

  const pickFile = async (field, multi = false) => {
    Alert.alert('Upload file', 'Choose source', [
      {
        text: 'Photo',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsMultipleSelection: multi,
          });
          if (result.canceled) return;
          const picked = (result.assets || []).map((a) => toUploadFile(a)).filter(Boolean);
          if (!picked.length) return;
          setFiles((f) =>
            multi
              ? { ...f, otherDocuments: [...f.otherDocuments, ...picked] }
              : { ...f, [field]: picked[0] }
          );
        },
      },
      {
        text: 'PDF / Document',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/jpeg', 'image/png'],
            copyToCacheDirectory: true,
            multiple: multi,
          });
          if (result.canceled) return;
          const assets = result.assets || [];
          for (const a of assets) {
            if ((a.size || 0) > 5 * 1024 * 1024) {
              Alert.alert('File too large', 'Maximum 5 MB per file.');
              return;
            }
          }
          const picked = assets.map((a) => toUploadFile(a)).filter(Boolean);
          if (!picked.length) return;
          setFiles((f) =>
            multi
              ? { ...f, otherDocuments: [...f.otherDocuments, ...picked] }
              : { ...f, [field]: picked[0] }
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async (asSubmit) => {
    if (!form.businessName.trim() || !form.ownerName.trim() || !form.businessAddress.trim()) {
      Alert.alert('Missing info', 'Business name, owner, and address are required.');
      return;
    }
    if (!form.contactNumber.trim() || !form.businessCategory || !form.businessType) {
      Alert.alert('Missing info', 'Contact, category, and business type are required.');
      return;
    }
    if (asSubmit) {
      const hasGov = files.governmentId || editTarget?.governmentId;
      const hasBrgy = files.barangayClearance || editTarget?.barangayClearance;
      if (!hasGov || !hasBrgy) {
        Alert.alert('Documents required', 'Government ID and Barangay Clearance are required to submit.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form, submit: asSubmit ? 'true' : 'false' };
      if (editTarget) {
        await updatePermitApplication(editTarget.id, payload, files);
      } else {
        await createPermitApplication(payload, files);
      }
      Alert.alert(
        asSubmit ? 'Submitted' : 'Saved',
        asSubmit
          ? 'Your application was submitted for review.'
          : 'Draft saved. You can submit when documents are ready.'
      );
      setFormOpen(false);
      await load();
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const openDoc = (path) => {
    const url = uploadUrl(path);
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('Unable to open file'));
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
        {!eligible && (
          <View style={[styles.gateBox, { backgroundColor: colors.warningLight }]}>
            <ExclamationTriangleIcon size={18} color={colors.warning} />
            <Text style={[styles.gateText, { color: colors.warningDeep || colors.warning }]}>
              {gateMessage ||
                'Optional: submit a Business Permit Application so the municipal office can review your permit documents.'}
            </Text>
          </View>
        )}

        {vendor ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Store application</Text>
                <Text style={styles.businessName}>{vendor.storeName}</Text>
              </View>
              <Badge
                label={STATUS_LABELS[vendor.status] || vendor.status}
                variant={vendor.status}
              />
            </View>
            <Row label="Business type" value={vendor.businessType || '—'} styles={styles} />
            <Row label="Stall" value={vendor.stallNumber || '—'} styles={styles} />
            <Row label="Phone" value={vendor.phone || '—'} styles={styles} />
            <Row label="Address" value={vendor.address || '—'} styles={styles} />
            <Row
              label="Documents"
              value={`${vendor.documents?.length || 0} on file`}
              styles={styles}
            />
            {vendor.status === 'APPROVED' ? (
              <Text style={styles.approvedHint}>
                Your store application is approved. You can manage products and your store profile.
              </Text>
            ) : null}
            {vendor.status === 'REJECTED' && vendor.rejectionReason ? (
              <View style={styles.remarkBox}>
                <Text style={styles.remarkTitle}>Rejection reason</Text>
                <Text style={styles.remarkText}>{vendor.rejectionReason}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.sectionLabel}>Store application</Text>
            <Text style={styles.emptyHint}>
              No store application yet. Submit one from Profile so admin can verify your details and
              documents.
            </Text>
          </View>
        )}

        {permits.length > 0 ? (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>On-file business permits</Text>
            {permits.map((p) => (
              <View key={p.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{p.businessName}</Text>
                  <Text style={styles.historyMeta}>
                    {p.permitNumber ? `No. ${p.permitNumber} · ` : ''}
                    {formatDate(p.expirationDate)} · {p.status}
                  </Text>
                </View>
                <Badge label={p.status} variant={p.status} />
              </View>
            ))}
          </View>
        ) : null}

        <Text style={[styles.historyTitle, { marginTop: 8, marginBottom: 8 }]}>
          Online permit applications
        </Text>

        {!latest ? (
          <EmptyState
            icon={ClipboardDocumentIcon}
            title="No online application yet"
            subtitle="Apply online so the municipal office can review your business permit documents."
          />
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.appNo}>{latest.applicationNumber}</Text>
                <Text style={styles.businessName}>{latest.businessName}</Text>
              </View>
              <Badge label={STATUS_LABELS[latest.status] || latest.status} variant={latest.status} />
            </View>
            <Row label="Owner" value={latest.ownerName} styles={styles} />
            <Row label="Category" value={latest.businessCategory} styles={styles} />
            <Row label="Type" value={latest.businessType} styles={styles} />
            <Row label="Contact" value={latest.contactNumber} styles={styles} />
            <Row label="Address" value={latest.businessAddress} styles={styles} />
            <Row label="Submitted" value={formatDate(latest.submittedAt)} styles={styles} />

            {(latest.status === 'REJECTED' || latest.status === 'DOCUMENTS_REQUESTED') && (
              <View style={styles.remarkBox}>
                <Text style={styles.remarkTitle}>Admin remarks</Text>
                <Text style={styles.remarkText}>{latest.adminRemarks || 'No remarks.'}</Text>
              </View>
            )}

            <View style={styles.docList}>
              {[
                ['Government ID', latest.governmentId],
                ['Barangay Clearance', latest.barangayClearance],
                ['DTI/SEC', latest.dtiSecRegistration],
              ]
                .filter(([, p]) => p)
                .map(([label, path]) => (
                  <TouchableOpacity key={label} onPress={() => openDoc(path)} style={styles.docRow}>
                    <Text style={styles.docLabel}>{label}</Text>
                    <Text style={styles.docLink}>View</Text>
                  </TouchableOpacity>
                ))}
            </View>

            <View style={styles.actions}>
              {latest.canEdit && (
                <Button
                  title={latest.canResubmit ? 'Edit & Resubmit' : 'Edit application'}
                  onPress={() => openEdit(latest)}
                />
              )}
            </View>
          </View>
        )}

        <Button
          title={latest ? 'New online application' : 'Apply for Business Permit'}
          onPress={openCreate}
          style={styles.uploadCta}
          variant={latest ? 'secondary' : 'primary'}
        />

        {apps.length > 1 && (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>Application history</Text>
            {apps.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.historyRow}
                onPress={() => (a.canEdit ? openEdit(a) : null)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{a.applicationNumber}</Text>
                  <Text style={styles.historyMeta}>
                    {formatDate(a.submittedAt || a.createdAt)} · {STATUS_LABELS[a.status]}
                  </Text>
                </View>
                <Badge label={STATUS_LABELS[a.status]} variant={a.status} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editTarget ? 'Edit application' : 'Business Permit Application'}
              </Text>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={10}>
                <XMarkIcon size={22} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
              {[
                ['businessName', 'Business name'],
                ['ownerName', 'Owner name'],
                ['businessAddress', 'Business address'],
              ].map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={form[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  styles={styles}
                  colors={colors}
                />
              ))}
              <Field
                label="Contact number"
                value={form.contactNumber}
                onChangeText={(v) => setForm((f) => ({ ...f, contactNumber: sanitizePhoneInput(v) }))}
                styles={styles}
                colors={colors}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Business category</Text>
              <ChipRow
                options={categories}
                value={form.businessCategory}
                onChange={(v) => setForm((f) => ({ ...f, businessCategory: v }))}
                styles={styles}
              />
              <Text style={styles.fieldLabel}>Type of business</Text>
              <ChipRow
                options={businessTypes}
                value={form.businessType}
                onChange={(v) => setForm((f) => ({ ...f, businessType: v }))}
                styles={styles}
              />

              <FilePick
                label="Valid Government ID *"
                file={files.governmentId}
                existing={editTarget?.governmentId}
                onPress={() => pickFile('governmentId')}
                styles={styles}
                colors={colors}
              />
              <FilePick
                label="Barangay Clearance *"
                file={files.barangayClearance}
                existing={editTarget?.barangayClearance}
                onPress={() => pickFile('barangayClearance')}
                styles={styles}
                colors={colors}
              />
              <FilePick
                label="DTI/SEC Registration (if applicable)"
                file={files.dtiSecRegistration}
                existing={editTarget?.dtiSecRegistration}
                onPress={() => pickFile('dtiSecRegistration')}
                styles={styles}
                colors={colors}
              />
              <FilePick
                label="Other required documents"
                file={
                  files.otherDocuments.length
                    ? { name: `${files.otherDocuments.length} file(s) selected` }
                    : null
                }
                existing={editTarget?.otherDocuments?.[0]}
                onPress={() => pickFile('otherDocuments', true)}
                styles={styles}
                colors={colors}
              />

              <Field
                label="Additional remarks"
                value={form.additionalRemarks}
                onChangeText={(v) => setForm((f) => ({ ...f, additionalRemarks: v }))}
                styles={styles}
                colors={colors}
                multiline
              />

              <Text style={styles.hint}>PDF / JPG / PNG · max 5 MB each</Text>
              <Button
                title={saving ? 'Saving…' : 'Save as draft'}
                variant="secondary"
                onPress={() => submit(false)}
                loading={saving}
                style={{ marginBottom: 8 }}
              />
              <Button
                title={saving ? 'Submitting…' : editTarget?.canResubmit ? 'Resubmit application' : 'Submit application'}
                onPress={() => submit(true)}
                loading={saving}
              />
            </ScrollView>
          </View>
        </View>
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

function Field({ label, value, onChangeText, styles, colors, placeholder, keyboardType, multiline }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

function ChipRow({ options, value, onChange, styles }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      {options.map((c) => {
        const active = value === c;
        return (
          <TouchableOpacity
            key={c}
            onPress={() => onChange(c)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function FilePick({ label, file, existing, onPress, styles, colors }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.filePick} onPress={onPress} activeOpacity={0.85}>
        <CloudArrowUpIcon size={20} color={colors.primary} />
        <Text style={styles.filePickText}>
          {file?.name || (existing ? 'Replace file (current on file)' : 'Choose PDF / JPG / PNG')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.pageBg },
    content: { padding: 16, paddingBottom: 40 },
    gateBox: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      marginBottom: 14,
      alignItems: 'flex-start',
    },
    gateText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.gray200,
      marginBottom: 12,
    },
    cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
    appNo: { fontSize: 11, fontWeight: '700', color: colors.inkMuted, marginBottom: 2 },
    businessName: { fontSize: 18, fontWeight: '800', color: colors.ink },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    emptyHint: { fontSize: 13, color: colors.inkMuted, lineHeight: 19, marginTop: 4 },
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
      gap: 12,
    },
    rowLabel: { fontSize: 13, color: colors.inkMuted },
    rowValue: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink, textAlign: 'right' },
    remarkBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerLight,
    },
    remarkTitle: { fontSize: 12, fontWeight: '700', color: colors.danger, marginBottom: 4 },
    remarkText: { fontSize: 13, color: colors.ink, lineHeight: 18 },
    docList: { marginTop: 12, gap: 6 },
    docRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    docLabel: { fontSize: 13, color: colors.ink },
    docLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
    actions: { marginTop: 14 },
    uploadCta: { marginTop: 16 },
    history: { marginTop: 24 },
    historyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.gray100,
    },
    historyName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    historyMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '94%',
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
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    filePickText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primary },
    hint: { fontSize: 11, color: colors.inkMuted, marginBottom: 14 },
  });
