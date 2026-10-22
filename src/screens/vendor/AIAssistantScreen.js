import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { sendAIChatMessage } from '../../services/ai.service';
import FormattedAIMessage from '../../components/FormattedAIMessage';
import { AIIcon, AIAvatar } from '../../components/AIIcon';
import {
  PaperAirplaneIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '../../components/icons';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';

const INITIAL_MESSAGES_TL = [
  {
    id: 'init-1',
    role: 'assistant',
    content:
      "Maligayang pagdating, **Liliw Market Vendor**!\n\nAko ang inyong **AI Assistant** para sa Pamilihang Bayan ng Liliw. Nandito ako upang tulungan kayo sa mga sumusunod:\n* Pagsusuri at pamamahala ng inyong puwesto (stall) at mga paninda\n* Gabay sa pagbabayad ng stall rent at utility bills\n* Pag-renew at pagsusumite ng mga kinakailangang business permits\n* Alituntunin sa kalinisan, tamang pagtatapon ng basura, at mga patakaran sa palengke\n\nMay maitutulong ba ako sa inyong tindahan o puwesto ngayon?",
    at: new Date().toISOString(),
  },
];

const INITIAL_MESSAGES_EN = [
  {
    id: 'init-1',
    role: 'assistant',
    content:
      "Welcome, **Liliw Market Vendor**!\n\nI am your **AI Assistant** for the Liliw Public Market. I am here to assist you with:\n* Managing your stall and product listings\n* Guidance on paying stall rent and utility bills\n* Submitting and renewing required business permits\n* Guidelines on cleanliness, proper waste disposal, and market regulations\n\nHow can I help your store or stall today?",
    at: new Date().toISOString(),
  },
];

const SUGGESTIONS_TL = [
  'Ano ang mga alituntunin sa pamilihang bayan?',
  'Paano ang tamang pagbabayad ng stall rent?',
  'Paano mag-renew ng business permit?',
  'Ano ang mga regulasyon sa kalinisan at basura?',
  'Saan matatagpuan ang market office?',
  'Paano magdagdag o mag-update ng produkto?',
];

const SUGGESTIONS_EN = [
  'What are the market guidelines and rules?',
  'How do I pay my stall rent?',
  'How do I renew my business permit?',
  'What are the sanitation and waste regulations?',
  'Where is the market office located?',
  'How do I add or update products?',
];

export default function AIAssistantScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();

  const [lang, setLang] = useState('tl'); // 'tl' | 'en'
  const isTagalog = lang === 'tl';

  const [messages, setMessages] = useState(
    isTagalog ? INITIAL_MESSAGES_TL : INITIAL_MESSAGES_EN
  );
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);

  const activeSuggestions = isTagalog ? SUGGESTIONS_TL : SUGGESTIONS_EN;

  // Toggle language
  const handleToggleLanguage = useCallback(() => {
    lightHaptic();
    const nextLang = lang === 'tl' ? 'en' : 'tl';
    setLang(nextLang);
    // If only initial message is present, switch to translated initial greeting
    setMessages((prev) => {
      if (prev.length <= 1) {
        return nextLang === 'tl' ? INITIAL_MESSAGES_TL : INITIAL_MESSAGES_EN;
      }
      return prev;
    });
  }, [lang]);

  // Clear conversation
  const handleClearChat = useCallback(() => {
    Alert.alert(
      isTagalog ? 'I-reset ang Usapan' : 'Reset Conversation',
      isTagalog
        ? 'Nais mo bang burahin ang kasalukuyang chat history?'
        : 'Do you want to clear the current chat history?',
      [
        { text: isTagalog ? 'Kanselahin' : 'Cancel', style: 'cancel' },
        {
          text: isTagalog ? 'I-reset' : 'Reset',
          style: 'destructive',
          onPress: () => {
            lightHaptic();
            setMessages(isTagalog ? INITIAL_MESSAGES_TL : INITIAL_MESSAGES_EN);
          },
        },
      ]
    );
  }, [isTagalog]);

  // Auto scroll to bottom
  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 120);
  }, []);

  // Listen to keyboard show/hide to automatically lift input bar and scroll to bottom
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      scrollToBottom(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  const handleSend = useCallback(
    async (textToSend) => {
      const q = (textToSend || inputText).trim();
      if (!q || loading) return;

      lightHaptic();
      const userMsgId = `user-${Date.now()}`;
      const userMsg = {
        id: userMsgId,
        role: 'user',
        content: q,
        at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setLoading(true);
      scrollToBottom();

      try {
        const res = await sendAIChatMessage(q, lang);
        const replyText =
          res?.reply ||
          (isTagalog
            ? 'Walang natanggap na tugon mula sa AI. Pakisubukang muli.'
            : 'No response received from the AI. Please try again.');

        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        mediumHaptic();
      } catch (err) {
        console.warn('[AIAssistantScreen] Error sending message:', err);
        const errMsg =
          err?.response?.data?.message ||
          (isTagalog
            ? 'Paumanhin, nagkaroon ng aberya sa pakikipag-ugnayan sa AI assistant. Pakisubukang muli mamaya.'
            : 'Sorry, unable to connect to AI Assistant. Please check your connection and try again.');

        const aiErrMsg = {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **${isTagalog ? 'Paunawa:' : 'Notice:'}** ${errMsg}`,
          at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiErrMsg]);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [inputText, loading, lang, isTagalog, scrollToBottom]
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      {/* Top AI Status Sub-header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <AIAvatar size={34} showOnline={true} />
          <View style={styles.topBarInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.botName}>Liliw Market AI</Text>
              <View style={styles.onlinePill}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
            <Text style={styles.botSub}>Automated Public Market Assistant</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          {/* Language Toggle Pill */}
          <TouchableOpacity
            style={styles.langBtn}
            onPress={handleToggleLanguage}
            activeOpacity={0.75}
            accessibilityLabel="Switch language"
          >
            <Text style={styles.langText}>{lang.toUpperCase()}</Text>
          </TouchableOpacity>

          {/* Reset / Clear Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleClearChat}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityLabel="Clear chat"
          >
            <ArrowPathIcon size={18} color={colors.gray500} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scrollToBottom(false)}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAi,
              ]}
            >
              {!isUser && (
                <View style={styles.aiAvatarMini}>
                  <AIIcon size={18} variant="gradient" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                {isUser ? (
                  <Text style={styles.userBubbleText}>{item.content}</Text>
                ) : (
                  <FormattedAIMessage content={item.content} />
                )}

                <Text
                  style={[
                    styles.timeText,
                    isUser ? styles.timeTextUser : styles.timeTextAi,
                  ]}
                >
                  {item.at
                    ? new Date(item.at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingRow}>
              <View style={styles.aiAvatarMini}>
                <AIIcon size={18} variant="gradient" />
              </View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>
                  {isTagalog
                    ? 'Nag-iisip ang AI Assistant...'
                    : 'AI Assistant is thinking...'}
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Suggested Questions Carousel / Chips (visible when keyboard is hidden) */}
      {!isKeyboardVisible ? (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionsHeader}>
            <SparklesIcon size={13} color={colors.primary} />
            <Text style={styles.suggestionsTitle}>
              {isTagalog ? 'Mga Karaniwang Tanong:' : 'Suggested Questions:'}
            </Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={activeSuggestions}
            keyExtractor={(item, idx) => `sug-${idx}`}
            contentContainerStyle={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => handleSend(item)}
                activeOpacity={0.75}
                disabled={loading}
              >
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholder={
            isTagalog
              ? 'Magtanong ukol sa puwesto, upa, o patakaran...'
              : 'Ask about stall rent, permits, regulations...'
          }
          placeholderTextColor={colors.gray400}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={600}
          editable={!loading}
          returnKeyType="default"
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            inputText.trim() && !loading
              ? styles.sendBtnActive
              : styles.sendBtnDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.8}
          accessibilityLabel="Send message"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <PaperAirplaneIcon
              size={18}
              color="#ffffff"
              style={{ transform: [{ rotate: '-45deg' }], marginLeft: -2 }}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.pageBg || '#f8fafc',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface || '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: colors.gray200 || '#e2e8f0',
    },
    topBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    topBarInfo: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    botName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.gray900 || '#0f172a',
    },
    onlinePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#ecfdf5',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: '#a7f3d0',
    },
    onlineDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#10b981',
    },
    onlineText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#059669',
    },
    botSub: {
      fontSize: 11,
      color: colors.gray500 || '#64748b',
      marginTop: 1,
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    langBtn: {
      backgroundColor: colors.primaryLight ? `${colors.primaryLight}35` : '#e0f2fe',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary || '#0284c7',
    },
    langText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary || '#0284c7',
    },
    actionBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.gray100 || '#f1f5f9',
    },
    flatList: {
      flex: 1,
    },
    messageList: {
      padding: 16,
      gap: 12,
      paddingBottom: 16,
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    messageRowAi: {
      justifyContent: 'flex-start',
    },
    aiAvatarMini: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: '#0f172a',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    bubble: {
      maxWidth: '82%',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleUser: {
      backgroundColor: colors.primary || '#0284c7',
      borderBottomRightRadius: 4,
      shadowColor: colors.primary || '#0284c7',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
    },
    bubbleAi: {
      backgroundColor: colors.surface || '#ffffff',
      borderTopLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.gray200 || '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    userBubbleText: {
      fontSize: 14,
      lineHeight: 20,
      color: '#ffffff',
      fontWeight: '500',
    },
    timeText: {
      fontSize: 10,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    timeTextUser: {
      color: 'rgba(255, 255, 255, 0.75)',
    },
    timeTextAi: {
      color: colors.gray400 || '#94a3b8',
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    loadingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface || '#ffffff',
      borderWidth: 1,
      borderColor: colors.gray200 || '#e2e8f0',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderTopLeftRadius: 4,
    },
    loadingText: {
      fontSize: 12,
      color: colors.gray500 || '#64748b',
      fontStyle: 'italic',
    },
    suggestionsContainer: {
      paddingVertical: 6,
      backgroundColor: colors.surface || '#ffffff',
      borderTopWidth: 1,
      borderTopColor: colors.gray200 || '#e2e8f0',
    },
    suggestionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      marginBottom: 6,
    },
    suggestionsTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.gray600 || '#475569',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    suggestionsList: {
      paddingHorizontal: 12,
      gap: 8,
    },
    suggestionChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.gray100 || '#f1f5f9',
      borderWidth: 1,
      borderColor: colors.gray200 || '#e2e8f0',
    },
    suggestionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.gray700 || '#334155',
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: colors.surface || '#ffffff',
      borderTopWidth: 1,
      borderTopColor: colors.gray200 || '#e2e8f0',
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.gray100 || '#f1f5f9',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 14,
      color: colors.gray900 || '#0f172a',
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.gray200 || '#e2e8f0',
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnActive: {
      backgroundColor: colors.primary || '#0284c7',
      shadowColor: colors.primary || '#0284c7',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 3,
    },
    sendBtnDisabled: {
      backgroundColor: colors.gray300 || '#cbd5e1',
    },
  });
