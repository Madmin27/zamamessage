import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x65016d7E35EC1830d599991d82381bf03eEC2987";
  
  console.log("\n🔍 Checking FHEVM Coprocessor Configuration...");
  console.log("Contract Address:", contractAddress);
  
  // Expected Zama Sepolia addresses
  const expectedACL = "0x687820221192C5B662b25367F70076A37bc79b6c";
  const expectedCoprocessor = "0x848B0066793BcC60346Da1F49049357399B8D595";
  const expectedKMSVerifier = "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC";
  
  console.log("\n📋 Expected Zama Sepolia Addresses:");
  console.log("ACL:", expectedACL);
  console.log("Coprocessor:", expectedCoprocessor);
  console.log("KMSVerifier:", expectedKMSVerifier);
  
  // Try to read coprocessor storage slots
  // Storage layout for FHE library is at a fixed location
  console.log("\n🔎 Checking if contract has coprocessor config...");
  
  const ChronoMessageZama = await ethers.getContractFactory("ChronoMessageZama");
  const contract = ChronoMessageZama.attach(contractAddress);
  
  // Check if contract is instance of SepoliaConfig
  try {
    const protocolId = await contract.protocolId();
    console.log("✅ protocolId:", protocolId.toString());
    
    if (protocolId.toString() === "10001") {
      console.log("✅ Contract correctly inherits from SepoliaConfig!");
    } else {
      console.log("❌ Protocol ID mismatch! Expected 10001, got:", protocolId.toString());
    }
  } catch (e: any) {
    console.log("❌ Failed to read protocolId:", e.message);
  }
  
  // Check contract bytecode
  const code = await ethers.provider.getCode(contractAddress);
  console.log("\n📦 Contract bytecode length:", code.length);
  
  // Check if SepoliaConfig addresses are in bytecode
  const hasACL = code.toLowerCase().includes(expectedACL.toLowerCase().slice(2));
  const hasCoprocessor = code.toLowerCase().includes(expectedCoprocessor.toLowerCase().slice(2));
  const hasKMSVerifier = code.toLowerCase().includes(expectedKMSVerifier.toLowerCase().slice(2));
  
  console.log("\n🔍 Addresses found in bytecode:");
  console.log("ACL:", hasACL ? "✅ YES" : "❌ NO");
  console.log("Coprocessor:", hasCoprocessor ? "✅ YES" : "❌ NO");
  console.log("KMSVerifier:", hasKMSVerifier ? "✅ YES" : "❌ NO");
  
  if (!hasACL || !hasCoprocessor || !hasKMSVerifier) {
    console.log("\n❌ PROBLEM: Contract bytecode doesn't contain Sepolia addresses!");
    console.log("This means SepoliaConfig inheritance may not be working correctly.");
  } else {
    console.log("\n✅ All Zama Sepolia addresses found in contract bytecode!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
