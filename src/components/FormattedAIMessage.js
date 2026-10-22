import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Parses inline markdown: **bold**, *italic*, `code`
 */
function renderInlineText(text, baseStyle, boldStyle, codeStyle) {
  if (!text) return null;

  // Split by bold (**bold**) and inline code (`code`)
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const m = match[0];
    if (m.startsWith('**') && m.endsWith('**')) {
      parts.push({
        type: 'bold',
        content: m.slice(2, -2),
      });
    } else if (m.startsWith('`') && m.endsWith('`')) {
      parts.push({
        type: 'code',
        content: m.slice(1, -1),
      });
    } else if (m.startsWith('*') && m.endsWith('*')) {
      parts.push({
        type: 'italic',
        content: m.slice(1, -1),
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return (
    <Text style={baseStyle}>
      {parts.map((p, idx) => {
        if (p.type === 'bold') {
          return (
            <Text key={idx} style={boldStyle}>
              {p.content}
            </Text>
          );
        }
        if (p.type === 'code') {
          return (
            <Text key={idx} style={codeStyle}>
              {p.content}
            </Text>
          );
        }
        if (p.type === 'italic') {
          return (
            <Text key={idx} style={{ fontStyle: 'italic' }}>
              {p.content}
            </Text>
          );
        }
        return <Text key={idx}>{p.content}</Text>;
      })}
    </Text>
  );
}

/**
 * Formats Markdown text into native React Native elements.
 * Handles headings, bullet lists, numbered lists, blockquotes, bold text.
 */
export default function FormattedAIMessage({ content, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!content) return null;

  const rawLines = String(content).split('\n');

  return (
    <View style={[styles.container, style]}>
      {rawLines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty lines create small vertical separation
        if (!trimmed) {
          return <View key={idx} style={styles.spacer} />;
        }

        // Heading 3 or 2
        if (trimmed.startsWith('### ')) {
          return (
            <Text key={idx} style={styles.h3}>
              {trimmed.replace(/^###\s+/, '')}
            </Text>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <Text key={idx} style={styles.h2}>
              {trimmed.replace(/^##\s+/, '')}
            </Text>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <Text key={idx} style={styles.h1}>
              {trimmed.replace(/^#\s+/, '')}
            </Text>
          );
        }

        // Bullet point: * or -
        if (/^[\*\-]\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^[\*\-]\s+/, '');
          return (
            <View key={idx} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <View style={styles.bulletContent}>
                {renderInlineText(
                  itemText,
                  styles.paragraph,
                  styles.boldText,
                  styles.codeInline
                )}
              </View>
            </View>
          );
        }

        // Numbered list: 1. or 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const itemText = numMatch[2];
          return (
            <View key={idx} style={styles.bulletRow}>
              <Text style={styles.numPrefix}>{num}.</Text>
              <View style={styles.bulletContent}>
                {renderInlineText(
                  itemText,
                  styles.paragraph,
                  styles.boldText,
                  styles.codeInline
                )}
              </View>
            </View>
          );
        }

        // Blockquote or Notice
        if (trimmed.startsWith('> ') || trimmed.startsWith('⚠️')) {
          const quoteText = trimmed.replace(/^>\s*/, '');
          return (
            <View key={idx} style={styles.quoteBox}>
              {renderInlineText(
                quoteText,
                styles.quoteText,
                styles.boldText,
                styles.codeInline
              )}
            </View>
          );
        }

        // Standard paragraph
        return (
          <View key={idx} style={styles.paragraphWrap}>
            {renderInlineText(
              trimmed,
              styles.paragraph,
              styles.boldText,
              styles.codeInline
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      gap: 3,
    },
    spacer: {
      height: 6,
    },
    paragraphWrap: {
      marginBottom: 3,
    },
    paragraph: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.gray800 || '#1e293b',
    },
    boldText: {
      fontWeight: '700',
      color: colors.gray900 || '#0f172a',
    },
    codeInline: {
      fontFamily: 'monospace',
      backgroundColor: colors.gray200 || '#e2e8f0',
      color: colors.primaryDark || '#0369a1',
      fontSize: 12,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    h1: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900 || '#0f172a',
      marginTop: 6,
      marginBottom: 4,
    },
    h2: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.gray900 || '#0f172a',
      marginTop: 5,
      marginBottom: 3,
    },
    h3: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.gray900 || '#0f172a',
      marginTop: 4,
      marginBottom: 2,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingLeft: 4,
      marginBottom: 4,
    },
    bulletDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.primary,
      marginTop: 8,
      marginRight: 8,
    },
    numPrefix: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      width: 20,
      marginTop: 1,
    },
    bulletContent: {
      flex: 1,
    },
    quoteBox: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      backgroundColor: colors.primaryLight ? `${colors.primaryLight}20` : '#f0f9ff',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      marginVertical: 4,
    },
    quoteText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.gray700 || '#334155',
      fontStyle: 'italic',
    },
  });
