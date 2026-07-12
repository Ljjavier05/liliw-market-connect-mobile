import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { getMyVendor, getMyRents, getMyViolations } from '../services/vendor.service';
import {
  ensureNotificationPermissions,
  notifyNewAlerts,
  addNotificationResponseListener,
} from '../services/notification.service';
import { setPendingTab } from '../navigation/pendingRoute';
import usePolling from '../hooks/usePolling';

const READ_KEYS = 'liliw_read_alert_keys';
const AlertsContext = createContext(null);

function buildAlerts({ violations, rents, products }) {
  const alerts = [];

  const openViolations = (violations || []).filter(
    (v) => v.status === 'OPEN' || v.status === 'ACKNOWLEDGED'
  );
  openViolations.forEach((v) => {
    alerts.push({
      key: `violation:${v.id}:${v.status}`,
      id: v.id,
      type: 'VIOLATION',
      severity: v.severity === 'CRITICAL' || v.severity === 'MAJOR' ? 'high' : 'medium',
      title: 'Open violation',
      message: `${v.type}${v.severity ? ` (${v.severity})` : ''}`,
      detail: v.description || 'Please contact the market office.',
      target: 'TabViolations',
      at: v.issuedAt || v.createdAt || new Date().toISOString(),
    });
  });

  const overdue = (rents || []).filter((r) => r.status === 'OVERDUE');
  overdue.forEach((r) => {
    alerts.push({
      key: `rent-overdue:${r.id}`,
      id: r.id,
      type: 'RENT_OVERDUE',
      severity: 'high',
      title: 'Overdue stall rent',
      message: `${r.periodLabel || 'Rent'} — ₱${Number(r.amount || 0).toLocaleString()}`,
      detail: r.dueDate
        ? `Due date: ${new Date(r.dueDate).toLocaleDateString()}. Please settle at the market office.`
        : 'Please settle at the market office.',
      target: 'TabRents',
      at: r.dueDate || r.updatedAt || new Date().toISOString(),
    });
  });

  const unpaid = (rents || []).filter((r) => r.status === 'UNPAID' || r.status === 'PARTIAL');
  unpaid.forEach((r) => {
    alerts.push({
      key: `rent-unpaid:${r.id}:${r.status}`,
      id: r.id,
      type: 'RENT_UNPAID',
      severity: 'medium',
      title: 'Unpaid stall rent',
      message: `${r.periodLabel || 'Rent'} — ₱${Number(r.amount || 0).toLocaleString()}`,
      detail: 'Settle your rent to stay compliant.',
      target: 'TabRents',
      at: r.dueDate || r.updatedAt || new Date().toISOString(),
    });
  });

  const lowStock = (products || []).filter((p) => p.isActive && Number(p.stock) <= 5);
  lowStock.forEach((p) => {
    alerts.push({
      key: `lowstock:${p.id}:${p.stock}`,
      id: p.id,
      type: 'LOW_STOCK',
      severity: Number(p.stock) === 0 ? 'high' : 'medium',
      title: Number(p.stock) === 0 ? 'Out of stock' : 'Low stock',
      message: `${p.name} — ${p.stock} left`,
      detail: 'Update stock in Products so customers see accurate availability.',
      target: 'TabProducts',
      at: p.updatedAt || p.createdAt || new Date().toISOString(),
    });
  });

  // Newest first
  return alerts.sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [readKeys, setReadKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openViolations, setOpenViolations] = useState(0);
  const [overdueRents, setOverdueRents] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    ensureNotificationPermissions().catch(() => {});
    SecureStore.getItemAsync(READ_KEYS)
      .then((raw) => setReadKeys(raw ? JSON.parse(raw) : []))
      .catch(() => setReadKeys([]));
  }, []);

  const persistReadKeys = async (keys) => {
    const unique = [...new Set(keys)].slice(-200);
    setReadKeys(unique);
    await SecureStore.setItemAsync(READ_KEYS, JSON.stringify(unique));
  };

  const refresh = useCallback(async () => {
    try {
      const [vendor, rents, violations] = await Promise.all([
        getMyVendor().catch(() => null),
        getMyRents().catch(() => []),
        getMyViolations().catch(() => []),
      ]);

      const products = vendor?.products || [];
      const nextAlerts = buildAlerts({ violations, rents, products });

      setAlerts(nextAlerts);
      setOpenViolations(
        violations.filter((v) => v.status === 'OPEN' || v.status === 'ACKNOWLEDGED').length
      );
      setOverdueRents(rents.filter((r) => r.status === 'OVERDUE').length);
      setLowStockCount(products.filter((p) => p.isActive && Number(p.stock) <= 5).length);

      // Local push only for high-priority / actionable alerts
      const notifiable = nextAlerts.filter((a) =>
        ['VIOLATION', 'RENT_OVERDUE', 'LOW_STOCK'].includes(a.type)
      );
      await notifyNewAlerts(notifiable);
      return nextAlerts;
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(refresh, 20000);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const target = response?.notification?.request?.content?.data?.target;
      if (target) setPendingTab(target);
    });
    return () => sub.remove();
  }, []);

  const unreadCount = useMemo(() => {
    const read = new Set(readKeys);
    return alerts.filter((a) => !read.has(a.key)).length;
  }, [alerts, readKeys]);

  /** Tab badge: open violations the vendor hasn't opened/viewed yet */
  const unseenViolations = useMemo(() => {
    const read = new Set(readKeys);
    return alerts.filter((a) => a.type === 'VIOLATION' && !read.has(a.key)).length;
  }, [alerts, readKeys]);

  const markRead = useCallback(async (key) => {
    if (!key) return;
    setReadKeys((prev) => {
      if (prev.includes(key)) return prev;
      const unique = [...prev, key].slice(-200);
      SecureStore.setItemAsync(READ_KEYS, JSON.stringify(unique));
      return unique;
    });
  }, []);

  const markAllRead = useCallback(async (keys) => {
    const toMark = Array.isArray(keys) ? keys : alerts.map((a) => a.key);
    if (!toMark.length) return;
    setReadKeys((prev) => {
      const unique = [...new Set([...prev, ...toMark])].slice(-200);
      SecureStore.setItemAsync(READ_KEYS, JSON.stringify(unique));
      return unique;
    });
  }, [alerts]);

  /** Clear Violations tab badge — vendor already opened the list */
  const markViolationsSeen = useCallback(async () => {
    const keys = alerts.filter((a) => a.type === 'VIOLATION').map((a) => a.key);
    if (!keys.length) return;
    await markAllRead(keys);
  }, [alerts, markAllRead]);

  const value = useMemo(
    () => ({
      alerts,
      loading,
      unreadCount,
      openViolations,
      unseenViolations,
      overdueRents,
      lowStockCount,
      refresh,
      markRead,
      markAllRead,
      markViolationsSeen,
      isRead: (key) => readKeys.includes(key),
    }),
    [
      alerts,
      loading,
      unreadCount,
      openViolations,
      unseenViolations,
      overdueRents,
      lowStockCount,
      refresh,
      markRead,
      markAllRead,
      markViolationsSeen,
      readKeys,
    ]
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider');
  return ctx;
}

/** Optional hook that won't throw outside provider */
export function useAlertsOptional() {
  return useContext(AlertsContext);
}
