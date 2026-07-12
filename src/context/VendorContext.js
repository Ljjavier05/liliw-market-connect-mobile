import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getMyViolations } from '../services/vendor.service';
import usePolling from '../hooks/usePolling';

const VendorContext = createContext({ openViolations: 0 });

export function VendorProvider({ children }) {
  const [openViolations, setOpenViolations] = useState(0);

  const fetchViolations = useCallback(async () => {
    try {
      const list = await getMyViolations();
      const open = list.filter((v) => v.status === 'OPEN' || v.status === 'ACKNOWLEDGED').length;
      setOpenViolations(open);
    } catch {
      // keep last known count
    }
  }, []);

  usePolling(fetchViolations, 8000);

  const value = useMemo(() => ({ openViolations }), [openViolations]);

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
}

export function useVendor() {
  return useContext(VendorContext);
}
