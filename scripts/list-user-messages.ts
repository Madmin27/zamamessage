import { ethers } from "hardhat";

async function main() {
  const userAddress = "0x5c728c75f4845Dc19f1107a173268297908aC883";
  const contractAddress = "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2";
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  const abi = [
    "function getSentMessages(address) view returns (uint256[])",
    "function getReceivedMessages(address) view returns (uint256[])",
    "function messageCount() view returns (uint256)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  console.log("\n📊 KULLANICI MESAJLARI");
  console.log("Adres:", userAddress);
  console.log("Contract:", contractAddress);
  
  const totalCount = await contract.messageCount();
  console.log(`\n📨 Contract'ta toplam ${totalCount} mesaj var\n`);
  
  const sentIds = await contract.getSentMessages(userAddress);
  const receivedIds = await contract.getReceivedMessages(userAddress);
  
  console.log(`📤 Gönderilen: ${sentIds.length} mesaj`);
  if (sentIds.length > 0) {
    console.log("   Message IDs:", sentIds.map(id => id.toString()).join(", "));
  } else {
    console.log("   (Hiç gönderilmemiş)");
  }
  
  console.log(`\n📥 Alınan: ${receivedIds.length} mesaj`);
  if (receivedIds.length > 0) {
    console.log("   Message IDs:", receivedIds.map(id => id.toString()).join(", "));
  } else {
    console.log("   (Hiç alınmamış)");
  }
  
  const allIds = [...new Set([...sentIds, ...receivedIds])];
  console.log(`\n✅ Frontend ${allIds.length} mesaj göstermelidir`);
  
  if (allIds.length === 0) {
    console.log("\n❌ SORUN: getSentMessages ve getReceivedMessages boş array döndürüyor!");
    console.log("   Bu bir contract bug'ı olabilir.");
    console.log("\n💡 Çözüm: Contract'ı yeniden deploy etmek gerekebilir.");
  }
}

main().catch(console.error);
