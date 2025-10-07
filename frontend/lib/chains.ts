export const supportedChains = {
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    testnet: true,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://ethereum-sepolia-rpc.publicnode.com',
      public: 'https://rpc.sepolia.org',
      infura: 'https://sepolia.infura.io/v3/e6aecc89c96940a5a671b2ad96afe68a'
    },
    blockExplorer: 'https://sepolia.etherscan.io',
    factoryAddress: '0x35925e92e46e207ceCD0b49E76323213007d317e', // ✅ Factory deployed!
    faucet: 'https://sepoliafaucet.com/'
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    network: 'base-sepolia',
    testnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://sepolia.base.org',
      public: 'https://sepolia.base.org'
    },
    blockExplorer: 'https://sepolia.basescan.org',
    factoryAddress: '0xa1495F1a4c93e1acD5d178270404C8e8b225C4B5', // ✅ Deployed!
    faucet: 'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet'
  },
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    network: 'arbitrum-sepolia',
    testnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://sepolia-rollup.arbitrum.io/rpc',
      public: 'https://sepolia-rollup.arbitrum.io/rpc'
    },
    blockExplorer: 'https://sepolia.arbiscan.io',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    faucet: 'https://faucet.quicknode.com/arbitrum/sepolia'
  },
  optimismSepolia: {
    id: 11155420,
    name: 'Optimism Sepolia',
    network: 'optimism-sepolia',
    testnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://sepolia.optimism.io',
      public: 'https://sepolia.optimism.io'
    },
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    faucet: 'https://app.optimism.io/faucet'
  },
  lineaSepolia: {
    id: 59141,
    name: 'Linea Sepolia',
    network: 'linea-sepolia',
    testnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://rpc.sepolia.linea.build',
      public: 'https://rpc.sepolia.linea.build'
    },
    blockExplorer: 'https://sepolia.lineascan.build',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    faucet: 'https://faucet.linea.build/'
  },
  polygonAmoy: {
    id: 80002,
    name: 'Polygon Amoy',
    network: 'polygon-amoy',
    testnet: true,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
      default: 'https://rpc-amoy.polygon.technology',
      public: 'https://rpc-amoy.polygon.technology'
    },
    blockExplorer: 'https://amoy.polygonscan.com',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    faucet: 'https://faucet.polygon.technology/'
  },
  base: {
    id: 8453,
    name: 'Base',
    network: 'base',
    testnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://mainnet.base.org',
      public: 'https://mainnet.base.org'
    },
    blockExplorer: 'https://basescan.org',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    faucet: undefined
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    network: 'arbitrum',
    testnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://arb1.arbitrum.io/rpc',
      public: 'https://arb1.arbitrum.io/rpc'
    },
    blockExplorer: 'https://arbiscan.io',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    faucet: undefined
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    network: 'optimism',
    testnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://mainnet.optimism.io',
      public: 'https://mainnet.optimism.io'
    },
    blockExplorer: 'https://optimistic.etherscan.io',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    faucet: undefined
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    network: 'polygon',
    testnet: false,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
      default: 'https://polygon-rpc.com',
      public: 'https://polygon-rpc.com'
    },
    blockExplorer: 'https://polygonscan.com',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    faucet: undefined
  }
};

export type ChainKey = keyof typeof supportedChains;
export type ChainConfig = typeof supportedChains[ChainKey];

// Helper: Get chain config by ID
export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(supportedChains).find(chain => chain.id === chainId);
}

// Helper: Check if chain is supported
export function isChainSupported(chainId: number): boolean {
  return Object.values(supportedChains).some(chain => chain.id === chainId);
}

// Helper: Get all testnet chains
export function getTestnetChains(): ChainConfig[] {
  return Object.values(supportedChains).filter(chain => chain.testnet);
}

// Helper: Get all mainnet chains
export function getMainnetChains(): ChainConfig[] {
  return Object.values(supportedChains).filter(chain => !chain.testnet);
}
