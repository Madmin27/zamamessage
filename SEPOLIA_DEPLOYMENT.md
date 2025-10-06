# Sepolia Testnet'e Deployment Rehberi

## 📋 Ön Hazırlık

### 1. Sepolia ETH Edinin (Ücretsiz)
Sepolia testnet'inde işlem yapmak için test ETH'sine ihtiyacınız var:

**Faucet'ler:**
- **Alchemy Sepolia Faucet**: https://sepoliafaucet.com/
- **Infura Sepolia Faucet**: https://www.infura.io/faucet/sepolia
- **QuickNode Faucet**: https://faucet.quicknode.com/ethereum/sepolia
- **Chainlink Faucet**: https://faucets.chain.link/sepolia

**Not:** Genellikle günde 0.5 ETH alabilirsiniz (test için yeterli)

### 2. RPC Provider Seçin

**Ücretsiz Seçenekler:**

#### A) Alchemy (Önerilen)
1. https://www.alchemy.com/ adresine gidin
2. Ücretsiz hesap oluşturun
3. "Create App" → Ethereum → Sepolia seçin
4. API Key'inizi kopyalayın
5. URL formatı: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

#### B) Infura
1. https://infura.io/ adresine gidin
2. Ücretsiz hesap oluşturun
3. "Create New Key" → Web3 API → Sepolia
4. Project ID'nizi kopyalayın
5. URL formatı: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

#### C) Public RPC (Rate limit var)
- `https://rpc.sepolia.org`
- `https://ethereum-sepolia.publicnode.com`

### 3. Etherscan API Key (Contract Verification için)
1. https://etherscan.io/register adresine gidin
2. Hesap oluşturun
3. API-Keys → Add → API Key oluşturun
4. Key'i kopyalayın

## 🔧 Yapılandırma

### .env Dosyasını Düzenleyin

```bash
# .env dosyasını açın
nano /root/zamamessage/.env
```

**Şu satırları uncomment edip doldurun:**

```bash
# Sepolia RPC URL (Alchemy örneği)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/BURAYA_API_KEY_YAZIN

# Etherscan API Key (contract verification için)
ETHERSCAN_API_KEY=BURAYA_ETHERSCAN_API_KEY_YAZIN

# Kendi cüzdanınızın private key'i
PRIVATE_KEY=0xBURAYA_KENDI_PRIVATE_KEY_INIZI_YAZIN
```

### ⚠️ Private Key Güvenliği

**ASLA GERÇEK PARAYLA DOLU CÜZDANINIZI KULLANMAYIN!**

Yeni bir test cüzdanı oluşturun:
```bash
# Yeni cüzdan oluştur
npx hardhat console
> const wallet = ethers.Wallet.createRandom()
> console.log('Address:', wallet.address)
> console.log('Private Key:', wallet.privateKey)
> .exit
```

Bu yeni cüzdana faucet'ten Sepolia ETH gönderin.

## 🚀 Deployment

### 1. Contract'ı Deploy Edin

```bash
cd /root/zamamessage
npx hardhat run scripts/deploy.ts --network sepolia
```

**Beklenen çıktı:**
```
Deploying ChronoMessage...
ChronoMessage deployed to: 0x1234567890abcdef...
Deployment saved to: deployments/sepolia.json
```

### 2. Contract'ı Verify Edin (Etherscan'de görünmesi için)

```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS_BURAYA
```

**Örnek:**
```bash
npx hardhat verify --network sepolia 0x1234567890abcdef1234567890abcdef12345678
```

Başarılı olursa Etherscan URL'i göreceksiniz:
```
Successfully verified contract ChronoMessage on Etherscan.
https://sepolia.etherscan.io/address/0x1234567890abcdef...#code
```

## 🌐 Frontend'i Güncelleme

### 1. Frontend .env.local Dosyasını Güncelleyin

```bash
nano /root/zamamessage/frontend/.env.local
```

**Sepolia için:**
```bash
CONTRACT_ADDRESS=0xYENI_SEPOLIA_CONTRACT_ADDRESS
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
CHAIN_ID=11155111
```

### 2. Providers.tsx'i Güncelleyin

`/root/zamamessage/frontend/components/Providers.tsx` dosyasında chain tanımını değiştirin:

```typescript
const sepoliaChain = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY'] },
    public: { http: ['https://rpc.sepolia.org'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};
```

## 🧪 Test

### 1. MetaMask'a Sepolia Ağını Ekleyin

MetaMask zaten Sepolia'yı içerir:
- Networks → Add Network → Sepolia test network

### 2. Frontend'i Açın

```bash
cd /root/zamamessage/frontend
npm run dev
```

http://localhost:3000 adresine gidin

### 3. Test Mesajı Gönderin

1. MetaMask'ı Sepolia ağına geçirin
2. Wallet'ınızı bağlayın
3. Bir mesaj yazın
4. Unlock zamanını seçin
5. "Send Message" tıklayın
6. MetaMask'ta işlemi onaylayın

**İşlem süresi:** Sepolia'da 15-30 saniye sürebilir (Hardhat'te anında)

### 4. Etherscan'de İzleyin

İşlem hash'ini kopyalayın ve Etherscan'de arayın:
https://sepolia.etherscan.io/tx/TRANSACTION_HASH

## 💰 Maliyet Tahmini

**Sepolia (Testnet):**
- Deploy: ~0.01-0.05 Sepolia ETH (ücretsiz)
- Send Message: ~0.001-0.005 Sepolia ETH (ücretsiz)

**Ethereum Mainnet (Gerçek):**
- Deploy: ~$20-100 USD (gas fiyatına göre)
- Send Message: ~$2-10 USD (gas fiyatına göre)

**Polygon Mainnet (Daha Ucuz):**
- Deploy: ~$0.50-2 USD
- Send Message: ~$0.05-0.20 USD

## 🔍 Troubleshooting

### Hata: "Insufficient funds"
- Faucet'ten daha fazla Sepolia ETH alın
- Cüzdan bakiyenizi kontrol edin: https://sepolia.etherscan.io/address/YOUR_ADDRESS

### Hata: "Nonce too high"
- MetaMask'ta hesabı sıfırlayın: Settings → Advanced → Reset Account

### Hata: "Network error"
- RPC URL'i doğru mu kontrol edin
- Alchemy/Infura dashboard'da rate limit'e takıldınız mı kontrol edin

### Hata: "Contract not verified"
- `npx hardhat verify` komutunu tekrar çalıştırın
- Etherscan API key'i doğru mu kontrol edin

## 📚 Kaynaklar

- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Alchemy Dashboard**: https://dashboard.alchemy.com/
- **Infura Dashboard**: https://infura.io/dashboard
- **Sepolia Faucet List**: https://github.com/ethereum/ethereum-org-website/blob/dev/src/data/networks.json

## 🎯 Sonraki Adımlar

1. ✅ Sepolia'da test edin
2. 🔄 Polygon Mumbai'ye deploy edin (daha hızlı, daha ucuz)
3. 🚀 Production için mainnet'i değerlendirin
4. 🔒 FHE entegrasyonu için Zama testnet'e geçin

---

**Sorularınız için:** Bu rehberdeki adımları takip edin. Sorun yaşarsanız terminal çıktılarını paylaşın!
