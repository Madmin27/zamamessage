import { ethers } from "hardhat";

async function main() {
  const senderAddress = "0x5c728c75f4845Dc19f1107a173268297908aC883";
  const receiverAddress = "0x50587bC2bef7C66bC2952F126ADbafCc4Ab9c9D0";
  const contractAddress = "0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3"; // V2.1
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  const abi = [
    "function messageCount() view returns (uint256)",
    "function getSentMessages(address) view returns (uint256[])",
    "function getReceivedMessages(address) view returns (uint256[])",
    "function getMessageMetadata(uint256) view returns (address, address, uint256, bool)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  console.log("\n🔍 MESAJ KONTROLÜ");
  console.log("Contract:", contractAddress);
  console.log("Gönderen:", senderAddress);
  console.log("Alıcı:", receiverAddress);
  
  const totalCount = await contract.messageCount();
  console.log(`\n📊 Toplam mesaj sayısı: ${totalCount}`);
  
  // Gönderenin mesajları
  const sentIds = await contract.getSentMessages(senderAddress);
  console.log(`\n📤 Gönderenin gönderdiği: ${sentIds.length} mesaj`);
  
  if (sentIds.length > 0) {
    console.log("   Message IDs:", sentIds.map((id: any) => id.toString()).join(", "));
    
    // Son mesajı kontrol et
    const lastId = sentIds[sentIds.length - 1];
    try {
      const [sender, receiver, unlockTime, isRead] = await contract.getMessageMetadata(lastId);
      console.log(`\n   📋 Son Mesaj #${lastId}:`);
      console.log(`      Gönderen: ${sender}`);
      console.log(`      Alıcı: ${receiver}`);
      console.log(`      Alıcı doğru mu: ${receiver.toLowerCase() === receiverAddress.toLowerCase() ? "✅ EVET" : "❌ HAYIR"}`);
      console.log(`      Unlock: ${new Date(Number(unlockTime) * 1000).toLocaleString("tr-TR")}`);
      console.log(`      Okundu: ${isRead ? "Evet" : "Hayır"}`);
    } catch (e: any) {
      console.log(`   ⚠️  Metadata okunamadı: ${e.message}`);
    }
  } else {
    console.log("   ❌ Hiç gönderilen mesaj yok!");
  }
  
  // Alıcının mesajları
  const receivedIds = await contract.getReceivedMessages(receiverAddress);
  console.log(`\n📥 Alıcının aldığı: ${receivedIds.length} mesaj`);
  if (receivedIds.length > 0) {
    console.log("   Message IDs:", receivedIds.map((id: any) => id.toString()).join(", "));
  }
}

main().catch(console.error);
