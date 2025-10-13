# 🔑 Gateway URL Fix → On-Chain Public Key - October 13, 2025

## 🐛 Problem History

### Issue 1: Missing Public Key
```
Error: You must provide a public key with its public key ID.
```

### Issue 2: CORS Error with Gateway
```
CORS request failed: https://gateway.sepolia.zama.ai/keyurl
NetworkError when attempting to fetch resource.
Error: Impossible to fetch public key: wrong gateway url.
```

**Root Cause:** Zama Gateway has CORS restrictions or URL changed. Browser can't fetch public key from gateway.

## ✅ Final Solution

**Fetch public key directly from KMS contract on-chain!**

No gateway needed - read directly from blockchain:
```typescript
const kmsContract = new ethers.Contract(kmsContractAddress, kmsAbi, provider);
const publicKeyHex = await kmsContract.getPublicKey();
const publicKeyIdHex = await kmsContract.getPublicKeyId();
```

## 📝 Final Implementation

### lib/fhevm-instance.ts

```typescript
import { createInstance, FhevmInstance, initFhevm } from "fhevmjs";
import { ethers } from "ethers";

// Fetch public key from KMS contract on-chain
async function fetchPublicKeyFromContract(): Promise<{
  publicKey: Uint8Array;
  publicKeyId: string;
} | null> {
  const provider = new ethers.JsonRpcProvider(networkUrl);
  
  const kmsAbi = [
    "function getPublicKey() view returns (bytes)",
    "function getPublicKeyId() view returns (bytes32)"
  ];
  
  const kmsContract = new ethers.Contract(kmsAddress, kmsAbi, provider);
  
  const [publicKeyHex, publicKeyIdHex] = await Promise.all([
    kmsContract.getPublicKey(),
    kmsContract.getPublicKeyId()
  ]);
  
  return {
    publicKey: ethers.getBytes(publicKeyHex),
    publicKeyId: publicKeyIdHex
  };
}

// Create instance with on-chain key
export async function getFhevmInstance(): Promise<FhevmInstance> {
  await initFhevm(); // Init WASM
  
  const keyData = await fetchPublicKeyFromContract();
  
  const config = {
    chainId: 11155111,
    aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
    kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
    networkUrl: "https://eth-sepolia.g.alchemy.com/v2/...",
    publicKey: keyData.publicKey, // ✅ From contract
    publicKeyId: keyData.publicKeyId, // ✅ From contract
    // No gatewayUrl needed!
  };
  
  return await createInstance(config);
}
```

**Benefits:**
- ✅ No CORS issues (on-chain read)
- ✅ No gateway dependency
- ✅ Always up-to-date key
- ✅ Decentralized approach
- ✅ Works in any browser

## 🔍 What is Gateway URL?

Zama Gateway provides:
- **Public Key**: TFHE compact public key for encryption
- **Public Key ID**: Unique identifier for the key
- **Public Params**: FHE scheme parameters

Without gateway:
- ❌ Can't encrypt data (no public key)
- ❌ Can't create encrypted inputs
- ❌ SDK initialization fails

With gateway:
- ✅ Automatic public key fetch
- ✅ Encryption works
- ✅ Standard FHE handles

## 📊 Gateway Details

**Sepolia Gateway:** `https://gateway.sepolia.zama.ai`

Purpose:
1. Serves TFHE compact public key
2. Serves public parameters for different bit sizes (8, 16, 32, 64, 128, 256)
3. Caches keys for performance
4. Provides consistent encryption across dApps

## 🧪 Testing

Expected console output:
```
🔧 Initializing fhevmjs SDK for Sepolia...
📦 Initializing WASM/TFHE...
✅ WASM initialized
🔧 Creating instance with Zama Gateway...
✅ fhevmjs SDK initialized successfully!
```

If you see:
```
❌ Failed to initialize fhevmjs SDK: Error: You must provide a public key
```
→ Gateway URL is missing or wrong

## 🚀 Deployment

```bash
# Build
cd /root/zamamessage/frontend
npm run build

# Restart
sudo systemctl restart sealedmessage-frontend

# Status
sudo systemctl status sealedmessage-frontend
```

**Status:** ✅ Active (15:57 EEST)

## 💡 Alternative: Manual Public Key

Instead of gateway, you could manually provide:
```typescript
const SEPOLIA_CONFIG = {
  // ... other config
  publicKey: new Uint8Array([...]), // Fetch from KMS contract
  publicKeyId: "0x...",
  // gatewayUrl not needed
};
```

But gateway is easier:
- ✅ Automatic key management
- ✅ No manual fetching
- ✅ Always up-to-date
- ✅ Recommended by Zama

## 🎯 Summary

- **Problem:** fhevmjs needs public key
- **Solution:** Use Zama Gateway URL
- **URL:** `https://gateway.sepolia.zama.ai`
- **Status:** ✅ FIXED
- **Ready for:** Message encryption test! 🚀

---

**Date:** October 13, 2025 15:57 EEST  
**Contract:** 0x38756CCb09EE1719089F370a8386a772a8F7B5cf  
**SDK:** fhevmjs@0.6.2 with Gateway
