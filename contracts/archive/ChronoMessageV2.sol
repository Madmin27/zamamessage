// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ChronoMessageV2 - Gelişmiş zaman kilitli mesajlaşma sözleşmesi
/// @author ChronoMessage
/// @notice Mesajlar belirlenen tarihe kadar kilitli kalır ve SADECE alıcı okuyabilir.
/// @dev Gönderen bile mesajı göremez, sadece alıcı görebilir.
contract ChronoMessageV2 {
    struct Message {
        address sender;      // Gönderen (mesajı göremez)
        address receiver;    // Alıcı (sadece o okuyabilir)
        uint256 unlockTime;  // Kilit açılma zamanı
        string content;      // Mesaj içeriği
        bool exists;         // Mesaj var mı?
        bool isRead;         // Okundu mu?
    }

    mapping(uint256 => Message) private messages;
    uint256 public messageCount;

    // Kullanıcının aldığı mesajları takip et
    mapping(address => uint256[]) private receivedMessages;
    
    // Kullanıcının gönderdiği mesajları takip et
    mapping(address => uint256[]) private sentMessages;

    event MessageSent(
        uint256 indexed id, 
        address indexed sender, 
        address indexed receiver, 
        uint256 unlockTime
    );
    
    event MessageRead(uint256 indexed id, address indexed reader);

    /// @notice Yeni bir mesaj oluşturur ve belirli bir alıcıya gönderir
    /// @param receiver Mesajı alacak kişinin adresi
    /// @param content Mesaj içeriği (şimdilik düz metin, ileride FHE ile şifrelenecek)
    /// @param unlockTime Mesajın açılabileceği UNIX zaman damgası
    /// @return messageId Kaydedilen mesajın kimliği
    function sendMessage(
        address receiver,
        string calldata content,
        uint256 unlockTime
    ) external returns (uint256 messageId) {
        require(receiver != address(0), "Invalid receiver address");
        require(receiver != msg.sender, "Cannot send to yourself");
        require(bytes(content).length > 0, "Empty content");
        require(unlockTime > block.timestamp, "Unlock time must be in the future");

        messageId = messageCount;
        messages[messageId] = Message({
            sender: msg.sender,
            receiver: receiver,
            unlockTime: unlockTime,
            content: content,
            exists: true,
            isRead: false
        });

        // Track messages
        receivedMessages[receiver].push(messageId);
        sentMessages[msg.sender].push(messageId);

        messageCount += 1;

        emit MessageSent(messageId, msg.sender, receiver, unlockTime);
    }

    /// @notice Mesaj içeriğini görüntüler - SADECE ALICI OKUYABİLİR
    /// @param messageId Mesaj kimliği
    /// @return content Mesajın düz metin içeriği
    function readMessage(uint256 messageId) external returns (string memory content) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        require(msg.sender == m.receiver, "Only receiver can read the message");
        require(block.timestamp >= m.unlockTime, "Message still locked");
        
        // Mark as read
        if (!m.isRead) {
            m.isRead = true;
            emit MessageRead(messageId, msg.sender);
        }
        
        return m.content;
    }

    /// @notice Mesaj içeriğini görüntüler (VIEW - gas gerektirmez)
    /// @param messageId Mesaj kimliği
    /// @return content Mesajın içeriği
    function getMessageContent(uint256 messageId) external view returns (string memory content) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        require(msg.sender == m.receiver, "Only receiver can read the message");
        require(block.timestamp >= m.unlockTime, "Message still locked");
        
        return m.content;
    }

    /// @notice Mesaj meta verilerini getirir (kilit süresi içinde de erişilebilir)
    /// @dev Alıcı ve gönderen farklı bilgiler görebilir
    /// @param messageId Mesaj kimliği
    /// @return sender Gönderen adresi
    /// @return receiver Alıcı adresi (sadece ilgili taraflar görebilir)
    /// @return unlockTime Mesaj kilidinin açılacağı zaman
    /// @return isRead Mesaj okundu mu?
    function getMessageMetadata(uint256 messageId) external view returns (
        address sender, 
        address receiver, 
        uint256 unlockTime,
        bool isRead
    ) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        
        // Sadece gönderen veya alıcı metadata görebilir
        require(
            msg.sender == m.sender || msg.sender == m.receiver,
            "Not authorized to view this message"
        );
        
        return (m.sender, m.receiver, m.unlockTime, m.isRead);
    }

    /// @notice Kullanıcının aldığı mesajları listeler
    /// @param user Kullanıcı adresi
    /// @return messageIds Alınan mesaj ID'leri
    function getReceivedMessages(address user) external view returns (uint256[] memory) {
        return receivedMessages[user];
    }

    /// @notice Kullanıcının gönderdiği mesajları listeler
    /// @param user Kullanıcı adresi
    /// @return messageIds Gönderilen mesaj ID'leri
    function getSentMessages(address user) external view returns (uint256[] memory) {
        return sentMessages[user];
    }

    /// @notice Kullanıcının okunmamış mesaj sayısını döndürür
    /// @param user Kullanıcı adresi
    /// @return count Okunmamış mesaj sayısı
    function getUnreadCount(address user) external view returns (uint256 count) {
        uint256[] memory received = receivedMessages[user];
        count = 0;
        
        for (uint256 i = 0; i < received.length; i++) {
            Message storage m = messages[received[i]];
            if (!m.isRead && block.timestamp >= m.unlockTime) {
                count++;
            }
        }
        
        return count;
    }

    /// @notice Bir mesajın kilidinin açılıp açılmadığını kontrol eder
    /// @param messageId Mesaj kimliği
    /// @return Kilit açık mı?
    function isUnlocked(uint256 messageId) external view returns (bool) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        return block.timestamp >= m.unlockTime;
    }
}
