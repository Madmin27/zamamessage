# 🆘 Zama Destek İçin Hazırlanmış Dökümanlar

## 📋 Durum Özeti

Projemizde Zama FHE entegrasyonu yapıldı ancak `FHE.fromExternal()` çağrıları revert ediyor. Tüm teknik detaylar aşağıdaki dosyalarda toplanmıştır.

## 📁 Oluşturulan Dosyalar

### 1. 🔍 ZAMA_TROUBLESHOOTING.md
**İçerik:** Detaylı sorun analizi ve çözüm önerileri
- Çalışan ve çalışmayan bileşenler
- Kök neden analizi
- Test sonuçları
- İletişim kanalları

**Kullanım:** Discord veya GitHub issue'da paylaşmak için

### 2. 🧪 scripts/verify-zama-config.ts
**İçerik:** Otomatik konfigürasyon doğrulama scripti
- SDK konfigürasyonu kontrolü
- Sözleşme durumu kontrolü
- Şifreleme testi
- ACL/KMS adres doğrulaması
- Relayer bağlantı testi

**Çalıştırma:**
```bash
cd /root/zamamessage
npx hardhat run scripts/verify-zama-config.ts --network sepolia
```

**Çıktı Özeti:**
```
✅ FHE Instance oluşturuldu
✅ Public Key alındı (33018 bytes)
✅ Sözleşme erişilebilir
✅ Protocol ID doğru (10001)
✅ Şifreleme başarılı
✅ ACL sözleşmesi deploy edilmiş
✅ Relayer erişilebilir
❌ sendMessage gas estimation revert
```

### 3. 📄 generate-support-report.sh
**İçerik:** Zama destek ekibi için tüm bilgileri içeren rapor oluşturucu
- Sözleşme bilgileri
- Sorun tanımı
- SDK ve sözleşme konfigürasyonu
- Test sonuçları
- Geçerlilik kontrolleri
- Talep edilen destek

**Çalıştırma:**
```bash
cd /root/zamamessage
./generate-support-report.sh
```

**Çıktı:** `zama-support-report-YYYYMMDD-HHMMSS.txt` dosyası oluşturur

### 4. 🧪 scripts/test-emelmarket-encryption.ts
**İçerik:** EmelMarket sözleşmesiyle karşılaştırma testi
- Çalışan bir Zama sözleşmesiyle (cWETH) karşılaştırma
- Şifreleme formatlarını karşılaştırma
- Proof validasyon testi

**Çalıştırma:**
```bash
cd /root/zamamessage
npx hardhat run scripts/test-emelmarket-encryption.ts --network sepolia
```

## 🚀 Hızlı Başlangıç: Destek Almak İçin

### Adım 1: Doğrulama Scriptini Çalıştır
```bash
cd /root/zamamessage
npx hardhat run scripts/verify-zama-config.ts --network sepolia
```

### Adım 2: Destek Raporu Oluştur
```bash
./generate-support-report.sh
```

### Adım 3: Zama Ekibi ile İletişime Geç

**Discord (Önerilen):**
1. https://discord.gg/zama adresine git
2. `#support` veya `#fhevm` kanalına gir
3. Şu mesajı paylaş:

```
Hi Zama team,

I've deployed FHE contracts on Sepolia testnet but getting revert errors on FHE.fromExternal() calls.

Contract: 0x38756CCb09EE1719089F370a8386a772a8F7B5cf
Deployer: 0xF6D39Dda8997407110264acEc6a24345834cB639

I've created a detailed report with all configurations:
- SDK encryption works ✅
- Handle/proof formats correct ✅
- Gas estimation reverts ❌

Does my contract need to be registered with the relayer?

[Buraya zama-support-report-*.txt dosyasının içeriğini yapıştır]
```

**GitHub Issues:**
1. https://github.com/zama-ai/fhevm/issues adresine git
2. "New Issue" butonuna tıkla
3. Başlık: "FHE.fromExternal() reverting on Sepolia - Contract registration needed?"
4. Rapor dosyasının içeriğini yapıştır

## 📊 Bilinen Durum

### ✅ Çalışan Bileşenler
- Zama SDK kurulumu
- FHE instance oluşturma
- Şifreleme işlemi
- Handle/proof formatları
- ACL/KMS konfigürasyonu
- Relayer bağlantısı

### ❌ Çalışmayan Bileşenler
- `sendMessage` fonksiyonu (revert ediyor)
- `FHE.fromExternal()` proof validasyonu
- Gas estimation

### 🔍 Tahmin Edilen Sorun
Sözleşmemiz Zama relayer tarafından tanınmıyor olabilir. Relayer'ın ACL/InputVerifier listesine eklenmesi gerekebilir.

## 📞 İletişim Kanalları

- **Discord:** https://discord.gg/zama
- **GitHub:** https://github.com/zama-ai/fhevm/issues
- **Docs:** https://docs.zama.ai/fhevm
- **Email:** (docs'ta bulunabilir)

## 🔄 Sonraki Adımlar

1. ✅ Doğrulama scriptini çalıştır
2. ✅ Destek raporu oluştur
3. ⏳ Zama ekibi ile iletişime geç
4. ⏳ Sözleşme kaydı bilgisi al
5. ⏳ Kayıt tamamlandıktan sonra tekrar test et

## 💡 İpuçları

- Destek raporundaki tüm bilgileri paylaş (adresler, versiyon numaraları, vb.)
- Test scriptlerinin çıktılarını ekle
- Etherscan linklerini paylaş
- Sabırlı ol, destek ekibi genellikle 24-48 saat içinde yanıt verir

---

**Son Güncelleme:** 13 Ekim 2025
**Oluşturan:** Otomatik Script
**Durum:** 🟡 Destek Bekleniyor
