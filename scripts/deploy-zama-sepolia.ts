import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔐 Deploying ChronoMessageZama to Sepolia (Zama FHEVM)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Deploy ChronoMessageZama
  const ChronoMessageZama = await ethers.getContractFactory("ChronoMessageZama");
  console.log("⏳ Deploying contract...");
  
  const contract = await ChronoMessageZama.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ ChronoMessageZama deployed to:", address);
  
  // Save deployment info
  const deployment = {
    network: "sepolia",
    version: "zama",
    contractName: "ChronoMessageZama",
    address: address,
    deployedAt: new Date().toISOString(),
    deployedBy: deployer.address,
    chainId: 11155111,
    features: ["FHE", "TIME_LOCK", "ENCRYPTED_CONTENT"],
    abi: "See artifacts/contracts/ChronoMessageZama.sol/ChronoMessageZama.json"
  };
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, "zama-sepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  
  console.log("📝 Deployment info saved to:", deploymentPath);
  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Next steps:");
  console.log("1. Update frontend/lib/chains.ts with this address");
  console.log("2. Generate ABI: npm run generate-abi-zama");
  console.log("3. Test the contract on Sepolia");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
