import { ethers } from "hardhat";
import { ACTIVE_CONTRACT } from "config/contracts";

async function main() {
  const contractAddress = ACTIVE_CONTRACT;
  const testUser = "0x5c728c75f4845Dc19f1107a173268297908aC883";
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  const abi = [
    "function messageCount() view returns (uint256)",
    "function getSentMessages(address) view returns (uint256[])",
    "function getReceivedMessages(address) view returns (uint256[])"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  console.log("\n✅ FINAL CONTRACT: V2");
  console.log("📍 Address:", contractAddress);
  console.log("");
  
  const count = await contract.messageCount();
  console.log(`📊 Total Messages: ${count}`);
  
  const sent = await contract.getSentMessages(testUser);
  const received = await contract.getReceivedMessages(testUser);
  
  console.log(`\n👤 User: ${testUser.substring(0, 10)}...`);
  console.log(`📤 Sent: ${sent.length} messages`);
  if (sent.length > 0) {
  console.log(`   IDs: ${sent.map((id: any) => id.toString()).join(", ")}`);
  }
  
  console.log(`📥 Received: ${received.length} messages`);
  if (received.length > 0) {
  console.log(`   IDs: ${received.map((id: any) => id.toString()).join(", ")}`);
  }
  
  const total = sent.length + received.length;
  console.log(`\n✅ Frontend should show: ${total} messages`);
  
  if (total === 0) {
    console.log("\n💡 Bu contract'ta henüz mesaj yok.");
    console.log("   Yeni mesaj gönderin: http://85.96.191.197:3000");
  }
}

main().catch(console.error);
