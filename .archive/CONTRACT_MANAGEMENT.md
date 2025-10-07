# 🔗 Contract Address Management

## Tek Kaynak Prensibi

Tüm contract adresleri **TEK BİR YERDEN** yönetilir:

```
config/contracts.js  →  Tüm script'ler buradan okur
           ↓
    .env.local      →  Frontend buradan okur
           ↓
deployments/sepolia.json  →  Deployment kayıtları
```

## Güncel Contract (V2.1)

### Adres
```
0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3
```

### Özellikler
- ✅ **getMessageContent()** - View fonksiyon (gas yok)
- ✅ **readMessage()** - Transaction (isRead tracking)
- ✅ Receiver-only privacy
- ✅ Time-locked messages

### Explorer
🔗 https://sepolia.etherscan.io/address/0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3

---

## Kullanım

### Frontend
```javascript
// .env.local otomatik okunur
import { appConfig } from "../lib/env";
const address = appConfig.contractAddress;
```

### Backend Script'ler
```javascript
// Merkezi config'den oku
import { ACTIVE_CONTRACT } from "../config/contracts";
const contract = await ethers.getContractAt("ChronoMessageV2", ACTIVE_CONTRACT);
```

---

## Yeni Contract Deploy Edildiğinde

### 1. Config Güncelle
```bash
# config/contracts.js dosyasını düzenle
nano config/contracts.js

# ACTIVE.address değiştir
address: "0xYENI_ADRES"
```

### 2. Frontend Güncelle
```bash
# .env.local dosyasını düzenle
nano frontend/.env.local

# NEXT_PUBLIC_CONTRACT_ADDRESS değiştir
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYENI_ADRES
```

### 3. Frontend Yeniden Başlat
```bash
cd frontend
pkill -f "next dev"
npm run dev -- -H 0.0.0.0
```

### 4. Test Et
```bash
# Script ile test
npx hardhat run scripts/quick-check.ts --network sepolia

# Frontend'de test
# - Yeni mesaj gönder
# - Unlock olunca oku
# - İçeriği görüntüle
```

---

## Eski Contract'lar (Kullanma!)

| Versiyon | Adres | Neden Eski? |
|----------|-------|-------------|
| V2 | `0x1F41...0F2` | getMessageContent yok |
| V1 | `0x3A11...6d7` | getSentMessages yok |

---

## Sorun Giderme

### "Contract not found" hatası
```bash
# Config doğru mu?
cat config/contracts.js | grep ACTIVE

# .env doğru mu?
cat frontend/.env.local | grep CONTRACT

# Aynı mı?
```

### Mesajlar görünmüyor
```bash
# Doğru contract'a mı bağlısın?
npx hardhat run scripts/quick-check.ts --network sepolia

# Eski contract'ta mesaj var mı?
# → Yeni contract'a geç veya adresi değiştir
```

---

## 📁 İlgili Dosyalar

```
/root/zamamessage/
├── config/
│   └── contracts.js          ← Merkezi config ⭐
├── frontend/
│   └── .env.local            ← Frontend config
├── deployments/
│   └── sepolia.json          ← Deployment kayıtları
├── scripts/
│   ├── quick-check.ts        ← Test script'i
│   └── *.ts                  ← Diğer script'ler (hepsi contracts.js kullanır)
└── CONTRACT_ADDRESS.md       ← Dokümantasyon
```

---

## ✅ Kontrol Listesi

Deploy sonrası:
- [x] `config/contracts.js` güncellendi
- [x] `frontend/.env.local` güncellendi
- [x] `deployments/sepolia.json` güncellendi
- [x] `CONTRACT_ADDRESS.md` güncellendi
- [x] Frontend yeniden başlatıldı
- [ ] Test mesajı gönderildi
- [ ] Mesaj unlock oldu ve okundu
- [ ] İçerik başarıyla gösterildi

---

**SON GÜNCELLEME:** 5 Ekim 2025  
**AKTIF CONTRACT:** 0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3  
**NETWORK:** Sepolia Testnet
