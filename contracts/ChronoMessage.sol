// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ChronoMessage - Zaman kilitli mesajlaşma sözleşmesi
/// @author ChronoMessage
/// @notice Mesajlar belirlenen tarihe kadar kilitli kalır ve sadece gönderen dışında herkes açabilir.
contract ChronoMessage {
    struct Message {
        address sender;
        uint256 unlockTime;
        string content;
        bool exists;
    }

    mapping(uint256 => Message) private messages;
    uint256 public messageCount;

    event MessageSent(uint256 indexed id, address indexed sender, uint256 unlockTime);

    /// @notice Yeni bir mesaj oluşturur ve kilitli şekilde saklar.
    /// @param content Mesaj içeriği (şimdilik düz metin)
    /// @param unlockTime Mesajın açılabileceği UNIX zaman damgası
    /// @return messageId Kaydedilen mesajın kimliği
    function sendMessage(
        string calldata content,
        uint256 unlockTime
    ) external returns (uint256 messageId) {
        require(bytes(content).length > 0, "Empty content");
        require(unlockTime > block.timestamp, "Unlock time must be in the future");

        messageId = messageCount;
        messages[messageId] = Message({
            sender: msg.sender,
            unlockTime: unlockTime,
            content: content,
            exists: true
        });

        messageCount += 1;

        emit MessageSent(messageId, msg.sender, unlockTime);
    }

    /// @notice Mesaj içeriğini görüntüler (kilit açıldıysa)
    /// @param messageId Mesaj kimliği
    /// @return content Mesajın düz metin içeriği
    function readMessage(uint256 messageId) external view returns (string memory content) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        require(block.timestamp >= m.unlockTime, "Message still locked");
        return m.content;
    }

    /// @notice Mesaj meta verilerini getirir (kilit süresi içinde de erişilebilir)
    /// @param messageId Mesaj kimliği
    /// @return sender Gönderen adresi
    /// @return unlockTime Mesaj kilidinin açılacağı zaman
    function getMessageMetadata(uint256 messageId) external view returns (address sender, uint256 unlockTime) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        return (m.sender, m.unlockTime);
    }
}
