import { ethers } from "hardhat";

async function main() {
  const userAddress = "0x5c728c75f4845Dc19f1107a173268297908aC883";
  const oldContract = "0x3A11204a761ee3D864870787f99fcC66f06DF6d7"; // ESKİ
  const newContract = "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2"; // YENİ
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  const abi = [
    "function messageCount() view returns (uint256)",
    "function getSentMessages(address) view returns (uint256[])",
    "function getReceivedMessages(address) view returns (uint256[])"
  ];
  
  console.log("\n📊 İKİ CONTRACT KARŞILAŞTIRMASI\n");
  
  // ESKİ Contract
  console.log("1️⃣  ESKİ CONTRACT (deployment):", oldContract);
  try {
    const oldC = new ethers.Contract(oldContract, abi, provider);
    const oldCount = await oldC.messageCount();
    const oldSent = await oldC.getSentMessages(userAddress);
    const oldReceived = await oldC.getReceivedMessages(userAddress);
    
    console.log(`   messageCount: ${oldCount}`);
    console.log(`   Gönderilen: ${oldSent.length} adet`);
    console.log(`   Alınan: ${oldReceived.length} adet`);
    
    if (oldSent.length > 0 || oldReceived.length > 0) {
      console.log("   ✅ MESAJLAR BURADA!");
    }
  } catch (e: any) {
    console.log(`   ❌ Hata: ${e.message}`);
  }
  
  // YENİ Contract
  console.log(`\n2️⃣  YENİ CONTRACT (son transaction):`, newContract);
  try {
    const newC = new ethers.Contract(newContract, abi, provider);
    const newCount = await newC.messageCount();
    const newSent = await newC.getSentMessages(userAddress);
    const newReceived = await newC.getReceivedMessages(userAddress);
    
    console.log(`   messageCount: ${newCount}`);
    console.log(`   Gönderilen: ${newSent.length} adet`);
    console.log(`   Alınan: ${newReceived.length} adet`);
    
    if (newSent.length > 0 || newReceived.length > 0) {
      console.log("   ✅ MESAJLAR BURADA!");
    }
  } catch (e: any) {
    console.log(`   ❌ Hata: ${e.message}`);
  }
  
  console.log("\n💡 Frontend şu an ESKİ contract'ı kullanıyor.");
}

main().catch(console.error);
