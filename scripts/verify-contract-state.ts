import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x65016d7E35EC1830d599991d82381bf03eEC2987";
  
  console.log("\n🔍 Verifying contract on Sepolia...");
  console.log("Contract Address:", contractAddress);
  
  // Get contract code
  const code = await ethers.provider.getCode(contractAddress);
  console.log("✅ Contract exists, bytecode length:", code.length);
  
  // Get contract instance
  const ChronoMessageZama = await ethers.getContractFactory("ChronoMessageZama");
  const contract = ChronoMessageZama.attach(contractAddress);
  
  // Check basic state
  try {
    const messageCount = await contract.messageCount();
    console.log("✅ messageCount:", messageCount.toString());
  } catch (e: any) {
    console.log("❌ messageCount failed:", e.message);
  }
  
  // Check protocolId (from SepoliaConfig)
  try {
    const protocolId = await contract.protocolId();
    console.log("✅ protocolId (from SepoliaConfig):", protocolId.toString());
  } catch (e: any) {
    console.log("❌ protocolId failed:", e.message);
  }
  
  // Try to simulate a sendMessage call to see the revert reason
  console.log("\n🧪 Simulating sendMessage to get revert reason...");
  
  const [signer] = await ethers.getSigners();
  const testReceiver = "0x5c728c75f4845Dc19f1107a173268297908aC883";
  const testHandle = "0x10d1974840177b2b12bf44a127dd7d4674d696b401000000000000aa36a70800";
  const testProof = "0x010110d1974840177b2b12bf44a127dd7d4674d696b401000000000000aa36a70800c66d843cb5e872d80f34317cacf50a78fa713885825c906fdd8e522018a97ba2304bd51fe3b248bb60cdc64994db97ffdb8c1e18631961d96c75cb81c3adb8ed1c00";
  const testUnlockTime = Math.floor(Date.now() / 1000) + 300;
  
  try {
    await contract.sendMessage.staticCall(
      testReceiver,
      testHandle,
      testProof,
      testUnlockTime
    );
    console.log("✅ sendMessage simulation succeeded!");
  } catch (e: any) {
    console.log("❌ sendMessage simulation failed:");
    console.log("Error name:", e.name);
    console.log("Error message:", e.message);
    
    // Try to extract revert reason
    if (e.data) {
      console.log("Error data:", e.data);
    }
    if (e.reason) {
      console.log("Revert reason:", e.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
