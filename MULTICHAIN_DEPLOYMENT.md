# 🌐 Multi-Chain Deployment Rehberi

## 📋 Desteklenen EVM Ağları

ChronoMessage dApp'i şu EVM ağlarında çalışabilir:

| Ağ | Chain ID | Durum | Contract |
|-----|----------|-------|----------|
| **Sepolia** | 11155111 | ✅ Deploy | 0x3A11...F6d7 |
| **Ethereum Mainnet** | 1 | ⏳ | - |
| **Base** | 8453 | ⏳ | - |
| **Base Sepolia** | 84532 | ⏳ | - |
| **Arbitrum** | 42161 | ⏳ | - |
| **Optimism** | 10 | ⏳ | - |
| **Polygon** | 137 | ⏳ | - |
| **Linea** | 59144 | ⏳ | - |

---

## 🎯 Seçenek 1: Tek Ağ Değiştirme (Basit)

Frontend'i başka bir ağa taşımak için:

### Adım 1: Yeni ağda contract deploy edin

```bash
# Örnek: Base Sepolia'ya deploy
npx hardhat run scripts/deploy.ts --network base-sepolia
```

### Adım 2: Frontend .env.local güncelleyin

```bash
nano /root/zamamessage/frontend/.env.local
```

**Örnek: Base Sepolia**
```properties
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYENI_CONTRACT_ADDRESS
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_CHAIN_NAME=Base Sepolia
NEXT_PUBLIC_CHAIN_KEY=base-sepolia
NEXT_PUBLIC_CHAIN_CURRENCY_NAME=Ether
NEXT_PUBLIC_CHAIN_CURRENCY_SYMBOL=ETH
NEXT_PUBLIC_CHAIN_DECIMALS=18
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.basescan.org
```

### Adım 3: Frontend restart

```bash
# Frontend terminalinde Ctrl+C
cd /root/zamamessage/frontend
npm run dev -- -H 0.0.0.0
```

---

## 🌟 Seçenek 2: Multi-Chain Support (Gelişmiş)

Kullanıcıların birden fazla ağ arasında seçim yapabilmesi için:

### Adım 1: Her ağda contract deploy edin

```bash
# Sepolia (zaten var)
✅ 0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2

# Base Sepolia
npx hardhat run scripts/deploy.ts --network base-sepolia

# Arbitrum Sepolia
npx hardhat run scripts/deploy.ts --network arbitrum-sepolia

# Optimism Sepolia
npx hardhat run scripts/deploy.ts --network optimism-sepolia
```

### Adım 2: Frontend'e Multi-Chain Config Ekle

**Yeni dosya: `frontend/lib/chains.ts`**

```typescript
export const supportedChains = {
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://sepolia.infura.io/v3/YOUR_KEY'] }
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' }
    },
    contractAddress: '0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2',
    testnet: true
  },
  base: {
    id: 8453,
    name: 'Base',
    network: 'base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://mainnet.base.org'] }
    },
    blockExplorers: {
      default: { name: 'BaseScan', url: 'https://basescan.org' }
    },
    contractAddress: '0xYOUR_BASE_CONTRACT',
    testnet: false
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    network: 'base-sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://sepolia.base.org'] }
    },
    blockExplorers: {
      default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' }
    },
    contractAddress: '0xYOUR_BASE_SEPOLIA_CONTRACT',
    testnet: true
  },
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    network: 'arbitrum-sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] }
    },
    blockExplorers: {
      default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' }
    },
    contractAddress: '0xYOUR_ARBITRUM_CONTRACT',
    testnet: true
  }
};
```

### Adım 3: Providers.tsx Güncelle

```typescript
"use client";

import { supportedChains } from "../lib/chains";

export function Providers({ children }: PropsWithChildren) {
  // Tüm chain'leri configureChains'e ekle
  const chains = Object.values(supportedChains);
  
  const { publicClient, webSocketPublicClient } = configureChains(
    chains,
    [jsonRpcProvider({ 
      rpc: (chain) => ({ 
        http: chain.rpcUrls.default.http[0] 
      }) 
    })]
  );
  
  // ... rest of the code
}
```

### Adım 4: Network Switcher Ekle

**Yeni component: `frontend/components/NetworkSwitcher.tsx`**

```typescript
"use client";

import { useNetwork, useSwitchNetwork } from 'wagmi';
import { supportedChains } from '../lib/chains';

export function NetworkSwitcher() {
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  return (
    <div className="flex gap-2">
      {Object.entries(supportedChains).map(([key, chainConfig]) => (
        <button
          key={key}
          onClick={() => switchNetwork?.(chainConfig.id)}
          className={`px-4 py-2 rounded ${
            chain?.id === chainConfig.id 
              ? 'bg-blue-600' 
              : 'bg-gray-600'
          }`}
        >
          {chainConfig.name}
        </button>
      ))}
    </div>
  );
}
```

---

## 🔧 Hardhat Config için Multi-Chain

**hardhat.config.ts güncellemesi:**

```typescript
const networks: HardhatUserConfig["networks"] = {
  // ... mevcut networks ...
  
  // Base Mainnet
  base: {
    url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    accounts: privateKey ? [privateKey] : [],
    chainId: 8453
  },
  
  // Base Sepolia
  "base-sepolia": {
    url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    accounts: privateKey ? [privateKey] : [],
    chainId: 84532
  },
  
  // Arbitrum Mainnet
  arbitrum: {
    url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    accounts: privateKey ? [privateKey] : [],
    chainId: 42161
  },
  
  // Arbitrum Sepolia
  "arbitrum-sepolia": {
    url: "https://sepolia-rollup.arbitrum.io/rpc",
    accounts: privateKey ? [privateKey] : [],
    chainId: 421614
  },
  
  // Optimism Mainnet
  optimism: {
    url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    accounts: privateKey ? [privateKey] : [],
    chainId: 10
  },
  
  // Polygon Mainnet
  polygon: {
    url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    accounts: privateKey ? [privateKey] : [],
    chainId: 137
  },
  
  // Linea Mainnet
  linea: {
    url: process.env.LINEA_RPC_URL || "https://rpc.linea.build",
    accounts: privateKey ? [privateKey] : [],
    chainId: 59144
  }
};
```

---

## 💰 Deployment Maliyetleri (Tahmini)

| Ağ | Gas Price | Deploy Maliyeti | Faucet |
|-----|-----------|-----------------|--------|
| **Sepolia** | ~30 gwei | 0.015 ETH | ✅ Ücretsiz |
| **Base Sepolia** | ~0.01 gwei | ~$0.01 | ✅ Ücretsiz |
| **Arbitrum Sepolia** | ~0.1 gwei | ~$0.05 | ✅ Ücretsiz |
| **Optimism Sepolia** | ~0.1 gwei | ~$0.05 | ✅ Ücretsiz |
| **Ethereum Mainnet** | 30-100 gwei | $50-150 | ❌ Gerçek ETH |
| **Base Mainnet** | ~0.01 gwei | ~$1 | ❌ Gerçek ETH |
| **Arbitrum Mainnet** | ~0.1 gwei | ~$5 | ❌ Gerçek ETH |
| **Polygon Mainnet** | ~100 gwei | ~$1 | ❌ Gerçek MATIC |

---

## 🎯 Hızlı Başlangıç - Başka Bir Ağa Deploy

### Örnek: Base Sepolia'ya Deploy

```bash
# 1. .env'ye Base Sepolia RPC ekleyin
echo "BASE_SEPOLIA_RPC_URL=https://sepolia.base.org" >> .env

# 2. hardhat.config.ts'ye base-sepolia network ekleyin (yukarıdaki kod)

# 3. Contract deploy edin
npx hardhat run scripts/deploy.ts --network base-sepolia

# 4. Contract address'i not edin
# Örnek: 0xABCD...1234

# 5. Frontend .env.local güncelleyin
nano frontend/.env.local
# NEXT_PUBLIC_CONTRACT_ADDRESS=0xABCD...1234
# NEXT_PUBLIC_CHAIN_ID=84532
# NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# 6. Frontend restart
cd frontend && npm run dev -- -H 0.0.0.0
```

---

## 📚 Testnet Faucet Linkleri

- **Sepolia ETH**: https://sepoliafaucet.com/
- **Base Sepolia**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **Arbitrum Sepolia**: https://faucet.quicknode.com/arbitrum/sepolia
- **Optimism Sepolia**: https://app.optimism.io/faucet

---

## ⚠️ Önemli Notlar

### 1. Contract Compatibility
✅ **ChronoMessage (Plain Text)** - Tüm EVM ağlarında çalışır
⚠️ **ChronoMessageZama (FHE)** - Sadece Sepolia'da çalışır (Zama'nın gateway'i şu an sadece Sepolia'da)

### 2. Gas Farkları
- **Ethereum L1**: Pahalı (~$50+ deployment)
- **L2'ler (Base, Arbitrum, Optimism)**: Ucuz (~$1-5)
- **Sidechains (Polygon)**: Çok ucuz (~$0.10)

### 3. Block Time
- Ethereum: ~12 saniye
- Base: ~2 saniye
- Arbitrum: ~0.25 saniye (çok hızlı)
- Polygon: ~2 saniye

---

## 🚀 Önerilen Deployment Stratejisi

### Aşama 1: Testnetlerde Test (Ücretsiz)
1. ✅ Sepolia (zaten var)
2. Base Sepolia
3. Arbitrum Sepolia

### Aşama 2: L2 Mainnetlerde Deploy (Ucuz)
1. Base Mainnet (~$1)
2. Arbitrum Mainnet (~$5)
3. Optimism Mainnet (~$5)

### Aşama 3: Ana Ağlar (Pahalı)
1. Polygon Mainnet (~$1)
2. Ethereum Mainnet (~$50-100)

---

## 📝 Deployment Checklist

- [ ] Hardhat config'e yeni network ekle
- [ ] .env'ye RPC URL ekle
- [ ] Test ETH al (faucet'tan)
- [ ] Contract deploy et
- [ ] Contract verify et (Etherscan/Basescan/vb)
- [ ] Frontend .env.local güncelle
- [ ] Frontend restart
- [ ] Test et (MetaMask ile)
- [ ] Dokümante et

---

**Hangi yaklaşımı tercih edersiniz?**
- A) Tek ağ değiştir (örn: Base Sepolia'ya geç)
- B) Multi-chain support ekle (kullanıcılar seçsin)
