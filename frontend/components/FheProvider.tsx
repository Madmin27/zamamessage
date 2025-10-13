"use client";

import { createContext, useContext, useEffect, useState } from "react";

const FheContext = createContext<any>(null);

export function FheProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<any>(null);

  useEffect(() => {
    (async () => {
      // Direct web import from npm package (NO CDN needed)
      const { initSDK, createInstance, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web');
      
      await initSDK();
      const fhe = await createInstance(SepoliaConfig);
      
      console.log("✅ FHE SDK initialized from npm package (web export)");
      setInstance(fhe);
    })();
  }, []);

  return <FheContext.Provider value={instance}>{children}</FheContext.Provider>;
}

export function useFhe() {
  return useContext(FheContext);
}
