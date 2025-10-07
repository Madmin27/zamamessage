import { ethers } from "hardhat";

async function main() {
  const senderAddress = "0x5c728c75f4845Dc19f1107a173268297908aC883";
  const receiverAddress = "0x50587bC2bef7C66bC2952F126ADbafCc4Ab9c9D0";
  const contractAddress = "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2";
  
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
  console.log(`\n📊 Toplam mesaj: ${totalCount}`);
  
  // Gönderenin mesajları
  const senderSentIds = await contract.getSentMessages(senderAddress);
  console.log(`\n📤 Gönderenin gönderdiği: ${senderSentIds.length} mesaj`);
  if (senderSentIds.length > 0) {
  console.log("   IDs:", senderSentIds.map((id: any) => id.toString()).join(", "));
  }
  
  // Alıcının mesajları
  const receiverReceivedIds = await contract.getReceivedMessages(receiverAddress);
  console.log(`\n📥 Alıcının aldığı: ${receiverReceivedIds.length} mesaj`);
  if (receiverReceivedIds.length > 0) {
  console.log("   IDs:", receiverReceivedIds.map((id: any) => id.toString()).join(", "));
  }
  
  // Bu iki adres arasındaki mesajları bul
  console.log(`\n🎯 Bu iki adres arasındaki mesajlar:`);
  let found = 0;
  for (const id of senderSentIds) {
    try {
      const [sender, receiver, unlockTime, isRead] = await contract.getMessageMetadata(id);
      if (receiver.toLowerCase() === receiverAddress.toLowerCase()) {
        found++;
        console.log(`\n   ✅ Mesaj #${id}:`);
        console.log(`      Gönderen: ${sender}`);
        console.log(`      Alıcı: ${receiver}`);
        console.log(`      Unlock: ${new Date(Number(unlockTime) * 1000).toLocaleString("tr-TR")}`);
        console.log(`      Okundu: ${isRead ? "Evet" : "Hayır"}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Mesaj #${id}: Erişim hatası`);
    }
  }
  
  if (found === 0) {
    console.log("\n   ❌ Bu iki adres arasında mesaj bulunamadı!");
    console.log("\n   💡 Olası nedenler:");
    console.log("      1. Transaction henüz confirm olmadı (birkaç saniye bekleyin)");
    console.log("      2. Transaction başarısız oldu (MetaMask'ta kontrol edin)");
    console.log("      3. Farklı bir contract'a gönderildi");
  } else {
    console.log(`\n   ✅ Toplam ${found} mesaj bulundu!`);
  }
}

main().catch(console.error);
