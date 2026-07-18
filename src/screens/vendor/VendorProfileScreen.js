import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import {
  getMyVendor,
  submitVendorApplication,
  updateVendorProfile,
  getPermitCompliance,
} from '../../services/vendor.service';
import { updateProfile, changePassword } from '../../services/user.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import LoadingScreen from '../../components/LoadingScreen';
import StoreAvatar from '../../components/StoreAvatar';
import {
  BuildingStorefrontIcon,
  BanknotesIcon,
  CameraIcon,
  DocumentIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  LifebuoyIcon,
  LockClosedIcon,
  MoonIcon,
  NoSymbolIcon,
  PhotoIcon,
  PencilSquareIcon,
  PowerIcon,
  RocketLaunchIcon,
  SunIcon,
  UserIcon,
  XCircleIcon,
} from '../../components/icons';
import { sanitizePhoneInput } from '../../utils/phone';
import { uploadUrl } from '../../utils/media';
import { pickerAssetToUploadFile } from '../../utils/pickerFile';
import { useTheme } from '../../context/ThemeContext';

const TABS = [
  { id: 'store', label: 'Store', icon: BuildingStorefrontIcon },
  { id: 'account', label: 'Account', icon: UserIcon },
  { id: 'security', label: 'Security', icon: LockClosedIcon },
];

const BUSINESS_TYPES = [
  'Fresh Goods',
  'Food & Essentials',
  'Ready-to-Eat / Local Foods',
  'Dry Goods / Non-Food',
  'Other Market Items',
  'Local Products',
];

const buildStatusMeta = (colors) => ({
  PENDING: {
    icon: ClockIcon,
    title: 'Under review',
    message: 'Application submitted. You can view your store details here while admin verifies documents. Editing unlocks after approval.',
    bg: colors.warningLight,
    color: colors.warning,
  },
  APPROVED: {
    icon: CheckCircleIcon,
    title: 'Approved vendor',
    message: 'Your store profile is active. You can update store details below.',
    bg: colors.successLight,
    color: colors.success,
  },
  REJECTED: {
    icon: XCircleIcon,
    title: 'Application rejected',
    message: 'Update your details and re-submit your application.',
    bg: colors.dangerLight,
    color: colors.danger,
  },
  SUSPENDED: {
    icon: NoSymbolIcon,
    title: 'Account suspended',
    message:
      'Your stall is temporarily suspended. Your store profile and products are kept. Contact the market office — once reactivated, everything comes back.',
    bg: colors.gray100,
    color: colors.gray600,
  },
});

const EMPTY_STORE = {
  storeName: '',
  description: '',
  address: '',
  phone: '',
  stallNumber: '',
  businessType: '',
};

function ProfileEditToolbar({
  isEditing,
  saving,
  onStartEdit,
  onCancel,
  onSave,
}) {
  const { colors } = useTheme();
  const toolbarStyles = useMemo(() => createToolbarStyles(colors), [colors]);
  if (isEditing) {
    return (
      <View style={toolbarStyles.row}>
        <Button
          title="Cancel"
          variant="secondary"
          size="sm"
          onPress={onCancel}
          disabled={saving}
          style={toolbarStyles.btn}
        />
        <Button
          title="Save"
          size="sm"
          onPress={onSave}
          loading={saving}
          style={toolbarStyles.btn}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={toolbarStyles.editBtn}
      onPress={onStartEdit}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Edit profile"
    >
      <PencilSquareIcon size={16} color={colors.primary} />
      <Text style={toolbarStyles.editText}>Edit</Text>
    </TouchableOpacity>
  );
}

const createToolbarStyles = (colors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    btn: { minWidth: 88 },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderBrand,
      backgroundColor: colors.surface,
    },
    editText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  });

export default function VendorProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const { colors, mode, setMode, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const statusMeta = useMemo(() => buildStatusMeta(colors), [colors]);
  const [tab, setTab] = useState('store');
  const [vendor, setVendor] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [storeForm, setStoreForm] = useState(EMPTY_STORE);
  const [logoLocal, setLogoLocal] = useState(null); // { uri, name, type }
  const [logoRemoteFailed, setLogoRemoteFailed] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadVendor = useCallback(async () => {
    try {
      const [v, c] = await Promise.all([
        getMyVendor(),
        getPermitCompliance().catch(() => null),
      ]);
      // Only clear profile when API confirms there is none (404 → null).
      // Never wipe local vendor data on network/auth glitches.
      setVendor(v);
      setCompliance(c);
      setLogoLocal(null);
      setLogoRemoteFailed(false);
      if (v) {
        setStoreForm({
          storeName: v.storeName || '',
          description: v.description || '',
          address: v.address || '',
          phone: v.phone || '',
          stallNumber: v.stallNumber || '',
          businessType: v.businessType || '',
        });
      } else {
        setStoreForm({
          ...EMPTY_STORE,
          phone: user?.phone || '',
          address: user?.address || '',
        });
      }
    } catch (err) {
      if (err?.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
        await logout();
        return;
      }
      // Keep last known vendor/profile so deactivate hiccups don't look like "no store"
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.phone, user?.address, logout]);

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

  useEffect(() => {
    setAccountForm({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
    });
  }, [user]);

  const setStore = (key, val) => setStoreForm((f) => ({ ...f, [key]: val }));
  const setAccount = (key, val) => setAccountForm((f) => ({ ...f, [key]: val }));
  const setPassword = (key, val) => setPasswordForm((f) => ({ ...f, [key]: val }));

  const resetStoreForm = () => {
    if (vendor) {
      setStoreForm({
        storeName: vendor.storeName || '',
        description: vendor.description || '',
        address: vendor.address || '',
        phone: vendor.phone || '',
        stallNumber: vendor.stallNumber || '',
        businessType: vendor.businessType || '',
      });
    } else {
      setStoreForm({
        ...EMPTY_STORE,
        phone: user?.phone || '',
        address: user?.address || '',
      });
    }
    setLogoLocal(null);
    setLogoRemoteFailed(false);
  };

  const resetAccountForm = () => {
    setAccountForm({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
    });
  };

  const handleStartEdit = () => {
    if (tab === 'account') resetAccountForm();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (tab === 'store') resetStoreForm();
    else if (tab === 'account') resetAccountForm();
    setIsEditing(false);
  };

  const handleTabChange = (nextTab) => {
    if (isEditing) {
      if (tab === 'store') resetStoreForm();
      else if (tab === 'account') resetAccountForm();
      setIsEditing(false);
    }
    setTab(nextTab);
  };

  const canEditStore =
    !vendor || vendor.status === 'APPROVED' || vendor.status === 'REJECTED';
  const canEditLogo = canEditStore;
  const isNewApplication = !vendor;
  const isReapply = vendor?.status === 'REJECTED';
  const storeAlwaysEditing = isNewApplication || isReapply;
  const storeFieldsEditable = canEditStore && (storeAlwaysEditing || isEditing);
  const accountFieldsEditable = isEditing;
  const showStoreEditToolbar = canEditStore && !storeAlwaysEditing;
  const showAccountEditToolbar = true;

  const logoPreviewUri =
    logoLocal?.uri ||
    (!logoRemoteFailed ? uploadUrl(vendor?.logo, vendor?.updatedAt) : null);

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a store logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = pickerAssetToUploadFile(result.assets[0], 'logo');
    if (file) setLogoLocal(file);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a store logo photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = pickerAssetToUploadFile(result.assets[0], 'logo');
    if (file) setLogoLocal(file);
  };

  const openLogoPicker = () => {
    if (!canEditLogo || !storeFieldsEditable) {
      Alert.alert('View only', 'Tap Edit to change your store logo.');
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose from Gallery', 'Take Photo', 'Remove selected'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (index) => {
          if (index === 1) pickFromLibrary();
          if (index === 2) pickFromCamera();
          if (index === 3) setLogoLocal(null);
        }
      );
      return;
    }
    Alert.alert('Store logo', 'Choose a source', [
      { text: 'Gallery', onPress: pickFromLibrary },
      { text: 'Camera', onPress: pickFromCamera },
      ...(logoLocal ? [{ text: 'Remove selected', style: 'destructive', onPress: () => setLogoLocal(null) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const validateStore = () => {
    if (!storeForm.storeName.trim()) {
      Alert.alert('Missing info', 'Store name is required');
      return false;
    }
    if (!storeForm.address.trim()) {
      Alert.alert('Missing info', 'Store address is required');
      return false;
    }
    if (!storeForm.phone.trim() || !/^09\d{9}$/.test(storeForm.phone)) {
      Alert.alert('Missing info', 'Enter a valid 11-digit PH mobile (09XXXXXXXXX)');
      return false;
    }
    if (!storeForm.businessType) {
      Alert.alert('Missing info', 'Please select a business type');
      return false;
    }
    return true;
  };

  const handleSaveStore = async () => {
    if (!canEditStore) {
      Alert.alert('Locked', 'Store profile can only be edited when approved (or when re-applying).');
      return;
    }
    if (!validateStore()) return;

    if ((isNewApplication || isReapply) && (compliance?.expired || compliance?.blocked)) {
      Alert.alert(
        'Business Permit expired',
        compliance?.banner?.message ||
          'Your Business Permit has expired. Submit a renewed permit before creating or re-applying for a store.'
      );
      return;
    }

    setSaving(true);
    try {
      if (isNewApplication || isReapply) {
        const saved = await submitVendorApplication(storeForm, { logo: logoLocal || undefined });
        setVendor(saved?.vendor || saved || null);
        Alert.alert(
          'Submitted',
          isReapply
            ? 'Re-application submitted. Awaiting admin approval.'
            : 'Application submitted. You will receive an SMS once reviewed.'
        );
      } else {
        const hadNewLogo = Boolean(logoLocal);
        const saved = await updateVendorProfile(storeForm, { logo: logoLocal || undefined });
        setVendor(saved);
        Alert.alert(
          'Saved',
          hadNewLogo
            ? 'Store profile and logo updated. Check Dashboard to see it.'
            : 'Store profile updated.'
        );
      }
      setLogoLocal(null);
      setLogoRemoteFailed(false);
      setIsEditing(false);
      await loadVendor();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to save store profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountForm.name.trim()) {
      Alert.alert('Missing info', 'Name is required');
      return;
    }
    if (accountForm.phone && !/^09\d{9}$/.test(accountForm.phone)) {
      Alert.alert('Invalid phone', 'Use an 11-digit PH mobile (09XXXXXXXXX)');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: accountForm.name.trim(),
        phone: accountForm.phone || '',
        address: accountForm.address || '',
      });
      await refreshUser();
      setIsEditing(false);
      Alert.alert('Saved', 'Account details updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      Alert.alert('Missing info', 'Enter your current password');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Success', 'Password updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) return <LoadingScreen message="Loading profile..." />;

  const status = vendor ? statusMeta[vendor.status] : null;
  const StatusIcon = status?.icon;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadVendor();
              refreshUser().catch(() => {});
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.avatarTouch}
            onPress={tab === 'store' && storeFieldsEditable ? openLogoPicker : undefined}
            activeOpacity={tab === 'store' && storeFieldsEditable ? 0.8 : 1}
            disabled={tab !== 'store' || !storeFieldsEditable}
          >
            {logoLocal?.uri ? (
              <Image source={{ uri: logoLocal.uri }} style={styles.avatarImage} />
            ) : (
              <StoreAvatar
                logo={logoRemoteFailed ? null : vendor?.logo}
                name={vendor?.storeName || user?.name || 'V'}
                cacheKey={vendor?.updatedAt || vendor?.logo}
                size={72}
                radius={24}
              />
            )}
            {tab === 'store' && storeFieldsEditable ? (
              <View style={styles.cameraBadge}>
                <CameraIcon size={12} color={colors.white} />
              </View>
            ) : null}
          </TouchableOpacity>
          <Text style={styles.heroName}>{user?.name}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
          {vendor?.storeName ? (
            <Text style={styles.heroStore}>{vendor.storeName}</Text>
          ) : (
            <Text style={styles.heroStore}>No store application yet</Text>
          )}
          {vendor?.status ? (
            <View style={styles.heroBadge}>
              <Badge label={vendor.status} variant={vendor.status} />
            </View>
          ) : null}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.id;
            const TabIcon = t.icon;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => handleTabChange(t.id)}
                activeOpacity={0.8}
              >
                <TabIcon
                  size={16}
                  color={active ? colors.primary : colors.gray400}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* STORE TAB */}
        {tab === 'store' ? (
          <View style={styles.panel}>
            {status ? (
              <View style={[styles.statusCard, { backgroundColor: status.bg }]}>
                {StatusIcon ? <StatusIcon size={22} color={status.color} /> : null}
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: status.color }]}>{status.title}</Text>
                  <Text style={[styles.statusMsg, { color: status.color }]}>{status.message}</Text>
                  {vendor?.rejectionReason ? (
                    <Text style={[styles.statusMsg, { color: status.color, marginTop: 4 }]}>
                      Reason: {vendor.rejectionReason}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={[styles.statusCard, { backgroundColor: colors.primaryLight }]}>
                <RocketLaunchIcon size={22} color={colors.primary} />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: colors.primary }]}>
                    Create your store
                  </Text>
                  <Text style={[styles.statusMsg, { color: colors.primary }]}>
                    Submit an application to sell at Liliw Public Market.
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.subsectionLabel}>Store logo</Text>
            <View style={styles.logoRow}>
              <TouchableOpacity
                style={styles.logoPreview}
                onPress={openLogoPicker}
                disabled={!storeFieldsEditable}
                activeOpacity={0.85}
              >
                {logoPreviewUri ? (
                  <Image
                    source={{ uri: logoPreviewUri }}
                    style={styles.logoImage}
                    onError={() => {
                      if (!logoLocal) setLogoRemoteFailed(true);
                    }}
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <PhotoIcon size={28} color={colors.gray400} />
                    <Text style={styles.logoPlaceholderText}>No logo</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.logoCopy}>
                <Text style={styles.logoHint}>
                  Square image works best (JPEG/PNG, max 5MB).
                </Text>
                {storeFieldsEditable ? (
                  <Button
                    title={logoPreviewUri ? 'Change Logo' : 'Upload Logo'}
                    variant="outline"
                    size="sm"
                    onPress={openLogoPicker}
                    style={{ marginTop: 8, alignSelf: 'flex-start' }}
                  />
                ) : showStoreEditToolbar ? (
                  <Text style={styles.lockedHint}>Tap Edit to change your store logo.</Text>
                ) : (
                  <Text style={styles.lockedHint}>
                    Logo editing unlocks when approved or when re-applying.
                  </Text>
                )}
                {logoLocal ? (
                  <Text style={styles.logoPending}>New logo selected — tap Save to upload.</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.panelHeader}>
              <Text style={styles.sectionTitleInline}>Store information</Text>
              {showStoreEditToolbar ? (
                <ProfileEditToolbar
                  isEditing={isEditing}
                  saving={saving}
                  onStartEdit={handleStartEdit}
                  onCancel={handleCancelEdit}
                  onSave={handleSaveStore}
                />
              ) : null}
            </View>

            <Input
              label="Store Name *"
              placeholder="e.g. Juan's Fresh Goods"
              value={storeForm.storeName}
              onChangeText={(v) => setStore('storeName', v)}
              editable={storeFieldsEditable}
              containerStyle={!storeFieldsEditable ? styles.readOnlyField : undefined}
            />
            <Input
              label="Store Address *"
              placeholder="Liliw Public Market, Laguna"
              value={storeForm.address}
              onChangeText={(v) => setStore('address', v)}
              editable={storeFieldsEditable}
              containerStyle={!storeFieldsEditable ? styles.readOnlyField : undefined}
            />
            <Input
              label="Contact Number *"
              placeholder="09171234567"
              keyboardType="phone-pad"
              value={storeForm.phone}
              onChangeText={(v) => setStore('phone', sanitizePhoneInput(v))}
              editable={storeFieldsEditable}
              containerStyle={!storeFieldsEditable ? styles.readOnlyField : undefined}
            />
            <Input
              label="Preferred Stall No."
              placeholder="e.g. A-12"
              value={storeForm.stallNumber}
              onChangeText={(v) => setStore('stallNumber', v)}
              editable={storeFieldsEditable}
              containerStyle={!storeFieldsEditable ? styles.readOnlyField : undefined}
            />
            <Input
              label="Store Description"
              placeholder="Tell customers about your stall..."
              value={storeForm.description}
              onChangeText={(v) => setStore('description', v)}
              multiline
              numberOfLines={3}
              style={styles.textarea}
              editable={storeFieldsEditable}
              containerStyle={!storeFieldsEditable ? styles.readOnlyField : undefined}
            />

            <Text style={styles.fieldLabel}>Business Type *</Text>
            <View style={styles.typeGrid}>
              {BUSINESS_TYPES.map((type) => {
                const active = storeForm.businessType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    disabled={!storeFieldsEditable}
                    onPress={() => setStore('businessType', type)}
                    style={[
                      styles.typeChip,
                      active && styles.typeChipActive,
                      !storeFieldsEditable && styles.typeChipDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {storeAlwaysEditing && canEditStore ? (
              <Button
                title={
                  isNewApplication
                    ? 'Submit Application'
                    : isReapply
                      ? 'Re-submit Application'
                      : 'Save Store Profile'
                }
                onPress={handleSaveStore}
                loading={saving}
              />
            ) : !canEditStore ? (
              <Text style={styles.lockedHint}>
                Editing is locked while your application is {vendor?.status?.toLowerCase()}.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ACCOUNT TAB */}
        {tab === 'account' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitleInline}>Account details</Text>
                <Text style={styles.helper}>Personal login details (separate from store info).</Text>
              </View>
              {showAccountEditToolbar ? (
                <ProfileEditToolbar
                  isEditing={isEditing}
                  saving={saving}
                  onStartEdit={handleStartEdit}
                  onCancel={handleCancelEdit}
                  onSave={handleSaveAccount}
                />
              ) : null}
            </View>
            <Input
              label="Full Name *"
              value={accountForm.name}
              onChangeText={(v) => setAccount('name', v)}
              autoCapitalize="words"
              editable={accountFieldsEditable}
              containerStyle={!accountFieldsEditable ? styles.readOnlyField : undefined}
            />
            <Input
              label="Email"
              value={user?.email || ''}
              editable={false}
              containerStyle={styles.disabledField}
            />
            <Input
              label="Phone"
              placeholder="09171234567"
              keyboardType="phone-pad"
              value={accountForm.phone}
              onChangeText={(v) => setAccount('phone', sanitizePhoneInput(v))}
              editable={accountFieldsEditable}
              containerStyle={!accountFieldsEditable ? styles.readOnlyField : undefined}
            />
            <Input
              label="Address"
              placeholder="Your home / delivery address"
              value={accountForm.address}
              onChangeText={(v) => setAccount('address', v)}
              editable={accountFieldsEditable}
              containerStyle={!accountFieldsEditable ? styles.readOnlyField : undefined}
            />
          </View>
        ) : null}

        {/* SECURITY TAB */}
        {tab === 'security' ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Change password</Text>
            <Input
              label="Current Password"
              secureTextEntry
              value={passwordForm.currentPassword}
              onChangeText={(v) => setPassword('currentPassword', v)}
            />
            <Input
              label="New Password"
              secureTextEntry
              placeholder="Min. 6 characters"
              value={passwordForm.newPassword}
              onChangeText={(v) => setPassword('newPassword', v)}
            />
            <Input
              label="Confirm New Password"
              secureTextEntry
              value={passwordForm.confirmPassword}
              onChangeText={(v) => setPassword('confirmPassword', v)}
            />
            <Button title="Update Password" onPress={handleChangePassword} loading={saving} />
          </View>
        ) : null}

        {/* Appearance */}
        <View style={styles.appearanceCard}>
          <View style={styles.appearanceHeader}>
            {isDark ? (
              <MoonIcon size={18} color={colors.primary} />
            ) : (
              <SunIcon size={18} color={colors.primary} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.appearanceTitle}>Appearance</Text>
              <Text style={styles.appearanceSub}>
                {isDark ? 'Dark mode is on' : 'Light mode is on'}
              </Text>
            </View>
          </View>
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'light' && styles.modeOptionActive]}
              onPress={() => setMode('light')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'light' }}
              accessibilityLabel="Use light mode"
            >
              <SunIcon
                size={16}
                color={mode === 'light' ? colors.primary : colors.gray400}
              />
              <Text
                style={[styles.modeOptionText, mode === 'light' && styles.modeOptionTextActive]}
              >
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'dark' && styles.modeOptionActive]}
              onPress={() => setMode('dark')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'dark' }}
              accessibilityLabel="Use dark mode"
            >
              <MoonIcon
                size={16}
                color={mode === 'dark' ? colors.primary : colors.gray400}
              />
              <Text
                style={[styles.modeOptionText, mode === 'dark' && styles.modeOptionTextActive]}
              >
                Dark
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => navigation.navigate('AvailableStalls')}
          activeOpacity={0.85}
        >
          <BuildingStorefrontIcon size={18} color={colors.primary} />
          <Text style={styles.helpBtnText}>Available Stalls</Text>
          <ChevronRightIcon size={16} color={colors.gray300} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => navigation.navigate('Payments')}
          activeOpacity={0.85}
        >
          <BanknotesIcon size={18} color={colors.primary} />
          <Text style={styles.helpBtnText}>Payments</Text>
          <ChevronRightIcon size={16} color={colors.gray300} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => navigation.navigate('BusinessPermit')}
          activeOpacity={0.85}
        >
          <DocumentIcon size={18} color={colors.primary} />
          <Text style={styles.helpBtnText}>Business Permit</Text>
          <ChevronRightIcon size={16} color={colors.gray300} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => navigation.navigate('BusinessPermitApplication')}
          activeOpacity={0.85}
        >
          <ClipboardDocumentIcon size={18} color={colors.primary} />
          <Text style={styles.helpBtnText}>Business Permit Application</Text>
          <ChevronRightIcon size={16} color={colors.gray300} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => navigation.navigate('HelpCenter')}
          activeOpacity={0.85}
        >
          <LifebuoyIcon size={18} color={colors.primary} />
          <Text style={styles.helpBtnText}>Help Center / FAQs</Text>
          <ChevronRightIcon size={16} color={colors.gray300} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
          <PowerIcon size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors, isDark) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingBottom: 40 },

  hero: {
    backgroundColor: isDark ? colors.primaryDark : colors.primary,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarTouch: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  avatarImage: { width: 72, height: 72, borderRadius: 24 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  heroName: { fontSize: 20, fontWeight: '800', color: colors.white },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroStore: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 6, fontWeight: '600' },
  heroBadge: { marginTop: 10 },

  logoRow: { flexDirection: 'row', gap: 14, marginBottom: 20, alignItems: 'center' },
  logoPreview: {
    width: 88,
    height: 88,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoPlaceholderText: { fontSize: 11, color: colors.gray400, marginTop: 4, fontWeight: '600' },
  logoCopy: { flex: 1 },
  logoHint: { fontSize: 12, color: colors.gray500, lineHeight: 17 },
  logoPending: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 8 },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderBrand,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: colors.primaryLight },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.gray400 },
  tabTextActive: { color: colors.primary },

  panel: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderBrand,
  },

  statusCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  statusCopy: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  statusMsg: { fontSize: 12, lineHeight: 17, fontWeight: '500' },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.gray900,
    marginBottom: 12,
  },
  sectionTitleInline: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.gray900,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  subsectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray700,
    marginBottom: 10,
  },
  helper: { fontSize: 12, color: colors.gray400, marginTop: 2, lineHeight: 17 },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
  },
  typeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeChipDisabled: { opacity: 0.55 },
  typeChipText: { fontSize: 12, fontWeight: '600', color: colors.gray500 },
  typeChipTextActive: { color: colors.primary },

  textarea: { minHeight: 80, textAlignVertical: 'top' },
  disabledField: { opacity: 0.7 },
  readOnlyField: { opacity: 0.92 },
  lockedHint: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 17,
  },

  appearanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderBrand,
  },
  appearanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  appearanceTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  appearanceSub: { fontSize: 12, color: colors.inkMuted, marginTop: 1 },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  modeOptionActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderBrandStrong,
  },
  modeOptionText: { fontSize: 13, fontWeight: '600', color: colors.gray500 },
  modeOptionTextActive: { color: colors.primary, fontWeight: '700' },

  helpBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderBrand,
  },
  helpBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.primary },

  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.dangerLight,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  });
