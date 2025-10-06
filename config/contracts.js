/**
 * MERKEZI CONTRACT AYARLARI
 * Tüm script'ler ve dokümantasyonlar bu dosyadan contract adresini alır
 */

export const CONTRACTS = {
  // AKTIF CONTRACT (V2.1)
  ACTIVE: {
    address: "0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3",
    version: "V2.1",
    network: "sepolia",
    deployedAt: "2025-10-05",
    features: [
      "Receiver-only privacy",
      "Time-locked messages", 
      "getMessageContent (view)",
      "readMessage (transaction)"
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
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io"
  }
};

// Helper function
export function getExplorerUrl(address: string, network: string = "sepolia"): string {
  const explorerBase = NETWORKS.SEPOLIA.explorer;
  return `${explorerBase}/address/${address}`;
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
