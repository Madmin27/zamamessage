# 🔐 Zama Testnet Deployment Kılavuzu

## 📋 Gereksinimler

1. **MetaMask Cüzdanı** (Private key'iniz)
2. **Zama Testnet ETH** (faucet'tan alabilirsiniz)
3. **Node.js & npm** yüklü

## 🌐 Zama Testnet Bilgileri

- **Ağ Adı**: Zama Devnet
- **Chain ID**: `8009`
- **RPC URL**: `https://devnet.zama.ai`
- **Currency**: ETH
- **Explorer**: `https://explorer.zama.ai`

## 🔧 Adım 1: MetaMask'a Zama Ağını Ekleyin

1. MetaMask'ı açın
2. Ağlar → "Add Network" (Manuel ekle)
3. Bilgileri girin:
   - Network Name: `Zama Devnet`
   - RPC URL: `https://devnet.zama.ai`
   - Chain ID: `8009`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://explorer.zama.ai`
4. "Save" tıklayın

## 💰 Adım 2: Testnet ETH Alın

1. Zama faucet'a gidin: [Zama Faucet](https://faucet.zama.ai)
2. Cüzdan adresinizi girin
3. "Request ETH" tıklayın
4. 1-2 dakika bekleyin

## 🚀 Adım 3: Contract'ı Deploy Edin

### A) `.env` dosyasını kontrol edin:

```bash
# Zama için
RPC_URL=https://devnet.zama.ai
CHAIN_ID=8009
PRIVATE_KEY=your_metamask_private_key_here
```

⚠️ **ÖNEMLİ**: Private key'inizi `.env` dosyasına ekleyin (MetaMask → Account Details → Export Private Key)

### B) Deploy script'ini çalıştırın:

```bash
cd /root/zamamessage
npx hardhat run scripts/deploy-zama.ts --network fhevm
```

### C) Contract adresini kaydedin:

Deploy başarılı olursa şöyle bir çıktı göreceksiniz:

```
ChronoMessageZama deployed to: 0x...
```

Bu adresi kaydedin!

## 🌐 Adım 4: Frontend'i Zama için Yapılandırın

`frontend/.env.local` dosyasını güncelleyin:

```bash
# Zama Testnet Configuration
NEXT_PUBLIC_CHAIN_ID=8009
NEXT_PUBLIC_CHAIN_NAME=Zama Devnet
NEXT_PUBLIC_CHAIN_KEY=zama-devnet
NEXT_PUBLIC_CHAIN_CURRENCY_NAME=Ether
NEXT_PUBLIC_CHAIN_CURRENCY_SYMBOL=ETH
NEXT_PUBLIC_CHAIN_DECIMALS=18
NEXT_PUBLIC_RPC_URL=https://devnet.zama.ai
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE
NEXT_PUBLIC_EXPLORER_URL=https://explorer.zama.ai
```

## 🎯 Adım 5: Frontend'i Çalıştırın

```bash
cd frontend
npm run dev
```

Tarayıcıda: `http://localhost:3000`

## ✅ Test Edin

1. MetaMask'ta **Zama Devnet** ağına geçin
2. Frontend'i açın
3. "Connect Wallet" tıklayın
4. Mesaj gönderin (FHE ile şifrelenecek!)
5. Unlock time'dan sonra mesajı okuyun

## 🔐 FHE Nasıl Çalışır?

### Sepolia (Normal):
```javascript
sendMessage(receiver, "Merhaba", unlockTime)
// ❌ Mesaj blockchain'de düz metin
```

### Zama (FHE):
```javascript
sendMessage(encryptedContent, inputProof, unlockTime)
// ✅ Mesaj blockchain'de tamamen şifreli
// ✅ Sadece contract decrypt edebilir
// ✅ Unlock time'dan önce kimse okuyamaz
```

## 📊 Karşılaştırma

| Özellik | Sepolia | Zama FHEVM |
|---------|---------|------------|
| Şifreleme | ❌ Yok | ✅ FHE |
| Gizlilik | Düşük | Yüksek |
| Gas Cost | Düşük | Orta |
| Blockchain Gizliliği | Tüm veriler açık | Veriler şifreli |
| Use Case | Test | Production-ready privacy |

## 🛠️ Sorun Giderme

### "Insufficient funds for gas"
→ Faucet'tan daha fazla ETH alın

### "Network not found"
→ MetaMask'ta Zama ağını kontrol edin (Chain ID: 8009)

### "Contract deployment failed"
→ `.env` dosyasında `PRIVATE_KEY` doğru mu?

### Frontend hata veriyor
→ `frontend/.env.local` dosyasında contract adresini güncellediniz mi?

## 📚 Kaynaklar

- Zama Docs: https://docs.zama.ai
- FHEVM Docs: https://docs.zama.ai/fhevm
- Faucet: https://faucet.zama.ai
- Explorer: https://explorer.zama.ai

---

**Not**: Zama testnet henüz beta aşamasında. Mainnet deployment için resmi duyuruları takip edin.
