"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { withSepoliaOverrides } from "@/lib/zama-config";

interface FheContextValue {
  instance: any;
  isLoading: boolean;
  error: string | null;
}

const FheContext = createContext<FheContextValue | null>(null);

export function FheProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        console.log("🚀 FHE SDK initialization starting...");
        console.log("📍 Step 1: Importing SDK module...");
        
        // Import the ENTIRE module
        const SDK = await import('@zama-fhe/relayer-sdk/web');
        console.log("📦 SDK module loaded. Available exports:", Object.keys(SDK));
        
        if (!mounted) {
          console.log("⚠️ Component unmounted during import, aborting...");
          return;
        }
        
        // Check what's available
        if (!SDK.initSDK || !SDK.createInstance || !SDK.SepoliaConfig) {
          console.error("❌ Missing exports:", {
            hasInitSDK: !!SDK.initSDK,
            hasCreateInstance: !!SDK.createInstance,
            hasSepoliaConfig: !!SDK.SepoliaConfig
          });
          throw new Error("SDK exports missing!");
        }
        
        console.log("✅ All exports found");
        console.log("📍 Step 2: Calling initSDK() to load WASM...");
        
        // 1. ÖNCE WASM dosyalarını yükle (FHE'yi yükle)
        await SDK.initSDK();
        console.log("✅ initSDK() completed - WASM loaded");
        
        if (!mounted) {
          console.log("⚠️ Component unmounted after initSDK, aborting...");
          return;
        }
        
        // 2. WASM yüklendikten SONRA, instance oluştur (override edilmiş SepoliaConfig)
        console.log("� Step 3: Creating FHE instance with SepoliaConfig overrides...");
        const config = withSepoliaOverrides(SDK.SepoliaConfig);
        console.log("🔧 Using Sepolia overrides:", {
          acl: config.aclContractAddress,
          inputVerifier: config.inputVerifierContractAddress,
          relayer: config.relayerUrl,
          network: config.network,
        });

        const fhe = await SDK.createInstance(config);
        
        if (!mounted) {
          console.log("⚠️ Component unmounted after createInstance, aborting...");
          return;
        }
        
        console.log("✅✅✅ FHE SDK fully initialized and ready!");
        console.log("📍 Instance methods:", Object.keys(fhe || {}));
        
        setInstance(fhe);
        setIsLoading(false);
      } catch (err: any) {
        console.error("❌ FHE SDK initialization failed:", err);
        console.error("❌ Error stack:", err.stack);
        if (mounted) {
          setError(err.message || "Failed to initialize FHE SDK");
          setIsLoading(false);
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    console.error("FHE Provider Error:", error);
  }

  return (
    <FheContext.Provider value={{ instance, isLoading, error }}>
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
          fontSize: '14px',
          maxWidth: '300px'
        }}>
          ⏳ Loading FHE encryption system...
        </div>
      )}
      {error && (
        <div style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          background: '#7f1d1d', 
          color: '#fca5a5',
          padding: '12px 20px',
          borderRadius: '8px',
          zIndex: 9999,
          fontSize: '14px',
          maxWidth: '300px'
        }}>
          ❌ FHE SDK Error: {error}
        </div>
      )}
      {children}
    </FheContext.Provider>
  );
}

export function useFhe() {
  const context = useContext(FheContext);
  return context?.instance || null;
}

export function useFheStatus() {
  const context = useContext(FheContext);
  return {
    isLoading: context?.isLoading ?? true,
    error: context?.error ?? null,
    isReady: !!context?.instance && !context?.isLoading
  };
}
