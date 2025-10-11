// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ChronoMessageV3 - Çoklu koşul destekli güvenli mesajlaşma sistemi
/// @author ChronoMessage
/// @notice Mesajlar zaman kilidi, ücret veya özel koşullarla kilitlenebilir
/// @dev IPFS hash'leri ile büyük dosyalar desteklenir, tüm doğrulamalar on-chain
contract ChronoMessageV3 {
    
    // ============================================
    // ENUMS & STRUCTS
    // ============================================
    
    /// @notice Mesaj kilit açma koşul tipleri
    enum UnlockConditionType {
        TIME_LOCK,      // Belirli zamana kadar kilitli
        PAYMENT,        // Ödeme yapılınca açılır
        HYBRID          // Hem zaman hem ödeme (OR mantığı)
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
    mapping(uint256 => Payment[]) private messagePayments; // Mesaj başına ödeme geçmişi
    mapping(address => uint256[]) private receivedMessages;
    mapping(address => uint256[]) private sentMessages;
    
    uint256 public messageCount;
    uint256 public constant MIN_PAYMENT = 0.0001 ether; // Minimum ödeme
    uint256 public constant MAX_CONTENT_SIZE = 10000;   // Max content uzunluğu (gas tasarrufu)
    
    address public immutable owner;
    uint256 public protocolFeePercent = 1; // %1 protokol ücreti (opsiyonel)
    
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
        string reason
    );
    
    event MessageRead(
        uint256 indexed messageId,
        address indexed reader
    );
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier messageExists(uint256 messageId) {
        require(messages[messageId].exists, "Message does not exist");
        _;
    }
    
    modifier onlyReceiver(uint256 messageId) {
        require(
            msg.sender == messages[messageId].receiver,
            "Only receiver can perform this action"
        );
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
    // CORE FUNCTIONS - MESSAGE SENDING
    // ============================================
    
    /// @notice Zaman kilitli mesaj gönder
    /// @param receiver Alıcı adresi
    /// @param content Mesaj içeriği veya IPFS hash
    /// @param contentType İçerik tipi
    /// @param unlockTime Kilit açılma zamanı
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
            0 // No payment required
        );
    }
    
    /// @notice Ücretli mesaj gönder (alıcı ödeme yaparak açar)
    /// @param receiver Alıcı adresi
    /// @param content Mesaj içeriği veya IPFS hash
    /// @param contentType İçerik tipi
    /// @param requiredPayment Gerekli ödeme miktarı
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
            0, // No time lock
            requiredPayment
        );
    }
    
    /// @notice Hibrit mesaj gönder (zaman VEYA ödeme ile açılabilir)
    /// @param receiver Alıcı adresi
    /// @param content Mesaj içeriği
    /// @param contentType İçerik tipi
    /// @param unlockTime Kilit açılma zamanı
    /// @param requiredPayment Gerekli ödeme miktarı
    function sendHybridMessage(
        address receiver,
        string calldata content,
        ContentType contentType,
        uint256 unlockTime,
        uint256 requiredPayment
    ) external returns (uint256 messageId) {
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        require(requiredPayment >= MIN_PAYMENT, "Payment too low");
        
        return _createMessage(
            receiver,
            content,
            contentType,
            UnlockConditionType.HYBRID,
            unlockTime,
            requiredPayment
        );
    }
    
    /// @notice İç fonksiyon - Mesaj oluşturma (DRY prensibi)
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
        
        // IPFS hash validation (if applicable)
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
        
        // Track messages
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
    /// @param messageId Mesaj ID'si
    /// @dev GÜVENLİK: Sadece mesaj oluşturulduktan SONRA yapılan ödemeler kabul edilir
    function payToUnlock(uint256 messageId) 
        external 
        payable 
        messageExists(messageId)
        onlyReceiver(messageId)
    {
        Message storage m = messages[messageId];
        
        require(
            m.conditionType == UnlockConditionType.PAYMENT || 
            m.conditionType == UnlockConditionType.HYBRID,
            "This message doesn't require payment"
        );
        
        require(msg.value > 0, "Must send payment");
        require(m.paidAmount < m.requiredPayment, "Already fully paid");
        
        // 🚨 KRİTİK GÜVENLİK: Ödeme, mesaj oluşturulduktan SONRA yapılmalı
        // Bu kontrol olmazsa, önceden yapılan ödemeler de sayılabilir
        // Block timestamp yeterli çünkü aynı block içinde mesaj oluşturulup ödeme yapılamaz
        require(block.timestamp > m.createdAt, "Payment too early");
        
        // Ödemeyi kaydet (mesaj-specific tracking)
        m.paidAmount += msg.value;
        messagePayments[messageId].push(Payment({
            payer: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));
        
        emit PaymentMade(messageId, msg.sender, msg.value, m.paidAmount);
        
        // Yeterli ödeme yapıldıysa unlock event
        if (m.paidAmount >= m.requiredPayment) {
            emit MessageUnlocked(messageId, msg.sender, "Payment completed");
            
            // Ödemeyi gönderene transfer et
            _transferPayment(m.sender, m.requiredPayment);
        }
    }
    
    /// @notice Ödeme transferi (internal, güvenli)
    function _transferPayment(address recipient, uint256 amount) private {
        // Protocol fee hesapla (opsiyonel)
        uint256 fee = (amount * protocolFeePercent) / 100;
        uint256 recipientAmount = amount - fee;
        
        // Transfer et
        (bool success, ) = recipient.call{value: recipientAmount}("");
        require(success, "Transfer to sender failed");
        
        // Fee'yi owner'a gönder
        if (fee > 0) {
            (bool feeSuccess, ) = owner.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
    }
    
    // ============================================
    // MESSAGE READING
    // ============================================
    
    /// @notice Mesajı oku (SADECE ALICI ve KİLİT AÇIKSA)
    /// @param messageId Mesaj ID'si
    /// @return content Mesaj içeriği
    function readMessage(uint256 messageId) 
        external 
        messageExists(messageId)
        onlyReceiver(messageId)
        returns (string memory content) 
    {
        Message storage m = messages[messageId];
        
        require(_isUnlocked(messageId), "Message is still locked");
        
        // Mark as read
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
    // UNLOCK LOGIC (CORE SECURITY)
    // ============================================
    
    /// @notice Mesajın açılıp açılmadığını kontrol et (GÜVENLİK KRİTİK)
    /// @dev Frontend'den bağımsız, tamamen on-chain doğrulama
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
        else if (m.conditionType == UnlockConditionType.HYBRID) {
            // Zaman VEYA ödeme (OR mantığı)
            return (block.timestamp >= m.unlockTime) || (m.paidAmount >= m.requiredPayment);
        }
        
        return false;
    }
    
    /// @notice Public unlock kontrolü (view)
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
    
    /// @notice Mesaj metadata'sı (içerik hariç)
    function getMessageMetadata(uint256 messageId) 
        external 
        view 
        messageExists(messageId)
        returns (MessageMetadata memory metadata) 
    {
        Message storage m = messages[messageId];
        
        // Sadece gönderen veya alıcı görebilir
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
    
    /// @notice Alınan mesajları listele
    function getReceivedMessages(address user) external view returns (uint256[] memory) {
        return receivedMessages[user];
    }
    
    /// @notice Gönderilen mesajları listele
    function getSentMessages(address user) external view returns (uint256[] memory) {
        return sentMessages[user];
    }
    
    /// @notice Ödeme geçmişini görüntüle
    function getPaymentHistory(uint256 messageId) 
        external 
        view 
        messageExists(messageId)
        returns (Payment[] memory) 
    {
        Message storage m = messages[messageId];
        require(
            msg.sender == m.sender || msg.sender == m.receiver,
            "Not authorized"
        );
        return messagePayments[messageId];
    }
    
    /// @notice Okunmamış + açılmış mesaj sayısı
    function getUnreadCount(address user) external view returns (uint256 count) {
        uint256[] memory received = receivedMessages[user];
        count = 0;
        
        for (uint256 i = 0; i < received.length; i++) {
            uint256 msgId = received[i];
            Message storage m = messages[msgId];
            if (!m.isRead && _isUnlocked(msgId)) {
                count++;
            }
        }
    }
    
    // ============================================
    // VALIDATION HELPERS
    // ============================================
    
    /// @notice IPFS hash formatını kontrol et (basit doğrulama)
    function _isValidIPFSHash(string calldata hash) private pure returns (bool) {
        bytes memory b = bytes(hash);
        
        // IPFS v0: Qm ile başlar, 46 karakter
        // IPFS v1: bafybei ile başlar, ~59 karakter
        if (b.length == 46 && b[0] == 'Q' && b[1] == 'm') {
            return true;
        }
        if (b.length >= 50 && b.length <= 100) {
            // v1 check (basitleştirilmiş)
            return true;
        }
        
        return false;
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /// @notice Protokol ücret oranını güncelle (sadece owner)
    function setProtocolFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 5, "Fee too high"); // Max %5
        protocolFeePercent = newFeePercent;
    }
    
    /// @notice Acil durum - kilitli fonları çek (sadece owner, acil durum)
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // ============================================
    // RECEIVE ETHER
    // ============================================
    
    receive() external payable {
        revert("Direct transfers not allowed. Use payToUnlock()");
    }
}
