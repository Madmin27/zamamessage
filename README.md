# 🔐 ChronoMessage - Zama FHE ile Zaman Kilitli Mesajlaşma

**Fully Homomorphic Encryption (FHE)** teknolojisi ile şifreli, zaman kilitli mesajlaşma dApp'i.

![Zama FHE](https://img.shields.io/badge/Zama-FHE%20Enabled-blue?style=for-the-badge&logo=ethereum)
![Tests](https://img.shields.io/badge/tests-13%20passing-success?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-informational?style=for-the-badge)

## ✨ Özellikler

- 🔒 **Zama FHE Şifreleme** - Mesajlar `euint256` ile blockchain'de şifreli saklanır
- ⏰ **Time-Locked Messaging** - Mesajlar belirli zamanda açılır
- 🛡️ **Access Control** - Sadece gönderen kişi mesajı okuyabilir
- 🌐 **Multi-Chain Ready** - Sepolia testnet (şu an), diğer EVM ağları (gelecekte)
- ✅ **Production Ready** - 13/13 test geçiyor, deployment scripts hazır

## 🚀 Hızlı Başlangıç

### 1. Kurulum
```bash
# Dependencies'i yükleyin
npm install

# Contract'ları derleyin
npx hardhat compile
```

### 2. Local Test (Mock FHEVM)
```bash
# Testleri çalıştırın
npx hardhat test

# Beklenen: 13 passing ✅
```

### 3. Sepolia Testnet'e Deploy
```bash
# 1. .env dosyasını ayarlayın
cp .env.example .env
nano .env

# 2. Sepolia ETH alın (faucet)
# https://sepoliafaucet.com/

# 3. Deployment kontrolü
./check-zama.sh

# 4. Deploy edin!
npx hardhat run scripts/deploy-zama.ts --network sepolia

# 5. Verify edin
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

Detaylı kurulum için: [ZAMA_TESTNET.md](./ZAMA_TESTNET.md)

## 📁 Proje Yapısı

```
.
├── contracts/                    # Solidity akıllı kontratlar
│   ├── ChronoMessage.sol              # V1 - düz metin (deprecated)
│   ├── ChronoMessageFHE.sol           # V2 - FHE (deprecated)
│   └── ChronoMessageZama.sol          # ✅ V3 - Zama FHE (ACTIVE)
├── test/                         # Hardhat testleri
│   ├── ChronoMessage.test.ts
│   └── ChronoMessageZama.test.ts      # ✅ 13/13 passing
├── scripts/                      # Deploy scriptleri
│   ├── deploy.ts                      # Genel deployment
│   └── deploy-zama.ts                 # ✅ Sepolia Zama deployment
├── fhevmTemp/                    # Zama FHE config dosyaları
├── check-zama.sh                 # ✅ Deployment validation script
├── ZAMA_TESTNET.md               # ✅ Sepolia deployment rehberi
├── frontend/                     # Next.js dApp (FHE integration gerekli)
│   ├── app/                           # Next.js App Router
│   ├── components/                    # React bileşenleri
│   └── lib/                           # Utilities
└── README.md                     # ← Bu dosya
```
## 🧪 Testing

### Unit Tests

```bash
# Tüm testleri çalıştır
npx hardhat test

# Sadece Zama FHE testleri
npx hardhat test test/ChronoMessageZama.test.ts

# Coverage (opsiyonel)
npx hardhat coverage
```

### Test Sonuçları ✅

```
ChronoMessageZama (Zama FHE)
  Deployment
    ✔ should deploy successfully
    ✔ should have zero messages initially
  Send Message (FHE Encrypted)
    ✔ should send an encrypted message with future unlock time
    ✔ should reject message with past unlock time
    ✔ should emit MessageSent event
  Read Message (FHE Decryption)
    ✔ should not allow reading before unlock time
    ✔ should allow sender to read message after unlock time
    ✔ should not allow non-sender to read message
    ✔ should reject reading non-existent message
  Metadata Functions
    ✔ should return correct metadata
    ✔ should track user message count
    ✔ should correctly report message lock status
  Multiple Messages
    ✔ should handle multiple messages from different users

13 passing (154ms)
```

## 🔬 Teknik Detaylar

### Smart Contract Mimarisi

```solidity
// ChronoMessageZama.sol
contract ChronoMessageZama is SepoliaConfig {
    struct Message {
        address sender;
        uint256 unlockTime;
        euint256 encryptedContent;  // FHE ile şifreli
        bool exists;
    }
    
    function sendMessage(externalEuint256, bytes, uint256) external;
    function readMessage(uint256) external view returns (euint256);
    function getMessageMetadata(uint256) external view;
}
```

### FHE Encryption Flow

```
┌─────────────┐
│  Frontend   │  User yazar mesajı
└──────┬──────┘
       │ 
       ▼
┌─────────────┐
│  fhevmjs    │  Encrypt (client-side)
│  encrypt()  │
└──────┬──────┘
       │ encryptedContent + inputProof
       ▼
┌─────────────┐
│  Contract   │  FHE.fromExternal()
│  (Sepolia)  │  FHE.allowThis()
└──────┬──────┘
       │ Blockchain'de şifreli saklanır
       ▼
┌─────────────┐
│  Storage    │  euint256 (256-bit encrypted)
│  (FHE)      │
└─────────────┘
       │ unlock_time > block.timestamp ✅
       ▼
┌─────────────┐
│  Frontend   │  Decrypt (sadece sender)
│  decrypt()  │
└─────────────┘
```

### Teknoloji Stack

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| **Smart Contract** | Solidity | 0.8.24 |
| **FHE Library** | @fhevm/solidity | latest |
| **Blockchain** | Ethereum Sepolia | Testnet |
| **Development** | Hardhat | 2.22.x |
| **Testing** | Chai + Mocha | - |
| **Frontend** | Next.js 14 | (integration needed) |
| **Web3** | ethers.js | 6.x |

## 📖 Detaylı Dokümantasyon

- **[ZAMA_TESTNET.md](ZAMA_TESTNET.md)** - Sepolia deployment tam rehberi
- **[MULTICHAIN_GUIDE.md](MULTICHAIN_GUIDE.md)** - Multi-chain deployment
- **[USAGE.md](USAGE.md)** - Kullanım kılavuzu
- **[QUICKSTART.md](QUICKSTART.md)** - 5 dakikada başlangıç

## 🔮 Roadmap

### Phase 1: MVP ✅ (Tamamlandı)
- [x] Zama FHE integration
- [x] Basic time-locked messaging
- [x] Unit tests (13/13 passing)
- [x] Sepolia deployment scripts

### Phase 2: Frontend 🔄 (Devam ediyor)
- [ ] Next.js frontend with fhevmjs
- [ ] MetaMask integration
- [ ] Message list UI
- [ ] Encryption/decryption UX

### Phase 3: Advanced Features ⏳ (Planned)
- [ ] Multi-recipient messages
- [ ] NFT-gated messages
- [ ] Event-triggered unlocks
- [ ] Gas optimization

### Phase 4: Production 🔮 (Future)
- [ ] Mainnet deployment
- [ ] Security audit
- [ ] Advanced access control
- [ ] Mobile app

## 💰 Gas Costs (Tahmini)

| İşlem | Gas | Sepolia ETH | USD (gas=30 gwei) |
|-------|-----|-------------|-------------------|
| **Deploy** | ~2,500,000 | 0.075 | ~$0 (testnet) |
| **Send Message** | ~500,000 | 0.015 | ~$0 (testnet) |
| **Read Message** | ~100,000 | 0.003 | ~$0 (testnet) |

**Not:** Mainnet'te FHE operations daha pahalı olabilir. Optimization gerekli.

## 🔒 Güvenlik

### Access Control

```solidity
// Contract seviyesinde
FHE.allowThis(encrypted);    // Contract okuyabilir
FHE.allow(encrypted, sender); // Gönderen okuyabilir

// Okuma kontrolü
require(msg.sender == m.sender, "Only sender can read");
```

### Best Practices

- ✅ Private key'leri `.env` dosyasında (gitignore'da)
- ✅ Test ağlarında önce test edin
- ✅ Contract verification yapın (Etherscan)
- ✅ Minimum bakiye kontrolü (deployment öncesi)
- ⚠️ Mainnet'te ASLA test private key kullanmayın!

## 💡 Use Cases

- **Time Capsule**: Geleceğe mesaj bırakın
- **Scheduled Announcements**: Belirli zamanda açılan duyurular
- **Will/Testament**: Dijital vasiyet
- **Future Trading Signals**: Zaman kilitli trading önerileri
- **Secret Santa**: Zamanlı hediye mesajları

## 🤝 Contributing

Katkıda bulunmak için:

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📚 Kaynaklar

### Zama FHE

- **Docs**: https://docs.zama.ai/fhevm
- **GitHub**: https://github.com/zama-ai/fhevm
- **Discord**: https://discord.com/invite/zama
- **Forum**: https://community.zama.ai/

### Ethereum

- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **Alchemy**: https://www.alchemy.com/
- **Infura**: https://infura.io/

## 📄 License

MIT License - detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

**Built with ❤️ using Zama FHE Technology** 🔐

**Not**: Proje production-ready durumda. Sepolia deployment için .env ayarları yapılması gerekiyor.
