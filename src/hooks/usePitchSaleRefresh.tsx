import { createContext, useContext, useState, useCallback } from "react";

interface PitchSaleContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const PitchSaleContext = createContext<PitchSaleContextType | undefined>(undefined);

export function PitchSaleProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <PitchSaleContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </PitchSaleContext.Provider>
  );
}

export function usePitchSaleRefresh() {
  const ctx = useContext(PitchSaleContext);
  if (!ctx) throw new Error("usePitchSaleRefresh must be used within a PitchSaleProvider");
  return ctx;
}
