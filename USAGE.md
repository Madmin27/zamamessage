# ChronoMessage - Kullanım Kılavuzu

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Kurun
```bash
# Root (Hardhat/Kontratlar)
npm install

# Frontend
cd frontend
npm install
```

### 2. Lokal Geliştirme Ortamı

#### a) Hardhat node'unu başlatın
```bash
npx hardhat node
```
Node çalışmaya başladığında, 20 adet test hesabı ve private key'lerini göreceksiniz.

#### b) Kontratı deploy edin (yeni terminal)
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Deploy edilen kontrat adresini kopyalayın (örn: `0x5FbDB2315678afecb367f032d93F642f64180aa3`)

#### c) Frontend .env.local dosyasını oluşturun
```bash
cd frontend
cp .env.example .env.local
```

`.env.local` dosyasını açıp `NEXT_PUBLIC_CONTRACT_ADDRESS` değerini deploy edilen adresle güncelleyin:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8547
NEXT_PUBLIC_CHAIN_ID=31337
```

#### d) Frontend'i başlatın
```bash
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

### 3. MetaMask Kurulumu (Lokal Test için)

1. MetaMask'ta **Ağ Ekle** > **Manuel Ağ Ekle**
2. Şu bilgileri girin:
   - **Ağ Adı**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8547
   - **Chain ID**: 31337
   - **Sembol**: ETH

3. Hardhat'in size verdiği test private key'lerinden birini import edin:
   ```
   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

## 📱 Uygulamayı Kullanma

1. **Cüzdanı Bağlayın**: Sağ üstteki "Cüzdanı Bağla" butonuna tıklayın
2. **Mesaj Oluşturun**:
   - Mesaj içeriğinizi yazın
   - Kilit açılma tarihini seçin (gelecekte bir zaman olmalı)
   - "Mesajı Gönder" butonuna tıklayın
   - MetaMask'ta işlemi onaylayın

3. **Mesajları Görüntüleyin**:
   - Alt bölümde tüm mesajlar listelenir
   - Kilidi açılmamış mesajlar "Mesaj hâlâ kilitli" uyarısı gösterir
   - Kilit açıldıktan sonra içerik otomatik görünür

## 🧪 Testler

```bash
# Kontrat testlerini çalıştırın
npm run hardhat:test

# Temiz derleme
npm run clean
npm run hardhat:compile

# Frontend lint kontrolü
cd frontend
npm run lint
```

## 🌐 Zama Testnet'e Deploy

Gerçek FHEVM ortamında çalışmak için:

1. `.env` dosyasını düzenleyin:
```env
RPC_URL=https://devnet.zama.ai
PRIVATE_KEY=<sizin-private-key-iniz>
CHAIN_ID=8009
```

2. `hardhat.config.ts` içinde Zama ağını tanımlayın (zaten hazır)

3. Deploy edin:
```bash
npx hardhat run scripts/deploy.ts --network fhevm
```

4. Frontend `.env.local` dosyasını Zama için güncelleyin (detaylar `ZAMA_TESTNET.md` dosyasında)

## 📚 Klasör Yapısı

```
.
├── contracts/              # Solidity kontratlar
│   ├── ChronoMessage.sol        # Ana kontrat (düz metin)
│   └── ChronoMessageFHE.sol     # FHE versiyonu (gelecek)
├── test/                   # Hardhat testleri
├── scripts/                # Deploy scriptleri
├── frontend/               # Next.js dApp
│   ├── app/                     # Next.js App Router
│   ├── components/              # React bileşenleri
│   └── lib/                     # ABI, ortam config
├── fhe/                    # FHE entegrasyon notları
└── deployments/            # Deploy edilen kontrat adresleri
```

## 🔐 FHE Entegrasyonu (Gelecek)

Şu anki versiyon mesajları düz metin olarak saklar. Tam gizlilik için:

1. FHEVM kütüphanesini kurun: `npm install fhevm`
2. `ChronoMessageFHE.sol` kontratını aktif edin
3. Frontend'de `fhevmjs` ile encrypt/decrypt işlemleri yapın
4. Detaylı rehber: `ZAMA_TESTNET.md`

## 🐛 Sorun Giderme

**Frontend bağlanamıyor**
- Hardhat node'unun çalıştığından emin olun
- `.env.local` dosyasındaki kontrat adresinin doğru olduğunu kontrol edin
- MetaMask'ta doğru ağı (Hardhat Local, Chain ID 31337) seçtiğinizden emin olun

**İşlem başarısız oluyor**
- MetaMask hesabınızda yeterli ETH olduğundan emin olun
- Kilit açılma zamanının gelecekte olduğunu kontrol edin
- Konsol loglarını inceleyin

**RainbowKit bağlantı hatası**
- WalletConnect Project ID gerekiyorsa [WalletConnect Cloud](https://cloud.walletconnect.com/) üzerinden ücretsiz ID alın
- `.env.local` içine `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` ekleyin

## 📖 Kaynaklar

- [Zama Docs](https://docs.zama.ai/)
- [FHEVM GitHub](https://github.com/zama-ai/fhevm)
- [Hardhat Docs](https://hardhat.org/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction)

## 📄 Lisans

MIT
