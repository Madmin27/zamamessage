# NetworkSwitcher Debug Guide

## 🐛 Problem: Ağlar Tıklanamıyor

### Tarayıcı Console'unda Kontrol Edilmesi Gerekenler

1. **F12** tuşuna basın (Developer Tools)
2. **Console** sekmesine gidin
3. **NetworkSwitcher'a tıklayın**
4. Aşağıdaki logları arayın:

```javascript
// Component mount edildiğinde:
🔍 NetworkSwitcher Debug: {
  currentChain: 11155111,          // Aktif chain ID
  switchNetworkAvailable: true,    // switchNetwork fonksiyonu var mı?
  isLoading: false,
  error: undefined
}

// Bir ağa tıkladığınızda:
🖱️ Chain button clicked: {
  key: "baseSepolia",
  chainId: 84532,
  chainName: "Base Sepolia",
  isActive: false,
  isSupported: true,
  switchNetworkType: "function"    // "function" olmalı!
}

// switchNetwork çağrıldığında:
📡 Calling switchNetwork with chainId: 84532

// Başarılı olursa:
✅ Network switched successfully: { ... }

// Hata olursa:
❌ Network switch error: { ... }
```

---

## 🔍 Olası Hatalar ve Çözümleri

### Hata 1: `switchNetworkAvailable: false`
**Problem**: wagmi config'de switchNetwork devre dışı

**Çözüm**:
```bash
# Providers.tsx'de chains doğru tanımlanmış mı kontrol edin
cd /root/zamamessage/frontend
grep -A 10 "configureChains" components/Providers.tsx
```

### Hata 2: `switchNetworkType: undefined`
**Problem**: useSwitchNetwork hook'u undefined dönüyor

**Çözüm**:
- Cüzdan bağlantısını kontrol edin
- MetaMask veya başka wallet extension'ı var mı?
- Providers.tsx'de connectors düzgün yapılandırılmış mı?

### Hata 3: `User rejected the request`
**Problem**: MetaMask popup'ında "Reject" tıklandı

**Çözüm**: Normal davranış - kullanıcı reddetmiş. Tekrar deneyin.

### Hata 4: `Chain not configured`
**Problem**: Seçilen chain wagmi config'de yok

**Çözüm**:
```typescript
// Providers.tsx'de tüm chains eklenmeli:
const chains = Object.values(supportedChains)
  .filter(c => c.testnet)  // veya tüm chainler için filter kaldırın
  .map(chainConfig => defineChain({ ... }));
```

---

## 🧪 Manuel Test

### Test 1: Console'da switchNetwork var mı?
```javascript
// Browser console'a yapıştırın:
window.wagmi.switchNetwork
// Beklenen: function
```

### Test 2: Hangi chainler yapılandırılmış?
```javascript
// Browser console'a yapıştırın:
window.wagmi.chains
// Beklenen: Array of chain objects
```

### Test 3: Manuel network switch
```javascript
// Browser console'a yapıştırın:
window.wagmi.switchNetwork(84532)  // Base Sepolia
// Beklenen: MetaMask popup açılır
```

---

## 📋 Mevcut Yapılandırma

### Testnet Chains (7):
- ✅ Sepolia (11155111)
- ✅ Base Sepolia (84532)
- ✅ Linea Sepolia (59141)
- ✅ Arbitrum Sepolia (421614)
- ✅ Optimism Sepolia (11155420)
- ✅ Polygon Amoy (80002)
- ✅ **Monad Testnet (41454)** 🆕

### Mainnet Chains (5):
- Base (8453)
- Arbitrum One (42161)
- Optimism (10)
- Polygon (137)
- **Monad (10000)** 🆕

---

## 🔧 Dosyalar

### 1. `frontend/components/NetworkSwitcher.tsx`
- **Debug loglar eklendi**: Console'da detaylı bilgi
- **onClick handler**: Her tıklamada log üretir
- **useSwitchNetwork**: Error handling eklendi

### 2. `frontend/components/Providers.tsx`
- **chains array**: Tüm testnets wagmi'ye eklendi
- **configureChains**: Multi-chain RPC config
- **connectors**: MetaMask + Injected wallets

### 3. `frontend/lib/chains.ts`
- **supportedChains**: 7 testnet + 5 mainnet
- **Monad eklendi**: Testnet (41454) + Mainnet (10000)

---

## 🚨 Acil Durum Çözümleri

### Çözüm 1: Hard Refresh
```bash
# Browser'da:
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

### Çözüm 2: Cache Temizle
```bash
# Browser'da:
F12 -> Network tab -> "Disable cache" checkbox
```

### Çözüm 3: Frontend Restart
```bash
sudo systemctl restart chronomessage-frontend
```

### Çözüm 4: Rebuild
```bash
cd /root/zamamessage/frontend
npm run build
sudo systemctl restart chronomessage-frontend
```

---

## 📞 Debug İçin Gerekli Bilgiler

Eğer hala çalışmıyorsa, aşağıdaki bilgileri toplayın:

1. **Browser console screenshot** (debug loglarla)
2. **MetaMask version**: Settings -> About
3. **Active wallet address**
4. **Current network** (MetaMask'ta gösterilen)
5. **Error messages** (console'daki kırmızı yazılar)

Bu bilgilerle daha detaylı troubleshooting yapabiliriz.
