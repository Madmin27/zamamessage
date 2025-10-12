// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";

/// @title ChronoMessageZama - Zama FHE ile şifreli zaman kilitli mesajlaşma
/// @notice Mesajlar FHE ile şifrelenir ve sadece unlockTime'dan sonra okunabilir
/// @dev Zama FHEVM - Tüm EVM ağlarında çalışır (Base, Sepolia, Scroll, vb.)
/// @dev Config-free implementation - Zama kütüphaneleri otomatik ağ yapılandırması yapar
contract ChronoMessageZama {
    
    struct Message {
        address sender;
        address receiver;    // ✅ EKLENDI: Alıcı adresi
        uint256 unlockTime;
        euint256 encryptedContent;  // FHE ile şifrelenmiş mesaj içeriği (256 bit)
        bool exists;
    }
    
    mapping(uint256 => Message) private messages;
    uint256 public messageCount;
    
    event MessageSent(
        uint256 indexed messageId,
        address indexed sender,
        uint256 unlockTime
    );
    
    event MessageRead(
        uint256 indexed messageId,
        address indexed reader
    );
    
    /// @notice Şifreli mesaj gönder
    /// @param receiver Mesajı alacak adres
    /// @param encryptedContent FHE ile şifrelenmiş mesaj içeriği (externalEuint256)
    /// @param inputProof Şifreleme kanıtı
    /// @param unlockTime Mesajın açılabileceği Unix timestamp
    /// @return messageId Oluşturulan mesajın ID'si
    function sendMessage(
        address receiver,
        bytes calldata encryptedContent,
        bytes calldata inputProof,
        uint256 unlockTime
    ) external returns (uint256 messageId) {
        require(receiver != address(0), "Invalid receiver address");
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        
        // Convert encrypted bytes to euint256
        euint256 encrypted = FHE.asEuint256(encryptedContent, inputProof);
        
        messageId = messageCount;
        messageCount++;
        
        messages[messageId] = Message({
            sender: msg.sender,
            receiver: receiver,
            unlockTime: unlockTime,
            encryptedContent: encrypted,
            exists: true
        });
        
        // Access control: Contract, gönderen ve ALICI okuyabilir
        FHE.allowThis(encrypted);
        FHE.allow(encrypted, msg.sender);
        FHE.allow(encrypted, receiver);  // ✅ Alıcıya da izin ver
        
        emit MessageSent(messageId, msg.sender, unlockTime);
    }    /// @notice Şifreli mesajı al (zaman kilidi açıldıysa)
    /// @param messageId Okunacak mesajın ID'si
    /// @return encryptedContent Şifreli mesaj içeriği (decrypt için frontend'e gider)
    function readMessage(uint256 messageId) external view returns (euint256) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        require(block.timestamp >= m.unlockTime, "Message still locked");
        require(msg.sender == m.sender || msg.sender == m.receiver, "Only sender or receiver can read");
        
        return m.encryptedContent;
    }
    
    /// @notice Mesaj metadata'sını al (şifrelenmemiş bilgiler)
    /// @param messageId Mesaj ID'si
    /// @return sender Gönderen adresi
    /// @return receiver Alıcı adresi
    /// @return unlockTime Kilidi açılma zamanı
    /// @return isUnlocked Mesaj okunabilir mi?
    function getMessageMetadata(uint256 messageId) external view returns (
        address sender,
        address receiver,
        uint256 unlockTime,
        bool isUnlocked
    ) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        
        return (
            m.sender,
            m.receiver,
            m.unlockTime,
            block.timestamp >= m.unlockTime
        );
    }
    
    /// @notice Kullanıcının gönderdiği mesaj sayısını al
    /// @param user Kullanıcı adresi
    /// @return count Mesaj sayısı
    function getUserMessageCount(address user) external view returns (uint256 count) {
        for (uint256 i = 0; i < messageCount; i++) {
            if (messages[i].sender == user) {
                count++;
            }
        }
    }
    
    /// @notice Mesajın kilit durumunu kontrol et
    /// @param messageId Mesaj ID'si
    /// @return isLocked Mesaj hala kilitli mi?
    function isMessageLocked(uint256 messageId) external view returns (bool isLocked) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        return block.timestamp < m.unlockTime;
    }
}
