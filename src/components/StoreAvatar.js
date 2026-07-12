import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { uploadUrl } from '../utils/media';
import { colors } from '../theme/colors';

/**
 * Shows store logo when reachable; falls back to initials on error.
 */
export default function StoreAvatar({
  logo,
  name = 'S',
  size = 48,
  radius = 14,
  cacheKey,
  style,
}) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const bust = cacheKey || logo || '';
  const uri = uploadUrl(logo, bust ? `${bust}-${retry}` : retry);

  useEffect(() => {
    setFailed(false);
  }, [logo, cacheKey]);

  const initial = (name || 'S').charAt(0).toUpperCase();
  const box = {
    width: size,
    height: size,
    borderRadius: radius,
  };

  if (!logo || !uri || failed) {
    return (
      <View style={[styles.fallback, box, style]}>
        <Text style={[styles.fallbackText, { fontSize: Math.max(14, size * 0.38) }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <Image
      key={`${uri}-${retry}`}
      source={{ uri }}
      style={[styles.image, box, style]}
      resizeMode="cover"
      onError={() => {
        // One automatic retry (helps after Wi‑Fi / IP hiccups)
        if (retry < 1) {
          setRetry((n) => n + 1);
          return;
        }
        setFailed(true);
      }}
      onLoad={() => setFailed(false)}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.gray100,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  fallback: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  fallbackText: {
    fontWeight: '800',
    color: colors.primary,
  },
});
