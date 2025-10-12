// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ChronoMessageV3_2 - GÜVENLİK GÜNCELLEMESI: HYBRID mod kaldırıldı
/// @author ChronoMessage
/// @notice V3.2: Sadece TIME_LOCK veya PAYMENT. Hibrit mod güvenlik açığı nedeniyle kaldırıldı.
/// @dev Değişiklikler:
///      - HYBRID enum değeri kaldırıldı
///      - Sadece TIME_LOCK (zaman kilitli) veya PAYMENT (ücretli) destekleniyor
///      - PAYMENT modunda unlockTime=0 olmalı (zaman şartı yok)
///      - TIME_LOCK modunda requiredPayment=0 olmalı (ücret şartı yok)
contract ChronoMessageV3_2 {
    
    // ============================================
    // ENUMS & STRUCTS
    // ============================================
    
    /// @notice Mesaj kilit açma koşul tipleri (GÜNCELLENDİ)
    enum UnlockConditionType {
        TIME_LOCK,      // Sadece belirli zamana kadar kilitli
        PAYMENT         // Sadece ödeme ile açılır (zaman şartı YOK)
    }
    
    /// @notice Mesaj içerik tipi
    enum ContentType {
        TEXT,           // Düz metin
        IPFS_HASH,      // IPFS hash (dosya, resim, video)
        ENCRYPTED       // Şifreli veri (gelecekte FHE için)
    }
    
    /// @notice Mesaj yapısı
    struct Message {
        address sender;                     // Gönderen
        address receiver;                   // Alıcı (sadece o okuyabilir)
        uint256 unlockTime;                 // Kilit açılma zamanı (0 = zaman koşulu yok)
        uint256 requiredPayment;            // Gerekli ödeme miktarı (0 = ödeme koşulu yok)
        uint256 paidAmount;                 // Ödenen miktar
        UnlockConditionType conditionType;  // Koşul tipi
        ContentType contentType;            // İçerik tipi
        string content;                     // Mesaj içeriği veya IPFS hash
        bool exists;                        // Mesaj var mı?
        bool isRead;                        // Okundu mu?
        uint256 createdAt;                  // Oluşturulma zamanı
    }
    
    /// @notice Ödeme kaydı
    struct Payment {
        address payer;
        uint256 amount;
        uint256 timestamp;
    }
    
    /// @notice Mesaj metadata struct (stack too deep önlemek için)
    struct MessageMetadata {
        address sender;
        address receiver;
        uint256 unlockTime;
        uint256 requiredPayment;
        uint256 paidAmount;
        UnlockConditionType conditionType;
        ContentType contentType;
        bool isRead;
        bool isUnlockedNow;
        uint256 createdAt;
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    mapping(uint256 => Message) private messages;
    mapping(uint256 => Payment[]) private messagePayments;
    mapping(address => uint256[]) private receivedMessages;
    mapping(address => uint256[]) private sentMessages;
    
    uint256 public messageCount;
    uint256 public constant MIN_PAYMENT = 0.0001 ether;
    uint256 public constant MAX_CONTENT_SIZE = 10000;
    
    address public immutable owner;
    uint256 public protocolFeePercent = 1; // %1 protokol ücreti
    
    // ============================================
    // EVENTS
    // ============================================
    
    event MessageSent(
        uint256 indexed id,
        address indexed sender,
        address indexed receiver,
        UnlockConditionType conditionType,
        uint256 unlockTime,
        uint256 requiredPayment
    );
    
    event PaymentMade(
        uint256 indexed messageId,
        address indexed payer,
        uint256 amount,
        uint256 totalPaid
    );
    
    event MessageUnlocked(
        uint256 indexed messageId,
        address indexed unlocker,
        string unlockMethod
    );
    
    event MessageRead(
        uint256 indexed messageId,
        address indexed reader
    );
    
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier messageExists(uint256 messageId) {
        require(messages[messageId].exists, "Message does not exist");
        _;
    }
    
    modifier onlyReceiver(uint256 messageId) {
        require(msg.sender == messages[messageId].receiver, "Only receiver can access");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        owner = msg.sender;
    }
    
    // ============================================
    // MESSAGE CREATION
    // ============================================
    
    /// @notice Zaman kilitli mesaj gönder (ücret YOK)
    function sendTimeLockedMessage(
        address receiver,
        string calldata content,
        ContentType contentType,
        uint256 unlockTime
    ) external returns (uint256 messageId) {
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        
        return _createMessage(
            receiver,
            content,
            contentType,
            UnlockConditionType.TIME_LOCK,
            unlockTime,
            0 // ödeme yok
        );
    }
    
    /// @notice Ücretli mesaj gönder (zaman kilidi YOK)
    function sendPaymentLockedMessage(
        address receiver,
        string calldata content,
        ContentType contentType,
        uint256 requiredPayment
    ) external returns (uint256 messageId) {
        require(requiredPayment >= MIN_PAYMENT, "Payment too low");
        
        return _createMessage(
            receiver,
            content,
            contentType,
            UnlockConditionType.PAYMENT,
            0, // zaman kilidi yok
            requiredPayment
        );
    }
    
    /// @notice İç fonksiyon - Mesaj oluşturma
    function _createMessage(
        address receiver,
        string calldata content,
        ContentType contentType,
        UnlockConditionType conditionType,
        uint256 unlockTime,
        uint256 requiredPayment
    ) private returns (uint256 messageId) {
        // Validation
        require(receiver != address(0), "Invalid receiver");
        require(receiver != msg.sender, "Cannot send to yourself");
        require(bytes(content).length > 0, "Empty content");
        require(bytes(content).length <= MAX_CONTENT_SIZE, "Content too large");
        
        // GÜVENLİK: Koşul tipine göre validation
        if (conditionType == UnlockConditionType.TIME_LOCK) {
            require(unlockTime > block.timestamp, "TIME_LOCK requires future unlock time");
            require(requiredPayment == 0, "TIME_LOCK cannot have payment requirement");
        } else if (conditionType == UnlockConditionType.PAYMENT) {
            require(requiredPayment >= MIN_PAYMENT, "PAYMENT requires minimum payment");
            require(unlockTime == 0, "PAYMENT cannot have time lock");
        }
        
        // IPFS hash validation
        if (contentType == ContentType.IPFS_HASH) {
            require(_isValidIPFSHash(content), "Invalid IPFS hash format");
        }
        
        messageId = messageCount;
        
        messages[messageId] = Message({
            sender: msg.sender,
            receiver: receiver,
            unlockTime: unlockTime,
            requiredPayment: requiredPayment,
            paidAmount: 0,
            conditionType: conditionType,
            contentType: contentType,
            content: content,
            exists: true,
            isRead: false,
            createdAt: block.timestamp
        });
        
        receivedMessages[receiver].push(messageId);
        sentMessages[msg.sender].push(messageId);
        
        messageCount += 1;
        
        emit MessageSent(
            messageId,
            msg.sender,
            receiver,
            conditionType,
            unlockTime,
            requiredPayment
        );
    }
    
    // ============================================
    // PAYMENT SYSTEM
    // ============================================
    
    /// @notice Mesaj için ödeme yap (alıcı tarafından)
    function payToUnlock(uint256 messageId) 
        external 
        payable 
        messageExists(messageId)
        onlyReceiver(messageId)
    {
        Message storage m = messages[messageId];
        
        // GÜVENLİK: Sadece PAYMENT tipindeki mesajlar için ödeme kabul et
        require(m.conditionType == UnlockConditionType.PAYMENT, "This message is not payment-locked");
        require(msg.value > 0, "Payment required");
        require(m.paidAmount < m.requiredPayment, "Already fully paid");
        
        // Ödeme ekle
        m.paidAmount += msg.value;
        
        // Ödeme geçmişine kaydet
        messagePayments[messageId].push(Payment({
            payer: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));
        
        emit PaymentMade(messageId, msg.sender, msg.value, m.paidAmount);
        
        // Eğer yeterli ödeme yapıldıysa unlock
        if (m.paidAmount >= m.requiredPayment) {
            // Gönderene parayı gönder (protokol ücreti kesilerek)
            uint256 protocolFee = (m.paidAmount * protocolFeePercent) / 100;
            uint256 senderAmount = m.paidAmount - protocolFee;
            
            (bool success, ) = m.sender.call{value: senderAmount}("");
            require(success, "Transfer to sender failed");
            
            emit MessageUnlocked(messageId, msg.sender, "payment");
        }
    }
    
    // ============================================
    // READ MESSAGE
    // ============================================
    
    /// @notice Mesajı oku (state değiştiren)
    function readMessage(uint256 messageId) 
        external 
        messageExists(messageId)
        onlyReceiver(messageId)
        returns (string memory content) 
    {
        Message storage m = messages[messageId];
        
        require(_isUnlocked(messageId), "Message is still locked");
        
        if (!m.isRead) {
            m.isRead = true;
            emit MessageRead(messageId, msg.sender);
        }
        
        return m.content;
    }
    
    /// @notice Mesaj içeriğini VIEW olarak oku (gas-free)
    function getMessageContent(uint256 messageId) 
        external 
        view 
        messageExists(messageId)
        onlyReceiver(messageId)
        returns (string memory) 
    {
        require(_isUnlocked(messageId), "Message is still locked");
        return messages[messageId].content;
    }
    
    // ============================================
    // UNLOCK LOGIC (GÜVENLİK KRİTİK)
    // ============================================
    
    /// @notice Mesajın açılıp açılmadığını kontrol et
    /// @dev GÜNCELLENDİ: HYBRID mod kaldırıldı, basit kontrol
    function _isUnlocked(uint256 messageId) private view returns (bool) {
        Message storage m = messages[messageId];
        
        if (m.conditionType == UnlockConditionType.TIME_LOCK) {
            // Sadece zaman kontrolü
            return block.timestamp >= m.unlockTime;
        } 
        else if (m.conditionType == UnlockConditionType.PAYMENT) {
            // Sadece ödeme kontrolü
            return m.paidAmount >= m.requiredPayment;
        }
        
        return false;
    }
    
    /// @notice Public unlock kontrolü
    function isUnlocked(uint256 messageId) 
        external 
        view 
        messageExists(messageId)
        returns (bool) 
    {
        return _isUnlocked(messageId);
    }
    
    // ============================================
    // METADATA & QUERIES
    // ============================================
    
    /// @notice Mesaj metadata'sı
    function getMessageMetadata(uint256 messageId) 
        external 
        view 
        messageExists(messageId)
        returns (MessageMetadata memory metadata) 
    {
        Message storage m = messages[messageId];
        
        require(
            msg.sender == m.sender || msg.sender == m.receiver,
            "Not authorized"
        );
        
        return MessageMetadata({
            sender: m.sender,
            receiver: m.receiver,
            unlockTime: m.unlockTime,
            requiredPayment: m.requiredPayment,
            paidAmount: m.paidAmount,
            conditionType: m.conditionType,
            contentType: m.contentType,
            isRead: m.isRead,
            isUnlockedNow: _isUnlocked(messageId),
            createdAt: m.createdAt
        });
    }
    
    function getReceivedMessages(address user) external view returns (uint256[] memory) {
        return receivedMessages[user];
    }
    
    function getSentMessages(address user) external view returns (uint256[] memory) {
        return sentMessages[user];
    }
    
    function getPaymentHistory(uint256 messageId) 
        external 
        view 
        messageExists(messageId)
        returns (Payment[] memory) 
    {
        return messagePayments[messageId];
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function setProtocolFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 10, "Fee too high (max 10%)");
        uint256 oldFee = protocolFeePercent;
        protocolFeePercent = newFeePercent;
        emit ProtocolFeeUpdated(oldFee, newFeePercent);
    }
    
    function withdrawProtocolFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function _isValidIPFSHash(string calldata hash) private pure returns (bool) {
        bytes memory b = bytes(hash);
        if (b.length != 46) return false;
        if (b[0] != 'Q' || b[1] != 'm') return false;
        return true;
    }
    
    receive() external payable {}
}
