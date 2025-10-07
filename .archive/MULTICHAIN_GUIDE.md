# 🌐 Multi-Chain Deployment Guide

ChronoMessage contract'ınızı farklı EVM ağlarına deploy edebilirsiniz.

## 📊 Desteklenen Ağlar

| Ağ | Network ID | Chain ID | Maliyet | Kullanım |
|-----|-----------|----------|---------|----------|
| **Hardhat Local** | `localhost` | 31337 | Ücretsiz | Geliştirme |
| **Sepolia Testnet** | `sepolia` | 11155111 | Ücretsiz | Test |
| **Ethereum Mainnet** | `mainnet` | 1 | Yüksek ($$$) | Production |
| **Polygon Mumbai** | `mumbai` | 80001 | Ücretsiz | Test |
| **Polygon Mainnet** | `polygon` | 137 | Düşük ($) | Production |

## 🚀 Hızlı Başlangıç

### 1️⃣ Lokal Test (ÜCRETSİZ - Şu an çalışıyor!)

```bash
# Zaten çalışıyor! ✅
# http://localhost:3000
```

### 2️⃣ Sepolia Testnet (ÜCRETSİZ - Önerilen ilk adım)

```bash
# 1. Hızlı rehberi okuyun
cat SEPOLIA_QUICKSTART.md

# 2. .env dosyasını düzenleyin
nano .env
# SEPOLIA_RPC_URL ve PRIVATE_KEY ekleyin

# 3. Hazırlık kontrolü
./check-sepolia.sh

# 4. Deploy!
npx hardhat run scripts/deploy.ts --network sepolia
```

**Detaylı rehber:** `SEPOLIA_DEPLOYMENT.md`

### 3️⃣ Polygon Mumbai (ÜCRETSİZ - Daha hızlı ve ucuz)

```bash
# .env dosyasında
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xYOUR_KEY
POLYGONSCAN_API_KEY=YOUR_KEY

# Deploy
npx hardhat run scripts/deploy.ts --network mumbai

# Faucet: https://faucet.polygon.technology/
```

### 4️⃣ Production Mainnet (GERÇEK PARA!)

```bash
# Ethereum Mainnet (Pahalı!)
npx hardhat run scripts/deploy.ts --network mainnet

# Polygon Mainnet (Ucuz - Önerilen)
npx hardhat run scripts/deploy.ts --network polygon
```

## 🔑 Yapılandırma

### RPC Provider'lar (Ücretsiz)

**Alchemy** (Önerilen)
- https://www.alchemy.com/
- Günde 300M requests (ücretsiz tier)

**Infura**
- https://infura.io/
- Günde 100K requests (ücretsiz tier)

**Public RPC** (Rate limit var)
- Sepolia: `https://rpc.sepolia.org`
- Mumbai: `https://rpc-mumbai.maticvigil.com`

### Faucet'ler (Test ETH/MATIC)

**Sepolia ETH:**
- https://sepoliafaucet.com/
- https://faucets.chain.link/sepolia

**Mumbai MATIC:**
- https://faucet.polygon.technology/
- https://mumbaifaucet.com/

## 📝 .env Yapılandırma Şablonu

```bash
# === LOKAL NETWORK ===
RPC_URL=http://127.0.0.1:8547
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CHAIN_ID=31337

# === SEPOLIA TESTNET ===
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY

# === POLYGON MUMBAI TESTNET ===
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_KEY

# === MAINNET (DİKKATLİ!) ===
# MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
# POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## 🛠️ Deployment Komutları

```bash
# Network listesi
npx hardhat --help

# Belirli ağa deploy
npx hardhat run scripts/deploy.ts --network <network-name>

# Contract verify (Etherscan'de görünsün)
npx hardhat verify --network <network-name> <contract-address>

# Deployment bilgilerini gör
cat deployments/<network-name>.json
```

## 📊 Maliyet Karşılaştırması

### Deployment Maliyeti

| Ağ | Deploy | Send Message | Total (100 msg) |
|-----|--------|--------------|-----------------|
| Hardhat | $0 | $0 | $0 |
| Sepolia | $0 | $0 | $0 |
| Ethereum | $50-200 | $5-20 | $700-2200 |
| Polygon | $0.50-2 | $0.05-0.20 | $5.50-22 |

**Öneri:** Production için Polygon kullanın! 100x daha ucuz ⚡

## 🧪 Frontend'i Farklı Ağlara Bağlama

Deploy sonrası frontend'i güncelleyin:

```bash
# frontend/.env.local
CONTRACT_ADDRESS=0xYENI_CONTRACT_ADDRESS
RPC_URL=https://NETWORK_RPC_URL
```

## 🔍 Explorer'lar

- **Sepolia:** https://sepolia.etherscan.io/
- **Ethereum:** https://etherscan.io/
- **Polygon:** https://polygonscan.com/
- **Mumbai:** https://mumbai.polygonscan.com/

## ⚠️ Güvenlik Uyarıları

1. **ASLA mainnet'te test private key kullanmayın!**
2. **Private key'leri GitHub'a pushlmayın!** (`.env` zaten .gitignore'da)
3. **Yeni deployment için her zaman yeni cüzdan oluşturun**
4. **Test ağlarında önce deneyin**

## 🎯 Önerilen Yol Haritası

1. ✅ **Lokal test** (Tamamlandı!)
2. 🧪 **Sepolia deployment** (Şimdi bu!)
3. 🚀 **Mumbai deployment** (Hızlı, ucuz)
4. ⚡ **Polygon mainnet** (Production, ucuz)
5. 🏆 **Ethereum mainnet** (Gerekirse, pahalı)

## 📚 Detaylı Rehberler

- **Sepolia:** `SEPOLIA_DEPLOYMENT.md` ve `SEPOLIA_QUICKSTART.md`
- **Genel Kullanım:** `USAGE.md`
- **Hızlı Başlangıç:** `QUICKSTART.md`

## 💡 İpuçları

- İlk deployment her zaman Sepolia'da yapın (ücretsiz!)
- Gas fiyatları değişkendir, sabah erkenden daha ucuz
- Polygon mainnet Ethereum mainnet'in 1/100 maliyeti
- Contract verify'i unutmayın (Etherscan'de görünsün)
- Deployment'ları `deployments/` klasöründe takip edin

## 🆘 Yardım

```bash
# Deployment kontrolü
./check-sepolia.sh

# Hardhat yardım
npx hardhat help

# Network durumu
npx hardhat console --network <network-name>
```

---

**Hazırsınız!** Sepolia'dan başlayın: `cat SEPOLIA_QUICKSTART.md` 🚀
