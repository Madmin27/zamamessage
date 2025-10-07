# Sepolia Hızlı Başlangıç 🚀

## Adım 1: Sepolia ETH Edinin (2 dakika)
1. https://sepoliafaucet.com/ adresine gidin
2. Cüzdan adresinizi yapıştırın
3. 0.5 Sepolia ETH alın (ücretsiz)

## Adım 2: RPC Provider Seçin (5 dakika)

### Alchemy (Önerilen)
```bash
1. https://www.alchemy.com/ → Sign Up (ücretsiz)
2. Create App → Ethereum → Sepolia
3. API Key'i kopyala
```

**VEYA hızlı test için public RPC kullanın:**
```bash
https://rpc.sepolia.org
```

## Adım 3: .env Dosyasını Düzenleyin

```bash
nano /root/zamamessage/.env
```

**Şu satırları uncomment edip doldurun:**
```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# VEYA
# SEPOLIA_RPC_URL=https://rpc.sepolia.org

PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY  # (opsiyonel, verification için)
```

## Adım 4: Deploy Edin! 🎯

```bash
cd /root/zamamessage
npx hardhat run scripts/deploy.ts --network sepolia
```

**Başarılı olursa göreceksiniz:**
```
✅ ChronoMessage deployed to: 0x1234...
🔍 View on Explorer: https://sepolia.etherscan.io/address/0x1234...
```

## Adım 5: Frontend'i Güncelleyin

```bash
nano /root/zamamessage/frontend/.env.local
```

**Contract adresini güncelleyin:**
```bash
CONTRACT_ADDRESS=0xYENI_SEPOLIA_CONTRACT_ADDRESS
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

## Adım 6: Test Edin! 🎉

```bash
cd /root/zamamessage/frontend
npm run dev
```

1. http://localhost:3000 açın
2. MetaMask'ı Sepolia ağına geçirin
3. Wallet'ı bağlayın
4. Test mesajı gönderin!

---

## ⚡ Hızlı Sorun Giderme

**"Insufficient funds"** → Faucet'ten ETH alın
**"Network error"** → RPC URL'i kontrol edin
**"Nonce too high"** → MetaMask'ta hesabı sıfırlayın (Settings → Advanced → Reset Account)

## 📚 Detaylı Rehber
Tüm detaylar için: `SEPOLIA_DEPLOYMENT.md`

---

**İpucu:** İlk kez yapıyorsanız 10-15 dakika sürer. Hazırız! 🚀
