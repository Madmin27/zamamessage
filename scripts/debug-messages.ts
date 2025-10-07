import { ethers } from "hardhat";
import { ACTIVE_CONTRACT } from "../config/contracts";

async function main() {
  const userAddress = process.env.DEBUG_USER || "0x5c728c75f4845Dc19f1107a173268297908aC883";
  const contractAddress = ACTIVE_CONTRACT;

  const rpc = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpc as string);

  const abi = [
    "function messageCount() view returns (uint256)",
    "function getSentMessages(address) view returns (uint256[])",
    "function getReceivedMessages(address) view returns (uint256[])",
    "function getMessageMetadata(uint256) view returns (address,address,uint256,bool)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, provider);

  console.log("\n🔍 DEBUG: Mesaj Detayları");
  console.log("Contract:", contractAddress);
  console.log("User:", userAddress);

  const totalCount = await contract.messageCount();
  console.log(`\n📊 messageCount(): ${totalCount}`);

  const sentIds: Array<any> = await contract.getSentMessages(userAddress);
  console.log(`\n📤 getSentMessages(${userAddress.substring(0, 10)}...):`);
  console.log("   Length:", sentIds.length);
  console.log("   IDs:", sentIds.length > 0 ? sentIds.map((id: any) => id.toString()).join(", ") : "[]");

  const receivedIds: Array<any> = await contract.getReceivedMessages(userAddress);
  console.log(`\n📥 getReceivedMessages(${userAddress.substring(0, 10)}...):`);
  console.log("   Length:", receivedIds.length);
  console.log("   IDs:", receivedIds.length > 0 ? receivedIds.map((id: any) => id.toString()).join(", ") : "[]");

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
