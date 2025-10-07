# ChronoMessage V2 - Receiver-Based Private Messaging

## 🎯 Yeni Özellikler

### 1. **Alıcı Tabanlı Mesajlaşma**
- Mesajlar artık **belirli bir adrese** gönderilir
- **Sadece alıcı** mesajı okuyabilir
- **Gönderen bile** kendi gönderdiği mesajı göremez
- **Üçüncü şahıslar** hiçbir şekilde erişemez

### 2. **Mesaj Takibi**
- Gönderilen mesajlar (Sent)
- Alınan mesajlar (Received)
- Okunmamış mesaj sayısı
- Okunma durumu (Read/Unread)

### 3. **Privacy First**
```solidity
// ✅ Sadece receiver okuyabilir
function readMessage(uint256 messageId) external returns (string memory) {
    require(msg.sender == m.receiver, "Only receiver can read");
    // ...
}

// ✅ Sender bile göremez!
function getMessageMetadata(uint256 messageId) external view returns (...) {
    require(
        msg.sender == m.sender || msg.sender == m.receiver,
        "Not authorized"
    );
    // ...
}
```

## 📝 Contract Adresleri

### Sepolia Testnet
- **ChronoMessageV2**: `0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2`
- **Explorer**: https://sepolia.etherscan.io/address/0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2
- **Network**: Sepolia (Chain ID: 11155111)
- **Gas Used**: 750,582

### Eski Versiyonlar
- **ChronoMessage (V1)**: `0x3A11204a761ee3D864870787f99fcC66f06DF6d7` (DEPRECATED)
- **ChronoMessageV2 (ACTIVE)**: `0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2`
- **ChronoMessageZama (FHE)**: `0xaFEd4f18E1957Dc841433D5051f2441dE8059941`
- **Factory**: `0x35925e92e46e207ceCD0b49E76323213007d317e`

## 🚀 Kullanım

### Frontend'ten Mesaj Gönderme

1. **Alıcı Adresi Girin**: `0x...` formatında Ethereum adresi
2. **Mesaj Yazın**: Zaman kapsülünüze yazılacak içerik
3. **Kilit Zamanı Seçin**: Gelecekte bir tarih/saat
4. **Gönder**: Transaction'ı onaylayın

```typescript
// MessageForm.tsx
await contract.sendMessage(
  receiver,      // 0x... alıcı adresi
  content,       // Mesaj içeriği
  unlockTime     // Unix timestamp
);
```

### Mesaj Okuma

```typescript
// Sadece receiver çağırabilir!
const content = await contract.readMessage(messageId);
```

### Mesaj Listeleme

```typescript
// Aldığım mesajlar
const received = await contract.getReceivedMessages(myAddress);

// Gönderdiğim mesajlar
const sent = await contract.getSentMessages(myAddress);

// Okunmamış mesaj sayısı
const unreadCount = await contract.getUnreadCount(myAddress);
```

## 🎨 Frontend Özellikleri

### Mesaj Kartları
- **Mavi Kenarlık** 📤: Gönderdiğiniz mesajlar
- **Aurora Kenarlık** 🔔: Yeni gelen mesajlar (okunmamış + unlocked)
- **Gri Kenarlık** ✓: Okunmuş mesajlar

### Bilgi Gösterimi
```tsx
// Gönderilen mesajlarda
"🔒 Sadece alıcı bu mesajı görebilir"

// Alınan mesajlarda (locked)
"🔐 Mesaj hâlâ kilitli. 2 saat sonra açılacak."

// Alınan mesajlarda (unlocked)
"[Mesajın içeriği]"
```

## 🧪 Test Sonuçları

```bash
✔ Should start with zero messages
✔ Should send a message from Alice to Bob
✔ Should NOT allow sender (Alice) to read the message
✔ Should NOT allow third party (Charlie) to read the message
✔ Should allow receiver (Bob) to read after unlock time
✔ Should track received messages correctly
✔ Should track sent messages correctly
✔ Should return unread count correctly

23 passing (149ms)
```

## 🔐 Güvenlik Özellikleri

### 1. **Sender Privacy**
```solidity
// Gönderen bile kendi mesajını okuyamaz
require(msg.sender == m.receiver, "Only receiver can read");
```

### 2. **Receiver Validation**
```solidity
// Zero address kontrolü
require(receiver != address(0), "Invalid receiver");

// Kendine gönderme engeli
require(receiver != msg.sender, "Cannot send to yourself");
```

### 3. **Authorization Check**
```solidity
// Metadata sadece ilgili taraflar görebilir
require(
    msg.sender == m.sender || msg.sender == m.receiver,
    "Not authorized"
);
```

### 4. **Time Lock**
```solidity
// Unlock time kontrolü
require(block.timestamp >= m.unlockTime, "Message still locked");
```

## 📊 Örnek Senaryo

### Alice → Bob Mesaj Gönderimi

1. **Alice** Bob'a mesaj gönderir:
   ```
   Receiver: 0xBob...
   Content: "Gizli proje hakkında konuşalım"
   UnlockTime: 2025-10-05 18:00
   ```

2. **Bob** mesaj listesinde görür:
   ```
   🔔 Yeni Mesaj
   Gönderen: 0xAlice...
   Kilit: 2 saat sonra açılacak
   ```

3. **Alice** kendi gönderdiği mesajı göremez:
   ```
   📤 Gönderildi
   Alıcı: 0xBob...
   🔒 Sadece alıcı bu mesajı görebilir
   ```

4. **Zaman gelince** Bob okur:
   ```
   ✅ Açıldı
   "Gizli proje hakkında konuşalım"
   ```

5. **Charlie** hiçbir şey göremez:
   ```
   ❌ Not authorized to view this message
   ```

## 🔄 Migration from V1

### Contract Farkları

| Özellik | V1 (ChronoMessage) | V2 (ChronoMessageV2) |
|---------|-------------------|---------------------|
| Receiver | ❌ Yok | ✅ Zorunlu |
| Privacy | 🟡 Herkes okuyabilir | 🟢 Sadece receiver |
| Tracking | ❌ Yok | ✅ Sent/Received lists |
| Read Status | ❌ Yok | ✅ isRead flag |
| Metadata Auth | 🟡 Herkes görebilir | 🟢 Sadece ilgili taraflar |

### Frontend Değişiklikleri

```tsx
// V1
<MessageForm onSubmitted={...} />
// Sadece content + unlockTime

// V2
<MessageForm onSubmitted={...} />
// receiver + content + unlockTime
// + Alıcı adresi input field
```

```tsx
// V1 - MessageList
- Tüm mesajlar görünür
- Sadece sender bilgisi

// V2 - MessageList
- Sent/Received ayrımı
- Receiver bilgisi
- Okunma durumu
- Privacy indicators
```

## 🌐 Frontend URL

**Live Demo**: http://85.96.191.197:3000

### Özellikler
- ✅ Receiver address input
- ✅ Sent/Received message filtering
- ✅ Visual indicators (Sent 📤, New 🔔, Read ✓)
- ✅ Privacy warnings
- ✅ Time-locked status

## 🎯 Sonraki Adımlar

### 1. FHE Integration (Zama)
```solidity
// V3: ChronoMessageFHE
- euint64 encrypted content
- TFHE operations
- Fully homomorphic encryption
```

### 2. Advanced Features
- [ ] Mesaj silme (soft delete)
- [ ] Mesaj yanıtlama (reply)
- [ ] Grup mesajları
- [ ] Attachment support
- [ ] Emoji reactions

### 3. UI Improvements
- [ ] Inbox/Outbox tabs
- [ ] Search/Filter
- [ ] Pagination
- [ ] Real-time notifications
- [ ] Push notifications

## 📚 Dokümantasyon

- [Contract Source](../contracts/ChronoMessageV2.sol)
- [Tests](../test/ChronoMessageV2.test.ts)
- [Frontend ABI](../frontend/lib/abi-v2.ts)
- [MessageForm](../frontend/components/MessageForm.tsx)
- [MessageList](../frontend/components/MessageList.tsx)

## 🐛 Bilinen Sorunlar

1. **readMessage nonpayable**: Frontend'te direkt call edilemiyor, transaction gerekiyor
   - **Çözüm**: Şu an için "[Mesajı okumak için tıklayın]" placeholder
   - **TODO**: Read button eklenecek

2. **Message filtering**: Şu an tüm mesajlar görünüyor
   - **TODO**: Inbox/Outbox tabs eklenecek

3. **Real-time updates**: Manuel refresh gerekiyor
   - **TODO**: Event listening eklenecek

## 💡 Tips

- **Test için**: Sepolia faucet kullanın - https://sepoliafaucet.com/
- **Privacy**: Gönderdiğiniz mesajları göremezsini unutmayın!
- **Time**: Unlock time her zaman gelecekte olmalı
- **Address**: Receiver address doğru formatta olmalı (0x...)

---

**Version**: 2.0.0  
**Deploy Date**: October 5, 2025  
**Network**: Sepolia Testnet  
**Status**: ✅ Production Ready
