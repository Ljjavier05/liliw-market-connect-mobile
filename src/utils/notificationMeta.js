/**
 * Map backend SMS notification types → in-app alert fields (parity with web bell).
 */

export function targetForNotificationType(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('RENT') || t.includes('PAYMENT') || t.includes('RECEIPT')) return 'TabRents';
  if (t.includes('WATER') || t.includes('ELECTRICITY') || t.includes('UTILITY')) return 'UtilityBills';
  if (t.includes('VIOLATION')) return 'TabViolations';
  if (t.includes('STALL')) return 'AvailableStalls';
  if (t.includes('PERMIT_APP')) return 'BusinessPermitApplication';
  if (t.includes('PERMIT')) return 'BusinessPermit';
  if (t.includes('VENDOR') || t.includes('PASSWORD')) return 'TabProfile';
  return 'TabDashboard';
}

export function describeNotification(n) {
  const type = String(n?.type || '');
  const msg = String(n?.message || '');
  const isFail =
    type.includes('REJECTED') ||
    type.includes('OVERDUE') ||
    type.includes('SUSPENDED') ||
    /not approved|NOT APPROVED|not accepted|was not accepted|OVERDUE/i.test(msg);
  const isPaidSuccess =
    !isFail &&
    (/_PAID$/.test(type) ||
      type === 'RENT_PAID' ||
      type === 'WATER_PAID' ||
      type === 'ELECTRICITY_PAID' ||
      /\bconfirmed\s+PAID\b|\bis confirmed PAID\b/i.test(msg));
  const isApprove =
    !isFail && !isPaidSuccess && (type.includes('APPROVED') || /approved/i.test(msg));

  let tone = 'neutral';
  let label = (type || 'Update').replace(/_/g, ' ');
  let title = 'Office message';
  let severity = 'medium';

  if (isPaidSuccess) {
    tone = 'success';
    severity = 'low';
    if (type.includes('RENT') || /stall rent/i.test(msg)) {
      label = 'Rent paid';
      title = 'Stall rent confirmed paid';
    } else if (type.includes('WATER') || /\bwater\b/i.test(msg)) {
      label = 'Water paid';
      title = 'Water bill confirmed paid';
    } else if (type.includes('ELECTRICITY') || /\belectricity\b/i.test(msg)) {
      label = 'Electricity paid';
      title = 'Electricity bill confirmed paid';
    } else {
      label = 'Paid';
      title = 'Payment confirmed';
    }
  } else if (isFail) {
    tone = 'danger';
    severity = 'high';
    if (type.includes('PROOF_REJECTED') || /proof.*not accepted|not accepted/i.test(msg)) {
      label = 'Proof rejected';
      title = 'Payment proof not accepted';
    } else if (type.includes('OVERDUE') || /OVERDUE/i.test(msg)) {
      label = 'Overdue';
      title = 'Payment overdue';
    } else if (type.includes('SUSPENDED')) {
      label = 'Suspended';
      title = 'Store suspended';
    } else if (/not approved|NOT APPROVED/i.test(msg) || type.includes('REJECTED')) {
      label = 'Not approved';
      title = 'Application not approved';
    } else {
      title = label;
    }
  } else if (isApprove) {
    tone = 'success';
    severity = 'medium';
    label = 'Approved';
    title = type.includes('STALL') ? 'Stall request approved' : 'Application approved';
  } else if (type.includes('VIOLATION')) {
    tone = 'danger';
    severity = 'high';
    label = type.includes('RESOLVED') ? 'Violation resolved' : 'Violation';
    title = type.includes('RESOLVED') ? 'Violation resolved' : 'New violation notice';
  } else if (type === 'PASSWORD_RESET') {
    label = 'Security';
    title = 'Password reset OTP';
    severity = 'low';
  }

  return { tone, label, title, severity };
}

/** Convert a backend Notification row into an AlertsContext item */
export function notificationToAlert(n) {
  const meta = describeNotification(n);
  return {
    key: `sms:${n.id}`,
    id: n.id,
    type: 'OFFICE_SMS',
    smsType: n.type,
    severity: meta.severity,
    tone: meta.tone,
    label: meta.label,
    title: meta.title,
    message: n.message || 'Message from market office',
    detail:
      n.status === 'FAILED'
        ? 'SMS delivery failed — message still logged here.'
        : n.status === 'MOCK_SENT'
          ? 'Logged locally (SMS mock mode).'
          : 'Also sent via SMS to your registered phone.',
    target: targetForNotificationType(n.type),
    at: n.createdAt || n.sentAt || new Date().toISOString(),
    source: 'sms',
  };
}
