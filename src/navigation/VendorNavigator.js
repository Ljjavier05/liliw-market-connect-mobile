import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorProductsScreen from '../screens/vendor/VendorProductsScreen';
import VendorViolationsScreen from '../screens/vendor/VendorViolationsScreen';
import VendorRentsScreen from '../screens/vendor/VendorRentsScreen';
import VendorProfileScreen from '../screens/vendor/VendorProfileScreen';
import PricingInsightsScreen from '../screens/vendor/PricingInsightsScreen';
import AlertsScreen from '../screens/vendor/AlertsScreen';
import VendorHelpCenterScreen from '../screens/vendor/VendorHelpCenterScreen';
import { AlertsProvider, useAlerts } from '../context/AlertsContext';
import { consumePendingTab } from './pendingRoute';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackOpts = {
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.gray900,
  headerTitleStyle: { fontWeight: '700', fontSize: 17 },
  headerShadowVisible: false,
};

function AlertsBell({ navigation }) {
  const { unreadCount } = useAlerts();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Alerts')}
      style={styles.bellBtn}
      hitSlop={10}
      accessibilityLabel="Open alerts"
    >
      <Ionicons name="notifications-outline" size={22} color={colors.gray800} />
      {unreadCount > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen
        name="VendorHome"
        component={VendorDashboardScreen}
        options={({ navigation }) => ({
          title: 'Dashboard',
          headerRight: () => <AlertsBell navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="PricingInsights"
        component={PricingInsightsScreen}
        options={{ title: 'Price Watch' }}
      />
      <Stack.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ title: 'Alerts' }}
      />
      <Stack.Screen
        name="HelpCenter"
        component={VendorHelpCenterScreen}
        options={{ title: 'Help Center' }}
      />
    </Stack.Navigator>
  );
}

function ProductsStack() {
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
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen
        name="VendorRentsList"
        component={VendorRentsScreen}
        options={{ title: 'Stall Rent' }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
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
    </Stack.Navigator>
  );
}

function VendorTabs() {
  const navigation = useNavigation();
  const { unseenViolations, overdueRents, lowStockCount, unreadCount } = useAlerts();
  const dashboardBadge =
    unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined;

  useEffect(() => {
    const timer = setInterval(() => {
      const target = consumePendingTab();
      if (target) navigation.navigate(target);
    }, 800);
    return () => clearInterval(timer);
  }, [navigation]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            TabDashboard: focused ? 'grid' : 'grid-outline',
            TabProducts: focused ? 'cube' : 'cube-outline',
            TabViolations: focused ? 'warning' : 'warning-outline',
            TabRents: focused ? 'cash' : 'cash-outline',
            TabProfile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.gray100,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
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
});
