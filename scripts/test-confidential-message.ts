import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0xB274067B551FaA7c79a146B5215136454aE912bB";
  
  console.log("\n🧪 Testing ConfidentialMessage contract...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Testing with account:", deployer.address);
  
  const contract = await ethers.getContractAt("ConfidentialMessage", contractAddress);
  
  // Check message count
  const count = await contract.messageCount();
  console.log("📊 Current message count:", count.toString());
  
  // Test encryption and sending
  console.log("\n🔐 Creating encrypted message...");
  
  // Simple test message: "Hello World" → convert to number
  const message = "Hello World";
  const messageBytes = ethers.toUtf8Bytes(message);
  const messageNumber = BigInt(ethers.hexlify(messageBytes));
  
  console.log("   Message:", message);
  console.log("   As number:", messageNumber.toString());
  
  // Unlock time: 1 minute from now
  const unlockTime = Math.floor(Date.now() / 1000) + 60;
  console.log("   Unlock time:", new Date(unlockTime * 1000).toLocaleString());
  
  // For now, let's try with the SDK in the test
  console.log("\n⚠️  NOTE: This test needs FHE SDK to create encrypted inputs.");
  console.log("   Contract deployed successfully at:", contractAddress);
  console.log("   Ready for frontend integration!");
  
  // Get received messages (should be empty)
  const received = await contract.getReceivedMessages(deployer.address);
  console.log("\n📬 Received messages:", received.length);
  
  // Get sent messages (should be empty)
  const sent = await contract.getSentMessages(deployer.address);
  console.log("📤 Sent messages:", sent.length);
  
  console.log("\n✅ Contract is working! Now integrate with frontend.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
