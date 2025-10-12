import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔐 Deploying ChronoMessageZama to Base Sepolia (Zama FHEVM)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);
  
  if (network.chainId !== 84532n) {
    console.error("❌ Wrong network! Please use Base Sepolia (84532)");
    process.exit(1);
  }
  
  // Deploy ChronoMessageZama
  const ChronoMessageZama = await ethers.getContractFactory("ChronoMessageZama");
  console.log("⏳ Deploying contract...");
  
  const contract = await ChronoMessageZama.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ ChronoMessageZama deployed to:", address);
  console.log("📍 Explorer:", `https://sepolia.basescan.org/address/${address}`);
  
  // Save deployment info
  const deployment = {
    network: "baseSepolia",
    version: "zama",
    contractName: "ChronoMessageZama",
    address: address,
    deployedAt: new Date().toISOString(),
    deployedBy: deployer.address,
    chainId: 84532,
    features: ["FHE", "TIME_LOCK", "ENCRYPTED_CONTENT"],
    explorer: `https://sepolia.basescan.org/address/${address}`,
    abi: "See artifacts/contracts/ChronoMessageZama.sol/ChronoMessageZama.json"
  };
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, "zama-baseSepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  
  console.log("📝 Deployment info saved to:", deploymentPath);
  
  // Wait for block confirmations
  console.log("⏳ Waiting for 5 block confirmations...");
  await contract.deploymentTransaction()?.wait(5);
  console.log("✅ Confirmed!");
  
  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Next steps:");
  console.log("1. Verify contract on BaseScan:");
  console.log(`   npx hardhat verify --network baseSepolia ${address}`);
  console.log("2. Update frontend/lib/chains.ts with this address");
  console.log("3. Test sending encrypted message");
  console.log("4. Install fhevmjs SDK for frontend encryption");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
