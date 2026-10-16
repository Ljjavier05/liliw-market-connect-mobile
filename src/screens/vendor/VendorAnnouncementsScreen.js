import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAnnouncements } from '../../services/announcement.service';
import { SERVER_ORIGIN } from '../../config/env';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/Card';
import LoadingScreen from '../../components/LoadingScreen';
import EmptyState from '../../components/EmptyState';
import {
  MegaphoneIcon,
  SparklesIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  DocumentIcon,
  XMarkIcon,
  ClockIcon,
} from '../../components/icons';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildMediaUri(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SERVER_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function VendorAnnouncementsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [loadAnnouncements])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  const handleOpenLink = async (url) => {
    try {
      const formatted = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      const supported = await Linking.canOpenURL(formatted);
      if (supported) {
        await Linking.openURL(formatted);
      } else {
        Alert.alert('Unable to open link', formatted);
      }
    } catch {
      Alert.alert('Error', 'Could not launch URL');
    }
  };

  if (loading) return <LoadingScreen message="Loading announcements..." />;

  const renderItem = ({ item }) => {
    const isPinned = Boolean(item.isPinned);
    const imageUri = buildMediaUri(item.imageUrl);
    const fileUri = buildMediaUri(item.fileUrl);

    return (
      <Card style={[styles.card, isPinned && styles.pinnedCard]}>
        {/* Top Header / Meta */}
        <View style={styles.cardHeader}>
          <View style={styles.authorBadgeRow}>
            <View style={styles.iconCircle}>
              <MegaphoneIcon size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.authorText}>
                {item.author?.name || 'Municipal Administration'}
              </Text>
              <View style={styles.dateRow}>
                <ClockIcon size={12} color={colors.inkMuted} />
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>
          </View>

          {isPinned && (
            <View style={styles.pinnedBadge}>
              <SparklesIcon size={12} color={colors.accent || '#f59e0b'} />
              <Text style={styles.pinnedText}>PINNED</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{item.title}</Text>

        {/* Body Text */}
        <Text style={styles.body}>{item.body}</Text>

        {/* Attached Image Preview */}
        {imageUri && (
          <TouchableOpacity
            style={styles.imageContainer}
            activeOpacity={0.9}
            onPress={() => setActiveImage(imageUri)}
          >
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            <View style={styles.imageZoomHint}>
              <Text style={styles.imageZoomText}>Tap to enlarge</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Attached External Link */}
        {item.linkUrl && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => handleOpenLink(item.linkUrl)}
            activeOpacity={0.8}
          >
            <LinkIcon size={16} color={colors.primary} />
            <Text style={styles.linkButtonText} numberOfLines={1}>
              {item.linkText || item.linkUrl}
            </Text>
            <ArrowTopRightOnSquareIcon size={14} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Attached File/Document */}
        {fileUri && (
          <TouchableOpacity
            style={styles.fileContainer}
            onPress={() => handleOpenLink(fileUri)}
            activeOpacity={0.8}
          >
            <View style={styles.fileIconWrap}>
              <DocumentIcon size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={1}>
                {item.fileName || 'Attached Document'}
              </Text>
              {item.fileSize ? (
                <Text style={styles.fileSize}>{formatFileSize(item.fileSize)}</Text>
              ) : null}
            </View>
            <Text style={styles.fileDownloadText}>View</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={MegaphoneIcon}
            title="No announcements yet"
            description="Official announcements and notices from the Municipal Administrator and Market Office will appear here."
          />
        }
      />

      {/* Fullscreen Image Preview Modal */}
      <Modal visible={Boolean(activeImage)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setActiveImage(null)}>
            <XMarkIcon size={26} color="#ffffff" />
          </TouchableOpacity>
          {activeImage && (
            <Image
              source={{ uri: activeImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.pageBg,
    },
    listContent: {
      padding: 16,
      paddingBottom: 32,
    },
    card: {
      marginBottom: 16,
      borderRadius: 18,
      padding: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    pinnedCard: {
      borderColor: colors.accent || '#f59e0b',
      borderWidth: 1.5,
      backgroundColor: colors.surface,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    authorBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    authorText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.ink,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    dateText: {
      fontSize: 11,
      color: colors.inkMuted,
    },
    pinnedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: `${colors.accent || '#f59e0b'}20`,
      borderWidth: 1,
      borderColor: `${colors.accent || '#f59e0b'}50`,
    },
    pinnedText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.accent || '#f59e0b',
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.ink,
      marginBottom: 8,
      lineHeight: 22,
    },
    body: {
      fontSize: 13,
      color: colors.inkMuted,
      lineHeight: 20,
      marginBottom: 12,
    },
    imageContainer: {
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 12,
      backgroundColor: colors.gray100,
      position: 'relative',
    },
    previewImage: {
      width: '100%',
      height: 200,
    },
    imageZoomHint: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    imageZoomText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '600',
    },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: `${colors.primary}12`,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: `${colors.primary}25`,
    },
    linkButtonText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    fileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.gray50 || colors.surface,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    fileIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: `${colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.ink,
    },
    fileSize: {
      fontSize: 10,
      color: colors.inkMuted,
      marginTop: 2,
    },
    fileDownloadText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      paddingHorizontal: 6,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseBtn: {
      position: 'absolute',
      top: 50,
      right: 20,
      padding: 8,
      zIndex: 10,
    },
    modalImage: {
      width: '94%',
      height: '80%',
    },
  });
