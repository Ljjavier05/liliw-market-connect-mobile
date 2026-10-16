import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pickerAssetToUploadFile } from '../../utils/pickerFile';
import {
  getMyProducts,
  getMyVendorStatus,
  getCategories,
  createProduct,
  updateProduct,
  toggleProduct,
  deleteProduct,
} from '../../services/product.service';
import { getPermitCompliance } from '../../services/vendor.service';
import usePolling from '../../hooks/usePolling';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import { successHaptic, mediumHaptic, warningHaptic } from '../../utils/haptics';
import {
  ArchiveBoxIcon,
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  XMarkIcon,
} from '../../components/icons';
import { uploadUrl } from '../../utils/media';
import { useTheme } from '../../context/ThemeContext';

const MAX_PRODUCT_IMAGES = 5;

const PRICE_UNITS = [
  { value: 'PIECE', label: 'Piece' },
  { value: 'KILO', label: 'Kilo' },
  { value: 'GRAM', label: 'Gram' },
  { value: 'LITER', label: 'Liter' },
  { value: 'DOZEN', label: 'Dozen' },
];

const VARIABLE_UNIT_SLUGS = ['fresh-goods', 'food-essentials'];

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  stock: '',
  categoryId: '',
  priceUnit: 'PIECE',
};

function assetToFile(asset, index = 0) {
  return pickerAssetToUploadFile(asset, `product-${index + 1}`);
}

export default function VendorProductsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL | ACTIVE | HIDDEN | LOW
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  /** Existing server filenames when editing */
  const [existingImages, setExistingImages] = useState([]);
  /** Newly picked local files (replace existing on save if any) */
  const [localImages, setLocalImages] = useState([]);

  const approved = vendor?.status === 'APPROVED';
  const permitExpired = Boolean(compliance?.expired || compliance?.blocked);
  const canAddProducts = approved && !permitExpired;

  const fetchAll = useCallback(async () => {
    try {
      const [prods, v, c] = await Promise.all([
        getMyProducts(),
        getMyVendorStatus(),
        getPermitCompliance().catch(() => null),
      ]);
      setProducts(prods);
      setVendor(v);
      setCompliance(c);
    } catch {
      // keep last data on poll failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const cats = await getCategories();
      setCategories(
        (cats || []).map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        }))
      );
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  usePolling(fetchAll, 10000);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const allowsVariableUnit =
    selectedCategory && VARIABLE_UNIT_SLUGS.includes(selectedCategory.slug);

  const filtered = useMemo(() => {
    let list = products;
    if (filter === 'ACTIVE') list = list.filter((p) => p.isActive);
    if (filter === 'HIDDEN') list = list.filter((p) => !p.isActive);
    if (filter === 'LOW') list = list.filter((p) => p.isActive && p.stock <= 5);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, filter, search]);

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.isActive).length,
      low: products.filter((p) => p.isActive && p.stock <= 5).length,
    }),
    [products]
  );

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const selectCategory = (cat) => {
    const allowVar = VARIABLE_UNIT_SLUGS.includes(cat.slug);
    setForm((f) => ({
      ...f,
      categoryId: cat.id,
      priceUnit: allowVar ? f.priceUnit : 'PIECE',
    }));
    setErrors((e) => ({ ...e, categoryId: '' }));
  };

  const openCreate = () => {
    if (!approved) {
      Alert.alert(
        'Not available yet',
        'You can manage products only after your vendor application is approved.'
      );
      return;
    }
    if (permitExpired) {
      Alert.alert(
        'Business Permit expired',
        compliance?.banner?.message ||
          'Your Business Permit has expired. Please submit your renewed permit for approval before adding products.'
      );
      return;
    }
    setEditing(null);
    setForm(EMPTY_FORM);
    setExistingImages([]);
    setLocalImages([]);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (product) => {
    if (!approved) {
      Alert.alert('Locked', 'Store must be approved to edit products.');
      return;
    }
    setEditing(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      stock: String(product.stock ?? ''),
      categoryId: product.categoryId || product.category?.id || '',
      priceUnit: product.priceUnit || 'PIECE',
    });
    setExistingImages(Array.isArray(product.images) ? product.images.filter(Boolean) : []);
    setLocalImages([]);
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setExistingImages([]);
    setLocalImages([]);
    setErrors({});
  };

  const remainingSlots =
    localImages.length > 0
      ? Math.max(0, MAX_PRODUCT_IMAGES - localImages.length)
      : MAX_PRODUCT_IMAGES;

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add product photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, remainingSlots || MAX_PRODUCT_IMAGES),
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.length) return;
    const picked = result.assets
      .slice(0, MAX_PRODUCT_IMAGES)
      .map((asset, i) => assetToFile(asset, i))
      .filter(Boolean);
    setLocalImages(picked);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a product photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = assetToFile(result.assets[0], 0);
    if (!file) return;
    setLocalImages((prev) => {
      const next = [...prev, assetToFile(result.assets[0], prev.length)].filter(Boolean);
      return next.slice(0, MAX_PRODUCT_IMAGES);
    });
  };

  const openPhotoPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose from Gallery', 'Take Photo', 'Clear new photos'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (index) => {
          if (index === 1) pickFromLibrary();
          if (index === 2) pickFromCamera();
          if (index === 3) setLocalImages([]);
        }
      );
      return;
    }
    Alert.alert('Product photos', 'Choose a source', [
      { text: 'Gallery', onPress: pickFromLibrary },
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Clear new photos', style: 'destructive', onPress: () => setLocalImages([]) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeLocalImage = (index) => {
    setLocalImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.price || Number.isNaN(Number(form.price))) e.price = 'Enter a valid price';
    if (form.stock === '' || Number.isNaN(Number(form.stock))) e.stock = 'Enter stock';
    if (!form.categoryId) e.categoryId = 'Select a category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price,
        stock: form.stock,
        categoryId: form.categoryId,
        priceUnit: allowsVariableUnit ? form.priceUnit : 'PIECE',
      };
      if (editing) {
        await updateProduct(
          editing.id,
          payload,
          localImages.length > 0 ? localImages : undefined
        );
      } else {
        await createProduct(payload, localImages);
      }
      closeForm();
      fetchAll();
      successHaptic();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (product) => {
    try {
      await toggleProduct(product.id, product.isActive);
      mediumHaptic();
      fetchAll();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update product');
    }
  };

  const handleDelete = (product) => {
    warningHaptic();
    Alert.alert('Hide product', `Remove "${product.name}" from your active listings?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(product.id);
            successHaptic();
            fetchAll();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const thumb = uploadUrl(item.images?.[0], item.updatedAt);
    const isLow = item.stock <= 5;
    const isOut = item.stock === 0;

    return (
      <Card style={styles.productCard}>
        <TouchableOpacity
          style={styles.productRow}
          activeOpacity={0.85}
          onPress={() => setViewingProduct(item)}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={styles.productAvatar}>
              <PhotoIcon size={24} color={colors.primary} />
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.productCategory}>{item.category?.name || 'Uncategorized'}</Text>
            <Text style={styles.productPrice}>
              ₱{Number(item.price).toFixed(2)} / {(item.priceUnit || 'PIECE').toLowerCase()}
            </Text>
            <View style={styles.stockStatusRow}>
              <View
                style={[
                  styles.stockDot,
                  { backgroundColor: isOut ? colors.danger : isLow ? colors.warning : colors.success },
                ]}
              />
              <Text
                style={[
                  styles.productStock,
                  isOut && { color: colors.danger, fontWeight: '700' },
                  isLow && !isOut && styles.lowStock,
                ]}
              >
                {isOut ? 'Out of stock' : isLow ? `${item.stock} left (Low)` : `${item.stock} available`}
              </Text>
            </View>
          </View>

          <View style={styles.productActions}>
            <View
              style={[
                styles.activeBadge,
                { backgroundColor: item.isActive ? colors.successLight : colors.gray100 },
              ]}
            >
              <Text
                style={[
                  styles.activeBadgeText,
                  { color: item.isActive ? colors.success : colors.gray500 },
                ]}
              >
                {item.isActive ? 'Active' : 'Hidden'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setViewingProduct(item)}
          >
            <EyeIcon size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEdit(item)}
          >
            <PencilSquareIcon size={16} color={colors.gray700} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggle(item)}>
            {item.isActive ? (
              <EyeSlashIcon size={16} color={colors.gray700} />
            ) : (
              <EyeIcon size={16} color={colors.gray700} />
            )}
            <Text style={[styles.actionBtnText, { color: colors.gray700 }]}>
              {item.isActive ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <TrashIcon size={16} color={colors.danger} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (loading) return <LoadingScreen message="Loading products..." />;

  return (
    <View style={styles.container}>
      {!approved ? (
        <View style={styles.lockBanner}>
          <LockClosedIcon size={18} color={colors.warning} />
          <Text style={styles.lockText}>
            {vendor
              ? `Store status: ${vendor.status}. Product management unlocks after admin approval.`
              : 'Submit a vendor application in Profile before adding products.'}
          </Text>
        </View>
      ) : null}

      {permitExpired ? (
        <View style={[styles.lockBanner, { backgroundColor: colors.dangerLight || '#FEE2E2' }]}>
          <LockClosedIcon size={18} color={colors.danger} />
          <Text style={[styles.lockText, { color: colors.danger }]}>
            {compliance?.banner?.message ||
              'Your Business Permit has expired. Existing products remain visible — renew your permit to add new ones.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <MagnifyingGlassIcon size={16} color={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products"
            placeholderTextColor={colors.gray400}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, !canAddProducts && styles.addBtnDisabled]}
          onPress={openCreate}
        >
          <PlusIcon size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statText}>{stats.total} total</Text>
        <Text style={styles.statDot}>·</Text>
        <Text style={styles.statText}>{stats.active} active</Text>
        <Text style={styles.statDot}>·</Text>
        <Text style={[styles.statText, stats.low > 0 && { color: colors.danger }]}>
          {stats.low} low stock
        </Text>
      </View>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}
        >
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'HIDDEN', label: 'Hidden' },
            { id: 'LOW', label: 'Low stock' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.filterText, filter === f.id && styles.filterTextActive]}
                numberOfLines={1}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={ArchiveBoxIcon}
            title={search || filter !== 'ALL' ? 'No matching products' : 'No products yet'}
            subtitle={
              approved
                ? 'Tap + to add your first product.'
                : 'Get approved first, then add products here.'
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Product' : 'New Product'}</Text>
            <TouchableOpacity onPress={closeForm} hitSlop={12}>
              <XMarkIcon size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Product Name *"
              placeholder="e.g. Talong, Bangus"
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              error={errors.name}
            />

            <Text style={styles.fieldLabel}>Photos (optional, max {MAX_PRODUCT_IMAGES})</Text>
            <View style={styles.photoSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {localImages.length > 0
                  ? localImages.map((img, index) => (
                      <View key={`local-${img.uri}-${index}`} style={styles.photoWrap}>
                        <Image source={{ uri: img.uri }} style={styles.photoThumb} />
                        <TouchableOpacity
                          style={styles.photoRemove}
                          onPress={() => removeLocalImage(index)}
                          hitSlop={8}
                        >
                          <XCircleIcon size={22} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))
                  : existingImages.map((filename) => (
                      <View key={`remote-${filename}`} style={styles.photoWrap}>
                        <Image
                          source={{ uri: uploadUrl(filename, editing?.updatedAt) }}
                          style={styles.photoThumb}
                        />
                      </View>
                    ))}

                {(localImages.length === 0 || remainingSlots > 0) && (
                  <TouchableOpacity style={styles.photoAdd} onPress={openPhotoPicker}>
                    <CameraIcon size={24} color={colors.primary} />
                    <Text style={styles.photoAddText}>
                      {localImages.length || existingImages.length ? 'Add' : 'Camera'}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              {editing && existingImages.length > 0 && localImages.length > 0 ? (
                <Text style={styles.photoHint}>
                  New photos will replace the current ones when you save.
                </Text>
              ) : (
                <Text style={styles.photoHint}>
                  Take a photo at your stall or pick from gallery.
                </Text>
              )}
            </View>

            <Text style={styles.fieldLabel}>Category *</Text>
            {categoriesLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => selectCategory(c)}
                    style={[styles.chip, form.categoryId === c.id && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, form.categoryId === c.id && styles.chipTextActive]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {errors.categoryId ? <Text style={styles.errorText}>{errors.categoryId}</Text> : null}

            <View style={styles.priceRow}>
              <View style={styles.priceInput}>
                <Input
                  label="Price (₱) *"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={form.price}
                  onChangeText={(v) => setField('price', v)}
                  error={errors.price}
                />
              </View>
              {allowsVariableUnit ? (
                <View style={styles.unitInput}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <View style={styles.unitWrap}>
                    {PRICE_UNITS.map((u) => (
                      <TouchableOpacity
                        key={u.value}
                        onPress={() => setField('priceUnit', u.value)}
                        style={[
                          styles.unitChip,
                          form.priceUnit === u.value && styles.unitChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitChipText,
                            form.priceUnit === u.value && styles.unitChipTextActive,
                          ]}
                        >
                          {u.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            {form.price ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>
                  Preview: ₱{Number(form.price || 0).toFixed(2)} per{' '}
                  {(allowsVariableUnit ? form.priceUnit : 'PIECE').toLowerCase()}
                </Text>
              </View>
            ) : null}

            <Input
              label="Stock *"
              placeholder="0"
              keyboardType="number-pad"
              value={form.stock}
              onChangeText={(v) => setField('stock', v)}
              error={errors.stock}
            />

            <Input
              label="Description (optional)"
              placeholder="Tell customers about this product"
              value={form.description}
              onChangeText={(v) => setField('description', v)}
              multiline
              numberOfLines={3}
              style={styles.textarea}
            />

            <Button
              title={editing ? 'Save Changes' : 'Add Product'}
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Product Details Modal (View Only, Management Catalog, No Cart) */}
      <Modal visible={Boolean(viewingProduct)} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Product Details</Text>
            <TouchableOpacity onPress={() => setViewingProduct(null)} hitSlop={12}>
              <XMarkIcon size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {viewingProduct && (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Product Hero Image */}
              <View style={styles.detailImageWrap}>
                {viewingProduct.images?.[0] ? (
                  <Image
                    source={{ uri: uploadUrl(viewingProduct.images[0], viewingProduct.updatedAt) }}
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.detailPlaceholder}>
                    <PhotoIcon size={48} color={colors.primary} />
                    <Text style={styles.detailPlaceholderText}>No image uploaded</Text>
                  </View>
                )}
              </View>

              {/* Status and Category Badges */}
              <View style={styles.detailBadgesRow}>
                <View style={styles.detailCategoryBadge}>
                  <Text style={styles.detailCategoryText}>
                    {viewingProduct.category?.name || 'General Product'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.activeBadge,
                    { backgroundColor: viewingProduct.isActive ? colors.successLight : colors.gray100 },
                  ]}
                >
                  <Text
                    style={[
                      styles.activeBadgeText,
                      { color: viewingProduct.isActive ? colors.success : colors.gray500 },
                    ]}
                  >
                    {viewingProduct.isActive ? 'Active Listing' : 'Hidden from Market'}
                  </Text>
                </View>
              </View>

              {/* Title & Price */}
              <Text style={styles.detailTitle}>{viewingProduct.name}</Text>
              <Text style={styles.detailPrice}>
                ₱{Number(viewingProduct.price).toFixed(2)}
                <Text style={styles.detailPriceUnit}>
                  {' '}
                  / {(viewingProduct.priceUnit || 'PIECE').toLowerCase()}
                </Text>
              </Text>

              {/* Stock Inventory Card */}
              <View style={styles.detailStockCard}>
                <Text style={styles.detailStockLabel}>Available Inventory:</Text>
                <View style={styles.detailStockValRow}>
                  <View
                    style={[
                      styles.stockDot,
                      {
                        backgroundColor:
                          viewingProduct.stock === 0
                            ? colors.danger
                            : viewingProduct.stock <= 5
                            ? colors.warning
                            : colors.success,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.detailStockValue,
                      viewingProduct.stock === 0 && { color: colors.danger },
                      viewingProduct.stock <= 5 && viewingProduct.stock > 0 && { color: colors.warningDeep },
                    ]}
                  >
                    {viewingProduct.stock === 0
                      ? 'Out of stock (0 available)'
                      : `${viewingProduct.stock} ${(viewingProduct.priceUnit || 'units').toLowerCase()} available in stall`}
                  </Text>
                </View>
              </View>

              {/* Description Section */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Product Description</Text>
                <Text style={styles.detailDescription}>
                  {viewingProduct.description?.trim() || 'No description provided by vendor.'}
                </Text>
              </View>

              {/* Public Market Catalog Notice */}
              <View style={styles.managementNotice}>
                <Text style={styles.managementNoticeText}>
                  ℹ️ Liliw Market Connect Management System. Product catalog is strictly for price monitoring, stock auditing, and local market regulation.
                </Text>
              </View>

              {/* Modal Actions */}
              <View style={styles.detailActionRow}>
                <Button
                  title="Edit Product Details"
                  onPress={() => {
                    const p = viewingProduct;
                    setViewingProduct(null);
                    openEdit(p);
                  }}
                  style={styles.detailEditBtn}
                />
                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setViewingProduct(null)}
                >
                  <Text style={styles.detailCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBg },

    lockBanner: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      backgroundColor: colors.warningLight,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
    },
    lockText: { flex: 1, fontSize: 12, color: colors.warning, fontWeight: '600', lineHeight: 17 },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    searchWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.gray200,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.gray900,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnDisabled: { opacity: 0.45 },

    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 10,
      gap: 6,
    },
    statText: { fontSize: 12, color: colors.gray500, fontWeight: '600' },
    statDot: { color: colors.gray300 },

    filtersWrap: {
      height: 52,
      justifyContent: 'center',
    },
    filtersScroll: {
      flexGrow: 0,
    },
    filters: {
      paddingHorizontal: 16,
      alignItems: 'center',
      flexDirection: 'row',
    },
    filterChip: {
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.gray300,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.gray800,
      lineHeight: 18,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    filterTextActive: { color: colors.white },

    list: { padding: 16, gap: 10, paddingBottom: 40, flexGrow: 1 },

    productCard: { padding: 12 },
    productRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.gray100 },
    productAvatar: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    productAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
    productInfo: { flex: 1 },
    productName: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
    productCategory: { fontSize: 12, color: colors.gray400, marginTop: 1 },
    productPrice: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 4 },
    productStock: { fontSize: 12, color: colors.gray400, marginTop: 2 },
    lowStock: { color: colors.danger, fontWeight: '700' },
    productActions: { alignItems: 'flex-end' },
    activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    activeBadgeText: { fontSize: 11, fontWeight: '700' },

    photoSection: { marginBottom: 16 },
    photoWrap: { marginRight: 10, position: 'relative' },
    photoThumb: {
      width: 84,
      height: 84,
      borderRadius: 12,
      backgroundColor: colors.gray100,
    },
    photoRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    photoAdd: {
      width: 84,
      height: 84,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      gap: 4,
    },
    photoAddText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    photoHint: { fontSize: 12, color: colors.gray400, marginTop: 8, lineHeight: 16 },

    actionRow: {
      flexDirection: 'row',
      marginTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.gray100,
      paddingTop: 8,
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.gray50,
    },
    actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },

    modal: { flex: 1, backgroundColor: colors.surface },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingTop: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray100,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
    modalBody: { padding: 20 },

    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 8 },
    loadingWrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    loadingText: { marginLeft: 8, fontSize: 13, color: colors.gray500 },
    chipScroll: { marginBottom: 6 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.gray100,
      marginRight: 8,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.gray500 },
    chipTextActive: { color: colors.white },
    errorText: { fontSize: 12, color: colors.danger, marginBottom: 14 },

    priceRow: { flexDirection: 'row', gap: 10 },
    priceInput: { flex: 1 },
    unitInput: { width: 110 },
    unitWrap: { gap: 4 },
    unitChip: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.gray100,
    },
    unitChipActive: { backgroundColor: colors.primary },
    unitChipText: { fontSize: 11, fontWeight: '700', color: colors.gray500, textAlign: 'center' },
    unitChipTextActive: { color: colors.white },

    previewBox: {
      backgroundColor: colors.primaryLight,
      borderRadius: 8,
      padding: 10,
      marginBottom: 14,
    },
    previewText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    textarea: { minHeight: 80, textAlignVertical: 'top' },
    saveBtn: { marginTop: 12, marginBottom: 40 },

    stockStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    stockDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    detailImageWrap: {
      width: '100%',
      height: 220,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.gray100,
      marginBottom: 16,
    },
    detailImage: {
      width: '100%',
      height: '100%',
    },
    detailPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      gap: 8,
    },
    detailPlaceholderText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    detailBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    detailCategoryBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: `${colors.primary}15`,
    },
    detailCategoryText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    detailTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.ink,
      marginBottom: 4,
    },
    detailPrice: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.primary,
      marginBottom: 14,
    },
    detailPriceUnit: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.inkMuted,
    },
    detailStockCard: {
      backgroundColor: colors.gray50 || colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.borderBrand,
      marginBottom: 16,
    },
    detailStockLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: colors.inkMuted,
      marginBottom: 4,
    },
    detailStockValRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailStockValue: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.success,
    },
    detailSection: {
      marginBottom: 16,
    },
    detailSectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 6,
    },
    detailDescription: {
      fontSize: 13,
      color: colors.inkMuted,
      lineHeight: 20,
    },
    managementNotice: {
      backgroundColor: colors.primaryLight,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: `${colors.primary}25`,
      marginBottom: 20,
    },
    managementNoticeText: {
      fontSize: 11,
      color: colors.primaryDark || colors.primary,
      lineHeight: 16,
    },
    detailActionRow: {
      gap: 10,
      marginBottom: 36,
    },
    detailEditBtn: {
      width: '100%',
    },
    detailCloseBtn: {
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: colors.gray100,
    },
    detailCloseText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.ink,
    },
  });
