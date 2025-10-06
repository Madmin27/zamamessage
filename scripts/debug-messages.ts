import { ethers } from "hardhat";

async function main() {
  const userAddress = "0x5c728c75f4845Dc19f1107a173268297908aC883";
  const contractAddress = "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2";
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  const abi = [
    "function messageCount() view returns (uint256)",
    "function getSentMessages(address) view returns (uint256[])",
    "function getReceivedMessages(address) view returns (uint256[])"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  import { ethers } from "hardhat";
import { ACTIVE_CONTRACT } from "../config/contracts";

async function main() {
  console.log("\n🔍 DEBUG: Mesaj Detayları");
  const contractAddress = ACTIVE_CONTRACT;
  
  const totalCount = await contract.messageCount();
  console.log(`\n📊 messageCount(): ${totalCount}`);
  
  const sentIds = await contract.getSentMessages(userAddress);
  console.log(`\n📤 getSentMessages(${userAddress.substring(0, 10)}...):`);
  console.log("   Length:", sentIds.length);
  console.log("   IDs:", sentIds.length > 0 ? sentIds.map(id => id.toString()).join(", ") : "[]");
  
  const receivedIds = await contract.getReceivedMessages(userAddress);
  console.log(`\n📥 getReceivedMessages(${userAddress.substring(0, 10)}...):`);
  console.log("   Length:", receivedIds.length);
  console.log("   IDs:", receivedIds.length > 0 ? receivedIds.map(id => id.toString()).join(", ") : "[]");
  
  if (sentIds.length === 0 && receivedIds.length === 0) {
    console.log("\n❌ SORUN BULUNDU!");
    console.log("\n📋 Olası nedenler:");
    console.log("   1. Bu contract yeni deploy edildi ve mapping'ler boş");
    console.log("   2. Contract'ta bir bug var - mesajlar ekleniyor ama mapping'e kaydedilmiyor");
    console.log("   3. Mesajlar farklı bir contract'a gönderilmiş");
    
    console.log("\n🔍 Etherscan'den transaction loglarını kontrol edin:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}#events`);
    console.log("\n   MessageSent event'lerini arayın ve ID'leri not edin.");
  }
}

main().catch(console.error);
