import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing FHE.fromExternal() directly...\n");

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH\n");

  // Our contract
  const contractAddress = "0x38756CCb09EE1719089F370a8386a772a8F7B5cf";
  
  // Frontend'ten alınan GERÇEK encryption data
  const encryptedContent = "0xab5e54ce49f782399019414e0abf562282fed68140000000000000aa36a70500";
  const inputProof = "0x0101ab5e54ce49f782399019414e0abf562282fed68140000000000000aa36a70500c0977a30f059574194123b77e03e77e7f6c1dd1f17c1efa180590e1036ac853448e740e888a41e5e346cd0bdc7252e650c54e34190699d1ee0a662e21f93c6e61b00";
  
  console.log("📝 Using REAL encryption data from frontend:");
  console.log("  Encrypted Content:", encryptedContent);
  console.log("  Input Proof:", inputProof.substring(0, 50) + "...");
  console.log("  Sender (from console):", "0x5c728c75f4845Dc19f1107a173268297908aC883\n");

  // Check proof format
  console.log("🔍 Analyzing inputProof:");
  console.log("  Length:", inputProof.length);
  console.log("  First 4 bytes (version?):", inputProof.substring(0, 10));
  console.log("  Bytes 4-36 (handle?):", inputProof.substring(10, 74));
  console.log("");

  // Load contract
  const ConfidentialMessage = await ethers.getContractAt(
    "ConfidentialMessage",
    contractAddress
  );

  // Test with correct sender
  console.log("📤 Test 1: Call from CORRECT sender (0x5c728c75...)");
  console.log("   (The address that created the encryption)\n");
  
  // We can't impersonate on Sepolia, but we can check the error
  const receiver = "0xF6D39Dda8997407110264acEc6a24345834cB639";
  const unlockTime = Math.floor(Date.now() / 1000) + 60;

  try {
    const gasEstimate = await ConfidentialMessage.sendMessage.estimateGas(
      receiver,
      encryptedContent,
      inputProof,
      unlockTime
    );
    console.log("✅ SUCCESS! Gas estimate:", gasEstimate.toString());
    console.log("This means FHE.fromExternal() accepts the proof!\n");
    
  } catch (error: any) {
    console.error("❌ FAILED! FHE.fromExternal() rejected the proof");
    console.error("Error:", error.message);
    console.error("");
    console.error("🔍 Possible reasons:");
    console.error("1. inputProof was created for a different sender address");
    console.error("2. inputProof format is incorrect");
    console.error("3. Contract address mismatch in encryption");
    console.error("4. KMS/ACL verification failed");
    console.error("");
    
    // Check contract state
    console.log("🔍 Checking contract state:");
    try {
      const messageCount = await ConfidentialMessage.messageCount();
      console.log("  Message count:", messageCount.toString());
      console.log("  Contract is accessible ✅");
    } catch (e) {
      console.error("  Cannot read contract state ❌");
    }
  }

  // Test simple require statements
  console.log("\n🔍 Testing basic requires:");
  
  // Test 1: Invalid receiver
  try {
    await ConfidentialMessage.sendMessage.estimateGas(
      ethers.ZeroAddress, // Invalid!
      encryptedContent,
      inputProof,
      unlockTime
    );
  } catch (error: any) {
    if (error.message.includes("Invalid receiver")) {
      console.log("✅ 'Invalid receiver' require works");
    }
  }

  // Test 2: Past unlock time
  try {
    await ConfidentialMessage.sendMessage.estimateGas(
      receiver,
      encryptedContent,
      inputProof,
      Math.floor(Date.now() / 1000) - 60 // Past time!
    );
  } catch (error: any) {
    if (error.message.includes("future")) {
      console.log("✅ 'Unlock time in future' require works");
    }
  }

  console.log("\n💡 If basic requires work but sendMessage still fails,");
  console.log("   the problem is in FHE.fromExternal() verification!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
