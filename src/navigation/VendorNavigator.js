import React, { useEffect, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorProductsScreen from '../screens/vendor/VendorProductsScreen';
import VendorViolationsScreen from '../screens/vendor/VendorViolationsScreen';
import VendorRentsScreen from '../screens/vendor/VendorRentsScreen';
import VendorUtilityBillsScreen from '../screens/vendor/VendorUtilityBillsScreen';
import VendorPaymentsScreen from '../screens/vendor/VendorPaymentsScreen';
import VendorBusinessPermitScreen from '../screens/vendor/VendorBusinessPermitScreen';
import VendorBusinessPermitApplicationScreen from '../screens/vendor/VendorBusinessPermitApplicationScreen';
import VendorAvailableStallsScreen from '../screens/vendor/VendorAvailableStallsScreen';
import VendorProfileScreen from '../screens/vendor/VendorProfileScreen';
import PricingInsightsScreen from '../screens/vendor/PricingInsightsScreen';
import AlertsScreen from '../screens/vendor/AlertsScreen';
import VendorHelpCenterScreen from '../screens/vendor/VendorHelpCenterScreen';
import VendorAnnouncementsScreen from '../screens/vendor/VendorAnnouncementsScreen';
import { AlertsProvider, useAlerts } from '../context/AlertsContext';
import { consumePendingTab } from './pendingRoute';
import { useTheme } from '../context/ThemeContext';
import { lightHaptic } from '../utils/haptics';

const brandLogo = require('../../assets/liliw-seal.png');
import {
  ArchiveBoxIcon,
  ArchiveBoxSolidIcon,
  BanknotesIcon,
  BanknotesSolidIcon,
  BellIcon,
  BuildingStorefrontIcon,
  BuildingStorefrontSolidIcon,
  ExclamationTriangleIcon,
  ExclamationTriangleSolidIcon,
  Squares2X2Icon,
  Squares2X2SolidIcon,
} from '../components/icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function useStackOpts() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: { fontWeight: '700', fontSize: 17, color: colors.ink },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.pageBg },
    }),
    [colors]
  );
}

function AlertsBell({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { unreadCount } = useAlerts();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Alerts')}
      style={styles.bellBtn}
      hitSlop={10}
      accessibilityLabel="Open alerts"
    >
      <BellIcon size={22} color={colors.ink} />
      {unreadCount > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function DashboardHeaderTitle() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.headerTitleWrap}>
      <Image source={brandLogo} style={styles.headerTitleLogo} resizeMode="contain" />
      <Text style={[styles.headerTitleText, { color: colors.ink }]} numberOfLines={1}>
        Liliw Market Connect
      </Text>
    </View>
  );
}

function DashboardStack() {
  const stackOpts = useStackOpts();
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen
        name="VendorHome"
        component={VendorDashboardScreen}
        options={({ navigation }) => ({
          headerTitle: () => <DashboardHeaderTitle />,
          headerTitleAlign: 'left',
          headerRight: () => <AlertsBell navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="PricingInsights"
        component={PricingInsightsScreen}
        options={{ title: 'Price Watch' }}
      />
      <Stack.Screen
        name="Announcements"
        component={VendorAnnouncementsScreen}
        options={{ title: 'Announcements' }}
      />
      <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts' }} />
      <Stack.Screen
        name="HelpCenter"
        component={VendorHelpCenterScreen}
        options={{ title: 'Help Center' }}
      />
      <Stack.Screen
        name="AvailableStalls"
        component={VendorAvailableStallsScreen}
        options={{ title: 'Available Stalls' }}
      />
      <Stack.Screen
        name="UtilityBills"
        component={VendorUtilityBillsScreen}
        options={{ title: 'Water & Electricity' }}
      />
      <Stack.Screen
        name="BusinessPermit"
        component={VendorBusinessPermitScreen}
        options={{ title: 'Business Permit' }}
      />
      <Stack.Screen
        name="BusinessPermitApplication"
        component={VendorBusinessPermitApplicationScreen}
        options={{ title: 'Permit Application' }}
      />
    </Stack.Navigator>
  );
}

function ProductsStack() {
  const stackOpts = useStackOpts();
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen
        name="VendorProductsList"
        component={VendorProductsScreen}
        options={{ title: 'My Products' }}
      />
    </Stack.Navigator>
  );
}

function ViolationsStack() {
  const stackOpts = useStackOpts();
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen
        name="VendorViolationsList"
        component={VendorViolationsScreen}
        options={{ title: 'Violations' }}
      />
    </Stack.Navigator>
  );
}

function RentsStack() {
  const stackOpts = useStackOpts();
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen
        name="VendorRentsList"
        component={VendorRentsScreen}
        options={{ title: 'Stall Rent' }}
      />
      <Stack.Screen
        name="UtilityBills"
        component={VendorUtilityBillsScreen}
        options={{ title: 'Water & Electricity' }}
      />
      <Stack.Screen
        name="Payments"
        component={VendorPaymentsScreen}
        options={{ title: 'Payments' }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const stackOpts = useStackOpts();
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen
        name="VendorProfileEdit"
        component={VendorProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="HelpCenter"
        component={VendorHelpCenterScreen}
        options={{ title: 'Help Center' }}
      />
      <Stack.Screen
        name="Announcements"
        component={VendorAnnouncementsScreen}
        options={{ title: 'Announcements' }}
      />
      <Stack.Screen
        name="AvailableStalls"
        component={VendorAvailableStallsScreen}
        options={{ title: 'Available Stalls' }}
      />
      <Stack.Screen
        name="UtilityBills"
        component={VendorUtilityBillsScreen}
        options={{ title: 'Water & Electricity' }}
      />
      <Stack.Screen
        name="Payments"
        component={VendorPaymentsScreen}
        options={{ title: 'Payments' }}
      />
      <Stack.Screen
        name="BusinessPermit"
        component={VendorBusinessPermitScreen}
        options={{ title: 'Business Permit' }}
      />
      <Stack.Screen
        name="BusinessPermitApplication"
        component={VendorBusinessPermitApplicationScreen}
        options={{ title: 'Permit Application' }}
      />
    </Stack.Navigator>
  );
}

const TAB_ICONS = {
  TabDashboard: { Outline: Squares2X2Icon, Solid: Squares2X2SolidIcon },
  TabProducts: { Outline: ArchiveBoxIcon, Solid: ArchiveBoxSolidIcon },
  TabViolations: { Outline: ExclamationTriangleIcon, Solid: ExclamationTriangleSolidIcon },
  TabRents: { Outline: BanknotesIcon, Solid: BanknotesSolidIcon },
  TabProfile: { Outline: BuildingStorefrontIcon, Solid: BuildingStorefrontSolidIcon },
};

function VendorTabs() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { unseenViolations, overdueRents, lowStockCount, unreadCount } = useAlerts();
  const dashboardBadge =
    unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined;

  useEffect(() => {
    const timer = setInterval(() => {
      const target = consumePendingTab();
      if (!target) return;
      // Nested stack screens need a parent tab + screen
      if (target === 'UtilityBills') {
        navigation.navigate('TabRents', { screen: 'UtilityBills' });
      } else if (target === 'AvailableStalls') {
        navigation.navigate('TabDashboard', { screen: 'AvailableStalls' });
      } else if (target === 'BusinessPermit') {
        navigation.navigate('TabDashboard', { screen: 'BusinessPermit' });
      } else if (target === 'BusinessPermitApplication') {
        navigation.navigate('TabDashboard', { screen: 'BusinessPermitApplication' });
      } else if (target === 'Alerts') {
        navigation.navigate('TabDashboard', { screen: 'Alerts' });
      } else {
        navigation.navigate(target);
      }
    }, 800);
    return () => clearInterval(timer);
  }, [navigation]);

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => {
          lightHaptic();
        },
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const pair = TAB_ICONS[route.name];
          if (!pair) return null;
          const Icon = focused ? pair.Solid : pair.Outline;
          return <Icon size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="TabDashboard"
        component={DashboardStack}
        options={{
          title: 'Dashboard',
          tabBarBadge: dashboardBadge,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen
        name="TabProducts"
        component={ProductsStack}
        options={{
          title: 'Products',
          tabBarBadge: lowStockCount > 0 ? (lowStockCount > 9 ? '9+' : lowStockCount) : undefined,
          tabBarBadgeStyle: styles.badgeWarn,
        }}
      />
      <Tab.Screen
        name="TabViolations"
        component={ViolationsStack}
        options={{
          title: 'Violations',
          tabBarBadge: unseenViolations > 0 ? (unseenViolations > 9 ? '9+' : unseenViolations) : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen
        name="TabRents"
        component={RentsStack}
        options={{
          title: 'Rent',
          tabBarBadge: overdueRents > 0 ? (overdueRents > 9 ? '9+' : overdueRents) : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen name="TabProfile" component={ProfileStack} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function VendorNavigator() {
  return (
    <AlertsProvider>
      <VendorTabs />
    </AlertsProvider>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: colors.surface,
      borderTopColor: colors.borderBrand,
      borderTopWidth: 1,
      height: 64,
      paddingBottom: 10,
      paddingTop: 6,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '600',
    },
    badge: {
      backgroundColor: colors.danger,
      fontSize: 10,
      fontWeight: '700',
    },
    badgeWarn: {
      backgroundColor: colors.warning,
      fontSize: 10,
      fontWeight: '700',
    },
    bellBtn: {
      marginRight: 14,
      padding: 4,
    },
    bellBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    bellBadgeText: {
      color: colors.white,
      fontSize: 9,
      fontWeight: '800',
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitleLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    headerTitleText: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
  });
