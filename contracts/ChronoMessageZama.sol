// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, externalEuint256, euint256} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ChronoMessageZama
/// @notice Time-locked confidential messaging contract backed by Zama FHEVM on Sepolia
/// @dev Uses the latest @fhevm/solidity@0.7.0 `fromExternal` pattern to accept relayer encrypted inputs
contract ChronoMessageZama is SepoliaConfig {
    struct Message {
        address sender;
        address receiver;
        uint256 unlockTime;
        euint256 encryptedContent;
        uint256 requiredPayment; // 💰 Payment amount in wei (plain text - not sensitive)
        uint8 conditionMask;     // 🎭 Bit mask (0x01=time, 0x02=payment, 0x03=both)
        bool exists;
        bool paymentReceived;    // 🔒 SECURITY: Track if payment was already claimed
        
        // 📋 METADATA: Public preview information (visible even when locked)
        string fileName;         // File name (e.g., "document.pdf", "photo.jpg")
        uint256 fileSize;        // File size in bytes
        string contentType;      // MIME type (e.g., "image/png", "application/pdf")
        string previewImageHash; // IPFS hash for image preview (if applicable)
    }

    mapping(uint256 => Message) private _messages;
    mapping(address => uint256[]) private _sentMessages;
    mapping(address => uint256[]) private _receivedMessages;
    uint256 public messageCount;

    event MessageSent(uint256 indexed messageId, address indexed sender, address indexed receiver, uint256 unlockTime);
    event MessageRead(uint256 indexed messageId, address indexed reader);

    /// @notice Stores an encrypted message with optional time/payment conditions
    /// @param receiver Address that can decrypt the message once unlocked
    /// @param encryptedContent Encrypted message content (euint256 handle)
    /// @param inputProof Proof returned by the relayer SDK to authorise the handle usage
    /// @param unlockTime Unix timestamp when message unlocks (0 if time condition disabled)
    /// @param requiredPayment Payment amount in wei (0 if payment condition disabled)
    /// @param conditionMask Bit mask: 0x01=time condition, 0x02=payment condition, 0x03=both
    /// @param fileName Optional file name for preview
    /// @param fileSize Optional file size in bytes
    /// @param contentType Optional MIME type (e.g., "image/png")
    /// @param previewImageHash Optional IPFS hash for image preview
    /// @return messageId Incremental identifier for the stored message
    function sendMessage(
        address receiver,
        externalEuint256 encryptedContent,
        bytes calldata inputProof,
        uint256 unlockTime,
        uint256 requiredPayment,
        uint8 conditionMask,
        string calldata fileName,
        uint256 fileSize,
        string calldata contentType,
        string calldata previewImageHash
    ) external returns (uint256 messageId) {
        require(receiver != address(0), "Invalid receiver");
        require(receiver != msg.sender, "Self messaging disabled");
        require(conditionMask > 0 && conditionMask <= 3, "Invalid mask");

        // 🔒 SECURITY: Validate mask-payment consistency
        if (conditionMask & 0x02 != 0) {
            require(requiredPayment > 0, "Payment amount must be > 0 when payment condition enabled");
        } else {
            require(requiredPayment == 0, "Payment must be 0 when payment condition disabled");
        }

        // Validate unlock time (only if time condition enabled)
        if (conditionMask & 0x01 != 0) {
            require(unlockTime > block.timestamp, "Unlock must be future");
        } else {
            require(unlockTime == 0, "Unlock time must be 0 when time condition disabled");
        }

        // Import encrypted content
        euint256 encrypted = FHE.fromExternal(encryptedContent, inputProof);

        messageId = messageCount;
        messageCount++;

        _messages[messageId] = Message({
            sender: msg.sender,
            receiver: receiver,
            unlockTime: unlockTime,
            encryptedContent: encrypted,
            requiredPayment: requiredPayment,
            conditionMask: conditionMask,
            exists: true,
            paymentReceived: false,
            fileName: fileName,
            fileSize: fileSize,
            contentType: contentType,
            previewImageHash: previewImageHash
        });

        _sentMessages[msg.sender].push(messageId);
        _receivedMessages[receiver].push(messageId);

        // Grant ACL permissions
        FHE.allowThis(encrypted);
        FHE.allow(encrypted, msg.sender);
        FHE.allow(encrypted, receiver);

        emit MessageSent(messageId, msg.sender, receiver, unlockTime);
    }

    /// @notice Helper to mirror previous API for sent message counts
    function getUserMessageCount(address user) external view returns (uint256) {
        return _sentMessages[user].length;
    }

    /// @notice Returns the encrypted payload once conditions are met (time + payment if required)
    /// @param messageId Identifier of the message to read
    /// @return content Ciphertext handle to be decrypted via gateway
    function readMessage(uint256 messageId) external payable returns (euint256 content) {
        Message storage m = _messages[messageId];
        require(m.exists, "Message not found");
        require(msg.sender == m.sender || msg.sender == m.receiver, "Not authorised");

        // Check time condition (if enabled)
        if (m.conditionMask & 0x01 != 0) {
            require(block.timestamp >= m.unlockTime, "Time locked");
        }

        // 🔒 SECURITY: Check payment condition (if enabled)
        if (m.conditionMask & 0x02 != 0) {
            if (!m.paymentReceived) {
                require(msg.value >= m.requiredPayment, "Insufficient payment");
                require(m.requiredPayment > 0, "Invalid payment amount"); // Double-check
                
                // Mark payment as received BEFORE transfer (reentrancy protection)
                m.paymentReceived = true;
                
                // Transfer payment to sender
                (bool success, ) = payable(m.sender).call{value: msg.value}("");
                require(success, "Payment transfer failed");
            } else {
                // Payment zaten alındıysa, tekrar ödeme alma. Değer gönderilmişse reddet.
                require(msg.value == 0, "Payment already made; do not send value");
            }
        } else {
            // If no payment condition, ensure no value was sent
            require(msg.value == 0, "Payment not required for this message");
        }
        // Grant permission to caller for decryption (needed for gateway)
        FHE.allow(m.encryptedContent, msg.sender);

        emit MessageRead(messageId, msg.sender);
        return m.encryptedContent;
    }

    /// @notice Lightweight metadata accessor used by the frontend to populate lists
    function getMessageMetadata(uint256 messageId)
        external
        view
        returns (
            address sender, 
            address receiver, 
            uint256 unlockTime, 
            bool isUnlocked,
            uint8 conditionMask,
            uint256 requiredPayment  // ✅ YENİ: Public payment info
        )
    {
        Message storage m = _messages[messageId];
        if (!m.exists) {
            return (address(0), address(0), 0, false, 0, 0);
        }
        return (
            m.sender, 
            m.receiver, 
            m.unlockTime, 
            block.timestamp >= m.unlockTime,
            m.conditionMask,
            (m.paymentReceived ? 0 : m.requiredPayment)  // ✅ YENİ: Ödeme alındıysa 0 döndür
        );
    }
    
    /// @notice Returns required payment amount for a message (0 if no payment required)
    /// @dev Only callable by sender or receiver
    function getRequiredPayment(uint256 messageId) external view returns (uint256) {
        Message storage m = _messages[messageId];
        require(m.exists, "Message not found");
        require(msg.sender == m.sender || msg.sender == m.receiver, "Not authorised");
        
        return m.requiredPayment;
    }

    /// @notice Returns public preview metadata (visible even when locked) - 🔓 NO AUTH REQUIRED
    /// @dev This allows receivers to see file info before unlocking/paying
    /// @param messageId The message identifier
    /// @return fileName File name (e.g., "document.pdf")
    /// @return fileSize File size in bytes
    /// @return contentType MIME type (e.g., "image/png", "application/pdf")
    /// @return previewImageHash IPFS hash for image preview (empty if not applicable)
    function getMessagePreview(uint256 messageId)
        external
        view
        returns (
            string memory fileName,
            uint256 fileSize,
            string memory contentType,
            string memory previewImageHash
        )
    {
        Message storage m = _messages[messageId];
        require(m.exists, "Message not found");
        
        return (m.fileName, m.fileSize, m.contentType, m.previewImageHash);
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
