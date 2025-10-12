# 🔒 SECURITY FIX: ChronoMessageV3_2 (2025-10-11)

## 🚨 Critical Vulnerability Found in V3/V3.1

### Problem:
**HYBRID mode** allowed messages to be unlocked by **EITHER** time expiration **OR** payment completion. This created a security vulnerability where:

1. User sends payment-locked message with unlock time
2. Receiver waits for time to expire
3. Receiver reads message **WITHOUT PAYMENT**
4. Sender never receives payment

### Exploit Example:
```solidity
// V3/V3.1 (VULNERABLE):
function _isUnlocked(uint256 messageId) private view returns (bool) {
    if (m.conditionType == UnlockConditionType.HYBRID) {
        // OR logic - vulnerable!
        return (block.timestamp >= m.unlockTime) || (m.paidAmount >= m.requiredPayment);
    }
}
```

**Result**: If `unlockTime` is reached, message unlocks even if `paidAmount == 0`!

---

## ✅ Solution: ChronoMessageV3_2

### Changes:
1. **HYBRID mode removed entirely**
2. **Two distinct modes**:
   - `TIME_LOCK`: Only time-based unlock (no payment)
   - `PAYMENT`: Only payment-based unlock (no time lock)

3. **Strict validation**:
```solidity
if (conditionType == UnlockConditionType.TIME_LOCK) {
    require(unlockTime > block.timestamp, "TIME_LOCK requires future unlock time");
    require(requiredPayment == 0, "TIME_LOCK cannot have payment requirement");
} else if (conditionType == UnlockConditionType.PAYMENT) {
    require(requiredPayment >= MIN_PAYMENT, "PAYMENT requires minimum payment");
    require(unlockTime == 0, "PAYMENT cannot have time lock");
}
```

4. **Simplified unlock logic**:
```solidity
function _isUnlocked(uint256 messageId) private view returns (bool) {
    if (m.conditionType == UnlockConditionType.TIME_LOCK) {
        return block.timestamp >= m.unlockTime;
    } 
    else if (m.conditionType == UnlockConditionType.PAYMENT) {
        return m.paidAmount >= m.requiredPayment;
    }
    return false;
}
```

---

## 📦 Deployment Info

### Contract Addresses (V3.2):

| Network | Address | Explorer |
|---------|---------|----------|
| **Sepolia** | `0x08b015b740be3d61fA6a0cB1b589480b39Ab6b65` | [View](https://sepolia.etherscan.io/address/0x08b015b740be3d61fA6a0cB1b589480b39Ab6b65) |
| **Base Sepolia** | `0x31E5703D03272b47957c7f2C043242C66cE1330d` | [View](https://sepolia.basescan.org/address/0x31E5703D03272b47957c7f2C043242C66cE1330d) |
| **Scroll Sepolia** | `0x68B46E9E29Cf93Dd024396f5Bb5dD6399D27386B` | [View](https://sepolia.scrollscan.dev/address/0x68B46E9E29Cf93Dd024396f5Bb5dD6399D27386B) |

### Deprecated Contracts (DO NOT USE):

| Version | Issue | Status |
|---------|-------|--------|
| V3.1 | HYBRID mode vulnerability | ⚠️ Deprecated |
| V3.0 | Payment timestamp bug + HYBRID | ⚠️ Deprecated |

---

## 🔄 Migration Guide

### For Users:
1. **Frontend automatically updated** - V3.2 is now default
2. **Old messages still readable** on V3/V3.1 (switch version dropdown)
3. **New messages** will use V3.2 contract

### For Developers:
1. **ABI updated**: Use `chronoMessageV3_2Abi` from `lib/abi-v3.2.ts`
2. **Function names changed**:
   - ~~`sendHybridMessage`~~ (removed)
   - `sendTimeLockedMessage(address, string, ContentType, uint256)`
   - `sendPaymentLockedMessage(address, string, ContentType, uint256)`

3. **conditionType enum**:
```typescript
enum UnlockConditionType {
    TIME_LOCK = 0,  // Only time
    PAYMENT = 1     // Only payment
    // HYBRID removed
}
```

---

## 📝 Testing Checklist

### TIME_LOCK Mode:
- [ ] Send message with future unlock time
- [ ] Verify `requiredPayment == 0`
- [ ] Wait for unlock time
- [ ] Read message (should succeed)
- [ ] Try to pay (should fail - not payment-locked)

### PAYMENT Mode:
- [ ] Send message with payment amount
- [ ] Verify `unlockTime == 0`
- [ ] Try to read before payment (should fail)
- [ ] Pay required amount
- [ ] Verify sender receives payment
- [ ] Read message (should succeed)

---

## 🛡️ Security Improvements

1. **No more ambiguity**: Clear separation between time and payment locks
2. **Input validation**: Contract enforces that only one mode is active
3. **Payment guarantee**: PAYMENT mode messages CANNOT be unlocked without payment
4. **Simpler logic**: Reduced attack surface, easier to audit

---

## 📞 Support

If you have messages locked in V3/V3.1 contracts:
- Switch to V3.1 in version dropdown
- Your messages are safe and readable
- Future messages will use secure V3.2 contract

**Affected users**: Contact sender to arrange alternative payment if message was read without payment on V3/V3.1.

---

## 🔍 Audit Trail

- **Vulnerability discovered**: 2025-10-11 22:30 UTC
- **Fix implemented**: 2025-10-11 23:00 UTC  
- **Contracts deployed**: 2025-10-11 23:05 UTC
- **Frontend updated**: 2025-10-11 23:10 UTC

**Auditor**: Internal testing by 0xF6D39Dda8997407110264acEc6a24345834cB639

---

## ⚠️ Important Notes

1. **V3/V3.1 contracts remain accessible** for reading old messages
2. **No data loss** - all messages preserved
3. **Frontend handles version switching** automatically
4. **Backward compatible** - can read from any version

**Status**: ✅ Vulnerability patched - Safe to use V3.2
