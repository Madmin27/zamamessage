# 🔐 Dosya Güvenliği İyileştirmeleri

## ✅ Yapılan İyileştirmeler

### 1. **Dosya Boyutu Kısıtlaması**
- ❌ Önceki: 50MB
- ✅ Şimdi: **25MB** (güvenlik için düşürüldü)
- Büyük dosyalar yükleme süresini artırır ve maliyet sorunlarına neden olur

### 2. **Güvenli Dosya Tipleri (Beyaz Liste)**

#### ✅ İzin Verilen Formatlar:
- 🖼️ **Resimler**: PNG, JPG, GIF, WebP, SVG
- 📄 **Dökümanlar**: PDF, TXT
- 📦 **Arşivler**: ZIP, RAR, 7Z (yeni eklendi!)
- 🎬 **Video**: MP4, WebM

#### ❌ Kaldırılan Formatlar:
- **APK (Android uygulamaları)**: Güvenlik riski nedeniyle kaldırıldı

### 3. **MIME Type Spoofing Koruması**
- Dosya uzantısı ve MIME type uyumluluğu kontrol edilir
- Örnek: `.exe` dosyası `.jpg` olarak gösterilemez
- Sahte dosya formatları engellenir

### 4. **Dosya Metadata Görünürlüğü**
- ✅ **Mesaj açılmadan önce görünen bilgiler**:
  - Dosya adı (örn: `document.pdf`)
  - Dosya boyutu (örn: `2.45 MB`)
  - Dosya tipi (örn: `application/pdf`)
  
- ⚠️ **Uyarı mesajı**: "Dosyayı açmadan önce göndereni doğrulayın"

### 5. **Geliştirilmiş Download Linkleri**
- İki farklı IPFS gateway:
  * Pinata (primary)
  * IPFS.io (fallback)
- `download` attribute ile direkt indirme
- Dosya adı korunur

## 🔒 Güvenlik Önlemleri

### Kullanıcı için:
1. **Göndereni doğrulayın**: Sadece güvendiğiniz adreslerden dosya açın
2. **Dosya tipini kontrol edin**: PDF beklerken .exe gelirse açmayın
3. **Boyutu kontrol edin**: Beklenmedik büyüklükteki dosyalara dikkat

### Sistem seviyesinde:
- ✅ MIME type whitelist (sadece güvenli tipler)
- ✅ Uzantı-tip uyumluluk kontrolü
- ✅ Boyut limiti (25MB)
- ✅ Metadata transparancy (dosya adı görünür)

## 📋 Pinata API Key Alma Adımları

### Adım 1: Hesap Oluşturun
1. https://pinata.cloud adresine gidin
2. **Sign Up** butonuna tıklayın
3. Email ve şifre ile kayıt olun
4. Email doğrulaması yapın

### Adım 2: API Key Oluşturun
1. Dashboard'da sol menüden **API Keys** seçin
2. **+ New Key** butonuna tıklayın
3. **Admin** checkbox'ını işaretleyin (zorunlu!)
4. Key name girin: `SealedMessage Production`
5. **Create Key** butonuna tıklayın

### Adım 3: Credentials'ı Kopyalayın
⚠️ **ÇOK ÖNEMLİ**: Sadece bir kez gösterilir!

Şunları kopyalayın:
- `API Key`: (örn: `a1b2c3d4e5f6g7h8`)
- `API Secret`: (örn: `x9y8z7w6v5u4t3s2r1`)

### Adım 4: .env.local Dosyasına Ekleyin

```bash
cd /root/zamamessage/frontend
nano .env.local
```

Şu satırları ekleyin:

```bash
# IPFS File Upload (Pinata)
NEXT_PUBLIC_PINATA_API_KEY=a1b2c3d4e5f6g7h8
NEXT_PUBLIC_PINATA_SECRET_KEY=x9y8z7w6v5u4t3s2r1
```

### Adım 5: Rebuild & Restart

```bash
npm run build
sudo systemctl restart sealedmessage-frontend.service
```

## 🧪 Test Etmek İçin

1. Site'ye gidin
2. "Dosya Ekle" butonuna tıklayın
3. Bir PNG resim seçin
4. Artık hata almadan yüklenecek!

## 📊 Desteklenen Format Özeti

| Format | Uzantı | MIME Type | Max Boyut | Güvenlik |
|--------|---------|-----------|-----------|----------|
| Resim | `.png, .jpg, .gif, .webp, .svg` | `image/*` | 25MB | ✅ Güvenli |
| PDF | `.pdf` | `application/pdf` | 25MB | ✅ Güvenli |
| TXT | `.txt` | `text/plain` | 25MB | ✅ Güvenli |
| ZIP | `.zip` | `application/zip` | 25MB | ⚠️ İçeriğe dikkat |
| RAR | `.rar` | `application/x-rar-compressed` | 25MB | ⚠️ İçeriğe dikkat |
| 7Z | `.7z` | `application/x-7z-compressed` | 25MB | ⚠️ İçeriğe dikkat |
| Video | `.mp4, .webm` | `video/*` | 25MB | ✅ Güvenli |

## ⚠️ Güvenlik Uyarıları

### Arşiv Dosyaları (ZIP, RAR, 7Z):
- İçeriği kontrol edemiyoruz
- Alıcı indirdikten sonra virüs taraması yapmalı
- Güvenilmeyen gönderenlerden ZIP dosyası açmayın

### Önerilen Güvenlik Önlemleri:
1. **Sadece güvendiğiniz kişilerden dosya kabul edin**
2. **İndirilen dosyaları anti-virüs ile tarayın**
3. **Beklenmedik dosya tiplerini açmayın**
4. **Büyük dosyalara şüpheyle yaklaşın**

## 🚀 Gelecek İyileştirmeler

- [ ] Client-side virus scanning (VirusTotal API)
- [ ] Dosya şifreleme (end-to-end encryption)
- [ ] Dosya sıkıştırma (otomatik optimizasyon)
- [ ] Multi-file upload (birden fazla dosya)
- [ ] Preview before send (gönderme öncesi önizleme)

## 📞 Sorun Yaşıyorsanız

### "IPFS credentials not configured" Hatası
**Çözüm**: `.env.local` dosyasında Pinata key'leri var mı kontrol edin

```bash
cat /root/zamamessage/frontend/.env.local | grep PINATA
```

Boş gelirse yukarıdaki adımları takip edin.

### "Desteklenmeyen dosya tipi" Hatası
**Çözüm**: Sadece yukarıdaki tablodaki formatları kullanın. APK artık desteklenmemektedir.

### "Dosya çok büyük" Hatası
**Çözüm**: Maksimum 25MB. Daha küçük dosya yükleyin veya sıkıştırın.

---

**Not**: Bu iyileştirmeler canlıda! Pinata key'lerini ekledikten sonra hemen kullanabilirsiniz.
