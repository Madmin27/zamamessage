import { ethers } from "hardhat";

async function main() {
  const sender = "0x5c728c75f4845Dc19f1107a173268297908aC883";
  const receiver = "0x50587bC2bef7C66bC2952F126ADbafCc4Ab9c9D0";
  const contractAddress = "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2";
  
  const abi = [
    "function messageCount() view returns (uint256)",
    "function getMessageMetadata(uint256) view returns (address, address, uint256, bool)"
  ];

  const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/e6aecc89c96940a5a671b2ad96afe68a");
  const contract = new ethers.Contract(contractAddress, abi, provider);

  console.log(`\n📊 Contract: ${contractAddress}`);
  const totalCount = await contract.messageCount();
  console.log(`📨 Toplam ${totalCount} mesaj var\n`);
  
  if (totalCount === 0n) {
    console.log("❌ Contract'ta hiç mesaj yok!");
    console.log("\n💡 Muhtemelen mesaj henüz confirm olmadı veya transaction başarısız oldu.");
    console.log(`   Sepolia Etherscan'den kontrol edin:`);
    console.log(`   https://sepolia.etherscan.io/address/${sender}#internaltx`);
    return;
  }

  console.log("📋 TÜM MESAJLAR:\n");
  let foundSender = false;
  let foundReceiver = false;
  
  for (let i = 0; i < totalCount; i++) {
    const [msgSender, msgReceiver, unlockTime, isRead] = await contract.getMessageMetadata(i);
    
    const isSender = msgSender.toLowerCase() === sender.toLowerCase();
    const isReceiver = msgReceiver.toLowerCase() === receiver.toLowerCase();
    const isTargetMessage = isSender && isReceiver;
    
    if (isSender) foundSender = true;
    if (msgReceiver.toLowerCase() === receiver.toLowerCase()) foundReceiver = true;
    
    const marker = isTargetMessage ? "🎯 TARGET" : (isSender ? "📤" : (msgReceiver.toLowerCase() === receiver.toLowerCase() ? "📥" : "  "));
    
    console.log(`${marker} Mesaj #${i}:`);
    console.log(`     Gönderen: ${msgSender}`);
    console.log(`     Alıcı:    ${msgReceiver}`);
    console.log(`     Unlock:   ${new Date(Number(unlockTime) * 1000).toLocaleString("tr-TR")}`);
    console.log(`     Okundu:   ${isRead ? "✅" : "❌"}`);
    
    if (isTargetMessage) {
      console.log(`     ✅ Bu mesaj sizin aranan mesajınız!`);
    }
    console.log("");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`Gönderen (${sender.substring(0, 10)}...) mesaj göndermiş mi? ${foundSender ? "✅ Evet" : "❌ Hayır"}`);
  console.log(`Alıcı (${receiver.substring(0, 10)}...) mesaj almış mı? ${foundReceiver ? "✅ Evet" : "❌ Hayır"}`);
  console.log("=".repeat(60));
}

main().catch(console.error);
