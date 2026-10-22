import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

/**
 * Modern AI Sparkle & Neural Emblem Icon for React Native.
 * Uses smooth mathematical bezier curves for a premium look similar to
 * modern generative AI interfaces (Gemini, Claude, Apple Intelligence).
 */
export function AIIcon({ size = 24, variant = 'gradient', style }) {
  const gradientId = 'ai-grad-cyan-violet';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#38BDF8" />
          <Stop offset="55%" stopColor="#818CF8" />
          <Stop offset="100%" stopColor="#C084FC" />
        </LinearGradient>
      </Defs>

      {/* Main 4-point aerodynamic star with organic bezier curves */}
      <Path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
        fill={variant === 'gradient' ? `url(#${gradientId})` : '#38BDF8'}
      />

      {/* Secondary sparkle at top-right */}
      <Circle cx="18.5" cy="5.5" r="1.5" fill="#38BDF8" opacity={0.9} />

      {/* Subtle tertiary sparkle at bottom-left */}
      <Circle cx="5.5" cy="18.5" r="1.2" fill="#C084FC" opacity={0.8} />
    </Svg>
  );
}

/**
 * High-tech AI Avatar with glowing status indicator for chat headers & bubbles
 */
export function AIAvatar({ size = 36, showOnline = true }) {
  return (
    <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size * 0.32 }]}>
      <AIIcon size={size * 0.58} variant="gradient" />
      {showOnline && <View style={styles.onlineDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
});

export default AIIcon;
