"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { withSepoliaOverrides } from "@/lib/zama-config";

const FheContext = createContext<any>(null);

export function FheProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        console.log("🚀 FHE SDK initialization starting...");
        
        // Import the ENTIRE module
        const SDK = await import('@zama-fhe/relayer-sdk/web');
        console.log("📦 SDK module loaded:", Object.keys(SDK));
        
        // Check what's available
        if (!SDK.initSDK || !SDK.createInstance || !SDK.SepoliaConfig) {
          console.error("❌ Missing exports:", {
            hasInitSDK: !!SDK.initSDK,
            hasCreateInstance: !!SDK.createInstance,
            hasSepoliaConfig: !!SDK.SepoliaConfig
          });
          throw new Error("SDK exports missing!");
        }
        
        console.log("✅ All exports found, calling initSDK()...");
        
        // 1. ÖNCE WASM dosyalarını yükle (FHE'yi yükle)
        await SDK.initSDK();
        console.log("✅ initSDK() completed - WASM loaded");
        
  // 2. WASM yüklendikten SONRA, instance oluştur (override edilmiş SepoliaConfig)
  console.log("🔧 Creating FHE instance with SepoliaConfig overrides...");
        const config = withSepoliaOverrides(SDK.SepoliaConfig);
        console.log("🔧 Using Sepolia overrides:", {
          acl: config.aclContractAddress,
          inputVerifier: config.inputVerifierContractAddress,
          relayer: config.relayerUrl,
          network: config.network,
        });

        const fhe = await SDK.createInstance(config);
        
        console.log("✅✅✅ FHE SDK fully initialized and ready!");
        setInstance(fhe);
        setIsLoading(false);
      } catch (err: any) {
        console.error("❌ FHE SDK initialization failed:", err);
        setError(err.message || "Failed to initialize FHE SDK");
        setIsLoading(false);
      }
    })();
  }, []);

  if (error) {
    console.error("FHE Provider Error:", error);
  }

  return (
    <FheContext.Provider value={instance}>
      {isLoading && (
        <div style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          background: '#1f2937', 
          color: '#fbbf24',
          padding: '12px 20px',
          borderRadius: '8px',
          zIndex: 9999,
          fontSize: '14px'
        }}>
          ⏳ Loading FHE encryption system...
        </div>
      )}
      {children}
    </FheContext.Provider>
  );
}

export function useFhe() {
  return useContext(FheContext);
}
