// ====================================================================
// EMELMARKET PATTERN - EXACT IMPLEMENTATION
// ====================================================================
// Source: https://github.com/Madmin27/emel-market-main
// File: frontend/components/FheProvider.tsx
//
// EmelMarket uses npm package import, NOT CDN!
// Import: import('@zama-fhe/relayer-sdk/bundle')
// Pattern: await initSDK() → await createInstance(SepoliaConfig)
// ====================================================================

import { withSepoliaOverrides } from "@/lib/zama-config";

let sdkInstance: any = null;

/**
 * Get singleton Zama Relayer SDK instance
 * EmelMarket pattern: Dynamic import from npm package
 */
export async function getRelayerSDK(): Promise<any> {
  if (sdkInstance) {
    return sdkInstance;
  }

  console.log("🚀 Initializing Zama Relayer SDK (EmelMarket npm package pattern)...");

  try {
    // Dynamic import from npm package (EmelMarket pattern)
    const { initSDK, createInstance, SepoliaConfig } = await import(
      '@zama-fhe/relayer-sdk/bundle'
    );

    const config = withSepoliaOverrides(SepoliaConfig);
    console.log("🔧 Relayer config overrides:", {
      acl: config.aclContractAddress,
      inputVerifier: config.inputVerifierContractAddress,
      relayer: config.relayerUrl,
      network: config.network,
    });

    // Initialize SDK
    await initSDK();
    console.log("✅ SDK initialized");

  // Create instance using SepoliaConfig + override addresses
    sdkInstance = await createInstance(config);

    console.log("✅ Zama Relayer SDK ready! (EmelMarket npm pattern)");

    return sdkInstance;
  } catch (error: any) {
    console.error("❌ Failed to initialize SDK:", error);
    throw error;
  }
}

/**
 * Encrypt a uint64 value
 * EmelMarket pattern: sdk.createEncryptedInput(contractAddress, userAddress).add64(value).encrypt()
 */
export async function encryptUint64(
  value: bigint,
  contractAddress: string,
  userAddress: string
): Promise<{ handles: string[]; inputProof: string }> {
  const sdk = await getRelayerSDK();

  console.log(`🔐 Encrypting uint64: ${value}`);

  const encryptedInput = sdk
    .createEncryptedInput(contractAddress, userAddress)
    .add64(value);

  const encrypted = await encryptedInput.encrypt();

  console.log("✅ Value encrypted successfully");

  return {
    handles: encrypted.handles,
    inputProof: encrypted.inputProof,
  };
}

/**
 * Reset instance (for testing)
 */
export function resetSDK(): void {
  sdkInstance = null;
  console.log("🔄 SDK instance reset");
}
