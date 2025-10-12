# IPFS Dosya Yükleme Kurulumu (Pinata)

## 🎯 Genel Bakış

SealedMessage v3.2, mesajlara dosya eklemeyi destekler. Dosyalar **IPFS** (InterPlanetary File System) üzerinde saklanır ve blockchain'e sadece **IPFS hash** kaydedilir.

## 📋 Desteklenen Dosya Tipleri

- 🖼️ **Resimler**: PNG, JPG, GIF, WebP, SVG
- 📄 **Dökümanlar**: PDF
- 🎬 **Video**: MP4, WebM
- 📱 **Uygulama**: APK (Android app packages)
- **Maksimum boyut**: 50MB

## 🔑 Pinata API Key Oluşturma

### 1. Pinata Hesabı Oluşturun

1. https://pinata.cloud adresine gidin
2. **Sign Up** ile ücretsiz hesap oluşturun
3. Email doğrulaması yapın

### 2. API Key Oluşturun

1. Dashboard'da **API Keys** sekmesine gidin
2. **New Key** butonuna tıklayın
3. **Admin** yetkisi verin (pinFileToIPFS için gerekli)
4. İsteğe bağlı: Key'e bir isim verin (örn: "SealedMessage Production")
5. **Create Key** butonuna tıklayın
6. ⚠️ **UYARI**: API Key ve API Secret'ı hemen kopyalayın - bir daha gösterilmez!

### 3. Environment Variables Ekleyin

`.env.local` dosyasını düzenleyin:

```bash
# IPFS (Pinata) Configuration
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key_here
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key_here
```

**Örnek**:
```bash
NEXT_PUBLIC_PINATA_API_KEY=a1b2c3d4e5f6g7h8
NEXT_PUBLIC_PINATA_SECRET_KEY=x9y8z7w6v5u4t3s2r1
```

### 4. Servisi Yeniden Başlatın

```bash
cd /root/zamamessage/frontend
npm run build
sudo systemctl restart sealedmessage-frontend.service
```

## 📝 Kullanım

### Gönderici Tarafı

1. **MessageForm**'da "Dosya Ekle" butonuna tıklayın
2. Desteklenen bir dosya seçin (max 50MB)
3. Dosya otomatik olarak IPFS'e yüklenir
4. IPFS hash'i blockchain'e kaydedilir
5. Mesaj gönderilir

### Alıcı Tarafı

1. Mesaj açıldığında:
   - **Resimler**: Otomatik önizleme gösterilir
   - **Videolar**: Video player ile oynatılır
   - **PDF/APK**: İndirme linkleri gösterilir

2. IPFS Gateway'leri:
   - **Pinata Gateway**: `https://gateway.pinata.cloud/ipfs/{hash}`
   - **IPFS.io**: `https://ipfs.io/ipfs/{hash}` (fallback)

## 🔒 Güvenlik Notları

### ✅ Güvenli Yanlar

- **Dosya içeriği blockchain'de DEĞİL**: Sadece IPFS hash kaydedilir
- **IPFS kalıcıdır**: Pinning sayesinde dosya sürekli erişilebilir
- **Değiştirilemez**: IPFS hash'i dosya içeriğine göre oluşturulur

### ⚠️ Dikkat Edilmesi Gerekenler

- **IPFS herkese açıktır**: Hash'i bilen herkes dosyayı görüntüleyebilir
- **Şifreleme YOK**: Hassas dosyalar için client-side şifreleme eklenmelidir
- **Pinata limitleri**: Ücretsiz plan 1GB'a kadardır

## 🚀 Alternatif IPFS Servisler

Pinata yerine başka servisler de kullanılabilir:

### Web3.Storage (Ücretsiz)
```bash
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_token
```

### Infura IPFS
```bash
NEXT_PUBLIC_INFURA_PROJECT_ID=your_project_id
NEXT_PUBLIC_INFURA_PROJECT_SECRET=your_secret
```

### NFT.Storage (NFT için optimize)
```bash
NEXT_PUBLIC_NFT_STORAGE_TOKEN=your_token
```

## 🛠️ Troubleshooting

### "IPFS credentials not configured" Hatası

**Çözüm**: `.env.local` dosyasında API key'lerin doğru olduğundan emin olun.

```bash
# Dosyayı kontrol edin
cat /root/zamamessage/frontend/.env.local | grep PINATA
```

### "Upload failed: Unauthorized" Hatası

**Çözüm**: Pinata API key'inin **Admin** yetkisine sahip olduğunu kontrol edin.

### Dosya yüklenmiyor

**Çözüm**:
1. Dosya boyutunu kontrol edin (max 50MB)
2. Dosya tipinin desteklendiğini kontrol edin
3. Pinata quota'nızı kontrol edin (Dashboard > Usage)

### IPFS hash görüntülenmiyor

**Çözüm**: Gateway bazen yavaş olabilir. Fallback gateway'i deneyin:
- `https://ipfs.io/ipfs/{hash}`
- `https://cloudflare-ipfs.com/ipfs/{hash}`

## 📊 Bundle Size

Dosya yükleme özelliği eklendi:
- **Önceki**: 20.7 kB
- **Şimdi**: 22.5 kB
- **Artış**: +1.8 kB (+8.7%)

## 🎯 Gelecek Geliştirmeler

- [ ] Client-side şifreleme (hassas dosyalar için)
- [ ] Çoklu dosya desteği
- [ ] Sürükle-bırak yükleme
- [ ] Dosya önizlemesi (yükleme öncesi)
- [ ] IPFS cluster entegrasyonu (daha hızlı erişim)
- [ ] Video transcode (otomatik optimizasyon)

## 📞 Destek

Sorun yaşıyorsanız:
1. Console log'larını kontrol edin (F12)
2. Pinata Dashboard'u kontrol edin
3. GitHub Issues'da rapor edin

---

**Not**: Bu özellik **SealedMessage v3.2** ile gelmektedir. Eski versiyonlar (v2, v3) dosya desteği içermez.
