// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ChronoMessageV2Fix {
    struct Message {
        address sender;
        address receiver;
        uint256 unlockTime;
        string content;
        bool exists;
        bool isRead;
    }

    mapping(uint256 => Message) public messages;
    mapping(address => uint256[]) public receivedMessages;
    mapping(address => uint256[]) public sentMessages;
    uint256 public messageCount;

    event MessageSent(uint256 indexed messageId, address indexed sender, address indexed receiver, uint256 unlockTime);
    event MessageRead(uint256 indexed messageId, address indexed receiver);

    function sendMessage(address receiver, string calldata content, uint256 unlockTime) external returns (uint256 messageId) {
        require(receiver != address(0), "Invalid receiver");
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        require(bytes(content).length > 0, "Content cannot be empty");

        messageId = messageCount;
        messages[messageId] = Message({
            sender: msg.sender,
            receiver: receiver,
            unlockTime: unlockTime,
            content: content,
            exists: true,
            isRead: false
        });

        receivedMessages[receiver].push(messageId);
        sentMessages[msg.sender].push(messageId);
        messageCount += 1;

        emit MessageSent(messageId, msg.sender, receiver, unlockTime);
    }

    function readMessage(uint256 messageId) external returns (string memory content) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        require(msg.sender == m.receiver, "Only receiver can read the message");
        require(block.timestamp >= m.unlockTime, "Message still locked");
        
        if (!m.isRead) {
            m.isRead = true;
            emit MessageRead(messageId, msg.sender);
        }
        return m.content;
    }

    /// @notice Metadata HERKESE AÇIK - sadece gönderen/alıcı/unlock time
    function getMessageMetadata(uint256 messageId) external view returns (
        address sender, 
        address receiver, 
        uint256 unlockTime,
        bool isRead
    ) {
        Message storage m = messages[messageId];
        require(m.exists, "Message not found");
        // YETKİ KONTROLÜ KALDIRILDI - metadata herkese açık
        return (m.sender, m.receiver, m.unlockTime, m.isRead);
    }

    function getReceivedMessages(address user) external view returns (uint256[] memory) {
        return receivedMessages[user];
    }

    function getSentMessages(address user) external view returns (uint256[] memory) {
        return sentMessages[user];
    }
}
