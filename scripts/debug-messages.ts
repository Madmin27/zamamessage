import { ethers } from "hardhat";
import zamaDeployment from "../deployments/zama-sepolia.json";

async function main() {
  const contractAddress = zamaDeployment.address;
  
  console.log("\n🔍 Debugging sendMessage revert...");
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const ChronoMessageZama = await ethers.getContractFactory("ChronoMessageZama");
  const contract = ChronoMessageZama.attach(contractAddress) as any;
  
  // Test 1: Check requires
  console.log("\n📋 Test 1: Basic validations...");
  const receiver = signer.address;
  const unlockTime = Math.floor(Date.now() / 1000) + 300;
  
  console.log("Receiver valid?", ethers.isAddress(receiver));
  console.log("Unlock time valid?", unlockTime > Math.floor(Date.now() / 1000));
  
  // Test 2: Try to call FHE.fromExternal with simple data
  console.log("\n🧪 Test 2: Testing FHE.fromExternal...");
  
  // Create minimal test data
  const testHandle = "0x" + "00".repeat(32);
  const testProof = "0x" + "00".repeat(100);
  
  console.log("Test handle:", testHandle);
  console.log("Test proof length:", testProof.length);
  
  try {
    // Use eth_call to simulate (won't cost gas)
    await contract.sendMessage.staticCall(
      receiver,
      testHandle,
      testProof,
      unlockTime
    );
    console.log("✅ Call succeeded!");
  } catch (e: any) {
    console.log("\n❌ Call failed!");
    console.log("Error name:", e.name);
    console.log("Error code:", e.code);
    
    // Try to decode revert reason
    if (e.data) {
      console.log("Error data:", e.data);
      
      // Try to parse as string
      try {
        const reason = ethers.toUtf8String("0x" + e.data.slice(138));
        console.log("Decoded reason:", reason);
      } catch {
        console.log("Could not decode as string");
      }
    }
    
    // Check if it's a require error
    if (e.message) {
      console.log("\nFull error message:");
      console.log(e.message);
      
      // Look for specific patterns
      if (e.message.includes("Invalid receiver")) {
        console.log("\n💡 ISSUE: Receiver address validation failed");
      } else if (e.message.includes("Unlock time")) {
        console.log("\n💡 ISSUE: Unlock time validation failed");
      } else if (e.message.includes("FHE") || e.message.includes("coprocessor")) {
        console.log("\n💡 ISSUE: FHE coprocessor error - Zama services may be down!");
      } else {
        console.log("\n💡 Unknown error - likely FHE.fromExternal() failing");
      }
    }
  }
  
  // Test 3: Check if Zama's coprocessor contract is working
  console.log("\n📡 Test 3: Checking Zama coprocessor...");
  const coprocessorAddress = "0x848B0066793BcC60346Da1F49049357399B8D595";
  const coprocessorCode = await ethers.provider.getCode(coprocessorAddress);
  
  if (coprocessorCode === "0x") {
    console.log("❌ Coprocessor contract NOT deployed at:", coprocessorAddress);
    console.log("💡 This is the problem! Zama's Sepolia testnet may not be ready yet.");
  } else {
    console.log("✅ Coprocessor contract exists");
    console.log("Bytecode length:", coprocessorCode.length);
  }
  
  // Test 4: Check ACL contract
  console.log("\n🔎 Test 4: Checking ACL contract...");
  const aclAddress = "0x687820221192C5B662b25367F70076A37bc79b6c";
  const aclCode = await ethers.provider.getCode(aclAddress);
  
  if (aclCode === "0x") {
    console.log("❌ ACL contract NOT deployed at:", aclAddress);
  } else {
    console.log("✅ ACL contract exists");
    console.log("Bytecode length:", aclCode.length);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
