import { ethers } from "hardhat";

async function main() {
  console.log("\n🧪 Testing ChronoMessageZama locally...");
  
  // Deploy contract
  const ChronoMessageZama = await ethers.getContractFactory("ChronoMessageZama");
  console.log("📝 Deploying contract...");
  
  try {
    const contract = await ChronoMessageZama.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log("✅ Contract deployed to:", address);
    console.log("✅ Local deployment works!");
    
  } catch (e: any) {
    console.log("❌ Deployment failed:", e.message);
    
    if (e.message.includes("SepoliaConfig")) {
      console.log("\n💡 SepoliaConfig is ONLY for Sepolia network!");
      console.log("For local testing, you need a different approach.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
