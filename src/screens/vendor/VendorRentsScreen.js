import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Path } from 'react-native-svg';
import {
  getMyUnifiedDues,
  uploadRentProof,
  uploadUtilityProof,
} from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import LoadingScreen from '../../components/LoadingScreen';
import {
  BuildingStorefrontIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  EyeIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  DocumentTextIcon,
  CameraIcon,
  PhotoIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  ChevronRightIcon,
} from '../../components/icons';
import { useTheme } from '../../context/ThemeContext';
import { uploadUrl } from '../../utils/media';
import { pickerAssetToUploadFile } from '../../utils/pickerFile';
import { shareOrSaveFile } from '../../utils/fileShare';
import { lightHaptic } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function WaterDropIcon({ size = 16, color = '#0EA5E9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.25c-4.5 5.5-7.5 9-7.5 12.75a7.5 7.5 0 0 0 15 0C19.5 11.25 16.5 7.75 12 2.25Z"
      />
    </Svg>
  );
}

const CATEGORY_CONFIG = {
  STALL_RENT: {
    label: 'Stall Rent',
    tag: 'STALL RENT',
    accent: '#6366F1',
    bg: '#EEF2FF',
    text: '#4338CA',
    darkBg: 'rgba(99, 102, 241, 0.15)',
    darkText: '#A5B4FC',
  },
  WATER: {
    label: 'Water Bill',
    tag: 'WATER BILL',
    accent: '#0EA5E9',
    bg: '#F0F9FF',
    text: '#0369A1',
    darkBg: 'rgba(14, 165, 233, 0.15)',
    darkText: '#7DD3FC',
  },
  ELECTRICITY: {
    label: 'Electricity Bill',
    tag: 'ELECTRICITY BILL',
    accent: '#F59E0B',
    bg: '#FFFBEB',
    text: '#B45309',
    darkBg: 'rgba(245, 158, 11, 0.15)',
    darkText: '#FCD34D',
  },
};

const STATUS_CONFIG = {
  PAID: {
    label: 'Paid & Verified',
    accent: '#10B981',
    bg: '#ECFDF5',
    text: '#047857',
    darkBg: 'rgba(16, 185, 129, 0.15)',
    darkText: '#6EE7B7',
  },
  UNPAID: {
    label: 'Unpaid Due',
    accent: '#F43F5E',
    bg: '#FFF1F2',
    text: '#BE123C',
    darkBg: 'rgba(244, 63, 94, 0.15)',
    darkText: '#FDA4AF',
  },
  OVERDUE: {
    label: 'Overdue Due',
    accent: '#E11D48',
    bg: '#FFE4E6',
    text: '#9F1239',
    darkBg: 'rgba(225, 29, 72, 0.2)',
    darkText: '#FB7185',
  },
  PARTIAL: {
    label: 'Partially Paid',
    accent: '#F97316',
    bg: '#FFF7ED',
    text: '#C2410C',
    darkBg: 'rgba(249, 115, 22, 0.15)',
    darkText: '#FDBA74',
  },
  PENDING_VERIFY: {
    label: 'Under Treasury Review',
    accent: '#3B82F6',
    bg: '#EFF6FF',
    text: '#1D4ED8',
    darkBg: 'rgba(59, 130, 246, 0.15)',
    darkText: '#93C5FD',
  },
};

function formatMoney(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isPdfFile(url) {
  return /\.pdf($|\?)/i.test(url || '');
}

function canSubmitProof(status) {
  return ['UNPAID', 'OVERDUE', 'PARTIAL', 'PENDING_VERIFY'].includes(status);
}

export default function VendorRentsScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // Unified items & vendor info
  const [allItems, setAllItems] = useState([]);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const initialCategory = route?.params?.initialCategory || 'ALL';
  const [categoryTab, setCategoryTab] = useState(initialCategory); // ALL | STALL_RENT | WATER | ELECTRICITY
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | UNSETTLED | PENDING | PAID
  const [search, setSearch] = useState('');

  // Dynamically update categoryTab when navigating with a specific initialCategory (e.g. from Dashboard UtilityBills)
  useEffect(() => {
    if (route?.params?.initialCategory) {
      setCategoryTab(route.params.initialCategory);
    }
  }, [route?.params?.initialCategory]);

  // Upload Receipt Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [modalCategory, setModalCategory] = useState('STALL_RENT'); // STALL_RENT | WATER | ELECTRICITY
  const [selectedItemId, setSelectedItemId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [showBillPickerModal, setShowBillPickerModal] = useState(false);

  // Fullscreen Proof Viewer Modal
  const [viewProofUrl, setViewProofUrl] = useState(null);
  const [viewProofTitle, setViewProofTitle] = useState('Receipt Proof');

  // Load unified dues
  const fetchData = useCallback(async () => {
    try {
      const data = await getMyUnifiedDues();
      setAllItems(data.items || []);
      if (data.vendor) setVendorInfo(data.vendor);
    } catch {
      setAllItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  usePolling(fetchData, 12000);

  // Statistics by category
  const stats = useMemo(() => {
    const calcCat = (cat) => {
      const items = allItems.filter((i) => i.category === cat);
      const unsettled = items.filter((i) => i.status !== 'PAID');
      const totalUnsettled = unsettled.reduce((s, i) => s + (Number(i.amount) || 0), 0);
      return {
        total: items.length,
        unsettledCount: unsettled.length,
        totalUnsettled,
      };
    };

    return {
      stallRent: calcCat('STALL_RENT'),
      water: calcCat('WATER'),
      electricity: calcCat('ELECTRICITY'),
      totalDue: allItems
        .filter((i) => i.status !== 'PAID')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    };
  }, [allItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (categoryTab !== 'ALL' && item.category !== categoryTab) return false;

      if (statusFilter === 'UNSETTLED') {
        if (item.status === 'PAID') return false;
      } else if (statusFilter === 'PENDING') {
        if (item.status !== 'PENDING_VERIFY') return false;
      } else if (statusFilter === 'PAID') {
        if (item.status !== 'PAID') return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchPeriod = item.periodLabel?.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchPeriod && !matchNotes) return false;
      }

      return true;
    });
  }, [allItems, categoryTab, statusFilter, search]);

  // Items matching current category in the upload modal
  const modalCategoryItems = useMemo(() => {
    return allItems.filter((i) => i.category === modalCategory);
  }, [allItems, modalCategory]);

  const selectedItemObj = useMemo(() => {
    return allItems.find((i) => i.id === selectedItemId);
  }, [allItems, selectedItemId]);

  // Open Upload Modal (with optional pre-selected item)
  const openUploadModal = (preselectedItem = null) => {
    lightHaptic();
    let targetCat = 'STALL_RENT';
    let targetId = '';
    let targetAmount = '';

    if (preselectedItem) {
      targetCat = preselectedItem.category;
      targetId = preselectedItem.id;
      targetAmount = String(preselectedItem.amount || '');
    } else {
      // Default to first unsettled item
      const firstUnsettled = allItems.find((i) => i.status !== 'PAID');
      if (firstUnsettled) {
        targetCat = firstUnsettled.category;
        targetId = firstUnsettled.id;
        targetAmount = String(firstUnsettled.amount || '');
      } else if (allItems.length > 0) {
        targetCat = allItems[0].category;
        targetId = allItems[0].id;
        targetAmount = String(allItems[0].amount || '');
      }
    }

    setModalCategory(targetCat);
    setSelectedItemId(targetId);
    setAmountPaid(targetAmount);
    setReceiptNumber('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setRemarks('');
    setSelectedAsset(null);
    setShowUploadModal(true);
  };

  const handleModalCategoryChange = (newCat) => {
    lightHaptic();
    setModalCategory(newCat);
    const catItems = allItems.filter((i) => i.category === newCat);
    const unsettled = catItems.find((i) => i.status !== 'PAID');
    const target = unsettled || catItems[0];
    if (target) {
      setSelectedItemId(target.id);
      setAmountPaid(String(target.amount || ''));
    } else {
      setSelectedItemId('');
      setAmountPaid('');
    }
  };

  const handleItemSelect = (item) => {
    lightHaptic();
    setSelectedItemId(item.id);
    setAmountPaid(String(item.amount || ''));
    setShowBillPickerModal(false);
  };

  // 1. Pick from Photo Gallery (JPEG, PNG, WebP)
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Photo gallery access is required to upload receipt images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedAsset(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  // 2. Capture Photo via Camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required to take a photo of your receipt.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedAsset(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  // 3. Pick Document (PDF, JPEG, PNG via DocumentPicker)
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'Document size exceeds the 10MB limit.');
          return;
        }
        setSelectedAsset(file);
      }
    } catch {
      Alert.alert('Error', 'Could not select document file.');
    }
  };

  // Submit official receipt proof
  const handleSubmitProof = async () => {
    if (!selectedItemId) {
      Alert.alert('Required', 'Please select a billing period for this receipt.');
      return;
    }
    if (!selectedAsset) {
      Alert.alert('Required', 'Please attach your official receipt (JPEG, PNG, or PDF).');
      return;
    }

    const targetItem = allItems.find((i) => i.id === selectedItemId);
    if (!targetItem) {
      Alert.alert('Error', 'Selected billing record not found.');
      return;
    }

    const file = pickerAssetToUploadFile(
      selectedAsset,
      `receipt_${targetItem.category.toLowerCase()}_${targetItem.id}`
    );

    if (!file) {
      Alert.alert('Error', 'Invalid file selected.');
      return;
    }

    setSubmittingProof(true);
    try {
      const fields = {
        amountPaid: amountPaid ? Number(amountPaid) : undefined,
        referenceNumber: receiptNumber?.trim() || undefined,
        paymentDate: paymentDate || undefined,
        remarks: remarks?.trim() || undefined,
      };

      if (targetItem.category === 'STALL_RENT') {
        await uploadRentProof(targetItem.id, file, fields);
      } else {
        await uploadUtilityProof(targetItem.id, file, fields);
      }

      Alert.alert(
        'Receipt Submitted',
        `${targetItem.categoryLabel} proof has been submitted! It is now queued for Treasury verification.`
      );
      setShowUploadModal(false);
      setSelectedAsset(null);
      fetchData();
    } catch (err) {
      Alert.alert(
        'Upload Failed',
        err.response?.data?.message || err.message || 'Could not upload receipt proof.'
      );
    } finally {
      setSubmittingProof(false);
    }
  };

  // Open Proof Handler (Image Viewer or PDF Share/Open)
  const handleOpenProof = (proofUrlStr, title) => {
    lightHaptic();
    const fullUrl = uploadUrl(proofUrlStr);
    if (!fullUrl) return;

    if (isPdfFile(proofUrlStr)) {
      Alert.alert(
        'PDF Document',
        'Would you like to open or save this PDF receipt?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open in Browser',
            onPress: () => Linking.openURL(fullUrl).catch(() => shareOrSaveFile(fullUrl, `${title}.pdf`)),
          },
          {
            text: 'Save / Share PDF',
            onPress: () => shareOrSaveFile(fullUrl, `${title}.pdf`),
          },
        ]
      );
    } else {
      setViewProofUrl(fullUrl);
      setViewProofTitle(title);
    }
  };

  if (loading && allItems.length === 0) {
    return <LoadingScreen message="Loading Stall Rent & Dues..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => `${item.category}-${item.id}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* 1. Header Banner & Quick Upload Button */}
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <View style={styles.titleIconBox}>
                  <BuildingStorefrontIcon size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleWithBadge}>
                    <Text style={styles.screenTitle}>Stall Rent & Dues</Text>
                    {vendorInfo?.stallNumber ? (
                      <View style={styles.stallPill}>
                        <Text style={styles.stallPillText}>Stall #{vendorInfo.stallNumber}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.screenSub}>
                    Bukod-bukod na talaan ng Stall Rent, Water Bills, at Electricity Bills.
                  </Text>
                </View>
              </View>

              {/* Header Action: Upload Receipt Button */}
              <View style={styles.headerActionsRow}>
                <TouchableOpacity
                  onPress={() => openUploadModal()}
                  style={styles.headerUploadBtn}
                  activeOpacity={0.85}
                >
                  <CloudArrowUpIcon size={17} color={colors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.headerUploadBtnText}>Upload Official Receipt</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Three Columns Overview (Stall Rent | Water Bills | Electricity Bills) */}
            <Text style={styles.sectionHeaderTitle}>Overview by Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.columnsScroll}
            >
              {/* Column 1: Stall Rent */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  lightHaptic();
                  setCategoryTab((prev) => (prev === 'STALL_RENT' ? 'ALL' : 'STALL_RENT'));
                }}
                style={[
                  styles.columnCard,
                  categoryTab === 'STALL_RENT' && styles.columnCardActiveIndigo,
                ]}
              >
                <View style={styles.columnTopRow}>
                  <View style={[styles.columnIconCircle, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#EEF2FF' }]}>
                    <BuildingStorefrontIcon size={18} color="#6366F1" />
                  </View>
                  <View style={[styles.columnBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.25)' : '#EEF2FF' }]}>
                    <Text style={[styles.columnBadgeText, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>
                      {stats.stallRent.total} records
                    </Text>
                  </View>
                </View>
                <Text style={styles.columnCategoryName}>Stall Rent</Text>
                <Text style={styles.columnAmount}>{formatMoney(stats.stallRent.totalUnsettled)}</Text>
                <Text style={styles.columnFooterText}>
                  {stats.stallRent.unsettledCount > 0 ? (
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>
                      {stats.stallRent.unsettledCount} due to settle
                    </Text>
                  ) : (
                    <Text style={{ color: colors.success, fontWeight: '700' }}>All rents settled</Text>
                  )}
                </Text>
              </TouchableOpacity>

              {/* Column 2: Water Bills */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  lightHaptic();
                  setCategoryTab((prev) => (prev === 'WATER' ? 'ALL' : 'WATER'));
                }}
                style={[
                  styles.columnCard,
                  categoryTab === 'WATER' && styles.columnCardActiveSky,
                ]}
              >
                <View style={styles.columnTopRow}>
                  <View style={[styles.columnIconCircle, { backgroundColor: isDark ? 'rgba(14,165,233,0.2)' : '#F0F9FF' }]}>
                    <WaterDropIcon size={18} color="#0EA5E9" />
                  </View>
                  <View style={[styles.columnBadge, { backgroundColor: isDark ? 'rgba(14,165,233,0.25)' : '#F0F9FF' }]}>
                    <Text style={[styles.columnBadgeText, { color: isDark ? '#7DD3FC' : '#0369A1' }]}>
                      {stats.water.total} records
                    </Text>
                  </View>
                </View>
                <Text style={styles.columnCategoryName}>Water Bills</Text>
                <Text style={styles.columnAmount}>{formatMoney(stats.water.totalUnsettled)}</Text>
                <Text style={styles.columnFooterText}>
                  {stats.water.unsettledCount > 0 ? (
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>
                      {stats.water.unsettledCount} due to settle
                    </Text>
                  ) : (
                    <Text style={{ color: colors.success, fontWeight: '700' }}>All bills settled</Text>
                  )}
                </Text>
              </TouchableOpacity>

              {/* Column 3: Electricity Bills */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  lightHaptic();
                  setCategoryTab((prev) => (prev === 'ELECTRICITY' ? 'ALL' : 'ELECTRICITY'));
                }}
                style={[
                  styles.columnCard,
                  categoryTab === 'ELECTRICITY' && styles.columnCardActiveAmber,
                ]}
              >
                <View style={styles.columnTopRow}>
                  <View style={[styles.columnIconCircle, { backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#FFFBEB' }]}>
                    <BoltIcon size={18} color="#F59E0B" />
                  </View>
                  <View style={[styles.columnBadge, { backgroundColor: isDark ? 'rgba(245,158,11,0.25)' : '#FFFBEB' }]}>
                    <Text style={[styles.columnBadgeText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                      {stats.electricity.total} records
                    </Text>
                  </View>
                </View>
                <Text style={styles.columnCategoryName}>Electricity Bills</Text>
                <Text style={styles.columnAmount}>{formatMoney(stats.electricity.totalUnsettled)}</Text>
                <Text style={styles.columnFooterText}>
                  {stats.electricity.unsettledCount > 0 ? (
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>
                      {stats.electricity.unsettledCount} due to settle
                    </Text>
                  ) : (
                    <Text style={{ color: colors.success, fontWeight: '700' }}>All bills settled</Text>
                  )}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* 3. Category Filter Tabs */}
            <View style={styles.tabsWrap}>
              {[
                { id: 'ALL', label: 'All Receipts', count: allItems.length },
                { id: 'STALL_RENT', label: 'Stall Rent', count: stats.stallRent.total },
                { id: 'WATER', label: 'Water Bills', count: stats.water.total },
                { id: 'ELECTRICITY', label: 'Electricity Bills', count: stats.electricity.total },
              ].map((tab) => {
                const isActive = categoryTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => {
                      lightHaptic();
                      setCategoryTab(tab.id);
                    }}
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  >
                    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                      {tab.label}
                    </Text>
                    <View style={[styles.tabCountPill, isActive && styles.tabCountPillActive]}>
                      <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
                        {tab.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Status Filter & Search */}
            <View style={styles.filterBar}>
              <View style={styles.statusChipsRow}>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'UNSETTLED', label: 'Due / Unsettled' },
                  { id: 'PENDING', label: 'Under Review' },
                  { id: 'PAID', label: 'Paid' },
                ].map((st) => {
                  const isSel = statusFilter === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      onPress={() => {
                        lightHaptic();
                        setStatusFilter(st.id);
                      }}
                      style={[styles.statusChip, isSel && styles.statusChipActive]}
                    >
                      <Text style={[styles.statusChipText, isSel && styles.statusChipTextActive]}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.searchBox}>
                <MagnifyingGlassIcon size={16} color={colors.inkMuted} style={{ marginRight: 6 }} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search billing period..."
                  placeholderTextColor={colors.inkMuted}
                  style={styles.searchInput}
                  clearButtonMode="while-editing"
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <DocumentTextIcon size={32} color={colors.inkMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {search ? 'No matching receipt records' : 'No records found in this category'}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? 'Try modifying your search or reset filters.'
                : 'When the Treasury generates dues, they will appear here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.STALL_RENT;
          const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.UNPAID;
          const hasProof = Boolean(item.proofUrl);
          const isPdf = hasProof && isPdfFile(item.proofUrl);
          const officialReceipt = item.officialReceipt;

          return (
            <View style={[styles.cardItem, { borderLeftColor: cat.accent }]}>
              {/* Card Top: Category Tag + Status Badge */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardCatTag,
                    {
                      backgroundColor: isDark ? cat.darkBg : cat.bg,
                      borderColor: cat.accent,
                    },
                  ]}
                >
                  {item.category === 'STALL_RENT' ? (
                    <BuildingStorefrontIcon size={13} color={isDark ? cat.darkText : cat.text} style={{ marginRight: 4 }} />
                  ) : item.category === 'WATER' ? (
                    <WaterDropIcon size={13} color={isDark ? cat.darkText : cat.text} style={{ marginRight: 4 }} />
                  ) : (
                    <BoltIcon size={13} color={isDark ? cat.darkText : cat.text} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.cardCatTagText, { color: isDark ? cat.darkText : cat.text }]}>
                    {cat.tag}
                  </Text>
                </View>

                <View
                  style={[
                    styles.cardStatusBadge,
                    {
                      backgroundColor: isDark ? statusMeta.darkBg : statusMeta.bg,
                      borderColor: statusMeta.accent,
                    },
                  ]}
                >
                  <Text style={[styles.cardStatusBadgeText, { color: isDark ? statusMeta.darkText : statusMeta.text }]}>
                    {statusMeta.label}
                  </Text>
                </View>
              </View>

              {/* Card Middle: Period & Amount */}
              <View style={styles.cardBody}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPeriod}>{item.periodLabel || 'Billing Period'} {cat.label}</Text>
                  <View style={styles.cardDateRow}>
                    <CalendarIcon size={13} color={colors.inkMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.cardDateText}>Due: {formatDate(item.dueDate)}</Text>
                    {item.paidDate ? (
                      <>
                        <Text style={styles.cardDateDot}>•</Text>
                        <CheckCircleIcon size={13} color={colors.success} style={{ marginRight: 4 }} />
                        <Text style={[styles.cardDateText, { color: colors.success }]}>
                          Paid: {formatDate(item.paidDate)}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.cardAmount}>{formatMoney(item.amount)}</Text>
              </View>

              {/* Notes if any */}
              {item.notes ? (
                <View style={styles.cardNotesBox}>
                  <Text style={styles.cardNotesText}>{item.notes}</Text>
                </View>
              ) : null}

              {/* Status Notice for Review */}
              {item.status === 'PENDING_VERIFY' ? (
                <View style={styles.reviewNoticeBox}>
                  <ClockIcon size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={styles.reviewNoticeText}>
                    Resibo ay submitted na — nire-review ng Treasury para sa opisyal na e-Receipt.
                  </Text>
                </View>
              ) : null}

              {/* Card Footer Actions */}
              <View style={styles.cardActionsRow}>
                {hasProof && (
                  <TouchableOpacity
                    onPress={() => handleOpenProof(item.proofUrl, `${cat.label} — ${item.periodLabel || 'Receipt'}`)}
                    style={styles.viewProofBtn}
                  >
                    {isPdf ? (
                      <DocumentIcon size={15} color="#E11D48" style={{ marginRight: 5 }} />
                    ) : (
                      <EyeIcon size={15} color={colors.ink} style={{ marginRight: 5 }} />
                    )}
                    <Text style={styles.viewProofBtnText}>
                      {isPdf ? 'View PDF Receipt' : 'View Receipt'}
                    </Text>
                  </TouchableOpacity>
                )}

                {officialReceipt?.pdfPath ? (
                  <TouchableOpacity
                    onPress={() => {
                      lightHaptic();
                      const url = uploadUrl(officialReceipt.pdfPath);
                      shareOrSaveFile(url, `Official_Receipt_${item.periodLabel}.pdf`);
                    }}
                    style={styles.downloadReceiptBtn}
                  >
                    <ArrowDownTrayIcon size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.downloadReceiptBtnText}>Download e-Receipt</Text>
                  </TouchableOpacity>
                ) : null}

                {canSubmitProof(item.status) && (
                  <TouchableOpacity
                    onPress={() => openUploadModal(item)}
                    style={[styles.uploadBtn, hasProof && styles.uploadBtnSecondary]}
                  >
                    <CloudArrowUpIcon size={15} color={hasProof ? colors.ink : colors.white} style={{ marginRight: 5 }} />
                    <Text style={hasProof ? styles.uploadBtnSecondaryText : styles.uploadBtnText}>
                      {hasProof ? 'Update Receipt' : 'Upload Receipt'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* ── COMPACT & RESPONSIVE UPLOAD RECEIPT MODAL ── */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Top Brand Stripe */}
            <View style={styles.modalStripe} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Upload Official Receipt</Text>
                <Text style={styles.modalSub}>
                  Proof of payment para sa Treasury verification
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!submittingProof) setShowUploadModal(false);
                }}
                style={styles.modalCloseBtn}
              >
                <XMarkIcon size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Step 1: Segmented Category Selector */}
              <Text style={styles.formLabel}>Uri ng Resibo (Category) *</Text>
              <View style={styles.modalCategorySegment}>
                {[
                  { id: 'STALL_RENT', label: 'Stall Rent', icon: BuildingStorefrontIcon },
                  { id: 'WATER', label: 'Water', icon: WaterDropIcon },
                  { id: 'ELECTRICITY', label: 'Electricity', icon: BoltIcon },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isActive = modalCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => handleModalCategoryChange(cat.id)}
                      style={[styles.modalCatBtn, isActive && styles.modalCatBtnActive]}
                    >
                      <Icon size={14} color={isActive ? colors.primary : colors.inkMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.modalCatBtnText, isActive && styles.modalCatBtnTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Step 2: Billing Period Selector */}
              <Text style={styles.formLabel}>Billing Period *</Text>
              <TouchableOpacity
                onPress={() => setShowBillPickerModal(true)}
                style={styles.billPickerTrigger}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.billPickerTriggerText}>
                    {selectedItemObj ? `${selectedItemObj.periodLabel} · ${formatMoney(selectedItemObj.amount)}` : '-- Piliin ang buwan / billing --'}
                  </Text>
                  {selectedItemObj && (
                    <Text style={styles.billPickerTriggerSub}>
                      Due: {formatDate(selectedItemObj.dueDate)} · Status: {selectedItemObj.status}
                    </Text>
                  )}
                </View>
                <ChevronRightIcon size={16} color={colors.inkMuted} />
              </TouchableOpacity>

              {/* Step 3: Amount Paid & Date */}
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Halagang Binayaran (₱) *</Text>
                  <TextInput
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.inkMuted}
                    style={styles.formInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Petsa ng Resibo *</Text>
                  <TextInput
                    value={paymentDate}
                    onChangeText={setPaymentDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.inkMuted}
                    style={styles.formInput}
                  />
                </View>
              </View>

              {/* Step 4: OR Number & Remarks */}
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>OR / Ref No. (Opsyonal)</Text>
                  <TextInput
                    value={receiptNumber}
                    onChangeText={setReceiptNumber}
                    placeholder="Hal. OR-10924"
                    placeholderTextColor={colors.inkMuted}
                    style={styles.formInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Paalala / Remarks</Text>
                  <TextInput
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Hal. Bayad sa opisina"
                    placeholderTextColor={colors.inkMuted}
                    style={styles.formInput}
                  />
                </View>
              </View>

              {/* Step 5: Attach Receipt File — JPEG, PNG, PDF (≤10MB) */}
              <View style={styles.attachHeaderRow}>
                <Text style={styles.formLabel}>I-attach ang Resibo *</Text>
                <Text style={styles.attachFormatsHint}>JPEG, PNG, PDF (≤10MB)</Text>
              </View>

              {selectedAsset ? (
                <View style={styles.attachedPreviewCard}>
                  {selectedAsset.mimeType === 'application/pdf' || isPdfFile(selectedAsset.name) ? (
                    <View style={styles.pdfPreviewBox}>
                      <View style={styles.pdfIconBadge}>
                        <Text style={styles.pdfIconBadgeText}>PDF</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attachedFileName} numberOfLines={1}>
                          {selectedAsset.name || 'receipt_document.pdf'}
                        </Text>
                        <Text style={styles.attachedFileSize}>
                          {selectedAsset.size ? `${(selectedAsset.size / 1024).toFixed(1)} KB` : 'PDF Document'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePreviewBox}>
                      <Image source={{ uri: selectedAsset.uri }} style={styles.previewThumbnail} resizeMode="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attachedFileName} numberOfLines={1}>
                          {selectedAsset.name || 'receipt_photo.jpg'}
                        </Text>
                        <Text style={styles.attachedFileSize}>
                          {selectedAsset.size ? `${(selectedAsset.size / 1024).toFixed(1)} KB` : 'Image file'}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      onPress={handlePickDocument}
                      style={styles.changeFileBtn}
                    >
                      <Text style={styles.changeFileBtnText}>Palitan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedAsset(null)}
                      style={styles.removeAttachedBtn}
                      hitSlop={8}
                    >
                      <XMarkIcon size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.threePickerRow}>
                  <TouchableOpacity onPress={handleTakePhoto} style={styles.threePickerBtn}>
                    <CameraIcon size={20} color={colors.primary} />
                    <Text style={styles.threePickerBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePickImage} style={styles.threePickerBtn}>
                    <PhotoIcon size={20} color={colors.primary} />
                    <Text style={styles.threePickerBtnText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePickDocument} style={styles.threePickerBtn}>
                    <DocumentIcon size={20} color="#E11D48" />
                    <Text style={[styles.threePickerBtnText, { color: '#E11D48' }]}>PDF File</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmitProof}
                disabled={submittingProof}
                style={[styles.modalSubmitBtn, submittingProof && { opacity: 0.6 }]}
              >
                {submittingProof ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <CloudArrowUpIcon size={18} color={colors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.modalSubmitBtnText}>I-submit ang Resibo</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── BILLING PERIOD PICKER MODAL ── */}
      <Modal visible={showBillPickerModal} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerDialog}>
            <View style={styles.pickerDialogHeader}>
              <Text style={styles.pickerDialogTitle}>Select Billing Period</Text>
              <TouchableOpacity onPress={() => setShowBillPickerModal(false)} style={styles.modalCloseBtn}>
                <XMarkIcon size={18} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {modalCategoryItems.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.inkMuted }}>No billing records for this category.</Text>
                </View>
              ) : (
                modalCategoryItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  const isPaid = item.status === 'PAID';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleItemSelect(item)}
                      style={[styles.pickerItemRow, isSelected && styles.pickerItemRowActive]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerItemPeriod, isSelected && { color: colors.primary }]}>
                          {isPaid ? '✅' : '⚠️'} {item.periodLabel}
                        </Text>
                        <Text style={styles.pickerItemSub}>
                          Due: {formatDate(item.dueDate)} · Status: {item.status}
                        </Text>
                      </View>
                      <Text style={styles.pickerItemAmount}>{formatMoney(item.amount)}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── FULLSCREEN PROOF IMAGE VIEWER MODAL ── */}
      <Modal visible={Boolean(viewProofUrl)} transparent animationType="fade">
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle} numberOfLines={1}>
              {viewProofTitle}
            </Text>
            <TouchableOpacity onPress={() => setViewProofUrl(null)} style={styles.viewerCloseBtn}>
              <XMarkIcon size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          {viewProofUrl && (
            <Image
              source={{ uri: viewProofUrl }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.pageBg,
    },
    listContent: {
      paddingBottom: 40,
    },
    headerWrap: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
    },

    // Title Section
    titleSection: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    titleIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWithBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    screenTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.ink,
      letterSpacing: -0.2,
    },
    stallPill: {
      backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#EEF2FF',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    stallPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#4F46E5',
    },
    screenSub: {
      fontSize: 12,
      color: colors.inkMuted,
      marginTop: 4,
      lineHeight: 16,
    },
    headerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
    },
    headerUploadBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    headerUploadBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.white,
    },

    // Overview Section Title
    sectionHeaderTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },

    // 3 Column Cards
    columnsScroll: {
      gap: 12,
      paddingBottom: 14,
    },
    columnCard: {
      width: SCREEN_WIDTH * 0.58,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 2,
    },
    columnCardActiveIndigo: {
      borderColor: '#6366F1',
      backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#F5F7FF',
    },
    columnCardActiveSky: {
      borderColor: '#0EA5E9',
      backgroundColor: isDark ? 'rgba(14,165,233,0.12)' : '#F0F9FF',
    },
    columnCardActiveAmber: {
      borderColor: '#F59E0B',
      backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFDF5',
    },
    columnTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    columnIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    columnBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    columnBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    columnCategoryName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.ink,
      marginTop: 10,
    },
    columnAmount: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.ink,
      marginTop: 2,
      letterSpacing: -0.3,
    },
    columnFooterText: {
      fontSize: 11,
      color: colors.inkMuted,
      marginTop: 6,
    },

    // Category Filter Tabs
    tabsWrap: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      gap: 4,
      marginBottom: 10,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 7,
      paddingHorizontal: 4,
      borderRadius: 10,
      gap: 4,
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    tabButtonText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.inkMuted,
    },
    tabButtonTextActive: {
      color: colors.white,
    },
    tabCountPill: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 8,
    },
    tabCountPillActive: {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    tabCountText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.inkMuted,
    },
    tabCountTextActive: {
      color: colors.white,
    },

    // Filter Bar & Search
    filterBar: {
      gap: 8,
      marginBottom: 8,
    },
    statusChipsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    statusChipActive: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : '#EFF6FF',
      borderColor: colors.primary,
    },
    statusChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.inkMuted,
    },
    statusChipTextActive: {
      color: colors.primary,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    searchInput: {
      flex: 1,
      fontSize: 12,
      color: colors.ink,
      paddingVertical: 2,
    },

    // Card Item
    cardItem: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardCatTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 20,
      borderWidth: 1,
    },
    cardCatTagText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    cardStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      borderWidth: 1,
    },
    cardStatusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    cardBody: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 10,
    },
    cardPeriod: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.ink,
    },
    cardDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    cardDateText: {
      fontSize: 11,
      color: colors.inkMuted,
    },
    cardDateDot: {
      fontSize: 11,
      color: colors.inkMuted,
      marginHorizontal: 6,
    },
    cardAmount: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.ink,
      letterSpacing: -0.2,
    },
    cardNotesBox: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderRadius: 8,
      padding: 8,
      marginTop: 8,
    },
    cardNotesText: {
      fontSize: 11,
      color: colors.inkMuted,
      fontStyle: 'italic',
    },
    reviewNoticeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.2)',
      borderRadius: 10,
      padding: 8,
      marginTop: 10,
    },
    reviewNoticeText: {
      fontSize: 11,
      color: '#2563EB',
      flex: 1,
      lineHeight: 15,
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      flexWrap: 'wrap',
    },
    viewProofBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    viewProofBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.ink,
    },
    downloadReceiptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: '#10B981',
    },
    downloadReceiptBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    uploadBtnSecondary: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    uploadBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    uploadBtnSecondaryText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.ink,
    },

    // Empty state
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.ink,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 12,
      color: colors.inkMuted,
      textAlign: 'center',
      marginTop: 4,
      maxWidth: 260,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    modalStripe: {
      height: 4,
      width: 48,
      borderRadius: 2,
      backgroundColor: colors.inkMuted,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 4,
      opacity: 0.4,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.ink,
    },
    modalSub: {
      fontSize: 11,
      color: colors.inkMuted,
      marginTop: 2,
    },
    modalCloseBtn: {
      padding: 6,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    formLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 6,
      marginTop: 10,
    },
    modalCategorySegment: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      borderRadius: 12,
      padding: 3,
      gap: 3,
    },
    modalCatBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9,
    },
    modalCatBtnActive: {
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    modalCatBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.inkMuted,
    },
    modalCatBtnTextActive: {
      color: colors.primary,
    },
    billPickerTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    billPickerTriggerText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.ink,
    },
    billPickerTriggerSub: {
      fontSize: 11,
      color: colors.inkMuted,
      marginTop: 2,
    },
    twoColumnRow: {
      flexDirection: 'row',
      gap: 10,
    },
    formInput: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: colors.ink,
    },
    attachHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    attachFormatsHint: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.inkMuted,
    },
    threePickerRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    threePickerBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    threePickerBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.ink,
    },
    attachedPreviewCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: colors.primary,
      marginTop: 6,
    },
    pdfPreviewBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    pdfIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 8,
      backgroundColor: '#FFE4E6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pdfIconBadgeText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#E11D48',
    },
    imagePreviewBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    previewThumbnail: {
      width: 38,
      height: 38,
      borderRadius: 8,
      backgroundColor: '#000',
    },
    attachedFileName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.ink,
    },
    attachedFileSize: {
      fontSize: 10,
      color: colors.inkMuted,
      marginTop: 2,
    },
    changeFileBtn: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    },
    changeFileBtnText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.ink,
    },
    removeAttachedBtn: {
      padding: 6,
    },
    modalSubmitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: 14,
      marginTop: 18,
    },
    modalSubmitBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.white,
    },

    // Picker Dialog
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    pickerDialog: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    pickerDialogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      marginBottom: 8,
    },
    pickerDialogTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.ink,
    },
    pickerItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    pickerItemRowActive: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(0,80,216,0.05)',
      borderRadius: 8,
    },
    pickerItemPeriod: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.ink,
    },
    pickerItemSub: {
      fontSize: 11,
      color: colors.inkMuted,
      marginTop: 2,
    },
    pickerItemAmount: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
      marginLeft: 8,
    },

    // Viewer
    viewerOverlay: {
      flex: 1,
      backgroundColor: '#000000',
    },
    viewerHeader: {
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      paddingHorizontal: 16,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    viewerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      flex: 1,
      marginRight: 10,
    },
    viewerCloseBtn: {
      padding: 6,
    },
    viewerImage: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
  });
