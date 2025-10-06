// ChronoMessageV2 ABI - Receiver-based private messaging
export const chronoMessageV2Abi = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "reader", "type": "address" }
    ],
    "name": "MessageRead",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "unlockTime", "type": "uint256" }
    ],
    "name": "MessageSent",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "messageId", "type": "uint256" }],
    "name": "getMessageMetadata",
    "outputs": [
      { "internalType": "address", "name": "sender", "type": "address" },
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "uint256", "name": "unlockTime", "type": "uint256" },
      { "internalType": "bool", "name": "isRead", "type": "bool" }
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
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUnreadCount",
    "outputs": [{ "internalType": "uint256", "name": "count", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "messageId", "type": "uint256" }],
    "name": "isUnlocked",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
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
    "name": "getMessageContent",
    "outputs": [{ "internalType": "string", "name": "content", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "messageId", "type": "uint256" }],
    "name": "readMessage",
    "outputs": [{ "internalType": "string", "name": "content", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "string", "name": "content", "type": "string" },
      { "internalType": "uint256", "name": "unlockTime", "type": "uint256" }
    ],
    "name": "sendMessage",
    "outputs": [{ "internalType": "uint256", "name": "messageId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
