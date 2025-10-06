import { ethers } from "hardhat";

async function main() {
  const userAddress = "0xF6D39Dda8997407110264acEc6a24345834cB639"; // Sizin adresiniz
  const contractAddress = "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2";
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  const abi = [
    "function getSentMessages(address) view returns (uint256[])",
    "function getReceivedMessages(address) view returns (uint256[])",
    "function getMessageMetadata(uint256) view returns (address, address, uint256, bool)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  console.log(`\n🔍 Kullanıcı: ${userAddress}`);
  console.log(`📊 Contract: ${contractAddress}\n`);
  
  const sentIds = await contract.getSentMessages(userAddress);
  const receivedIds = await contract.getReceivedMessages(userAddress);
  
  console.log(`📤 Gönderilen mesajlar: ${sentIds.length} adet`);
  if (sentIds.length > 0) {
    for (const id of sentIds) {
      console.log(`   - Mesaj #${id}`);
    }
  }
  
  console.log(`\n�� Alınan mesajlar: ${receivedIds.length} adet`);
  if (receivedIds.length > 0) {
    for (const id of receivedIds) {
      console.log(`   - Mesaj #${id}`);
    }
  }
  
  if (sentIds.length === 0 && receivedIds.length === 0) {
    console.log("\n❌ Bu adres için hiç mesaj yok!");
    console.log("💡 Mesaj göndermek için frontend'i kullanın:");
    console.log("   http://85.96.191.197:3000");
  }
}

main().catch(console.error);
