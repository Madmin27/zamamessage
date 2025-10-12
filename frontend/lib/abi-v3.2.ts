export const chronoMessageV3_2Abi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "reader",
        "type": "address"
      }
    ],
    "name": "MessageRead",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum ChronoMessageV3_2.UnlockConditionType",
        "name": "conditionType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unlockTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "requiredPayment",
        "type": "uint256"
      }
    ],
    "name": "MessageSent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "unlocker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "unlockMethod",
        "type": "string"
      }
    ],
    "name": "MessageUnlocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalPaid",
        "type": "uint256"
      }
    ],
    "name": "PaymentMade",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldFee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newFee",
        "type": "uint256"
      }
    ],
    "name": "ProtocolFeeUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_CONTENT_SIZE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_PAYMENT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      }
    ],
    "name": "getMessageContent",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      }
    ],
    "name": "getMessageMetadata",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "unlockTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "requiredPayment",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "paidAmount",
            "type": "uint256"
          },
          {
            "internalType": "enum ChronoMessageV3_2.UnlockConditionType",
            "name": "conditionType",
            "type": "uint8"
          },
          {
            "internalType": "enum ChronoMessageV3_2.ContentType",
            "name": "contentType",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "isRead",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isUnlockedNow",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct ChronoMessageV3_2.MessageMetadata",
        "name": "metadata",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      }
    ],
    "name": "getPaymentHistory",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "payer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct ChronoMessageV3_2.Payment[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getReceivedMessages",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getSentMessages",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      }
    ],
    "name": "isUnlocked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "messageCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      }
    ],
    "name": "payToUnlock",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolFeePercent",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      }
    ],
    "name": "readMessage",
    "outputs": [
      {
        "internalType": "string",
        "name": "content",
        "type": "string"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "content",
        "type": "string"
      },
      {
        "internalType": "enum ChronoMessageV3_2.ContentType",
        "name": "contentType",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "requiredPayment",
        "type": "uint256"
      }
    ],
    "name": "sendPaymentLockedMessage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "content",
        "type": "string"
      },
      {
        "internalType": "enum ChronoMessageV3_2.ContentType",
        "name": "contentType",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "unlockTime",
        "type": "uint256"
      }
    ],
    "name": "sendTimeLockedMessage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "messageId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newFeePercent",
        "type": "uint256"
      }
    ],
    "name": "setProtocolFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawProtocolFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;
