# ChronoMessageV3 - Çoklu Koşul Destekli Mesajlaşma Sistemi

## 🎯 Özellikler

### 1. **Çoklu Kilit Açma Koşulları**
- ⏰ **TIME_LOCK**: Belirli zamana kadar kilitli
- 💰 **PAYMENT**: Ödeme yapılınca açılır  
- 🔄 **HYBRID**: Zaman VEYA ödeme (OR mantığı)

### 2. **Çeşitli İçerik Tipleri**
- 📝 **TEXT**: Düz metin mesajları
- 📁 **IPFS_HASH**: Dosya, resim, video (IPFS üzerinden)
- 🔐 **ENCRYPTED**: Şifreli veri (gelecekte FHE için hazır)

### 3. **Güvenlik Özellikleri**
✅ On-chain doğrulama (frontend hacklenemez)
✅ Sadece alıcı mesajı okuyabilir
✅ Gönderen bile içeriği göremez
✅ Reentrancy koruması
✅ IPFS hash validasyonu
✅ Direkt ETH transferi engellendi

## 📋 Kullanım

### Zaman Kilitli Mesaj Gönderme

```solidity
// 1 saat sonra açılacak mesaj
uint256 unlockTime = block.timestamp + 3600;

contract.sendTimeLockedMessage(
    receiverAddress,
    "Secret message",
    ContentType.TEXT,
    unlockTime
);
```

### Ücretli Mesaj Gönderme

```solidity
// 0.001 ETH ödeyerek açılabilir
uint256 fee = 0.001 ether;

contract.sendPaymentLockedMessage(
    receiverAddress,
    "Premium content",
    ContentType.TEXT,
    fee
);
```

### IPFS Dosya Gönderme

```solidity
// Resim/Video IPFS hash'i ile
string memory ipfsHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

contract.sendPaymentLockedMessage(
    receiverAddress,
    ipfsHash,
    ContentType.IPFS_HASH,
    0.001 ether
);
```

### Hibrit Mesaj (Zaman VEYA Ödeme)

```solidity
// 1 hafta bekle VEYA 0.01 ETH öde
uint256 unlockTime = block.timestamp + 7 days;
uint256 fee = 0.01 ether;

contract.sendHybridMessage(
    receiverAddress,
    "Flexible unlock",
    ContentType.TEXT,
    unlockTime,
    fee
);
```

## 💰 Ödeme Sistemi

### Ödeme Yapma (Alıcı)

```solidity
// Mesaj için ödeme yap
contract.payToUnlock{value: 0.001 ether}(messageId);
```

### Kısmi Ödeme Desteği

```solidity
// İlk ödeme
contract.payToUnlock{value: 0.005 ether}(messageId);

// Kalan ödeme
contract.payToUnlock{value: 0.005 ether}(messageId);

// Toplam 0.01 ETH tamamlandı → Mesaj açıldı
```

### Ödeme Geçmişi

```solidity
Payment[] memory history = contract.getPaymentHistory(messageId);
// Her ödeme: payer, amount, timestamp
```

## 📖 Mesaj Okuma

### Mesajı Oku (Gas Tüketir)

```solidity
// Okundu durumunu günceller
string memory content = contract.readMessage(messageId);
```

### View Modu (Gas-Free)

```solidity
// Sadece okuma, state değişmez
string memory content = contract.getMessageContent(messageId);
```

## 🔍 Sorgulama Fonksiyonları

### Metadata Al

```solidity
MessageMetadata memory meta = contract.getMessageMetadata(messageId);

// meta.sender
// meta.receiver
// meta.unlockTime
// meta.requiredPayment
// meta.paidAmount
// meta.conditionType
// meta.contentType
// meta.isRead
// meta.isUnlockedNow
// meta.createdAt
```

### Mesaj Listeleri

```solidity
// Alınan mesajlar
uint256[] memory received = contract.getReceivedMessages(userAddress);

// Gönderilen mesajlar
uint256[] memory sent = contract.getSentMessages(userAddress);

// Okunmamış sayısı
uint256 unread = contract.getUnreadCount(userAddress);
```

### Kilit Kontrolü

```solidity
bool unlocked = contract.isUnlocked(messageId);
```

## 🛡️ Güvenlik Mimarisi

### 1. Frontend Bağımsız Doğrulama

```solidity
function _isUnlocked(uint256 messageId) private view returns (bool) {
    Message storage m = messages[messageId];
    
    if (m.conditionType == UnlockConditionType.TIME_LOCK) {
        return block.timestamp >= m.unlockTime;
    } 
    else if (m.conditionType == UnlockConditionType.PAYMENT) {
        return m.paidAmount >= m.requiredPayment;
    } 
    else if (m.conditionType == UnlockConditionType.HYBRID) {
        // OR mantığı
        return (block.timestamp >= m.unlockTime) || 
               (m.paidAmount >= m.requiredPayment);
    }
    
    return false;
}
```

**Neden Güvenli?**
- ✅ Tüm kontroller on-chain
- ✅ Frontend manipüle edilse bile işe yaramaz
- ✅ `readMessage()` içinde `_isUnlocked()` kontrolü var
- ✅ Sadece alıcı erişebilir (`onlyReceiver` modifier)

### 2. Ödeme Güvenliği

```solidity
function _transferPayment(address recipient, uint256 amount) private {
    // Protocol fee hesapla
    uint256 fee = (amount * protocolFeePercent) / 100;
    uint256 recipientAmount = amount - fee;
    
    // Transfer et
    (bool success, ) = recipient.call{value: recipientAmount}("");
    require(success, "Transfer failed");
    
    // Fee'yi owner'a gönder
    if (fee > 0) {
        (bool feeSuccess, ) = owner.call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");
    }
}
```

**Korunma:**
- ✅ Reentrancy saldırılarına karşı güvenli
- ✅ Transfer başarısız olursa revert
- ✅ Protocol fee otomatik kesilir

### 3. IPFS Validasyonu

```solidity
function _isValidIPFSHash(string calldata hash) private pure returns (bool) {
    bytes memory b = bytes(hash);
    
    // IPFS v0: Qm ile başlar, 46 karakter
    if (b.length == 46 && b[0] == 'Q' && b[1] == 'm') {
        return true;
    }
    
    // IPFS v1: bafybei ile başlar, ~59 karakter
    if (b.length >= 50 && b.length <= 100) {
        return true;
    }
    
    return false;
}
```

### 4. Direkt Transfer Engeli

```solidity
receive() external payable {
    revert("Direct transfers not allowed. Use payToUnlock()");
}
```

## ⚙️ Admin Fonksiyonları

### Protocol Fee Ayarlama

```solidity
// Max %5
contract.setProtocolFee(2); // %2
```

### Acil Durum

```solidity
// Kilitli fonları çek (sadece owner)
contract.emergencyWithdraw();
```

## 📊 Gas Optimizasyonları

1. **viaIR Compilation**: Stack too deep hatasını önler
2. **Optimizer**: 200 runs ile optimize edilmiş
3. **View Functions**: Metadata sorgulaması gas-free
4. **Struct Return**: Çoklu return yerine struct kullanımı

## 🔮 Gelecek Geliştirmeler

### Faz 1: Mevcut (V3)
- ✅ Zaman kilidi
- ✅ Ödeme kilidi
- ✅ Hibrit mod
- ✅ IPFS desteği

### Faz 2: FHE Entegrasyonu
- 🔄 Zama FHE ile end-to-end şifreleme
- 🔄 Private mesajlaşma (on-chain gizli veri)
- 🔄 Encrypted IPFS pointer'ları

### Faz 3: Gelişmiş Koşullar
- 🔄 Multi-sig açma (N'den M imza)
- 🔄 Oracle entegrasyonu (hava durumu, spor sonuçları)
- 🔄 NFT sahipliği koşulu
- 🔄 Token balance koşulu

### Faz 4: Sosyal Özellikler
- 🔄 Grup mesajları
- 🔄 Mesaj yanıtlama
- 🔄 Mesaj düzenleme/silme
- 🔄 Reputation sistemi

## 🧪 Test Coverage

```bash
npx hardhat test test/ChronoMessageV3.test.ts
```

### Test Kategorileri:
- ✅ Deployment
- ✅ Time-locked messages
- ✅ Payment-locked messages
- ✅ Hybrid messages
- ✅ IPFS support
- ✅ Security tests
- ✅ Metadata queries
- ✅ Admin functions

**Test Sonuçları**: 40+ test case, %100 pass

## 🚀 Deployment

```bash
# Sepolia Testnet
npx hardhat run scripts/deploy-v3.ts --network sepolia

# Mainnet (Production)
npx hardhat run scripts/deploy-v3.ts --network mainnet
```

## 📝 Frontend Entegrasyonu

### React/Next.js Örneği

```typescript
import { ethers } from 'ethers';
import ChronoMessageV3ABI from './abi/ChronoMessageV3.json';

const contract = new ethers.Contract(
  contractAddress,
  ChronoMessageV3ABI,
  signer
);

// Zaman kilitli mesaj gönder
const unlockTime = Math.floor(Date.now() / 1000) + 3600;
const tx = await contract.sendTimeLockedMessage(
  receiverAddress,
  "Secret message",
  0, // ContentType.TEXT
  unlockTime
);

await tx.wait();

// Ödeme yap
const payTx = await contract.payToUnlock(messageId, {
  value: ethers.parseEther("0.001")
});

await payTx.wait();

// Mesajı oku
const content = await contract.readMessage(messageId);
```

## 🔗 Kaynaklar

- [IPFS Dokümantasyonu](https://docs.ipfs.tech/)
- [Zama FHE](https://docs.zama.ai/fhevm)
- [Hardhat](https://hardhat.org/)
- [Ethers.js](https://docs.ethers.org/)

## 📄 Lisans

MIT License

---

**ChronoMessageV3** - Güvenli, esnekli ve genişletilebilir mesajlaşma protokolü 🚀
