# 🌐 Frontend Erişim Rehberi

## ✅ Frontend Başarıyla Çalışıyor!

```
✓ Next.js 14.2.3
✓ Local: http://localhost:3000
✓ Contract: 0xaFEd4f18E1957Dc841433D5051f2441dE8059941 (Sepolia)
✓ Network: Sepolia Testnet
```

---

## 🔌 Erişim Seçenekleri

### Option 1: SSH Port Forwarding (Önerilen - Güvenli) 🔐

**Yerel makinenizde yeni bir terminal açın:**

```bash
ssh -L 3000:localhost:3000 root@YOUR_SERVER_IP
```

**Sonra tarayıcınızda:**
```
http://localhost:3000
```

**Avantajlar:**
- ✅ Güvenli (şifreli bağlantı)
- ✅ Firewall kuralı gerekmez
- ✅ Sadece sizin erişiminiz var

---

### Option 2: VS Code Port Forwarding (En Kolay) 🎯

Eğer VS Code kullanıyorsanız:

1. VS Code'da **PORTS** sekmesini açın
2. **Port 3000** otomatik görünmeli
3. Tıklayın → **"Open in Browser"**

Veya manuel ekleyin:
1. **PORTS** sekmesi → **"Forward a Port"**
2. **3000** yazın → Enter
3. **Globe** ikonuna tıklayın → Tarayıcıda açılır

---

### Option 3: Public Erişim (Firewall ile) ⚠️

**⚠️ DİKKAT: Bu yöntem herkese açık erişim sağlar!**

#### A. Next.js'i dış erişime aç

Frontend'i durdurun (Ctrl+C) ve şöyle başlatın:

```bash
cd /root/zamamessage/frontend
npm run dev -- -H 0.0.0.0
```

#### B. Firewall port açın

```bash
# UFW kullanıyorsanız
sudo ufw allow 3000/tcp

# iptables kullanıyorsanız
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

#### C. Sunucu IP'niz ile erişin

```
http://YOUR_SERVER_IP:3000
```

**Sunucu IP'nizi öğrenin:**
```bash
curl -4 ifconfig.me
```

---

## 🧪 Frontend Test Checklist

### 1. Tarayıcıda açın
```
http://localhost:3000
```

### 2. MetaMask bağlayın
- **Network**: Sepolia seçin
- **Connect Wallet** tıklayın
- MetaMask'ta onaylayın

### 3. Contract bilgilerini görün
- Contract Address: `0xaFEd4f18E1957Dc841433D5051f2441dE8059941`
- Network: Sepolia Testnet
- Bakiye kontrolü

### 4. Test mesajı gönderin (Zama FHE)
- Mesaj yazın
- Unlock time seçin (gelecek bir tarih)
- **⚠️ NOT**: FHE encryption henüz frontend'de entegre değil
- Şu an plain text gönderir, backend şifrelemesi gerekli

---

## 🔧 Troubleshooting

### Hata: "Cannot connect to localhost:3000"

**Çözüm 1**: Frontend çalışıyor mu kontrol edin
```bash
# Başka bir terminalde:
curl http://localhost:3000
```

**Çözüm 2**: Port zaten kullanımda mı?
```bash
lsof -i :3000
# Eğer başka bir process kullanıyorsa:
kill -9 <PID>
```

**Çözüm 3**: Firewall bloklama
```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

---

### Hata: "Network not supported"

Frontend `.env.local` dosyasını kontrol edin:
```bash
cat /root/zamamessage/frontend/.env.local
```

Olması gereken:
```
NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia
NEXT_PUBLIC_CONTRACT_ADDRESS=0xaFEd4f18E1957Dc841433D5051f2441dE8059941
```

---

### Hata: "Contract not found"

**Sebep**: Contract Sepolia'da ama MetaMask başka network'te

**Çözüm**: 
1. MetaMask → Networks
2. **Sepolia Test Network** seçin
3. Sayfayı yenileyin

---

### Hata: "pino-pretty not found" (Warning)

Bu sadece bir **warning**, frontend çalışır. Düzeltmek isterseniz:

```bash
cd /root/zamamessage/frontend
npm install pino-pretty --save-dev
```

---

## 📊 Durum Özeti

| Özellik | Durum | Detay |
|---------|-------|-------|
| **Backend Contract** | ✅ | Sepolia'da deploy |
| **Contract Address** | ✅ | 0xaFEd...9941 |
| **Frontend Server** | ✅ | Port 3000'de çalışıyor |
| **Frontend Config** | ✅ | Sepolia network ayarlı |
| **FHE Integration** | ⚠️ | Frontend'de eksik |
| **MetaMask Connect** | ✅ | RainbowKit ile çalışıyor |

---

## 🔮 Frontend FHE Entegrasyonu (Gelecek Adım)

Şu an frontend **plain text** mesaj gönderiyor. Zama FHE encryption için:

```bash
cd /root/zamamessage/frontend
npm install fhevmjs @zama-fhe/relayer-sdk
```

Detaylar: **ZAMA_TESTNET.md** dosyasında

---

## 🎯 Şimdi Ne Yapmalısınız?

1. **SSH Port Forwarding ile bağlanın** (en kolay):
   ```bash
   ssh -L 3000:localhost:3000 root@YOUR_SERVER_IP
   ```

2. **Tarayıcıda açın**: http://localhost:3000

3. **MetaMask bağlayın** (Sepolia network)

4. **Test edin!** 🚀

---

**İyi testler! 🎉**
