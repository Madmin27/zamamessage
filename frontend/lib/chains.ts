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
    factoryAddress: '0x86D0b9c5579578E2029A504DD40254f76eFaa827', // ✅ V3 (Security Fix)
    versions: [
      {
        key: 'v3_secure',
        label: 'ChronoMessage v3.1 (Security Fix)',
        address: '0x86D0b9c5579578E2029A504DD40254f76eFaa827',
        description: 'Multi-condition + Payment timestamp validation',
        deployedAt: '2025-10-11',
        isDefault: true
      },
      {
        key: 'v3',
        label: 'ChronoMessage v3 (Deprecated)',
        address: '0x665a26E1B4eeDB6D33a4B50d25eD0c2FEfA1102f',
        description: '⚠️ Security issue - do not use',
        deployedAt: '2025-10-11',
        isDefault: false
      },
      {
        key: 'v2_2',
        label: 'SealedMessage v2.2',
        address: '0xA52bD90D699D00781F6610631E22703526c69aF5',
        deployedAt: '2025-10-06',
        isDefault: false
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
    factoryAddress: '0x9C01F6fC426028d327a668E52d311042Cf3b38F3', // ✅ V3.1 (Security Fix)
    versions: [
      {
        key: 'v3_secure',
        label: 'ChronoMessage v3.1 (Security Fix)',
        address: '0x9C01F6fC426028d327a668E52d311042Cf3b38F3',
        description: 'Multi-condition + Payment timestamp validation',
        deployedAt: '2025-10-11',
        isDefault: true
      },
      {
        key: 'v3',
        label: 'ChronoMessage v3 (Deprecated)',
        address: '0xf95C75Ae510e05B1cf6B0d810BAc38be8Bb57Faa',
        description: '⚠️ Do not use',
        deployedAt: '2025-10-11',
        isDefault: false
      },
      {
        key: 'v2',
        label: 'SealedMessage v2',
        address: '0xa1495F1a4c93e1acD5d178270404C8e8b225C4B5',
        deployedAt: '2025-10-07',
        isDefault: false
      }
    ],
    faucet: 'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet'
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
    factoryAddress: '0x55A6659286ef8D82c97E5cf243731e6f960a8EbD', // ✅ V3.1 (Security Fix)
    versions: [
      {
        key: 'v3_secure',
        label: 'ChronoMessage v3.1 (Security Fix)',
        address: '0x55A6659286ef8D82c97E5cf243731e6f960a8EbD',
        description: 'Multi-condition + Payment timestamp validation',
        deployedAt: '2025-10-11',
        isDefault: true
      },
      {
        key: 'v3',
        label: 'ChronoMessage v3 (Deprecated)',
        address: '0xcDF777FbB6aBa2c4C54Ff2a91B2b2Ef7708597e4',
        description: '⚠️ Do not use',
        deployedAt: '2025-10-11',
        isDefault: false
      },
      {
        key: 'v2',
        label: 'SealedMessage v2',
        address: '0xa1495F1a4c93e1acD5d178270404C8e8b225C4B5',
        deployedAt: '2025-10-10',
        isDefault: false
      }
    ],
    faucet: 'https://scroll.io/alpha/faucet'
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
