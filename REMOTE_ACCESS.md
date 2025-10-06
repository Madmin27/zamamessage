# 🌐 Uzaktan Erişim Kılavuzu

## Senaryo Analizi

### 🏠 Senaryo 1: Sadece Siz Kullanacaksınız (Lokal)
**Gerekli:** Hiçbir şey! Şu anki kurulum yeterli.
- Frontend: http://localhost:3000
- Hardhat: http://localhost:8547

### 👥 Senaryo 2: Lokal Ağdaki Diğer Cihazlar (Aynı WiFi/LAN)
**Gerekli:** 
1. ✅ UFW portları açın
2. ✅ Servisleri `0.0.0.0` adresinde dinletin
3. ❌ Modem port forwarding GEREKLI DEĞİL

### 🌍 Senaryo 3: İnternetten Herkes Erişsin (Public)
**Gerekli:**
1. ✅ UFW portları açın
2. ✅ Servisleri `0.0.0.0` adresinde dinletin  
3. ✅ Modemden port forwarding yapın
4. ⚠️  **UYARI:** Güvenlik riskleri var!

---

## 🚀 Hızlı Başlatma

### Otomatik Kurulum (Önerilen)
```bash
cd /root/zamamessage

# 1. Firewall kurallarını ekle
./setup-firewall.sh

# 2. Uzaktan erişim modunda başlat
./start-remote.sh
```

### Manuel Kurulum

#### 1. UFW Kurallarını Ekleyin
```bash
# SSH güvenliği (eğer yoksa)
sudo ufw allow 22/tcp

# ChronoMessage portları
sudo ufw allow 3000/tcp comment 'ChronoMessage Frontend'
sudo ufw allow 8545/tcp comment 'Hardhat RPC'

# UFW'yi aktif et
sudo ufw enable

# Kontrol et
sudo ufw status
```

#### 2. Servisleri Başlatın (Tüm Arayüzlerde)
```bash
cd /root/zamamessage

# Terminal 1: Hardhat node
npx hardhat node --hostname 0.0.0.0

# Terminal 2: Kontrat deploy
npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3: Frontend (sunucu IP'sine göre .env.local güncelleyin)
cd frontend
# .env.local içinde NEXT_PUBLIC_RPC_URL=http://SUNUCU_IP:8547 yapın
npm run dev -- -H 0.0.0.0
```

---

## 🔌 Modem Port Forwarding (İnternetten Erişim İçin)

### Ne Zaman Gerekli?
- ✅ İnternetten (dış ağdan) erişim istiyorsanız
- ❌ Sadece lokal ağdan erişim yeterliyse GEREKLI DEĞİL

### Nasıl Yapılır?

1. **Statik Lokal IP Ayarlayın**
   ```bash
   # Sunucunuzun lokal IP'sini öğrenin
   hostname -I
   # Örnek: 192.168.1.100
   ```

2. **Modem Arayüzüne Girin**
   - Tarayıcıda `192.168.1.1` veya `192.168.0.1` yazın
   - Admin şifresiyle giriş yapın

3. **Port Forwarding Ekleyin**
   ```
   Servis: ChronoMessage Frontend
   Dış Port: 3000
   İç IP: 192.168.1.100
   İç Port: 3000
   Protokol: TCP
   
   Servis: Hardhat RPC
   Dış Port: 8545
   İç IP: 192.168.1.100
   İç Port: 8545
   Protokol: TCP
   ```

4. **Dış IP'nizi Öğrenin**
   ```bash
   curl ifconfig.me
   # Örnek: 85.123.45.67
   ```

5. **Erişim Testi**
   - Frontend: http://85.123.45.67:3000
   - RPC: http://85.123.45.67:8547

---

## 🔒 Güvenlik Uyarıları

### ⚠️ Riskler (İnternete Açık Servis)
- 🚨 Hardhat node **GERÇEK PARA İÇERMEMELİ**
- 🚨 Sadece test private key'leri kullanın
- 🚨 DDoS riski var
- 🚨 Kötü niyetli kişiler node'u spam'leyebilir

### ✅ Güvenli Alternatifler

#### 1. VPN Kullanın (En Güvenli)
```bash
# WireGuard kurulumu
sudo apt install wireguard

# Sadece VPN'deki cihazlar erişebilir
# Port forwarding GEREKLİ DEĞİL
```

#### 2. Cloudflare Tunnel (Ücretsiz)
```bash
# Cloudflared kurulumu
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Tunnel oluştur
cloudflared tunnel --url http://localhost:3000

# Güvenli public URL alırsınız (port forwarding GEREKLİ DEĞİL)
```

#### 3. IP Beyaz Listesi
```bash
# Sadece belirli IP'lere izin ver
sudo ufw delete allow 3000/tcp
sudo ufw delete allow 8545/tcp

# Belirli IP'ye izin
sudo ufw allow from 85.100.200.50 to any port 3000
sudo ufw allow from 85.100.200.50 to any port 8545
```

#### 4. Ngrok (Test için hızlı)
```bash
# Ngrok kurulumu
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Frontend'i paylaş
ngrok http 3000

# RPC'yi paylaş
ngrok http 8545
```

---

## 📊 Senaryo Karşılaştırması

| Senaryo | UFW | Port Forward | Güvenlik | Zorluk |
|---------|-----|--------------|----------|---------|
| Sadece localhost | ❌ | ❌ | ✅✅✅ | Çok Kolay |
| Lokal ağ | ✅ | ❌ | ✅✅ | Kolay |
| İnternet (direkt) | ✅ | ✅ | ⚠️ | Orta |
| VPN | ✅ | ❌ | ✅✅✅ | Orta |
| Cloudflare Tunnel | ❌ | ❌ | ✅✅ | Kolay |
| Ngrok | ❌ | ❌ | ✅ | Çok Kolay |

---

## 🎯 Öneriler

### Test/Geliştirme İçin
1. **Lokal ağda paylaşım** → `./start-remote.sh` + `./setup-firewall.sh`
2. **Arkadaşlara göster** → Ngrok veya Cloudflare Tunnel

### Üretim İçin
1. **Zama testnet'e deploy et** (ZAMA_TESTNET.md)
2. **Public RPC kullan** (Alchemy, Infura)
3. **Frontend'i Vercel/Netlify'da host et**
4. Hardhat node'u lokal makinede TUTMA!

---

## 🛠️ Sorun Giderme

### Frontend'e erişemiyorum (lokal ağdan)
```bash
# Next.js'in 0.0.0.0'da dinlediğinden emin olun
cd /root/zamamessage/frontend
npm run dev -- -H 0.0.0.0

# UFW kurallarını kontrol edin
sudo ufw status

# Firewall'da port açık mı?
sudo netstat -tulpn | grep 3000
```

### MetaMask bağlanamıyor
```bash
# RPC URL'i kontrol edin
# .env.local içinde sunucu IP'si olmalı
cat frontend/.env.local | grep RPC_URL

# Hardhat node'un 0.0.0.0'da dinlediğini doğrulayın
ps aux | grep hardhat
sudo netstat -tulpn | grep 8545
```

### Modem port forwarding çalışmıyor
```bash
# Dış IP'den test edin (başka ağdan)
curl http://DIŞ_IP:3000

# CGN/CGNAT kontrolü (bazı ISP'ler engeller)
# Eğer özel IP alıyorsanız (100.x.x.x), ISP'niz CGNAT kullanıyor
# Çözüm: VPN veya Cloudflare Tunnel
```

---

## 📞 Yardım

Sorularınız için:
- 📖 [USAGE.md](./USAGE.md) - Detaylı kullanım
- 🌐 [ZAMA_TESTNET.md](./ZAMA_TESTNET.md) - Public network deployment
- 🎯 [QUICKSTART.md](./QUICKSTART.md) - Hızlı başlangıç
