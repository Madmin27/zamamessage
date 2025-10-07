# Multi-Chain Deployment Guide - ChronoMessage V2.2

## 🌐 Supported EVM Testnets

ChronoMessage V2.2 artık birden fazla EVM uyumlu testnet'i destekliyor. Aynı contract'ı farklı ağlara deploy edebilir ve kullanıcılar tercih ettikleri ağı seçebilir.

## 📋 Supported Networks

### Ethereum Testnets
- **Sepolia** (Primary) - chainId: 11155111
  - RPC: `https://ethereum-sepolia-rpc.publicnode.com`
  - Explorer: https://sepolia.etherscan.io
  - Faucet: https://sepoliafaucet.com

### Layer 2 Testnets

#### Base Sepolia
- **Chain ID**: 84532
- **RPC**: `https://sepolia.base.org`
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Gas**: Ultra düşük (Optimistic Rollup)

#### Linea Sepolia
- **Chain ID**: 59141
- **RPC**: `https://rpc.sepolia.linea.build`
- **Explorer**: https://sepolia.lineascan.build
- **Faucet**: https://faucet.goerli.linea.build
- **Gas**: Çok düşük (zkEVM)

#### Arbitrum Sepolia
- **Chain ID**: 421614
- **RPC**: `https://sepolia-rollup.arbitrum.io/rpc`
- **Explorer**: https://sepolia.arbiscan.io
- **Faucet**: https://faucet.quicknode.com/arbitrum/sepolia
- **Gas**: Çok düşük (Optimistic Rollup)

#### Optimism Sepolia
- **Chain ID**: 11155420
- **RPC**: `https://sepolia.optimism.io`
- **Explorer**: https://sepolia-optimism.etherscan.io
- **Faucet**: https://app.optimism.io/faucet
- **Gas**: Düşük (Optimistic Rollup)

#### Polygon Amoy
- **Chain ID**: 80002
- **RPC**: `https://rpc-amoy.polygon.technology`
- **Explorer**: https://amoy.polygonscan.com
- **Faucet**: https://faucet.polygon.technology
- **Gas**: En düşük (Polygon PoS sidechain)

## 🚀 Deployment İşlemleri

### 1. Environment Setup

`.env` dosyanızı güncelleyin:

```bash
# Hangi ağa deploy edeceğinizi seçin
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
LINEA_SEPOLIA_RPC_URL="https://rpc.sepolia.linea.build"
ARBITRUM_SEPOLIA_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
OPTIMISM_SEPOLIA_RPC_URL="https://sepolia.optimism.io"
POLYGON_AMOY_RPC_URL="https://rpc-amoy.polygon.technology"

# Private key (MetaMask'tan alın)
PRIVATE_KEY="your_private_key_here"

# Explorer API keys (contract verification için)
ETHERSCAN_API_KEY="your_etherscan_api_key"
BASESCAN_API_KEY="your_basescan_api_key"
ARBISCAN_API_KEY="your_arbiscan_api_key"
# ... diğer explorer API keyleri
```

### 2. Testnet ETH Alın

Her ağ için faucet'tan test ETH alın (yukarıdaki faucet linklerini kullanın).

### 3. Deploy Contract

**Sepolia'ya:**
```bash
npx hardhat run scripts/deploy-v2.ts --network sepolia
```

**Base Sepolia'ya:**
```bash
npx hardhat run scripts/deploy-v2.ts --network baseSepolia
```

**Linea Sepolia'ya:**
```bash
npx hardhat run scripts/deploy-v2.ts --network lineaSepolia
```

**Arbitrum Sepolia'ya:**
```bash
npx hardhat run scripts/deploy-v2.ts --network arbitrumSepolia
```

**Optimism Sepolia'ya:**
```bash
npx hardhat run scripts/deploy-v2.ts --network optimismSepolia
```

**Polygon Amoy'a:**
```bash
npx hardhat run scripts/deploy-v2.ts --network polygonAmoy
```

### 4. Contract Adresini Kaydedin

Deploy çıktısında gösterilen contract adresini kopyalayın:
```
ChronoMessageV2 deployed to: 0x...
```

### 5. Frontend Konfigürasyonu

`frontend/.env.local` dosyasını güncelleyin:

```bash
# Hangi ağı kullanacaksanız onun bilgilerini girin

# Base Sepolia için:
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_CHAIN_NAME="Base Sepolia"
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"
NEXT_PUBLIC_CONTRACT_ADDRESS="0xYOUR_DEPLOYED_CONTRACT_ADDRESS"
NEXT_PUBLIC_EXPLORER_URL="https://sepolia.basescan.org"

# Linea Sepolia için:
# NEXT_PUBLIC_CHAIN_ID=59141
# NEXT_PUBLIC_CHAIN_NAME="Linea Sepolia"
# NEXT_PUBLIC_RPC_URL="https://rpc.sepolia.linea.build"
# ...
```

### 6. Frontend'i Restart Edin

```bash
sudo systemctl restart chronomessage-frontend
```

## 📊 Gas Karşılaştırması

| Ağ | Avg Gas (send) | Avg Gas (read) | Cost (USD)* |
|----|----------------|----------------|-------------|
| **Sepolia** | ~150k | ~50k | Free (testnet) |
| **Base Sepolia** | ~80k | ~30k | ~$0.01 (mainnet) |
| **Linea Sepolia** | ~70k | ~25k | ~$0.008 (mainnet) |
| **Arbitrum Sepolia** | ~85k | ~32k | ~$0.012 (mainnet) |
| **Optimism Sepolia** | ~90k | ~35k | ~$0.015 (mainnet) |
| **Polygon Amoy** | ~100k | ~40k | ~$0.001 (mainnet) |

*Mainnet fiyat tahminleri (değişkendir)

## 🎯 Hangi Ağı Seçmeliyim?

### Test Amaçlı:
- **Sepolia**: En popüler, en fazla tooling desteği
- **Base Sepolia**: Coinbase desteği, kolay faucet

### Production (Mainnet) için:
- **Polygon**: En düşük gas fees
- **Base**: Coinbase entegrasyonu, güçlü ekosistem
- **Arbitrum**: Güvenlik + düşük fee dengesi
- **Optimism**: OP Stack ekosistemi

## 🔧 Multi-Chain Frontend (Gelecek)

V3'te frontend'de ağ seçici eklenecek:
- Kullanıcılar istedikleri ağı seçebilecek
- Contract'lar her ağda farklı adreste olabilir
- Mesajlar cross-chain olmayacak (her ağ izole)

## 📚 Kaynaklar

- [Base Docs](https://docs.base.org)
- [Linea Docs](https://docs.linea.build)
- [Arbitrum Docs](https://docs.arbitrum.io)
- [Optimism Docs](https://docs.optimism.io)
- [Polygon Docs](https://docs.polygon.technology)

---

**Not**: Her ağın kendi özellikleri ve trade-off'ları var. Production deploy'dan önce kapsamlı test edin.
