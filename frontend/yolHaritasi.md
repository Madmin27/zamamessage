Kesinlikle zama FHE kullanılarak EVM ağlarında şifreli mesaj göndermeye çalışacağız.
Başka şifrelemler ile bypass yapma
Öncelikle sadece sepolia ağında yapacağız

Farklı test ve mainnet ağlar için de ekleyelim. Base öncelikli
 
Bir nft satılmışsa ve hangi cüzdandaysa, ona açılan mesaj



https://github.com/zama-ai/fhevm 
 burada  nasıl

https://docs.zama.ai/protocol/relayer-sdk-guides

 https://x.com/zama_fhe/status/1963526230960959991  

 emel market nft reposuna bak. hatasız çalışan bir projedir. Orada nasıl yapılmış.
https://github.com/Madmin27/open-nft-marketplace



npx hardhat compile

npm run build
cd /root/zamamessage && rm -rf .next node_modules/.cache frontend/.next frontend/node_modules/.cache
cd /root/zamamessage/frontend && npm install
cd /root/zamamessage/frontend && npm run build
sudo systemctl restart sealedmessage-frontend 

gerekiyorsa cache temizliği, rebuilt ve 
 sudo systemctl restart sealedmessage-frontend 
 
 && sleep 3 && sudo systemctl status sealedmessage-frontend


grep -EHrn "0x50587bC2bef7C66bC2952F126ADbafCc4Ab9c9D0" .

grep -EHrn "Heads-up: Zama relayer fees" . --exclude-dir=./.next/cache
grep -EHrn "unitPrice" . --exclude-dir=var --exclude=*.js
grep -EHrn "https://hepsiantep\.com" .
grep -EHrn "http://54\.38\.239\.188" . # Kendi IP adresiniz

grep -EHrn "admin58" . --exclude-dir=var
grep -EHrn "product-price" . --include=\*.js --exclude-dir=./.next/cache

 Not: 
### Zama Sepolia FHE Gönderim Planı

- Kaynaklar:
	- Forum: https://community.zama.ai/t/problem-with-relayer-v1-create-input-on-sepolia/3534/2 → `/v1/create-input` endpoint'i kaldırıldı, relayer SDK içindeki `createEncryptedInput` akışı kullanılmalı.
	- WebApp rehberi: https://docs.zama.ai/protocol/relayer-sdk-guides/development-guide/webapp → frontend tarafı için SDK init + instance örnekleri.
	- Solidity migration rehberi: https://docs.zama.ai/protocol/solidity-guides/development-guide/migration → sözleşmeleri SepoliaConfig ile uyumlu tutmak için.

- Yapılanlar:
	- `TestTFHEPattern` SepoliaConfig'ten miras alacak şekilde güncellendi ve Sepolia'da 0x07b4314c9cC7478F665416425d8d5B80Ba610eB1 adresine deploy edildi.
	- Relayer SDK `createEncryptedInput(...).add64(...).encrypt()` akışıyla test edildi; `storeValue` çağrısı başarıyla onaylandı (tx: 0xf5914…7ff9).
	- Frontend `FheProvider` ve `TestNewFHEAPI` bileşeni yeni kontrat ve varsayılan Sepolia konfigi ile çalışacak şekilde güncellendi.
	- `.env.local` üzerindeki `NEXT_PUBLIC_CONTRACT_ADDRESS` yeni kontrata alındı.

- Sıradaki adımlar:
	1. ✅ `MessageForm` akışını `createEncryptedInput` zinciriyle hizala (test bileşenindeki pattern reused).
	2. ✅ Ana mesaj kontratını yeni API ile yeniden deploy et ve adresi `.env.local` üzerinden frontend'e geçir (0xbD9212F5Df6073a86E6E43813bEDd026C9561468).
	3. ✅ Kullanıcıya $ZAMA fee gerekliliklerini anlatan uyarı/bilgi tooltip'i ekle.
	4. ⏳ Base Sepolia deployment planı için aynı pipeline'ı hazırlayıp relayer konfig override'larını environment tabanlı yap.

- Ücret Notları (Zama Confidential Blockchain Protocol):
	- ZKPoK doğrulaması, decrypt ve cross-chain bridge işlemleri $ZAMA token ile ücretli.
	- Ücretler USD bazlı; bit başına ~$0.016 – $0.0002 arası.
	- Ücreti kullanıcı, frontend ya da relayer üstlenebilir → uygulama tarafında hangi model seçileceğine karar verilmeli.
