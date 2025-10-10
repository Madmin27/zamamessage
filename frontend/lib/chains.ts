export interface ChainVersion {
  key: string;
  label: string;
  address: `0x${string}`;
  description?: string;
  deployedAt?: string;
  isDefault?: boolean;
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type ChainDefinition = {
  id: number;
  name: string;
  network: string;
  testnet: boolean;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: {
    default: string;
    public?: string;
    infura?: string;
  };
  blockExplorer?: string;
  factoryAddress: string;
  faucet?: string;
  versions?: ChainVersion[];
};

export const supportedChains: Record<string, ChainDefinition> = {
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
    factoryAddress: '0xA52bD90D699D00781F6610631E22703526c69aF5', // ✅ V2.2 deployed!
    versions: [
      {
        key: 'v2_2',
        label: 'SealedMessage v2.2 (Latest)',
        address: '0xA52bD90D699D00781F6610631E22703526c69aF5',
        deployedAt: '2025-10-06',
        isDefault: true
      },
      {
        key: 'v2_1',
        label: 'SealedMessage v2.1 (Legacy)',
        address: '0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3',
        deployedAt: '2025-10-05',
        description: 'Read previous messages sent before v2.2 rollout'
      }
    ],
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
    versions: [
      {
        key: 'v2',
        label: 'SealedMessage v2',
        address: '0xa1495F1a4c93e1acD5d178270404C8e8b225C4B5',
        deployedAt: '2025-10-07',
        isDefault: true
      }
    ],
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
    factoryAddress: ZERO_ADDRESS,
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
    factoryAddress: ZERO_ADDRESS,
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
    factoryAddress: ZERO_ADDRESS,
    faucet: 'https://faucet.linea.build/'
  },
  scrollSepolia: {
    id: 534351,
    name: 'Scroll Sepolia',
    network: 'scroll-sepolia',
    testnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: 'https://sepolia-rpc.scroll.io',
      public: 'https://sepolia-rpc.scroll.io'
    },
    blockExplorer: 'https://sepolia.scrollscan.dev',
    factoryAddress: '0xa1495F1a4c93e1acD5d178270404C8e8b225C4B5', // ✅ Deployed!
    versions: [
      {
        key: 'v2',
        label: 'SealedMessage v2',
        address: '0xa1495F1a4c93e1acD5d178270404C8e8b225C4B5',
        deployedAt: '2025-10-10',
        isDefault: true
      }
    ],
    faucet: 'https://scroll.io/alpha/faucet'
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
    factoryAddress: ZERO_ADDRESS,
    faucet: 'https://faucet.polygon.technology/'
  },
  monadTestnet: {
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    testnet: true,
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: {
      default: 'https://rpc.ankr.com/monad_testnet',
      public: 'https://monad-testnet.drpc.org'
    },
    blockExplorer: 'https://explorer.testnet.monad.xyz',
    factoryAddress: '0xD7DE0BB23A63F920E11aaDcB77932D2f5fe4738b', // ✅ Deployed!
    versions: [
      {
        key: 'v2',
        label: 'SealedMessage v2',
        address: '0xD7DE0BB23A63F920E11aaDcB77932D2f5fe4738b',
        deployedAt: '2025-10-07',
        isDefault: true
      }
    ],
    faucet: 'https://faucet.monad.xyz/'
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
    factoryAddress: ZERO_ADDRESS,
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
    factoryAddress: ZERO_ADDRESS,
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
    factoryAddress: ZERO_ADDRESS,
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
    factoryAddress: ZERO_ADDRESS,
    faucet: undefined
  },
  monad: {
    id: 10000, // Monad mainnet chain ID (placeholder - güncel değeri kontrol edin)
    name: 'Monad',
    network: 'monad',
    testnet: false,
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: {
      default: 'https://rpc.monad.xyz',
      public: 'https://rpc.monad.xyz'
    },
    blockExplorer: 'https://explorer.monad.xyz',
    factoryAddress: ZERO_ADDRESS,
    faucet: undefined
  }
};

export type ChainKey = keyof typeof supportedChains;
export type ChainConfig = ChainDefinition;

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
