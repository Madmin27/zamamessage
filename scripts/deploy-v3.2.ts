import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n🚀 Deploying ChronoMessageV3_2 (Security Fix)...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy contract
  const ChronoMessageV3_2 = await ethers.getContractFactory("ChronoMessageV3_2");
  const contract = await ChronoMessageV3_2.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ ChronoMessageV3_2 deployed to:", address);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  
  console.log("📡 Network:", network.name);
  console.log("🔗 Chain ID:", chainId);

  // Save deployment info
  const deploymentInfo = {
    contractName: "ChronoMessageV3_2",
    address: address,
    chainId: chainId,
    network: network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    version: "3.2",
    changes: [
      "HYBRID mode removed (security vulnerability)",
      "Only TIME_LOCK or PAYMENT supported",
      "PAYMENT mode: No time lock, only payment unlocks",
      "TIME_LOCK mode: No payment, only time unlocks"
    ]
  };

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `v3.2-${network.name}.json`;
  const filepath = path.join(deploymentsDir, filename);

  // Append to existing file or create new
  let deployments: any[] = [];
  if (fs.existsSync(filepath)) {
    deployments = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  }
  deployments.push(deploymentInfo);

  fs.writeFileSync(filepath, JSON.stringify(deployments, null, 2));
  console.log(`\n💾 Deployment info saved to: ${filename}`);

  // Verification info
  console.log("\n📝 To verify on Etherscan:");
  console.log(`npx hardhat verify --network ${network.name} ${address}`);

  console.log("\n✅ Deployment complete!\n");
  console.log("⚠️  IMPORTANT: Update frontend chains.ts with new V3.2 address");
  console.log("⚠️  IMPORTANT: Notify users about HYBRID mode removal");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
