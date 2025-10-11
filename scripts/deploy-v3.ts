import hre from "hardhat";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("\n=== ChronoMessageV3 Deployment ===");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // Bakiye kontrolü (Neura Testnet için devre dışı)
  const minBalance = hre.ethers.parseEther("0.01");
  if (balance < minBalance && hre.network.name !== 'neuraTestnet') {
    console.error("❌ Insufficient balance! Need at least 0.01 ETH for deployment.");
    process.exit(1);
  }

  console.log("Deploying ChronoMessageV3 contract...");
  const ChronoMessageV3 = await hre.ethers.getContractFactory("ChronoMessageV3");
  const contract = await ChronoMessageV3.deploy();
  
  console.log("Waiting for deployment confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ ChronoMessageV3 deployed to: ${address}`);

  // Get deployment details
  const deployTx = contract.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : null;

  // Deployment metadata'yı kaydet
  const deploymentsDir = path.resolve(__dirname, "..", "deployments");
  await fs.mkdir(deploymentsDir, { recursive: true });
  
  const metadata = {
    version: "v3",
    address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: receipt?.blockNumber ?? await hre.ethers.provider.getBlockNumber(),
    gasUsed: receipt?.gasUsed.toString() ?? "unknown",
    features: [
      "TIME_LOCK",
      "PAYMENT",
      "HYBRID",
      "IPFS_SUPPORT",
      "MULTIPLE_CONTENT_TYPES"
    ]
  };
  
  const filename = `v3-${hre.network.name}.json`;
  await fs.writeFile(
    path.join(deploymentsDir, filename), 
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`\n📝 Deployment info saved to: deployments/${filename}`);

  // Network'e göre explorer URL'i
  const explorerUrls: Record<string, string> = {
    sepolia: "https://sepolia.etherscan.io",
    baseSepolia: "https://sepolia.basescan.org",
    scrollSepolia: "https://sepolia.scrollscan.com",
    monadTestnet: "https://explorer.testnet.monad.xyz",
    neuraTestnet: "https://testnet-blockscout.infra.neuraprotocol.io",
    mainnet: "https://etherscan.io",
    polygon: "https://polygonscan.com"
  };

  const explorerUrl = explorerUrls[hre.network.name];
  if (explorerUrl) {
    console.log(`\n🔍 View on Explorer: ${explorerUrl}/address/${address}`);
    console.log(`\n📌 To verify contract, run:`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${address}`);
  }

  // Contract info (wait for contract to be ready)
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    console.log(`\n📊 Contract Info:`);
    console.log(`   Owner: ${await contract.owner()}`);
    console.log(`   Protocol Fee: ${await contract.protocolFeePercent()}%`);
    console.log(`   Min Payment: ${hre.ethers.formatEther(await contract.MIN_PAYMENT())} ETH`);
  } catch (error) {
    console.log(`\n📊 Contract Info: (Will be available after confirmation)`);
  }

  console.log("\n=== Deployment Complete ===\n");

  // Frontend integration helper
  console.log("🔧 Frontend Integration:");
  console.log(`   1. Update chains.ts with new deployment`);
  console.log(`   2. Add to version list: v3 - ${address}`);
  console.log(`   3. Test on ${hre.network.name}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
