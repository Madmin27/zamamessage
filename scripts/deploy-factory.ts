import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy ChronoMessageFactory to multiple chains
 * This factory allows users to deploy their own ChronoMessage instances
 */
async function main() {
  console.log("\n=== ChronoMessageFactory Deployment ===\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy Factory
  console.log("Deploying ChronoMessageFactory...");
  const Factory = await ethers.getContractFactory("ChronoMessageFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("✅ Factory deployed to:", factoryAddress);

  // Test deployment (deploy one ChronoMessage as example)
  console.log("\n📝 Testing factory with sample deployment...");
  const tx = await factory.deployChronoMessage(`${network.name} Test`);
  const receipt = await tx.wait();
  
  // Get the deployed contract address from event
  const event = receipt?.logs.find((log: any) => {
    try {
      return factory.interface.parseLog(log)?.name === "ChronoMessageDeployed";
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = factory.interface.parseLog(event);
    const sampleContractAddress = parsed?.args[1];
    console.log("✅ Sample ChronoMessage deployed to:", sampleContractAddress);
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    factoryAddress: factoryAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: receipt?.blockNumber,
    transactionHash: receipt?.hash
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = path.join(deploymentsDir, `factory-${network.name}.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📝 Deployment info saved to:", filename);

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("Factory Contract:", factoryAddress);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("\n🔍 View on Explorer:");
  
  const explorers: Record<string, string> = {
    sepolia: "https://sepolia.etherscan.io",
    "base-sepolia": "https://sepolia.basescan.org",
    base: "https://basescan.org",
    arbitrum: "https://arbiscan.io",
    "arbitrum-sepolia": "https://sepolia.arbiscan.io",
    optimism: "https://optimistic.etherscan.io",
    polygon: "https://polygonscan.com",
    mainnet: "https://etherscan.io"
  };

  const explorerUrl = explorers[network.name] || "Unknown explorer";
  console.log(`${explorerUrl}/address/${factoryAddress}`);

  console.log("\n📌 To verify factory contract, run:");
  console.log(`npx hardhat verify --network ${network.name} ${factoryAddress}`);

  console.log("\n🎯 Frontend Integration:");
  console.log("Add this to your frontend .env.local:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS_${network.name.toUpperCase().replace(/-/g, '_')}=${factoryAddress}`);

  console.log("\n=== Deployment Complete ===\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
