# 🔐 Zama FHE Integration Plan

## 📋 Overview
ChronoMessage will support **TWO encryption strategies**:
1. **Sepolia Testnet** → Zama FHEVM (Fully Homomorphic Encryption)
2. **Other Networks** (Base, Scroll, etc.) → Current system (Plain text + IPFS)

## 🎯 Strategy: Multi-Contract Deployment

### Network Support Matrix

| Network | Contract Version | Encryption | Status |
|---------|-----------------|------------|--------|
| **Sepolia** | ChronoMessageV3_2 | Plain | ✅ Live |
| **Sepolia** | ChronoMessageZama | FHE 🔐 | 🔜 Deploy |
| **Base Sepolia** | ChronoMessageV3_2 | Plain | ✅ Live |
| **Scroll Sepolia** | ChronoMessageV3_2 | Plain | ✅ Live |

## 🚀 Deployment Steps

### 1. Deploy Zama Contract (Sepolia Only)

```bash
# Set Zama environment
export ENABLE_FHEVM=true
export SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
export PRIVATE_KEY="your_private_key"

# Deploy
npx hardhat run scripts/deploy-zama-sepolia.ts --network sepolia

# Output example:
# ✅ ChronoMessageZama deployed to: 0xABC123...
```

### 2. Update Frontend Config

```typescript
// frontend/lib/chains.ts
versions: [
  {
    key: 'v3.2',
    label: 'SealedMessage v3.2 🔒 (Current)',
    address: '0x08b015b740be3d61fA6a0cB1b589480b39Ab6b65',
    isDefault: true
  },
  {
    key: 'zama',
    label: 'Zama FHE 🔐 (Encrypted)',
    address: '0xDEPLOYED_ZAMA_ADDRESS', // Update this!
    description: 'Messages encrypted on-chain with FHE',
    isDefault: false
  }
]
```

### 3. Frontend Integration

#### Install FHE SDK
```bash
cd frontend
npm install fhevmjs
```

#### Update MessageForm Component
```typescript
import { createInstance } from 'fhevmjs';

// Zama encryption flow
if (activeVersion?.key === 'zama') {
  // 1. Initialize FHE instance
  const instance = await createInstance({ 
    chainId: 11155111,
    publicKey: '...' 
  });
  
  // 2. Encrypt message
  const encrypted = await instance.encrypt256(message);
  
  // 3. Send to contract
  await contract.sendMessage(
    encrypted,
    inputProof,
    unlockTime
  );
}
```

## 📊 Migration Path

### When Zama Expands to Other Networks

**Base Sepolia Example:**
```typescript
// Current (2025-10-12)
baseSepolia: {
  versions: [
    { key: 'v3.2', address: '0x31E5...', isDefault: true }
  ]
}

// Future (when Zama supports Base)
baseSepolia: {
  versions: [
    { key: 'v3.2', address: '0x31E5...', isDefault: false },
    { key: 'zama', address: '0xNEW_ZAMA...', isDefault: true }
  ]
}
```

**Key Points:**
- ✅ Old V3.2 contract stays live (no data loss)
- ✅ Users can switch versions via dropdown
- ✅ New messages use FHE by default
- ✅ Old messages readable from V3.2 contract

## 🔄 Backwards Compatibility

### Message Reading Flow
```typescript
// User switches from V3.2 → Zama
1. Old messages still on V3.2 contract ✅
2. Switch version dropdown to "V3.2"
3. Read old messages (no encryption)
4. Switch back to "Zama" for new messages

// Component handles both:
if (activeVersion?.key === 'zama') {
  // Use Zama ABI + FHE decrypt
} else {
  // Use V3.2 ABI + plain text
}
```

## 🛡️ Security Considerations

### Zama FHE
- ✅ Messages encrypted on-chain
- ✅ Only recipient can decrypt
- ✅ Blockchain data private
- ⚠️ Gas costs higher
- ⚠️ Slower tx processing

### Plain Text (V3.2)
- ⚠️ Messages readable on-chain
- ✅ Lower gas costs
- ✅ Faster transactions
- ✅ Works on all EVM chains

## 📝 Next Steps

### Immediate (Today)
- [x] Create deploy script
- [x] Generate Zama ABI
- [x] Update frontend chains config
- [ ] Deploy ChronoMessageZama to Sepolia
- [ ] Update contract address in chains.ts
- [ ] Test Zama contract on Sepolia

### Short-term (This Week)
- [ ] Install fhevmjs in frontend
- [ ] Add FHE encryption logic to MessageForm
- [ ] Add FHE decryption logic to MessageCard
- [ ] Test full encrypt → send → decrypt flow
- [ ] Update UI to show "🔐 Encrypted" badge

### Long-term (When Zama Expands)
- [ ] Monitor Zama mainnet launch
- [ ] Deploy to Base when Zama supports it
- [ ] Deploy to Scroll when Zama supports it
- [ ] Migrate default to Zama for all networks

## 🧪 Testing Checklist

### Zama Contract (Sepolia)
- [ ] Deploy successfully
- [ ] Send encrypted message
- [ ] Read encrypted message after unlock time
- [ ] Verify gas costs
- [ ] Test with MetaMask

### Frontend Integration
- [ ] Version switcher shows both V3.2 and Zama
- [ ] Can send message on V3.2 (plain)
- [ ] Can send message on Zama (encrypted)
- [ ] Can read old V3.2 messages
- [ ] Can read Zama encrypted messages
- [ ] UI shows encryption status

## 📚 Resources

- Zama Docs: https://docs.zama.ai/
- FHEVM Solidity: https://github.com/zama-ai/fhevm
- fhevmjs SDK: https://github.com/zama-ai/fhevmjs
- Sepolia Testnet: https://sepolia.etherscan.io/

## ❓ FAQ

**Q: Why not use FHE on all networks now?**
A: Zama FHEVM currently only supports Sepolia testnet. Other chains don't have FHE yet.

**Q: Will old messages be lost?**
A: No! Old V3.2 contracts stay live. Users can switch versions to read old messages.

**Q: What happens when Zama adds Base support?**
A: We deploy ChronoMessageZama to Base, add it to versions array, users can choose.

**Q: Can users choose plain vs encrypted?**
A: Yes! Version dropdown lets users pick V3.2 (plain) or Zama (encrypted) per network.

---

**Status:** 🟡 Ready for deployment  
**Last Updated:** 2025-10-12  
**Next Action:** Deploy ChronoMessageZama to Sepolia
