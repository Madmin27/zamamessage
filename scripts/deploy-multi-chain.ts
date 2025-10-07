import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Multi-Chain Deployment Script for ChronoMessage V2.2
 * Deploys standard (non-FHE) ChronoMessageV2_2 contract to EVM testnets
 */

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log(`\n🚀 Deploying to ${network.name} (chainId: ${network.chainId})...\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH\n`);

  // Deploy ChronoMessageV2 (standard EVM, no FHE)
  console.log("📦 Deploying ChronoMessageV2...");
  const ChronoMessageV2 = await ethers.getContractFactory("ChronoMessageV2");
  const chronoMessage = await ChronoMessageV2.deploy();

  await chronoMessage.waitForDeployment();
  const contractAddress = await chronoMessage.getAddress();

  console.log(`✅ ChronoMessageV2 deployed to: ${contractAddress}`);
  console.log(`🔗 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}\n`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    contractAddress: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    version: "V2",
    contractName: "ChronoMessageV2",
    blockNumber: await ethers.provider.getBlockNumber()
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = network.name.toLowerCase().replace(/\s+/g, "-");
  const filename = path.join(deploymentsDir, `v2.2-${networkName}.json`);
  
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${filename}\n`);

  // Verification instructions
  console.log("🔍 To verify contract on explorer:");
  console.log(`npx hardhat verify --network ${network.name.toLowerCase().replace(/\s+/g, "")} ${contractAddress}\n`);

  // Explorer URLs
  const explorerUrls: Record<number, string> = {
    11155111: "https://sepolia.etherscan.io",
    84532: "https://sepolia.basescan.org",
    59141: "https://sepolia.lineascan.build",
    421614: "https://sepolia.arbiscan.io",
    11155420: "https://sepolia-optimism.etherscan.io",
    80002: "https://amoy.polygonscan.com"
  };

  const explorerUrl = explorerUrls[Number(network.chainId)];
  if (explorerUrl) {
    console.log(`🔗 View on explorer: ${explorerUrl}/address/${contractAddress}\n`);
  }

  // Return deployment info for programmatic use
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
