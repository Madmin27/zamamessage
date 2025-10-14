// ========================================
// ZAMA FHE ONLY - No Version Switching
// ========================================

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
  zamaContractAddress: `0x${string}`; // Tek kontrat - Zama FHE
  faucet?: string;
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
    zamaContractAddress: '0xbD9212F5Df6073a86E6E43813bEDd026C9561468', // ✅ ChronoMessageZama (Sepolia)
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
    zamaContractAddress: '0xb2aaF71A28B16c0940320dd1A7D9ecce01f2D01f',
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
    zamaContractAddress: '0x7aA33fF1b5e1183334653983e75165Eefd71c481',
    faucet: 'https://scroll.io/alpha/faucet'
  }
};

export type ChainKey = keyof typeof supportedChains;
export type ChainConfig = ChainDefinition;

// ========================================
// Helper Functions - Zama FHE Only
// ========================================

// Get chain config by ID
export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(supportedChains).find(chain => chain.id === chainId);
}

// Check if chain is supported
export function isChainSupported(chainId: number): boolean {
  return Object.values(supportedChains).some(chain => chain.id === chainId);
}

// Get Zama contract address for chain
export function getZamaContractAddress(chainId: number): `0x${string}` | undefined {
  const chain = getChainById(chainId);
  return chain?.zamaContractAddress !== ZERO_ADDRESS ? chain?.zamaContractAddress : undefined;
}
