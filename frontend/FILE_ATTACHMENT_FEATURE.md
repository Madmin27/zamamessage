# 📎 Dosya Gönderme Özelliği - Hızlı Başlangıç

## ✅ Tamamlandı

✅ Yedek alındı: `/root/zamamessageBackup`
✅ Dosya gönderme özelliği eklendi
✅ IPFS entegrasyonu (Pinata)
✅ Dosya önizleme ve indirme
✅ Build başarılı: 22.5 kB
✅ Deploy edildi

## 🎯 Özellikler

### Desteklenen Dosya Tipleri
- 🖼️ Resimler: PNG, JPG, GIF, WebP, SVG
- 📄 PDF dökümanlar
- 🎬 Video: MP4, WebM
- 📱 APK (Android uygulamaları)
- Max boyut: 50MB

### UI/UX
- **Mesaj gönderme**: "Dosya Ekle" butonu
- **Yükleme sırasında**: Loading göstergesi
- **Başarılı yükleme**: ✅ IPFS hash gösterimi
- **Alıcı tarafı**:
  - Mesaj açılmadan: "📎 Ekli dosya var"
  - Mesaj açıldıktan sonra:
    - Resimler: Otomatik önizleme
    - Videolar: Video player
    - PDF/APK: İndirme linkleri

## ⚙️ Kurulum

### 1. Pinata API Key Alın

1. https://pinata.cloud → Ücretsiz hesap
2. API Keys → New Key → Admin yetkisi
3. API Key ve Secret'ı kopyalayın

### 2. Environment Variables

`/root/zamamessage/frontend/.env.local` dosyasını düzenleyin:

```bash
NEXT_PUBLIC_PINATA_API_KEY=your_api_key_here
NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret_key_here
```

### 3. Rebuild & Restart

```bash
cd /root/zamamessage/frontend
npm run build
sudo systemctl restart sealedmessage-frontend.service
```

## 🧪 Test Senaryoları

### Senaryo 1: Resim Gönderme
1. MessageForm'da alıcı adresi girin
2. "Dosya Ekle" → Resim seçin (örn: test.png)
3. Yükleme tamamlanana kadar bekleyin (✅ IPFS: Qm...)
4. Mesaj gönder
5. Alıcı olarak giriş yapın
6. Mesajı aç → Resim önizlemesi göreceksiniz

### Senaryo 2: PDF Gönderme
1. PDF dosyası seçin
2. Mesaj gönder
3. Alıcı açınca "Download" linkleri görür

### Senaryo 3: Video Gönderme
1. MP4/WebM dosyası seçin
2. Mesaj gönder
3. Alıcı açınca video player ile oynatabilir

## 🔍 Debugging

### Console'da görmek isteyebileceğiniz loglar

```javascript
✅ Uploaded to IPFS: QmXxxx...
📦 V3 metadata: { contentType: 1, ... }
```

### Yaygın Hatalar

**"IPFS credentials not configured"**
- Çözüm: `.env.local` dosyasını kontrol edin

**"File too large"**
- Çözüm: Maksimum 50MB, daha küçük dosya seçin

**"Unsupported file type"**
- Çözüm: Desteklenen tipler: image/*, application/pdf, video/*, APK

## 📊 Teknik Detaylar

### Smart Contract
- `ContentType enum`: 0=TEXT, 1=IPFS_HASH, 2=ENCRYPTED
- V3.2 contract zaten dosya desteğine sahipti
- Sadece frontend implementasyonu yapıldı

### Frontend Stack
- **IPFS Provider**: Pinata Cloud (ücretsiz 1GB)
- **Gateways**: 
  - Primary: `gateway.pinata.cloud`
  - Fallback: `ipfs.io`
- **Bundle Size**: 20.7 kB → 22.5 kB (+1.8 kB)

### Veri Akışı
```
Dosya Seçimi → IPFS Upload → Hash Alınır → 
Contract'a Hash Kaydedilir → Blockchain'de Saklanır →
Alıcı Mesajı Açar → IPFS'ten İndirir → Gösterir
```

## 🚀 Production Notları

### Güvenlik
- ⚠️ IPFS PUBLIC'tir - hash'i bilen herkes erişebilir
- Hassas dosyalar için client-side şifreleme eklenmelidir
- Pinata'da dosyalar PIN'lenir (kalıcıdır)

### Performans
- IPFS gateway bazen yavaş olabilir (fallback kullanın)
- Büyük dosyalar (>10MB) yüklemesi uzun sürebilir
- Video preview için buffer gerekebilir

### Maliyet
- **Pinata Free Plan**: 1GB storage, unlimited gateway
- Aşılırsa paid plan gerekir ($20/ay 10GB)

## 📚 Daha Fazla Bilgi

Detaylı kurulum ve troubleshooting için:
- [IPFS_SETUP.md](./IPFS_SETUP.md)

## 🎉 Başarılı Deploy!

Dosya gönderme özelliği artık live! Test edebilirsiniz:

1. Site'ye gidin
2. "Dosya Ekle" butonunu göreceksiniz
3. Bir resim yükleyin
4. Mesaj gönderin
5. Alıcı olarak açın ve önizlemeyi görün!

**Not**: İlk defa dosya yüklerken Pinata API key'leri gereklidir. Yoksa hata verir.
