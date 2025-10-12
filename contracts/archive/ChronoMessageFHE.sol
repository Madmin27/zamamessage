// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// import "fhevm/lib/TFHE.sol";

/// @title ChronoMessageFHE - FHE destekli zaman kilitli mesajlaşma (Gelecek versiyon)
/// @notice Bu kontrat gelecek FHE entegrasyonu için örnek şablondur
/// @dev Şu an yorum satırı olarak bırakılmıştır, TFHE kütüphanesi kurulunca aktif edilecek
contract ChronoMessageFHE {
    // struct EncryptedMessage {
    //     address sender;
    //     uint256 unlockTime;
    //     ebytes256 encryptedContent;  // TFHE ile şifreli içerik
    //     bool exists;
    // }

    // mapping(uint256 => EncryptedMessage) private messages;
    // uint256 public messageCount;

    // event MessageSent(uint256 indexed id, address indexed sender, uint256 unlockTime);

    // function sendEncryptedMessage(
    //     bytes calldata encryptedContent,
    //     uint256 unlockTime
    // ) external returns (uint256 messageId) {
    //     require(encryptedContent.length > 0, "Empty content");
    //     require(unlockTime > block.timestamp, "Unlock time must be in the future");

    //     messageId = messageCount;
    //     
    //     // FHE ile şifreli içeriği sakla
    //     ebytes256 encrypted = TFHE.asEbytes256(encryptedContent);
    //     
    //     messages[messageId] = EncryptedMessage({
    //         sender: msg.sender,
    //         unlockTime: unlockTime,
    //         encryptedContent: encrypted,
    //         exists: true
    //     });

    //     messageCount += 1;
    //     emit MessageSent(messageId, msg.sender, unlockTime);
    // }

    // function readEncryptedMessage(uint256 messageId) external view returns (bytes memory) {
    //     EncryptedMessage storage m = messages[messageId];
    //     require(m.exists, "Message not found");
    //     require(block.timestamp >= m.unlockTime, "Message still locked");
    //     
    //     // Sadece gönderen decrypt edebilir (access control)
    //     require(TFHE.isSenderAllowed(m.encryptedContent), "Not authorized");
    //     
    //     return TFHE.decrypt(m.encryptedContent);
    // }

    // function getMessageMetadata(uint256 messageId) external view returns (
    //     address sender,
    //     uint256 unlockTime
    // ) {
    //     EncryptedMessage storage m = messages[messageId];
    //     require(m.exists, "Message not found");
    //     return (m.sender, m.unlockTime);
    // }

    /// @notice FHE entegrasyonu için gerekli adımlar:
    /// 1. `npm install fhevm` veya ilgili TFHE Solidity kütüphanesini kurun
    /// 2. Yukarıdaki yorum satırlarını açın
    /// 3. TFHE.sol import'unu aktif edin
    /// 4. Hardhat config'e FHEVM network bilgilerini ekleyin
    /// 5. Frontend'de fhevmjs kütüphanesiyle encrypt/decrypt yapın
}
