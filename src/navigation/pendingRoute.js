let pendingTab = null;

export function setPendingTab(tabName) {
  pendingTab = tabName || null;
}

export function consumePendingTab() {
  const value = pendingTab;
  pendingTab = null;
  return value;
}
