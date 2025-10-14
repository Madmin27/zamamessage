// ConfidentialMessage ABI - EmelMarket Pattern
// Contract: 0xB274067B551FaA7c79a146B5215136454aE912bB
// Network: Sepolia

export const confidentialMessageAbi = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "messageId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "reader", "type": "address" }
    ],
    "name": "MessageRead",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "messageId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "unlockTime", "type": "uint256" }
    ],
    "name": "MessageSent",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "messageId", "type": "uint256" }],
    "name": "getMessageInfo",
    "outputs": [
      { "internalType": "address", "name": "sender", "type": "address" },
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "uint256", "name": "unlockTime", "type": "uint256" },
      { "internalType": "bool", "name": "exists", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getReceivedMessages",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getSentMessages",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "messageCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "messageId", "type": "uint256" }],
    "name": "readMessage",
    "outputs": [{ "internalType": "euint64", "name": "content", "type": "uint256" }],  // ✅ CHANGED: euint256 → euint64
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "externalEuint64", "name": "encryptedContent", "type": "bytes32" },
      { "internalType": "bytes", "name": "inputProof", "type": "bytes" },
      { "internalType": "uint256", "name": "unlockTime", "type": "uint256" }
    ],
    "name": "sendMessage",
    "outputs": [{ "internalType": "uint256", "name": "messageId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// For backward compatibility - use new ABI
export const chronoMessageZamaAbi = confidentialMessageAbi;
