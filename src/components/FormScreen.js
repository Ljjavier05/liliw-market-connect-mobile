import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

/**
 * Keyboard-safe scroll wrapper for auth/forms.
 * Android: relies on app.json softwareKeyboardLayoutMode + persist taps.
 */
export default function FormScreen({
  children,
  backgroundColor,
  contentContainerStyle,
  style,
}) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, contentContainerStyle]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  inner: { flexGrow: 1 },
});
