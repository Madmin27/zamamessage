# 🔐 Zama FHE ile ChronoMessage - Sepolia Testnet Deployment

## ✅ Proje Şu Anda Hazır!

ChronoMessage projesi **Zama FHE teknolojisi** ile entegre edildi ve **Sepolia testnet'inde** deploy edilmeye hazır.

### 🎯 Özellikler

- ✅ **Zama FHE kullanıyor** (`euint256` ile şifreli mesajlar)
- ✅ **Sepolia testnet uyumlu** (SepoliaConfig ile)
- ✅ **Time-locked messaging** (zaman kilitli mesajlaşma)
- ✅ **Access control** (sadece gönderen okuyabilir)
- ✅ **Production ready** (testler ve deployment scripts hazır)

---

## 📊 Nasıl Çalışır?

### 1. Mesaj Gönderme (Encryption)

```
User Input (Frontend)
    ↓
fhevmjs.encrypt()  [Client-side FHE encryption]
    ↓
encryptedContent + inputProof
    ↓
contract.sendMessage()  [Blockchain'e yazılır]
    ↓
✅ Mesaj FHE ile şifreli olarak Sepolia'da saklanır
```

### 2. Mesaj Okuma (Decryption)

```
unlock_time > block.timestamp  ✅
    ↓
contract.readMessage()  [Şifreli mesajı al]
    ↓
fhevmjs.decrypt()  [Client-side FHE decryption]
    ↓
✅ Sadece gönderen mesajı okuyabilir
```

---

## 🚀 Sepolia Testnet'e Deploy

### Adım 1: Zama FHE Paketleri Kurulu ✅

```bash
# Zaten kurulu:
# - fhevm
# - @fhevm/hardhat-plugin
# - @fhevm/solidity
```

### Adım 2: Sepolia Test ETH Alın

**Faucet'ler:**
- https://sepoliafaucet.com/
- https://faucets.chain.link/sepolia
- https://infura.io/faucet/sepolia

**Not:** En az 0.1 Sepolia ETH önerilir (deployment + test için)

### Adım 3: RPC Provider Ayarlayın

**Alchemy (Önerilen):**
1. https://www.alchemy.com/ → Sign Up
2. Create App → Ethereum → Sepolia
3. API Key'i kopyala

**Infura:**
1. https://infura.io/ → Sign Up
2. Create Project
3. Sepolia endpoint'ini kopyala

### Adım 4: .env Dosyasını Ayarlayın

```bash
nano /root/zamamessage/.env
```

**Şu satırları uncomment edip doldurun:**

```bash
# Sepolia RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Kendi cüzdanınızın private key'i
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Contract verification için (opsiyonel)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
```

⚠️ **GÜVENLİK UYARISI:**
- Test için yeni bir cüzdan oluşturun!
- Gerçek parayla dolu cüzdanınızı KULLANMAYIN!
- `.env` dosyası .gitignore'da, GitHub'a pushlmaz

### Adım 5: Deploy Edin! 🎯

```bash
cd /root/zamamessage

# Deploy contract
npx hardhat run scripts/deploy.ts --network sepolia

# Başarılı olursa:
# ✅ ChronoMessageZama deployed to: 0x1234...
# 🔍 View on Explorer: https://sepolia.etherscan.io/address/0x1234...
```

### Adım 6: Contract'ı Verify Edin (Etherscan'de görünsün)

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# Örnek:
# npx hardhat verify --network sepolia 0x1234567890abcdef1234567890abcdef12345678
```

---

## 🧪 Frontend ile Test

### 1. Frontend'de fhevmjs Kurun

```bash
cd /root/zamamessage/frontend
npm install @zama-fhe/relayer-sdk
```

### 2. Frontend .env.local Güncelleyin

```bash
nano /root/zamamessage/frontend/.env.local
```

```bash
CONTRACT_ADDRESS=0xYENI_SEPOLIA_CONTRACT_ADDRESS
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
CHAIN_ID=11155111
```

### 3. Encryption Utils Ekleyin

```typescript
// lib/fhe.ts
import { createFhevmInstance } from '@zama-fhe/relayer-sdk';

export async function encryptMessage(message: string, contractAddress: string) {
  const instance = await createFhevmInstance({
    networkUrl: process.env.NEXT_PUBLIC_RPC_URL!,
    gatewayUrl: "https://gateway.sepolia.zama.ai" // Zama Gateway
  });
  
  // Mesajı sayıya çevir (256 bit)
  const messageBuffer = Buffer.from(message);
  const messageUint256 = BigInt('0x' + messageBuffer.toString('hex'));
  
  const encryptedInput = instance.createEncryptedInput(
    contractAddress,
    userAddress
  );
  
  encryptedInput.add256(messageUint256);
  const encrypted = await encryptedInput.encrypt();
  
  return {
    handle: encrypted.handles[0],
    inputProof: encrypted.inputProof
  };
}

export async function decryptMessage(
  encryptedHandle: string,
  contractAddress: string
) {
  const instance = await createFhevmInstance({
    networkUrl: process.env.NEXT_PUBLIC_RPC_URL!,
    gatewayUrl: "https://gateway.sepolia.zama.ai"
  });
  
  const decrypted = await instance.decrypt256(encryptedHandle);
  const buffer = Buffer.from(decrypted.toString(16), 'hex');
  return buffer.toString('utf8');
}
```

### 4. Frontend'i Başlat

```bash
npm run dev
```

http://localhost:3000 adresine gidin ve test edin!

---

## 📋 Zama FHEVM Özellikleri

### Şifreleme Tipleri

| Tip | Bit Length | Kullanım |
|-----|-----------|----------|
| `ebool` | 2 | Boolean (şifreli) |
| `euint8` | 8 | Küçük sayılar |
| `euint16` | 16 | Orta sayılar |
| `euint32` | 32 | Standart sayılar |
| `euint64` | 64 | Büyük sayılar |
| `euint128` | 128 | Çok büyük sayılar |
| **`euint256`** | **256** | **Mesaj içeriği için kullanıyoruz** |

### Access Control

```solidity
// Contract'ta:
FHE.allowThis(encrypted);      // Contract okuyabilir
FHE.allow(encrypted, user);     // User okuyabilir

// Frontend'te:
const decrypted = await instance.decrypt256(handle);
// ✅ Sadece authorized kullanıcılar decrypt edebilir
```

---

## 💰 Maliyet Tahmini (Sepolia)

| İşlem | Gas | Maliyet |
|-------|-----|---------|
| Deploy | ~2,500,000 | 0.025-0.05 Sepolia ETH |
| Send Message (FHE) | ~500,000 | 0.005-0.01 Sepolia ETH |
| Read Message | ~100,000 | 0.001-0.002 Sepolia ETH |

**Not:** Sepolia testnet olduğu için gerçek maliyet $0 (test ETH ücretsiz)

---

## 🔍 Troubleshooting

### Hata: "Insufficient funds"
```bash
# Çözüm: Faucet'ten daha fazla Sepolia ETH alın
# https://sepoliafaucet.com/
```

### Hata: "Network error"
```bash
# Çözüm: RPC URL'i kontrol edin
curl -X POST $SEPOLIA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Beklenen: {"result":"0xaa36a7"}  (11155111)
```

### Hata: "Contract not verified"
```bash
# Çözüm: Verify komutunu tekrar çalıştırın
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Hata: "FHE decryption failed"
```bash
# Çözüm 1: Gateway URL'i doğru mu kontrol edin
# Gateway: https://gateway.sepolia.zama.ai

# Çözüm 2: Access control - Sadece sender decrypt edebilir
# Contract'ta: require(msg.sender == m.sender, "Only sender can read");
```

---

## 📚 Kaynaklar

### Zama Resmi Dökümantasyon
- **FHEVM Docs**: https://docs.zama.ai/fhevm
- **Solidity Guide**: https://docs.zama.ai/protocol/solidity-guides
- **Relayer SDK**: https://docs.zama.ai/protocol/relayer-sdk-guides
- **Examples**: https://docs.zama.ai/protocol/examples

### Network Bilgileri
- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Zama Gateway (Sepolia)**: https://gateway.sepolia.zama.ai
- **Chain ID**: 11155111
- **Block Explorer**: https://sepolia.etherscan.io/

### Community
- **Discord**: https://discord.com/invite/zama
- **Forum**: https://community.zama.ai/c/fhevm/15
- **GitHub**: https://github.com/zama-ai/fhevm

---

## 🎯 Sonraki Adımlar

1. ✅ **Sepolia'da deploy et** (bu rehberi takip et)
2. 🧪 **Frontend'i test et** (fhevmjs ile encrypt/decrypt)
3. 📊 **Gas optimization** (işlem maliyetlerini azalt)
4. 🔒 **Advanced access control** (multiple readers, time-based permissions)
5. 🚀 **Zama Mainnet** (gelecekte production deployment)

---

## ⚡ Hızlı Komutlar

```bash
# 1. Deploy
npx hardhat run scripts/deploy.ts --network sepolia

# 2. Verify
npx hardhat verify --network sepolia <ADDRESS>

# 3. Test (mock FHEVM)
npx hardhat test

# 4. Frontend başlat
cd frontend && npm run dev

# 5. Network kontrolü
./check-sepolia.sh
```

---

**Hazırsınız!** Zama FHE ile şifreli, zaman kilitli mesajlaşma sisteminiz Sepolia'da çalışmaya hazır! 🚀🔐