/**
 * MERKEZI CONTRACT AYARLARI
 * Tüm script'ler ve dokümantasyonlar bu dosyadan contract adresini alır
 */

export const CONTRACTS = {
  // AKTIF CONTRACT (V2.2 - Multi-chain ready)
  ACTIVE: {
    address: "0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3",
    version: "V2.2",
    network: "sepolia",
    deployedAt: "2025-10-07",
    features: [
      "Receiver-only privacy",
      "Time-locked messages", 
      "getMessageContent (view)",
      "readMessage (transaction)",
      "Multi-chain EVM support"
    ]
  },

  // ESKİ VERSIYONLAR (Referans için)
  DEPRECATED: [
    {
      address: "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2",
      version: "V2",
      reason: "Missing getMessageContent view function"
    },
    {
      address: "0x3A11204a761ee3D864870787f99fcC66f06DF6d7",
      version: "V1",
      reason: "Missing getSentMessages function"
    }
  ],

  // FACTORY (Kullanılmıyor şu an)
  FACTORY: {
    address: "0x35925e92e46e207ceCD0b49E76323213007d317e",
    network: "sepolia"
  }
};

// Export shortcuts
export const ACTIVE_CONTRACT = CONTRACTS.ACTIVE.address;
export const ACTIVE_VERSION = CONTRACTS.ACTIVE.version;

// Network bilgileri
export const NETWORKS = {
  SEPOLIA: {
    chainId: 11155111,
    name: "Sepolia",
    currency: "ETH",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    faucet: "https://sepoliafaucet.com"
  },
  BASE_SEPOLIA: {
    chainId: 84532,
    name: "Base Sepolia",
    currency: "ETH",
    rpcUrl: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    faucet: "https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
  },
  LINEA_SEPOLIA: {
    chainId: 59141,
    name: "Linea Sepolia",
    currency: "ETH",
    rpcUrl: "https://rpc.sepolia.linea.build",
    explorer: "https://sepolia.lineascan.build",
    faucet: "https://faucet.goerli.linea.build"
  },
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    currency: "ETH",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
    faucet: "https://faucet.quicknode.com/arbitrum/sepolia"
  },
  OPTIMISM_SEPOLIA: {
    chainId: 11155420,
    name: "Optimism Sepolia",
    currency: "ETH",
    rpcUrl: "https://sepolia.optimism.io",
    explorer: "https://sepolia-optimism.etherscan.io",
    faucet: "https://app.optimism.io/faucet"
  },
  POLYGON_AMOY: {
    chainId: 80002,
    name: "Polygon Amoy",
    currency: "MATIC",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    explorer: "https://amoy.polygonscan.com",
    faucet: "https://faucet.polygon.technology"
  }
};

// Helper function
export function getExplorerUrl(address, network = "sepolia") {
  const networkKey = network.toUpperCase().replace(/-/g, '_');
  const networkConfig = NETWORKS[networkKey] || NETWORKS.SEPOLIA;
  return `${networkConfig.explorer}/address/${address}`;
}

// Get network config by chainId
export function getNetworkByChainId(chainId) {
  return Object.values(NETWORKS).find(n => n.chainId === chainId);
}

console.log(`
📋 CONTRACT CONFIG LOADED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Active: ${CONTRACTS.ACTIVE.address}
🔗 Network: ${CONTRACTS.ACTIVE.network}
📌 Version: ${CONTRACTS.ACTIVE.version}
🌐 Explorer: ${getExplorerUrl(CONTRACTS.ACTIVE.address)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
