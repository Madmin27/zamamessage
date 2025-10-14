import { ethers } from "hardhat";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { applySepoliaRelayerOverrides } from "config/zamaSepolia";

async function main() {
  console.log("🧪 Testing encryption with EmelMarket's working contract...\n");

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // EmelMarket's ConfidentialWETH contract (it works!)
  const cWETHAddress = "0xA3b95080674fBd12fC3626046DCa474c48d012d8";
  
  // Initialize FHE SDK (same as frontend)
  console.log("🔐 Initializing FHE SDK...");
  const relayerConfig = applySepoliaRelayerOverrides(SepoliaConfig);
  console.log("   ACL:", relayerConfig.aclContractAddress);
  console.log("   InputVerifier:", relayerConfig.inputVerifierContractAddress);
  const fheInstance = await createInstance(relayerConfig);
  console.log("✅ FHE SDK initialized\n");

  // Encrypt a value (same as frontend)
  console.log("🔐 Encrypting value with SDK...");
  const value = 123456789n; // Test value
  
  const encryptedValue = await fheInstance
    .createEncryptedInput(cWETHAddress, signer.address)
    .add64(value)
    .encrypt();
  
  console.log("✅ Encryption complete!");
  console.log("  Handle type:", typeof encryptedValue.handles[0]);
  console.log("  Handle:", encryptedValue.handles[0]);
  console.log("  Proof type:", typeof encryptedValue.inputProof);
  const proofStr = typeof encryptedValue.inputProof === 'string' 
    ? encryptedValue.inputProof 
    : '0x' + Buffer.from(encryptedValue.inputProof as Uint8Array).toString('hex');
  console.log("  Proof length:", proofStr.length);
  console.log("  Proof:", proofStr.substring(0, 100) + "...\n");

  // Now test with ConfidentialWETH's wrap function (uses FHE.fromExternal)
  console.log("📝 Testing with ConfidentialWETH.wrap() (uses FHE.fromExternal)...");
  
  const cWETH = await ethers.getContractAt(
    [
      "function wrap(bytes32,bytes) external",
      "function balanceOf(address) external view returns (uint256)"
    ],
    cWETHAddress
  );

  try {
    // This should work because EmelMarket uses same encryption!
    const gasEstimate = await cWETH.wrap.estimateGas(
      encryptedValue.handles[0],
      encryptedValue.inputProof
    );
    console.log("✅ Gas estimation SUCCESS:", gasEstimate.toString());
    console.log("✅ FHE.fromExternal() would work with this encryption!\n");
    
  } catch (error: any) {
    console.error("❌ Gas estimation FAILED!");
    console.error("This means FHE.fromExternal() rejects our encryption");
    console.error("Error:", error.message);
    console.error("\n");
  }

  // Now test with OUR contract
  console.log("📝 Testing with OUR ConfidentialMessage contract...");
  const ourContract = "0x38756CCb09EE1719089F370a8386a772a8F7B5cf";
  
  const ourEncryption = await fheInstance
    .createEncryptedInput(ourContract, signer.address)
    .add64(value)
    .encrypt();

  const ConfidentialMessage = await ethers.getContractAt(
    "ConfidentialMessage",
    ourContract
  );

  try {
    const receiver = "0xF6D39Dda8997407110264acEc6a24345834cB639";
    const unlockTime = Math.floor(Date.now() / 1000) + 60;
    
    const gasEstimate = await ConfidentialMessage.sendMessage.estimateGas(
      receiver,
      ourEncryption.handles[0],
      ourEncryption.inputProof,
      unlockTime
    );
    console.log("✅ Gas estimation SUCCESS:", gasEstimate.toString());
    console.log("✅ OUR contract works!\n");
    
  } catch (error: any) {
    console.error("❌ Gas estimation FAILED for OUR contract!");
    console.error("Error:", error.message);
    
    // Check if it's the exact same encryption
    console.log("\n🔍 Comparing encryptions:");
    console.log("EmelMarket handle:", encryptedValue.handles[0]);
    console.log("Our handle:      ", ourEncryption.handles[0]);
    console.log("Same format?", 
      typeof encryptedValue.handles[0] === typeof ourEncryption.handles[0]
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
