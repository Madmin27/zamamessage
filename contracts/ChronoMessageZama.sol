// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ChronoMessageZama
/// @notice Time-locked confidential messaging contract backed by Zama FHEVM on Sepolia
/// @dev Uses the latest @fhevm/solidity@0.7.0 `fromExternal` pattern to accept relayer encrypted inputs
contract ChronoMessageZama is SepoliaConfig {
    struct Message {
        address sender;
        address receiver;
        uint256 unlockTime;
        euint64 encryptedContent;
        bool exists;
    }

    mapping(uint256 => Message) private _messages;
    mapping(address => uint256[]) private _sentMessages;
    mapping(address => uint256[]) private _receivedMessages;
    uint256 public messageCount;

    event MessageSent(uint256 indexed messageId, address indexed sender, address indexed receiver, uint256 unlockTime);
    event MessageRead(uint256 indexed messageId, address indexed reader);

    /// @notice Stores an encrypted message that becomes readable after `unlockTime`
    /// @param receiver Address that can decrypt the message once unlocked
    /// @param encryptedContent Zama relayer handle (externalEuint64) produced by the SDK
    /// @param inputProof Proof returned by the relayer SDK to authorise the handle usage
    /// @param unlockTime Unix timestamp when the message becomes readable
    /// @return messageId Incremental identifier for the stored message
    function sendMessage(
        address receiver,
        externalEuint64 encryptedContent,
        bytes calldata inputProof,
        uint256 unlockTime
    ) external returns (uint256 messageId) {
        require(receiver != address(0), "Invalid receiver");
        require(receiver != msg.sender, "Self messaging disabled");
        require(unlockTime > block.timestamp, "Unlock must be future");

        euint64 encrypted = FHE.fromExternal(encryptedContent, inputProof);

        messageId = messageCount;
        messageCount++;

        _messages[messageId] = Message({
            sender: msg.sender,
            receiver: receiver,
            unlockTime: unlockTime,
            encryptedContent: encrypted,
            exists: true
        });

        _sentMessages[msg.sender].push(messageId);
        _receivedMessages[receiver].push(messageId);

        // Grant ACL permissions so both parties and the contract can operate on the ciphertext.
        FHE.allowThis(encrypted);
        FHE.allow(encrypted, msg.sender);
        FHE.allow(encrypted, receiver);

        emit MessageSent(messageId, msg.sender, receiver, unlockTime);
    }

    /// @notice Helper to mirror previous API for sent message counts
    function getUserMessageCount(address user) external view returns (uint256) {
        return _sentMessages[user].length;
    }

    /// @notice Returns the encrypted payload once the message unlocks and the caller is authorised
    /// @param messageId Identifier of the message to read
    /// @return content Ciphertext handle to be decrypted via gateway
    function readMessage(uint256 messageId) external returns (euint64 content) {
        Message storage m = _messages[messageId];
        require(m.exists, "Message not found");
        require(block.timestamp >= m.unlockTime, "Message locked");
        require(msg.sender == m.sender || msg.sender == m.receiver, "Not authorised");

        // Grant permission to caller for decryption (needed for gateway)
        FHE.allow(m.encryptedContent, msg.sender);

        emit MessageRead(messageId, msg.sender);
        return m.encryptedContent;
    }

    /// @notice Lightweight metadata accessor used by the frontend to populate lists
    function getMessageMetadata(uint256 messageId)
        external
        view
        returns (address sender, address receiver, uint256 unlockTime, bool isUnlocked)
    {
        Message storage m = _messages[messageId];
        if (!m.exists) {
            return (address(0), address(0), 0, false);
        }
        return (m.sender, m.receiver, m.unlockTime, block.timestamp >= m.unlockTime);
    }

    /// @notice Backwards-compatible metadata helper
    function getMessageInfo(uint256 messageId)
        external
        view
        returns (address sender, address receiver, uint256 unlockTime, bool exists)
    {
        Message storage m = _messages[messageId];
        if (!m.exists) {
            return (address(0), address(0), 0, false);
        }
        return (m.sender, m.receiver, m.unlockTime, true);
    }

    /// @notice Returns message ids the user has sent
    function getSentMessages(address user) external view returns (uint256[] memory messageIds) {
        uint256[] storage sent = _sentMessages[user];
        messageIds = new uint256[](sent.length);
        for (uint256 i = 0; i < sent.length; i++) {
            messageIds[i] = sent[i];
        }
    }

    /// @notice Returns message ids the user has received
    function getReceivedMessages(address user) external view returns (uint256[] memory messageIds) {
        uint256[] storage received = _receivedMessages[user];
        messageIds = new uint256[](received.length);
        for (uint256 i = 0; i < received.length; i++) {
            messageIds[i] = received[i];
        }
    }

    /// @notice Checks if a given message currently remains locked
    function isMessageLocked(uint256 messageId) external view returns (bool) {
        Message storage m = _messages[messageId];
        require(m.exists, "Message not found");
        return block.timestamp < m.unlockTime;
    }
}
