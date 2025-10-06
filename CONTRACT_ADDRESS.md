# � Contract Address - Single Source of Truth

**IMPORTANT**: This is the ONLY place where the official contract address should be documented.

## ✅ Active Contract (V2.1)

```
0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3
```

### Details
- **Network:** Sepolia Testnet
- **Version:** V2.1
- **Deployed:** October 5, 2025
- **Etherscan:** https://sepolia.etherscan.io/address/0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3
- **Block Explorer Events:** https://sepolia.etherscan.io/address/0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3#events

### Features
- ✅ Receiver-only privacy (sender cannot read)
- ✅ Time-locked messages
- ✅ `getMessageContent()` view function (no gas)
- ✅ `readMessage()` transaction (marks as read)
- ✅ Efficient message lookup via mappings

## ❌ Deprecated Contracts (DO NOT USE)

### V2 (Old)
```
0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2
```
**Reason:** Missing `getMessageContent` view function

### V1 (Old)
```
0x3A11204a761ee3D864870787f99fcC66f06DF6d7
```
**Reason:** Missing `getSentMessages` function, authorization issues

---

## 🔧 Configuration

### Frontend (.env.local)
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_CHAIN_ID=11155111
```

### Deployment File (deployments/sepolia.json)
```json
{
  "address": "0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3",
  "version": "V2.1",
  "network": "sepolia"
}
```

### Scripts (config/contracts.js)
All scripts import from centralized config:
```javascript
import { ACTIVE_CONTRACT } from "../config/contracts";
```

---

## 📝 Update Checklist

When deploying a new contract:
- [ ] Update `/root/zamamessage/frontend/.env.local`
- [ ] Update `/root/zamamessage/deployments/sepolia.json`
- [ ] Update `/root/zamamessage/config/contracts.js`
- [ ] Update this file (`CONTRACT_ADDRESS.md`)
- [ ] Restart frontend server
- [ ] Test with new messages

---

## 📚 Related Documentation
- [V2 Features](./V2_FEATURES.md)
- [Deployment Guide](./SEPOLIA_DEPLOYMENT.md)
- [UI Features](./UI_FEATURES.md)
