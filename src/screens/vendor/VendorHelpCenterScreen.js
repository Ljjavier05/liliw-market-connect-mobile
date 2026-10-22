import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
} from 'react-native';
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BoltIcon,
  BuildingStorefrontIcon,
  ChevronRightIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  LifebuoyIcon,
  MapPinIcon,
  MinusIcon,
  PhoneIcon,
  PlusIcon,
  Squares2X2Icon,
} from '../../components/icons';
import { useTheme } from '../../context/ThemeContext';

const FAQS = [
  {
    q: 'How do I get my store approved?',
    a: 'Submit your application via the Store tab in Profile. The market administrator will review it within 1–3 business days. You will receive an SMS notification once a decision is made.',
  },
  {
    q: 'How do I pay my stall rent?',
    a: 'Open Stall Rent in the app. Send the exact amount to the Market Office GCash number shown there, then upload your receipt for office confirmation.',
  },
  {
    q: 'How do I request a stall?',
    a: 'Pick your preferred open stall on Available Stalls after your store is approved (or during application). The market office reviews requests and assigns the stall.',
  },
  {
    q: 'How do I pay water or electricity?',
    a: 'Open Water & Electricity from Stall Rent or the Dashboard. Pay via Market Office GCash, then upload your receipt for confirmation.',
  },
  {
    q: 'What happens if my rent is overdue?',
    a: 'Overdue rents may result in penalties or suspension of your store. Please settle any outstanding balance at the market office as soon as possible.',
  },
  {
    q: 'How do I resolve a violation?',
    a: 'Visit the market office to discuss the violation with the administrator. Once resolved, the admin will update the status in the system.',
  },
  {
    q: 'Can I appeal a violation?',
    a: 'Yes. Go to the Violations tab and contact the market office to file an appeal. Bring supporting documents if applicable.',
  },
  {
    q: 'How do I add or update my products?',
    a: 'Go to Products in the bottom tabs. You can add new products, update prices, manage stock, and hide or show listings.',
  },
  {
    q: 'Why is my store suspended?',
    a: 'Stores may be suspended due to unpaid rent, unresolved violations, or policy violations. Contact the market office to resolve the issue.',
  },
  {
    q: 'How do I update my store logo?',
    a: 'Go to Profile → Store. Tap Upload Logo or the camera icon on your avatar, then Save Store Profile.',
  },
  {
    q: 'What is Price Watch?',
    a: 'Price Watch on your dashboard compares your product prices against the market average and suggests a competitive price range based on your sales history.',
  },
];

const REMINDERS = [
  'Keep your stall clean and organized at all times.',
  'Pay your stall rent on or before the due date to avoid penalties.',
  'Ensure your product prices are fair and clearly displayed.',
  'Report any issues or disputes to the market office promptly.',
  'Maintain good conduct with fellow vendors and customers.',
  'Update your product listings regularly to reflect actual stock.',
];

const QUICK_LINKS = [
  { label: 'Store Profile', target: 'TabProfile', icon: BuildingStorefrontIcon },
  { label: 'Available Stalls', target: 'AvailableStalls', icon: BuildingStorefrontIcon, nested: true },
  { label: 'My Products', target: 'TabProducts', icon: ArchiveBoxIcon },
  { label: 'Stall Rent', target: 'TabRents', icon: BanknotesIcon },
  { label: 'Water & Electricity', target: 'UtilityBills', icon: BoltIcon, nested: true },
  { label: 'Violations', target: 'TabViolations', icon: ExclamationTriangleIcon },
  { label: 'Dashboard', target: 'TabDashboard', icon: Squares2X2Icon },
];

function FaqItem({ item, open, onToggle, styles, colors }) {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity style={styles.faqHeader} onPress={onToggle} activeOpacity={0.8}>
        <Text style={styles.faqQ}>{item.q}</Text>
        {open ? (
          <MinusIcon size={20} color={colors.primary} />
        ) : (
          <PlusIcon size={20} color={colors.gray400} />
        )}
      </TouchableOpacity>
      {open ? <Text style={styles.faqA}>{item.a}</Text> : null}
    </View>
  );
}

export default function VendorHelpCenterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [openIndex, setOpenIndex] = useState(0);
  const [filter, setFilter] = useState('ALL');

  const filteredFaqs = useMemo(() => {
    if (filter === 'RENT') {
      return FAQS.filter((f) => /rent/i.test(f.q) || /rent/i.test(f.a));
    }
    if (filter === 'VIOLATION') {
      return FAQS.filter((f) => /violation|appeal/i.test(f.q) || /violation|appeal/i.test(f.a));
    }
    if (filter === 'PRODUCTS') {
      return FAQS.filter((f) => /product|price|logo|stock/i.test(f.q) || /product|price|logo/i.test(f.a));
    }
    return FAQS;
  }, [filter]);

  const toggle = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === index ? -1 : index));
  };

  const go = (target, nested) => {
    if (nested) {
      navigation.navigate(target);
      return;
    }
    const parent = navigation.getParent();
    if (parent) parent.navigate(target);
    else navigation.navigate(target);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <LifebuoyIcon size={26} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Support / Help Center</Text>
        <Text style={styles.heroSub}>
          Everything you need to manage your store at Liliw Public Market.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={[styles.miniIcon, { backgroundColor: colors.primaryLight }]}>
            <PhoneIcon size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Contact Admin</Text>
            <Text style={styles.cardSub}>For urgent concerns</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <MapPinIcon size={16} color={colors.primary} />
          <Text style={styles.infoText}>Liliw Public Market Office</Text>
        </View>
        <View style={styles.infoRow}>
          <ClockIcon size={16} color={colors.primary} />
          <Text style={styles.infoText}>Monday – Saturday, 8:00 AM – 5:00 PM</Text>
        </View>
        <View style={styles.infoRow}>
          <DevicePhoneMobileIcon size={16} color={colors.primary} />
          <Text style={styles.infoText}>Contact the market administrator directly</Text>
        </View>
      </View>

      <View style={[styles.card, styles.cardWarn]}>
        <View style={styles.cardHead}>
          <View style={[styles.miniIcon, { backgroundColor: colors.warningSoft }]}>
            <FlagIcon size={18} color={colors.warningDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Report an Issue</Text>
            <Text style={styles.cardSub}>Something wrong? Let us know</Text>
          </View>
        </View>
        <Text style={styles.bullet}>• Wrong rent amount recorded</Text>
        <Text style={styles.bullet}>• Violation dispute or appeal</Text>
        <Text style={styles.bullet}>• Account access problems</Text>
        <Text style={styles.bullet}>• Product listing issues</Text>
        <Text style={styles.reportNote}>Visit the market office to file a report</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        {QUICK_LINKS.map((link) => {
          const LinkIcon = link.icon;
          return (
            <TouchableOpacity
              key={link.target}
              style={styles.quickLink}
              onPress={() => go(link.target, link.nested)}
              activeOpacity={0.8}
            >
              <LinkIcon size={18} color={colors.primary} />
              <Text style={styles.quickLinkText}>{link.label}</Text>
              <ChevronRightIcon size={16} color={colors.gray300} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {[
            { id: 'ALL', label: 'All' },
            { id: 'RENT', label: 'Rent' },
            { id: 'VIOLATION', label: 'Violations' },
            { id: 'PRODUCTS', label: 'Products' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => {
                setFilter(f.id);
                setOpenIndex(0);
              }}
            >
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredFaqs.map((item, index) => (
          <FaqItem
            key={item.q}
            item={item}
            open={openIndex === index}
            onToggle={() => toggle(index)}
            styles={styles}
            colors={colors}
          />
        ))}
      </View>

      <View style={styles.reminders}>
        <View style={styles.cardHead}>
          <DocumentTextIcon size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Market Reminders</Text>
        </View>
        {REMINDERS.map((line) => (
          <Text key={line} style={styles.reminderLine}>
            • {line}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.pageBg },
    content: { padding: 16, paddingBottom: 40 },

    hero: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    heroTitle: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
    heroSub: { fontSize: 13, color: colors.gray500, marginTop: 4, lineHeight: 18 },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderBrand,
    },
    cardWarn: {
      borderColor: colors.warningBorder,
      backgroundColor: colors.orangeSoft,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    miniIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.gray900 },
    cardSub: { fontSize: 12, color: colors.gray400, marginTop: 1 },

    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    infoText: { fontSize: 13, color: colors.gray600, flex: 1, lineHeight: 18 },
    bullet: { fontSize: 13, color: colors.gray600, marginTop: 4 },
    reportNote: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: '700',
      color: colors.warningDeep,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 10,
    },
    quickLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.gray100,
    },
    quickLinkText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },

    filters: { gap: 8, marginBottom: 8 },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.gray50,
      borderWidth: 1,
      borderColor: colors.gray200,
      marginRight: 8,
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 12, fontWeight: '700', color: colors.gray500 },
    filterTextActive: { color: colors.white },

    faqItem: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.gray100,
      paddingVertical: 12,
    },
    faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    faqQ: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.gray800, lineHeight: 18 },
    faqA: { marginTop: 8, fontSize: 13, color: colors.gray500, lineHeight: 19 },

    reminders: {
      backgroundColor: colors.primaryLight,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.primarySoft,
    },
    reminderLine: {
      fontSize: 13,
      color: colors.primaryDark,
      lineHeight: 20,
      marginTop: 6,
    },
  });
