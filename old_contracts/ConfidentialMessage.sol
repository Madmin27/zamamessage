// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialMessage
/// @notice EmelMarket'ın ConfidentialWETH pattern'ini mesajlar için uygular
/// @dev ConfidentialFungibleToken gibi çalışır ama token yerine mesaj tutar
/// @dev KEY INSIGHT: EmelMarket euint64 kullanıyor, biz de aynısını kullanacağız
///      euint256 yerine euint64 - daha küçük ama mesajlar için yeterli
contract ConfidentialMessage is SepoliaConfig {
    using FHE for *;
    
    struct Message {
        address sender;
        address receiver;
        uint256 unlockTime;
        euint64 encryptedContent;  // ✅ CHANGED: euint256 → euint64 (EmelMarket pattern)
        bool exists;
        bool isDecrypted;  // Decrypt edilmiş mi?
    }
    
    mapping(uint256 => Message) private messages;
    uint256 public messageCount;
    
    event MessageSent(
        uint256 indexed messageId,
        address indexed sender,
        address indexed receiver,
        uint256 unlockTime
    );
    
    event MessageRead(
        uint256 indexed messageId,
        address indexed reader
    );
    
    /// @notice Şifreli mesaj gönder - EmelMarket bid() pattern'i
    /// @param receiver Mesajı alacak adres
    /// @param encryptedContent FHE ile şifrelenmiş mesaj handle (bytes32) - euint64
    /// @param inputProof Şifreleme kanıtı
    /// @param unlockTime Mesajın açılabileceği Unix timestamp
    /// @return messageId Oluşturulan mesajın ID'si
    function sendMessage(
        address receiver,
        externalEuint64 encryptedContent,  // ✅ CHANGED: externalEuint256 → externalEuint64
        bytes calldata inputProof,
        uint256 unlockTime
    ) external returns (uint256 messageId) {
        require(receiver != address(0), "Invalid receiver address");
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        
        messageId = messageCount++;
        
        // EmelMarket pattern: FHE.fromExternal → euint64'ye dönüştür
        // Bu işlem coprocessor'a gitmeden yapılıyor!
        euint64 content = FHE.fromExternal(encryptedContent, inputProof);
        
        // Store encrypted content - on-chain state
        messages[messageId] = Message({
            sender: msg.sender,
            receiver: receiver,
            unlockTime: unlockTime,
            encryptedContent: content,
            exists: true,
            isDecrypted: false
        });
        
        // Allow receiver to read this encrypted value
        // EmelMarket'ın FHE.allow() pattern'i
        FHE.allowThis(content);
        FHE.allow(content, receiver);
        
        emit MessageSent(messageId, msg.sender, receiver, unlockTime);
        
        return messageId;
    }
    
    /// @notice Mesajı oku - sadece alıcı ve unlockTime geçtikten sonra
    /// @param messageId Okunacak mesajın ID'si
    /// @return content Şifreli mesaj içeriği (decrypt için ACL permission gerekli)
    function readMessage(uint256 messageId) external view returns (euint64 content) {  // ✅ CHANGED: euint256 → euint64
        Message storage message = messages[messageId];
        
        require(message.exists, "Message does not exist");
        require(msg.sender == message.receiver, "Not the receiver");
        require(block.timestamp >= message.unlockTime, "Message is still locked");
        
        // Return encrypted content - frontend will decrypt with user's private key
        // EmelMarket'ın getEncryptedBid() fonksiyonu gibi
        return message.encryptedContent;
    }
    
    /// @notice Mesaj bilgilerini getir (public metadata)
    function getMessageInfo(uint256 messageId) external view returns (
        address sender,
        address receiver,
        uint256 unlockTime,
        bool exists
    ) {
        Message storage message = messages[messageId];
        return (
            message.sender,
            message.receiver,
            message.unlockTime,
            message.exists
        );
    }
    
    /// @notice Kullanıcının aldığı mesajları listele
    function getReceivedMessages(address user) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](messageCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < messageCount; i++) {
            if (messages[i].exists && messages[i].receiver == user) {
                temp[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }
    
    /// @notice Kullanıcının gönderdiği mesajları listele
    function getSentMessages(address user) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](messageCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < messageCount; i++) {
            if (messages[i].exists && messages[i].sender == user) {
                temp[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }
}
