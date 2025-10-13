// Contract configuration for ConfidentialMessage
export const CONFIDENTIAL_MESSAGE = {
  address: "0xB274067B551FaA7c79a146B5215136454aE912bB",
  chainId: 11155111, // Sepolia
  network: "sepolia",
  deployedAt: "2025-01-13",
  pattern: "EmelMarket ConfidentialWETH Pattern",
  improvements: [
    "✅ Uses externalEuint256 with FHE.fromExternal()",
    "✅ All operations on-chain (no coprocessor dependency)",
    "✅ FHE.allowThis() + FHE.allow() for ACL permissions",
    "✅ Frontend decrypts with user's private key",
    "✅ Proven pattern - same as working EmelMarket contracts"
  ]
};

// Old contract (deprecated)
export const CHRONO_MESSAGE_ZAMA_OLD = {
  address: "0x65016d7E35EC1830d599991d82381bf03eEC2987",
  status: "DEPRECATED - Coprocessor dependency issue"
};
