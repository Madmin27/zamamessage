const { ethers } = require("ethers");

const CONTRACT_ADDRESS = "0xA52bD90D699D00781F6610631E22703526c69aF5";
const USER_ADDRESS = "0x5c728c75f4845Dc19f1107a173268297908aC883";

const ABI = [
  "function getSentMessages(address user) external view returns (uint256[])",
  "function getReceivedMessages(address user) external view returns (uint256[])",
  "function messages(uint256 id) external view returns (address sender, address receiver, uint256 unlockTime, bool isRead)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log("📊 Testing V2.2 Sepolia Contract:", CONTRACT_ADDRESS);
  console.log("👤 User:", USER_ADDRESS);
  console.log("");

  try {
    console.log("📤 Getting sent messages...");
    const sentIds = await contract.getSentMessages(USER_ADDRESS);
    console.log("✅ Sent message IDs:", sentIds.map(id => id.toString()));

    console.log("\n📥 Getting received messages...");
    const receivedIds = await contract.getReceivedMessages(USER_ADDRESS);
    console.log("✅ Received message IDs:", receivedIds.map(id => id.toString()));

    if (sentIds.length > 0) {
      const firstId = sentIds[0];
      console.log(`\n📨 Checking message #${firstId}...`);
      const msg = await contract.messages(firstId);
      console.log("  Sender:", msg[0]);
      console.log("  Receiver:", msg[1]);
      console.log("  Unlock Time:", new Date(Number(msg[2]) * 1000).toISOString());
      console.log("  Is Read:", msg[3]);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
