# 🚀 Sepolia Deployment Checklist

## ✅ Yapılacaklar Listesi

### 1. Infura API Key Alın (5 dakika)

1. **Infura'ya gidin**: https://infura.io/
2. **Sign Up** yapın (ücretsiz)
3. **Dashboard'a gidin**
4. **"Create New API Key"** tıklayın
5. **Network**: Ethereum seçin
6. **API Key'i kopyalayın** (Project ID)

**Örnek API Key**: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`

---

### 2. MetaMask Wallet Hazırlayın (10 dakika)

#### A. MetaMask'a Sepolia Network Ekleyin

1. MetaMask açın
2. Networks → **Add Network**
3. **Sepolia Test Network** seçin (veya manuel ekleyin):
   - **Network Name**: Sepolia
   - **RPC URL**: `https://sepolia.infura.io/v3/YOUR_API_KEY`
   - **Chain ID**: 11155111
   - **Currency Symbol**: ETH
   - **Block Explorer**: https://sepolia.etherscan.io

#### B. Private Key Export Edin

1. MetaMask → **Account Details**
2. **Export Private Key**
3. Şifrenizi girin
4. Private key'i kopyalayın (0x ile başlar)

⚠️ **GÜVENLİK UYARISI**: 
- Bu private key'i ASLA paylaşmayın
- Sadece test ETH içeren hesap kullanın
- Mainnet private key'i ASLA kullanmayın!

---

### 3. Sepolia Test ETH Alın (15 dakika)

#### Faucet Seçenekleri:

1. **Alchemy Sepolia Faucet** (önerilen)
   - URL: https://sepoliafaucet.com/
   - Miktar: 0.5 ETH/gün
   - Gereksinim: Alchemy hesabı

2. **Infura Sepolia Faucet**
   - URL: https://www.infura.io/faucet/sepolia
   - Miktar: 0.5 ETH/gün
   - Gereksinim: Infura hesabı

3. **QuickNode Faucet**
   - URL: https://faucet.quicknode.com/ethereum/sepolia
   - Miktar: 0.05 ETH

**Minimum Gereksinim**: 0.05 ETH (deployment için)

**Bakiyenizi kontrol edin**:
```bash
# Sepolia Explorer'da arayın
https://sepolia.etherscan.io/address/YOUR_WALLET_ADDRESS
```

---

### 4. .env Dosyasını Güncelleyin (2 dakika)

```bash
nano /root/zamamessage/.env
```

**Güncelleyin**:
```properties
# Infura API Key'inizi ekleyin
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY

# MetaMask Private Key'inizi ekleyin
PRIVATE_KEY=0xYOUR_METAMASK_PRIVATE_KEY

# Opsiyonel: Etherscan API Key (verification için)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

**Kaydet**: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 5. Deployment Öncesi Kontrol (1 dakika)

```bash
cd /root/zamamessage
./check-zama.sh
```

**Beklenilen Çıktı**:
```
✅ Sepolia RPC URL configured
✅ Private key configured
✅ Wallet balance: 0.05+ ETH
✅ Contract compiles successfully
✅ Ready for deployment!
```

---

### 6. Deploy! 🚀 (2 dakika)

```bash
npx hardhat run scripts/deploy-zama.ts --network sepolia
```

**Beklenilen Çıktı**:
```
Deploying ChronoMessageZama to Sepolia...
✅ Contract deployed to: 0x1234...5678
🔗 Etherscan: https://sepolia.etherscan.io/address/0x1234...5678
⛽ Gas used: ~2,500,000
💰 Cost: ~0.075 ETH

📝 Next Steps:
1. Verify contract: npx hardhat verify --network sepolia 0x1234...5678
2. Test on frontend
3. Update documentation
```

---

### 7. Contract Verification (3 dakika)

```bash
# Etherscan API Key alın
# https://etherscan.io/myapikey

# .env'ye ekleyin
ETHERSCAN_API_KEY=YOUR_API_KEY

# Verify edin
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

**Sonuç**: Etherscan'de kaynak kodu görünür olur ✅

---

## 📊 Özet

| Adım | Süre | Durum |
|------|------|-------|
| 1. Infura API Key | 5 dk | ⏳ |
| 2. MetaMask Setup | 10 dk | ⏳ |
| 3. Test ETH | 15 dk | ⏳ |
| 4. .env Update | 2 dk | ⏳ |
| 5. Pre-check | 1 dk | ⏳ |
| 6. Deploy | 2 dk | ⏳ |
| 7. Verify | 3 dk | ⏳ |
| **TOPLAM** | **~38 dk** | |

---

## 🔗 Önemli Linkler

- **Infura**: https://infura.io/
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **Etherscan API**: https://etherscan.io/myapikey
- **Zama Docs**: https://docs.zama.ai/fhevm
- **Zama Gateway**: https://gateway.sepolia.zama.ai

---

## ❓ Troubleshooting

### Hata: "insufficient funds"
- Faucet'tan daha fazla ETH alın (minimum 0.05 ETH)
- Bakiyenizi kontrol edin: `./check-zama.sh`

### Hata: "invalid API key"
- Infura API Key'i kontrol edin
- .env dosyasında doğru kopyalandığından emin olun

### Hata: "nonce too low"
- MetaMask'ta account'u reset edin (Settings → Advanced → Reset Account)

### Hata: "contract verification failed"
- Constructor arguments doğru mu kontrol edin
- Solidity version match ediyor mu kontrol edin (0.8.24)

---

**Hazırsınız! 🎉 İlk adımdan başlayın!**
